import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '../ui/utils';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
  count?: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
  lastPrice: number;
  timestamp: number;
}

interface ProfessionalOrderBookProps {
  data: OrderBookData;
  precision?: number;
  onPriceClick?: (price: number, side: 'buy' | 'sell') => void;
  onSizeClick?: (size: number, price: number, side: 'buy' | 'sell') => void;
  theme?: 'river' | 'professional';
  showDepthChart?: boolean;
  compact?: boolean;
  maxRows?: number;
  className?: string;
}

const ProfessionalOrderBook: React.FC<ProfessionalOrderBookProps> = ({
  data,
  precision = 2,
  onPriceClick,
  onSizeClick,
  theme = 'river',
  showDepthChart = true,
  compact = false,
  maxRows = 10,
  className
}) => {
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [hoveredSide, setHoveredSide] = useState<'buy' | 'sell' | null>(null);
  const [animatingPrices, setAnimatingPrices] = useState<Set<number>>(new Set());
  const [priceFlashType, setPriceFlashType] = useState<Map<number, 'up' | 'down'>>(new Map());

  // 计算深度可视化数据
  const depthData = useMemo(() => {
    const maxBidTotal = Math.max(...data.bids.map(bid => bid.total));
    const maxAskTotal = Math.max(...data.asks.map(ask => ask.total));
    const maxTotal = Math.max(maxBidTotal, maxAskTotal);

    return {
      maxTotal,
      bidDepths: data.bids.map(bid => (bid.total / maxTotal) * 100),
      askDepths: data.asks.map(ask => (ask.total / maxTotal) * 100)
    };
  }, [data]);

  // 价格变动动画效果
  const handlePriceChange = useCallback((price: number, isUp: boolean) => {
    setAnimatingPrices(prev => new Set([...prev, price]));
    setPriceFlashType(prev => new Map([...prev, [price, isUp ? 'up' : 'down']]));
    
    setTimeout(() => {
      setAnimatingPrices(prev => {
        const newSet = new Set(prev);
        newSet.delete(price);
        return newSet;
      });
      setPriceFlashType(prev => {
        const newMap = new Map(prev);
        newMap.delete(price);
        return newMap;
      });
    }, 300);
  }, []);

  // 一键下单处理
  const handlePriceClick = useCallback((price: number, side: 'buy' | 'sell') => {
    if (onPriceClick) {
      onPriceClick(price, side);
      // 触发视觉反馈
      handlePriceChange(price, side === 'buy');
    }
  }, [onPriceClick, handlePriceChange]);

  const handleSizeClick = useCallback((size: number, price: number, side: 'buy' | 'sell') => {
    if (onSizeClick) {
      onSizeClick(size, price, side);
    }
  }, [onSizeClick]);

  // 鼠标悬停处理
  const handleMouseEnter = useCallback((price: number, side: 'buy' | 'sell') => {
    setHoveredPrice(price);
    setHoveredSide(side);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredPrice(null);
    setHoveredSide(null);
  }, []);

  // 格式化数字显示
  const formatPrice = (price: number) => price.toFixed(precision);
  const formatSize = (size: number) => size.toFixed(4);
  const formatTotal = (total: number) => {
    if (total >= 1000000) return `${(total / 1000000).toFixed(1)}M`;
    if (total >= 1000) return `${(total / 1000).toFixed(1)}K`;
    return total.toFixed(0);
  };

  // 获取价格变动动画类
  const getPriceAnimationClass = (price: number) => {
    if (!animatingPrices.has(price)) return '';
    const flashType = priceFlashType.get(price);
    return flashType === 'up' ? 'price-flash-up' : 'price-flash-down';
  };

  const containerClasses = cn(
    'professional-orderbook',
    'relative overflow-hidden rounded-xl',
    'bg-gradient-to-b from-slate-900/80 to-slate-950/90',
    'backdrop-filter backdrop-blur-lg',
    'border border-slate-700/50',
    'shadow-2xl shadow-black/20',
    {
      'h-96': !compact,
      'h-64': compact,
      'river-theme': theme === 'river',
      'professional-theme': theme === 'professional'
    },
    className
  );

  return (
    <div className={containerClasses}>
      {/* 专业级表头 */}
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Order Book</h3>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>Spread: {formatPrice(data.spread)}</span>
            <span className="text-yellow-400">({data.spreadPercent.toFixed(3)}%)</span>
          </div>
        </div>
        
        {/* 列标题 */}
        <div className="grid grid-cols-3 gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
          <div className="text-left">Price</div>
          <div className="text-right">Size</div>
          <div className="text-right">Total</div>
        </div>
      </div>

      <div className="flex flex-col h-full overflow-hidden">
        {/* 卖单区域 (红色) */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar-thin">
            <div className="space-y-0.5 p-2">
              {data.asks.slice(0, maxRows).reverse().map((ask, index) => {
                const isHovered = hoveredPrice === ask.price && hoveredSide === 'sell';
                const depthPercent = depthData.askDepths[data.asks.length - 1 - index];
                
                return (
                  <div
                    key={`ask-${ask.price}`}
                    className={cn(
                      'relative grid grid-cols-3 gap-2 px-2 py-1.5 rounded-lg cursor-pointer',
                      'transition-all duration-200 ease-out',
                      'hover:bg-red-500/10 hover:border-red-500/20 border border-transparent',
                      getPriceAnimationClass(ask.price),
                      {
                        'bg-red-500/15 border-red-500/30 scale-[1.01]': isHovered,
                        'shadow-lg shadow-red-500/10': isHovered
                      }
                    )}
                    onMouseEnter={() => handleMouseEnter(ask.price, 'sell')}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handlePriceClick(ask.price, 'sell')}
                  >
                    {/* 深度可视化背景 */}
                    {showDepthChart && (
                      <div 
                        className="absolute inset-y-0 right-0 bg-red-500/5 rounded-r-lg transition-all duration-300"
                        style={{ width: `${depthPercent}%` }}
                      />
                    )}
                    
                    {/* 数据列 */}
                    <div className="relative z-10">
                      <span 
                        className="text-red-400 font-mono font-semibold text-sm hover:text-red-300 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePriceClick(ask.price, 'sell');
                        }}
                      >
                        {formatPrice(ask.price)}
                      </span>
                    </div>
                    
                    <div 
                      className="relative z-10 text-right cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSizeClick(ask.size, ask.price, 'sell');
                      }}
                    >
                      <span className="text-slate-300 font-mono text-sm hover:text-white transition-colors">
                        {formatSize(ask.size)}
                      </span>
                    </div>
                    
                    <div className="relative z-10 text-right">
                      <span className="text-slate-500 font-mono text-xs">
                        {formatTotal(ask.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 中间价格区域 */}
        <div className="sticky z-20 bg-slate-800/90 backdrop-blur-sm border-y border-slate-700/30 py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-lg font-mono font-bold text-white">
                {formatPrice(data.lastPrice)}
              </span>
              <span className="text-xs text-slate-400">USDT</span>
            </div>
            
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">24h</span>
              <span className="text-green-400 font-semibold">+2.34%</span>
            </div>
          </div>
          
          {/* 实时更新指示器 */}
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>Spread: {formatPrice(data.spread)}</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>

        {/* 买单区域 (绿色) */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar-thin">
            <div className="space-y-0.5 p-2">
              {data.bids.slice(0, maxRows).map((bid, index) => {
                const isHovered = hoveredPrice === bid.price && hoveredSide === 'buy';
                const depthPercent = depthData.bidDepths[index];
                
                return (
                  <div
                    key={`bid-${bid.price}`}
                    className={cn(
                      'relative grid grid-cols-3 gap-2 px-2 py-1.5 rounded-lg cursor-pointer',
                      'transition-all duration-200 ease-out',
                      'hover:bg-green-500/10 hover:border-green-500/20 border border-transparent',
                      getPriceAnimationClass(bid.price),
                      {
                        'bg-green-500/15 border-green-500/30 scale-[1.01]': isHovered,
                        'shadow-lg shadow-green-500/10': isHovered
                      }
                    )}
                    onMouseEnter={() => handleMouseEnter(bid.price, 'buy')}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handlePriceClick(bid.price, 'buy')}
                  >
                    {/* 深度可视化背景 */}
                    {showDepthChart && (
                      <div 
                        className="absolute inset-y-0 right-0 bg-green-500/5 rounded-r-lg transition-all duration-300"
                        style={{ width: `${depthPercent}%` }}
                      />
                    )}
                    
                    {/* 数据列 */}
                    <div className="relative z-10">
                      <span 
                        className="text-green-400 font-mono font-semibold text-sm hover:text-green-300 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePriceClick(bid.price, 'buy');
                        }}
                      >
                        {formatPrice(bid.price)}
                      </span>
                    </div>
                    
                    <div 
                      className="relative z-10 text-right cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSizeClick(bid.size, bid.price, 'buy');
                      }}
                    >
                      <span className="text-slate-300 font-mono text-sm hover:text-white transition-colors">
                        {formatSize(bid.size)}
                      </span>
                    </div>
                    
                    <div className="relative z-10 text-right">
                      <span className="text-slate-500 font-mono text-xs">
                        {formatTotal(bid.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 动画样式 */}
      <style jsx>{`
        .price-flash-up {
          animation: flashGreen 300ms ease-out;
          border-radius: 8px;
        }
        
        .price-flash-down {
          animation: flashRed 300ms ease-out;
          border-radius: 8px;
        }
        
        @keyframes flashGreen {
          0% { background-color: transparent; }
          50% { background-color: rgba(34, 197, 94, 0.3); }
          100% { background-color: transparent; }
        }
        
        @keyframes flashRed {
          0% { background-color: transparent; }
          50% { background-color: rgba(239, 68, 68, 0.3); }
          100% { background-color: transparent; }
        }
        
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 2px;
        }
        
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 1px;
        }
        
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
        
        .river-theme {
          background: linear-gradient(135deg, 
            rgba(6, 182, 212, 0.05) 0%, 
            rgba(15, 23, 42, 0.9) 50%, 
            rgba(34, 211, 238, 0.05) 100%);
          border-color: rgba(6, 182, 212, 0.2);
        }
        
        .professional-theme {
          background: rgba(15, 23, 42, 0.95);
          border-color: rgba(71, 85, 105, 0.3);
        }
      `}</style>
    </div>
  );
};

export default ProfessionalOrderBook;