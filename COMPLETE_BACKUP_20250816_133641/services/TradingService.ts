import { SignTypedDataParameters, type Address } from 'viem'
import { signTypedData } from '@wagmi/core'
import { config } from '../config/wagmi'
import { 
  type SAuthTicket, 
  type OrderSide, 
  type OrderType, 
  type MarginMode,
  TRADING_CONFIG,
  ERROR_MESSAGES,
  MARKET_CONFIG
} from '../constants/contractConstants'

// S-Auth ticket signature domain
const SAUTH_DOMAIN = {
  name: 'RiverBit S-Auth',
  version: '2.0',
  chainId: 421614, // Arbitrum Sepolia
  verifyingContract: '0x43bf3e410fd22e4cD1081E60F31600BDdC15ea96' as Address
} as const

// S-Auth ticket types for EIP-712
const SAUTH_TYPES = {
  SAuthTicket: [
    { name: 'user', type: 'address' },
    { name: 'market', type: 'bytes32' },
    { name: 'side', type: 'uint8' },
    { name: 'size', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' },
    { name: 'nonce', type: 'uint256' }
  ]
} as const

export class TradingService {
  private static instance: TradingService
  private ticketQueue: SAuthTicket[] = []
  private signatures: string[] = []
  private settlementTimer: NodeJS.Timeout | null = null
  private nonceCounter = 0

  private constructor() {
    this.startSettlementTimer()
  }

  static getInstance(): TradingService {
    if (!TradingService.instance) {
      TradingService.instance = new TradingService()
    }
    return TradingService.instance
  }

  // Generate S-Auth ticket for trade
  async generateSAuthTicket(params: {
    userAddress: Address
    market: string
    side: OrderSide
    size: string
    price?: string
    orderType: OrderType
  }): Promise<{ ticket: SAuthTicket; signature: string }> {
    const { userAddress, market, side, size, price = '0', orderType } = params

    // Validate trade parameters
    this.validateTradeParams(params)

    // Create ticket
    const ticket: SAuthTicket = {
      user: userAddress,
      market: this.formatMarketForContract(market),
      side: side === 'buy' ? 0 : 1,
      size: this.parseAmount(size),
      price: price ? this.parseAmount(price) : '0',
      timestamp: Math.floor(Date.now() / 1000),
      nonce: ++this.nonceCounter
    }

    // Sign ticket
    const signature = await this.signTicket(ticket)

    // Add to queue for batch settlement
    this.ticketQueue.push(ticket)
    this.signatures.push(signature)

    return { ticket, signature }
  }

  // Sign S-Auth ticket using EIP-712
  private async signTicket(ticket: SAuthTicket): Promise<string> {
    const typedData: SignTypedDataParameters = {
      domain: SAUTH_DOMAIN,
      types: SAUTH_TYPES,
      primaryType: 'SAuthTicket',
      message: {
        user: ticket.user,
        market: ticket.market as `0x${string}`,
        side: ticket.side,
        size: BigInt(ticket.size),
        price: BigInt(ticket.price),
        timestamp: BigInt(ticket.timestamp),
        nonce: BigInt(ticket.nonce)
      }
    }

    return await signTypedData(config, typedData)
  }

  // Validate trade parameters
  private validateTradeParams(params: {
    market: string
    side: OrderSide
    size: string
    price?: string
    orderType: OrderType
  }) {
    const { market, size, orderType } = params

    // Check market exists
    const allMarkets = [...MARKET_CONFIG.CRYPTO_MARKETS, ...MARKET_CONFIG.STOCK_MARKETS]
    const marketConfig = allMarkets.find(m => m.symbol === market)
    if (!marketConfig) {
      throw new Error(`Market ${market} not supported`)
    }

    // Check minimum position size (in USD value)
    const sizeNum = parseFloat(size)
    const marketType = market.includes('PERP') && ['BTC', 'ETH', 'SOL'].some(crypto => market.includes(crypto)) ? 'CRYPTO' : 'STOCK'
    const minUSDSize = TRADING_CONFIG.MIN_POSITION_SIZE[marketType]
    
    if (sizeNum < minUSDSize) {
      throw new Error(`Position size too small. Minimum $${minUSDSize} USDT required`)
    }

    // Check order type validity
    if (!TRADING_CONFIG.ORDER_TYPES.includes(orderType)) {
      throw new Error(`Invalid order type: ${orderType}`)
    }
  }

  // Format market symbol for contract (convert to bytes32)
  private formatMarketForContract(market: string): string {
    // Convert market symbol to bytes32 format
    const hex = Buffer.from(market, 'utf8').toString('hex')
    return '0x' + hex.padEnd(64, '0')
  }

  // Parse amount to wei (6 decimals for USDC)
  private parseAmount(amount: string): string {
    const num = parseFloat(amount)
    return Math.floor(num * 1e6).toString()
  }

  // Start automatic settlement timer
  private startSettlementTimer() {
    this.settlementTimer = setInterval(() => {
      if (this.ticketQueue.length > 0) {
        this.processBatchSettlement()
      }
    }, TRADING_CONFIG.SETTLEMENT_INTERVAL)
  }

  // Process batch settlement of S-Auth tickets
  private async processBatchSettlement() {
    if (this.ticketQueue.length === 0) return

    try {
      // Take tickets from queue (max batch size)
      const batchSize = Math.min(this.ticketQueue.length, TRADING_CONFIG.MAX_BATCH_SIZE)
      const ticketBatch = this.ticketQueue.splice(0, batchSize)
      const signatureBatch = this.signatures.splice(0, batchSize)

      // Generate Merkle tree for batch integrity
      const merkleRoot = this.generateMerkleRoot(ticketBatch)
      const merkleProofs = this.generateMerkleProofs(ticketBatch)

      // Prepare contract call parameters
      const contractTickets = ticketBatch.map(ticket => ({
        user: ticket.user,
        market: ticket.market as `0x${string}`,
        side: ticket.side,
        size: BigInt(ticket.size),
        price: BigInt(ticket.price),
        timestamp: BigInt(ticket.timestamp),
        nonce: BigInt(ticket.nonce)
      }))

      // This would call the batchSettle function on the smart contract
      console.log('Batch settlement:', {
        tickets: contractTickets,
        signatures: signatureBatch,
        merkleRoot,
        merkleProofs,
        batchSize
      })

      // In a real implementation, this would call the smart contract
      // await writeContract({
      //   address: contractAddress,
      //   abi: RIVERBIT_CORE_ABI,
      //   functionName: 'batchSettle',
      //   args: [contractTickets, signatureBatch, merkleRoot, merkleProofs]
      // })

    } catch (error) {
      console.error('Batch settlement failed:', error)
      // In case of failure, tickets should be re-queued or handled appropriately
    }
  }

  // Generate Merkle root for batch validation
  private generateMerkleRoot(tickets: SAuthTicket[]): `0x${string}` {
    // Simplified Merkle root generation
    // In production, use a proper Merkle tree library
    const ticketHashes = tickets.map(ticket => 
      this.hashTicket(ticket)
    )
    
    // Simple hash combination for demo
    const combined = ticketHashes.join('')
    const hash = this.simpleHash(combined)
    return `0x${hash}` as `0x${string}`
  }

  // Generate Merkle proofs for each ticket
  private generateMerkleProofs(tickets: SAuthTicket[]): `0x${string}`[][] {
    // Simplified Merkle proof generation
    // In production, use a proper Merkle tree library
    return tickets.map(() => [
      `0x${'0'.repeat(64)}` as `0x${string}`
    ])
  }

  // Hash individual ticket
  private hashTicket(ticket: SAuthTicket): string {
    const data = JSON.stringify(ticket)
    return this.simpleHash(data)
  }

  // Simple hash function (replace with keccak256 in production)
  private simpleHash(data: string): string {
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(32, '0').slice(0, 32)
  }

  // Calculate trading fees
  calculateTradingFees(params: {
    size: string
    price: string
    orderType: OrderType
    isMarketMaker?: boolean
  }): {
    tradingFee: string
    gasFee: string
    totalFee: string
  } {
    const { size, price, orderType, isMarketMaker = false } = params
    
    const notionalValue = parseFloat(size) * parseFloat(price)
    
    // Base trading fee (0.3% for takers, 0.1% for makers)
    const baseFeeRate = isMarketMaker ? 0.001 : 0.003
    const tradingFee = (notionalValue * baseFeeRate).toFixed(6)
    
    // FIXED: Realistic gas fee estimates for Arbitrum Sepolia
    // These are much lower than mainnet due to L2 efficiency
    const gasFee = orderType === 'market' ? '0.0001' : '0.00005' // 10x lower than before
    
    const totalFee = (parseFloat(tradingFee) + parseFloat(gasFee)).toFixed(6)
    
    return {
      tradingFee,
      gasFee,
      totalFee
    }
  }

  // Calculate position metrics
  calculatePositionMetrics(params: {
    side: OrderSide
    size: string
    entryPrice: string
    currentPrice: string
    leverage: number
  }): {
    notionalValue: string
    margin: string
    unrealizedPnl: string
    pnlPercentage: string
    liquidationPrice: string
  } {
    const { side, size, entryPrice, currentPrice, leverage } = params
    
    const sizeNum = parseFloat(size)
    const entryNum = parseFloat(entryPrice)
    const currentNum = parseFloat(currentPrice)
    
    const notionalValue = (sizeNum * currentNum).toFixed(6)
    const margin = (sizeNum * entryNum / leverage).toFixed(6)
    
    // Calculate PnL
    const priceDiff = side === 'buy' ? (currentNum - entryNum) : (entryNum - currentNum)
    const unrealizedPnl = (sizeNum * priceDiff).toFixed(6)
    const pnlPercentage = ((parseFloat(unrealizedPnl) / parseFloat(margin)) * 100).toFixed(2)
    
    // Calculate liquidation price (simplified)
    const maintenanceMargin = 0.05 // 5% maintenance margin
    const liquidationPriceCalc = side === 'buy' 
      ? entryNum * (1 - (1/leverage - maintenanceMargin))
      : entryNum * (1 + (1/leverage - maintenanceMargin))
    const liquidationPrice = liquidationPriceCalc.toFixed(6)
    
    return {
      notionalValue,
      margin,
      unrealizedPnl,
      pnlPercentage,
      liquidationPrice
    }
  }

  // Risk management checks
  validateRiskLimits(params: {
    userBalance: string
    totalMarginUsed: string
    newTradeMargin: string
    leverage: number
    market: string
  }): {
    isValid: boolean
    error?: string
    warnings: string[]
  } {
    const { userBalance, totalMarginUsed, newTradeMargin, leverage, market } = params
    const warnings: string[] = []
    
    const balance = parseFloat(userBalance)
    const usedMargin = parseFloat(totalMarginUsed)
    const newMargin = parseFloat(newTradeMargin)
    const requiredMargin = usedMargin + newMargin
    
    // Check sufficient balance
    if (requiredMargin > balance) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.INSUFFICIENT_BALANCE,
        warnings
      }
    }
    
    // Check leverage limits
    const marketType = market.includes('PERP') && ['BTC', 'ETH', 'SOL'].some(crypto => market.includes(crypto)) ? 'CRYPTO' : 'STOCK'
    const maxLeverage = TRADING_CONFIG.MAX_LEVERAGE[marketType]
    
    if (leverage > maxLeverage) {
      return {
        isValid: false,
        error: `Maximum leverage for ${marketType} markets is ${maxLeverage}x`,
        warnings
      }
    }
    
    // Check margin utilization
    const marginUtilization = (requiredMargin / balance) * 100
    if (marginUtilization > 90) {
      warnings.push('High margin utilization (>90%). Consider reducing position size.')
    } else if (marginUtilization > 70) {
      warnings.push('Moderate margin utilization (>70%). Monitor your positions closely.')
    }
    
    // Check Three Iron Laws compliance
    if (balance - requiredMargin < 0) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.THREE_IRON_LAWS_VIOLATION,
        warnings
      }
    }
    
    return {
      isValid: true,
      warnings
    }
  }

  // Get current queue status
  getQueueStatus(): {
    pendingTickets: number
    nextSettlement: number
    estimatedGasSavings: string
  } {
    const nextSettlement = TRADING_CONFIG.SETTLEMENT_INTERVAL - (Date.now() % TRADING_CONFIG.SETTLEMENT_INTERVAL)
    const estimatedGasSavings = this.ticketQueue.length > 1 
      ? ((this.ticketQueue.length - 1) * 0.1 * 100).toFixed(1) + '%'
      : '0%'
    
    return {
      pendingTickets: this.ticketQueue.length,
      nextSettlement,
      estimatedGasSavings
    }
  }

  // Clear queue (for testing or emergency)
  clearQueue() {
    this.ticketQueue = []
    this.signatures = []
  }

  // Stop settlement timer
  stopSettlement() {
    if (this.settlementTimer) {
      clearInterval(this.settlementTimer)
      this.settlementTimer = null
    }
  }

  // Restart settlement timer
  restartSettlement() {
    this.stopSettlement()
    this.startSettlementTimer()
  }
}

// Export singleton instance
export const tradingService = TradingService.getInstance()