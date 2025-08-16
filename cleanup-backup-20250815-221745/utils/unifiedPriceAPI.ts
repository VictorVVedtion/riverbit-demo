// 统一价格数据服务 - 整合CoinGecko和Finnhub

import { 
  getCryptoPrice, 
  getBatchCryptoPrices, 
  getDetailedCryptoPrice, 
  isCryptoSymbol,
  CoinGeckoWebSocket,
  type CryptoPrice 
} from './coinGeckoAPI';

import {
  getFMPStockPrice,
  getBatchFMPStockPrices,
  isStockSymbol,
  FMPPolling,
  type StockPrice
} from './fmpAPI';

// 统一的价格数据接口
export interface UnifiedPriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent?: number;
  volume: string;
  high24h: number;
  low24h: number;
  openPrice?: number;
  previousClose?: number;
  marketCap?: number;
  source: 'coingecko' | 'fmp' | 'mock';
  lastUpdated: number;
}

// 价格缓存
class PriceCache {
  private cache = new Map<string, { data: UnifiedPriceData; timestamp: number }>();
  private readonly TTL = 30000; // 30秒缓存

  set(symbol: string, data: UnifiedPriceData) {
    this.cache.set(symbol, {
      data: { ...data, lastUpdated: Date.now() },
      timestamp: Date.now()
    });
  }

  get(symbol: string): UnifiedPriceData | null {
    const cached = this.cache.get(symbol);
    if (!cached) return null;

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(symbol);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }
}

const priceCache = new PriceCache();

// 转换CryptoPrice到UnifiedPriceData
const convertCryptoPrice = (crypto: CryptoPrice): UnifiedPriceData => ({
  symbol: crypto.symbol,
  price: crypto.price,
  change24h: crypto.change24h,
  changePercent: crypto.change24h,
  volume: crypto.volume,
  high24h: crypto.high24h,
  low24h: crypto.low24h,
  marketCap: crypto.marketCap,
  source: 'coingecko',
  lastUpdated: Date.now()
});

// 转换FMPStockPrice到UnifiedPriceData
const convertFMPStockPrice = (stock: StockPrice): UnifiedPriceData => ({
  symbol: stock.symbol,
  price: stock.price,
  change24h: stock.changePercent,
  changePercent: stock.changePercent,
  volume: stock.volume,
  high24h: stock.high24h,
  low24h: stock.low24h,
  openPrice: stock.openPrice,
  previousClose: stock.previousClose,
  marketCap: stock.marketCap,
  source: 'fmp',
  lastUpdated: Date.now()
});

// 获取单个符号的价格
export const getUnifiedPrice = async (symbol: string): Promise<UnifiedPriceData | null> => {
  try {
    // 首先检查缓存
    const cached = priceCache.get(symbol);
    if (cached) {
      return cached;
    }

    let priceData: UnifiedPriceData | null = null;

    if (isCryptoSymbol(symbol)) {
      // 获取加密货币价格
      const cryptoPrice = await getDetailedCryptoPrice(symbol);
      if (cryptoPrice) {
        priceData = convertCryptoPrice(cryptoPrice);
      }
    } else if (isStockSymbol(symbol)) {
      // 使用FMP获取股票价格
      const stockPrice = await getFMPStockPrice(symbol);
      if (stockPrice) {
        priceData = convertFMPStockPrice(stockPrice);
      }
    }

    // 缓存结果
    if (priceData) {
      priceCache.set(symbol, priceData);
    }

    return priceData;
  } catch (error) {
    console.error(`Failed to get unified price for ${symbol}:`, error);
    return null;
  }
};

