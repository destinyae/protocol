export const ERC20_INBOX_ABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'depositERC20',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'l2CallValue',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'maxSubmissionCost',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'excessFeeRefundAddress',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'callValueRefundAddress',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'gasLimit',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'maxFeePerGas',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'tokenTotalFeeAmount',
        type: 'uint256'
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes'
      }
    ],
    name: 'createRetryableTicket',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]
