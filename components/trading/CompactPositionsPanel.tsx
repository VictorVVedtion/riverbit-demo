import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Target, TrendingUp, TrendingDown, Clock, History, Activity, X, CheckCircle, AlertTriangle, Settings, Share2, Plus, Minus, Eye, EyeOff, MoreHorizontal, Shield, Zap, AlertCircle, TrendingUp as ProfitIcon, TrendingDown as LossIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { formatRelativeTime, formatNumber, formatPrice, getPnLColor } from '../../utils/formatUtils';

interface Position {
  pair: string;
  side: 'Long' | 'Short';
  size: string;
  pnl: string;
  margin: string;
  entryPrice?: number;
  markPrice?: number;
  leverageUsed?: number;
  // 新增专业交易数据字段
  liquidationPrice?: number;      // 清算价
  marginRatio?: number;           // 保证金比例
  roe?: number;                   // ROE收益率
  unrealizedPnl?: number;         // 未实现盈亏
  funding?: number;               // 资金费率
  adl?: number;                   // ADL排队
  takeProfit?: number;            // 止盈价
  stopLoss?: number;              // 止损价
  positionValue?: number;         // 仓位价值
  timestamp?: string;             // 开仓时间
  contractSize?: number;          // 合约规模
}

interface OrderHistory {
  id: string;
  market: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  size: string;
  price: string;
  status: 'filled';
  filledSize: string;
  fee: string;
  pnl: string;
  timestamp: string;
  closeTime: string;
}

interface PendingOrder {
  id: string;
  market: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'stop-limit';
  size: string;
  price: string;
  stopPrice?: string;
  status: 'pending';
  filledSize: string;
  timestamp: string;
}

interface CompactPositionsPanelProps {
  positions: Position[];
  currentPrice: number;
  onClosePosition?: (index: number, percentage: number) => void;
  animatingPositions?: number[];
  className?: string;
  onTabChange?: (tab: string) => void;
  // 新增功能回调
  onSetTakeProfit?: (index: number, price: number) => void;
  onSetStopLoss?: (index: number, price: number) => void;
  onAddToPosition?: (index: number, additionalSize: number) => void;
  onSharePosition?: (index: number) => void;
  // 显示模式控制
  displayMode?: 'compact' | 'detailed';
  // 批量操作
  onCloseAllPositions?: () => void;
  onHedgeAllPositions?: () => void;
}

// Mock data for demonstration
const MOCK_ORDER_HISTORY: OrderHistory[] = [
  {
    id: 'ORD-001',
    market: 'BTC/USDT',
    side: 'buy',
    type: 'market',
    size: '0.05',
    price: '43250.00',
    status: 'filled',
    filledSize: '0.05',
    fee: '0.00005',
    pnl: '+125.50',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    closeTime: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: 'ORD-002',
    market: 'ETH/USDT',
    side: 'sell',
    type: 'limit',
    size: '1.2',
    price: '2250.00',
    status: 'filled',
    filledSize: '1.2',
    fee: '0.0012',
    pnl: '-45.20',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    closeTime: new Date(Date.now() - 86400000).toISOString()
  }
];

const MOCK_PENDING_ORDERS: PendingOrder[] = [
  {
    id: 'PEND-001',
    market: 'BTC/USDT',
    side: 'buy',
    type: 'limit',
    size: '0.02',
    price: '40000.00',
    status: 'pending',
    filledSize: '0',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'PEND-002',
    market: 'ETH/USDT',
    side: 'sell',
    type: 'limit',
    size: '0.5',
    price: '2500.00',
    status: 'pending',
    filledSize: '0',
    timestamp: new Date(Date.now() - 7200000).toISOString()
  }
];

