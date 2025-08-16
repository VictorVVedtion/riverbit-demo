import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Target, 
  AlertTriangle,
  Settings,
  Plus,
  Minus,
  X,
  MoreHorizontal,
  BarChart3,
  Clock,
  DollarSign,
  Percent,
  Activity,
  Eye,
  Copy,
  ExternalLink,
  Calculator,
  Zap
} from 'lucide-react';
import '../styles/riverbit-colors.css';

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  margin: number;
  pnl: number;
  pnlPercent: number;
  liquidationPrice: number;
  marginRatio: number;
  openTime: number;
  lastUpdated: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  fundingRate: number;
  nextFundingTime: number;
  unrealizedFunding: number;
  marginMode: 'cross' | 'isolated';
  isReduceOnly?: boolean;
}

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  size: number;
  price?: number;
  stopPrice?: number;
  status: 'pending' | 'partial' | 'filled' | 'cancelled';
  filledSize: number;
  remainingSize: number;
  avgFillPrice?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  createTime: number;
  updateTime: number;
}

interface TradeHistory {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  price: number;
  fee: number;
  feeAsset: string;
  realizedPnl: number;
  time: number;
  orderId: string;
  tradeId: string;
}

interface AdvancedPositionPanelProps {
  positions: Position[];
  orders: Order[];
  tradeHistory: TradeHistory[];
  onClosePosition: (positionId: string) => void;
  onCancelOrder: (orderId: string) => void;
  onModifyPosition: (positionId: string, action: 'add_margin' | 'reduce_margin' | 'set_tp' | 'set_sl') => void;
  className?: string;
}

