import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { cn } from './utils';
import { Zap, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface NaturalTradingFormProps {
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  amount: string;
  price: string;
  leverage: number;
  onSideChange: (side: 'buy' | 'sell') => void;
  onOrderTypeChange: (type: 'market' | 'limit') => void;
  onAmountChange: (amount: string) => void;
  onPriceChange: (price: string) => void;
  onLeverageChange: (leverage: number) => void;
  onTrade: () => void;
  currentPrice: number;
  isLoading?: boolean;
  className?: string;
}

const NaturalTradingForm: React.FC<NaturalTradingFormProps> = ({
  side,
  orderType,
  amount,
  price,
  leverage,
  onSideChange,
  onOrderTypeChange,
  onAmountChange,
  onPriceChange,
  onLeverageChange,
  onTrade,
  currentPrice,
  isLoading = false,
  className,
}) => {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<'valid' | 'warning' | 'error'>('valid');
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);

  // 智能表单验证
  useEffect(() => {
    const numAmount = parseFloat(amount);
    const numPrice = parseFloat(price);
    
    if (!amount || numAmount <= 0) {
      setValidationState('warning');
    } else if (orderType === 'limit' && (!price || numPrice <= 0)) {
      setValidationState('warning');
    } else if (leverage > 50) {
      setValidationState('error');
    } else {
      setValidationState('valid');
    }
  }, [amount, price, orderType, leverage]);

  // 智能建议生成
  useEffect(() => {
    const suggestions = [];
    
    if (orderType === 'market' && parseFloat(amount) > 10000) {
      suggestions.push('Large order detected - consider breaking into smaller parts');
    }
    
    if (leverage > 25) {
      suggestions.push('High leverage increases liquidation risk');
    }
    
    if (orderType === 'limit') {
      const priceNum = parseFloat(price);
      const spread = Math.abs(priceNum - currentPrice) / currentPrice * 100;
      if (spread > 5) {
        suggestions.push(`Price is ${spread.toFixed(1)}% from market - may not fill quickly`);
      }
    }
    
    setSmartSuggestions(suggestions);
  }, [amount, price, leverage, orderType, currentPrice]);

  // 获取智能按钮样式
  const getSideButtonClass = (buttonSide: 'buy' | 'sell') => {
    const isSelected = side === buttonSide;
    const baseClass = 'flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 natural-interactive haptic-medium';
    
    if (buttonSide === 'buy') {
      return cn(
        baseClass,
        isSelected 
          ? 'bg-green-600 text-white shadow-lg shadow-green-600/30 market-emotion-trending scale-105' 
          : 'text-green-400 hover:bg-green-400/10 border border-green-400/30'
      );
    } else {
      return cn(
        baseClass,
        isSelected 
          ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 market-emotion-caution scale-105' 
          : 'text-red-400 hover:bg-red-400/10 border border-red-400/30'
      );
    }
  };

  // 风险水平指示器
  const getRiskLevel = () => {
    if (leverage <= 5) return { level: 'Low', color: 'text-green-400', bg: 'bg-green-400/10' };
    if (leverage <= 20) return { level: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    if (leverage <= 50) return { level: 'High', color: 'text-orange-400', bg: 'bg-orange-400/10' };
    return { level: 'Extreme', color: 'text-red-400', bg: 'bg-red-400/10' };
  };

  const riskLevel = getRiskLevel();

  return (
    <div className={cn('space-y-4 natural-interactive', className)}>
      {/* 智能交易方向选择 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Direction</label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-xl">
          <button
            onClick={() => onSideChange('buy')}
            className={getSideButtonClass('buy')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            BUY / LONG
          </button>
          <button
            onClick={() => onSideChange('sell')}
            className={getSideButtonClass('sell')}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            SELL / SHORT
          </button>
        </div>
      </div>

      {/* 订单类型选择 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Order Type</label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={orderType === 'market' ? 'default' : 'outline'}
            onClick={() => onOrderTypeChange('market')}
            className="natural-interactive haptic-light"
          >
            Market
          </Button>
          <Button
            variant={orderType === 'limit' ? 'default' : 'outline'}
            onClick={() => onOrderTypeChange('limit')}
            className="natural-interactive haptic-light"
          >
            Limit
          </Button>
        </div>
      </div>

      {/* 智能金额输入 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          {orderType === 'market' ? 'Amount (USDT)' : 'Amount (BTC)'}
        </label>
        <div className="relative">
          <Input
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            onFocus={() => setFocusedField('amount')}
            onBlur={() => setFocusedField(null)}
            placeholder={orderType === 'market' ? '1000' : '0.001'}
            className={cn(
              'font-mono transition-all duration-300 natural-interactive',
              focusedField === 'amount' && 'ring-2 ring-blue-400/50',
              validationState === 'error' && 'border-red-400 ring-red-400/50',
              validationState === 'warning' && 'border-yellow-400 ring-yellow-400/50'
            )}
          />
          {orderType === 'market' && amount && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              ≈ {(parseFloat(amount) / currentPrice).toFixed(6)} BTC
            </div>
          )}
        </div>
      </div>

      {/* 限价单价格输入 */}
      {orderType === 'limit' && (
        <div className="space-y-2 progressive-reveal">
          <label className="text-sm font-medium text-gray-300">Price (USDT)</label>
          <Input
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            onFocus={() => setFocusedField('price')}
            onBlur={() => setFocusedField(null)}
            placeholder={currentPrice.toString()}
            className={cn(
              'font-mono transition-all duration-300 natural-interactive',
              focusedField === 'price' && 'ring-2 ring-blue-400/50'
            )}
          />
        </div>
      )}

      {/* 智能杠杆控制 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Leverage</label>
          <div className={cn(
            'px-3 py-1 rounded-lg text-sm font-semibold',
            riskLevel.color,
            riskLevel.bg
          )}>
            {leverage}x - {riskLevel.level} Risk
          </div>
        </div>
        
        <div className="relative">
          <input
            type="range"
            min="1"
            max="100"
            value={leverage}
            onChange={(e) => onLeverageChange(Number(e.target.value))}
            className={cn(
              'w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer',
              'slider natural-interactive',
              leverage > 50 && 'slider-danger',
              leverage > 25 && leverage <= 50 && 'slider-warning',
              leverage <= 25 && 'slider-safe'
            )}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1x</span>
            <span>25x</span>
            <span>50x</span>
            <span>100x</span>
          </div>
        </div>
      </div>

      {/* 智能建议面板 */}
      {smartSuggestions.length > 0 && (
        <div className="space-y-2 progressive-reveal">
          <h4 className="text-sm font-medium text-blue-400">Smart Suggestions</h4>
          <div className="space-y-1">
            {smartSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="text-xs text-gray-300 p-2 bg-blue-900/20 border border-blue-400/30 rounded-lg"
              >
                💡 {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 智能交易按钮 */}
      <Button
        onClick={onTrade}
        disabled={validationState === 'error' || isLoading}
        className={cn(
          'w-full h-12 text-lg font-bold natural-interactive haptic-strong',
          side === 'buy' 
            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' 
            : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
          'shadow-lg transition-all duration-300',
          validationState === 'error' && 'opacity-50 cursor-not-allowed',
          isLoading && 'animate-pulse'
        )}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            {validationState === 'error' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            <span>{side.toUpperCase()}</span>
          </div>
        )}
      </Button>

      {/* 呼吸式状态指示 */}
      <div className="breathing-card warm-glow p-2 bg-slate-800/30 rounded-lg">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Form Status:</span>
          <span className={cn(
            'font-medium',
            validationState === 'valid' && 'text-green-400',
            validationState === 'warning' && 'text-yellow-400',
            validationState === 'error' && 'text-red-400'
          )}>
            {validationState === 'valid' && '✅ Ready to trade'}
            {validationState === 'warning' && '⚠️ Please check inputs'}
            {validationState === 'error' && '❌ Invalid parameters'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default NaturalTradingForm;