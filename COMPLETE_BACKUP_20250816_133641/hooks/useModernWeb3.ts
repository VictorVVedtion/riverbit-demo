import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useReadContract, useSignTypedData, useChainId } from 'wagmi'
import { parseUnits, formatUnits, type Address, type Hash } from 'viem'
import { arbitrumSepolia } from 'viem/chains'
import { NETWORK_CONFIG } from '../config/wagmi'

// EIP-712 Domain for RiverBit
const EIP712_DOMAIN = {
  name: 'RiverBit',
  version: '1.0.0',
  chainId: arbitrumSepolia.id,
  verifyingContract: '0x43bf3e410fd22e4cD1081E60F31600BDdC15ea96' as Address, // Deployed contract address
} as const

// EIP-712 Types for trading operations
const EIP712_TYPES = {
  OpenPosition: [
    { name: 'user', type: 'address' },
    { name: 'symbol', type: 'string' },
    { name: 'size', type: 'int256' },
    { name: 'leverage', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
  ClosePosition: [
    { name: 'user', type: 'address' },
    { name: 'symbol', type: 'string' },
    { name: 'size', type: 'int256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
  PoolDeposit: [
    { name: 'user', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
  PoolWithdraw: [
    { name: 'user', type: 'address' },
    { name: 'shares', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const

// Contract ABIs (simplified for demo)
const RIVERBIT_CORE_ABI = [
  {
    name: 'depositToPool',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdrawFromPool',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'openPosition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'symbol', type: 'string' },
      { name: 'size', type: 'int256' },
      { name: 'leverage', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'closePosition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'symbol', type: 'string' },
      { name: 'size', type: 'int256' },
    ],
    outputs: [],
  },
  {
    name: 'getAccountInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'balance', type: 'uint256' },
      { name: 'totalMargin', type: 'uint256' },
      { name: 'poolShares', type: 'uint256' },
    ],
  },
  {
    name: 'getPoolState',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'totalValueLocked', type: 'uint256' },
      { name: 'totalShares', type: 'uint256' },
      { name: 'netAssetValue', type: 'uint256' },
    ],
  },
] as const

const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'boolean' }],
  },
] as const

export enum TransactionStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

interface TransactionState {
  status: TransactionStatus
  hash?: Hash
  error?: string
}

interface AccountInfo {
  balance: number
  totalMargin: number
  poolShares: number
}

interface PoolState {
  totalValueLocked: number
  totalShares: number
  netAssetValue: number
  totalPnL: number
  insuranceFund: number
}

export function useModernWeb3() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { writeContractAsync } = useWriteContract()
  const { signTypedDataAsync } = useSignTypedData()

  const [nonce, setNonce] = useState(0)
  const [transactionState, setTransactionState] = useState<TransactionState>({
    status: TransactionStatus.IDLE,
  })

  // Get network configuration
  const networkConfig = NETWORK_CONFIG[chainId]
  const riverbitCoreAddress = networkConfig?.contracts?.riverbitCore as Address
  const usdcAddress = networkConfig?.contracts?.usdc as Address

  // Utility function to format numbers
  const formatNumber = useCallback((value: number, decimals = 2): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }, [])

  // Utility function to format percentages
  const formatPercentage = useCallback((value: number, decimals = 2): string => {
    return `${(value * 100).toFixed(decimals)}%`
  }, [])

  // Get USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdcAddress,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  })

  // Get USDC allowance for RiverBit contract
  const { data: usdcAllowance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address && riverbitCoreAddress ? [address, riverbitCoreAddress] : undefined,
    query: {
      enabled: !!address && !!usdcAddress && !!riverbitCoreAddress,
      refetchInterval: 10000,
    },
  })

  // Get account info from RiverBit contract
  const { data: accountData, refetch: refetchAccount } = useReadContract({
    address: riverbitCoreAddress,
    abi: RIVERBIT_CORE_ABI,
    functionName: 'getAccountInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!riverbitCoreAddress,
      refetchInterval: 5000, // Refetch every 5 seconds for real-time data
    },
  })

  // Get pool state
  const { data: poolData, refetch: refetchPool } = useReadContract({
    address: riverbitCoreAddress,
    abi: RIVERBIT_CORE_ABI,
    functionName: 'getPoolState',
    query: {
      enabled: !!riverbitCoreAddress,
      refetchInterval: 10000,
    },
  })

  // Process account data
  const accountInfo: AccountInfo = {
    balance: usdcBalance ? Number(formatUnits(usdcBalance, 6)) : 0,
    totalMargin: accountData ? Number(formatUnits(accountData[1], 6)) : 0,
    poolShares: accountData ? Number(formatUnits(accountData[2], 18)) : 0,
  }

  // Process pool data
  const poolState: PoolState = {
    totalValueLocked: poolData ? Number(formatUnits(poolData[0], 6)) : 0,
    totalShares: poolData ? Number(formatUnits(poolData[1], 18)) : 0,
    netAssetValue: poolData ? Number(formatUnits(poolData[2], 18)) : 1.0,
    totalPnL: 0, // Calculate based on pool performance
    insuranceFund: 0, // Will be implemented in full contract
  }

  // Approve USDC spending
  const approveUSDC = useCallback(async (amount: number): Promise<Hash> => {
    if (!address || !usdcAddress || !riverbitCoreAddress) {
      throw new Error('Wallet not connected or contracts not available')
    }

    setTransactionState({ status: TransactionStatus.PENDING })

    try {
      const amountWei = parseUnits(amount.toString(), 6)
      const hash = await writeContractAsync({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [riverbitCoreAddress, amountWei],
      })

      setTransactionState({ status: TransactionStatus.SUCCESS, hash })
      return hash
    } catch (error: any) {
      setTransactionState({ 
        status: TransactionStatus.FAILED, 
        error: error.message || 'Transaction failed' 
      })
      throw error
    }
  }, [address, usdcAddress, riverbitCoreAddress, writeContractAsync])

  // Deposit to pool with EIP-712 signature
  const depositToPool = useCallback(async (amount: number): Promise<Hash> => {
    if (!address || !riverbitCoreAddress) {
      throw new Error('Wallet not connected or contract not available')
    }

    setTransactionState({ status: TransactionStatus.PENDING })

    try {
      // Create EIP-712 message
      const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const message = {
        user: address,
        amount: parseUnits(amount.toString(), 6),
        nonce: BigInt(nonce),
        deadline: BigInt(deadline),
      }

      // Sign the typed data
      const signature = await signTypedDataAsync({
        domain: EIP712_DOMAIN,
        types: EIP712_TYPES,
        primaryType: 'PoolDeposit',
        message,
      })

      console.log('EIP-712 Signature for pool deposit:', signature)

      // Execute the transaction
      const amountWei = parseUnits(amount.toString(), 6)
      const hash = await writeContractAsync({
        address: riverbitCoreAddress,
        abi: RIVERBIT_CORE_ABI,
        functionName: 'depositToPool',
        args: [amountWei],
      })

      setTransactionState({ status: TransactionStatus.SUCCESS, hash })
      setNonce(prev => prev + 1)

      // Refetch data after transaction
      setTimeout(() => {
        refetchAccount()
        refetchPool()
      }, 2000)

      return hash
    } catch (error: any) {
      setTransactionState({ 
        status: TransactionStatus.FAILED, 
        error: error.message || 'Transaction failed' 
      })
      throw error
    }
  }, [address, riverbitCoreAddress, nonce, signTypedDataAsync, writeContractAsync, refetchAccount, refetchPool])

  // Withdraw from pool with EIP-712 signature
  const withdrawFromPool = useCallback(async (shares: number): Promise<Hash> => {
    if (!address || !riverbitCoreAddress) {
      throw new Error('Wallet not connected or contract not available')
    }

    setTransactionState({ status: TransactionStatus.PENDING })

    try {
      // Create EIP-712 message
      const deadline = Math.floor(Date.now() / 1000) + 3600
      const message = {
        user: address,
        shares: parseUnits(shares.toString(), 18),
        nonce: BigInt(nonce),
        deadline: BigInt(deadline),
      }

      // Sign the typed data
      const signature = await signTypedDataAsync({
        domain: EIP712_DOMAIN,
        types: EIP712_TYPES,
        primaryType: 'PoolWithdraw',
        message,
      })

      console.log('EIP-712 Signature for pool withdrawal:', signature)

      // Execute the transaction
      const sharesWei = parseUnits(shares.toString(), 18)
      const hash = await writeContractAsync({
        address: riverbitCoreAddress,
        abi: RIVERBIT_CORE_ABI,
        functionName: 'withdrawFromPool',
        args: [sharesWei],
      })

      setTransactionState({ status: TransactionStatus.SUCCESS, hash })
      setNonce(prev => prev + 1)

      // Refetch data after transaction
      setTimeout(() => {
        refetchAccount()
        refetchPool()
      }, 2000)

      return hash
    } catch (error: any) {
      setTransactionState({ 
        status: TransactionStatus.FAILED, 
        error: error.message || 'Transaction failed' 
      })
      throw error
    }
  }, [address, riverbitCoreAddress, nonce, signTypedDataAsync, writeContractAsync, refetchAccount, refetchPool])

  // Open position with EIP-712 signature
  const openPosition = useCallback(async (
    symbol: string, 
    size: number, 
    leverage: number
  ): Promise<Hash> => {
    if (!address || !riverbitCoreAddress) {
      throw new Error('Wallet not connected or contract not available')
    }

    setTransactionState({ status: TransactionStatus.PENDING })

    try {
      // Create EIP-712 message
      const deadline = Math.floor(Date.now() / 1000) + 3600
      const message = {
        user: address,
        symbol,
        size: BigInt(Math.floor(size * 1e18)), // Convert to wei-like precision
        leverage: BigInt(leverage),
        nonce: BigInt(nonce),
        deadline: BigInt(deadline),
      }

      // Sign the typed data
      const signature = await signTypedDataAsync({
        domain: EIP712_DOMAIN,
        types: EIP712_TYPES,
        primaryType: 'OpenPosition',
        message,
      })

      console.log('EIP-712 Signature for opening position:', signature)

      // Execute the transaction
      const hash = await writeContractAsync({
        address: riverbitCoreAddress,
        abi: RIVERBIT_CORE_ABI,
        functionName: 'openPosition',
        args: [symbol, message.size, message.leverage],
      })

      setTransactionState({ status: TransactionStatus.SUCCESS, hash })
      setNonce(prev => prev + 1)

      // Refetch data after transaction
      setTimeout(() => {
        refetchAccount()
      }, 2000)

      return hash
    } catch (error: any) {
      setTransactionState({ 
        status: TransactionStatus.FAILED, 
        error: error.message || 'Transaction failed' 
      })
      throw error
    }
  }, [address, riverbitCoreAddress, nonce, signTypedDataAsync, writeContractAsync, refetchAccount])

  // Close position with EIP-712 signature
  const closePosition = useCallback(async (symbol: string, size: number): Promise<Hash> => {
    if (!address || !riverbitCoreAddress) {
      throw new Error('Wallet not connected or contract not available')
    }

    setTransactionState({ status: TransactionStatus.PENDING })

    try {
      // Create EIP-712 message
      const deadline = Math.floor(Date.now() / 1000) + 3600
      const message = {
        user: address,
        symbol,
        size: BigInt(Math.floor(size * 1e18)),
        nonce: BigInt(nonce),
        deadline: BigInt(deadline),
      }

      // Sign the typed data
      const signature = await signTypedDataAsync({
        domain: EIP712_DOMAIN,
        types: EIP712_TYPES,
        primaryType: 'ClosePosition',
        message,
      })

      console.log('EIP-712 Signature for closing position:', signature)

      // Execute the transaction
      const hash = await writeContractAsync({
        address: riverbitCoreAddress,
        abi: RIVERBIT_CORE_ABI,
        functionName: 'closePosition',
        args: [symbol, message.size],
      })

      setTransactionState({ status: TransactionStatus.SUCCESS, hash })
      setNonce(prev => prev + 1)

      // Refetch data after transaction
      setTimeout(() => {
        refetchAccount()
      }, 2000)

      return hash
    } catch (error: any) {
      setTransactionState({ 
        status: TransactionStatus.FAILED, 
        error: error.message || 'Transaction failed' 
      })
      throw error
    }
  }, [address, riverbitCoreAddress, nonce, signTypedDataAsync, writeContractAsync, refetchAccount])

  return {
    // Connection state
    address,
    isConnected,
    chainId,
    networkConfig,

    // Account data
    accountInfo,
    poolState,
    
    // USDC data
    usdcBalance: accountInfo.balance,
    usdcAllowance: usdcAllowance ? Number(formatUnits(usdcAllowance, 6)) : 0,

    // Transaction state
    transactionState,

    // Methods
    approveUSDC,
    depositToPool,
    withdrawFromPool,
    openPosition,
    closePosition,

    // Utilities
    formatNumber,
    formatPercentage,

    // Manual refetch
    refetchAccount,
    refetchPool,
  }
}