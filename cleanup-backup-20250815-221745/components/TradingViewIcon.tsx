import React, { useState } from 'react';

interface TradingViewIconProps {
  symbol: string;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
}

const TradingViewIcon: React.FC<TradingViewIconProps> = ({
  symbol,
  size = 32,
  className = '',
  fallback
}) => {
  const [imageError, setImageError] = useState(false);
  
  // TradingView图标API URL
  const getTradingViewIconUrl = (symbol: string) => {
    // 去掉前缀和后缀，获取纯资产符号
    let cleanSymbol = symbol;
    
    // 处理交易对格式 (BTC/USDT -> BTC)
    if (symbol.includes('/')) {
      cleanSymbol = symbol.split('/')[0];
    }
    
    // 处理xStock格式 (xAAPL -> AAPL)
    if (cleanSymbol.startsWith('x')) {
      cleanSymbol = cleanSymbol.substring(1);
    }
    
    // TradingView图标API - 支持加密货币和股票
    return `https://s3-symbol-logo.tradingview.com/crypto/XTVC${cleanSymbol.toUpperCase()}.svg`;
  };
  
  // 获取股票图标的备用URL
  const getStockIconUrl = (symbol: string) => {
    let cleanSymbol = symbol;
    if (symbol.startsWith('x')) {
      cleanSymbol = symbol.substring(1);
    }
    if (cleanSymbol.includes('/')) {
      cleanSymbol = cleanSymbol.split('/')[0];
    }
    // 尝试股票图标API
    return `https://s3-symbol-logo.tradingview.com/${cleanSymbol.toUpperCase()}.svg`;
  };
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  // 如果图片加载失败，显示fallback
  if (imageError) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        {fallback || (
          <div 
            className="rounded-full bg-slate-800/500 text-white font-bold flex items-center justify-center text-sm"
            style={{ width: size, height: size, fontSize: Math.max(size * 0.4, 12) }}
          >
            {symbol.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <img
      src={getTradingViewIconUrl(symbol)}
      alt={symbol}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      onError={handleImageError}
      style={{ width: size, height: size }}
    />
  );
};

export default TradingViewIcon;