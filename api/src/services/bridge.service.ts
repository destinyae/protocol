// src/services/bridge.service.ts
import { pool } from '../utils/db'; // Adjust the import path as necessary
import { tableNameGame7, tableNameEthereum, tableNameArbitrum, addressERC20Inbox, addressL1ERC20Gateway, addressL2ERC20Gateway, addressOutBox, addressArbOSL2, addressL1GatewayRouter, addressL2GatewayRouter, addressL1Inbox } from '../config'; // Adjust the import path as necessary


/// 11155111 - sepolia
/// 13746 - game7  

export async function getTransactionHistory(address: string, limit: number, offset: number): Promise<object | string> {
  try {
    const query = `
    WITH game7_withdrawal AS (
      SELECT
          'WITHDRAWAL' AS type,
          label_data->'args'->>'position' AS position,
          label_data->'args'->>'callvalue' AS amount,
          421614 AS parentNetworkChainId,
          13746 AS childNetworkChainId,
          transaction_hash AS childNetworkHash,
          block_timestamp AS childNetworkTimestamp,
          label_data->'args'->>'caller' AS from_address,
          label_data->'args'->>'destination' AS to_address,
          3600 AS challengePeriod,
          block_timestamp + 3600 AS claimableTimestamp,
          block_timestamp AS block_timestamp
      FROM ${tableNameGame7}
      WHERE
          label = 'seer' AND
          address = DECODE($1, 'hex') AND -- '0000000000000000000000000000000000000064' -- Game7 ArbOS L2 address
          label_type = 'event' AND
          label_name = 'L2ToL1Tx'
    ), arbirtrum_claims as (
      SELECT
          'CLAIM' AS type,
          transaction_hash,
          label_data->'args'->>'transactionIndex' AS position,
          label_data->'args'->>'l2Sender' AS from_address,    
          label_data->'args'->>'to' AS to_address,
          '' AS token,
          label_data->'args'->>'value' AS amount,
          'from_l3_to_l2 claim' AS type,
          block_number,
          block_timestamp,
          true AS status
      FROM ${tableNameArbitrum}
      WHERE
          label = 'seer' AND
          label_type = 'event' AND
          label_name = 'OutBoxTransactionExecuted' AND
          address = DECODE($2, 'hex') -- '64105c6C3D494469D5F21323F0E917563489d9f5' -- Arbitrum outbox address
    ), game7_withdrawal_failed as (
      SELECT
          'WITHDRAWAL' AS type,
          null AS position,
          NULL AS amount,
          421614 AS parentNetworkChainId,
          13746 AS childNetworkChainId,
          transaction_hash AS childNetworkHash,
          block_timestamp AS childNetworkTimestamp,
          label_data->'args'->>'caller' AS from_address,
          null AS to_address,
          3600 AS challengePeriod,
          block_timestamp + 3600 AS claimableTimestamp,
          NULL::double precision AS completionTimestamp,
          NULL::double precision AS parentNetworkTimestamp,
          NULL AS parentNetworkHash,
          false AS status,
          block_timestamp AS block_timestamp
      FROM ${tableNameGame7}
      WHERE
          label = 'seer' AND
          label_type = 'tx_call' AND
          label_name = 'withdrawEth' AND
          ADDRESS = DECODE($1, 'hex') AND -- '0000000000000000000000000000000000000064' -- Game7 ArbOS L2 address
          (label_data->>'status' = '0' or label_data->'status' IS NULL)
    ), withdrawal_l3_l2 as (
      SELECT
          'WITHDRAWAL' AS type,
          game7_withdrawal.position AS position,
          game7_withdrawal.amount AS amount,
          game7_withdrawal.parentNetworkChainId AS parentNetworkChainId,
          game7_withdrawal.childNetworkChainId AS childNetworkChainId,
          game7_withdrawal.childNetworkHash AS childNetworkHash,
          game7_withdrawal.childNetworkTimestamp AS childNetworkTimestamp,
          game7_withdrawal.from_address AS from_address,
          game7_withdrawal.to_address AS to_address,
          game7_withdrawal.challengePeriod AS challengePeriod,
          game7_withdrawal.claimableTimestamp AS claimableTimestamp,
          arbirtrum_claims.block_timestamp AS completionTimestamp,
          arbirtrum_claims.block_timestamp AS parentNetworkTimestamp,
          arbirtrum_claims.transaction_hash AS parentNetworkHash,
          true AS status,
          game7_withdrawal.block_timestamp AS block_timestamp
      FROM
          game7_withdrawal
          LEFT JOIN arbirtrum_claims ON game7_withdrawal.position = arbirtrum_claims.position
      UNION ALL
      SELECT
          *
      FROM
          game7_withdrawal_failed
    ), arbitrum_withdraw as (
        SELECT
              'Withdrawal' AS type,
              label_data->'args'->>'_l2ToL1Id' AS position,
              label_data->'args'->>'_amount' AS amount,
              11155111 AS parentNetworkChainId,
              421614 AS childNetworkChainId,
              transaction_hash AS childNetworkHash,
              block_timestamp AS childNetworkTimestamp,
              label_data->'args'->>'_from' AS from_address,
              label_data->'args'->>'_to' AS to_address,
              3600 AS challengePeriod,
              block_timestamp + 3600 AS claimableTimestamp,
              block_timestamp AS block_timestamp
        FROM
            ${tableNameArbitrum}
        WHERE
              label = 'seer'
              AND label_type = 'event'
              AND label_name = 'WithdrawalInitiated'
              AND ADDRESS = DECODE($3, 'hex') -- '6e244cD02BBB8a6dbd7F626f05B2ef82151Ab502' -- Arbitrum L2ERC20Gateway address
    ), ethereum_claims as (
        SELECT
              'CLAIM' AS type,
              transaction_hash,
              label_data->'args'->>'transactionIndex' AS position,
              label_data->'args'->>'l2Sender' AS from_address,
              label_data->'args'->>'to' AS to_address,
              'claim' AS type,
              block_number,
              block_timestamp
        FROM  ${tableNameEthereum}
        WHERE
              label = 'seer' AND
              label_type = 'event' AND
              label_name = 'OutBoxTransactionExecuted' AND
              address = DECODE($4, 'hex') -- '902b3e5f8f19571859f4ab1003b960a5df693aff' -- Ethereum L1ERC20Gateway address
    ), faild_arbitrum_withdraw as (
      SELECT
          'WITHDRAWAL' AS type,
          null AS position,
          NULL AS amount,
          11155111 AS parentNetworkChainId,
          421614 AS childNetworkChainId,
          transaction_hash AS childNetworkHash,
          block_timestamp AS childNetworkTimestamp,
          label_data->'args'->>'caller' AS from_address,
          null AS to_address,
          3600 AS challengePeriod,
          block_timestamp + 3600 AS claimableTimestamp,
          NULL::double precision AS completionTimestamp,
          NULL::double precision AS parentNetworkTimestamp,
          NULL AS parentNetworkHash,
          false AS status,
          block_timestamp AS block_timestamp
      FROM ${tableNameArbitrum}
      WHERE
          label = 'seer' AND
          label_type = 'tx_call' AND
          label_name = 'outboundTransfer' AND
          ADDRESS = DECODE($5, 'hex') AND -- '0x9fDD1C4E4AA24EEc1d913FABea925594a20d43C7' -- Arbitrum L2ERC20Gateway address
          label_data->>'status' = '0'
    ), l2_to_l1_withdraw as (
        SELECT
              'WITHDRAWAL' AS type,
              arbitrum_withdraw.position AS position,
              arbitrum_withdraw.amount AS amount,
              arbitrum_withdraw.parentNetworkChainId AS parentNetworkChainId,
              arbitrum_withdraw.childNetworkChainId AS childNetworkChainId,
              arbitrum_withdraw.childNetworkHash AS childNetworkHash,
              arbitrum_withdraw.childNetworkTimestamp AS childNetworkTimestamp,
              arbitrum_withdraw.from_address AS from_address,
              arbitrum_withdraw.to_address AS to_address,
              arbitrum_withdraw.challengePeriod AS challengePeriod,
              arbitrum_withdraw.claimableTimestamp AS claimableTimestamp,
              ethereum_claims.block_timestamp AS completionTimestamp,
              ethereum_claims.block_timestamp AS parentNetworkTimestamp,
              ethereum_claims.transaction_hash AS parentNetworkHash,
              true AS status,
              arbitrum_withdraw.block_timestamp AS block_timestamp
        FROM arbitrum_withdraw
        LEFT JOIN ethereum_claims ON arbitrum_withdraw.position = ethereum_claims.position
        union
        ALL
        SELECT
              *
        FROM faild_arbitrum_withdraw
    ), l2_to_l3_desposits as (
        SELECT
              'DEPOSIT' AS type,
              label_data -> 'args' ->> 'amount' AS amount,
              421614 AS parentNetworkChainId,
              13746 AS childNetworkChainId,
              transaction_hash AS parentNetworkHash,
              block_timestamp AS parentNetworkTimestamp,
              block_timestamp AS completionTimestamp,
              '0x' || ENCODE(origin_address, 'hex') AS from_address,
              '0x' || ENCODE(origin_address, 'hex') AS to_address,
              '' AS token,
              CASE
                    WHEN label_data ->> 'status' = '1' THEN true
                    ELSE false
              END AS isDeposit,
              block_timestamp
        FROM
              ${tableNameArbitrum}
        WHERE
              label = 'seer'
              AND label_type = 'tx_call'
              AND label_name = 'depositERC20'
              AND address = DECODE($6, 'hex') -- e6470bb72291c39073aed67a30ff93b69c1f47de -- Arbitrum addressERC20Inbox
    ), l1_to_l2_deposit as (
       select * from ( 
       SELECT
              'DEPOSIT' AS type,
              label_data -> 'args' ->> '_amount' AS amount,
              11155111 AS parentNetworkChainId,
              421614 AS childNetworkChainId,
              transaction_hash AS parentNetworkHash,
              block_timestamp AS parentNetworkTimestamp,
              block_timestamp AS completionTimestamp,
              '0x' || ENCODE(origin_address, 'hex') AS from_address,
              label_data ->'args'->> '_to' AS to_address,
              label_data ->'args' ->> '_token' AS token,
              CASE
                    WHEN label_data ->> 'status' = '1' THEN true
                    ELSE false
              END AS isDeposit,
              block_timestamp
        FROM
            ${tableNameEthereum}
        WHERE
              label = 'seer'
              AND label_type = 'tx_call'
              AND label_name = 'outboundTransfer'
              AND ADDRESS = DECODE($7, 'hex') -- cE18836b233C83325Cc8848CA4487e94C6288264 -- Ethereum addressDeposit
        UNION ALL
        SELECT
          'DEPOSIT' AS type,
          NULL AS amount,
          11155111 AS parentNetworkChainId,
          421614 AS childNetworkChainId,
          transaction_hash AS parentNetworkHash,
          block_timestamp AS parentNetworkTimestamp,
          block_timestamp AS completionTimestamp,
          '0x' || ENCODE(origin_address, 'hex') AS from_address,
          '0x' || ENCODE(origin_address, 'hex') AS to_address,
          '' AS token,
          CASE
            WHEN label_data ->> 'status' = '1' THEN true
            ELSE false
          END AS isDeposit,
          block_timestamp
        FROM
          ${tableNameEthereum}
        WHERE
          label = 'seer'
          AND label_type = 'tx_call'
          AND label_name = 'depositEth'
          AND ADDRESS = DECODE($8, 'hex') -- cE18836b233C83325Cc8848CA4487e94C6288264 -- Ethereum addressDeposit
      ) as a
    ), full_history as (
          SELECT
                  json_build_object(
                          'type', type,
                          'amount', amount,
                          'parentNetworkChainId', parentNetworkChainId,
                          'childNetworkChainId', childNetworkChainId,
                          'parentNetworkHash', parentNetworkHash,
                          'parentNetworkTimestamp', parentNetworkTimestamp,
                          'completionTimestamp', completionTimestamp,
                          'from_address', from_address,
                          'to_address', to_address,
                          'token', token,
                          'isDeposit', isDeposit
                  ) AS data,
                  block_timestamp,
                  from_address,
                  to_address
          FROM
                  l2_to_l3_desposits
          
          UNION ALL
          SELECT
                  json_build_object(
                          'type', type,
                          'amount', amount,
                          'parentNetworkChainId', parentNetworkChainId,
                          'childNetworkChainId', childNetworkChainId,
                          'parentNetworkHash', parentNetworkHash,
                          'parentNetworkTimestamp', parentNetworkTimestamp,
                          'completionTimestamp', completionTimestamp,
                          'from_address', from_address,
                          'to_address', to_address,
                          'token', token,
                          'isDeposit', isDeposit
                  ) AS data,
                  block_timestamp,
                  from_address,
                  to_address
          FROM
                  l1_to_l2_deposit
          UNION ALL
          SELECT
                  json_build_object(
                          'type', type,
                          'position', position,
                          'amount', amount,
                          'parentNetworkChainId', parentNetworkChainId,
                          'childNetworkChainId', childNetworkChainId,
                          'parentNetworkHash', parentNetworkHash,
                          'childNetworkHash', childNetworkHash,
                          'parentNetworkTimestamp', parentNetworkTimestamp,
                          'childNetworkTimestamp', childNetworkTimestamp,
                          'completionTimestamp', completionTimestamp,
                          'from_address', from_address,
                          'to_address', to_address,
                          'challengePeriod', challengePeriod,
                          'claimableTimestamp', claimableTimestamp,
                          'status', status
                  ) AS data,
                  block_timestamp,
                  from_address,
                  to_address
          FROM
                  l2_to_l1_withdraw
          UNION ALL
          SELECT
                  json_build_object(
                          'type', type,
                          'position', position,
                          'amount', amount,
                          'parentNetworkChainId', parentNetworkChainId,
                          'childNetworkChainId', childNetworkChainId,
                          'parentNetworkHash', parentNetworkHash,
                          'childNetworkHash', childNetworkHash,
                          'parentNetworkTimestamp', parentNetworkTimestamp,
                          'childNetworkTimestamp', childNetworkTimestamp,
                          'completionTimestamp', completionTimestamp,
                          'from_address', from_address,
                          'to_address', to_address,
                          'challengePeriod', challengePeriod,
                          'claimableTimestamp', claimableTimestamp,
                          'status', status
                  ) AS data,
                  block_timestamp,
                  from_address,
                  to_address
          FROM
                  withdrawal_l3_l2
    )
    SELECT
      data
    FROM
      full_history
    WHERE
      from_address = $9
      or from_address = '0x' || ENCODE(DECODE(SUBSTRING($9 FROM 3), 'hex'), 'hex')
      or to_address = $9
      or to_address = '0x' || ENCODE(DECODE(SUBSTRING($9 FROM 3), 'hex'), 'hex')
    ORDER BY
      block_timestamp DESC
      OFFSET $10
      LIMIT $11
  `;
    const result = await pool.query(query, [addressArbOSL2,
      addressOutBox,
      addressL2ERC20Gateway,
      addressL1ERC20Gateway,
      addressL2GatewayRouter,
      addressERC20Inbox,
      addressL1GatewayRouter,
      addressL1Inbox,
      address, offset, limit])
    // unpack the data from the result
    const data = result.rows.map((row: any) => row.data);
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw new Error(String(error));
  }
}