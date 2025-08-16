/**
 * IntegratedTradingInterface - 集成的交易界面
 * 整合资产选择器、交易表单和Web3合约交互
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Target, 
  Shield, 
  AlertTriangle, 
  DollarSign, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  RefreshCw,
  Activity,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import AssetSelector from './AssetSelector';
import { useRiverBitWeb3 } from '../../providers/RiverBitWeb3Provider';
import { useRealTimePrice } from '../../hooks/useRealTimePrice';
import { 
  formatPrice, 
  formatNumber, 
  formatPercentage,
  getPnLColor,
  getLeverageRiskColor 
} from '../../utils/formatUtils';
import { TRADING_CONFIG } from '../../constants/contractConstants';
import { toast } from 'sonner';

interface TradeParams {
  market: string;
  side: 'buy' | 'sell';
  size: string;
  price?: string;
  orderType: 'market' | 'limit';
  marginMode: 'cross' | 'isolated';
  leverage: number;
}

interface IntegratedTradingInterfaceProps {
  className?: string;
}

const IntegratedTradingInterface: React.FC<IntegratedTradingInterfaceProps> = ({
  className = ''
}) => {
  // Web3 状态
  const {
    isConnected,
    address,
    chainId,
    isValidNetwork,
    accountInfo,
    usdcBalance,
    positions,
    orders,
    isLoadingAccount,
    connectWallet,
    switchToValidNetwork,
    placeOrder,
    cancelOrder,
    closePosition,
    approveUSDC,
    error: web3Error,
    clearError
  } = useRiverBitWeb3();

  // 本地状态
  const [selectedAsset, setSelectedAsset] = useState('BTC-PERP');
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>('cross');
  const [isTrading, setIsTrading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trade' | 'positions' | 'orders'>('trade');

  // 实时价格数据
  const { priceData, isLoading: isPriceLoading } = useRealTimePrice(selectedAsset);

  // 当前市场价格
  const currentPrice = useMemo(() => {
    return priceData?.price || 0;
  }, [priceData]);

  // 交易参数计算
  const tradeCalculations = useMemo(() => {
    const sizeNum = parseFloat(size) || 0;
    const priceNum = orderType === 'market' ? currentPrice : (parseFloat(price) || currentPrice);
    const notionalValue = sizeNum * priceNum;
    const marginRequired = notionalValue / leverage;
    const tradingFee = notionalValue * 0.0006; // 0.06% 交易手续费
    const liquidationPrice = orderSide === 'buy' 
      ? priceNum * (1 - (0.95 / leverage))
      : priceNum * (1 + (0.95 / leverage));

    return {
      notionalValue,
      marginRequired,
      tradingFee,
      liquidationPrice,
      totalCost: marginRequired + tradingFee
    };
  }, [size, price, currentPrice, leverage, orderSide, orderType]);

  // 处理资产选择
  const handleAssetSelect = useCallback((market: any) => {
    setSelectedAsset(market.symbol);
    setSelectedMarket(market);
    setPrice(''); // 清空限价
  }, []);

  // 处理百分比按钮
  const handlePercentageClick = useCallback((percent: number) => {
    const availableBalance = parseFloat(accountInfo?.freeMargin || usdcBalance || '0');
    const maxSize = (availableBalance * leverage * percent) / 100;
    setSize(maxSize.toFixed(2));
  }, [accountInfo, usdcBalance, leverage]);

  // 交易前验证
  const validateTrade = useCallback((): { isValid: boolean; error?: string } => {
    if (!isConnected) {
      return { isValid: false, error: 'Please connect your wallet' };
    }

    if (!isValidNetwork) {
      return { isValid: false, error: 'Please switch to Arbitrum Sepolia network' };
    }

    if (!size || parseFloat(size) <= 0) {
      return { isValid: false, error: 'Please enter a valid position size' };
    }

    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      return { isValid: false, error: 'Please enter a valid limit price' };
    }

    const freeMargin = parseFloat(accountInfo?.freeMargin || '0');
    if (tradeCalculations.marginRequired > freeMargin) {
      return { 
        isValid: false, 
        error: `Insufficient margin. Required: $${tradeCalculations.marginRequired.toFixed(2)}, Available: $${freeMargin.toFixed(2)}` 
      };
    }

    return { isValid: true };
  }, [isConnected, isValidNetwork, size, price, orderType, accountInfo, tradeCalculations]);

  // 执行交易
  const handleTrade = useCallback(async () => {
    const validation = validateTrade();
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setIsTrading(true);
    clearError();

    try {
      const tradeParams: TradeParams = {
        market: selectedAsset,
        side: orderSide,
        size,
        price: orderType === 'limit' ? price : undefined,
        orderType,
        marginMode,
        leverage
      };

      await placeOrder(tradeParams);
      
      toast.success(`${orderSide.toUpperCase()} order placed successfully!`);
      
      // 清空表单
      setSize('');
      setPrice('');
      
      // 切换到订单页面查看
      setActiveTab('orders');
    } catch (error: any) {
      console.error('Trade execution failed:', error);
      toast.error(error.message || 'Trade execution failed');
    } finally {
      setIsTrading(false);
    }
  }, [validateTrade, selectedAsset, orderSide, size, price, orderType, marginMode, leverage, placeOrder, clearError]);

  // 取消订单
  const handleCancelOrder = useCallback(async (orderId: string) => {
    try {
      await cancelOrder(orderId);
      toast.success('Order cancelled successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order');
    }
  }, [cancelOrder]);

  // 平仓
  const handleClosePosition = useCallback(async (positionId: string, size: string) => {
    try {
      await closePosition({ positionId, size });
      toast.success('Position closed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to close position');
    }
  }, [closePosition]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Web3 连接状态 */}
      {!isConnected && (
        <Alert>
          <Wallet className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Connect your wallet to start trading</span>
            <Button onClick={connectWallet} size="sm">
              Connect Wallet
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isConnected && !isValidNetwork && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Wrong network. Please switch to Arbitrum Sepolia</span>
            <Button onClick={switchToValidNetwork} size="sm" variant="outline">
              Switch Network
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {web3Error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{web3Error}</span>
            <Button onClick={clearError} size="sm" variant="ghost">
              <XCircle className="w-4 h-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 主界面标签页 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trade">Trade</TabsTrigger>
          <TabsTrigger value="positions">
            Positions
            {positions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {positions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders">
            Orders
            {orders.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {orders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 交易界面 */}
        <TabsContent value="trade" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 资产选择器 */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Select Asset</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AssetSelector
                    selectedAsset={selectedAsset}
                    onAssetSelect={handleAssetSelect}
                  />
                </CardContent>
              </Card>
            </div>

            {/* 交易表单 */}
            <div className="space-y-4">
              {/* 账户信息 */}
              {isConnected && accountInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Account Balance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted">Available</div>
                        <div className="font-bold text-profit">
                          ${formatNumber(accountInfo.freeMargin)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted">Used</div>
                        <div className="font-bold text-loss">
                          ${formatNumber(accountInfo.usedMargin)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 当前价格 */}
              {priceData && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted">{selectedAsset}</div>
                        <div className="text-xl font-bold">
                          ${formatNumber(priceData.price)}
                        </div>
                      </div>
                      <div className={`text-right ${getPnLColor(priceData.changePercent24h)}`}>
                        <div className="text-sm">24h Change</div>
                        <div className="font-semibold">
                          {formatPercentage(priceData.changePercent24h, { showSign: true })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 多空选择 */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setOrderSide('buy')}
                  variant={orderSide === 'buy' ? 'default' : 'outline'}
                  className={orderSide === 'buy' ? 'bg-profit hover:bg-profit/90' : ''}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  LONG
                </Button>
                <Button
                  onClick={() => setOrderSide('sell')}
                  variant={orderSide === 'sell' ? 'default' : 'outline'}
                  className={orderSide === 'sell' ? 'bg-loss hover:bg-loss/90' : ''}
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  SHORT
                </Button>
              </div>

              {/* 订单类型 */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setOrderType('market')}
                  variant={orderType === 'market' ? 'default' : 'outline'}
                  size="sm"
                >
                  Market
                </Button>
                <Button
                  onClick={() => setOrderType('limit')}
                  variant={orderType === 'limit' ? 'default' : 'outline'}
                  size="sm"
                >
                  Limit
                </Button>
              </div>

              {/* 限价输入 */}
              {orderType === 'limit' && (
                <div>
                  <label className="text-sm text-muted">Limit Price (USDC)</label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={currentPrice.toString()}
                    className="mt-1"
                  />
                </div>
              )}

              {/* 数量输入 */}
              <div>
                <label className="text-sm text-muted">Position Size (USDC)</label>
                <Input
                  type="number"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
                <div className="grid grid-cols-4 gap-1 mt-2">
                  {[25, 50, 75, 100].map((percent) => (
                    <Button
                      key={percent}
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePercentageClick(percent)}
                      className="text-xs"
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* 杠杆设置 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-muted">Leverage</label>
                  <div className={`font-bold ${getLeverageRiskColor(leverage)}`}>
                    {leverage}x
                  </div>
                </div>
                <Slider
                  value={[leverage]}
                  onValueChange={(value) => setLeverage(value[0])}
                  max={100}
                  min={1}
                  step={1}
                  className="mb-2"
                />
                <div className="grid grid-cols-4 gap-1">
                  {[5, 10, 25, 50].map((lev) => (
                    <Button
                      key={lev}
                      variant="ghost"
                      size="sm"
                      onClick={() => setLeverage(lev)}
                      className="text-xs"
                    >
                      {lev}x
                    </Button>
                  ))}
                </div>
              </div>

              {/* 保证金模式 */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setMarginMode('cross')}
                  variant={marginMode === 'cross' ? 'default' : 'outline'}
                  size="sm"
                >
                  Cross
                </Button>
                <Button
                  onClick={() => setMarginMode('isolated')}
                  variant={marginMode === 'isolated' ? 'default' : 'outline'}
                  size="sm"
                >
                  Isolated
                </Button>
              </div>

              {/* 交易预览 */}
              {size && (
                <Card>
                  <CardContent className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Notional Value:</span>
                      <span className="font-medium">
                        ${formatNumber(tradeCalculations.notionalValue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Required Margin:</span>
                      <span className="font-medium text-river-blue">
                        ${formatNumber(tradeCalculations.marginRequired)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Trading Fee:</span>
                      <span className="font-medium text-warning">
                        ${formatNumber(tradeCalculations.tradingFee)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Liquidation Price:</span>
                      <span className="font-medium text-danger">
                        ${formatNumber(tradeCalculations.liquidationPrice)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 交易按钮 */}
              <Button
                onClick={handleTrade}
                disabled={!validateTrade().isValid || isTrading}
                className={`w-full h-12 font-bold ${
                  orderSide === 'buy' 
                    ? 'bg-profit hover:bg-profit/90' 
                    : 'bg-loss hover:bg-loss/90'
                }`}
              >
                {isTrading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : orderSide === 'buy' ? (
                  <TrendingUp className="w-4 h-4 mr-2" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-2" />
                )}
                {isTrading 
                  ? 'Processing...' 
                  : `${orderSide.toUpperCase()} ${selectedAsset.split('-')[0]}`
                }
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* 持仓页面 */}
        <TabsContent value="positions">
          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  No open positions
                </div>
              ) : (
                <div className="space-y-4">
                  {positions.map((position, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">{position.market}</div>
                        <Badge variant={position.side === 'buy' ? 'default' : 'destructive'}>
                          {position.side.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted">Size</div>
                          <div className="font-medium">{position.size}</div>
                        </div>
                        <div>
                          <div className="text-muted">Entry Price</div>
                          <div className="font-medium">${position.entryPrice}</div>
                        </div>
                        <div>
                          <div className="text-muted">PnL</div>
                          <div className={`font-medium ${getPnLColor(position.unrealizedPnl)}`}>
                            ${position.unrealizedPnl}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted">Leverage</div>
                          <div className="font-medium">{position.leverage}x</div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleClosePosition(index.toString(), position.size)}
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                      >
                        Close Position
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 订单页面 */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Open Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  No open orders
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.orderId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">{order.market}</div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={order.side === 'buy' ? 'default' : 'destructive'}>
                            {order.side.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {order.orderType.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted">Size</div>
                          <div className="font-medium">{order.size}</div>
                        </div>
                        <div>
                          <div className="text-muted">Price</div>
                          <div className="font-medium">${order.price}</div>
                        </div>
                        <div>
                          <div className="text-muted">Status</div>
                          <div className="font-medium capitalize">{order.status}</div>
                        </div>
                        <div>
                          <div className="text-muted">Time</div>
                          <div className="font-medium">
                            {new Date(order.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleCancelOrder(order.orderId)}
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                      >
                        Cancel Order
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegratedTradingInterface;