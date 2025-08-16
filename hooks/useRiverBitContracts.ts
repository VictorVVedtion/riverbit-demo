import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAccount, useChainId, useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi'
import { parseUnits, formatUnits, type Address } from 'viem'
import { 
  NETWORK_CONFIG, 
  RIVERBIT_CORE_ABI, 
  USDC_ABI, 
  GAS_LIMITS,
  ERROR_MESSAGES,
  type Position,
  type Order,
  type AccountInfo,
  type SAuthTicket,
  type OrderSide,
  type OrderType,
  type MarginMode
} from '../constants/contractConstants'

// Custom hook for RiverBit contract interactions
export function useRiverBitContracts() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { writeContract } = useWriteContract()

  // Contract addresses based on current chain
  const contractAddresses = useMemo(() => {
    const config = NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG]
    return config?.contracts || null
  }, [chainId])

  // Validation helpers
  const isValidNetwork = useMemo(() => {
    return chainId && Object.keys(NETWORK_CONFIG).includes(chainId.toString())
  }, [chainId])

  const validateConnection = useCallback(() => {
    if (!isConnected || !address) {
      throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED)
    }
    if (!isValidNetwork) {
      throw new Error(ERROR_MESSAGES.WRONG_NETWORK)
    }
    if (!contractAddresses) {
      throw new Error('Contract addresses not found for this network')
    }
  }, [isConnected, address, isValidNetwork, contractAddresses])

  return {
    address,
    isConnected,
    chainId,
    contractAddresses,
    isValidNetwork,
    validateConnection
  }
}

// Hook for account information
export function useAccountInfo() {
  const { address, contractAddresses, validateConnection } = useRiverBitContracts()

  const { data: accountData, isLoading, error, refetch } = useReadContract({
    address: contractAddresses?.riverbitCoreV2,
    abi: RIVERBIT_CORE_ABI,
    functionName: 'getAccountInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddresses,
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  })

  const { data: usdcBalance } = useReadContract({
    address: contractAddresses?.usdc,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddresses,
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  })

  const accountInfo: AccountInfo | null = useMemo(() => {
    if (!accountData) return null
    return {
      balance: formatUnits(accountData.balance, 6), // USDC is 6 decimals
      equity: formatUnits(accountData.equity, 6),
      usedMargin: formatUnits(accountData.usedMargin, 6),
      freeMargin: formatUnits(accountData.freeMargin, 6),
      marginRatio: formatUnits(accountData.marginRatio, 4), // Margin ratio in basis points
      totalPnl: formatUnits(accountData.totalPnl, 6)
    }
  }, [accountData])

  const usdcBalanceFormatted = useMemo(() => {
    return usdcBalance ? formatUnits(usdcBalance, 6) : '0'
  }, [usdcBalance])

  return {
    accountInfo,
    usdcBalance: usdcBalanceFormatted,
    isLoading,
    error,
    refetch
  }
}

// Hook for user positions
export function useUserPositions() {
  const { address, contractAddresses } = useRiverBitContracts()

  const { data: positionsData, isLoading, error, refetch } = useReadContract({
    address: contractAddresses?.riverbitCoreV2,
    abi: RIVERBIT_CORE_ABI,
    functionName: 'getUserPositions',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddresses,
      refetchInterval: 3000, // Refetch every 3 seconds for positions
    }
  })

  const positions: Position[] = useMemo(() => {
    if (!positionsData) return []
    return positionsData.map(pos => ({
      market: pos.market.toString(),
      side: pos.side === 0 ? 'buy' : 'sell' as OrderSide,
      size: formatUnits(pos.size, 6),
      entryPrice: formatUnits(pos.entryPrice, 6),
      marginMode: pos.marginMode === 0 ? 'cross' : 'isolated' as MarginMode,
      leverage: pos.leverage,
      unrealizedPnl: formatUnits(pos.unrealizedPnl, 6),
      timestamp: Number(pos.timestamp)
    }))
  }, [positionsData])

  return {
    positions,
    isLoading,
    error,
    refetch
  }
}

