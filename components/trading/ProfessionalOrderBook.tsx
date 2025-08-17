import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { cn } from '../ui/utils';
import { TrendingUp, TrendingDown, Activity, Zap, BarChart3 } from 'lucide-react';
import { Badge } from '../ui/badge';

interface OrderBookEntry {
  price: number;
  amount: number;  // 改为amount以匹配现有数据结构
  total: number;
  depth: number;   // 累计美元价值
  count?: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread?: number;
  spreadPercent?: number;
  lastPrice?: number;
  timestamp?: number;
}

interface ProfessionalOrderBookProps {
  data: OrderBookData;
  precision?: number;
  onPriceClick?: (price: number, side: 'buy' | 'sell') => void;
  onSizeClick?: (size: number, price: number, side: 'buy' | 'sell') => void;
  theme?: 'river' | 'professional';
  showDepthChart?: boolean;
  showHeatmap?: boolean;
  compact?: boolean;
  maxRows?: number;
  className?: string;
  currentPrice?: number;
  priceChange24h?: number;
  volume24h?: number;
}

const ProfessionalOrderBook: React.FC<ProfessionalOrderBookProps> = ({
  data,
  precision = 2,
  onPriceClick,
  onSizeClick,
  theme = 'river',
  showDepthChart = true,
  showHeatmap = true,
  compact = false,
  maxRows = 8,
  className,
  currentPrice,
  priceChange24h,
  volume24h
}) => {
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [hoveredSide, setHoveredSide] = useState<'buy' | 'sell' | null>(null);
  const [animatingPrices, setAnimatingPrices] = useState<Set<number>>(new Set());
  const [priceFlashType, setPriceFlashType] = useState<Map<number, 'up' | 'down'>>(new Map());

  // 优化：使用 useRef 管理定时器防止内存泄漏
  const animationTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // 优化的深度可视化和热力图数据计算 - 减少重复计算
  const depthData = useMemo(() => {
    if (!data.bids.length || !data.asks.length) return { 
      maxTotal: 0, 
      maxAmount: 0,
      bidDepths: [], 
      askDepths: [], 
      bidHeatmap: [], 
      askHeatmap: [] 
    };
    
    // 一次遍历计算所有最大值以避免多次 Math.max 调用
    let maxBidTotal = 0, maxAskTotal = 0, maxBidAmount = 0, maxAskAmount = 0;
    
    for (const bid of data.bids) {
      maxBidTotal = Math.max(maxBidTotal, bid.total);
      maxBidAmount = Math.max(maxBidAmount, bid.amount);
    }
    
    for (const ask of data.asks) {
      maxAskTotal = Math.max(maxAskTotal, ask.total);
      maxAskAmount = Math.max(maxAskAmount, ask.amount);
    }
    
    const maxTotal = Math.max(maxBidTotal, maxAskTotal);
    const maxAmount = Math.max(maxBidAmount, maxAskAmount);

    return {
      maxTotal,
      maxAmount,
      bidDepths: data.bids.map(bid => (bid.total / maxTotal) * 100),
      askDepths: data.asks.map(ask => (ask.total / maxTotal) * 100),
      bidHeatmap: data.bids.map(bid => (bid.amount / maxAmount) * 100),
      askHeatmap: data.asks.map(ask => (ask.amount / maxAmount) * 100)
    };
  }, [data.bids, data.asks]);

  // 计算价差信息
  const spreadInfo = useMemo(() => {
    if (!data.bids.length || !data.asks.length) return { spread: 0, spreadPercent: 0, midPrice: 0 };
    
    const bestBid = data.bids[0]?.price || 0;
    const bestAsk = data.asks[0]?.price || 0;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
    
    return { spread, spreadPercent, midPrice, bestBid, bestAsk };
  }, [data]);

  // 实时价格指示器
  const priceIndicator = useMemo(() => {
    const price = currentPrice || spreadInfo.midPrice;
    const change = priceChange24h || 0;
    const isPositive = change >= 0;
    
    return {
      price,
      change,
      isPositive,
      formattedChange: `${isPositive ? '+' : ''}${change.toFixed(2)}%`
    };
  }, [currentPrice, spreadInfo.midPrice, priceChange24h]);

  // 价格闪烁动画类
  const priceFlashClass = useMemo(() => {
    if (priceIndicator.isPositive) {
      return 'animate-flash-green';
    } else if (priceIndicator.change < 0) {
      return 'animate-flash-red';
    }
    return '';
  }, [priceIndicator.isPositive, priceIndicator.change]);

  // 优化的价格变动动画效果 - 使用 useRef 管理定时器
  const handlePriceChange = useCallback((price: number, isUp: boolean) => {
    setAnimatingPrices(prev => new Set([...prev, price]));
    setPriceFlashType(prev => new Map([...prev, [price, isUp ? 'up' : 'down']]));
    
    // 清除旧的定时器
    if (animationTimers.current.has(price)) {
      clearTimeout(animationTimers.current.get(price)!);
    }
    
    // 设置新的定时器
    const timer = setTimeout(() => {
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
      animationTimers.current.delete(price);
    }, 300);
    
    animationTimers.current.set(price, timer);
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

  // 增强的数字格式化
  const formatPrice = (price: number) => {
    if (price >= 100000) return price.toFixed(0);
    if (price >= 1000) return price.toFixed(1);
    return price.toFixed(precision);
  };
  
  const formatAmount = (amount: number) => {
    if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;
    if (amount >= 1) return amount.toFixed(4);
    return amount.toFixed(6);
  };
  
  const formatTotal = (total: number) => {
    if (total >= 1000000) return `${(total / 1000000).toFixed(1)}M`;
    if (total >= 1000) return `${(total / 1000).toFixed(1)}K`;
    return total.toFixed(0);
  };
  
  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(1)}B`;
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toFixed(0);
  };

  // 获取价格变动动画类和热力图强度
  const getPriceAnimationClass = (price: number) => {
    if (!animatingPrices.has(price)) return '';
    const flashType = priceFlashType.get(price);
    return flashType === 'up' ? 'price-flash-up' : 'price-flash-down';
  };
  
  const getHeatmapIntensity = (intensity: number, side: 'buy' | 'sell') => {
    const baseColor = side === 'buy' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
    const alpha = Math.max(0.05, Math.min(0.4, intensity / 100));
    return `rgba(${baseColor.replace('rgb(', '').replace(')', '')}, ${alpha})`;
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

  // 清理所有定时器防止内存泄漏
  useEffect(() => {
    return () => {
      animationTimers.current.forEach(timer => clearTimeout(timer));
      animationTimers.current.clear();
    };
  }, []);

  return (
    <div className={containerClasses}>
      {/* SOTA级专业表头 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-md border-b border-slate-700/40 p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Order Book</h3>
            {showHeatmap && (
              <Badge variant="outline" className="text-amber-400 border-amber-400/50 bg-amber-400/10 text-xs px-2 py-0.5">
                <Activity className="w-3 h-3 mr-1" />
                Heatmap
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Spread:</span>
              <span className="font-mono text-white font-semibold">{formatPrice(spreadInfo.spread)}</span>
              <span className={`font-semibold ${
                spreadInfo.spreadPercent <= 0.01 ? 'text-green-400' : 
                spreadInfo.spreadPercent <= 0.05 ? 'text-yellow-400' : 'text-red-400'
              }`}>({spreadInfo.spreadPercent.toFixed(3)}%)</span>
            </div>
            {volume24h && (
              <div className="text-xs text-slate-400">
                <span>Vol: </span>
                <span className="text-cyan-400 font-semibold">{formatVolume(volume24h)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* 增强列标题 */}
        <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <div className="text-left flex items-center space-x-1">
            <span>Price</span>
            <TrendingUp className="w-3 h-3 opacity-60" />
          </div>
          <div className="text-right flex items-center justify-end space-x-1">
            <Zap className="w-3 h-3 opacity-60" />
            <span>Amount</span>
          </div>
          <div className="text-right flex items-center justify-end space-x-1">
            <BarChart3 className="w-3 h-3 opacity-60" />
            <span>Total</span>
          </div>
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
                      'relative grid grid-cols-3 gap-2 px-3 py-2 rounded-lg cursor-pointer group',
                      'transition-all duration-200 ease-out',
                      'hover:bg-red-500/12 hover:border-red-500/25 border border-transparent',
                      'hover:shadow-lg hover:shadow-red-500/20',
                      getPriceAnimationClass(ask.price),
                      {
                        'bg-red-500/20 border-red-500/40 scale-[1.02] shadow-xl shadow-red-500/30': isHovered,
                      }
                    )}
                    onMouseEnter={() => handleMouseEnter(ask.price, 'sell')}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handlePriceClick(ask.price, 'sell')}
                  >
                    {/* 深度可视化背景层 */}
                    {showDepthChart && (
                      <div 
                        className="absolute inset-y-0 right-0 bg-gradient-to-l from-red-500/8 to-transparent rounded-r-lg transition-all duration-300"
                        style={{ width: `${depthPercent}%` }}
                      />
                    )}
                    
                    {/* 热力图背景层 */}
                    {showHeatmap && (
                      <div 
                        className="absolute inset-0 rounded-lg transition-all duration-300"
                        style={{ 
                          backgroundColor: getHeatmapIntensity(depthData.askHeatmap[data.asks.length - 1 - index], 'sell')
                        }}
                      />
                    )}
                    
                    {/* 增强数据列 */}
                    <div className="relative z-10">
                      <span 
                        className="text-red-400 font-mono font-bold text-sm hover:text-red-300 transition-all duration-150 group-hover:scale-105"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePriceClick(ask.price, 'sell');
                        }}
                      >
                        {formatPrice(ask.price)}
                      </span>
                      {isHovered && (
                        <div className="absolute -top-1 -right-1">
                          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                    
                    <div 
                      className="relative z-10 text-right cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSizeClick(ask.amount, ask.price, 'sell');
                      }}
                    >
                      <span className="text-slate-300 font-mono text-sm hover:text-white transition-all duration-150 group-hover:font-semibold">
                        {formatAmount(ask.amount)}
                      </span>
                    </div>
                    
                    <div className="relative z-10 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-slate-500 font-mono text-xs group-hover:text-slate-400">
                          {formatTotal(ask.total)}
                        </span>
                        <span className="text-slate-600 font-mono text-xs opacity-70">
                          ${formatTotal(ask.depth)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SOTA级中间价格区域 */}
        <div className="sticky z-20 bg-gradient-to-r from-slate-800/95 to-slate-700/95 backdrop-blur-md border-y border-slate-600/40 py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <span className={`text-xl font-mono font-black text-white tracking-wide ${priceFlashClass}`}>
                  {formatPrice(priceIndicator.price)}
                </span>
                <div className="text-xs text-slate-400 font-medium">USDT</div>
              </div>
              
              <div className="flex items-center space-x-2">
                {priceIndicator.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-sm font-bold ${
                  priceIndicator.isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {priceIndicator.formattedChange}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-xs text-slate-400">
                <span>Mid: </span>
                <span className="text-white font-mono font-semibold">{formatPrice(spreadInfo.midPrice)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">Live</span>
              </div>
            </div>
          </div>
          
          {/* 增强价差指示器 */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-600/30">
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Best Bid:</span>
                <span className="text-green-400 font-mono font-semibold">{formatPrice(spreadInfo.bestBid)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Best Ask:</span>
                <span className="text-red-400 font-mono font-semibold">{formatPrice(spreadInfo.bestAsk)}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="h-1 w-8 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-full" />
              <span className="text-xs text-slate-400">Spread Quality</span>
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
                      'relative grid grid-cols-3 gap-2 px-3 py-2 rounded-lg cursor-pointer group',
                      'transition-all duration-200 ease-out',
                      'hover:bg-green-500/12 hover:border-green-500/25 border border-transparent',
                      'hover:shadow-lg hover:shadow-green-500/20',
                      getPriceAnimationClass(bid.price),
                      {
                        'bg-green-500/20 border-green-500/40 scale-[1.02] shadow-xl shadow-green-500/30': isHovered,
                      }
                    )}
                    onMouseEnter={() => handleMouseEnter(bid.price, 'buy')}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handlePriceClick(bid.price, 'buy')}
                  >
                    {/* 深度可视化背景层 */}
                    {showDepthChart && (
                      <div 
                        className="absolute inset-y-0 right-0 bg-gradient-to-l from-green-500/8 to-transparent rounded-r-lg transition-all duration-300"
                        style={{ width: `${depthPercent}%` }}
                      />
                    )}
                    
                    {/* 热力图背景层 */}
                    {showHeatmap && (
                      <div 
                        className="absolute inset-0 rounded-lg transition-all duration-300"
                        style={{ 
                          backgroundColor: getHeatmapIntensity(depthData.bidHeatmap[index], 'buy')
                        }}
                      />
                    )}
                    
                    {/* 增强数据列 */}
                    <div className="relative z-10">
                      <span 
                        className="text-green-400 font-mono font-bold text-sm hover:text-green-300 transition-all duration-150 group-hover:scale-105"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePriceClick(bid.price, 'buy');
                        }}
                      >
                        {formatPrice(bid.price)}
                      </span>
                      {isHovered && (
                        <div className="absolute -top-1 -right-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                    
                    <div 
                      className="relative z-10 text-right cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSizeClick(bid.amount, bid.price, 'buy');
                      }}
                    >
                      <span className="text-slate-300 font-mono text-sm hover:text-white transition-all duration-150 group-hover:font-semibold">
                        {formatAmount(bid.amount)}
                      </span>
                    </div>
                    
                    <div className="relative z-10 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-slate-500 font-mono text-xs group-hover:text-slate-400">
                          {formatTotal(bid.total)}
                        </span>
                        <span className="text-slate-600 font-mono text-xs opacity-70">
                          ${formatTotal(bid.depth)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SOTA级动画样式 */}
      <style jsx>{`
        .price-flash-up {
          animation: flashGreen 400ms cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 12px;
          transform: scale(1.02);
        }
        
        .price-flash-down {
          animation: flashRed 400ms cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 12px;
          transform: scale(1.02);
        }
        
        .price-flash-green {
          animation: flashGreenPulse 600ms cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 12px;
        }
        
        .price-flash-red {
          animation: flashRedPulse 600ms cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 12px;
        }
        
        @keyframes flashGreen {
          0% { 
            background-color: transparent; 
            box-shadow: none;
          }
          30% { 
            background-color: rgba(34, 197, 94, 0.4); 
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
          }
          70% { 
            background-color: rgba(34, 197, 94, 0.2); 
            box-shadow: 0 0 15px rgba(34, 197, 94, 0.2);
          }
          100% { 
            background-color: transparent; 
            box-shadow: none;
          }
        }
        
        @keyframes flashRed {
          0% { 
            background-color: transparent; 
            box-shadow: none;
          }
          30% { 
            background-color: rgba(239, 68, 68, 0.4); 
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
          }
          70% { 
            background-color: rgba(239, 68, 68, 0.2); 
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
          }
          100% { 
            background-color: transparent; 
            box-shadow: none;
          }
        }
        
        @keyframes flashGreenPulse {
          0% { 
            background-color: transparent;
            transform: scale(1);
          }
          50% { 
            background-color: rgba(34, 197, 94, 0.25);
            transform: scale(1.01);
          }
          100% { 
            background-color: transparent;
            transform: scale(1);
          }
        }
        
        @keyframes flashRedPulse {
          0% { 
            background-color: transparent;
            transform: scale(1);
          }
          50% { 
            background-color: rgba(239, 68, 68, 0.25);
            transform: scale(1.01);
          }
          100% { 
            background-color: transparent;
            transform: scale(1);
          }
        }
        
        .custom-scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.4) rgba(30, 41, 59, 0.1);
        }
        
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 3px;
        }
        
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.1);
          border-radius: 3px;
        }
        
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(148, 163, 184, 0.4), rgba(148, 163, 184, 0.6));
          border-radius: 3px;
          transition: all 0.2s ease;
        }
        
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(148, 163, 184, 0.6), rgba(148, 163, 184, 0.8));
        }
        
        .river-theme {
          background: linear-gradient(135deg, 
            rgba(6, 182, 212, 0.08) 0%, 
            rgba(15, 23, 42, 0.92) 30%,
            rgba(15, 23, 42, 0.95) 70%, 
            rgba(34, 211, 238, 0.08) 100%);
          border: 1px solid rgba(6, 182, 212, 0.25);
          box-shadow: 
            0 8px 32px rgba(6, 182, 212, 0.1),
            0 2px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        
        .professional-theme {
          background: linear-gradient(135deg, 
            rgba(15, 23, 42, 0.98) 0%, 
            rgba(30, 41, 59, 0.95) 100%);
          border: 1px solid rgba(71, 85, 105, 0.4);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 2px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        
        /* 深度可视化动画 */
        .depth-bar {
          transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* 热力图效果 */
        .heatmap-overlay {
          transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(0.5px);
        }
        
        /* 悬停效果 */
        .order-row:hover {
          backdrop-filter: blur(2px);
          z-index: 5;
        }
        
        /* 自适应字体 */
        @media (max-width: 768px) {
          .professional-orderbook {
            font-size: 0.85rem;
          }
          
          .order-row {
            padding: 0.75rem 0.5rem;
          }
        }
        
        /* 高对比度支持 */
        @media (prefers-contrast: high) {
          .professional-orderbook {
            border-width: 2px;
          }
          
          .order-row {
            border-width: 1px;
          }
        }
      `}</style>
    </div>
  );
};

export default React.memo(ProfessionalOrderBook);