import React, { useState, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, Zap, Brain, X, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import TradingAssistantChat from '../trading-assistant/TradingAssistantChat';

interface OptimizedTradingFormProps {
  selectedPair: string;
  currentPrice: number;
  isConnected: boolean;
  onTrade?: (tradeData: any) => void;
  className?: string;
  // 支持从订单簿传入初始值
  initialPrice?: string;
  initialAmount?: string;
  initialSide?: 'buy' | 'sell';
}

const OptimizedTradingForm: React.FC<OptimizedTradingFormProps> = ({
  selectedPair,
  currentPrice,
  isConnected,
  onTrade,
  className = '',
  initialPrice,
  initialAmount,
  initialSide
}) => {
  // 交易状态 - 支持初始值
  const [side, setSide] = useState<'buy' | 'sell'>(initialSide || 'buy');
  const [orderType, setOrderType] = useState('market');
  const [amount, setAmount] = useState(initialAmount || '');
  const [price, setPrice] = useState(initialPrice || '');
  const [leverage, setLeverage] = useState(10);
  const [quickTP, setQuickTP] = useState('');
  const [quickSL, setQuickSL] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  
  // SOTA微交互状态管理
  const [formAnimations, setFormAnimations] = useState({
    sideSwitch: false,
    leverageChange: false,
    orderSubmit: false,
    riskWarning: false,
    successCelebration: false
  });
  const [inputFocusStates, setInputFocusStates] = useState({
    amount: false,
    price: false,
    tp: false,
    sl: false
  });
  const [hoverStates, setHoverStates] = useState({
    buyButton: false,
    sellButton: false,
    leverageSlider: false
  });
  
  // 监听从订单簿传入的数据变化
  React.useEffect(() => {
    if (initialPrice) setPrice(initialPrice);
  }, [initialPrice]);
  
  React.useEffect(() => {
    if (initialAmount) setAmount(initialAmount);
  }, [initialAmount]);
  
  React.useEffect(() => {
    if (initialSide) setSide(initialSide);
  }, [initialSide]);

  // 风险等级计算
  const riskLevel = useMemo(() => {
    if (leverage <= 5) return { text: 'Low', color: 'text-green-400' };
    if (leverage <= 20) return { text: 'Medium', color: 'text-yellow-400' };
    if (leverage <= 50) return { text: 'High', color: 'text-orange-400' };
    return { text: 'Extreme', color: 'text-red-400' };
  }, [leverage]);

  // 清算价格计算
  const liquidationPrice = useMemo(() => {
    const marketPrice = currentPrice;
    const entryPrice = orderType === 'market' ? marketPrice : (parseFloat(price) || marketPrice);
    const usdtAmount = parseFloat(amount) || 0;
    if (!usdtAmount || !leverage) return 0;
    
    const liqDistance = entryPrice / leverage;
    return side === 'buy' ? entryPrice - liqDistance : entryPrice + liqDistance;
  }, [amount, leverage, currentPrice, orderType, price, side]);

  // 格式化价格
  const formatUSD = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(value);
  }, []);

  // 增强的快捷金额处理，带有微交互反馈
  const handleQuickAmount = useCallback((percentage: number) => {
    const mockBalance = 10000; // 模拟余额
    const quickAmount = (mockBalance * percentage / 100).toFixed(2);
    setAmount(quickAmount);
    
    // 触发微交互动画
    setFormAnimations(prev => ({ ...prev, sideSwitch: true }));
    setTimeout(() => {
      setFormAnimations(prev => ({ ...prev, sideSwitch: false }));
    }, 300);
  }, []);

  // 增强的交易提交处理，带有完整的微交互反馈
  const handleTrade = useCallback(() => {
    if (!isConnected) return;
    
    // 风险检查和警告动画
    const amountValue = parseFloat(amount) || 0;
    const isHighRisk = leverage > 20 || amountValue > 50000;
    
    if (isHighRisk) {
      setFormAnimations(prev => ({ ...prev, riskWarning: true }));
      setTimeout(() => {
        setFormAnimations(prev => ({ ...prev, riskWarning: false }));
      }, 800);
    }
    
    // 订单提交动画
    setFormAnimations(prev => ({ ...prev, orderSubmit: true }));
    
    const tradeData = {
      side,
      orderType,
      amount: amountValue,
      price: orderType === 'limit' ? parseFloat(price) : currentPrice,
      leverage,
      quickTP: quickTP ? parseFloat(quickTP) : undefined,
      quickSL: quickSL ? parseFloat(quickSL) : undefined
    };
    
    // 模拟订单处理延迟
    setTimeout(() => {
      setFormAnimations(prev => ({ ...prev, orderSubmit: false, successCelebration: true }));
      onTrade?.(tradeData);
      
      // 成功庆祝动画
      setTimeout(() => {
        setFormAnimations(prev => ({ ...prev, successCelebration: false }));
      }, 1200);
    }, 500);
  }, [side, orderType, amount, price, currentPrice, leverage, quickTP, quickSL, isConnected, onTrade]);

  return (
    <div className={`space-y-3 ${className}`}>
      {showAIChat ? (
        // AI 聊天界面
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Brain className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="text-lg font-bold text-white">AI Trading Assistant</h3>
                <p className="text-sm text-gray-400">Intelligent Trading Guidance</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowAIChat(false)}
              className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex-1 min-h-0">
            <TradingAssistantChat
              isConnected={isConnected}
              accountBalance={125340.56}
              className="h-full"
              selectedTradingPair={selectedPair}
              currentPrice={currentPrice}
              onPlanExecute={async (plan) => {
                console.log('执行交易计划:', plan);
              }}
              onPlanBookmark={(planId) => {
                console.log('收藏计划:', planId);
              }}
              onPlanShare={(plan) => {
                console.log('分享计划:', plan);
              }}
            />
          </div>
        </div>
      ) : (
        // 交易表单
        <>
          {/* 交易头部 */}
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <h3 className="text-xl font-bold text-white">Trade {selectedPair.split('/')[0]}</h3>
              <p className="text-sm text-gray-400">Professional Order Entry</p>
            </div>
            <div className="flex items-center space-x-2 bg-slate-800/50 rounded-xl p-1 border border-slate-700">
              <Button 
                size="sm" 
                variant={side === 'buy' ? 'default' : 'ghost'}
                onClick={() => {
                  setSide('buy');
                  setFormAnimations(prev => ({ ...prev, sideSwitch: true }));
                  setTimeout(() => setFormAnimations(prev => ({ ...prev, sideSwitch: false })), 300);
                }}
                onMouseEnter={() => setHoverStates(prev => ({ ...prev, buyButton: true }))}
                onMouseLeave={() => setHoverStates(prev => ({ ...prev, buyButton: false }))}
                className={`btn-buy-micro micro-active-press px-4 py-2.5 rounded-lg font-semibold flex-1 ${
                  side === 'buy' 
                    ? 'text-white shadow-lg shadow-green-600/30' 
                    : 'text-green-400 hover:bg-green-400/10'
                } ${formAnimations.sideSwitch && side === 'buy' ? 'success-celebration-micro' : ''}`}
              >
                BUY
              </Button>
              <Button 
                size="sm" 
                variant={side === 'sell' ? 'default' : 'ghost'}
                onClick={() => {
                  setSide('sell');
                  setFormAnimations(prev => ({ ...prev, sideSwitch: true }));
                  setTimeout(() => setFormAnimations(prev => ({ ...prev, sideSwitch: false })), 300);
                }}
                onMouseEnter={() => setHoverStates(prev => ({ ...prev, sellButton: true }))}
                onMouseLeave={() => setHoverStates(prev => ({ ...prev, sellButton: false }))}
                className={`btn-sell-micro micro-active-press px-4 py-2.5 rounded-lg font-semibold flex-1 ${
                  side === 'sell' 
                    ? 'text-white shadow-lg shadow-red-600/30' 
                    : 'text-red-400 hover:bg-red-400/10'
                } ${formAnimations.sideSwitch && side === 'sell' ? 'success-celebration-micro' : ''}`}
              >
                SELL
              </Button>
              <Button 
                size="sm" 
                variant={showAIChat ? "default" : "ghost"}
                onClick={() => setShowAIChat(!showAIChat)}
                className={`px-3 py-2.5 rounded-lg font-medium ${
                  showAIChat 
                    ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30' 
                    : 'text-purple-400 hover:bg-purple-400/10 hover:text-purple-300 border border-purple-400/30'
                }`}
                title="Toggle AI Trading Assistant"
              >
                <Brain className="w-4 h-4" />
                {showAIChat && <span className="ml-1 text-xs">AI</span>}
              </Button>
            </div>
          </div>

          {/* 杠杆设置 */}
          <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-300">Leverage</label>
              <span className={`text-sm font-bold px-2 py-1 rounded-lg ${riskLevel.color} bg-slate-800/60`}>
                {leverage}x ({riskLevel.text})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[10, 25, 50].map(lev => (
                <Button 
                  key={lev}
                  size="sm" 
                  variant={leverage === lev ? 'default' : 'outline'} 
                  onClick={() => setLeverage(lev)} 
                  className={`font-semibold transition-all duration-200 ${
                    leverage === lev 
                      ? lev <= 10 ? 'bg-blue-600 text-white' : 
                        lev <= 25 ? 'bg-orange-600 text-white' : 'bg-red-600 text-white'
                      : 'border-slate-600 text-slate-300 hover:border-blue-400'
                  }`}
                >
                  {lev}x
                </Button>
              ))}
            </div>
          </div>

          {/* 订单类型 */}
          <div>
            <label className="text-xs text-gray-400 mb-0.5 block">Order Type</label>
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant={orderType === 'market' ? 'default' : 'outline'}
                onClick={() => setOrderType('market')}
                className="flex-1 text-xs py-1"
              >
                Market
              </Button>
              <Button
                size="sm"
                variant={orderType === 'limit' ? 'default' : 'outline'}
                onClick={() => setOrderType('limit')}
                className="flex-1 text-xs py-1"
              >
                Limit
              </Button>
            </div>
          </div>

          {/* 限价单价格 */}
          {orderType === 'limit' && (
            <div>
              <label className="text-xs text-gray-400 mb-0.5 block">Price (USDT)</label>
              <Input
                value={price || currentPrice.toString()}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={`Market: $${currentPrice.toLocaleString()}`}
                className="bg-slate-800/50 border-slate-600 font-mono text-sm h-7"
              />
            </div>
          )}

          {/* 数量输入 - 增强微交互 */}
          <div className={`input-micro ${inputFocusStates.amount ? 'focused' : ''}`}>
            <label className="text-xs text-gray-400 mb-0.5 block">Amount (USDT)</label>
            <div className="relative">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onFocus={() => setInputFocusStates(prev => ({ ...prev, amount: true }))}
                onBlur={() => setInputFocusStates(prev => ({ ...prev, amount: false }))}
                placeholder="0.00"
                className={`bg-slate-800/50 border-slate-600 font-mono text-sm h-7 pr-16 micro-interactive-precise ${
                  formAnimations.orderSubmit ? 'pulse-loading-micro' : ''
                }`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                ≈ {((parseFloat(amount) || 0) / currentPrice).toFixed(6)} {selectedPair.split('/')[0]}
              </div>
            </div>
          </div>

          {/* 快捷金额按钮 - 增强微交互 */}
          <div className="grid grid-cols-4 gap-1">
            {[25, 50, 75, 100].map(percent => (
              <Button 
                key={percent}
                size="sm" 
                variant="outline" 
                onClick={() => handleQuickAmount(percent)}
                className="btn-micro-trading micro-hover-scale micro-active-press text-xs py-1"
              >
                {percent}%
              </Button>
            ))}
          </div>

          {/* TP/SL 设置 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Take Profit / Stop Loss</label>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-river-surface hover:text-white"
              >
                {showAdvanced ? 'Simple' : 'Advanced'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Input
                value={quickTP}
                onChange={(e) => setQuickTP(e.target.value)}
                placeholder="Take Profit"
                className="bg-slate-800/50 border-green-600/30 text-xs font-mono h-7"
              />
              <Input
                value={quickSL}
                onChange={(e) => setQuickSL(e.target.value)}
                placeholder="Stop Loss"
                className="bg-slate-800/50 border-red-600/30 text-xs font-mono h-7"
              />
            </div>
          </div>

          {/* 杠杆滑块 */}
          <div>
            <input
              type="range"
              min="1"
              max="100"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1x</span>
              <span>25x</span>
              <span>50x</span>
              <span>100x</span>
            </div>
          </div>

          {/* 风险显示 */}
          <div className={`mt-2 p-2 rounded-lg border ${
            leverage <= 5 ? 'bg-green-900/20 border-green-600/30' :
            leverage <= 20 ? 'bg-yellow-900/20 border-yellow-600/30' :
            leverage <= 50 ? 'bg-orange-900/20 border-orange-600/30' :
            'bg-red-900/20 border-red-600/30'
          }`}>
            <div className="flex justify-between text-xs">
              <span className="text-gray-300">Liquidation: ${liquidationPrice.toFixed(2)}</span>
              <span className="text-gray-300">Margin: {((parseFloat(amount) || 0) / leverage).toFixed(0)} USDT</span>
            </div>
          </div>

          {/* 交易按钮 - SOTA微交互系统 */}
          <Button 
            onClick={handleTrade}
            className={`w-full h-12 text-lg font-bold tracking-wide border-0 rounded-xl ${
              side === 'buy' ? 'btn-buy-micro' : 'btn-sell-micro'
            } micro-active-press ripple-micro ${
              formAnimations.orderSubmit ? 'pulse-loading-micro' : ''
            } ${
              formAnimations.successCelebration ? 'success-celebration-micro' : ''
            } ${
              formAnimations.riskWarning ? 'error-shake-micro' : ''
            }`}
            disabled={!isConnected || formAnimations.orderSubmit}
          >
            {formAnimations.orderSubmit ? (
              <>
                <div className="spinner-micro w-5 h-5 mr-3 border-2 border-white border-t-transparent rounded-full"></div>
                Processing...
              </>
            ) : formAnimations.successCelebration ? (
              <>
                <CheckCircle className="w-5 h-5 mr-3" />
                Success!
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-3" />
                {side.toUpperCase()} {selectedPair.split('/')[0]}
              </>
            )}
          </Button>
          
          {/* 交易摘要 */}
          <div className="mt-2 p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Size:</span>
              <span className="font-mono text-white">{formatUSD(parseFloat(amount) || 0)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Est. {selectedPair.split('/')[0]}:</span>
              <span className="font-mono text-white">{((parseFloat(amount) || 0) / currentPrice).toFixed(6)} {selectedPair.split('/')[0]}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Liquidation:</span>
              <span className="font-mono text-orange-400">${liquidationPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Margin Req:</span>
              <span className="font-mono text-gray-300">{formatUSD((parseFloat(amount) || 0) / leverage)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Trading Fee:</span>
              <span className="font-mono text-gray-300">{formatUSD((parseFloat(amount) || 0) * 0.0005)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OptimizedTradingForm;