// 批量获取价格
export const getBatchUnifiedPrices = async (symbols: string[]): Promise<Map<string, UnifiedPriceData>> => {
  const priceMap = new Map<string, UnifiedPriceData>();
  
  // 分离加密货币和股票符号
  const cryptoSymbols = symbols.filter(isCryptoSymbol);
  const stockSymbols = symbols.filter(isStockSymbol);

  try {
    // 并行获取加密货币和股票价格
    const [cryptoPrices, stockPrices] = await Promise.all([
      cryptoSymbols.length > 0 ? getBatchCryptoPrices(cryptoSymbols) : Promise.resolve(new Map()),
      stockSymbols.length > 0 ? getBatchFMPStockPrices(stockSymbols) : Promise.resolve(new Map())
    ]);

    // 转换并合并结果
    cryptoPrices.forEach((crypto, symbol) => {
      const unified = convertCryptoPrice(crypto);
      priceMap.set(symbol, unified);
      priceCache.set(symbol, unified);
    });

    stockPrices.forEach((stock, symbol) => {
      const unified = convertFMPStockPrice(stock);
      priceMap.set(symbol, unified);
      priceCache.set(symbol, unified);
    });

  } catch (error) {
    console.error('Failed to get batch unified prices:', error);
  }

  return priceMap;
};

// 统一的WebSocket管理器
export class UnifiedPriceWebSocket {
  private cryptoWS: CoinGeckoWebSocket | null = null;
  private fmpPolling: FMPPolling | null = null;
  private callbacks = new Map<string, (data: UnifiedPriceData) => void>();

  constructor() {
    this.cryptoWS = new CoinGeckoWebSocket();
    this.fmpPolling = new FMPPolling();
  }

  subscribe(symbol: string, callback: (data: UnifiedPriceData) => void) {
    this.callbacks.set(symbol, callback);

    if (isCryptoSymbol(symbol) && this.cryptoWS) {
      this.cryptoWS.subscribe(symbol, (cryptoData) => {
        const unified = convertCryptoPrice(cryptoData);
        priceCache.set(symbol, unified);
        callback(unified);
      });
    } else if (isStockSymbol(symbol) && this.fmpPolling) {
      this.fmpPolling.subscribe(symbol, (stockData) => {
        const unified = convertFMPStockPrice(stockData);
        priceCache.set(symbol, unified);
        callback(unified);
      });
    }
  }

  unsubscribe(symbol: string) {
    this.callbacks.delete(symbol);

    if (isCryptoSymbol(symbol) && this.cryptoWS) {
      this.cryptoWS.unsubscribe(symbol);
    } else if (isStockSymbol(symbol) && this.fmpPolling) {
      this.fmpPolling.unsubscribe(symbol);
    }
  }

  disconnect() {
    if (this.cryptoWS) {
      this.cryptoWS.disconnect();
      this.cryptoWS = null;
    }
    if (this.fmpPolling) {
      this.fmpPolling.disconnect();
      this.fmpPolling = null;
    }
    this.callbacks.clear();
    priceCache.clear();
  }
}

// 获取价格源信息
export const getPriceSourceInfo = (symbol: string): { source: string; name: string; website: string } => {
  if (isCryptoSymbol(symbol)) {
    return {
      source: 'coingecko',
      name: 'CoinGecko',
      website: 'https://www.coingecko.com'
    };
  } else if (isStockSymbol(symbol)) {
    return {
      source: 'fmp',
      name: 'Financial Modeling Prep',
      website: 'https://financialmodelingprep.com'
    };
  } else {
    return {
      source: 'mock',
      name: 'Mock Data',
      website: ''
    };
  }
};

// 检查市场状态
export const getMarketStatus = (symbol: string): 'open' | 'closed' | 'unknown' => {
  if (isCryptoSymbol(symbol)) {
    return 'open'; // 加密货币市场24/7开放
  } else if (isStockSymbol(symbol)) {
    // 简单的美股市场时间检查 (需要更精确的实现)
    const now = new Date();
    const utcHour = now.getUTCHours();
    const isWeekday = now.getUTCDay() >= 1 && now.getUTCDay() <= 5;
    
    // 美股交易时间: UTC 14:30-21:00 (EDT) 或 UTC 13:30-20:00 (EST)
    const isMarketHours = isWeekday && utcHour >= 13 && utcHour < 21;
    return isMarketHours ? 'open' : 'closed';
  }
  
  return 'unknown';
};

// 导出类型
export type { CryptoPrice, StockPrice };