// Hook for user orders
export function useUserOrders() {
  const { address, contractAddresses } = useRiverBitContracts()

  const { data: ordersData, isLoading, error, refetch } = useReadContract({
    address: contractAddresses?.riverbitCoreV2,
    abi: RIVERBIT_CORE_ABI,
    functionName: 'getUserOrders',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddresses,
      refetchInterval: 2000, // Refetch every 2 seconds for orders
    }
  })

  const orders: Order[] = useMemo(() => {
    if (!ordersData) return []
    return ordersData.map(order => ({
      orderId: order.orderId.toString(),
      market: order.market.toString(),
      side: order.side === 0 ? 'buy' : 'sell' as OrderSide,
      size: formatUnits(order.size, 6),
      price: formatUnits(order.price, 6),
      orderType: ['market', 'limit', 'stop', 'stop_limit'][order.orderType] as OrderType,
      status: ['pending', 'filled', 'cancelled', 'rejected'][order.status] as Order['status'],
      timestamp: Number(order.timestamp)
    }))
  }, [ordersData])

  return {
    orders,
    isLoading,
    error,
    refetch
  }
}

// Hook for market prices
export function useMarketPrice(market: string) {
  const { contractAddresses } = useRiverBitContracts()

  const { data: priceData, isLoading, error } = useReadContract({
    address: contractAddresses?.riverbitCoreV2,
    abi: RIVERBIT_CORE_ABI,
    functionName: 'getMarketPrice',
    args: [market],
    query: {
      enabled: !!contractAddresses && !!market,
      refetchInterval: 1000, // Refetch every second for prices
    }
  })

  const marketPrice = useMemo(() => {
    if (!priceData) return null
    return {
      price: formatUnits(priceData.price, 6),
      confidence: priceData.confidence,
      timestamp: Number(priceData.timestamp)
    }
  }, [priceData])

  return {
    marketPrice,
    isLoading,
    error
  }
}

// Hook for trading operations
export function useTradingOperations() {
  const { validateConnection, contractAddresses } = useRiverBitContracts()
  const { writeContract } = useWriteContract()

  const placeOrder = useCallback(async (params: {
    market: string
    side: OrderSide
    size: string
    price?: string
    orderType: OrderType
    marginMode: MarginMode
    leverage: number
  }) => {
    validateConnection()

    const { market, side, size, price = '0', orderType, marginMode, leverage } = params

    // Convert parameters to contract format
    const marketBytes = market as `0x${string}`
    const sideNum = side === 'buy' ? 0 : 1
    const sizeWei = parseUnits(size, 6)
    const priceWei = price ? parseUnits(price, 6) : 0n
    const orderTypeNum = ['market', 'limit', 'stop', 'stop_limit'].indexOf(orderType)
    const marginModeNum = marginMode === 'cross' ? 0 : 1

    return writeContract({
      address: contractAddresses!.riverbitCoreV2,
      abi: RIVERBIT_CORE_ABI,
      functionName: 'placeOrder',
      args: [marketBytes, sideNum, sizeWei, priceWei, orderTypeNum, marginModeNum, leverage],
      gas: GAS_LIMITS.PLACE_ORDER
    })
  }, [validateConnection, contractAddresses, writeContract])

  const cancelOrder = useCallback(async (orderId: string) => {
    validateConnection()

    return writeContract({
      address: contractAddresses!.riverbitCoreV2,
      abi: RIVERBIT_CORE_ABI,
      functionName: 'cancelOrder',
      args: [BigInt(orderId)],
      gas: GAS_LIMITS.CANCEL_ORDER
    })
  }, [validateConnection, contractAddresses, writeContract])

  const closePosition = useCallback(async (params: {
    positionId: string
    size: string
    price?: string
  }) => {
    validateConnection()

    const { positionId, size, price = '0' } = params
    const sizeWei = parseUnits(size, 6)
    const priceWei = price ? parseUnits(price, 6) : 0n

    return writeContract({
      address: contractAddresses!.riverbitCoreV2,
      abi: RIVERBIT_CORE_ABI,
      functionName: 'closePosition',
      args: [BigInt(positionId), sizeWei, priceWei],
      gas: GAS_LIMITS.CLOSE_POSITION
    })
  }, [validateConnection, contractAddresses, writeContract])

  const approveUSDC = useCallback(async (amount: string) => {
    validateConnection()

    const amountWei = parseUnits(amount, 6)

    return writeContract({
      address: contractAddresses!.usdc,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [contractAddresses!.riverbitCoreV2, amountWei],
      gas: GAS_LIMITS.APPROVE_USDC
    })
  }, [validateConnection, contractAddresses, writeContract])

  return {
    placeOrder,
    cancelOrder,
    closePosition,
    approveUSDC
  }
}

