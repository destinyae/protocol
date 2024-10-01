import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import {
  ALL_NETWORKS,
  FAUCET_CHAIN,
  L3_NATIVE_TOKEN_SYMBOL,
  L3_NETWORK
} from '../../../constants'
import styles from './FaucetView.module.css'
import { NetworkInterface, useBlockchainContext } from '@/contexts/BlockchainContext'
import { useBridgeNotificationsContext } from '@/contexts/BridgeNotificationsContext'
import { useUISettings } from '@/contexts/UISettingsContext'
import { useFaucetAPI } from '@/hooks/useFaucetAPI'
import { TransactionRecord } from '@/utils/bridge/depositERC20ArbitrumSDK'
import { timeDifferenceInHoursAndMinutes, timeDifferenceInHoursMinutesAndSeconds } from '@/utils/timeFormat'
import { ZERO_ADDRESS } from '@/utils/web3utils'
import ValueSelector, { ValueSelect } from '../commonComponents/valueSelector/ValueSelector'

interface FaucetViewProps { }
const FaucetView: React.FC<FaucetViewProps> = ({ }) => {
  const [address, setAddress] = useState<string | undefined>('')
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkInterface>(L3_NETWORK)
  const { useFaucetInterval, useFaucetTimestamp } = useFaucetAPI()
  const { connectedAccount, connectWallet, chainId } = useBlockchainContext()
  const [animatedInterval, setAnimatedInterval] = useState('')
  const [nextClaimTimestamp, setNextClaimTimestamp] = useState(0)
  const [networkError, setNetworkError] = useState('')
  const [selectedAccountType, setSelectedAccountType] = useState<ValueSelect>({ valueId: 1, displayName: 'Connected Account', value: connectedAccount })

  const { faucetTargetChainId } = useUISettings()
  const { refetchNewNotifications } = useBridgeNotificationsContext()

  const values = [
    {
      valueId: 0,
      displayName: `External Address`,
      value: ''
    },
    {
      valueId: 1,
      displayName: `Connected Account`,
      value: connectedAccount
    }
  ]

  useEffect(() => {
    const targetNetwork = ALL_NETWORKS.find((n) => n.chainId === faucetTargetChainId)
    if (targetNetwork) {
      setSelectedNetwork(targetNetwork)
    }

    if (connectedAccount) {
      if (selectedAccountType.valueId !== 1 || selectedAccountType.value !== connectedAccount) {
        setSelectedAccountType({ valueId: 1, displayName: 'Connected Account', value: connectedAccount });
      }
  
      if (address !== connectedAccount) {
        setAddress(connectedAccount);
      }
    } else if (selectedAccountType.valueId === 0 || !connectedAccount) {
      if (address !== '') {
        setAddress('');
      }
    }
  }, [faucetTargetChainId, connectedAccount])

  useEffect(() => {
    setNetworkError('')
  }, [connectedAccount])

  const handleConnect = async () => {
    if (!connectedAccount) connectWallet()
  }

  const handleSelectAccountType = (selectedAccountType: ValueSelect) => {
    if (selectedAccountType.valueId === 0 && !connectedAccount) setAddress('')
    else setAddress(selectedAccountType.value)
    setSelectedAccountType(selectedAccountType)
    setNetworkError('')
  }

  const queryClient = useQueryClient()
  const claim = useMutation(
    async ({ address }: { isL2Target: boolean; address: string | undefined }) => {
      const res = await fetch(`https://api.game7.build/faucet/request/${address}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        throw new Error(`Error: ${res.statusText}`)
      }
      setNetworkError('')
      const type: 'CLAIM' | 'DEPOSIT' | 'WITHDRAWAL' = 'CLAIM'
      return {
        type,
        amount: '1',
        highNetworkChainId: selectedNetwork.chainId,
        lowNetworkChainId: FAUCET_CHAIN.chainId,
        lowNetworkTimestamp: Date.now() / 1000,
        completionTimestamp: Date.now() / 1000,
        newTransaction: true
      }
    },
    {
      onSuccess: (data: TransactionRecord | undefined, { address }) => {
        try {
          const transactionsString = localStorage.getItem(`bridge-${connectedAccount}-transactions`)

          let transactions = []
          if (transactionsString) {
            transactions = JSON.parse(transactionsString)
          }
          transactions.push({ ...data })
          localStorage.setItem(`bridge-${connectedAccount}-transactions`, JSON.stringify(transactions))
        } catch (e) {
          console.log(e)
        }
        const lastClaimTimestamp = Date.now() / 1000
        const faucetInterval = faucetIntervalQuery.data ? Number(faucetIntervalQuery.data) : 0
        const nextClaimL3Timestamp = lastClaimTimestamp + faucetInterval

        const intervalL3 = timeDifferenceInHoursAndMinutes(Date.now() / 1000, nextClaimL3Timestamp)
        const isAvailableL3 = compareTimestampWithCurrentMoment(nextClaimL3Timestamp)

        const updatedL3 = {
          interval: intervalL3,
          nextClaimTimestamp: nextClaimL3Timestamp,
          isAvailable: isAvailableL3,
        }
        queryClient.setQueryData(['nextFaucetClaimTimestamp', address], (oldData: any) => {
          if (oldData) {
            return {
              ...oldData,
              L3: updatedL3, // Update the L3 data
            }
          }
          return { faucetTimeInterval: faucetInterval, L3: updatedL3 }
        })

        queryClient.invalidateQueries(['nextFaucetClaimTimestamp', address])
        queryClient.refetchQueries('pendingTransactions')
        queryClient.refetchQueries(['notifications'])
        queryClient.refetchQueries(['nativeBalance'])
        queryClient.refetchQueries(['ERC20balance'])
        refetchNewNotifications(address ?? '')
      },
      onError: (error) => {
        setNetworkError('Something went wrong')
        console.log(error)
        console.error("Error requesting tokens:", error)
      },
    }
  )

  function compareTimestampWithCurrentMoment(unixTimestamp: number): boolean {
    const timestampInMillis = unixTimestamp * 1000
    const currentInMillis = Date.now()

    return timestampInMillis <= currentInMillis
  }

  const lastClaimedTimestampQuery = useFaucetTimestamp(address)
  const faucetIntervalQuery = useFaucetInterval()

  const nextClaimAvailable = useQuery(
    ['nextFaucetClaimTimestamp', address],
    async () => {
      const lastClaimedL3Timestamp = Number(lastClaimedTimestampQuery.data)
      const faucetTimeInterval = Number(faucetIntervalQuery.data)
      const nextClaimL3Timestamp = lastClaimedL3Timestamp + faucetTimeInterval

      const intervalL3 = timeDifferenceInHoursAndMinutes(Date.now() / 1000, nextClaimL3Timestamp)
      const isAvailableL3 = compareTimestampWithCurrentMoment(nextClaimL3Timestamp)

      const L3 = { interval: intervalL3, nextClaimTimestamp: nextClaimL3Timestamp, isAvailable: isAvailableL3 }
      return { faucetTimeInterval, L3 }
    },
    {
      enabled: !!address &&
        !!lastClaimedTimestampQuery.data &&
        !!faucetIntervalQuery.data
    }
  )

  useEffect(() => {
    if (!nextClaimAvailable.data) return
    const intervalInfo = nextClaimAvailable.data.L3
    if (!intervalInfo.isAvailable) {
      setNextClaimTimestamp(intervalInfo.nextClaimTimestamp)
    }
  }, [nextClaimAvailable.data, chainId])

  useEffect(() => {
    let intervalId: NodeJS.Timeout
    if (nextClaimTimestamp) {
      setAnimatedInterval(timeDifferenceInHoursMinutesAndSeconds(Math.floor(Date.now() / 1000), nextClaimTimestamp))
      intervalId = setInterval(() => {
        setAnimatedInterval(timeDifferenceInHoursMinutesAndSeconds(Math.floor(Date.now() / 1000), nextClaimTimestamp))
      }, 1000)
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [nextClaimTimestamp])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Testnet Faucet</div>
        <div className={styles.supportingText}>
          Request and get <strong> 1{L3_NATIVE_TOKEN_SYMBOL} testnet token </strong> to your connected wallet or an external address on G7 network.
        </div>
      </div>
      <div className={styles.contentContainer}>
        <div className={styles.addressSelectorContainer}>
          <div className={styles.addressContainer}>
            <div className={styles.label}>Recipient Address</div>
            <input
              placeholder={ZERO_ADDRESS}
              className={styles.address}
              value={address}
              disabled={selectedAccountType.valueId === 1 || (!!connectedAccount && selectedAccountType.valueId === 1)}
              onChange={(e) => {
                setAddress(e.target.value)
              }}
            />
          </div>
          {!connectedAccount ? (
            <>
              <div className={styles.textSeparator}>
                Or
              </div>
              <div className={styles.connectWalletButton} onClick={() => { handleConnect() }}>
                <div className={styles.connectWalletText}>
                  Connect Wallet
                </div>
              </div>
            </>
          ) : (
            <div className={styles.selectorContainer}>
              <div className={styles.label}>Account</div>
              <ValueSelector values={values} selectedValue={selectedAccountType} onChange={handleSelectAccountType} />
            </div>
          )}
        </div>
        <button
          className={
            selectedNetwork.chainId === L3_NETWORK.chainId &&
              nextClaimAvailable.data &&
              !nextClaimAvailable.data.L3.isAvailable
              ? styles.requestTokensButtonDisabled
              : styles.requestTokensButton
          }
          onClick={() => {
            claim.mutate({ isL2Target: chainId === 13746, address })
          }}
          disabled={selectedNetwork.chainId === L3_NETWORK.chainId &&
            nextClaimAvailable.data &&
            !nextClaimAvailable.data.L3.isAvailable}
        >
          <div className={styles.requestTokensButtonText}>
            {claim.isLoading ? `Requesting...` : `Request Tokens`}
          </div>
        </button>
      </div>
      {!!networkError && <div className={styles.errorContainer}>{networkError}.</div>}
      {!networkError && nextClaimAvailable.isLoading && (
        <div className={styles.warningContainer}>Checking faucet permissions...</div>
      )}
      {selectedNetwork.chainId === L3_NETWORK.chainId &&
        nextClaimAvailable.data &&
        !nextClaimAvailable.data.L3.isAvailable && (
          <div className={styles.availableFundsContainer}>
            {`You requested funds recently. Come back in `}{' '}
            <span className={styles.time}>{` ${animatedInterval}`}</span>
          </div>
        )}
    </div>
  )
}

export default FaucetView
