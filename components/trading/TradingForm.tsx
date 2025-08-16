/**
 * TradingForm - 交易表单组件
 * 从 TradingPage 中拆分出来的独立交易表单
 */

import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import {
  Target, Shield, AlertTriangle, DollarSign, Settings, Plus, Minus,
  TrendingUp, TrendingDown, Wallet
} from 'lucide-react';
import { TRADING_CONFIG, UI_CONFIG, MOCK_ACCOUNT_DATA, TRADING_UTILS } from '../../constants/tradingConstants';
import RealTradingExecutor from '../RealTradingExecutor';

interface TradingFormProps {
  // 交易状态
  orderSide: string;
  setOrderSide: (side: string) => void;
  orderType: string;
  setOrderType: (type: string) => void;
  leverage: number;
  setLeverage: (leverage: number) => void;
  amount: string;
  setAmount: (amount: string) => void;
  price: string;
  setPrice: (price: string) => void;
  
  // 全局状态
  marginMode: string;
  setMarginMode: (mode: string) => void;
  selectedTradingPair: string;
  selectedPair: any;
  
  // 钱包状态
  isWalletConnected: boolean;
  currentChainId: number | null;
  
  // 账户数据
  accountData: any;
  
  // 交易执行
  showTradeDialog: boolean;
  setShowTradeDialog: (show: boolean) => void;
  onTradeComplete: (txHash: string, tradeData: any) => void;
  onTradeError: (error: string) => void;
}

