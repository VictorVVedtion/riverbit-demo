// CoinGecko API集成 - 加密货币价格数据

interface CoinGeckoPriceData {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  market_cap: number;
}

export interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume: string;
  high24h: number;
  low24h: number;
  marketCap: number;
}

// CoinGecko符号映射
const COINGECKO_SYMBOL_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum', 
  'SOL': 'solana',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'UNI': 'uniswap',
  'AAVE': 'aave'
};

// 获取CoinGecko ID
const getCoinGeckoId = (symbol: string): string => {
  const cleanSymbol = symbol.replace('/USDT', '').replace('/', '');
  return COINGECKO_SYMBOL_MAP[cleanSymbol.toUpperCase()] || cleanSymbol.toLowerCase();
};

// 格式化交易量
const formatVolume = (volume: number): string => {
  if (volume >= 1e9) {
    return `${(volume / 1e9).toFixed(1)}B`;
  } else if (volume >= 1e6) {
    return `${(volume / 1e6).toFixed(1)}M`;
  } else if (volume >= 1e3) {
    return `${(volume / 1e3).toFixed(1)}K`;
  } else {
    return volume.toString();
  }
};

// 获取单个加密货币价格
export const getCryptoPrice = async (symbol: string): Promise<CryptoPrice | null> => {
  try {
    const coinId = getCoinGeckoId(symbol);
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&precision=full`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const coinData = data[coinId];

    if (!coinData) {
      console.warn(`No price data found for ${symbol} (${coinId})`);
      return null;
    }

    return {
      symbol: symbol,
      price: coinData.usd || 0,
      change24h: coinData.usd_24h_change || 0,
      volume: formatVolume(coinData.usd_24h_vol || 0),
      high24h: 0, // CoinGecko simple API doesn't provide this
      low24h: 0,  // CoinGecko simple API doesn't provide this
      marketCap: coinData.usd_market_cap || 0
    };

  } catch (error) {
    console.error(`Failed to fetch crypto price for ${symbol}:`, error);
    return null;
  }
};

// 批量获取加密货币价格
export const getBatchCryptoPrices = async (symbols: string[]): Promise<Map<string, CryptoPrice>> => {
  const priceMap = new Map<string, CryptoPrice>();
  
  try {
    // 构建CoinGecko IDs
    const coinIds = symbols.map(symbol => getCoinGeckoId(symbol));
    const uniqueCoinIds = Array.from(new Set(coinIds));
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${uniqueCoinIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&precision=full`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // 映射回原始符号
    symbols.forEach(symbol => {
      const coinId = getCoinGeckoId(symbol);
      const coinData = data[coinId];

      if (coinData) {
        priceMap.set(symbol, {
          symbol: symbol,
          price: coinData.usd || 0,
          change24h: coinData.usd_24h_change || 0,
          volume: formatVolume(coinData.usd_24h_vol || 0),
          high24h: 0,
          low24h: 0,
          marketCap: coinData.usd_market_cap || 0
        });
      }
    });

  } catch (error) {
    console.error('Failed to fetch batch crypto prices:', error);
  }

  return priceMap;
};

// 获取详细的加密货币数据（包含高低点）
export const getDetailedCryptoPrice = async (symbol: string): Promise<CryptoPrice | null> => {
  try {
    const coinId = getCoinGeckoId(symbol);
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const marketData = data.market_data;

    if (!marketData) {
      return null;
    }

    return {
      symbol: symbol,
      price: marketData.current_price?.usd || 0,
      change24h: marketData.price_change_percentage_24h || 0,
      volume: formatVolume(marketData.total_volume?.usd || 0),
      high24h: marketData.high_24h?.usd || 0,
      low24h: marketData.low_24h?.usd || 0,
      marketCap: marketData.market_cap?.usd || 0
    };

  } catch (error) {
    console.error(`Failed to fetch detailed crypto price for ${symbol}:`, error);
    return null;
  }
};

// 检查是否为加密货币符号
export const isCryptoSymbol = (symbol: string): boolean => {
  const cleanSymbol = symbol.replace('/USDT', '').replace('/', '');
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'ADA', 'DOT', 'MATIC', 'UNI', 'AAVE'];
  return cryptoSymbols.includes(cleanSymbol.toUpperCase());
};

// WebSocket连接获取实时加密货币价格 (可选实现)
export class CoinGeckoWebSocket {
  private ws: WebSocket | null = null;
  private symbols: Set<string> = new Set();
  private callbacks: Map<string, (data: CryptoPrice) => void> = new Map();
  
  constructor() {
    // CoinGecko的WebSocket需要专业版API
    // 这里可以实现轮询作为替代
    this.startPolling();
  }
  
  private startPolling() {
    setInterval(async () => {
      if (this.symbols.size > 0) {
        const symbolArray = Array.from(this.symbols);
        const priceMap = await getBatchCryptoPrices(symbolArray);
        
        priceMap.forEach((priceData, symbol) => {
          const callback = this.callbacks.get(symbol);
          if (callback) {
            callback(priceData);
          }
        });
      }
    }, 30000); // 每30秒更新一次
  }
  
  public subscribe(symbol: string, callback: (data: CryptoPrice) => void) {
    this.symbols.add(symbol);
    this.callbacks.set(symbol, callback);
  }
  
  public unsubscribe(symbol: string) {
    this.symbols.delete(symbol);
    this.callbacks.delete(symbol);
  }
  
  public disconnect() {
    this.symbols.clear();
    this.callbacks.clear();
  }
}