const AdvancedPositionPanel: React.FC<AdvancedPositionPanelProps> = ({
  positions,
  orders,
  tradeHistory,
  onClosePosition,
  onCancelOrder,
  onModifyPosition,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('positions');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'pnl' | 'size' | 'time'>('pnl');
  const [filterBy, setFilterBy] = useState<'all' | 'long' | 'short' | 'profitable' | 'losing'>('all');

  // Calculate aggregate statistics
  const aggregateStats = useMemo(() => {
    const totalPnl = positions.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalMargin = positions.reduce((sum, pos) => sum + pos.margin, 0);
    const totalSize = positions.reduce((sum, pos) => sum + (pos.size * pos.entryPrice), 0);
    const profitablePositions = positions.filter(pos => pos.pnl > 0).length;
    const losingPositions = positions.filter(pos => pos.pnl < 0).length;
    const winRate = positions.length > 0 ? (profitablePositions / positions.length) * 100 : 0;
    
    const todaysPnl = tradeHistory
      .filter(trade => new Date(trade.time).toDateString() === new Date().toDateString())
      .reduce((sum, trade) => sum + trade.realizedPnl, 0);

    return {
      totalPnl,
      totalMargin,
      totalSize,
      profitablePositions,
      losingPositions,
      winRate,
      todaysPnl,
      positionCount: positions.length,
      orderCount: orders.filter(order => order.status === 'pending').length
    };
  }, [positions, tradeHistory]);

  // Filter and sort positions
  const filteredPositions = useMemo(() => {
    let filtered = [...positions];
    
    // Apply filters
    switch (filterBy) {
      case 'long':
        filtered = filtered.filter(pos => pos.side === 'long');
        break;
      case 'short':
        filtered = filtered.filter(pos => pos.side === 'short');
        break;
      case 'profitable':
        filtered = filtered.filter(pos => pos.pnl > 0);
        break;
      case 'losing':
        filtered = filtered.filter(pos => pos.pnl < 0);
        break;
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'pnl':
          return b.pnl - a.pnl;
        case 'size':
          return (b.size * b.entryPrice) - (a.size * a.entryPrice);
        case 'time':
          return b.openTime - a.openTime;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [positions, filterBy, sortBy]);

  // Format time display
  const formatTime = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))}m`;
    return `${Math.floor(diff / (1000 * 60))}m`;
  }, []);

  // Format funding time
  const formatFundingTime = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, []);

  return (
    <div className={`${className} bg-gradient-to-br from-surface-1 to-surface-2 border border-default/30 rounded-xl shadow-professional`}>
      {/* Enhanced Header with Stats */}
      <div className="p-4 border-b border-default/30 bg-surface-2/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-bold text-primary flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-river-blue" />
              <span>Portfolio Overview</span>
            </h3>
            <Badge variant="outline" className="text-xs">
              {aggregateStats.positionCount} positions
            </Badge>
            <Badge variant="outline" className="text-xs">
              {aggregateStats.orderCount} orders
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" className="h-8 text-xs">
              <Settings className="w-3 h-3 mr-1" />
              Settings
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs">
              <ExternalLink className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface-1/60 rounded-lg p-3 border border-default/20">
            <div className="text-xs text-secondary mb-1">Total P&L</div>
            <div className={`text-lg font-bold ${aggregateStats.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {aggregateStats.totalPnl >= 0 ? '+' : ''}${Math.abs(aggregateStats.totalPnl).toLocaleString()}
            </div>
            <div className="text-xs text-muted">Unrealized</div>
          </div>
          
          <div className="bg-surface-1/60 rounded-lg p-3 border border-default/20">
            <div className="text-xs text-secondary mb-1">Today's P&L</div>
            <div className={`text-lg font-bold ${aggregateStats.todaysPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {aggregateStats.todaysPnl >= 0 ? '+' : ''}${Math.abs(aggregateStats.todaysPnl).toLocaleString()}
            </div>
            <div className="text-xs text-muted">Realized</div>
          </div>
          
          <div className="bg-surface-1/60 rounded-lg p-3 border border-default/20">
            <div className="text-xs text-secondary mb-1">Win Rate</div>
            <div className="text-lg font-bold text-river-blue">
              {aggregateStats.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted">
              {aggregateStats.profitablePositions}W / {aggregateStats.losingPositions}L
            </div>
          </div>
          
          <div className="bg-surface-1/60 rounded-lg p-3 border border-default/20">
            <div className="text-xs text-secondary mb-1">Total Margin</div>
            <div className="text-lg font-bold text-primary">
              ${aggregateStats.totalMargin.toLocaleString()}
            </div>
            <div className="text-xs text-muted">Used margin</div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-default/20">
          <TabsList className="bg-surface-2/80 h-10">
            <TabsTrigger value="positions" className="font-semibold px-4">
              Positions ({aggregateStats.positionCount})
            </TabsTrigger>
            <TabsTrigger value="orders" className="font-semibold px-4">
              Orders ({aggregateStats.orderCount})
            </TabsTrigger>
            <TabsTrigger value="history" className="font-semibold px-4">
              History
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'positions' && (
            <div className="flex items-center space-x-2">
              {/* Filter Dropdown */}
              <select 
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="bg-surface-3/60 border border-default/40 rounded-md px-2 py-1 text-xs"
              >
                <option value="all">All Positions</option>
                <option value="long">Long Only</option>
                <option value="short">Short Only</option>
                <option value="profitable">Profitable</option>
                <option value="losing">Losing</option>
              </select>
              
              {/* Sort Dropdown */}
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-surface-3/60 border border-default/40 rounded-md px-2 py-1 text-xs"
              >
                <option value="pnl">Sort by P&L</option>
                <option value="size">Sort by Size</option>
                <option value="time">Sort by Time</option>
              </select>
              
              {positions.length > 0 && (
                <Button size="sm" variant="destructive" className="h-8 text-xs">
                  Close All
                </Button>
              )}
            </div>
          )}
        </div>

        <TabsContent value="positions" className="flex-1 overflow-auto">
          {filteredPositions.length > 0 ? (
            <div className="space-y-2 p-4">
              {filteredPositions.map((position) => (
                <Card 
                  key={position.id} 
                  className={`transition-all duration-200 cursor-pointer ${
                    selectedPosition === position.id 
                      ? 'ring-2 ring-river-blue bg-surface-2/80' 
                      : 'hover:bg-surface-2/60'
                  }`}
                  onClick={() => setSelectedPosition(selectedPosition === position.id ? null : position.id)}
                >
                  <CardContent className="p-4">
                    {/* Position Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant={position.side === 'long' ? 'default' : 'destructive'}
                          className="font-bold"
                        >
                          {position.side === 'long' ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {position.side.toUpperCase()} {position.leverage}x
                        </Badge>
                        
                        <div className="font-bold text-lg text-primary">{position.symbol}</div>
                        
                        <Badge variant="outline" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          {position.marginMode}
                        </Badge>
                        
                        <div className="text-xs text-muted">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatTime(position.openTime)}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className={`text-right ${position.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                          <div className="text-xl font-bold">
                            {position.pnl >= 0 ? '+' : ''}${Math.abs(position.pnl).toLocaleString()}
                          </div>
                          <div className="text-sm">
                            ({position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClosePosition(position.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Position Metrics Grid */}
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div className="bg-surface-1/30 rounded-md p-2">
                        <div className="text-xs text-secondary mb-1">Position Size</div>
                        <div className="font-bold text-primary">{position.size}</div>
                        <div className="text-xs text-muted">${(position.size * position.entryPrice).toLocaleString()}</div>
                      </div>
                      
                      <div className="bg-surface-1/30 rounded-md p-2">
                        <div className="text-xs text-secondary mb-1">Entry / Mark</div>
                        <div className="font-bold text-primary">${position.entryPrice.toLocaleString()}</div>
                        <div className="text-xs text-muted">${position.markPrice.toLocaleString()}</div>
                      </div>
                      
                      <div className="bg-surface-1/30 rounded-md p-2">
                        <div className="text-xs text-secondary mb-1">Liquidation</div>
                        <div className="font-bold text-danger">${position.liquidationPrice.toLocaleString()}</div>
                        <div className="text-xs text-muted">Risk level</div>
                      </div>
                      
                      <div className="bg-surface-1/30 rounded-md p-2">
                        <div className="text-xs text-secondary mb-1">Margin Ratio</div>
                        <div className={`font-bold ${
                          position.marginRatio > 200 ? 'text-profit' : 
                          position.marginRatio > 100 ? 'text-loss' : 'text-danger'
                        }`}>
                          {position.marginRatio.toFixed(1)}%
                        </div>
                        <Progress 
                          value={Math.min(position.marginRatio, 500) / 5} 
                          className="h-1 mt-1"
                        />
                      </div>
                    </div>
                    
                    {/* Funding Information */}
                    <div className="bg-surface-1/20 rounded-md p-2 mb-3">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-4">
                          <span className="text-secondary">Funding Rate:</span>
                          <span className={`font-bold ${position.fundingRate >= 0 ? 'text-loss' : 'text-profit'}`}>
                            {position.fundingRate >= 0 ? '+' : ''}{(position.fundingRate * 100).toFixed(4)}%
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-secondary">Next Funding:</span>
                          <span className="font-medium text-primary">{formatFundingTime(position.nextFundingTime)}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-secondary">Unrealized Funding:</span>
                          <span className={`font-bold ${position.unrealizedFunding >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {position.unrealizedFunding >= 0 ? '+' : ''}${Math.abs(position.unrealizedFunding).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* TP/SL Display */}
                    {(position.takeProfitPrice || position.stopLossPrice) && (
                      <div className="bg-surface-1/20 rounded-md p-2 mb-3">
                        <div className="flex justify-between items-center text-xs">
                          {position.takeProfitPrice && (
                            <div className="flex items-center space-x-2">
                              <Target className="w-3 h-3 text-profit" />
                              <span className="text-secondary">TP:</span>
                              <span className="font-bold text-profit">${position.takeProfitPrice.toLocaleString()}</span>
                            </div>
                          )}
                          {position.stopLossPrice && (
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="w-3 h-3 text-loss" />
                              <span className="text-secondary">SL:</span>
                              <span className="font-bold text-loss">${position.stopLossPrice.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Expanded Actions */}
                    {selectedPosition === position.id && (
                      <div className="border-t border-default/30 pt-3 mt-3">
                        <div className="grid grid-cols-4 gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onModifyPosition(position.id, 'add_margin');
                            }}
                            className="text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Margin
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onModifyPosition(position.id, 'reduce_margin');
                            }}
                            className="text-xs"
                          >
                            <Minus className="w-3 h-3 mr-1" />
                            Reduce
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onModifyPosition(position.id, 'set_tp');
                            }}
                            className="text-xs"
                          >
                            <Target className="w-3 h-3 mr-1" />
                            Set TP
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onModifyPosition(position.id, 'set_sl');
                            }}
                            className="text-xs"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Set SL
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <div className="text-lg font-medium mb-1">No positions</div>
                <div className="text-sm">Open a position to start trading</div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="flex-1 overflow-auto">
          {orders.length > 0 ? (
            <div className="space-y-2 p-4">
              {orders.map((order) => (
                <Card key={order.id} className="hover:bg-surface-2/60 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant={order.side === 'buy' ? 'default' : 'destructive'}>
                          {order.side.toUpperCase()}
                        </Badge>
                        <div className="font-bold">{order.symbol}</div>
                        <div className="text-sm text-muted">{order.type.toUpperCase()}</div>
                        <div className="text-sm">{order.size}</div>
                        {order.price && <div className="text-sm">${order.price}</div>}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={`text-xs ${
                          order.status === 'pending' ? 'text-loss' :
                          order.status === 'partial' ? 'text-loss' :
                          order.status === 'filled' ? 'text-profit' : 'text-muted'
                        }`}>
                          {order.status}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onCancelOrder(order.id)}
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <div className="text-lg font-medium mb-1">No open orders</div>
                <div className="text-sm">Place an order to see it here</div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-auto">
          {tradeHistory.length > 0 ? (
            <div className="space-y-1 p-4">
              {tradeHistory.slice(0, 50).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-2 hover:bg-surface-2/30 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'} className="text-xs">
                      {trade.side.toUpperCase()}
                    </Badge>
                    <div className="font-medium text-sm">{trade.symbol}</div>
                    <div className="text-sm text-muted">{trade.size}</div>
                    <div className="text-sm">${trade.price}</div>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-sm">
                    <div className={`font-bold ${trade.realizedPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {trade.realizedPnl >= 0 ? '+' : ''}${Math.abs(trade.realizedPnl).toFixed(2)}
                    </div>
                    <div className="text-muted">{formatTime(trade.time)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <div className="text-lg font-medium mb-1">No trade history</div>
                <div className="text-sm">Your completed trades will appear here</div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedPositionPanel;