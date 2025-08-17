/**
 * PositionManager - 持仓管理组件
 * 实时显示用户持仓，支持平仓操作
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  X, 
  RefreshCw,
  DollarSign,
  Target,
  AlertTriangle,
  Activity,
  Loader2,
  History,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useRiverBitWeb3 } from '../../providers/RiverBitWeb3Provider';
import { useMultipleRealTimePrices } from '../../hooks/useRealTimePrice';
import { 
  formatPrice, 
  formatNumber, 
  formatPercentage,
  getPnLColor,
  formatRelativeTime 
} from '../../utils/formatUtils';
import { toast } from 'sonner';

// Mock data for order history and pending orders
const MOCK_ORDER_HISTORY = [
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
  },
  {
    id: 'ORD-003',
    market: 'BTC/USDT',
    side: 'buy',
    type: 'limit',
    size: '0.1',
    price: '42000.00',
    status: 'filled',
    filledSize: '0.1',
    fee: '0.0001',
    pnl: '+320.00',
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    closeTime: new Date(Date.now() - 172800000).toISOString()
  }
];

const MOCK_PENDING_ORDERS = [
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
  },
  {
    id: 'PEND-003',
    market: 'BTC/USDT',
    side: 'sell',
    type: 'stop-limit',
    size: '0.03',
    price: '46000.00',
    stopPrice: '45500.00',
    status: 'pending',
    filledSize: '0',
    timestamp: new Date(Date.now() - 1800000).toISOString()
  }
];

const PositionManager: React.FC = () => {
  const {
    positions,
    isLoadingPositions,
    closePosition,
    refreshData,
    accountInfo,
    error
  } = useRiverBitWeb3();

  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [closeSize, setCloseSize] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('positions');
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<string | null>(null);

  // 获取所有持仓的市场符号
  const positionSymbols = useMemo(() => {
    return positions.map(pos => pos.market);
  }, [positions]);

  // 订阅实时价格
  const { getPriceData } = useMultipleRealTimePrices(positionSymbols);

  // 计算持仓的实时PnL
  const calculateRealTimePnL = (position: any) => {
    const priceData = getPriceData(position.market);
    if (!priceData) return parseFloat(position.unrealizedPnl);

    const currentPrice = priceData.price;
    const entryPrice = parseFloat(position.entryPrice);
    const size = parseFloat(position.size);
    
    const priceDiff = position.side === 'buy' 
      ? currentPrice - entryPrice 
      : entryPrice - currentPrice;
    
    return size * priceDiff;
  };

  // 计算持仓的实时ROE
  const calculateROE = (position: any) => {
    const pnl = calculateRealTimePnL(position);
    const notionalValue = parseFloat(position.size) * parseFloat(position.entryPrice);
    const margin = notionalValue / position.leverage;
    
    return (pnl / margin) * 100;
  };

  // 处理平仓
  const handleClosePosition = async (position: any) => {
    if (!closeSize || parseFloat(closeSize) <= 0) {
      toast.error('Please enter a valid close size');
      return;
    }

    if (parseFloat(closeSize) > parseFloat(position.size)) {
      toast.error('Close size cannot exceed position size');
      return;
    }

    setIsClosing(true);
    try {
      await closePosition({
        positionId: position.market, // 使用市场作为ID
        size: closeSize
      });
      
      toast.success('Position closed successfully');
      setSelectedPosition(null);
      setCloseSize('');
      refreshData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to close position');
    } finally {
      setIsClosing(false);
    }
  };

  // 全部平仓
  const handleCloseAll = (position: any) => {
    setCloseSize(position.size);
    setSelectedPosition(position.market);
  };

  // 部分平仓
  const handlePartialClose = (position: any, percentage: number) => {
    const partialSize = (parseFloat(position.size) * percentage / 100).toFixed(6);
    setCloseSize(partialSize);
  };

  // 计算总体统计
  const totalStats = useMemo(() => {
    if (positions.length === 0) return null;

    const totalPnL = positions.reduce((sum, pos) => sum + calculateRealTimePnL(pos), 0);
    const totalNotional = positions.reduce((sum, pos) => 
      sum + (parseFloat(pos.size) * parseFloat(pos.entryPrice)), 0);
    const totalMargin = positions.reduce((sum, pos) => 
      sum + (parseFloat(pos.size) * parseFloat(pos.entryPrice) / pos.leverage), 0);

    return {
      totalPnL,
      totalNotional,
      totalMargin,
      totalROE: totalMargin > 0 ? (totalPnL / totalMargin) * 100 : 0,
      longPositions: positions.filter(pos => pos.side === 'buy').length,
      shortPositions: positions.filter(pos => pos.side === 'sell').length
    };
  }, [positions]);

  if (isLoadingPositions) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading positions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Handle cancel pending order
  const handleCancelPendingOrder = async (orderId: string) => {
    try {
      // In production, this would call the actual cancel order API
      toast.success(`Order ${orderId} cancelled successfully`);
      setSelectedPendingOrder(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order');
    }
  };

  return (
    <div className="space-y-6">
      {/* 总体统计 */}
      {totalStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Portfolio Overview</span>
              </span>
              <Button
                onClick={refreshData}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted">Total PnL</div>
                <div className={`text-xl font-bold ${getPnLColor(totalStats.totalPnL)}`}>
                  {formatPrice(totalStats.totalPnL, { showSign: true })}
                </div>
                <div className={`text-sm ${getPnLColor(totalStats.totalROE)}`}>
                  {formatPercentage(totalStats.totalROE, { showSign: true })}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted">Total Notional</div>
                <div className="text-xl font-bold text-primary">
                  {formatPrice(totalStats.totalNotional)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted">Total Margin</div>
                <div className="text-xl font-bold text-river-blue">
                  {formatPrice(totalStats.totalMargin)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted">Positions</div>
                <div className="flex justify-center space-x-2 mt-1">
                  <Badge variant="default" className="bg-profit">
                    {totalStats.longPositions} Long
                  </Badge>
                  <Badge variant="destructive">
                    {totalStats.shortPositions} Short
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Interface for Positions, Order History, and Pending Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="positions" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Positions ({positions.length})</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Pending ({MOCK_PENDING_ORDERS.length})</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>History ({MOCK_ORDER_HISTORY.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Active Positions Tab */}
            <TabsContent value="positions" className="mt-6">
          {positions.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 mx-auto text-muted mb-4" />
              <h3 className="text-lg font-semibold text-secondary mb-2">No Open Positions</h3>
              <p className="text-muted">
                Your open positions will appear here once you start trading
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((position, index) => {
                const realTimePnL = calculateRealTimePnL(position);
                const roe = calculateROE(position);
                const priceData = getPriceData(position.market);
                const isSelected = selectedPosition === position.market;

                return (
                  <Card key={`${position.market}-${index}`} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={position.side === 'buy' ? 'default' : 'destructive'}
                            className={position.side === 'buy' ? 'bg-profit' : 'bg-loss'}
                          >
                            {position.side === 'buy' ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {position.side.toUpperCase()}
                          </Badge>
                          <div>
                            <h4 className="font-semibold text-lg">{position.market}</h4>
                            <div className="text-sm text-muted">
                              {position.marginMode} • {position.leverage}x leverage
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted">P&L</div>
                          <div className={`text-xl font-bold ${getPnLColor(realTimePnL)}`}>
                            {formatPrice(realTimePnL, { showSign: true })}
                          </div>
                          <div className={`text-sm ${getPnLColor(roe)}`}>
                            {formatPercentage(roe, { showSign: true })} ROE
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <div className="text-muted">Size</div>
                          <div className="font-medium">{formatNumber(position.size)}</div>
                        </div>
                        <div>
                          <div className="text-muted">Entry Price</div>
                          <div className="font-medium">${formatNumber(position.entryPrice)}</div>
                        </div>
                        <div>
                          <div className="text-muted">Mark Price</div>
                          <div className="font-medium">
                            {priceData ? 
                              `$${formatNumber(priceData.price)}` : 
                              'Loading...'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-muted">Opened</div>
                          <div className="font-medium">
                            {formatRelativeTime(new Date(position.timestamp))}
                          </div>
                        </div>
                      </div>

                      {/* 平仓控制 */}
                      {isSelected ? (
                        <div className="border-t pt-4 space-y-3">
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              placeholder="Close size"
                              value={closeSize}
                              onChange={(e) => setCloseSize(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              onClick={() => setSelectedPosition(null)}
                              variant="ghost"
                              size="sm"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2">
                            {[25, 50, 75, 100].map((percentage) => (
                              <Button
                                key={percentage}
                                onClick={() => handlePartialClose(position, percentage)}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                              >
                                {percentage}%
                              </Button>
                            ))}
                          </div>

                          <Button
                            onClick={() => handleClosePosition(position)}
                            disabled={!closeSize || isClosing}
                            className="w-full"
                            variant={position.side === 'buy' ? 'destructive' : 'default'}
                          >
                            {isClosing ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <X className="w-4 h-4 mr-2" />
                            )}
                            {isClosing ? 'Closing...' : 'Close Position'}
                          </Button>
                        </div>
                      ) : (
                        <div className="border-t pt-4 flex space-x-2">
                          <Button
                            onClick={() => setSelectedPosition(position.market)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Target className="w-4 h-4 mr-2" />
                            Close
                          </Button>
                          <Button
                            onClick={() => handleCloseAll(position)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Close All
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
            </TabsContent>

            {/* Pending Orders Tab */}
            <TabsContent value="pending" className="mt-6">
              {MOCK_PENDING_ORDERS.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto text-muted mb-4" />
                  <h3 className="text-lg font-semibold text-secondary mb-2">No Pending Orders</h3>
                  <p className="text-muted">
                    Your pending orders will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {MOCK_PENDING_ORDERS.map((order) => (
                    <Card key={order.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <Badge 
                              variant={order.side === 'buy' ? 'default' : 'destructive'}
                              className={order.side === 'buy' ? 'bg-profit' : 'bg-loss'}
                            >
                              {order.side === 'buy' ? (
                                <TrendingUp className="w-3 h-3 mr-1" />
                              ) : (
                                <TrendingDown className="w-3 h-3 mr-1" />
                              )}
                              {order.side.toUpperCase()}
                            </Badge>
                            <div>
                              <h4 className="font-semibold text-lg">{order.market}</h4>
                              <div className="text-sm text-muted">
                                {order.type.toUpperCase()} • Order ID: {order.id}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                          <div>
                            <div className="text-muted">Size</div>
                            <div className="font-medium">{formatNumber(order.size)}</div>
                          </div>
                          <div>
                            <div className="text-muted">Price</div>
                            <div className="font-medium">${formatNumber(order.price)}</div>
                          </div>
                          {order.stopPrice && (
                            <div>
                              <div className="text-muted">Stop Price</div>
                              <div className="font-medium">${formatNumber(order.stopPrice)}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-muted">Created</div>
                            <div className="font-medium">
                              {formatRelativeTime(new Date(order.timestamp))}
                            </div>
                          </div>
                        </div>

                        {selectedPendingOrder === order.id ? (
                          <div className="border-t pt-4 space-y-3">
                            <Alert>
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                Are you sure you want to cancel this order?
                              </AlertDescription>
                            </Alert>
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleCancelPendingOrder(order.id)}
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Confirm Cancel
                              </Button>
                              <Button
                                onClick={() => setSelectedPendingOrder(null)}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                              >
                                Keep Order
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="border-t pt-4">
                            <Button
                              onClick={() => setSelectedPendingOrder(order.id)}
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel Order
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Order History Tab */}
            <TabsContent value="history" className="mt-6">
              {MOCK_ORDER_HISTORY.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto text-muted mb-4" />
                  <h3 className="text-lg font-semibold text-secondary mb-2">No Order History</h3>
                  <p className="text-muted">
                    Your completed orders will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {MOCK_ORDER_HISTORY.map((order) => (
                    <Card key={order.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <Badge 
                              variant={order.side === 'buy' ? 'default' : 'destructive'}
                              className={`${order.side === 'buy' ? 'bg-profit' : 'bg-loss'} opacity-70`}
                            >
                              {order.side === 'buy' ? (
                                <TrendingUp className="w-3 h-3 mr-1" />
                              ) : (
                                <TrendingDown className="w-3 h-3 mr-1" />
                              )}
                              {order.side.toUpperCase()}
                            </Badge>
                            <div>
                              <h4 className="font-semibold text-lg">{order.market}</h4>
                              <div className="text-sm text-muted">
                                {order.type.toUpperCase()} • Order ID: {order.id}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 mb-2">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Filled
                            </Badge>
                            <div className={`text-lg font-bold ${getPnLColor(parseFloat(order.pnl))}`}>
                              {order.pnl}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <div className="text-muted">Size</div>
                            <div className="font-medium">{formatNumber(order.size)}</div>
                          </div>
                          <div>
                            <div className="text-muted">Price</div>
                            <div className="font-medium">${formatNumber(order.price)}</div>
                          </div>
                          <div>
                            <div className="text-muted">Fee</div>
                            <div className="font-medium text-loss">{order.fee}</div>
                          </div>
                          <div>
                            <div className="text-muted">Opened</div>
                            <div className="font-medium">
                              {formatRelativeTime(new Date(order.timestamp))}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted">Closed</div>
                            <div className="font-medium">
                              {formatRelativeTime(new Date(order.closeTime))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 风险提示 */}
      {positions.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Risk Warning:</strong> Monitor your positions closely. 
            Leveraged trading can result in significant losses. Consider setting 
            stop-loss orders to manage your risk.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PositionManager;