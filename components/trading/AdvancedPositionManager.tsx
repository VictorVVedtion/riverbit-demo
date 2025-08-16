import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import {
  TrendingUp,
  TrendingDown,
  X,
  Target,
  Shield,
  AlertTriangle,
  Zap,
  Eye,
  EyeOff,
  MoreHorizontal,
  ArrowUpDown,
  Calculator,
  Activity,
  DollarSign
} from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  margin: number;
  leverage: number;
  timestamp: number;
  stopLoss?: number;
  takeProfit?: number;
  marginMode: 'cross' | 'isolated';
  adl: number; // Auto-deleveraging score
}

interface PositionAction {
  type: 'close' | 'modify_sl' | 'modify_tp' | 'adjust_margin' | 'reduce';
  positionId: string;
  amount?: number;
  price?: number;
}

interface AdvancedPositionManagerProps {
  positions: Position[];
  totalUnrealizedPnl: number;
  totalMargin: number;
  accountBalance: number;
  onPositionAction: (action: PositionAction) => Promise<void>;
  onBatchClose?: (positionIds: string[], percentage: number) => Promise<void>;
  onEmergencyCloseAll?: () => Promise<void>;
  isLoading?: boolean;
  theme?: 'river' | 'professional';
  className?: string;
}

const AdvancedPositionManager: React.FC<AdvancedPositionManagerProps> = ({
  positions,
  totalUnrealizedPnl,
  totalMargin,
  accountBalance,
  onPositionAction,
  onBatchClose,
  onEmergencyCloseAll,
  isLoading = false,
  theme = 'river',
  className
}) => {
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'pnl' | 'size' | 'time'>('pnl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);

  // 计算聚合指标
  const aggregatedMetrics = useMemo(() => {
    const longPositions = positions.filter(p => p.side === 'long');
    const shortPositions = positions.filter(p => p.side === 'short');
    
    const longPnl = longPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const shortPnl = shortPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    
    const totalNotional = positions.reduce((sum, p) => sum + (p.size * p.markPrice), 0);
    const averageLeverage = totalMargin > 0 ? totalNotional / totalMargin : 0;
    
    const marginUtilization = accountBalance > 0 ? (totalMargin / accountBalance) * 100 : 0;
    
    const riskScore = positions.reduce((max, p) => Math.max(max, p.adl), 0);

    return {
      longCount: longPositions.length,
      shortCount: shortPositions.length,
      longPnl,
      shortPnl,
      totalNotional,
      averageLeverage,
      marginUtilization,
      riskScore
    };
  }, [positions, totalMargin, accountBalance]);

  // 排序后的持仓
  const sortedPositions = useMemo(() => {
    return [...positions].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'pnl':
          comparison = a.unrealizedPnl - b.unrealizedPnl;
          break;
        case 'size':
          comparison = (a.size * a.markPrice) - (b.size * b.markPrice);
          break;
        case 'time':
          comparison = a.timestamp - b.timestamp;
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [positions, sortBy, sortOrder]);

  // 批量操作处理
  const handleBatchAction = useCallback(async (percentage: number) => {
    if (selectedPositions.size === 0 || !onBatchClose) return;
    
    setBatchActionLoading(true);
    try {
      await onBatchClose(Array.from(selectedPositions), percentage);
      setSelectedPositions(new Set());
    } finally {
      setBatchActionLoading(false);
    }
  }, [selectedPositions, onBatchClose]);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedPositions.size === positions.length) {
      setSelectedPositions(new Set());
    } else {
      setSelectedPositions(new Set(positions.map(p => p.id)));
    }
  }, [selectedPositions.size, positions]);

  // 单个持仓选择
  const togglePositionSelect = useCallback((positionId: string) => {
    const newSelected = new Set(selectedPositions);
    if (newSelected.has(positionId)) {
      newSelected.delete(positionId);
    } else {
      newSelected.add(positionId);
    }
    setSelectedPositions(newSelected);
  }, [selectedPositions]);

  // 风险等级颜色
  const getRiskColor = (level: number) => {
    if (level <= 2) return 'text-green-400';
    if (level <= 3) return 'text-yellow-400';
    return 'text-red-400';
  };

  // ADL评分颜色
  const getAdlColor = (score: number) => {
    if (score <= 20) return 'bg-green-500';
    if (score <= 50) return 'bg-yellow-500';
    if (score <= 80) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const containerClasses = cn(
    'advanced-position-manager',
    'space-y-4 p-6 rounded-xl',
    'bg-gradient-to-br from-slate-900/90 to-slate-950/95',
    'backdrop-blur-lg border border-slate-700/50',
    'shadow-2xl shadow-black/20',
    {
      'border-cyan-500/20': theme === 'river',
      'border-slate-600/50': theme === 'professional'
    },
    className
  );

  return (
    <div className={containerClasses}>
      {/* 管理器头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Positions ({positions.length})</span>
          </h3>
          <div className="flex items-center space-x-4 mt-1 text-sm">
            <span className={cn(
              'font-semibold',
              totalUnrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              PnL: {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
            </span>
            <span className="text-slate-400">
              Margin: ${totalMargin.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
            className="text-slate-400 hover:text-white"
          >
            {showAdvancedMetrics ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          
          {onEmergencyCloseAll && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onEmergencyCloseAll}
              className="bg-red-600/80 hover:bg-red-600 text-white"
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              Emergency Close
            </Button>
          )}
        </div>
      </div>

      {/* 高级指标 */}
      {showAdvancedMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{aggregatedMetrics.longCount}</div>
            <div className="text-xs text-green-400">Long Positions</div>
            <div className="text-xs text-green-400">
              {aggregatedMetrics.longPnl >= 0 ? '+' : ''}${aggregatedMetrics.longPnl.toFixed(2)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-white">{aggregatedMetrics.shortCount}</div>
            <div className="text-xs text-red-400">Short Positions</div>
            <div className="text-xs text-red-400">
              {aggregatedMetrics.shortPnl >= 0 ? '+' : ''}${aggregatedMetrics.shortPnl.toFixed(2)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{aggregatedMetrics.averageLeverage.toFixed(1)}x</div>
            <div className="text-xs text-slate-400">Avg Leverage</div>
            <div className="text-xs text-slate-400">
              ${aggregatedMetrics.totalNotional.toFixed(0)}
            </div>
          </div>
          
          <div className="text-center">
            <div className={cn(
              'text-lg font-bold',
              getRiskColor(aggregatedMetrics.marginUtilization / 30)
            )}>
              {aggregatedMetrics.marginUtilization.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400">Margin Usage</div>
            <div className="text-xs text-slate-400">
              Risk: {aggregatedMetrics.riskScore}
            </div>
          </div>
        </div>
      )}

      {/* 批量操作控制 */}
      {selectedPositions.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <span className="text-sm text-blue-400">
            {selectedPositions.size} position(s) selected
          </span>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchAction(25)}
              disabled={batchActionLoading}
              className="text-xs border-yellow-500/40 text-yellow-400 hover:bg-yellow-400/10"
            >
              Close 25%
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchAction(50)}
              disabled={batchActionLoading}
              className="text-xs border-orange-500/40 text-orange-400 hover:bg-orange-400/10"
            >
              Close 50%
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchAction(100)}
              disabled={batchActionLoading}
              className="text-xs border-red-500/40 text-red-400 hover:bg-red-400/10"
            >
              Close All
            </Button>
          </div>
        </div>
      )}

      {/* 表格头部 */}
      <div className="flex items-center justify-between border-b border-slate-700/30 pb-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedPositions.size === positions.length && positions.length > 0}
            onChange={toggleSelectAll}
            className="rounded border-slate-600"
          />
          <span className="text-xs text-slate-400">Select All</span>
        </div>
        
        <div className="flex items-center space-x-4 text-xs text-slate-400">
          <button
            onClick={() => {
              setSortBy('pnl');
              setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
            }}
            className="flex items-center space-x-1 hover:text-white transition-colors"
          >
            <span>PnL</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => {
              setSortBy('size');
              setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
            }}
            className="flex items-center space-x-1 hover:text-white transition-colors"
          >
            <span>Size</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => {
              setSortBy('time');
              setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
            }}
            className="flex items-center space-x-1 hover:text-white transition-colors"
          >
            <span>Time</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 持仓列表 */}
      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
        {sortedPositions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div>No open positions</div>
            <div className="text-xs mt-1">Your positions will appear here</div>
          </div>
        ) : (
          sortedPositions.map((position) => {
            const isSelected = selectedPositions.has(position.id);
            const isExpanded = expandedPosition === position.id;
            const pnlColor = position.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400';
            
            return (
              <div
                key={position.id}
                className={cn(
                  'position-card border rounded-lg transition-all duration-200',
                  'hover:border-slate-600 hover:shadow-lg',
                  isSelected ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700/50',
                  isExpanded ? 'shadow-xl' : ''
                )}
              >
                {/* 主要信息行 */}
                <div className="flex items-center p-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePositionSelect(position.id)}
                    className="mr-3 rounded border-slate-600"
                  />
                  
                  {/* 交易对和方向 */}
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <span className="font-semibold text-white">{position.symbol}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs font-semibold',
                        position.side === 'long' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      )}
                    >
                      {position.side === 'long' ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {position.side.toUpperCase()}
                    </Badge>
                    
                    {/* ADL评分 */}
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getAdlColor(position.adl) }} />
                      <span className="text-xs text-slate-500">ADL</span>
                    </div>
                  </div>
                  
                  {/* 仓位大小 */}
                  <div className="text-right min-w-0 flex-1">
                    <div className="font-mono text-sm text-white">
                      {position.size.toFixed(4)} {position.symbol.split('/')[0]}
                    </div>
                    <div className="text-xs text-slate-400">
                      ${(position.size * position.markPrice).toLocaleString()}
                    </div>
                  </div>
                  
                  {/* 入场价格 */}
                  <div className="text-right min-w-0 flex-1">
                    <div className="font-mono text-sm text-slate-300">
                      ${position.entryPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Mark: ${position.markPrice.toFixed(2)}
                    </div>
                  </div>
                  
                  {/* PnL */}
                  <div className="text-right min-w-0 flex-1">
                    <div className={cn('font-mono font-semibold', pnlColor)}>
                      {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
                    </div>
                    <div className={cn('text-xs', pnlColor)}>
                      {position.unrealizedPnlPercent >= 0 ? '+' : ''}{position.unrealizedPnlPercent.toFixed(2)}%
                    </div>
                  </div>
                  
                  {/* 杠杆 */}
                  <div className="text-right min-w-0 flex-1">
                    <div className="font-semibold text-white">{position.leverage}x</div>
                    <div className="text-xs text-slate-400">
                      ${position.margin.toFixed(2)}
                    </div>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-1 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedPosition(isExpanded ? null : position.id)}
                      className="text-slate-400 hover:text-white"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPositionAction({ type: 'close', positionId: position.id })}
                      className="text-xs border-red-500/40 text-red-400 hover:bg-red-400/10"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Close
                    </Button>
                  </div>
                </div>
                
                {/* 展开的详细信息 */}
                {isExpanded && (
                  <div className="border-t border-slate-700/30 p-4 bg-slate-800/20">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Liquidation Price</div>
                        <div className="font-mono text-sm text-orange-400">
                          ${position.liquidationPrice.toFixed(2)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Margin Mode</div>
                        <div className="text-sm text-white capitalize">{position.marginMode}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Stop Loss</div>
                        <div className="font-mono text-sm text-red-400">
                          {position.stopLoss ? `$${position.stopLoss.toFixed(2)}` : '-'}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Take Profit</div>
                        <div className="font-mono text-sm text-green-400">
                          {position.takeProfit ? `$${position.takeProfit.toFixed(2)}` : '-'}
                        </div>
                      </div>
                    </div>
                    
                    {/* 快速操作按钮 */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPositionAction({ 
                          type: 'reduce', 
                          positionId: position.id,
                          amount: position.size * 0.25 
                        })}
                        className="text-xs border-yellow-500/40 text-yellow-400 hover:bg-yellow-400/10"
                      >
                        Reduce 25%
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPositionAction({ 
                          type: 'reduce', 
                          positionId: position.id,
                          amount: position.size * 0.5 
                        })}
                        className="text-xs border-orange-500/40 text-orange-400 hover:bg-orange-400/10"
                      >
                        Reduce 50%
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-blue-500/40 text-blue-400 hover:bg-blue-400/10"
                      >
                        <Target className="w-3 h-3 mr-1" />
                        Set TP/SL
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-purple-500/40 text-purple-400 hover:bg-purple-400/10"
                      >
                        <Calculator className="w-3 h-3 mr-1" />
                        Add Margin
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 底部统计 */}
      <div className="border-t border-slate-700/30 pt-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-slate-400">Total Positions: </span>
              <span className="font-semibold text-white">{positions.length}</span>
            </div>
            
            <div>
              <span className="text-slate-400">Unrealized PnL: </span>
              <span className={cn(
                'font-semibold',
                totalUnrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
              </span>
            </div>
            
            <div>
              <span className="text-slate-400">Total Margin: </span>
              <span className="font-semibold text-white">${totalMargin.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Real-time updates</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPositionManager;