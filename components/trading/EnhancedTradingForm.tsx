import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { cn } from '../ui/utils';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Calculator, 
  Target,
  AlertTriangle,
  Percent,
  DollarSign,
  Settings,
  Lightbulb,
  Eye,
  EyeOff
} from 'lucide-react';

interface TradingFormData {
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  amount: string;
  price: string;
  stopLoss: string;
  takeProfit: string;
  leverage: number;
  marginMode: 'cross' | 'isolated';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  reduceOnly: boolean;
  postOnly: boolean;
}

interface RiskMetrics {
  liquidationPrice: number;
  margin: number;
  pnlBreakeven: number;
  maxLoss: number;
  maxGain: number;
  riskRewardRatio: number;
  marginUtilization: number;
  entrySlippage: number;
}

interface TradingFormProps {
  symbol: string;
  currentPrice: number;
  balance: number;
  availableMargin: number;
  onSubmit: (data: TradingFormData) => Promise<void>;
  onPriceFromOrderBook?: (price: number) => void;
  isLoading?: boolean;
  theme?: 'river' | 'professional';
  className?: string;
}

const EnhancedTradingForm: React.FC<TradingFormProps> = ({
  symbol,
  currentPrice,
  balance,
  availableMargin,
  onSubmit,
  onPriceFromOrderBook,
  isLoading = false,
  theme = 'river',
  className
}) => {
  const [formData, setFormData] = useState<TradingFormData>({
    side: 'buy',
    orderType: 'market',
    amount: '',
    price: '',
    stopLoss: '',
    takeProfit: '',
    leverage: 10,
    marginMode: 'cross',
    timeInForce: 'GTC',
    reduceOnly: false,
    postOnly: false
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRiskAnalysis, setShowRiskAnalysis] = useState(true);
  const [quickAmountPercent, setQuickAmountPercent] = useState<number>(0);
  const [riskRewardRatio, setRiskRewardRatio] = useState<string>('1:2');
  const [autoCalculate, setAutoCalculate] = useState(true);

  // 智能风险计算
  const riskMetrics = useMemo<RiskMetrics>(() => {
    const amount = parseFloat(formData.amount) || 0;
    const price = formData.orderType === 'market' ? currentPrice : (parseFloat(formData.price) || currentPrice);
    const stopLoss = parseFloat(formData.stopLoss) || 0;
    const takeProfit = parseFloat(formData.takeProfit) || 0;
    const leverage = formData.leverage;

    if (amount === 0) {
      return {
        liquidationPrice: 0,
        margin: 0,
        pnlBreakeven: 0,
        maxLoss: 0,
        maxGain: 0,
        riskRewardRatio: 0,
        marginUtilization: 0,
        entrySlippage: 0
      };
    }

    const notionalValue = amount * price;
    const margin = notionalValue / leverage;
    const liquidationDistance = price / leverage;
    const liquidationPrice = formData.side === 'buy' 
      ? price - liquidationDistance 
      : price + liquidationDistance;

    const maxLoss = stopLoss > 0 
      ? Math.abs((price - stopLoss) * amount)
      : margin * 0.8; // 80% of margin if no stop loss

    const maxGain = takeProfit > 0 
      ? Math.abs((takeProfit - price) * amount)
      : maxLoss * 2; // Default 1:2 ratio

    const riskReward = maxLoss > 0 ? maxGain / maxLoss : 0;
    const marginUtilization = (margin / availableMargin) * 100;
    const entrySlippage = Math.abs(currentPrice - price) / currentPrice * 100;

    return {
      liquidationPrice,
      margin,
      pnlBreakeven: price,
      maxLoss,
      maxGain,
      riskRewardRatio: riskReward,
      marginUtilization,
      entrySlippage
    };
  }, [formData, currentPrice, availableMargin]);

  // 自动计算止盈止损
  const calculateTPSL = useCallback((entryPrice: number, ratio: string) => {
    const [risk, reward] = ratio.split(':').map(Number);
    const stopDistance = entryPrice * 0.02; // 2% default risk
    const profitDistance = stopDistance * (reward / risk);

    const newStopLoss = formData.side === 'buy' 
      ? entryPrice - stopDistance 
      : entryPrice + stopDistance;
    
    const newTakeProfit = formData.side === 'buy' 
      ? entryPrice + profitDistance 
      : entryPrice - profitDistance;

    return {
      stopLoss: newStopLoss.toFixed(2),
      takeProfit: newTakeProfit.toFixed(2)
    };
  }, [formData.side]);

  // 快速金额设置
  const setQuickAmount = useCallback((percent: number) => {
    const maxAmount = (availableMargin * formData.leverage) / currentPrice;
    const amount = (maxAmount * percent / 100).toFixed(6);
    setFormData(prev => ({ ...prev, amount }));
    setQuickAmountPercent(percent);
  }, [availableMargin, formData.leverage, currentPrice]);

  // 自动风险调整
  const optimizeLeverage = useCallback(() => {
    const targetRisk = 0.02; // 2% account risk
    const optimalLeverage = Math.min(50, Math.max(1, balance * targetRisk / riskMetrics.maxLoss));
    setFormData(prev => ({ ...prev, leverage: Math.round(optimalLeverage) }));
  }, [balance, riskMetrics.maxLoss]);

  // 监听价格变化，自动更新计算
  useEffect(() => {
    if (autoCalculate && formData.price) {
      const entryPrice = parseFloat(formData.price);
      const { stopLoss, takeProfit } = calculateTPSL(entryPrice, riskRewardRatio);
      setFormData(prev => ({ ...prev, stopLoss, takeProfit }));
    }
  }, [formData.price, riskRewardRatio, autoCalculate, calculateTPSL]);

  // 表单验证
  const validation = useMemo(() => {
    const errors: string[] = [];
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (formData.orderType === 'limit' && (!formData.price || parseFloat(formData.price) <= 0)) {
      errors.push('Price is required for limit orders');
    }
    
    if (riskMetrics.margin > availableMargin) {
      errors.push('Insufficient margin available');
    }
    
    if (riskMetrics.marginUtilization > 90) {
      errors.push('High margin utilization risk');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [formData, riskMetrics, availableMargin]);

  // 提交处理
  const handleSubmit = async () => {
    if (validation.isValid) {
      await onSubmit(formData);
    }
  };

  // 风险等级颜色
  const getRiskColor = (level: number) => {
    if (level < 0.3) return 'text-green-400';
    if (level < 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  const containerClasses = cn(
    'enhanced-trading-form',
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
      {/* 表单头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Trade {symbol}</h3>
          <p className="text-sm text-slate-400">Professional Order Entry</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowRiskAnalysis(!showRiskAnalysis)}
            className="text-slate-400 hover:text-white"
          >
            {showRiskAnalysis ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-slate-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 买卖切换 */}
      <div className="flex items-center space-x-1 bg-slate-800/50 rounded-xl p-1">
        <Button
          variant={formData.side === 'buy' ? 'default' : 'ghost'}
          onClick={() => setFormData(prev => ({ ...prev, side: 'buy' }))}
          className={cn(
            'flex-1 font-semibold transition-all',
            formData.side === 'buy' 
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30'
              : 'text-green-400 hover:bg-green-400/10'
          )}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          BUY
        </Button>
        <Button
          variant={formData.side === 'sell' ? 'default' : 'ghost'}
          onClick={() => setFormData(prev => ({ ...prev, side: 'sell' }))}
          className={cn(
            'flex-1 font-semibold transition-all',
            formData.side === 'sell' 
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
              : 'text-red-400 hover:bg-red-400/10'
          )}
        >
          <TrendingDown className="w-4 h-4 mr-2" />
          SELL
        </Button>
      </div>

      {/* 订单类型 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Order Type</label>
        <div className="flex space-x-1">
          {['market', 'limit', 'stop', 'stop_limit'].map(type => (
            <Button
              key={type}
              size="sm"
              variant={formData.orderType === type ? 'default' : 'outline'}
              onClick={() => setFormData(prev => ({ ...prev, orderType: type as any }))}
              className="flex-1 text-xs font-medium"
            >
              {type.replace('_', ' ').toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* 价格输入 */}
      {formData.orderType !== 'market' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Price (USDT)</label>
          <div className="relative">
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder={currentPrice.toFixed(2)}
              className="pr-16 font-mono"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFormData(prev => ({ ...prev, price: currentPrice.toFixed(2) }))}
              className="absolute right-1 top-1 h-8 px-2 text-xs text-slate-400 hover:text-white"
            >
              Market
            </Button>
          </div>
        </div>
      )}

      {/* 数量输入 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Amount ({symbol.split('/')[0]})</label>
          <span className="text-xs text-slate-500">
            ≈ ${((parseFloat(formData.amount) || 0) * currentPrice).toFixed(2)}
          </span>
        </div>
        
        <Input
          type="number"
          value={formData.amount}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, amount: e.target.value }));
            setQuickAmountPercent(0);
          }}
          placeholder="0.00"
          className="font-mono"
        />
        
        {/* 快速金额按钮 */}
        <div className="flex space-x-1">
          {[25, 50, 75, 100].map(percent => (
            <Button
              key={percent}
              size="sm"
              variant={quickAmountPercent === percent ? 'default' : 'outline'}
              onClick={() => setQuickAmount(percent)}
              className="flex-1 text-xs"
            >
              {percent}%
            </Button>
          ))}
        </div>
      </div>

      {/* 杠杆设置 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Leverage</label>
          <div className="flex items-center space-x-2">
            <span className={cn('text-sm font-bold', getRiskColor(formData.leverage / 100))}>
              {formData.leverage}x
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={optimizeLeverage}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              <Calculator className="w-3 h-3 mr-1" />
              Optimize
            </Button>
          </div>
        </div>
        
        <Slider
          value={[formData.leverage]}
          onValueChange={([value]) => setFormData(prev => ({ ...prev, leverage: value }))}
          max={100}
          min={1}
          step={1}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-slate-500">
          <span>1x</span>
          <span>25x</span>
          <span>50x</span>
          <span>100x</span>
        </div>
      </div>

      {/* 止盈止损 */}
      <div className="space-y-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Risk Management</label>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAutoCalculate(!autoCalculate)}
              className={cn(
                'text-xs',
                autoCalculate ? 'text-blue-400' : 'text-slate-500'
              )}
            >
              <Lightbulb className="w-3 h-3 mr-1" />
              Auto
            </Button>
            <select
              value={riskRewardRatio}
              onChange={(e) => setRiskRewardRatio(e.target.value)}
              className="bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
            >
              <option value="1:1">1:1</option>
              <option value="1:2">1:2</option>
              <option value="1:3">1:3</option>
              <option value="2:3">2:3</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Stop Loss</label>
            <Input
              type="number"
              value={formData.stopLoss}
              onChange={(e) => setFormData(prev => ({ ...prev, stopLoss: e.target.value }))}
              placeholder="Stop loss price"
              className="text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Take Profit</label>
            <Input
              type="number"
              value={formData.takeProfit}
              onChange={(e) => setFormData(prev => ({ ...prev, takeProfit: e.target.value }))}
              placeholder="Take profit price"
              className="text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* 风险分析 */}
      {showRiskAnalysis && (
        <div className="space-y-3 p-3 bg-slate-800/20 rounded-lg border border-slate-700/20">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Risk Analysis</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Margin Required:</span>
                <span className="font-mono text-white">${riskMetrics.margin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Liquidation:</span>
                <span className="font-mono text-orange-400">${riskMetrics.liquidationPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Loss:</span>
                <span className="font-mono text-red-400">-${riskMetrics.maxLoss.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Margin Usage:</span>
                <span className={cn('font-mono', getRiskColor(riskMetrics.marginUtilization / 100))}>
                  {riskMetrics.marginUtilization.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk/Reward:</span>
                <span className="font-mono text-white">{riskMetrics.riskRewardRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Gain:</span>
                <span className="font-mono text-green-400">+${riskMetrics.maxGain.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* 风险警告 */}
          {riskMetrics.marginUtilization > 80 && (
            <div className="flex items-center space-x-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-orange-400">High margin utilization risk</span>
            </div>
          )}
        </div>
      )}

      {/* 高级选项 */}
      {showAdvanced && (
        <div className="space-y-3 p-3 bg-slate-800/20 rounded-lg border border-slate-700/20">
          <span className="text-sm font-medium text-slate-300">Advanced Options</span>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Time in Force</label>
              <select
                value={formData.timeInForce}
                onChange={(e) => setFormData(prev => ({ ...prev, timeInForce: e.target.value as any }))}
                className="w-full bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
              >
                <option value="GTC">Good Till Cancel</option>
                <option value="IOC">Immediate or Cancel</option>
                <option value="FOK">Fill or Kill</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Margin Mode</label>
              <select
                value={formData.marginMode}
                onChange={(e) => setFormData(prev => ({ ...prev, marginMode: e.target.value as any }))}
                className="w-full bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
              >
                <option value="cross">Cross Margin</option>
                <option value="isolated">Isolated Margin</option>
              </select>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={formData.reduceOnly}
                onChange={(e) => setFormData(prev => ({ ...prev, reduceOnly: e.target.checked }))}
                className="rounded border-slate-600"
              />
              <span>Reduce Only</span>
            </label>
            
            <label className="flex items-center space-x-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={formData.postOnly}
                onChange={(e) => setFormData(prev => ({ ...prev, postOnly: e.target.checked }))}
                className="rounded border-slate-600"
              />
              <span>Post Only</span>
            </label>
          </div>
        </div>
      )}

      {/* 错误显示 */}
      {!validation.isValid && (
        <div className="space-y-2">
          {validation.errors.map((error, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              <AlertTriangle className="w-3 h-3" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* 提交按钮 */}
      <Button
        onClick={handleSubmit}
        disabled={!validation.isValid || isLoading}
        className={cn(
          'w-full h-12 font-bold text-lg tracking-wide',
          'transition-all duration-200 transform',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          formData.side === 'buy'
            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-600/30'
            : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-600/30'
        )}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>{formData.side.toUpperCase()} {symbol.split('/')[0]}</span>
          </div>
        )}
      </Button>

      {/* 交易摘要 */}
      <div className="text-xs text-slate-500 space-y-1">
        <div className="flex justify-between">
          <span>Estimated Cost:</span>
          <span className="font-mono">${((parseFloat(formData.amount) || 0) * currentPrice).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Trading Fee (0.04%):</span>
          <span className="font-mono">${(((parseFloat(formData.amount) || 0) * currentPrice) * 0.0004).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTradingForm;