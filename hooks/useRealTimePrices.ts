/**
 * useRealTimePrices - React Hook for real-time price data
 * 集成 CoinGecko、Alpha Vantage 和 Alpaca Logo APIs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realTimePriceService, AssetPrice } from '../services/RealTimePriceService';

interface UseRealTimePricesReturn {
  prices: Record<string, AssetPrice>;
  isLoading: boolean;
  error: string | null;
  getPrice: (symbol: string) => AssetPrice | null;
  getAssetIcon: (symbol: string) => string;
  refreshPrices: () => void;
}

export function useRealTimePrices(symbols: string[]): UseRealTimePricesReturn {
  const [prices, setPrices] = useState<Record<string, AssetPrice>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 价格更新回调
  const handlePriceUpdate = useCallback((newPrices: AssetPrice[]) => {
    const priceMap: Record<string, AssetPrice> = {};
    newPrices.forEach(price => {
      priceMap[price.symbol] = price;
    });
    
    setPrices(prev => ({ ...prev, ...priceMap }));
    setIsLoading(false);
    setError(null);
  }, []);

  // 错误处理
  const handleError = useCallback((err: Error) => {
    console.error('[useRealTimePrices] Error:', err);
    setError(err.message);
    setIsLoading(false);
  }, []);

  // 订阅价格更新
  useEffect(() => {
    if (symbols.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // 取消之前的订阅
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // 订阅新的价格更新
    unsubscribeRef.current = realTimePriceService.subscribe(symbols, handlePriceUpdate);

    // 清理函数
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [symbols.join(','), handlePriceUpdate]);

  // 获取单个价格
  const getPrice = useCallback((symbol: string): AssetPrice | null => {
    return prices[symbol] || null;
  }, [prices]);

  // 获取资产图标
  const getAssetIcon = useCallback((symbol: string): string => {
    return realTimePriceService.getAssetIcon(symbol);
  }, []);

  // 手动刷新价格
  const refreshPrices = useCallback(async () => {
    if (symbols.length === 0) return;

    try {
      setIsLoading(true);
      setError(null);
      const newPrices = await realTimePriceService.getPrices(symbols);
      handlePriceUpdate(newPrices);
    } catch (err) {
      handleError(err as Error);
    }
  }, [symbols, handlePriceUpdate, handleError]);

  return {
    prices,
    isLoading,
    error,
    getPrice,
    getAssetIcon,
    refreshPrices
  };
}

// 单个资产价格Hook
export function useAssetPrice(symbol: string) {
  const { prices, isLoading, error, getPrice, getAssetIcon, refreshPrices } = useRealTimePrices([symbol]);
  
  return {
    price: getPrice(symbol),
    isLoading,
    error,
    iconUrl: getAssetIcon(symbol),
    refreshPrice: refreshPrices
  };
}

// 多个资产价格Hook（带图标）
export function useAssetsWithPrices(symbols: string[]) {
  const { prices, isLoading, error, getPrice, getAssetIcon, refreshPrices } = useRealTimePrices(symbols);
  
  const assetsWithPrices = symbols.map(symbol => ({
    symbol,
    price: getPrice(symbol),
    iconUrl: getAssetIcon(symbol),
    isLoaded: !!getPrice(symbol)
  }));

  return {
    assets: assetsWithPrices,
    isLoading,
    error,
    refreshPrices
  };
}