import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, 
  DollarSign, Shield, AlertTriangle, Target, X
} from 'lucide-react';

interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: string;
  entryPrice?: number;
  currentPrice?: number;
  pnl: number;
  pnlPercent?: string;
  leverage?: number;
  marginMode?: string;
  liquidationPrice?: number;
  marginRatio?: number;
}

interface PositionSummaryFloatProps {
  positions: Position[];
  isVisible: boolean;
  onToggle: () => void;
  onClose?: () => void;
  className?: string;
  preferredPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'auto';
  isDraggable?: boolean;
}

export default function PositionSummaryFloat({
  positions,
  isVisible,
  onToggle,
  onClose,
  className = "",
  preferredPosition = 'auto',
  isDraggable = true
}: PositionSummaryFloatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(preferredPosition);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const floatRef = useRef<HTMLDivElement>(null);
  
  // 智能位置计算 - 避免遮挡重要内容
  const getSmartPosition = () => {
    if (currentPosition !== 'auto') return currentPosition;
    
    // 移动端：固定底部右侧，不遮挡交易按钮
    if (window.innerWidth < 1024) {
      return 'bottom-left';
    }
    
    // 桌面端：自适应到右侧中央区域
    return 'top-right';
  };

  const getPositionStyles = () => {
    const smartPos = getSmartPosition();
    const baseStyle = {
      position: 'fixed' as const,
      zIndex: 40,
      transform: isDragging ? `translate(${dragPosition.x}px, ${dragPosition.y}px)` : 'none',
    };

    switch (smartPos) {
      case 'top-right':
        return { ...baseStyle, top: '100px', right: '24px' };
      case 'top-left':
        return { ...baseStyle, top: '100px', left: '24px' };
      case 'bottom-right':
        return { ...baseStyle, bottom: '100px', right: '24px' };
      case 'bottom-left':
        return { ...baseStyle, bottom: '120px', left: '24px' }; // 避开移动端交易按钮
      default:
        return { ...baseStyle, top: '100px', right: '24px' };
    }
  };

  // 计算总体数据
  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const totalPositions = positions.length;
  const longPositions = positions.filter(p => p.side === 'long').length;
  const shortPositions = positions.filter(p => p.side === 'short').length;
  
  // 智能定位逻辑
  useEffect(() => {
    if (preferredPosition === 'auto') {
      // 根据屏幕尺寸和内容自动选择最佳位置
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      if (screenWidth < 768) {
        // 移动端：底部右侧，避开操作按钮
        setCurrentPosition('bottom-right');
      } else if (screenWidth < 1024) {
        // 平板端：右上角，但留出更多空间
        setCurrentPosition('top-right');
      } else {
        // 桌面端：默认右上角，但可能根据内容调整
        setCurrentPosition('top-right');
      }
    } else {
      setCurrentPosition(preferredPosition);
    }
  }, [preferredPosition]);

  // 拖拽功能
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDraggable) return;
    setIsDragging(true);
    const rect = floatRef.current?.getBoundingClientRect();
    if (rect) {
      setDragPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !floatRef.current) return;
    
    const newX = e.clientX - dragPosition.x;
    const newY = e.clientY - dragPosition.y;
    
    // 边界检测
    const maxX = window.innerWidth - floatRef.current.offsetWidth;
    const maxY = window.innerHeight - floatRef.current.offsetHeight;
    
    const boundedX = Math.max(0, Math.min(newX, maxX));
    const boundedY = Math.max(0, Math.min(newY, maxY));
    
    floatRef.current.style.left = `${boundedX}px`;
    floatRef.current.style.top = `${boundedY}px`;
    floatRef.current.style.right = 'auto';
    floatRef.current.style.bottom = 'auto';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragPosition]);


  // 如果没有仓位且不可见，不渲染
  if (!isVisible && totalPositions === 0) return null;

  return (
    <div 
      ref={floatRef}
      className={`w-80 sm:w-72 lg:w-80 ${isDragging ? 'cursor-grabbing' : ''} ${className}`}
      style={{ 
        ...getPositionStyles(), 
        userSelect: isDragging ? 'none' : 'auto' 
      }}
    >
      {/* 仓位摘要卡片 - 增强版 */}
      <Card className={`bg-gradient-to-br from-surface-1/95 to-surface-2/90 backdrop-blur-xl border border-default/30 shadow-2xl transition-all duration-200 ${isDragging ? 'shadow-glow-river scale-105' : 'hover:shadow-xl'} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}>
        <CardContent className="p-4" onMouseDown={isDraggable ? handleMouseDown : undefined}>
          {/* 标题栏 - 增强交互 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-river-blue" />
              <span className="font-bold text-sm text-primary flex items-center">
                Positions
                {isDraggable && (
                  <div className="ml-2 flex space-x-0.5">
                    <div className="w-1 h-1 bg-river-blue/50 rounded-full"></div>
                    <div className="w-1 h-1 bg-river-blue/50 rounded-full"></div>
                    <div className="w-1 h-1 bg-river-blue/50 rounded-full"></div>
                  </div>
                )}
              </span>
              <Badge variant="outline" className="text-xs h-5 px-2 bg-surface-2/60">
                {totalPositions}
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              {/* 位置切换按钮 */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const;
                  const currentIndex = positions.indexOf(currentPosition as any);
                  const nextIndex = (currentIndex + 1) % positions.length;
                  setCurrentPosition(positions[nextIndex]);
                }}
                className="h-6 w-6 p-0 hover:bg-surface-3/60 text-river-blue/70 hover:text-river-blue"
                title="Change position"
              >
                <Target className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0 hover:bg-surface-3/60"
              >
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
              {onClose && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="h-6 w-6 p-0 hover:bg-surface-3/60 text-secondary"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {totalPositions > 0 ? (
            <>
              {/* 总体盈亏 */}
              <div className={`bg-gradient-to-r rounded-lg p-3 mb-3 border ${
                totalPnL >= 0 
                  ? 'from-profit/10 to-profit/5 border-profit/30' 
                  : 'from-danger/10 to-danger/5 border-danger/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Total PnL</span>
                  <div className={`text-lg font-bold ${totalPnL >= 0 ? 'text-profit' : 'text-danger'}`}>
                    {totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 持仓统计 */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-surface-2/60 rounded-md p-2 text-center">
                  <div className="text-xs text-secondary mb-1">Long</div>
                  <div className="flex items-center justify-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-profit" />
                    <span className="text-sm font-bold text-profit">{longPositions}</span>
                  </div>
                </div>
                <div className="bg-surface-2/60 rounded-md p-2 text-center">
                  <div className="text-xs text-secondary mb-1">Short</div>
                  <div className="flex items-center justify-center space-x-1">
                    <TrendingDown className="w-3 h-3 text-danger" />
                    <span className="text-sm font-bold text-danger">{shortPositions}</span>
                  </div>
                </div>
              </div>

              {/* 展开的详细信息 */}
              {isExpanded && (
                <>
                  <Separator className="my-3 bg-default/30" />
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {positions.map((position, index) => (
                      <div key={index} className="bg-surface-2/40 rounded-md p-3 border border-default/20">
                        {/* 持仓头部 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={position.side === 'long' ? 'default' : 'destructive'} 
                              className="text-xs px-2 py-0.5"
                            >
                              {position.side === 'long' ? (
                                <TrendingUp className="w-3 h-3 mr-1" />
                              ) : (
                                <TrendingDown className="w-3 h-3 mr-1" />
                              )}
                              {position.side.toUpperCase()}
                            </Badge>
                            <span className="font-bold text-sm text-primary">{position.symbol}</span>
                            <span className="text-xs text-secondary">{position.leverage || 10}x</span>
                          </div>
                          <div className={`text-sm font-bold ${position.pnl >= 0 ? 'text-profit' : 'text-danger'}`}>
                            {position.pnl >= 0 ? '+' : ''}${Math.abs(position.pnl).toLocaleString()}
                          </div>
                        </div>

                        {/* 持仓详情 */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-secondary">Size: </span>
                            <span className="text-primary font-medium">{position.size}</span>
                          </div>
                          <div>
                            <span className="text-secondary">Entry: </span>
                            <span className="text-primary font-medium">${position.entryPrice?.toLocaleString() || '0'}</span>
                          </div>
                          <div>
                            <span className="text-secondary">Liq: </span>
                            <span className="text-danger font-medium">${position.liquidationPrice?.toLocaleString() || '0'}</span>
                          </div>
                          <div>
                            <span className="text-secondary">Margin: </span>
                            <span className={`font-medium ${(position.marginRatio || 0) > 50 ? 'text-profit' : 'text-loss'}`}>
                              {position.marginRatio || 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 快速操作 */}
              <div className="flex space-x-2 mt-3 pt-3 border-t border-default/30">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 h-7 text-xs bg-surface-3/60 hover:bg-profit/20 hover:border-profit/50 hover:text-profit transition-all"
                >
                  Manage
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 h-7 text-xs bg-surface-3/60 hover:bg-danger/20 hover:border-danger/50 hover:text-danger transition-all"
                >
                  Close All
                </Button>
              </div>
            </>
          ) : (
            /* 无仓位状态 */
            <div className="text-center py-4">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-sm text-secondary">No Active Positions</div>
              <div className="text-xs text-muted mt-1">Open a position to start trading</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 智能快速切换按钮（当浮动面板隐藏时） */}
      {!isVisible && totalPositions > 0 && (
        <Button
          onClick={onToggle}
          className={`absolute h-12 w-12 bg-gradient-to-l from-surface-2/90 to-surface-1/90 backdrop-blur-xl border border-default/30 shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg ${
            currentPosition.includes('left') 
              ? '-right-12 top-0 border-l-0 rounded-r-lg' 
              : '-left-12 top-0 border-r-0 rounded-l-lg'
          }`}
        >
          <div className="flex flex-col items-center">
            <Shield className="w-4 h-4 text-river-blue" />
            <span className="text-xs font-bold text-river-blue">{totalPositions}</span>
          </div>
        </Button>
      )}
    </div>
  );
}