const CompactPositionsPanel: React.FC<CompactPositionsPanelProps> = ({
  positions,
  currentPrice,
  onClosePosition,
  animatingPositions = [],
  className = '',
  onTabChange,
  onSetTakeProfit,
  onSetStopLoss,
  onAddToPosition,
  onSharePosition,
  displayMode = 'compact',
  onCloseAllPositions,
  onHedgeAllPositions
}) => {
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>('positions');
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<string | null>(null);
  const [expandedPosition, setExpandedPosition] = useState<number | null>(null);
  const [showAdvancedActions, setShowAdvancedActions] = useState<boolean>(false);
  const [selectedPositions, setSelectedPositions] = useState<Set<number>>(new Set());
  const [positionSettings, setPositionSettings] = useState<{ [key: number]: { showDetails: boolean, editMode: boolean } }>({});
  
  // SOTA微交互动画状态
  const [tabTransition, setTabTransition] = useState(false);
  const [positionUpdates, setPositionUpdates] = useState<Set<number>>(new Set());
  const [pnlAnimations, setPnlAnimations] = useState<Map<number, 'profit' | 'loss'>>(new Map());
  const [closingPositions, setClosingPositions] = useState<Set<number>>(new Set());
  const [priceFlashes, setPriceFlashes] = useState<Map<number, { type: 'up' | 'down', timestamp: number }>>(new Map());
  const [lastPrices, setLastPrices] = useState<Map<string, number>>(new Map());
  const [realTimeUpdates, setRealTimeUpdates] = useState<Set<number>>(new Set());

  // 优化：使用 useRef 管理定时器防止内存泄漏
  const priceFlashTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const realTimeUpdateTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // 增强的持仓平仓处理，带有完整的微交互反馈
  const handleClosePosition = useCallback((index: number, percentage: number) => {
    const position = positions[index];
    if (!position) return;

    // 标记为正在关闭的持仓
    setClosingPositions(prev => new Set([...prev, index]));
    
    // 根据盈亏状态显示不同的动画
    const isProfitable = position.pnl.startsWith('+');
    setPnlAnimations(prev => new Map([...prev, [index, isProfitable ? 'profit' : 'loss']]));
    
    const message = `Closing ${percentage}% of ${position.pair} ${position.side} position`;
    console.log(message);
    toast.success(`📊 ${message}`);
    
    // 延迟触发父组件回调，给动画时间播放
    setTimeout(() => {
      onClosePosition?.(index, percentage);
      
      // 清理动画状态
      setTimeout(() => {
        setClosingPositions(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
        setPnlAnimations(prev => {
          const newMap = new Map(prev);
          newMap.delete(index);
          return newMap;
        });
      }, 500);
    }, 200);
  }, [positions, onClosePosition]);

  // 处理取消挂单
  const handleCancelPendingOrder = async (orderId: string) => {
    try {
      toast.success(`Order ${orderId} cancelled successfully`);
      setSelectedPendingOrder(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order');
    }
  };

  // 增强的标签页切换，带有微交互动画
  const handleTabChange = (tab: string) => {
    setTabTransition(true);
    setActiveTab(tab);
    onTabChange?.(tab);
    
    // 清除切换动画
    setTimeout(() => {
      setTabTransition(false);
    }, 300);
  };

  // 优化的实时P&L计算函数 - 基于真实市价计算未实现盈亏
  const calculateRealTimePnL = useCallback((position: Position, markPrice: number) => {
    const entryPrice = position.entryPrice || markPrice;
    const positionSizeNum = parseFloat(position.size.replace(/[^\d.-]/g, ''));
    const marginValue = parseFloat(position.margin.replace(/[\$\+\,]/g, ''));
    const leverageUsed = position.leverageUsed || (positionSizeNum * entryPrice / marginValue);
    
    // 计算实时未实现盈亏
    const priceDiff = position.side === 'Long' ? (markPrice - entryPrice) : (entryPrice - markPrice);
    const unrealizedPnl = priceDiff * positionSizeNum;
    
    // 计算ROE (Return on Equity)
    const roe = marginValue > 0 ? (unrealizedPnl / marginValue) * 100 : 0;
    
    // 计算清算价格
    const maintenanceMargin = 0.05; // 5% 维持保证金率
    const liquidationPrice = position.side === 'Long' 
      ? entryPrice * (1 - (1/leverageUsed - maintenanceMargin))
      : entryPrice * (1 + (1/leverageUsed - maintenanceMargin));
    
    // 计算保证金比例
    const marginRatio = position.side === 'Long'
      ? ((markPrice - liquidationPrice) / markPrice) * 100
      : ((liquidationPrice - markPrice) / markPrice) * 100;
    
    // 计算风险等级
    const riskLevel = marginRatio > 15 ? 'low' : marginRatio > 8 ? 'medium' : marginRatio > 3 ? 'high' : 'extreme';
    
    return {
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
      roe: Math.round(roe * 100) / 100,
      liquidationPrice: Math.round(liquidationPrice * 100) / 100,
      marginRatio: Math.max(0, Math.round(marginRatio * 100) / 100),
      riskLevel,
      positionValue: positionSizeNum * markPrice
    };
  }, []);

  // 专业交易计算函数 - 优化了实时P&L计算
  const calculatePositionMetrics = useMemo(() => {
    return positions.map((position, index) => {
      const markPrice = position.markPrice || currentPrice;
      const realTimePnL = calculateRealTimePnL(position, markPrice);
      
      // 使用实时计算的P&L而不是静态数据
      const pnlValue = realTimePnL.unrealizedPnl;
      
      // 计算ADL排队 (Auto-Deleveraging)
      const adl = position.adl || Math.min(5, Math.max(1, Math.floor(Math.abs(realTimePnL.roe) / 20) + 1));
      
      return {
        ...position,
        pnlValue,
        roe: realTimePnL.roe,
        marginRatio: realTimePnL.marginRatio,
        riskLevel: realTimePnL.riskLevel,
        adl,
        liquidationPrice: realTimePnL.liquidationPrice,
        funding: position.funding || (Math.random() - 0.5) * 0.01,
        positionValue: realTimePnL.positionValue,
      };
    });
  }, [positions, currentPrice, calculateRealTimePnL]);

  // 计算总盈亏和风险指标
  const portfolioMetrics = useMemo(() => {
    const totalPnL = calculatePositionMetrics.reduce((total, pos) => total + pos.pnlValue, 0);
    const totalValue = calculatePositionMetrics.reduce((total, pos) => total + (pos.positionValue || 0), 0);
    const totalMargin = calculatePositionMetrics.reduce((total, pos) => {
      const marginValue = parseFloat(pos.margin.replace(/[\$\+\,]/g, ''));
      return total + (isNaN(marginValue) ? 0 : marginValue);
    }, 0);
    
    const highRiskPositions = calculatePositionMetrics.filter(pos => pos.riskLevel === 'extreme' || pos.riskLevel === 'high').length;
    const totalPositions = calculatePositionMetrics.length;
    
    return {
      totalPnL,
      totalValue,
      totalMargin,
      totalPnLPercentage: totalMargin > 0 ? (totalPnL / totalMargin) * 100 : 0,
      riskRatio: totalPositions > 0 ? (highRiskPositions / totalPositions) * 100 : 0,
      positionCount: totalPositions
    };
  }, [calculatePositionMetrics]);

  // 实时价格更新检测
  React.useEffect(() => {
    const newFlashes = new Map<number, { type: 'up' | 'down', timestamp: number }>();
    
    calculatePositionMetrics.forEach((position, index) => {
      const lastPrice = lastPrices.get(position.pair);
      const currentMarkPrice = position.markPrice || currentPrice;
      
      if (lastPrice !== undefined && lastPrice !== currentMarkPrice) {
        // 只有价格变化超过阈值才触发更新动画
        const PRICE_CHANGE_THRESHOLD = 0.0001; // 0.01% 价格变化阈值
        const priceChangePercent = Math.abs((currentMarkPrice - lastPrice) / lastPrice);
        
        if (priceChangePercent >= PRICE_CHANGE_THRESHOLD) {
          const flashType = currentMarkPrice > lastPrice ? 'up' : 'down';
          newFlashes.set(index, { type: flashType, timestamp: Date.now() });
          
          // 触发实时更新动画
          setRealTimeUpdates(prev => new Set([...prev, index]));
          
          // 清除旧的定时器并设置新的
          if (realTimeUpdateTimers.current.has(index)) {
            clearTimeout(realTimeUpdateTimers.current.get(index)!);
          }
          
          const timer = setTimeout(() => {
            setRealTimeUpdates(prev => {
              const newSet = new Set(prev);
              newSet.delete(index);
              return newSet;
            });
            realTimeUpdateTimers.current.delete(index);
          }, 1500);
          
          realTimeUpdateTimers.current.set(index, timer);
        }
      }
    });
    
    if (newFlashes.size > 0) {
      setPriceFlashes(newFlashes);
      
      // 使用统一的定时器管理
      newFlashes.forEach((_, index) => {
        if (priceFlashTimers.current.has(index)) {
          clearTimeout(priceFlashTimers.current.get(index)!);
        }
        
        const timer = setTimeout(() => {
          setPriceFlashes(prev => {
            const newMap = new Map(prev);
            newMap.delete(index);
            return newMap;
          });
          priceFlashTimers.current.delete(index);
        }, 800);
        
        priceFlashTimers.current.set(index, timer);
      });
    }
    
    // 更新最后价格记录
    const newLastPrices = new Map<string, number>();
    calculatePositionMetrics.forEach((position) => {
      newLastPrices.set(position.pair, position.markPrice || currentPrice);
    });
    setLastPrices(newLastPrices);
  }, [calculatePositionMetrics, currentPrice]);

  // 模拟实时数据更新
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (positions.length > 0) {
        // 随机选择一个仓位进行数据更新指示
        const randomIndex = Math.floor(Math.random() * positions.length);
        setPositionUpdates(prev => new Set([...prev, randomIndex]));
        
        // 清除更新指示
        setTimeout(() => {
          setPositionUpdates(prev => {
            const newSet = new Set(prev);
            newSet.delete(randomIndex);
            return newSet;
          });
        }, 2000);
      }
    }, 3000); // 每3秒随机更新一个仓位
    
    return () => clearInterval(interval);
  }, [positions.length]);

  // 清理所有定时器防止内存泄漏
  React.useEffect(() => {
    return () => {
      // 清理价格闪烁定时器
      priceFlashTimers.current.forEach(timer => clearTimeout(timer));
      priceFlashTimers.current.clear();
      
      // 清理实时更新定时器
      realTimeUpdateTimers.current.forEach(timer => clearTimeout(timer));
      realTimeUpdateTimers.current.clear();
    };
  }, []);

  return (
    <div className={className}>
      {/* Tabbed Interface for Positions, Pending Orders, and Order History */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <TabsList className="grid w-fit grid-cols-3">
            <TabsTrigger value="positions" className="flex items-center gap-2 text-xs px-3 py-1.5">
              <Activity className="w-3 h-3" />
              <span>Positions ({positions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2 text-xs px-3 py-1.5">
              <Clock className="w-3 h-3" />
              <span>Pending ({MOCK_PENDING_ORDERS.length})</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 text-xs px-3 py-1.5">
              <History className="w-3 h-3" />
              <span>History ({MOCK_ORDER_HISTORY.length})</span>
            </TabsTrigger>
          </TabsList>
          
          {/* 显示总P&L和快速操作（仅在positions标签页） */}
          {activeTab === 'positions' && positions.length > 0 && (
            <div className="flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-3">
                {/* 总盈亏 */}
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-mono font-bold ${
                    portfolioMetrics.totalPnL >= 0 ? 'text-trading-green-500' : 'text-trading-red-500'
                  }`}>
                    {portfolioMetrics.totalPnL >= 0 ? '+' : ''}${portfolioMetrics.totalPnL.toFixed(2)}
                  </span>
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 ${
                    portfolioMetrics.totalPnL >= 0 
                      ? 'text-trading-green-400 border-trading-green-400/50 bg-trading-green-400/10' 
                      : 'text-trading-red-400 border-trading-red-400/50 bg-trading-red-400/10'
                  }`}>
                    {portfolioMetrics.totalPnL >= 0 ? '+' : ''}{portfolioMetrics.totalPnLPercentage.toFixed(2)}%
                  </Badge>
                </div>
                
                {/* 风险指示器 */}
                {portfolioMetrics.riskRatio > 0 && (
                  <div className="flex items-center space-x-1">
                    <Shield className={`w-3 h-3 ${
                      portfolioMetrics.riskRatio < 25 ? 'text-trading-green-500' :
                      portfolioMetrics.riskRatio < 50 ? 'text-trading-order-pending' :
                      portfolioMetrics.riskRatio < 75 ? 'text-trading-risk-high' :
                      'text-trading-red-500'
                    }`} />
                    <span className={`text-xs ${
                      portfolioMetrics.riskRatio < 25 ? 'text-trading-green-500' :
                      portfolioMetrics.riskRatio < 50 ? 'text-trading-order-pending' :
                      portfolioMetrics.riskRatio < 75 ? 'text-trading-risk-high' :
                      'text-trading-red-500'
                    }`}>
                      {portfolioMetrics.riskRatio.toFixed(0)}% at risk
                    </span>
                  </div>
                )}
                
                {/* 批量操作指示器 */}
                {selectedPositions.size > 0 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 text-blue-400 border-blue-400/50 bg-blue-400/10">
                    {selectedPositions.size} selected
                  </Badge>
                )}
              </div>
              
              {/* 操作按钮区域 */}
              <div className="flex items-center space-x-1">
                {/* 批量操作按钮（仅在有选中项时显示） */}
                {selectedPositions.size > 0 && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        // 批量设置止损
                        selectedPositions.forEach(index => {
                          const position = calculatePositionMetrics[index];
                          onSetStopLoss?.(index, (position.markPrice || currentPrice) * 0.95);
                        });
                        toast.success(`Set stop loss for ${selectedPositions.size} positions`);
                      }}
                      className="px-2 py-1 text-xs text-orange-400 hover:bg-orange-500/20 border-orange-400/50"
                      title="Batch set stop loss"
                    >
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Batch SL
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        // 批量平仓50%
                        selectedPositions.forEach(index => {
                          handleClosePosition(index, 50);
                        });
                        setSelectedPositions(new Set());
                      }}
                      className="px-2 py-1 text-xs text-orange-400 hover:bg-orange-500/20 border-orange-400/50"
                      title="Close 50% of selected positions"
                    >
                      50%
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        // 批量平仓
                        selectedPositions.forEach(index => {
                          handleClosePosition(index, 100);
                        });
                        setSelectedPositions(new Set());
                      }}
                      className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 border-red-400/50"
                      title="Close selected positions"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Close
                    </Button>
                  </>
                )}
                
                {/* 全局操作按钮 */}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onHedgeAllPositions?.()}
                  className="px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/20 border-blue-400/50"
                  title="Hedge all positions"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Hedge
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onCloseAllPositions?.()}
                  className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 border-red-400/50"
                  title="Close all positions"
                >
                  <X className="w-3 h-3 mr-1" />
                  Close All
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Active Positions Tab */}
        <TabsContent value="positions" className={`flex-1 mt-0 ${tabTransition ? 'tab-switch-micro' : ''}`}>
          {positions.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-8 h-8 mx-auto mb-3 text-slate-400 opacity-50" />
              <div className="text-sm font-medium text-slate-400">No Open Positions</div>
              <div className="text-xs text-slate-500 mt-1">Your positions will appear here</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto trading-scrollable">
              {calculatePositionMetrics.map((position, i) => (
                <div 
                  key={i} 
                  className={`professional-trading-card group relative rounded-lg border ${
                    position.riskLevel === 'extreme' ? 'border-trading-red-500/40 bg-trading-red-500/5' :
                    position.riskLevel === 'high' ? 'border-trading-risk-high/40 bg-trading-risk-high/5' :
                    position.riskLevel === 'medium' ? 'border-trading-order-pending/40 bg-trading-order-pending/5' :
                    'border-trading-border-primary bg-trading-bg-secondary/60'
                  } micro-interactive-precise ${
                    animatingPositions.includes(i) ? 'scale-[1.01] shadow-lg shadow-blue-500/20' : ''
                  } ${
                    closingPositions.has(i) ? 'position-loss-micro' : ''
                  } ${
                    pnlAnimations.get(i) === 'profit' ? 'position-profit-micro' : 
                    pnlAnimations.get(i) === 'loss' ? 'position-loss-micro' : ''
                  } ${
                    priceFlashes.has(i) && priceFlashes.get(i)?.type === 'up' ? 'trading-flash-positive' :
                    priceFlashes.has(i) && priceFlashes.get(i)?.type === 'down' ? 'trading-flash-negative' : ''
                  } ${
                    realTimeUpdates.has(i) ? 'trading-data-updating' : ''
                  } hover:bg-trading-bg-elevated/40 transition-all duration-200 ${
                    selectedPositions.has(i) ? 'ring-2 ring-blue-500/50' : ''
                  } ${
                    positionUpdates.has(i) ? 'ring-1 ring-trading-update-indicator animate-pulse' : ''
                  }`}
                  onMouseEnter={() => setHoveredPosition(i)}
                  onMouseLeave={() => setHoveredPosition(null)}
                >
                  {/* 顶部：基本信息行 */}
                  <div className="flex items-center justify-between p-3 pb-2">
                    <div className="flex items-center space-x-3">
                      {/* 多选checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedPositions.has(i)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedPositions);
                          if (e.target.checked) {
                            newSelected.add(i);
                          } else {
                            newSelected.delete(i);
                          }
                          setSelectedPositions(newSelected);
                        }}
                        className="w-3 h-3 text-blue-600 rounded border-gray-600 bg-gray-700 focus:ring-blue-500"
                      />
                      
                      {/* 仓位方向和交易对 */}
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={position.side === 'Long' ? 'default' : 'destructive'}
                          className={`text-xs font-semibold ${
                            position.side === 'Long' 
                              ? 'bg-trading-green-400/20 text-trading-green-400 border-trading-green-400/40' 
                              : 'bg-trading-red-400/20 text-trading-red-400 border-trading-red-400/40'
                          }`}
                        >
                          {position.side === 'Long' ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {position.side}
                        </Badge>
                        <div>
                          <div className="text-sm font-bold text-trading-text-primary">{position.pair}</div>
                          <div className="text-xs text-trading-text-muted">
                            {position.leverageUsed}x • {position.size}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 盈亏和快捷操作 */}
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className={`text-sm font-bold font-mono ${
                          position.pnlValue >= 0 ? 'text-trading-green-500' : 'text-trading-red-500'
                        }`}>
                          {position.pnlValue >= 0 ? '+' : ''}${position.pnlValue.toFixed(2)}
                        </div>
                        <div className={`text-xs font-mono ${
                          position.roe >= 0 ? 'text-trading-green-400' : 'text-trading-red-400'
                        }`}>
                          ROE: {position.roe >= 0 ? '+' : ''}{position.roe.toFixed(2)}%
                        </div>
                      </div>
                      
                      {/* 快捷操作按钮 */}
                      <div className="flex items-center space-x-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setExpandedPosition(expandedPosition === i ? null : i)}
                          className="p-1.5 text-xs border-trading-border-secondary hover:bg-trading-bg-elevated"
                          title={expandedPosition === i ? "Collapse" : "Expand"}
                        >
                          {expandedPosition === i ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleClosePosition(i, 50)}
                          className="px-2 py-1 text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                          disabled={closingPositions.has(i)}
                          title="Close 50%"
                        >
                          {closingPositions.has(i) ? (
                            <div className="spinner-micro w-3 h-3 border border-orange-400 border-t-transparent rounded-full"></div>
                          ) : (
                            '50%'
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleClosePosition(i, 100)}
                          className="px-2 py-1 text-xs border-red-500/50 text-red-400 hover:bg-red-500/20"
                          disabled={closingPositions.has(i)}
                          title="Close 100%"
                        >
                          {closingPositions.has(i) ? (
                            <div className="spinner-micro w-3 h-3 border border-red-400 border-t-transparent rounded-full"></div>
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 详细信息面板（可展开） */}
                  {expandedPosition === i && (
                    <div className="border-t border-trading-border-muted px-3 pb-3 pt-2 space-y-3 animate-in slide-in-from-top-1 duration-200">
                      {/* 价格和保证金信息 */}
                      <div className="grid grid-cols-4 gap-3 text-xs">
                        <div>
                          <div className="text-trading-text-muted">Entry</div>
                          <div className="font-mono font-semibold text-trading-text-primary">
                            ${position.entryPrice?.toFixed(2) || currentPrice.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-trading-text-muted">Mark</div>
                          <div className="font-mono font-semibold text-trading-text-primary">
                            ${(position.markPrice || currentPrice).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-trading-text-muted">Liq. Price</div>
                          <div className={`font-mono font-semibold ${
                            position.riskLevel === 'extreme' || position.riskLevel === 'high' 
                              ? 'text-trading-red-400' 
                              : 'text-trading-text-secondary'
                          }`}>
                            ${position.liquidationPrice?.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-trading-text-muted">Margin</div>
                          <div className="font-mono font-semibold text-trading-text-primary">
                            {position.margin}
                          </div>
                        </div>
                      </div>

                      {/* 风险指标 */}
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <div className="text-trading-text-muted">Margin Ratio</div>
                          <div className={`font-semibold ${
                            position.marginRatio > 200 ? 'text-trading-green-500' :
                            position.marginRatio > 150 ? 'text-trading-order-pending' :
                            position.marginRatio > 100 ? 'text-trading-risk-high' :
                            'text-trading-red-500'
                          }`}>
                            {position.marginRatio.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-trading-text-muted">ADL Queue</div>
                          <div className={`font-semibold ${
                            position.adl <= 2 ? 'text-trading-green-500' :
                            position.adl <= 3 ? 'text-trading-order-pending' :
                            'text-trading-red-500'
                          }`}>
                            {position.adl}/5
                          </div>
                        </div>
                        <div>
                          <div className="text-trading-text-muted">Funding</div>
                          <div className={`font-mono font-semibold ${
                            (position.funding || 0) >= 0 ? 'text-trading-green-500' : 'text-trading-red-500'
                          }`}>
                            {((position.funding || 0) * 100).toFixed(4)}%
                          </div>
                        </div>
                      </div>

                      {/* 高级操作按钮 */}
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => onAddToPosition?.(i, 1)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border-trading-green-500/50 text-trading-green-400 hover:bg-trading-green-500/20"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => onSetTakeProfit?.(i, (position.markPrice || currentPrice) * 1.1)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                        >
                          <TrendingUp className="w-3 h-3" />
                          TP
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => onSetStopLoss?.(i, (position.markPrice || currentPrice) * 0.9)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                        >
                          <TrendingDown className="w-3 h-3" />
                          SL
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => onSharePosition?.(i)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                        >
                          <Share2 className="w-3 h-3" />
                          Share
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Orders Tab */}
        <TabsContent value="pending" className={`flex-1 mt-0 ${tabTransition ? 'tab-switch-micro' : ''}`}>
          {MOCK_PENDING_ORDERS.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 mx-auto mb-3 text-slate-400 opacity-50" />
              <div className="text-sm font-medium text-slate-400">No Pending Orders</div>
              <div className="text-xs text-slate-500 mt-1">Your pending orders will appear here</div>
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {MOCK_PENDING_ORDERS.map((order) => (
                <div key={order.id} className="border border-slate-700/40 rounded-md p-2 bg-slate-800/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant={order.side === 'buy' ? 'default' : 'destructive'}
                        className={`text-xs ${order.side === 'buy' ? 'bg-green-400/20 text-green-400 border-green-400/40' : 'bg-red-400/20 text-red-400 border-red-400/40'}`}
                      >
                        {order.side === 'buy' ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {order.side.toUpperCase()}
                      </Badge>
                      <div>
                        <div className="text-sm font-semibold text-white">{order.market}</div>
                        <div className="text-xs text-gray-400">{order.type.toUpperCase()} • {order.id}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs mb-2">
                    <div>
                      <div className="text-gray-400">Size</div>
                      <div className="font-medium text-white">{order.size}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Price</div>
                      <div className="font-medium text-white">${order.price}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Created</div>
                      <div className="font-medium text-white">
                        {formatRelativeTime ? formatRelativeTime(new Date(order.timestamp)) : '1h ago'}
                      </div>
                    </div>
                  </div>

                  {selectedPendingOrder === order.id ? (
                    <div className="space-y-2">
                      <Alert>
                        <AlertTriangle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          Are you sure you want to cancel this order?
                        </AlertDescription>
                      </Alert>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleCancelPendingOrder(order.id)}
                          variant="destructive"
                          size="sm"
                          className="flex-1 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Confirm Cancel
                        </Button>
                        <Button
                          onClick={() => setSelectedPendingOrder(null)}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                        >
                          Keep Order
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setSelectedPendingOrder(order.id)}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="history" className={`flex-1 mt-0 ${tabTransition ? 'tab-switch-micro' : ''}`}>
          {MOCK_ORDER_HISTORY.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-8 h-8 mx-auto mb-3 text-slate-400 opacity-50" />
              <div className="text-sm font-medium text-slate-400">No Order History</div>
              <div className="text-xs text-slate-500 mt-1">Your completed orders will appear here</div>
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {MOCK_ORDER_HISTORY.map((order) => (
                <div key={order.id} className="border border-slate-700/40 rounded-md p-2 bg-slate-800/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant={order.side === 'buy' ? 'default' : 'destructive'}
                        className={`text-xs opacity-70 ${order.side === 'buy' ? 'bg-green-400/20 text-green-400 border-green-400/40' : 'bg-red-400/20 text-red-400 border-red-400/40'}`}
                      >
                        {order.side === 'buy' ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {order.side.toUpperCase()}
                      </Badge>
                      <div>
                        <div className="text-sm font-semibold text-white">{order.market}</div>
                        <div className="text-xs text-gray-400">{order.type.toUpperCase()} • {order.id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs mb-1">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Filled
                      </Badge>
                      <div className={`text-sm font-bold ${getPnLColor ? getPnLColor(parseFloat(order.pnl)) : 'text-green-400'}`}>
                        {order.pnl}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-gray-400">Size</div>
                      <div className="font-medium text-white">{order.size}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Price</div>
                      <div className="font-medium text-white">${order.price}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Fee</div>
                      <div className="font-medium text-red-400">{order.fee}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Closed</div>
                      <div className="font-medium text-white">
                        {formatRelativeTime ? formatRelativeTime(new Date(order.closeTime)) : '12h ago'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default React.memo(CompactPositionsPanel);