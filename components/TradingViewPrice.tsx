import React from 'react';
import { useTradingViewPrice } from '../hooks/useTradingViewPrices';
import { getPriceSourceInfo, getMarketStatus } from '../utils/unifiedPriceAPI';

interface TradingViewPriceProps {
  symbol: string;
  className?: string;
  showChange?: boolean;
  showVolume?: boolean;
  showSource?: boolean;
  fallbackPrice?: number;
  fallbackChange?: number;
}

const TradingViewPrice: React.FC<TradingViewPriceProps> = ({
  symbol,
  className = '',
  showChange = true,
  showVolume = false,
  showSource = false,
  fallbackPrice,
  fallbackChange
}) => {
  const { priceData, loading, error } = useTradingViewPrice(symbol);

  // 使用实时数据或回退到mock数据
  const displayPrice = priceData?.price || fallbackPrice || 0;
  const displayChange = priceData?.change24h || fallbackChange || 0;
  const displayVolume = priceData?.volume;
  const dataSource = priceData?.source || 'mock';
  
  // 获取价格源信息和市场状态
  const sourceInfo = getPriceSourceInfo(symbol);
  const marketStatus = getMarketStatus(symbol);

  // 格式化价格显示
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString();
    } else if (price >= 1) {
      return price.toFixed(2);
    } else {
      return price.toFixed(4);
    }
  };

  // 格式化变化百分比
  const formatChange = (change: number) => {
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-20 mb-1"></div>
          {showChange && <div className="h-4 bg-gray-200 rounded w-16"></div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center space-x-2">
        <span className="font-bold text-xl tabular-nums">
          ${formatPrice(displayPrice)}
        </span>
        
        {/* 数据源和状态指示器 */}
        <div className="flex items-center space-x-1">
          {error && (
            <span className="text-xs text-orange-500" title="Using fallback data">
              ⚠
            </span>
          )}
          
          {marketStatus === 'closed' && (
            <span className="text-xs text-red-500" title="Market closed">
              ●
            </span>
          )}
          
          {marketStatus === 'open' && dataSource !== 'mock' && (
            <span className="text-xs text-green-500" title="Live data">
              ●
            </span>
          )}
        </div>
      </div>
      
      {showChange && (
        <div className={`text-sm font-medium tabular-nums ${
          displayChange >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {formatChange(displayChange)}
        </div>
      )}
      
      {showVolume && displayVolume && (
        <div className="text-xs text-gray-300 font-medium">
          Vol: {displayVolume}
        </div>
      )}
      
      {showSource && (
        <div className="text-xs text-gray-300 font-medium" title={`Data from ${sourceInfo.name}`}>
          {dataSource === 'coingecko' && '🦎'}
          {dataSource === 'yahoo' && '📊'}
          {dataSource === 'fmp' && '💰'}
          {dataSource === 'iex' && '⚡'}
          {dataSource === 'twelvedata' && '📈'}
          {dataSource === 'mock' && '📋'}
          {' '}{dataSource === 'fmp' ? 'FMP' : dataSource === 'iex' ? 'IEX' : dataSource === 'twelvedata' ? 'Twelve Data' : sourceInfo.name}
        </div>
      )}
    </div>
  );
};

export default TradingViewPrice;