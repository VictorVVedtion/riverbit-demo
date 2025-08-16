import { MARKET_CONFIG } from '../constants/contractConstants'

// Price data interface
export interface PriceData {
  symbol: string
  price: number
  change24h: number
  changePercent24h: number
  volume24h: number
  marketCap?: number
  timestamp: number
  confidence: number // 0-100 confidence score
}

// WebSocket price update interface
export interface PriceUpdate {
  symbol: string
  price: number
  timestamp: number
  source: string
}

// Price feed sources
type PriceSource = 'binance' | 'coinbase' | 'kraken' | 'polygon' | 'mock'

export class PriceFeedService {
  private static instance: PriceFeedService
  private subscribers: Map<string, Set<(data: PriceData) => void>> = new Map()
  private priceCache: Map<string, PriceData> = new Map()
  private websockets: Map<PriceSource, WebSocket> = new Map()
  private mockPriceInterval: NodeJS.Timeout | null = null
  private isInitialized = false

  // Base prices for mock data
  private basePrices: Record<string, number> = {
    'BTC-PERP': 67425.23,
    'ETH-PERP': 3842.15,
    'SOL-PERP': 245.67,
    'AAPL-PERP': 192.35,
    'TSLA-PERP': 248.42,
    'NVDA-PERP': 896.73,
    'MSFT-PERP': 423.18,
    'GOOGL-PERP': 175.84,
    'META-PERP': 523.91,
    'AMZN-PERP': 186.29
  }

  private constructor() {
    this.initializePriceFeed()
  }

  static getInstance(): PriceFeedService {
    if (!PriceFeedService.instance) {
      PriceFeedService.instance = new PriceFeedService()
    }
    return PriceFeedService.instance
  }

  // Initialize price feed connections
  private async initializePriceFeed() {
    if (this.isInitialized) return

    // Initialize mock data first
    this.initializeMockPrices()
    
    // For demo purposes, use mock data with realistic fluctuations
    this.startMockPriceFeed()

    // In production, initialize real WebSocket connections
    // this.initializeBinanceWS()
    // this.initializeCoinbaseWS()
    // this.initializePolygonWS()

    this.isInitialized = true
  }

  // Initialize mock prices
  private initializeMockPrices() {
    const allMarkets = [...MARKET_CONFIG.CRYPTO_MARKETS, ...MARKET_CONFIG.STOCK_MARKETS]
    
    allMarkets.forEach(market => {
      const basePrice = this.basePrices[market.symbol] || 100
      const mockData: PriceData = {
        symbol: market.symbol,
        price: basePrice,
        change24h: (Math.random() - 0.5) * basePrice * 0.1, // ±10% change
        changePercent24h: (Math.random() - 0.5) * 10, // ±10%
        volume24h: Math.random() * 1000000000, // Random volume
        marketCap: market.baseAsset.includes('BTC') ? 1300000000000 : undefined,
        timestamp: Date.now(),
        confidence: 95 + Math.random() * 5 // 95-100% confidence
      }
      this.priceCache.set(market.symbol, mockData)
    })
  }

  // Start mock price feed for demo
  private startMockPriceFeed() {
    this.mockPriceInterval = setInterval(() => {
      this.updateMockPrices()
    }, 1000) // Update every second
  }

  // Update mock prices with realistic fluctuations
  private updateMockPrices() {
    this.priceCache.forEach((priceData, symbol) => {
      // Generate realistic price movement
      const volatility = this.getVolatility(symbol)
      const randomChange = (Math.random() - 0.5) * volatility * priceData.price
      const newPrice = Math.max(priceData.price + randomChange, priceData.price * 0.001) // Prevent negative prices

      // Update 24h change calculation
      const basePrice = this.basePrices[symbol] || priceData.price
      const change24h = newPrice - basePrice
      const changePercent24h = (change24h / basePrice) * 100

      const updatedData: PriceData = {
        ...priceData,
        price: Number(newPrice.toFixed(6)),
        change24h: Number(change24h.toFixed(6)),
        changePercent24h: Number(changePercent24h.toFixed(2)),
        timestamp: Date.now(),
        confidence: 95 + Math.random() * 5
      }

      this.priceCache.set(symbol, updatedData)
      this.notifySubscribers(symbol, updatedData)
    })
  }

