import { formatGwei, parseGwei, type Address } from 'viem'
import { config } from '../config/wagmi'
import { estimateGas, getGasPrice } from '@wagmi/core'
import { GAS_LIMITS } from '../constants/contractConstants'

// Gas price tiers
export interface GasPriceTier {
  name: 'slow' | 'standard' | 'fast' | 'instant'
  gasPrice: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  estimatedTime: string
}

// Gas estimation result
export interface GasEstimation {
  gasLimit: bigint
  tiers: GasPriceTier[]
  recommendedTier: 'slow' | 'standard' | 'fast' | 'instant'
  totalCostUSD: string
}

// Gas optimization service
export class GasOptimizationService {
  private static instance: GasOptimizationService
  private gasCache = new Map<string, { data: GasPriceTier[]; timestamp: number }>()
  private readonly CACHE_DURATION = 30000 // 30 seconds

  private constructor() {}

  static getInstance(): GasOptimizationService {
    if (!GasOptimizationService.instance) {
      GasOptimizationService.instance = new GasOptimizationService()
    }
    return GasOptimizationService.instance
  }

  // Get current gas prices with different tiers
  async getGasPriceTiers(): Promise<GasPriceTier[]> {
    const cacheKey = 'gasPrices'
    const cached = this.gasCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      const currentGasPrice = await getGasPrice(config)
      
      // DEBUGGING: Log the raw gas price to understand the issue
      console.log('Raw gas price from RPC:', {
        currentGasPrice: currentGasPrice.toString(),
        currentGasPriceInGwei: Number(currentGasPrice) / 1e9,
        currentGasPriceFormatted: formatGwei(currentGasPrice)
      })
      
      // SAFETY CHECK: Arbitrum gas prices should be very low
      const gasPriceInGwei = Number(currentGasPrice) / 1e9
      if (gasPriceInGwei > 10) {
        console.warn(`Suspiciously high gas price detected: ${gasPriceInGwei} gwei, using fallback`)
        return this.getFallbackGasPrices()
      }
      
      // FIXED: Ensure priority fees are appropriate for Arbitrum
      const basePriorityFee = parseGwei('0.001') // Very low for L2
      
      // Create different tiers based on current gas price
      const tiers: GasPriceTier[] = [
        {
          name: 'slow',
          gasPrice: currentGasPrice * 80n / 100n, // 80% of current
          maxFeePerGas: currentGasPrice * 80n / 100n,
          maxPriorityFeePerGas: basePriorityFee,
          estimatedTime: '5-10 minutes'
        },
        {
          name: 'standard',
          gasPrice: currentGasPrice,
          maxFeePerGas: currentGasPrice,
          maxPriorityFeePerGas: basePriorityFee * 2n,
          estimatedTime: '2-5 minutes'
        },
        {
          name: 'fast',
          gasPrice: currentGasPrice * 120n / 100n, // 120% of current
          maxFeePerGas: currentGasPrice * 120n / 100n,
          maxPriorityFeePerGas: basePriorityFee * 5n,
          estimatedTime: '1-2 minutes'
        },
        {
          name: 'instant',
          gasPrice: currentGasPrice * 150n / 100n, // 150% of current
          maxFeePerGas: currentGasPrice * 150n / 100n,
          maxPriorityFeePerGas: basePriorityFee * 10n,
          estimatedTime: '< 1 minute'
        }
      ]

      // DEBUGGING: Log the calculated tiers
      console.log('Calculated gas tiers:', tiers.map(tier => ({
        name: tier.name,
        gasPriceGwei: Number(tier.gasPrice) / 1e9,
        maxFeePerGasGwei: Number(tier.maxFeePerGas) / 1e9,
        maxPriorityFeePerGasGwei: Number(tier.maxPriorityFeePerGas) / 1e9
      })))

      this.gasCache.set(cacheKey, { data: tiers, timestamp: Date.now() })
      return tiers
    } catch (error) {
      console.error('Failed to fetch gas prices:', error)
      // Return fallback gas prices
      return this.getFallbackGasPrices()
    }
  }

  // Get fallback gas prices when API fails
  private getFallbackGasPrices(): GasPriceTier[] {
    // FIXED: Use more conservative fallback for Arbitrum Sepolia
    const baseGasPrice = parseGwei('0.01') // 0.01 gwei for Arbitrum (much lower than mainnet)
    
    return [
      {
        name: 'slow',
        gasPrice: baseGasPrice,
        maxFeePerGas: baseGasPrice,
        maxPriorityFeePerGas: parseGwei('0.001'), // Very low priority fee for L2
        estimatedTime: '5-10 minutes'
      },
      {
        name: 'standard',
        gasPrice: baseGasPrice * 2n,
        maxFeePerGas: baseGasPrice * 2n,
        maxPriorityFeePerGas: parseGwei('0.002'),
        estimatedTime: '2-5 minutes'
      },
      {
        name: 'fast',
        gasPrice: baseGasPrice * 5n,
        maxFeePerGas: baseGasPrice * 5n,
        maxPriorityFeePerGas: parseGwei('0.005'),
        estimatedTime: '1-2 minutes'
      },
      {
        name: 'instant',
        gasPrice: baseGasPrice * 10n,
        maxFeePerGas: baseGasPrice * 10n,
        maxPriorityFeePerGas: parseGwei('0.01'),
        estimatedTime: '< 1 minute'
      }
    ]
  }

  // Estimate gas for a specific transaction
  async estimateTransactionGas(params: {
    to: Address
    data: `0x${string}`
    value?: bigint
  }): Promise<GasEstimation> {
    try {
      const gasLimit = await estimateGas(config, {
        to: params.to,
        data: params.data,
        value: params.value || 0n
      })

      const tiers = await this.getGasPriceTiers()
      const recommendedTier = this.getRecommendedTier(tiers)
      
      // FIXED: Correct price calculation for Arbitrum
      const ethPriceUSD = 2500 // Current ETH price estimate
      
      // Use standard tier (index 1) for calculation
      const standardTier = tiers.find(t => t.name === 'standard') || tiers[1]
      const gasCostWei = gasLimit * standardTier.gasPrice
      
      // Safety check: prevent overflow and invalid calculations
      if (gasCostWei > Number.MAX_SAFE_INTEGER) {
        throw new Error('Gas cost calculation overflow - gas limit or price too high')
      }
      
      // Convert wei to ETH properly
      const gasInEth = Number(gasCostWei) / 1e18
      
      // FIXED: Add additional safety check for Arbitrum L2 
      // Arbitrum transactions should cost much less than mainnet
      const totalCostUSD = (gasInEth * ethPriceUSD).toFixed(6)
      const costNum = parseFloat(totalCostUSD)
      
      // ENHANCED: Safety check for Arbitrum - costs should be under $1 for most operations
      if (costNum > 10) {
        console.error(`CRITICAL: Extremely high gas cost detected: ${gasInEth} ETH ($${totalCostUSD})`)
        console.error('Gas calculation details:', {
          gasLimit: gasLimit.toString(),
          gasPrice: standardTier.gasPrice.toString(),
          gasCostWei: gasCostWei.toString(),
          gasInEth,
          ethPriceUSD
        })
        throw new Error(`Gas cost calculation error - unreasonably high cost: $${totalCostUSD}`)
      }
      
      // WARNING: for costs between $1-$10
      if (costNum > 1) {
        console.warn(`High gas cost detected for Arbitrum: ${gasInEth} ETH ($${totalCostUSD})`)
      }

      return {
        gasLimit,
        tiers,
        recommendedTier,
        totalCostUSD
      }
    } catch (error) {
      console.error('Gas estimation failed:', error)
      throw new Error('Failed to estimate gas')
    }
  }

  // Get recommended gas tier based on current network conditions
  private getRecommendedTier(tiers: GasPriceTier[]): 'slow' | 'standard' | 'fast' | 'instant' {
    // For Arbitrum, standard is usually fine due to low congestion
    return 'standard'
  }

  // Optimize gas for batch operations
  calculateBatchGasSavings(individualGas: bigint, batchSize: number): {
    individualTotal: bigint
    batchTotal: bigint
    savings: bigint
    savingsPercent: string
  } {
    const individualTotal = individualGas * BigInt(batchSize)
    
    // Batch operations save approximately 20% gas per additional transaction
    const batchOverhead = individualGas // First transaction uses full gas
    const subsequentGas = individualGas * 80n / 100n // 20% savings per subsequent tx
    const batchTotal = batchOverhead + (subsequentGas * BigInt(batchSize - 1))
    
    const savings = individualTotal - batchTotal
    const savingsPercent = ((Number(savings) / Number(individualTotal)) * 100).toFixed(1)

    return {
      individualTotal,
      batchTotal,
      savings,
      savingsPercent
    }
  }

  // Get optimal gas settings for different operation types
  getOptimalGasSettings(operationType: 'place_order' | 'cancel_order' | 'close_position' | 'batch_settle' | 'approve'): {
    gasLimit: bigint
    priority: 'low' | 'medium' | 'high'
    description: string
  } {
    switch (operationType) {
      case 'place_order':
        return {
          gasLimit: GAS_LIMITS.PLACE_ORDER,
          priority: 'medium',
          description: 'Standard order placement with S-Auth queuing'
        }
      case 'cancel_order':
        return {
          gasLimit: GAS_LIMITS.CANCEL_ORDER,
          priority: 'high',
          description: 'Time-sensitive order cancellation'
        }
      case 'close_position':
        return {
          gasLimit: GAS_LIMITS.CLOSE_POSITION,
          priority: 'high',
          description: 'Position closure, potentially time-sensitive'
        }
      case 'batch_settle':
        return {
          gasLimit: GAS_LIMITS.BATCH_SETTLE,
          priority: 'low',
          description: 'Batch settlement, can wait for lower gas prices'
        }
      case 'approve':
        return {
          gasLimit: GAS_LIMITS.APPROVE_USDC,
          priority: 'low',
          description: 'Token approval, not time-sensitive'
        }
      default:
        return {
          gasLimit: 200_000n,
          priority: 'medium',
          description: 'Default gas settings'
        }
    }
  }

  // Monitor gas price trends
  async getGasPriceTrends(): Promise<{
    current: string
    trend: 'rising' | 'falling' | 'stable'
    recommendation: string
  }> {
    try {
      const currentGasPrice = await getGasPrice(config)
      const currentFormatted = formatGwei(currentGasPrice)
      
      // In production, track historical data for trends
      // For now, provide general recommendations
      const recommendation = this.getGasRecommendation(currentGasPrice)
      
      return {
        current: currentFormatted,
        trend: 'stable', // Would be calculated from historical data
        recommendation
      }
    } catch (error) {
      console.error('Failed to get gas price trends:', error)
      return {
        current: '0.1',
        trend: 'stable',
        recommendation: 'Gas prices are currently stable for Arbitrum'
      }
    }
  }

  // Get gas price recommendation
  private getGasRecommendation(gasPrice: bigint): string {
    const gasPriceGwei = Number(formatGwei(gasPrice))
    
    if (gasPriceGwei < 0.1) {
      return 'Excellent time to transact - very low gas prices'
    } else if (gasPriceGwei < 0.5) {
      return 'Good time to transact - moderate gas prices'
    } else if (gasPriceGwei < 1.0) {
      return 'Higher than usual gas prices - consider waiting if not urgent'
    } else {
      return 'High gas prices - only urgent transactions recommended'
    }
  }

  // Clear gas cache
  clearCache() {
    this.gasCache.clear()
  }
}

