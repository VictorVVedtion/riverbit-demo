import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useAccount, useChainId, useDisconnect, useBalance } from 'wagmi'
import { switchChain } from '@wagmi/core'
import { arbitrumSepolia } from 'viem/chains'
import { config, modal } from '../config/wagmi'
import { 
  NETWORK_CONFIG, 
  DEFAULT_CHAIN_ID, 
  ERROR_MESSAGES,
  type Position,
  type Order,
  type AccountInfo
} from '../constants/contractConstants'
import { 
  useAccountInfo, 
  useUserPositions, 
  useUserOrders, 
  useRiverBitEvents, 
  useUSDCAllowance,
  useTradingOperations 
} from '../hooks/useRiverBitContracts'
import { tradingService } from '../services/TradingService'
import { toast } from 'sonner'

// Context type definition
interface RiverBitWeb3ContextType {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  address?: string
  chainId?: number
  isValidNetwork: boolean
  
  // Account data
  accountInfo: AccountInfo | null
  usdcBalance: string
  ethBalance: string
  allowance: string
  hasInfiniteAllowance: boolean
  
  // Trading data
  positions: Position[]
  orders: Order[]
  events: any[]
  
  // Loading states
  isLoadingAccount: boolean
  isLoadingPositions: boolean
  isLoadingOrders: boolean
  
  // Actions
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchToValidNetwork: () => Promise<void>
  refreshData: () => void
  clearEvents: () => void
  
  // Trading operations
  placeOrder: (params: any) => Promise<void>
  cancelOrder: (orderId: string) => Promise<void>
  closePosition: (params: any) => Promise<void>
  approveUSDC: (amount: string) => Promise<void>
  
  // Error handling
  error: string | null
  clearError: () => void
}

// Create context
const RiverBitWeb3Context = createContext<RiverBitWeb3ContextType | undefined>(undefined)

// Provider component
interface RiverBitWeb3ProviderProps {
  children: ReactNode
}