  // Get volatility based on asset type
  private getVolatility(symbol: string): number {
    if (symbol.includes('BTC')) return 0.0001 // 0.01% per second
    if (symbol.includes('ETH')) return 0.00015 // 0.015% per second
    if (symbol.includes('SOL')) return 0.0002 // 0.02% per second
    return 0.00008 // 0.008% per second for stocks
  }

  // Subscribe to price updates for a symbol
  subscribe(symbol: string, callback: (data: PriceData) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set())
    }
    
    this.subscribers.get(symbol)!.add(callback)

    // Send current price if available
    const currentPrice = this.priceCache.get(symbol)
    if (currentPrice) {
      callback(currentPrice)
    }

    // Return unsubscribe function
    return () => {
      const symbolSubscribers = this.subscribers.get(symbol)
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback)
        if (symbolSubscribers.size === 0) {
          this.subscribers.delete(symbol)
        }
      }
    }
  }

  // Notify all subscribers of price updates
  private notifySubscribers(symbol: string, data: PriceData) {
    const symbolSubscribers = this.subscribers.get(symbol)
    if (symbolSubscribers) {
      symbolSubscribers.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in price update callback:', error)
        }
      })
    }
  }

  // Get current price for a symbol
  getCurrentPrice(symbol: string): PriceData | null {
    return this.priceCache.get(symbol) || null
  }

  // Get all current prices
  getAllPrices(): Map<string, PriceData> {
    return new Map(this.priceCache)
  }

  // Get price history (mock implementation)
  getPriceHistory(symbol: string, interval: '1m' | '5m' | '1h' | '1d' = '1m', limit = 100): PriceData[] {
    const currentPrice = this.getCurrentPrice(symbol)
    if (!currentPrice) return []

    const history: PriceData[] = []
    const now = Date.now()
    const intervalMs = this.getIntervalMs(interval)

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * intervalMs)
      const volatility = this.getVolatility(symbol)
      const priceVariation = (Math.random() - 0.5) * volatility * currentPrice.price * i * 0.1
      
      history.push({
        ...currentPrice,
        price: Number((currentPrice.price + priceVariation).toFixed(6)),
        timestamp
      })
    }

    return history
  }

  // Convert interval string to milliseconds
  private getIntervalMs(interval: string): number {
    switch (interval) {
      case '1m': return 60 * 1000
      case '5m': return 5 * 60 * 1000
      case '1h': return 60 * 60 * 1000
      case '1d': return 24 * 60 * 60 * 1000
      default: return 60 * 1000
    }
  }

  // Initialize Binance WebSocket (for production)
  private initializeBinanceWS() {
    const symbols = MARKET_CONFIG.CRYPTO_MARKETS.map(m => 
      m.baseAsset.toLowerCase() + 'usdt'
    ).join('/')

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbols}@ticker`)
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.s) {
          this.processBinanceUpdate(data)
        }
      } catch (error) {
        console.error('Binance WebSocket error:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('Binance WebSocket error:', error)
      // Implement reconnection logic
      setTimeout(() => this.initializeBinanceWS(), 5000)
    }

    this.websockets.set('binance', ws)
  }

  // Process Binance price update
  private processBinanceUpdate(data: any) {
    const symbol = data.s.replace('USDT', '-PERP')
    const priceData: PriceData = {
      symbol,
      price: parseFloat(data.c),
      change24h: parseFloat(data.P),
      changePercent24h: parseFloat(data.p),
      volume24h: parseFloat(data.v),
      timestamp: Date.now(),
      confidence: 98
    }

    this.priceCache.set(symbol, priceData)
    this.notifySubscribers(symbol, priceData)
  }

  // Calculate order book spread simulation
  getOrderBookSpread(symbol: string): { bid: number; ask: number; spread: number } | null {
    const priceData = this.getCurrentPrice(symbol)
    if (!priceData) return null

    const spreadPercent = symbol.includes('BTC') ? 0.0001 : 
                         symbol.includes('ETH') ? 0.0002 : 0.0005 // 0.01%, 0.02%, 0.05%
    
    const spreadAmount = priceData.price * spreadPercent
    const bid = priceData.price - spreadAmount / 2
    const ask = priceData.price + spreadAmount / 2

    return {
      bid: Number(bid.toFixed(6)),
      ask: Number(ask.toFixed(6)),
      spread: Number(spreadAmount.toFixed(6))
    }
  }

  // Get market statistics
  getMarketStats(symbol: string): {
    high24h: number
    low24h: number
    volume24h: number
    trades24h: number
  } | null {
    const priceData = this.getCurrentPrice(symbol)
    if (!priceData) return null

    const high24h = priceData.price * (1 + Math.abs(priceData.changePercent24h) / 100)
    const low24h = priceData.price * (1 - Math.abs(priceData.changePercent24h) / 100)

    return {
      high24h: Number(high24h.toFixed(6)),
      low24h: Number(low24h.toFixed(6)),
      volume24h: priceData.volume24h,
      trades24h: Math.floor(priceData.volume24h / priceData.price * 100) // Estimated
    }
  }

  // Cleanup
  destroy() {
    // Clear mock interval
    if (this.mockPriceInterval) {
      clearInterval(this.mockPriceInterval)
      this.mockPriceInterval = null
    }

    // Close all WebSocket connections
    this.websockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    })
    this.websockets.clear()

    // Clear subscribers
    this.subscribers.clear()
    this.priceCache.clear()
    this.isInitialized = false
  }

  // Get supported markets
  getSupportedMarkets(): string[] {
    return [...MARKET_CONFIG.CRYPTO_MARKETS, ...MARKET_CONFIG.STOCK_MARKETS].map(m => m.symbol)
  }

  // Check if market is active (for stocks, check market hours)
  isMarketActive(symbol: string): boolean {
    if (symbol.includes('PERP') && ['BTC', 'ETH', 'SOL'].some(crypto => symbol.includes(crypto))) {
      return true // Crypto markets are 24/7
    }

    // For stocks, check market hours (simplified)
    const now = new Date()
    const hour = now.getUTCHours() - 5 // EST
    const day = now.getUTCDay()

    // Market open Monday-Friday 9:30 AM - 4:00 PM EST
    if (day === 0 || day === 6) return false // Weekend
    if (hour < 9 || hour >= 16) return false // After hours

    return true
  }
}

// Export singleton instance
export const priceFeedService = PriceFeedService.getInstance()

// React hook for using price feed
export function usePriceFeed(symbol: string) {
  const [priceData, setPriceData] = React.useState<PriceData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const unsubscribe = priceFeedService.subscribe(symbol, (data) => {
      setPriceData(data)
      setIsLoading(false)
    })

    return unsubscribe
  }, [symbol])

  return { priceData, isLoading }
}

// React hook for multiple symbols
export function useMultiplePriceFeeds(symbols: string[]) {
  const [priceData, setPriceData] = React.useState<Map<string, PriceData>>(new Map())
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = []
    const dataMap = new Map<string, PriceData>()

    symbols.forEach(symbol => {
      const unsubscribe = priceFeedService.subscribe(symbol, (data) => {
        dataMap.set(symbol, data)
        setPriceData(new Map(dataMap))
        setIsLoading(false)
      })
      unsubscribeFunctions.push(unsubscribe)
    })

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
    }
  }, [symbols])

  return { priceData, isLoading }
}

// We need to import React for the hooks
import React from 'react'