// Hook for real-time events
export function useRiverBitEvents() {
  const { address, contractAddresses } = useRiverBitContracts()
  const [events, setEvents] = useState<any[]>([])

  // Watch for order placed events
  useWatchContractEvent({
    address: contractAddresses?.riverbitCoreV2,
    abi: RIVERBIT_CORE_ABI,
    eventName: 'OrderPlaced',
    args: address ? { user: address } : undefined,
    onLogs: (logs) => {
      const newEvents = logs.map(log => ({
        type: 'OrderPlaced',
        data: log.args,
        timestamp: Date.now(),
        txHash: log.transactionHash
      }))
      setEvents(prev => [...newEvents, ...prev].slice(0, 100)) // Keep last 100 events
    }
  })

  // Watch for order executed events
  useWatchContractEvent({
    address: contractAddresses?.riverbitCoreV2,
    abi: RIVERBIT_CORE_ABI,
    eventName: 'OrderExecuted',
    args: address ? { user: address } : undefined,
    onLogs: (logs) => {
      const newEvents = logs.map(log => ({
        type: 'OrderExecuted',
        data: log.args,
        timestamp: Date.now(),
        txHash: log.transactionHash
      }))
      setEvents(prev => [...newEvents, ...prev].slice(0, 100))
    }
  })

  // Watch for position opened events
  useWatchContractEvent({
    address: contractAddresses?.riverbitCoreV2,
    abi: RIVERBIT_CORE_ABI,
    eventName: 'PositionOpened',
    args: address ? { user: address } : undefined,
    onLogs: (logs) => {
      const newEvents = logs.map(log => ({
        type: 'PositionOpened',
        data: log.args,
        timestamp: Date.now(),
        txHash: log.transactionHash
      }))
      setEvents(prev => [...newEvents, ...prev].slice(0, 100))
    }
  })

  // Watch for position closed events
  useWatchContractEvent({
    address: contractAddresses?.riverbitCoreV2,
    abi: RIVERBIT_CORE_ABI,
    eventName: 'PositionClosed',
    args: address ? { user: address } : undefined,
    onLogs: (logs) => {
      const newEvents = logs.map(log => ({
        type: 'PositionClosed',
        data: log.args,
        timestamp: Date.now(),
        txHash: log.transactionHash
      }))
      setEvents(prev => [...newEvents, ...prev].slice(0, 100))
    }
  })

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return {
    events,
    clearEvents
  }
}

// Hook for USDC allowance
export function useUSDCAllowance() {
  const { address, contractAddresses } = useRiverBitContracts()

  const { data: allowance, isLoading, refetch } = useReadContract({
    address: contractAddresses?.usdc,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address && contractAddresses ? [address, contractAddresses.riverbitCoreV2] : undefined,
    query: {
      enabled: !!address && !!contractAddresses,
    }
  })

  const allowanceFormatted = useMemo(() => {
    return allowance ? formatUnits(allowance, 6) : '0'
  }, [allowance])

  const hasInfiniteAllowance = useMemo(() => {
    return allowance ? allowance > parseUnits('1000000', 6) : false // Consider > 1M as infinite
  }, [allowance])

  return {
    allowance: allowanceFormatted,
    hasInfiniteAllowance,
    isLoading,
    refetch
  }
}