export function RiverBitWeb3Provider({ children }: RiverBitWeb3ProviderProps) {
  // Wagmi hooks
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { disconnect } = useDisconnect()
  
  // ETH balance
  const { data: ethBalanceData } = useBalance({
    address: address,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    }
  })
  
  // RiverBit contract hooks
  const { accountInfo, usdcBalance, isLoading: isLoadingAccount, refetch: refetchAccount } = useAccountInfo()
  const { positions, isLoading: isLoadingPositions, refetch: refetchPositions } = useUserPositions()
  const { orders, isLoading: isLoadingOrders, refetch: refetchOrders } = useUserOrders()
  const { events, clearEvents } = useRiverBitEvents()
  const { allowance, hasInfiniteAllowance, refetch: refetchAllowance } = useUSDCAllowance()
  const { placeOrder: contractPlaceOrder, cancelOrder: contractCancelOrder, closePosition: contractClosePosition, approveUSDC: contractApproveUSDC } = useTradingOperations()
  
  // Local state
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Network validation
  const isValidNetwork = React.useMemo(() => {
    return chainId && Object.keys(NETWORK_CONFIG).includes(chainId.toString())
  }, [chainId])
  
  // Connect wallet
  const connectWallet = useCallback(async () => {
    try {
      setIsConnecting(true)
      setError(null)
      await modal.open()
    } catch (err) {
      setError('Failed to connect wallet')
      console.error('Wallet connection failed:', err)
    } finally {
      setIsConnecting(false)
    }
  }, [])
  
  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    try {
      disconnect()
      setError(null)
      toast.success('Wallet disconnected')
    } catch (err) {
      setError('Failed to disconnect wallet')
      console.error('Wallet disconnection failed:', err)
    }
  }, [disconnect])
  
  // Switch to valid network
  const switchToValidNetwork = useCallback(async () => {
    try {
      setError(null)
      await switchChain(config, { chainId: DEFAULT_CHAIN_ID })
      toast.success('Switched to Arbitrum Sepolia')
    } catch (err) {
      setError('Failed to switch network')
      console.error('Network switch failed:', err)
      toast.error('Failed to switch network')
    }
  }, [])
  
  // Refresh all data
  const refreshData = useCallback(() => {
    if (isConnected && address) {
      refetchAccount()
      refetchPositions()
      refetchOrders()
      refetchAllowance()
    }
  }, [isConnected, address, refetchAccount, refetchPositions, refetchOrders, refetchAllowance])
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // Enhanced trading operations with S-Auth
  const placeOrder = useCallback(async (params: {
    market: string
    side: 'buy' | 'sell'
    size: string
    price?: string
    orderType: 'market' | 'limit' | 'stop' | 'stop_limit'
    marginMode: 'cross' | 'isolated'
    leverage: number
  }) => {
    try {
      if (!isConnected || !address) {
        throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED)
      }
      
      if (!isValidNetwork) {
        throw new Error(ERROR_MESSAGES.WRONG_NETWORK)
      }
      
      setError(null)
      
      // Validate risk limits
      const riskCheck = tradingService.validateRiskLimits({
        userBalance: usdcBalance,
        totalMarginUsed: accountInfo?.usedMargin || '0',
        newTradeMargin: (parseFloat(params.size) * parseFloat(params.price || '0') / params.leverage).toString(),
        leverage: params.leverage,
        market: params.market
      })
      
      if (!riskCheck.isValid) {
        throw new Error(riskCheck.error)
      }
      
      // Show warnings
      riskCheck.warnings.forEach(warning => {
        toast.warning(warning)
      })
      
      // Generate S-Auth ticket
      const { ticket, signature } = await tradingService.generateSAuthTicket({
        userAddress: address,
        market: params.market,
        side: params.side,
        size: params.size,
        price: params.price,
        orderType: params.orderType
      })
      
      // Show success message with queue status
      const queueStatus = tradingService.getQueueStatus()
      toast.success(
        `Order queued for settlement. ${queueStatus.pendingTickets} orders pending. Next settlement in ${Math.ceil(queueStatus.nextSettlement / 1000)}s`,
        { duration: 5000 }
      )
      
      // Refresh data after a short delay
      setTimeout(refreshData, 2000)
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to place order'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    }
  }, [isConnected, address, isValidNetwork, usdcBalance, accountInfo, refreshData])
  
  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      if (!isConnected) {
        throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED)
      }
      
      setError(null)
      await contractCancelOrder(orderId)
      toast.success('Order cancelled successfully')
      refreshData()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to cancel order'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    }
  }, [isConnected, contractCancelOrder, refreshData])
  
  const closePosition = useCallback(async (params: {
    positionId: string
    size: string
    price?: string
  }) => {
    try {
      if (!isConnected) {
        throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED)
      }
      
      setError(null)
      await contractClosePosition(params)
      toast.success('Position closed successfully')
      refreshData()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to close position'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    }
  }, [isConnected, contractClosePosition, refreshData])
  
  const approveUSDC = useCallback(async (amount: string) => {
    try {
      if (!isConnected) {
        throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED)
      }
      
      setError(null)
      await contractApproveUSDC(amount)
      toast.success('USDC approval successful')
      refetchAllowance()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to approve USDC'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    }
  }, [isConnected, contractApproveUSDC, refetchAllowance])
  
  // Auto-refresh data when connected
  useEffect(() => {
    if (isConnected && address && isValidNetwork) {
      refreshData()
      
      // Set up periodic refresh
      const interval = setInterval(refreshData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [isConnected, address, isValidNetwork, refreshData])
  
  // Handle network changes
  useEffect(() => {
    if (isConnected && !isValidNetwork) {
      toast.error(ERROR_MESSAGES.WRONG_NETWORK, {
        action: {
          label: 'Switch Network',
          onClick: switchToValidNetwork,
        },
        duration: 10000,
      })
    }
  }, [isConnected, isValidNetwork, switchToValidNetwork])
  
  // Context value
  const contextValue: RiverBitWeb3ContextType = {
    // Connection state
    isConnected,
    isConnecting,
    address,
    chainId,
    isValidNetwork,
    
    // Account data
    accountInfo,
    usdcBalance,
    ethBalance: ethBalanceData ? ethBalanceData.formatted : '0',
    allowance,
    hasInfiniteAllowance,
    
    // Trading data
    positions,
    orders,
    events,
    
    // Loading states
    isLoadingAccount,
    isLoadingPositions,
    isLoadingOrders,
    
    // Actions
    connectWallet,
    disconnectWallet,
    switchToValidNetwork,
    refreshData,
    clearEvents,
    
    // Trading operations
    placeOrder,
    cancelOrder,
    closePosition,
    approveUSDC,
    
    // Error handling
    error,
    clearError
  }
  
  return (
    <RiverBitWeb3Context.Provider value={contextValue}>
      {children}
    </RiverBitWeb3Context.Provider>
  )
}

// Hook to use the context
export function useRiverBitWeb3() {
  const context = useContext(RiverBitWeb3Context)
  if (!context) {
    throw new Error('useRiverBitWeb3 must be used within a RiverBitWeb3Provider')
  }
  return context
}

// Export default
export default RiverBitWeb3Provider