import { useState, useEffect, useRef } from 'react';
import { 
  getUnifiedPrice, 
  getBatchUnifiedPrices, 
  UnifiedPriceWebSocket,
  type UnifiedPriceData 
} from '../utils/unifiedPriceAPI';

type PriceData = UnifiedPriceData;

export const useTradingViewPrices = (symbols: string[]) => {
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<UnifiedPriceWebSocket | null>(null);

  // 初始获取价格数据
  useEffect(() => {
    const fetchInitialPrices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const priceMap = await getBatchUnifiedPrices(symbols);
        setPrices(priceMap);
      } catch (err) {
        setError('Failed to fetch initial prices');
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (symbols.length > 0) {
      fetchInitialPrices();
    }
  }, [symbols.join(',')]);

  // WebSocket实时更新
  useEffect(() => {
    if (symbols.length === 0) return;

    // 创建WebSocket连接
    wsRef.current = new UnifiedPriceWebSocket();

    // 订阅符号
    symbols.forEach(symbol => {
      wsRef.current?.subscribe(symbol, (data) => {
        setPrices(prevPrices => {
          const newPrices = new Map(prevPrices);
          newPrices.set(symbol, data);
          return newPrices;
        });
      });
    });

    // 清理函数
    return () => {
      if (wsRef.current) {
        symbols.forEach(symbol => {
          wsRef.current?.unsubscribe(symbol);
        });
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [symbols.join(',')]);

  // 手动刷新价格
  const refreshPrices = async () => {
    try {
      setLoading(true);
      const priceMap = await getBatchUnifiedPrices(symbols);
      setPrices(priceMap);
    } catch (err) {
      setError('Failed to refresh prices');
      console.error('Price refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    prices,
    loading,
    error,
    refreshPrices,
    getPrice: (symbol: string) => prices.get(symbol)
  };
};

// 单个符号的价格Hook
export const useTradingViewPrice = (symbol: string) => {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getUnifiedPrice(symbol);
        setPriceData(data);
      } catch (err) {
        setError('Failed to fetch price');
        console.error('Single price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchPrice();
      
      // 定期更新价格 (每30秒)
      const interval = setInterval(fetchPrice, 30000);
      return () => clearInterval(interval);
    }
  }, [symbol]);

  return {
    priceData,
    loading,
    error,
    refreshPrice: () => {
      if (symbol) {
        getUnifiedPrice(symbol).then(setPriceData);
      }
    }
  };
};