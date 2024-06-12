import React, {useState} from 'react';
import styles from "./BridgeView.module.css";
import {Icon} from "summon-ui";
import NetworkSelector from "@/components/bridge/NetworkSelector";
import {L3_NETWORKS, L3NetworkConfiguration} from "@/components/bridge/l3Networks";
import ValueToBridge from "@/components/bridge/ValueToBridge";
import {useQuery} from "react-query";
import TransactionSummary from "@/components/bridge/TransactionSummary";
import ActionButton from "@/components/bridge/ActionButton";
import {useBlockchainContext} from "@/components/bridge/BlockchainContext";
import {ethers} from "ethers";
const SYMBOL = 'G7T';
interface BridgeViewProps {
}
const BridgeView: React.FC<BridgeViewProps> = ({}) => {
    const [direction, setDirection] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
    const [value, setValue] = useState('0');
    const l2networks = ["Arbitrum Sepolia"];
    // const l2balance = useQuery(["l2Balance"], () => 9.81);

    const [selectedNetwork, setSelectedNetwork] = useState<L3NetworkConfiguration>(L3_NETWORKS[0]);
    const g7tUsdRate = useQuery(["rate"], () => 31166.75);
    const ethUsdRate = useQuery(["ethUsdRate"], () => 3572.09);
    const feeEstimate = useQuery(["feeEstimate"], () => 0.000193765);
    const { L2Provider, connectedAccount, tokenAddress } = useBlockchainContext();

    const l2Balance = useQuery(
        ["l2Balance", connectedAccount],
        async () => {
            if (!L2Provider || !connectedAccount) {
                return "0";
            }

            const ERC20Contract = new ethers.Contract(
                tokenAddress,
                [
                    {
                        "constant": true,
                        "inputs": [{"name": "_owner", "type": "address"}],
                        "name": "balanceOf",
                        "outputs": [{"name": "balance", "type": "uint256"}],
                        "type": "function"
                    },],
                L2Provider
            );

            return ERC20Contract.balanceOf(connectedAccount).then((balance: any) =>
                ethers.utils.formatEther(balance)
            );
        },
        {
            refetchInterval: 50000,
            enabled: !!connectedAccount
        }
    );

    // const l3Balance = useQuery(
    //     ["l3Balance", connectedAccount, L3Provider],
    //     async () => {
    //         if (!L3Provider || !connectedAccount) {
    //             return "0";
    //         }
    //         return L3Provider.getBalance(connectedAccount).then(balance =>
    //             ethers.utils.formatEther(balance)
    //         );
    //     },
    //     {
    //         enabled: !!connectedAccount, // Only fetch when an account is connected
    //         refetchInterval: 5000, // Refetch every 5 seconds
    //     }
    // );




    return (
      <div className={styles.container}>
          <div className={styles.directionContainer}>
              <button className={direction === "DEPOSIT" ? styles.selectedDirectionButton : styles.directionButton}
                      onClick={() => setDirection("DEPOSIT")}>Deposit
              </button>
              <button className={direction === "WITHDRAW" ? styles.selectedDirectionButton : styles.directionButton}
                      onClick={() => setDirection("WITHDRAW")}>Withdraw
              </button>

          </div>
          <div className={styles.networksContainer}>
              <div className={styles.networkSelect}>
                  <label htmlFor="network-select-from" className={styles.label}>From</label>
                  <div className={styles.network}>
                      {l2networks[0]}
                  </div>
              </div>
              <Icon name={"ArrowRight"} top={'29px'} color={'#667085'}/>
              <div className={styles.networkSelect}>
                  <label htmlFor="network-select-to" className={styles.label}>To</label>
                  <NetworkSelector networks={L3_NETWORKS} selectedNetwork={selectedNetwork} onChange={setSelectedNetwork} />
              </div>
          </div>
          <ValueToBridge title={'Deposit'} symbol={SYMBOL} value={value} setValue={setValue} balance={l2Balance.data ?? '0'} rate={g7tUsdRate.data ?? 0}/>
          <TransactionSummary address={connectedAccount ?? '0x'} transferTime={'< min'} fee={feeEstimate.data ?? 0} value={Number(value)} ethRate={ethUsdRate.data ?? 0} tokenSymbol={SYMBOL} tokenRate={g7tUsdRate.data ?? 0} />
          <ActionButton direction={direction} />
      </div>
  );
};

export default BridgeView;