// Error handling utilities
export class Web3ErrorHandler {
  static parseError(error: any): {
    type: 'user_rejected' | 'insufficient_funds' | 'network_error' | 'contract_error' | 'unknown'
    message: string
    details?: string
  } {
    if (!error) {
      return {
        type: 'unknown',
        message: 'Unknown error occurred'
      }
    }

    const errorMessage = error.message || error.toString()
    const errorCode = error.code

    // User rejected transaction
    if (errorCode === 4001 || errorMessage.includes('User rejected')) {
      return {
        type: 'user_rejected',
        message: 'Transaction was rejected by user'
      }
    }

    // Insufficient funds
    if (errorMessage.includes('insufficient funds') || errorMessage.includes('exceeds balance')) {
      return {
        type: 'insufficient_funds',
        message: 'Insufficient funds to complete transaction',
        details: 'Please check your wallet balance and gas requirements'
      }
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('connection') || errorCode === -32002) {
      return {
        type: 'network_error',
        message: 'Network connection error',
        details: 'Please check your internet connection and try again'
      }
    }

    // Contract execution errors
    if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
      const revertReason = this.extractRevertReason(errorMessage)
      return {
        type: 'contract_error',
        message: revertReason || 'Transaction failed',
        details: 'The smart contract rejected this transaction'
      }
    }

