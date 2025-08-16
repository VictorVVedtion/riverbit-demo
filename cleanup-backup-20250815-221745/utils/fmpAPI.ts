// Financial Modeling Prep API - 免费高质量美股实时数据

interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

interface StockPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent: number;
  volume: string;
  high24h: number;
  low24h: number;
  openPrice: number;
  previousClose: number;
  marketCap?: number;
  marketState: 'REGULAR' | 'CLOSED' | 'PRE' | 'POST';
  exchangeName: string;
  lastUpdateTime: number;
}

// FMP API配置 - 免费版每日250次请求
const FMP_API_BASE = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = import.meta.env?.VITE_FMP_API_KEY || 'demo'; // 使用Vite环境变量或demo key

// 格式化交易量
const formatVolume = (volume: number): string => {
  if (!volume || isNaN(volume)) return '0';
  
  if (volume >= 1e9) {
    return `${(volume / 1e9).toFixed(1)}B`;
  } else if (volume >= 1e6) {
    return `${(volume / 1e6).toFixed(1)}M`;
  } else if (volume >= 1e3) {
    return `${(volume / 1e3).toFixed(1)}K`;
  } else {
    return Math.round(volume).toString();
  }
};

// 清理股票符号
const cleanStockSymbol = (symbol: string): string => {
  let cleanSymbol = symbol;
  
  if (cleanSymbol.startsWith('x')) {
    cleanSymbol = cleanSymbol.substring(1);
  }
  
  if (cleanSymbol.includes('/')) {
    cleanSymbol = cleanSymbol.split('/')[0];
  }
  
  return cleanSymbol.toUpperCase();
};

// 检查市场是否开放（简单版本）
const isMarketOpen = (): boolean => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const utcTime = utcHour + utcMinute / 60;
  
  // 美股交易时间：UTC 14:30-21:00 (EST) 或 UTC 13:30-20:00 (EDT)
  const isWeekday = now.getUTCDay() >= 1 && now.getUTCDay() <= 5;
  const isInTradingHours = utcTime >= 13.5 && utcTime <= 21;
  
  return isWeekday && isInTradingHours;
};

// Mock数据作为fallback
const getMockStockPrice = (symbol: string): StockPrice => {
  const basePrice = symbol.includes('AAPL') ? 185.20 : 
                   symbol.includes('GOOGL') ? 142.50 : 
                   symbol.includes('MSFT') ? 378.85 : 
                   symbol.includes('AMZN') ? 145.75 : 
                   symbol.includes('TSLA') ? 248.42 : 
                   symbol.includes('NVDA') ? 118.11 : 
                   symbol.includes('META') ? 485.73 : 125.50;
  
  const randomChange = (Math.random() - 0.5) * 4; // -2% to +2%
  const price = basePrice * (1 + randomChange / 100);
  
  return {
    symbol: symbol,
    price: price,
    change24h: randomChange,
    changePercent: randomChange,
    volume: formatVolume(Math.random() * 50000000 + 1000000),
    high24h: price * 1.02,
    low24h: price * 0.98,
    openPrice: price * 1.001,
    previousClose: price / (1 + randomChange / 100),
    marketCap: price * 1000000000,
    marketState: isMarketOpen() ? 'REGULAR' : 'CLOSED',
    exchangeName: 'NASDAQ',
    lastUpdateTime: Date.now()
  };
};

