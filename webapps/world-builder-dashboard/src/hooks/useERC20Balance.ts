import { useQuery } from 'react-query'
import { ZERO_ADDRESS } from '../../constants'
import { ethers } from 'ethers'

interface UseERC20BalanceProps {
  tokenAddress: string
  account: string | undefined
  rpc: string
}

const useERC20Balance = ({ tokenAddress, account, rpc }: UseERC20BalanceProps) => {
  return useQuery(
    ['ERC20Balance', tokenAddress, account, rpc],
    async () => {
      if (!account || tokenAddress === ZERO_ADDRESS) {
        return '0'
      }
      const provider = new ethers.providers.JsonRpcProvider(rpc)
      const ERC20Contract = new ethers.Contract(
        tokenAddress,
        [
          {
            constant: true,
            inputs: [{ name: '_owner', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: 'balance', type: 'uint256' }],
            type: 'function'
          }
        ],
        provider
      )

      const balance = await ERC20Contract.balanceOf(account)
      return ethers.utils.formatEther(balance)
    },
    {
      refetchInterval: 50000,
      enabled: !!account
    }
  )
}

interface UseERC20AllowanceProps {
  tokenAddress: string
  owner: string | undefined
  spender: string
  rpc: string
}

export const useERC20Allowance = ({ tokenAddress, owner, spender, rpc }: UseERC20AllowanceProps) => {
  return useQuery(
    ['ERC20Allowance', tokenAddress, owner, spender, rpc],
    async () => {
      if (!owner || !spender || tokenAddress === ZERO_ADDRESS) {
        return 0
      }
      const provider = new ethers.providers.JsonRpcProvider(rpc)
      const ERC20Contract = new ethers.Contract(
        tokenAddress,
        [
          {
            constant: true,
            inputs: [
              {
                name: '_owner',
                type: 'address'
              },
              {
                name: '_spender',
                type: 'address'
              }
            ],
            name: 'allowance',
            outputs: [
              {
                name: '',
                type: 'uint256'
              }
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function'
          }
        ],
        provider
      )

      const allowance = await ERC20Contract.allowance(owner, spender)
      const bigNumberValue = ethers.BigNumber.from(allowance._hex)
      const decimalString = ethers.utils.formatUnits(bigNumberValue, 18)
      return parseFloat(decimalString)
    },
    {
      refetchInterval: 50000,
      enabled: !!owner
    }
  )
}

export default useERC20Balance