    // Gas estimation errors
    if (errorMessage.includes('gas') || errorMessage.includes('out of gas')) {
      return {
        type: 'contract_error',
        message: 'Transaction would fail due to gas issues',
        details: 'Try increasing gas limit or check contract conditions'
      }
    }

    return {
      type: 'unknown',
      message: 'An unexpected error occurred',
      details: errorMessage
    }
  }

  // Extract revert reason from error message
  private static extractRevertReason(errorMessage: string): string | null {
    const revertMatch = errorMessage.match(/revert (.+)/)
    if (revertMatch) {
      return revertMatch[1].replace(/['"]/g, '')
    }
    
    const executionMatch = errorMessage.match(/execution reverted: (.+)/)
    if (executionMatch) {
      return executionMatch[1].replace(/['"]/g, '')
    }
    
    return null
  }

  // Get user-friendly error message
  static getUserFriendlyMessage(error: any): string {
    const parsed = this.parseError(error)
    
    switch (parsed.type) {
      case 'user_rejected':
        return 'Transaction cancelled by user'
      case 'insufficient_funds':
        return 'Not enough funds to complete transaction'
      case 'network_error':
        return 'Connection error - please try again'
      case 'contract_error':
        return parsed.message
      default:
        return 'Something went wrong - please try again'
    }
  }

  // Check if error is retryable
  static isRetryable(error: any): boolean {
    const parsed = this.parseError(error)
    return parsed.type === 'network_error'
  }

  // Get retry delay based on error type
  static getRetryDelay(error: any, attempt: number): number {
    if (!this.isRetryable(error)) return 0
    
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attempt), 30000)
  }
}

// Export singleton
export const gasOptimizationService = GasOptimizationService.getInstance()

// React hooks for gas optimization
import React from 'react'

export function useGasPrice() {
  const [gasPrices, setGasPrices] = React.useState<GasPriceTier[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true

    async function fetchGasPrices() {
      try {
        setIsLoading(true)
        const prices = await gasOptimizationService.getGasPriceTiers()
        if (mounted) {
          setGasPrices(prices)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to fetch gas prices')
          console.error('Gas price fetch error:', err)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchGasPrices()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchGasPrices, 30000)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return { gasPrices, isLoading, error }
}