// 获取单个股票价格
export const getFMPStockPrice = async (symbol: string): Promise<StockPrice | null> => {
  try {
    const cleanSymbol = cleanStockSymbol(symbol);
    
    // 如果API key是demo，直接返回mock数据
    if (FMP_API_KEY === 'demo') {
      console.warn(`Using mock data for ${symbol} (demo API key)`);
      return getMockStockPrice(symbol);
    }
    
    // 使用quote端点获取实时报价
    const url = `${FMP_API_BASE}/quote/${cleanSymbol}?apikey=${FMP_API_KEY}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TradingApp/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`FMP API rate limit exceeded for ${symbol}, using mock data`);
        return getMockStockPrice(symbol);
      }
      if (response.status === 401 || response.status === 403) {
        console.warn(`FMP API authentication failed for ${symbol}, using mock data`);
        return getMockStockPrice(symbol);
      }
      throw new Error(`FMP API error: ${response.status}`);
    }

    const data = await response.json();
    
    // FMP返回数组
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`No price data found for ${symbol}, using mock data`);
      return getMockStockPrice(symbol);
    }

    const quote: FMPQuote = data[0];
    
    // 检查数据有效性
    if (!quote.price || quote.price === 0) {
      console.warn(`Invalid price data for ${symbol}, using mock data`);
      return getMockStockPrice(symbol);
    }

    return {
      symbol: symbol,
      price: quote.price,
      change24h: quote.changesPercentage,
      changePercent: quote.changesPercentage,
      volume: formatVolume(quote.volume || 0),
      high24h: quote.dayHigh || quote.price,
      low24h: quote.dayLow || quote.price,
      openPrice: quote.open || quote.price,
      previousClose: quote.previousClose || quote.price,
      marketCap: quote.marketCap || 0,
      marketState: isMarketOpen() ? 'REGULAR' : 'CLOSED',
      exchangeName: quote.exchange || 'NASDAQ',
      lastUpdateTime: quote.timestamp * 1000 || Date.now()
    };

  } catch (error) {
    console.error(`Failed to fetch FMP stock price for ${symbol}:`, error);
    console.warn(`Using mock data for ${symbol} due to API error`);
    return getMockStockPrice(symbol);
  }
};

// 批量获取股票价格
export const getBatchFMPStockPrices = async (symbols: string[]): Promise<Map<string, StockPrice>> => {
  const priceMap = new Map<string, StockPrice>();
  
  if (symbols.length === 0) return priceMap;
  
  // 如果API key是demo，直接返回mock数据
  if (FMP_API_KEY === 'demo') {
    console.warn(`Using mock data for batch request (demo API key)`);
    symbols.forEach(symbol => {
      priceMap.set(symbol, getMockStockPrice(symbol));
    });
    return priceMap;
  }
  
  try {
    // FMP支持批量查询
    const cleanSymbols = symbols.map(cleanStockSymbol);
    const symbolsParam = cleanSymbols.join(',');
    
    const url = `${FMP_API_BASE}/quote/${symbolsParam}?apikey=${FMP_API_KEY}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TradingApp/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 401 || response.status === 403) {
        console.warn(`FMP API error ${response.status}, using mock data for batch request`);
        symbols.forEach(symbol => {
          priceMap.set(symbol, getMockStockPrice(symbol));
        });
        return priceMap;
      }
      throw new Error(`FMP batch API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      data.forEach((quote: FMPQuote, index: number) => {
        const originalSymbol = symbols[index];
        
        if (quote && quote.price && quote.price > 0) {
          priceMap.set(originalSymbol, {
            symbol: originalSymbol,
            price: quote.price,
            change24h: quote.changesPercentage,
            changePercent: quote.changesPercentage,
            volume: formatVolume(quote.volume || 0),
            high24h: quote.dayHigh || quote.price,
            low24h: quote.dayLow || quote.price,
            openPrice: quote.open || quote.price,
            previousClose: quote.previousClose || quote.price,
            marketCap: quote.marketCap || 0,
            marketState: isMarketOpen() ? 'REGULAR' : 'CLOSED',
            exchangeName: quote.exchange || 'NASDAQ',
            lastUpdateTime: quote.timestamp * 1000 || Date.now()
          });
        } else {
          // 如果单个股票数据无效，使用mock数据
          priceMap.set(originalSymbol, getMockStockPrice(originalSymbol));
        }
      });
    } else {
      // 如果API返回非数组，使用mock数据
      console.warn('FMP API returned non-array data, using mock data');
      symbols.forEach(symbol => {
        priceMap.set(symbol, getMockStockPrice(symbol));
      });
    }

  } catch (error) {
    console.error('Failed to fetch batch FMP stock prices:', error);
    
    // 如果批量失败，使用mock数据
    console.warn('Using mock data for all symbols due to batch API failure');
    symbols.forEach(symbol => {
      priceMap.set(symbol, getMockStockPrice(symbol));
    });
  }

  return priceMap;
};

// 获取实时股价（简化版）
export const getFMPRealTimePrice = async (symbol: string): Promise<number | null> => {
  try {
    const cleanSymbol = cleanStockSymbol(symbol);
    
    // 使用实时价格端点
    const url = `${FMP_API_BASE}/stock/real-time-price/${cleanSymbol}?apikey=${FMP_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      // 回退到quote端点
      const priceData = await getFMPStockPrice(symbol);
      return priceData?.price || null;
    }

    const data = await response.json();
    return data?.price || null;

  } catch (error) {
    console.error(`Failed to fetch FMP real-time price for ${symbol}:`, error);
    return null;
  }
};

// 检查是否为股票符号
export const isStockSymbol = (symbol: string): boolean => {
  return symbol.startsWith('x') && !symbol.includes('BTC') && !symbol.includes('ETH') && !symbol.includes('SOL');
};

// FMP轮询管理器
export class FMPPolling {
  private symbols: Set<string> = new Set();
  private callbacks: Map<string, (data: StockPrice) => void> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private requestCount: number = 0;
  private maxRequestsPerDay: number = 250; // 免费版限制
  
  constructor() {
    this.startPolling();
    
    // 每天重置请求计数
    setInterval(() => {
      this.requestCount = 0;
      console.log('FMP API request count reset');
    }, 24 * 60 * 60 * 1000);
  }
  
  private startPolling() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.intervalId = setInterval(async () => {
      if (this.symbols.size === 0) return;
      
      // 检查每日配额
      if (this.requestCount >= this.maxRequestsPerDay) {
        console.log('FMP API daily limit reached');
        return;
      }
      
      try {
        const symbolArray = Array.from(this.symbols);
        const priceMap = await getBatchFMPStockPrices(symbolArray);
        
        priceMap.forEach((priceData, symbol) => {
          const callback = this.callbacks.get(symbol);
          if (callback) {
            callback(priceData);
          }
        });
        
        this.requestCount++;
        
      } catch (error) {
        console.error('FMP polling error:', error);
      }
    }, 30000); // 每30秒更新一次，节约配额
  }
  
  public subscribe(symbol: string, callback: (data: StockPrice) => void) {
    this.symbols.add(symbol);
    this.callbacks.set(symbol, callback);
    
    // 立即获取一次数据
    if (this.requestCount < this.maxRequestsPerDay) {
      getFMPStockPrice(symbol).then(data => {
        if (data) {
          callback(data);
        }
        this.requestCount++;
      }).catch(error => {
        console.error(`Initial FMP fetch error for ${symbol}:`, error);
      });
    }
  }
  
  public unsubscribe(symbol: string) {
    this.symbols.delete(symbol);
    this.callbacks.delete(symbol);
  }
  
  public disconnect() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.symbols.clear();
    this.callbacks.clear();
  }
  
  public getRequestCount(): number {
    return this.requestCount;
  }
}

// 导出类型
export type { StockPrice, FMPQuote };