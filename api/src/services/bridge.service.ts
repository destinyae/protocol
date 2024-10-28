// src/services/bridge.service.ts
import { pool } from '../utils/db'; // Adjust the import path as necessary
import { tableNameGame7, tableNameEthereum, tableNameArbitrum, addressHex, addressL1ERC20Gateway, addressL2ERC20Gateway, addressOutBox, addressArbOSL2 } from '../config'; // Adjust the import path as necessary

export async function getTransactionHistory(address: string): Promise<object | string> {
  try {
    const query = `
    SELECT * FROM (
      SELECT transaction_hash, '0x' || ENCODE(origin_address, 'hex') AS from_address, '0x' || ENCODE(origin_address, 'hex') AS to_address, '' AS token, label_data->'args'->>'amount' AS amount, 'from_l2_to_l3 deposit' AS type, block_number, block_timestamp, CASE WHEN label_data->>'status'='1' THEN true ELSE false END AS status
      FROM ${tableNameArbitrum}
      WHERE label='seer' AND address=DECODE($1, 'hex') AND label_name = 'depositERC20'

      UNION ALL

      SELECT transaction_hash, label_data->'args'->>'caller' AS from_address, label_data->'args'->>'destination' AS to_address, '' AS token, label_data->'args'->>'callvalue' AS amount, 'from_l3_to_l2 withdraw' AS type, block_number, block_timestamp, true AS status
      FROM ${tableNameGame7}
      WHERE label='seer' AND address=DECODE($3, 'hex') AND label_type='event' AND label_name = 'L2ToL1Tx'

      UNION ALL

      SELECT transaction_hash, label_data->'args'->>'l2Sender' AS from_address, label_data->'args'->>'to' AS to_address, '' AS token, label_data->'args'->>'value' AS amount, 'from_l3_to_l2 claim' AS type, block_number, block_timestamp, CASE WHEN label_data->>'status'='1' THEN true ELSE false END AS status
      FROM ${tableNameArbitrum}
      WHERE label='seer'  AND label_type='tx_call' AND label_name = 'executeTransaction' AND ADDRESS=DECODE($4, 'hex')

      UNION ALL

      SELECT transaction_hash, label_data->'args'->>'_from' AS from_address, label_data->'args'->>'_to' AS to_address, label_data->'args'->>'l1Token' AS token, label_data->'args'->>'_amount' AS amount, 'from_l1_to_l2 deposit' AS type, block_number, block_timestamp, true AS status
      FROM ${tableNameEthereum}
      WHERE label='seer' AND label_type='event' AND label_name = 'DepositInitiated' AND ADDRESS=DECODE($5, 'hex')

      UNION ALL

      SELECT transaction_hash, label_data->'args'->>'_from' AS from_address, label_data->'args'->>'_to' AS to_address, label_data->'args'->>'l1Token' AS token, label_data->'args'->>'_amount' AS amount, 'from_l2_to_l1 withdraw' AS type, block_number, block_timestamp, true AS status
      FROM ${tableNameArbitrum}
      WHERE label='seer' AND label_type='event' AND label_name = 'WithdrawalInitiated' AND ADDRESS=DECODE($6, 'hex')

      UNION ALL

      SELECT transaction_hash, label_data->'args'->>'_from' AS from_address, label_data->'args'->>'_to' AS to_address, label_data->'args'->>'l1Token' AS token, label_data->'args'->>'_amount' AS amount, 'from_l2_to_l1 claim' AS type, block_number, block_timestamp, true AS status
      FROM ${tableNameEthereum}
      WHERE label='seer' AND label_type='event' AND label_name = 'WithdrawalFinalized' AND ADDRESS=DECODE($5, 'hex')
    ) AS t
    WHERE t.from_address = $2 OR t.to_address = $2
    ORDER BY block_timestamp DESC
  `;
    const result = await pool.query(query, [addressHex, address, addressArbOSL2, addressOutBox, addressL1ERC20Gateway, addressL2ERC20Gateway])
    return result.rows;
  } catch (error) {
    console.error('Error:', error);
    throw new Error(String(error));
  }
}