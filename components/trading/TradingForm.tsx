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
import PositionManager from './PositionManager';
import {
  Target, Shield, AlertTriangle, DollarSign, Settings, Plus, Minus,
  TrendingUp, TrendingDown, Wallet, BarChart3
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

const TradingForm = React.memo(function TradingForm({
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
      <div className="bg-gradient-to-br from-surface-2/80 to-surface-3/60 backdrop-blur-sm rounded-xl p-4 space-y-3 border border-default/30 shadow-lg hover:shadow-xl transition-all duration-300">
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
          <div className="bg-surface-1/50 rounded-lg p-3 border border-default/20 hover:border-profit/30 transition-all duration-200">
            <div className="text-secondary text-xs mb-1 font-medium">Available</div>
            <div className="font-bold text-profit text-base">
              ${(accountData.availableBalance || MOCK_ACCOUNT_DATA.AVAILABLE_BALANCE).toLocaleString()}
            </div>
          </div>
          <div className="bg-surface-1/50 rounded-lg p-3 border border-default/20 hover:border-loss/30 transition-all duration-200">
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

      {/* 多空选择 - Enhanced Hyperliquid-Style */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => setOrderSide(TRADING_CONFIG.ORDER_SIDES.BUY)}
          className={`relative h-10 text-sm font-extrabold transition-all duration-300 ease-out overflow-hidden group ${
            orderSide === TRADING_CONFIG.ORDER_SIDES.BUY 
              ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white shadow-[0_8px_32px_rgba(16,185,129,0.4)] border border-emerald-400/50 transform scale-[1.02]' 
              : 'bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400/60 hover:bg-gradient-to-r hover:from-emerald-500/10 hover:via-emerald-500/15 hover:to-emerald-500/10 hover:shadow-[0_4px_16px_rgba(16,185,129,0.2)]'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <span className="relative z-10 flex items-center justify-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            LONG
          </span>
        </Button>
        <Button
          onClick={() => setOrderSide(TRADING_CONFIG.ORDER_SIDES.SELL)}
          className={`relative h-10 text-sm font-extrabold transition-all duration-300 ease-out overflow-hidden group ${
            orderSide === TRADING_CONFIG.ORDER_SIDES.SELL 
              ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white shadow-[0_8px_32px_rgba(239,68,68,0.4)] border border-red-400/50 transform scale-[1.02]' 
              : 'bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2 text-red-400 border border-red-500/30 hover:border-red-400/60 hover:bg-gradient-to-r hover:from-red-500/10 hover:via-red-500/15 hover:to-red-500/10 hover:shadow-[0_4px_16px_rgba(239,68,68,0.2)]'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <span className="relative z-10 flex items-center justify-center gap-1.5">
            <TrendingDown className="w-4 h-4" />
            SHORT
          </span>
        </Button>
      </div>

      {/* 订单类型 - Professional Toggle Style */}
      <div className="bg-surface-2/60 backdrop-blur-sm rounded-lg p-1 border border-default/30">
        <div className="grid grid-cols-2 gap-1">
          <Button
            onClick={() => setOrderType(TRADING_CONFIG.ORDER_TYPES.MARKET)}
            variant="ghost"
            className={`relative h-8 text-xs font-semibold transition-all duration-200 rounded-md ${
              orderType === TRADING_CONFIG.ORDER_TYPES.MARKET 
                ? 'bg-gradient-to-r from-river-blue/90 to-river-blue text-white shadow-[0_4px_12px_rgba(6,182,212,0.3)] border border-river-blue/50' 
                : 'text-secondary hover:text-primary hover:bg-surface-3/50 border border-transparent'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-1">
              <div className={`w-2 h-2 rounded-full ${orderType === TRADING_CONFIG.ORDER_TYPES.MARKET ? 'bg-white' : 'bg-river-blue'} transition-colors duration-200`}></div>
              MARKET
            </span>
          </Button>
          <Button
            onClick={() => setOrderType(TRADING_CONFIG.ORDER_TYPES.LIMIT)}
            variant="ghost"
            className={`relative h-8 text-xs font-semibold transition-all duration-200 rounded-md ${
              orderType === TRADING_CONFIG.ORDER_TYPES.LIMIT 
                ? 'bg-gradient-to-r from-river-blue/90 to-river-blue text-white shadow-[0_4px_12px_rgba(6,182,212,0.3)] border border-river-blue/50' 
                : 'text-secondary hover:text-primary hover:bg-surface-3/50 border border-transparent'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-1">
              <Target className="w-3 h-3" />
              LIMIT
            </span>
          </Button>
        </div>
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
        <div className="text-sm text-secondary mb-2 font-medium flex items-center space-x-2">
          <DollarSign className="w-4 h-4" />
          <span>Size (USDT)</span>
        </div>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="h-10 text-sm bg-surface-2/80 backdrop-blur-sm border-default/50 text-primary focus:border-river-blue focus:ring-2 focus:ring-river-blue/20 transition-all duration-200 rounded-lg font-medium"
        />
        <div className="grid grid-cols-4 gap-2 mt-3">
          {TRADING_CONFIG.PERCENTAGE_OPTIONS.map((percent) => (
            <Button
              key={percent}
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-semibold bg-surface-2/60 border border-default/30 text-secondary hover:text-primary hover:bg-river-blue/10 hover:border-river-blue/40 transition-all duration-200 rounded-lg backdrop-blur-sm hover:scale-105 active:scale-95"
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
              variant="ghost"
              size="sm"
              onClick={() => setLeverage(lev)}
              className={`relative h-8 text-xs font-bold transition-all duration-200 rounded-lg border overflow-hidden group ${
                leverage === lev 
                  ? 'bg-gradient-to-r from-river-blue/90 to-river-blue text-white border-river-blue/50 shadow-[0_4px_16px_rgba(6,182,212,0.3)] scale-105' 
                  : 'bg-surface-2/60 border-default/50 text-secondary hover:bg-river-blue/10 hover:border-river-blue/40 hover:text-primary hover:scale-[1.02]'
              }`}
            >
              {leverage === lev && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
              )}
              <span className="relative z-10">{lev}x</span>
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

      {/* 高级交易选项 - Enhanced Professional Style */}
      <div className="bg-gradient-to-r from-surface-2/60 via-surface-3/40 to-surface-2/60 backdrop-blur-sm rounded-lg p-3 border border-default/30 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-secondary font-semibold flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Advanced Orders</span>
          </span>
          <Badge variant="outline" className="text-xs px-2 py-1 bg-river-blue/10 text-river-blue border-river-blue/30">
            Pro
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 text-xs font-medium bg-surface-3/60 border border-default/40 text-secondary hover:bg-gradient-to-r hover:from-river-blue/10 hover:to-river-blue/5 hover:border-river-blue/40 hover:text-primary transition-all duration-200 rounded-md"
          >
            <Target className="w-3 h-3 mr-1" />
            TP/SL
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 text-xs font-medium bg-surface-3/60 border border-default/40 text-secondary hover:bg-gradient-to-r hover:from-river-blue/10 hover:to-river-blue/5 hover:border-river-blue/40 hover:text-primary transition-all duration-200 rounded-md"
          >
            <Minus className="w-3 h-3 mr-1" />
            Reduce Only
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 text-xs font-medium bg-surface-3/60 border border-default/40 text-secondary hover:bg-gradient-to-r hover:from-river-blue/10 hover:to-river-blue/5 hover:border-river-blue/40 hover:text-primary transition-all duration-200 rounded-md"
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                Positions
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Position Manager</DialogTitle>
                <DialogDescription>
                  Manage your open positions and close them as needed.
                </DialogDescription>
              </DialogHeader>
              <PositionManager />
            </DialogContent>
          </Dialog>
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
                className={`group relative w-full h-14 xl:h-16 font-black text-lg transition-all duration-300 rounded-xl overflow-hidden border-2 backdrop-blur-sm ${
                  orderSide === TRADING_CONFIG.ORDER_SIDES.BUY 
                    ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:via-green-400 hover:to-emerald-500 text-white border-emerald-400/50 shadow-[0_12px_48px_rgba(16,185,129,0.6)] hover:shadow-[0_16px_64px_rgba(16,185,129,0.8)] hover:scale-[1.02] hover:-translate-y-1' 
                    : 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 hover:from-red-400 hover:via-rose-400 hover:to-red-500 text-white border-red-400/50 shadow-[0_12px_48px_rgba(239,68,68,0.6)] hover:shadow-[0_16px_64px_rgba(239,68,68,0.8)] hover:scale-[1.02] hover:-translate-y-1'
                } active:scale-[0.98] active:translate-y-0`}
                disabled={!amount || (orderType === TRADING_CONFIG.ORDER_TYPES.LIMIT && !price)}
              >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out"></div>
                
                {/* Glow Effect */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                  orderSide === TRADING_CONFIG.ORDER_SIDES.BUY 
                    ? 'bg-gradient-to-r from-emerald-400/20 to-green-400/20' 
                    : 'bg-gradient-to-r from-red-400/20 to-rose-400/20'
                } blur-xl`}></div>
                
                <div className="relative z-10 flex items-center justify-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    orderSide === TRADING_CONFIG.ORDER_SIDES.BUY 
                      ? 'bg-emerald-400/20' 
                      : 'bg-red-400/20'
                  }`}>
                    {orderSide === TRADING_CONFIG.ORDER_SIDES.BUY ? (
                      <TrendingUp className="w-6 h-6" />
                    ) : (
                      <TrendingDown className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-lg font-black tracking-wide">
                      {orderSide === TRADING_CONFIG.ORDER_SIDES.BUY ? 'BUY' : 'SELL'} {selectedPair?.baseAsset}
                    </span>
                    {amount && (
                      <span className="text-sm opacity-90 font-medium">
                        ${parseFloat(amount).toLocaleString()} • {leverage}x
                      </span>
                    )}
                  </div>
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
            className={`group relative w-full h-14 xl:h-16 font-black text-lg transition-all duration-300 rounded-xl overflow-hidden border-2 backdrop-blur-sm ${
              !isWalletConnected 
                ? 'bg-gradient-to-r from-river-blue-500 via-river-blue to-river-blue-600 hover:from-river-blue-400 hover:via-river-blue-light hover:to-river-blue-500 text-white border-river-blue/50 shadow-[0_12px_48px_rgba(6,182,212,0.6)] hover:shadow-[0_16px_64px_rgba(6,182,212,0.8)]'
                : orderSide === TRADING_CONFIG.ORDER_SIDES.BUY 
                  ? 'bg-gradient-to-r from-emerald-500/80 via-green-500/80 to-emerald-600/80 hover:from-emerald-500 hover:via-green-500 hover:to-emerald-600 text-white border-emerald-400/30 shadow-[0_12px_48px_rgba(16,185,129,0.4)] hover:shadow-[0_16px_64px_rgba(16,185,129,0.6)]' 
                  : 'bg-gradient-to-r from-red-500/80 via-rose-500/80 to-red-600/80 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white border-red-400/30 shadow-[0_12px_48px_rgba(239,68,68,0.4)] hover:shadow-[0_16px_64px_rgba(239,68,68,0.6)]'
            } hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0`}
            disabled={!amount || (orderType === TRADING_CONFIG.ORDER_TYPES.LIMIT && !price)}
            onClick={handleDemoTrade}
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out"></div>
            
            {/* Demo Badge */}
            {isWalletConnected && (
              <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold">
                DEMO
              </div>
            )}
            
            <div className="relative z-10 flex items-center justify-center space-x-4">
              <div className={`p-2 rounded-lg ${
                !isWalletConnected 
                  ? 'bg-river-blue/20' 
                  : orderSide === TRADING_CONFIG.ORDER_SIDES.BUY 
                    ? 'bg-emerald-400/20' 
                    : 'bg-red-400/20'
              }`}>
                {!isWalletConnected ? (
                  <Wallet className="w-6 h-6" />
                ) : orderSide === TRADING_CONFIG.ORDER_SIDES.BUY ? (
                  <TrendingUp className="w-6 h-6" />
                ) : (
                  <TrendingDown className="w-6 h-6" />
                )}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-lg font-black tracking-wide">
                  {!isWalletConnected 
                    ? 'CONNECT WALLET' 
                    : `${orderSide === TRADING_CONFIG.ORDER_SIDES.BUY ? 'BUY' : 'SELL'} ${selectedPair?.baseAsset}`
                  }
                </span>
                {amount && isWalletConnected && (
                  <span className="text-sm opacity-90 font-medium">
                    ${parseFloat(amount).toLocaleString()} • {leverage}x • DEMO
                  </span>
                )}
              </div>
            </div>
          </Button>
        )}
      </div>
    </div>
  );
});

export default TradingForm;