export default function TradingForm({
  orderSide, setOrderSide,
  orderType, setOrderType,
  leverage, setLeverage,
  amount, setAmount,
  price, setPrice,
  marginMode, setMarginMode,
  selectedTradingPair,
  selectedPair,
  isWalletConnected,
  currentChainId,
  accountData,
  showTradeDialog, setShowTradeDialog,
  onTradeComplete,
  onTradeError
}: TradingFormProps) {
  
  // 检查是否可以进行真实交易
  const isReadyForRealTrading = isWalletConnected && 
    currentChainId === 421614 && 
    amount && 
    (orderType === TRADING_CONFIG.ORDER_TYPES.MARKET || price);

  // 处理百分比按钮点击
  const handlePercentageClick = (percent: number) => {
    const balance = accountData.availableBalance || MOCK_ACCOUNT_DATA.AVAILABLE_BALANCE;
    const percentValue = percent / 100;
    setAmount((balance * percentValue).toFixed(2));
  };

  // 处理演示交易
  const handleDemoTrade = () => {
    const orderData = {
      side: orderSide,
      type: orderType,
      amount: parseFloat(amount),
      price: orderType === TRADING_CONFIG.ORDER_TYPES.LIMIT ? parseFloat(price) : selectedPair?.price,
      leverage,
      symbol: selectedTradingPair,
      margin: TRADING_UTILS.calculateRequiredMargin(parseFloat(amount), leverage),
      timestamp: Date.now()
    };
    
    const confirmMessage = `模拟${orderSide === TRADING_CONFIG.ORDER_SIDES.BUY ? '买入' : '卖出'}订单：\n\n` +
      `交易对: ${selectedTradingPair}\n` +
      `数量: ${amount} USDT\n` +
      `价格: ${orderType === TRADING_CONFIG.ORDER_TYPES.MARKET ? '市价' : '$' + price}\n` +
      `杠杆: ${leverage}x\n` +
      `保证金: $${TRADING_UTILS.calculateRequiredMargin(parseFloat(amount), leverage).toLocaleString()}\n` +
      `预计手续费: $${TRADING_UTILS.calculateTradingFee(parseFloat(amount)).toFixed(2)}`;
    
    if (window.confirm(confirmMessage)) {
      alert('模拟订单已提交！连接钱包进行真实交易。');
      setAmount('');
      setPrice('');
    }
  };

  return (
    <div className="flex-1 p-3 xl:p-4 space-y-2 xl:space-y-3 overflow-y-auto">
      {/* 专业账户信息面板 */}
      <div className="bg-gradient-to-br from-surface-2/80 to-surface-3/60 backdrop-blur-sm rounded-lg p-3 xl:p-4 space-y-2 xl:space-y-3 border border-default/30 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-sm text-secondary font-semibold flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span>Account Balance</span>
          </span>
          <Badge 
            variant="outline" 
            className={`text-xs h-6 px-2 flex items-center space-x-1 font-semibold rounded-md transition-all ${
              marginMode === TRADING_CONFIG.MARGIN_MODES.CROSS
                ? 'bg-river-blue/15 text-river-blue border-river-blue/40 shadow-sm'
                : 'bg-loss/15 text-loss border-loss/40 shadow-sm'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>{marginMode === TRADING_CONFIG.MARGIN_MODES.CROSS ? 'Cross' : 'Isolated'}</span>
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-1/50 rounded-md p-2 border border-default/20">
            <div className="text-secondary text-xs mb-1 font-medium">Available</div>
            <div className="font-bold text-profit text-base">
              ${(accountData.availableBalance || MOCK_ACCOUNT_DATA.AVAILABLE_BALANCE).toLocaleString()}
            </div>
          </div>
          <div className="bg-surface-1/50 rounded-md p-2 border border-default/20">
            <div className="text-secondary text-xs mb-1 font-medium">Used</div>
            <div className="font-bold text-loss text-base">
              ${(accountData.usedMargin || MOCK_ACCOUNT_DATA.USED_MARGIN).toLocaleString()}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-default/30">
          <div className="text-center bg-surface-1/30 rounded-md p-2">
            <div className="text-secondary text-xs font-medium">Equity</div>
            <div className="font-bold text-river-blue text-sm">
              ${(accountData.equity || MOCK_ACCOUNT_DATA.EQUITY).toLocaleString()}
            </div>
          </div>
          <div className="text-center bg-surface-1/30 rounded-md p-2">
            <div className="text-secondary text-xs font-medium">Free</div>
            <div className="font-bold text-primary text-sm">
              ${((accountData.availableBalance || MOCK_ACCOUNT_DATA.AVAILABLE_BALANCE) - 
                 (accountData.usedMargin || MOCK_ACCOUNT_DATA.USED_MARGIN)).toLocaleString()}
            </div>
          </div>
          <div className="text-center bg-surface-1/30 rounded-md p-2">
            <div className="text-secondary text-xs font-medium">Level</div>
            <div className={`font-bold text-sm ${
              (accountData.marginLevel || MOCK_ACCOUNT_DATA.MARGIN_LEVEL) > 200 ? 'text-profit' : 
              (accountData.marginLevel || MOCK_ACCOUNT_DATA.MARGIN_LEVEL) > 100 ? 'text-loss' : 'text-danger'
            }`}>
              {(accountData.marginLevel || MOCK_ACCOUNT_DATA.MARGIN_LEVEL).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* 多空选择 */}
      <div className="grid grid-cols-2 gap-1">
        <Button
          onClick={() => setOrderSide(TRADING_CONFIG.ORDER_SIDES.BUY)}
          className={`h-7 text-xs font-bold transition-all ${
            orderSide === TRADING_CONFIG.ORDER_SIDES.BUY 
              ? 'bg-profit text-primary shadow-sm' 
              : 'bg-surface-2 text-profit hover:bg-profit/20'
          }`}
        >
          Long
        </Button>
        <Button
          onClick={() => setOrderSide(TRADING_CONFIG.ORDER_SIDES.SELL)}
          className={`h-7 text-xs font-bold transition-all ${
            orderSide === TRADING_CONFIG.ORDER_SIDES.SELL 
              ? 'bg-danger text-primary shadow-sm' 
              : 'bg-surface-2 text-danger hover:bg-danger/20'
          }`}
        >
          Short
        </Button>
      </div>

      {/* 订单类型 */}
      <div className="grid grid-cols-2 gap-1">
        <Button
          onClick={() => setOrderType(TRADING_CONFIG.ORDER_TYPES.MARKET)}
          variant="outline"
          className={`h-6 text-xs transition-all ${
            orderType === TRADING_CONFIG.ORDER_TYPES.MARKET 
              ? 'bg-river-blue text-primary border-river-blue shadow-sm' 
              : 'bg-surface-2 text-muted border-default'
          }`}
        >
          Market
        </Button>
        <Button
          onClick={() => setOrderType(TRADING_CONFIG.ORDER_TYPES.LIMIT)}
          variant="outline"
          className={`h-6 text-xs transition-all ${
            orderType === TRADING_CONFIG.ORDER_TYPES.LIMIT 
              ? 'bg-river-blue text-primary border-river-blue shadow-sm' 
              : 'bg-surface-2 text-muted border-default'
          }`}
        >
          Limit
        </Button>
      </div>

      {/* 限价输入 */}
      {orderType === TRADING_CONFIG.ORDER_TYPES.LIMIT && (
        <div>
          <div className="text-sm text-secondary mb-2 font-medium flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Limit Price (USDT)</span>
          </div>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={selectedPair?.price?.toString() || '0'}
            className="h-10 text-sm bg-surface-2/80 backdrop-blur-sm border-default/50 text-primary focus:border-river-blue focus:ring-2 focus:ring-river-blue/20 transition-all duration-200 rounded-lg font-medium"
          />
        </div>
      )}

      {/* 数量输入 */}
      <div>
        <div className="text-xs text-muted mb-1">Size (USDT)</div>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="h-7 text-xs bg-surface-2 border-default text-primary focus:border-river-blue transition-colors"
        />
        <div className="grid grid-cols-4 gap-1 mt-1">
          {TRADING_CONFIG.PERCENTAGE_OPTIONS.map((percent) => (
            <Button
              key={percent}
              variant="outline"
              size="sm"
              className="h-5 text-xs bg-surface-2 border-default text-muted hover:bg-surface-3 transition-colors"
              onClick={() => handlePercentageClick(percent)}
            >
              {percent}%
            </Button>
          ))}
        </div>
      </div>

      {/* 杠杆选择 */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-secondary font-medium flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Leverage</span>
          </span>
          <div className="flex items-center space-x-2 bg-surface-2/60 px-2 py-1 rounded-md border border-default/30">
            <span className={`text-base font-bold ${TRADING_UTILS.getRiskColor(leverage)}`}>
              {leverage}x
            </span>
            <div className={`w-2 h-2 rounded-full ${
              leverage <= 10 ? 'bg-profit' :
              leverage <= 50 ? 'bg-loss' :
              'bg-danger'
            } animate-pulse`}></div>
          </div>
        </div>
        
        <div className="mb-3">
          <Slider
            value={[leverage]}
            onValueChange={(value) => setLeverage(value[0])}
            max={TRADING_CONFIG.MAX_LEVERAGE}
            min={TRADING_CONFIG.MIN_LEVERAGE}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>1x</span>
            <span>25x</span>
            <span>50x</span>
            <span>100x</span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mb-3">
          {TRADING_CONFIG.LEVERAGE_STEPS.map((lev) => (
            <Button
              key={lev}
              variant="outline"
              size="sm"
              onClick={() => setLeverage(lev)}
              className={`h-7 text-xs font-medium transition-all duration-200 rounded-md border ${
                leverage === lev 
                  ? 'bg-river-blue/20 text-river-blue border-river-blue/50 shadow-md' 
                  : 'bg-surface-2/60 border-default/50 text-secondary hover:bg-surface-3 hover:border-river-blue/30'
              }`}
            >
              {lev}x
            </Button>
          ))}
        </div>
      </div>

      {/* 风险预览 */}
      {amount && (
        <div className="bg-gradient-to-br from-surface-2/80 to-surface-3/60 backdrop-blur-sm rounded-lg p-3 space-y-2 text-sm border border-default/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-secondary font-medium flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span>Required Margin:</span>
            </span>
            <span className="font-bold text-river-blue">
              ${TRADING_UTILS.calculateRequiredMargin(parseFloat(amount), leverage).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-secondary font-medium flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Liquidation Price:</span>
            </span>
            <span className="font-bold text-danger">
              ${TRADING_UTILS.calculateLiquidationPrice(
                selectedPair?.price || 45000,
                leverage,
                orderSide === TRADING_CONFIG.ORDER_SIDES.BUY
              ).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-secondary font-medium flex items-center space-x-1">
              <DollarSign className="w-3 h-3" />
              <span>Trading Fee:</span>
            </span>
            <span className="font-bold text-loss">
              ${TRADING_UTILS.calculateTradingFee(parseFloat(amount)).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* 高级交易选项 */}
      <div className="flex items-center justify-between bg-surface-2/50 rounded-lg p-2 border border-default/30">
        <span className="text-sm text-secondary font-medium flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span>Advanced Orders</span>
        </span>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" className="h-6 text-xs bg-surface-3/60 border-default/50 text-secondary hover:bg-surface-2 hover:text-primary transition-all">
            TP/SL
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-xs bg-surface-3/60 border-default/50 text-secondary hover:bg-surface-2 hover:text-primary transition-all">
            Reduce Only
          </Button>
        </div>
      </div>

      {/* 交易执行区域 */}
      <div className="p-4 xl:p-5 border-t border-default/50 bg-gradient-to-t from-surface-1 to-surface-0 backdrop-blur-sm">
        {/* 连接状态提示 */}
        {!isWalletConnected && (
          <Alert className="mb-4 bg-surface-2/50 border-river-blue/30 backdrop-blur-sm">
            <Wallet className="h-4 w-4 text-river-blue" />
            <AlertDescription className="text-sm text-secondary font-medium">
              Connect your wallet to start real trading
            </AlertDescription>
          </Alert>
        )}
        
        {isWalletConnected && currentChainId !== 421614 && (
          <Alert className="mb-4 bg-surface-2/50 border-danger/30 backdrop-blur-sm">
            <AlertTriangle className="h-4 w-4 text-danger" />
            <AlertDescription className="text-sm text-secondary font-medium">
              Switch to Arbitrum Sepolia network for trading
            </AlertDescription>
          </Alert>
        )}
        
        {/* 交易按钮 */}
        {isReadyForRealTrading ? (
          <Dialog open={showTradeDialog} onOpenChange={setShowTradeDialog}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                className={`w-full h-12 xl:h-14 font-bold text-base transition-all duration-200 rounded-lg shadow-lg border-2 ${
                  orderSide === TRADING_CONFIG.ORDER_SIDES.BUY 
                    ? 'bg-profit hover:bg-profit/90 text-primary border-profit/30 hover:shadow-profit/20' 
                    : 'bg-danger hover:bg-danger/90 text-primary border-danger/30 hover:shadow-danger/20'
                }`}
                disabled={!amount || (orderType === TRADING_CONFIG.ORDER_TYPES.LIMIT && !price)}
              >
                <div className="flex items-center justify-center space-x-3">
                  {orderSide === TRADING_CONFIG.ORDER_SIDES.BUY ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                  <span>{orderSide === TRADING_CONFIG.ORDER_SIDES.BUY ? 'Buy' : 'Sell'} {selectedPair?.baseAsset}</span>
                  {amount && <span className="text-sm opacity-90 bg-black/20 px-2 py-1 rounded">(${parseFloat(amount).toLocaleString()})</span>}
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Execute Real Trade</DialogTitle>
                <DialogDescription>
                  This will execute a real trade on Arbitrum Sepolia testnet.
                </DialogDescription>
              </DialogHeader>
              <RealTradingExecutor
                symbol={selectedTradingPair}
                side={orderSide as 'buy' | 'sell'}
                type={orderType as 'market' | 'limit'}
                amount={amount}
                price={price}
                leverage={leverage}
                marginMode={marginMode as 'cross' | 'isolated'}
                onTradeComplete={onTradeComplete}
                onError={onTradeError}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <Button 
            size="lg" 
            className={`w-full h-12 xl:h-14 font-bold text-base transition-all duration-200 rounded-lg shadow-lg border-2 ${
              orderSide === TRADING_CONFIG.ORDER_SIDES.BUY 
                ? 'bg-profit hover:bg-profit/90 text-primary border-profit/30 hover:shadow-profit/20' 
                : 'bg-danger hover:bg-danger/90 text-primary border-danger/30 hover:shadow-danger/20'
            }`}
            disabled={!amount || (orderType === TRADING_CONFIG.ORDER_TYPES.LIMIT && !price)}
            onClick={handleDemoTrade}
          >
            <div className="flex items-center justify-center space-x-3">
              {!isWalletConnected ? (
                <Wallet className="w-5 h-5" />
              ) : orderSide === TRADING_CONFIG.ORDER_SIDES.BUY ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span>{!isWalletConnected ? 'Connect Wallet' : 'Demo'} {orderSide === TRADING_CONFIG.ORDER_SIDES.BUY ? 'Buy' : 'Sell'}</span>
              {amount && <span className="text-sm opacity-90 bg-black/20 px-2 py-1 rounded">(${parseFloat(amount).toLocaleString()})</span>}
            </div>
          </Button>
        )}
      </div>
    </div>
  );
}