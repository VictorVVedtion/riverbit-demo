/**
 * useRealTimePrice - 实时价格数据Hook
 * 集成RiverBit合约价格预言机和模拟价格数据
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMarketPrice } from './useRiverBitContracts';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  lastUpdate: number;
  confidence: number;
}

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

// 模拟价格生成器
class PriceSimulator {
  private basePrice: number;
  private volatility: number;
  private trend: number;
  private lastPrice: number;

  constructor(basePrice: number, volatility: number = 0.02) {
    this.basePrice = basePrice;
    this.volatility = volatility;
    this.trend = (Math.random() - 0.5) * 0.001; // 小趋势
    this.lastPrice = basePrice;
  }

  generatePrice(): number {
    // 均值回归 + 随机波动 + 趋势
    const meanReversion = (this.basePrice - this.lastPrice) * 0.01;
    const randomWalk = (Math.random() - 0.5) * this.volatility;
    const trendComponent = this.trend;
    
    const priceChange = meanReversion + randomWalk + trendComponent;
    this.lastPrice = Math.max(this.lastPrice * (1 + priceChange), this.basePrice * 0.5);
    
    // 偶尔调整趋势
    if (Math.random() < 0.01) {
      this.trend = (Math.random() - 0.5) * 0.001;
    }
    
    return this.lastPrice;
  }

  getCurrentPrice(): number {
    return this.lastPrice;
  }
}

// 模拟价格数据
const MOCK_PRICE_CONFIG = {
  'BTC-PERP': { basePrice: 45000, volatility: 0.025 },
  'ETH-PERP': { basePrice: 3200, volatility: 0.03 },
  'SOL-PERP': { basePrice: 180, volatility: 0.04 },
  'AAPL-PERP': { basePrice: 180, volatility: 0.015 },
  'TSLA-PERP': { basePrice: 250, volatility: 0.035 },
  'NVDA-PERP': { basePrice: 480, volatility: 0.03 },
  'GOOGL-PERP': { basePrice: 140, volatility: 0.02 },
  'MSFT-PERP': { basePrice: 420, volatility: 0.018 },
  'AMZN-PERP': { basePrice: 150, volatility: 0.025 },
  'META-PERP': { basePrice: 320, volatility: 0.028 }
};

// 价格模拟器实例
const priceSimulators = new Map<string, PriceSimulator>();

// 初始化价格模拟器
Object.entries(MOCK_PRICE_CONFIG).forEach(([symbol, config]) => {
  priceSimulators.set(symbol, new PriceSimulator(config.basePrice, config.volatility));
});

export function useRealTimePrice(symbol: string) {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousPriceRef = useRef<number | null>(null);
  const price24hAgoRef = useRef<number | null>(null);

  // 尝试从合约获取价格数据
  const { marketPrice, isLoading: contractLoading, error: contractError } = useMarketPrice(symbol);

  // 生成模拟价格数据
  const generateMockPriceData = useCallback((symbol: string): PriceData => {
    const simulator = priceSimulators.get(symbol);
    if (!simulator) {
      throw new Error(`No price simulator found for ${symbol}`);
    }

    const currentPrice = simulator.generatePrice();
    const previous24h = price24hAgoRef.current || currentPrice * 0.98;
    const change24h = currentPrice - previous24h;
    const changePercent24h = (change24h / previous24h) * 100;

    // 模拟其他数据
    const volume24h = Math.random() * 1000000000 + 100000000; // 1亿到10亿
    const high24h = currentPrice * (1 + Math.random() * 0.05);
    const low24h = currentPrice * (1 - Math.random() * 0.05);

    return {
      symbol,
      price: currentPrice,
      change24h,
      changePercent24h,
      volume24h,
      high24h,
      low24h,
      lastUpdate: Date.now(),
      confidence: 95 + Math.random() * 5 // 95-100%置信度
    };
  }, []);

  // 更新价格数据
  const updatePriceData = useCallback(() => {
    try {
      setError(null);

      // 优先使用合约数据
      if (marketPrice && !contractError) {
        const price = parseFloat(marketPrice.price);
        const previous24h = price24hAgoRef.current || price * 0.98;
        const change24h = price - previous24h;
        const changePercent24h = (change24h / previous24h) * 100;

        setPriceData({
          symbol,
          price,
          change24h,
          changePercent24h,
          volume24h: Math.random() * 1000000000 + 100000000,
          high24h: price * 1.05,
          low24h: price * 0.95,
          lastUpdate: marketPrice.timestamp * 1000,
          confidence: marketPrice.confidence || 95
        });

        // 记录24小时前价格
        if (!price24hAgoRef.current) {
          price24hAgoRef.current = price * 0.98;
        }
      } else {
        // 使用模拟数据
        const mockData = generateMockPriceData(symbol);
        setPriceData(mockData);

        // 记录24小时前价格
        if (!price24hAgoRef.current) {
          price24hAgoRef.current = mockData.price * 0.98;
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to update price data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch price data');
      setIsLoading(false);
    }
  }, [symbol, marketPrice, contractError, generateMockPriceData]);

  // 启动实时更新
  const startRealTimeUpdates = useCallback(() => {
    // 立即更新一次
    updatePriceData();

    // 设置定期更新
    intervalRef.current = setInterval(() => {
      updatePriceData();
    }, 1000); // 每秒更新

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [updatePriceData]);

  // 停止实时更新
  const stopRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 重置24小时数据
  const reset24hData = useCallback(() => {
    if (priceData) {
      price24hAgoRef.current = priceData.price * (0.95 + Math.random() * 0.1);
    }
  }, [priceData]);

  // 效果钩子
  useEffect(() => {
    const cleanup = startRealTimeUpdates();
    
    // 每小时重置24小时前的价格参考
    const resetInterval = setInterval(reset24hData, 3600000); // 1小时

    return () => {
      cleanup();
      clearInterval(resetInterval);
    };
  }, [startRealTimeUpdates, reset24hData]);

  // 清理
  useEffect(() => {
    return () => {
      stopRealTimeUpdates();
    };
  }, [stopRealTimeUpdates]);

  return {
    priceData,
    isLoading: isLoading || contractLoading,
    error: error || contractError,
    startRealTimeUpdates,
    stopRealTimeUpdates,
    refresh: updatePriceData
  };
}

// 多资产价格订阅Hook
export function useMultipleRealTimePrices(symbols: string[]) {
  const [pricesData, setPricesData] = useState<Map<string, PriceData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 生成单个资产的价格数据
  const generatePriceData = useCallback((symbol: string): PriceData => {
    const simulator = priceSimulators.get(symbol);
    if (!simulator) {
      const config = MOCK_PRICE_CONFIG[symbol as keyof typeof MOCK_PRICE_CONFIG];
      if (config) {
        const newSimulator = new PriceSimulator(config.basePrice, config.volatility);
        priceSimulators.set(symbol, newSimulator);
        return generatePriceData(symbol);
      }
      throw new Error(`No price configuration found for ${symbol}`);
    }

    const currentPrice = simulator.generatePrice();
    const change24h = (Math.random() - 0.5) * currentPrice * 0.1;
    const changePercent24h = (change24h / currentPrice) * 100;

    return {
      symbol,
      price: currentPrice,
      change24h,
      changePercent24h,
      volume24h: Math.random() * 1000000000 + 100000000,
      high24h: currentPrice * (1 + Math.random() * 0.05),
      low24h: currentPrice * (1 - Math.random() * 0.05),
      lastUpdate: Date.now(),
      confidence: 95 + Math.random() * 5
    };
  }, []);

  // 更新单个资产价格
  const updateSinglePrice = useCallback((symbol: string) => {
    try {
      const priceData = generatePriceData(symbol);
      setPricesData(prev => new Map(prev.set(symbol, priceData)));
      setErrors(prev => {
        const newErrors = new Map(prev);
        newErrors.delete(symbol);
        return newErrors;
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch price';
      setErrors(prev => new Map(prev.set(symbol, errorMsg)));
    }
  }, [generatePriceData]);

  // 启动多资产订阅
  const startMultipleSubscriptions = useCallback(() => {
    setIsLoading(true);

    // 为每个symbol创建独立的更新间隔
    symbols.forEach(symbol => {
      // 立即更新
      updateSinglePrice(symbol);

      // 设置定期更新，添加随机偏移避免同时更新
      const baseInterval = 1000;
      const randomOffset = Math.random() * 200; // 0-200ms随机偏移
      
      const interval = setInterval(() => {
        updateSinglePrice(symbol);
      }, baseInterval + randomOffset);

      intervalsRef.current.set(symbol, interval);
    });

    setIsLoading(false);
  }, [symbols, updateSinglePrice]);

  // 停止所有订阅
  const stopAllSubscriptions = useCallback(() => {
    intervalsRef.current.forEach(interval => {
      clearInterval(interval);
    });
    intervalsRef.current.clear();
  }, []);

  // 获取单个资产价格
  const getPriceData = useCallback((symbol: string): PriceData | null => {
    return pricesData.get(symbol) || null;
  }, [pricesData]);

  // 效果钩子
  useEffect(() => {
    startMultipleSubscriptions();
    return stopAllSubscriptions;
  }, [startMultipleSubscriptions, stopAllSubscriptions]);

  return {
    pricesData,
    isLoading,
    errors,
    getPriceData,
    refresh: startMultipleSubscriptions,
    stop: stopAllSubscriptions
  };
}

export default useRealTimePrice;