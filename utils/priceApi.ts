import React from 'react';

// 免费价格API接口

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume: string;
  high24h: number;
  low24h: number;
  lastUpdate: number;
}

// CoinGecko API - 免费的加密货币价格数据（优化版本）
export const getCryptoPrice = async (symbol: string): Promise<PriceData | null> => {
  try {
    // 转换交易对格式 (BTC/USDT -> bitcoin)
    const coinMap: { [key: string]: string } = {
      'BTC/USDT': 'bitcoin',
      'ETH/USDT': 'ethereum',
      'SOL/USDT': 'solana',
      'MATIC/USDT': 'polygon',
      'AVAX/USDT': 'avalanche-2',
      'DOT/USDT': 'polkadot',
      'LINK/USDT': 'chainlink',
      'UNI/USDT': 'uniswap',
      'AAVE/USDT': 'aave',
      'ADA/USDT': 'cardano',
      'XRP/USDT': 'ripple',
      'DOGE/USDT': 'dogecoin'
    };

    const coinId = coinMap[symbol];
    if (!coinId) {
      console.warn(`Unsupported crypto symbol: ${symbol}`);
      return null;
    }

    // 使用CoinGecko免费API（无需API key，无限制调用）
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_last_updated_at=true&include_24hr_high=true&include_24hr_low=true`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('CoinGecko API request failed:', response.status);
      return null;
    }

    const data = await response.json();
    const coinData = data[coinId];

    if (!coinData) {
      console.error('No data found for coin:', coinId);
      return null;
    }

    return {
      symbol,
      price: coinData.usd,
      change24h: coinData.usd_24h_change || 0,
      volume: `${(coinData.usd_24h_vol / 1000000000).toFixed(2)}B`, // 转换为十亿
      high24h: coinData.usd_24h_high || coinData.usd,
      low24h: coinData.usd_24h_low || coinData.usd,
      lastUpdate: coinData.last_updated_at * 1000
    };
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    return null;
  }
};

// 免费美股价格数据 - 使用Yahoo Finance API
export const getStockPrice = async (symbol: string): Promise<PriceData | null> => {
  try {
    // 移除 x 前缀
    const stockSymbol = symbol.startsWith('x') ? symbol.slice(1).split('/')[0] : symbol.split('/')[0];
    
    console.log(`📈 获取美股数据: ${stockSymbol}`);
    
    // 使用Yahoo Finance免费API
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${stockSymbol}?interval=1d&range=1d`
    );

    if (!response.ok) {
      console.error(`Yahoo Finance API request failed for ${stockSymbol}:`, response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.error(`Yahoo Finance API error for ${stockSymbol}: Invalid data structure`);
      return null;
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const quotes = result.indicators.quote[0];
    
    if (!meta || !quotes) {
      console.error(`Yahoo Finance API error for ${stockSymbol}: Missing meta or quotes data`);
      return null;
    }

    const currentPrice = meta.regularMarketPrice || meta.previousClose;
    const previousClose = meta.previousClose;
    const change24h = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
    const high24h = meta.regularMarketDayHigh || currentPrice;
    const low24h = meta.regularMarketDayLow || currentPrice;
    const volume = meta.regularMarketVolume || 0;

    console.log(`✅ 美股数据获取成功 ${stockSymbol}: $${currentPrice}`);

    return {
      symbol: `x${stockSymbol}/USDT`,
      price: currentPrice,
      change24h,
      volume: `${(volume / 1000000).toFixed(1)}M`,
      high24h,
      low24h,
      lastUpdate: Date.now()
    };
  } catch (error) {
    console.error(`🚫 获取美股 ${symbol} 价格出错:`, error);
    return null;
  }
};

// 通用价格获取函数
export const getAssetPrice = async (symbol: string): Promise<PriceData | null> => {
  console.log(`🔍 分析资产类型: ${symbol}`);
  
  // 优先检查美股 - 以x开头的是美股
  if (symbol.startsWith('x')) {
    console.log(`📈 识别为美股: ${symbol}`);
    return await getStockPrice(symbol);
  }
  
  // 检查加密货币 - 更完整的加密货币列表
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'MATIC', 'AVAX', 'DOT', 'LINK', 'UNI', 'AAVE', 'ADA', 'XRP', 'DOGE'];
  const isCrypto = cryptoSymbols.some(crypto => symbol.includes(crypto));
  
  if (isCrypto) {
    console.log(`₿ 识别为加密货币: ${symbol}`);
    return await getCryptoPrice(symbol);
  }
  
  console.warn(`❓ 未识别的资产类型: ${symbol}`);
  return null;
};

// 实时价格更新Hook
export const usePriceUpdates = (symbols: string[], intervalMs = 60000) => {
  const [prices, setPrices] = React.useState<{ [key: string]: PriceData }>({});
  const [loading, setLoading] = React.useState(true);

  // 使用useCallback和useMemo来避免无限重新渲染
  const symbolsString = React.useMemo(() => symbols.join(','), [symbols]);

  React.useEffect(() => {
    if (!symbols.length) {
      setLoading(false);
      return;
    }
    
    let mounted = true;
    
    const updatePrices = async () => {
      if (!mounted) return;
      
      console.log('🔄 开始更新价格数据，symbols:', symbols);
      const symbolList = symbolsString.split(',').filter(s => s.length > 0);
      const newPrices: { [key: string]: PriceData } = {};
      
      // 串行处理每个symbol，避免API限制
      for (const symbol of symbolList) {
        if (!mounted) break;
        
        try {
          console.log(`📡 获取价格数据: ${symbol}`);
          const priceData = await getAssetPrice(symbol);
          
          if (priceData && mounted) {
            newPrices[symbol] = priceData;
            console.log(`✅ 成功获取 ${symbol} 价格:`, priceData.price);
          } else {
            console.log(`❌ 获取 ${symbol} 价格失败`);
          }
        } catch (error) {
          console.error(`🚫 获取 ${symbol} 价格出错:`, error);
        }
        
        // 请求间延迟，避免API限制
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (mounted) {
        console.log('📊 最终价格数据:', newPrices);
        setPrices(prev => ({ ...prev, ...newPrices }));
        setLoading(false);
      }
    };

    // 立即获取一次
    updatePrices();

    // 设置定期更新
    const interval = setInterval(updatePrices, intervalMs);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbolsString, intervalMs]); // 使用字符串而不是数组作为依赖

  return { prices, loading };
};