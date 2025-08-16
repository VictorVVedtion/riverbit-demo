import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { EnhancedButton } from './ui/enhanced-button';
import { useFeedback, useTradingFeedback } from './InstantFeedbackSystem';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Percent,
  Clock,
  BarChart3,
  Sliders,
  Calculator,
  Eye,
  EyeOff,
  Info,
  Lightbulb
} from 'lucide-react';
import { hapticFeedback } from '../utils/animationUtils';

interface FormValidation {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  animate?: boolean;
}

interface OrderFormData {
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop-limit';
  amount: string;
  price: string;
  stopPrice: string;
  leverage: number;
  reduceOnly: boolean;
  postOnly: boolean;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
}

interface EnhancedTradingFormProps {
  symbol: string;
  currentPrice: number;
  accountBalance: number;
  availableMargin: number;
  maxLeverage: number;
  onSubmitOrder: (order: OrderFormData) => Promise<void>;
  className?: string;
}

const EnhancedTradingForm: React.FC<EnhancedTradingFormProps> = ({
  symbol,
  currentPrice,
  accountBalance,
  availableMargin,
  maxLeverage,
  onSubmitOrder,
  className = ''
}) => {
  const [formData, setFormData] = useState<OrderFormData>({
    side: 'buy',
    type: 'market',
    amount: '',
    price: '',
    stopPrice: '',
    leverage: 10,
    reduceOnly: false,
    postOnly: false,
    timeInForce: 'GTC',
  });

  const [validations, setValidations] = useState<FormValidation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRiskCalculator, setShowRiskCalculator] = useState(false);
  const [fieldFocus, setFieldFocus] = useState<string | null>(null);
  const [quickPercentage, setQuickPercentage] = useState<number | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const feedback = useFeedback();
  const tradingFeedback = useTradingFeedback();

  // Real-time validation
  const validateForm = useCallback(() => {
    const newValidations: FormValidation[] = [];
    const amount = parseFloat(formData.amount);
    const price = parseFloat(formData.price);
    const stopPrice = parseFloat(formData.stopPrice);

    // Amount validation
    if (formData.amount && isNaN(amount)) {
      newValidations.push({
        field: 'amount',
        message: 'Please enter a valid amount',
        type: 'error',
        animate: true
      });
    } else if (amount <= 0) {
      newValidations.push({
        field: 'amount',
        message: 'Amount must be greater than 0',
        type: 'error'
      });
    } else if (amount > availableMargin * formData.leverage) {
      newValidations.push({
        field: 'amount',
        message: 'Insufficient margin for this position size',
        type: 'error'
      });
    } else if (amount > availableMargin * formData.leverage * 0.9) {
      newValidations.push({
        field: 'amount',
        message: 'High margin usage - consider reducing position size',
        type: 'warning'
      });
    }

    // Price validation for limit orders
    if (formData.type === 'limit' || formData.type === 'stop-limit') {
      if (formData.price && isNaN(price)) {
        newValidations.push({
          field: 'price',
          message: 'Please enter a valid price',
          type: 'error',
          animate: true
        });
      } else if (price <= 0) {
        newValidations.push({
          field: 'price',
          message: 'Price must be greater than 0',
          type: 'error'
        });
      } else {
        const priceDiff = Math.abs(price - currentPrice) / currentPrice;
        if (priceDiff > 0.1) {
          newValidations.push({
            field: 'price',
            message: `Price is ${(priceDiff * 100).toFixed(1)}% away from market`,
            type: 'warning'
          });
        }
      }
    }

    // Stop price validation
    if (formData.type === 'stop' || formData.type === 'stop-limit') {
      if (formData.stopPrice && isNaN(stopPrice)) {
        newValidations.push({
          field: 'stopPrice',
          message: 'Please enter a valid stop price',
          type: 'error',
          animate: true
        });
      } else if (stopPrice <= 0) {
        newValidations.push({
          field: 'stopPrice',
          message: 'Stop price must be greater than 0',
          type: 'error'
        });
      }
    }

    // Leverage validation
    if (formData.leverage > maxLeverage) {
      newValidations.push({
        field: 'leverage',
        message: `Maximum leverage is ${maxLeverage}x`,
        type: 'error'
      });
    } else if (formData.leverage > maxLeverage * 0.8) {
      newValidations.push({
        field: 'leverage',
        message: 'High leverage increases liquidation risk',
        type: 'warning'
      });
    }

    setValidations(newValidations);
    return newValidations.filter(v => v.type === 'error').length === 0;
  }, [formData, currentPrice, availableMargin, maxLeverage]);

  // Auto-validation on form changes
  useEffect(() => {
    validateForm();
  }, [validateForm]);

  // Quick percentage calculations
  const calculateQuickAmount = useCallback((percentage: number) => {
    const maxAmount = availableMargin * formData.leverage;
    const quickAmount = (maxAmount * percentage) / 100;
    setFormData(prev => ({ ...prev, amount: quickAmount.toFixed(2) }));
    setQuickPercentage(percentage);
    hapticFeedback.light();
    
    // Animate amount input
    if (amountInputRef.current) {
      amountInputRef.current.style.transform = 'scale(1.02)';
      amountInputRef.current.style.transition = 'transform 0.15s ease-out';
      setTimeout(() => {
        if (amountInputRef.current) {
          amountInputRef.current.style.transform = 'scale(1)';
        }
      }, 150);
    }
  }, [availableMargin, formData.leverage]);

  // Smart price suggestions
  const getSmartPricesuggestion = useCallback(() => {
    if (formData.type === 'limit') {
      if (formData.side === 'buy') {
        // Suggest slightly below current price for better fill chance
        return (currentPrice * 0.999).toFixed(2);
      } else {
        // Suggest slightly above current price for better fill chance
        return (currentPrice * 1.001).toFixed(2);
      }
    }
    return currentPrice.toFixed(2);
  }, [formData.type, formData.side, currentPrice]);

  // Risk calculations
  const riskMetrics = useMemo(() => {
    const amount = parseFloat(formData.amount) || 0;
    const price = parseFloat(formData.price) || currentPrice;
    const requiredMargin = amount / formData.leverage;
    const liquidationPrice = formData.side === 'buy' 
      ? price * (1 - 1/formData.leverage * 0.9)
      : price * (1 + 1/formData.leverage * 0.9);
    const maxLoss = requiredMargin;
    const tradingFee = amount * 0.0006; // 0.06% fee

    return {
      requiredMargin,
      liquidationPrice,
      maxLoss,
      tradingFee,
      marginUsagePercent: (requiredMargin / availableMargin) * 100
    };
  }, [formData, currentPrice, availableMargin]);

  // Form submission with enhanced feedback
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      hapticFeedback.error();
      const errorValidation = validations.find(v => v.type === 'error');
      if (errorValidation) {
        feedback.showError('Validation Error', errorValidation.message);
      }
      return;
    }

    setIsSubmitting(true);
    const loadingId = tradingFeedback.orderPlaced(
      formData.side,
      parseFloat(formData.amount),
      parseFloat(formData.price) || currentPrice,
      formData.type
    );

    try {
      await onSubmitOrder(formData);
      
      feedback.hideFeedback(loadingId);
      tradingFeedback.orderFilled(
        formData.side,
        parseFloat(formData.amount),
        parseFloat(formData.price) || currentPrice
      );

      // Reset form
      setFormData(prev => ({
        ...prev,
        amount: '',
        price: '',
        stopPrice: ''
      }));
      setQuickPercentage(null);

    } catch (error: any) {
      feedback.hideFeedback(loadingId);
      feedback.showError('Order Failed', error.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, validations, feedback, tradingFeedback, onSubmitOrder, currentPrice]);

  // Field validation display
  const getFieldValidation = useCallback((field: string) => {
    return validations.find(v => v.field === field);
  }, [validations]);

  // Enhanced input component
  const EnhancedInput: React.FC<{
    field: string;
    label: string;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    prefix?: string;
    suffix?: string;
    helpText?: string;
    rightElement?: React.ReactNode;
  }> = ({ 
    field, 
    label, 
    type = 'text', 
    placeholder, 
    value, 
    onChange, 
    prefix, 
    suffix, 
    helpText,
    rightElement 
  }) => {
    const validation = getFieldValidation(field);
    const isError = validation?.type === 'error';
    const isWarning = validation?.type === 'warning';
    const isFocused = fieldFocus === field;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-secondary">{label}</Label>
          {rightElement}
        </div>
        
        <div className="relative">
          {prefix && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary text-sm">
              {prefix}
            </div>
          )}
          
          <Input
            ref={field === 'amount' ? amountInputRef : field === 'price' ? priceInputRef : undefined}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFieldFocus(field)}
            onBlur={() => setFieldFocus(null)}
            className={`transition-all duration-200 ${
              prefix ? 'pl-8' : ''
            } ${
              suffix ? 'pr-12' : ''
            } ${
              isFocused ? 'ring-2 ring-river-blue/50 border-river-blue' : ''
            } ${
              isError ? 'border-danger focus:ring-danger/50' : 
              isWarning ? 'border-warning focus:ring-warning/50' : ''
            } ${
              validation?.animate ? 'animate-[shake_0.3s_ease-in-out]' : ''
            }`}
          />
          
          {suffix && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary text-sm">
              {suffix}
            </div>
          )}
        </div>

        {/* Validation message */}
        {validation && (
          <div className={`flex items-center space-x-2 text-xs animate-[slideDown_0.2s_ease-out] ${
            isError ? 'text-danger' : isWarning ? 'text-warning' : 'text-river-blue'
          }`}>
            {isError ? <AlertTriangle className="h-3 w-3" /> :
             isWarning ? <Info className="h-3 w-3" /> :
             <CheckCircle className="h-3 w-3" />}
            <span>{validation.message}</span>
          </div>
        )}

        {/* Help text */}
        {helpText && !validation && (
          <div className="text-xs text-muted">{helpText}</div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-gradient-to-br from-surface-1 to-surface-2 border-default/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-river-blue" />
              <span>Place Order</span>
              <Badge variant="outline" className="text-xs">
                {symbol}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <EnhancedButton
                size="sm"
                variant="ghost"
                onClick={() => setShowRiskCalculator(!showRiskCalculator)}
                className="h-7 text-xs"
                haptic={true}
              >
                <Calculator className="h-3 w-3 mr-1" />
                Risk
              </EnhancedButton>
              
              <EnhancedButton
                size="sm"
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="h-7 text-xs"
                haptic={true}
              >
                <Sliders className="h-3 w-3 mr-1" />
                Advanced
              </EnhancedButton>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent ref={formRef} className="space-y-6">
          {/* Side Selection */}
          <div className="grid grid-cols-2 gap-3">
            <EnhancedButton
              variant={formData.side === 'buy' ? 'buy' : 'outline'}
              onClick={() => setFormData(prev => ({ ...prev, side: 'buy' }))}
              className="h-12 font-bold transition-all duration-200"
              haptic={true}
              ripple={true}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Buy
            </EnhancedButton>
            
            <EnhancedButton
              variant={formData.side === 'sell' ? 'sell' : 'outline'}
              onClick={() => setFormData(prev => ({ ...prev, side: 'sell' }))}
              className="h-12 font-bold transition-all duration-200"
              haptic={true}
              ripple={true}
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Sell
            </EnhancedButton>
          </div>

          {/* Order Type */}
          <div>
            <Label className="text-sm font-semibold text-secondary mb-3 block">Order Type</Label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { value: 'market', label: 'Market', icon: Zap },
                { value: 'limit', label: 'Limit', icon: Target },
                { value: 'stop', label: 'Stop', icon: Shield },
                { value: 'stop-limit', label: 'Stop-Limit', icon: BarChart3 }
              ].map(({ value, label, icon: Icon }) => (
                <EnhancedButton
                  key={value}
                  size="sm"
                  variant={formData.type === value ? 'primary' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, type: value as any }))}
                  className="h-9 text-xs"
                  haptic={true}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {label}
                </EnhancedButton>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <EnhancedInput
            field="amount"
            label="Position Size"
            type="number"
            placeholder="0.00"
            value={formData.amount}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, amount: value }));
              setQuickPercentage(null);
            }}
            prefix="$"
            helpText="Total position size in USDT"
            rightElement={
              <div className="flex items-center gap-1">
                {[25, 50, 75, 100].map((percentage) => (
                  <EnhancedButton
                    key={percentage}
                    size="sm"
                    variant={quickPercentage === percentage ? 'primary' : 'ghost'}
                    onClick={() => calculateQuickAmount(percentage)}
                    className="h-6 w-8 text-xs px-1"
                    haptic={true}
                  >
                    {percentage}%
                  </EnhancedButton>
                ))}
              </div>
            }
          />

          {/* Price Input (for limit orders) */}
          {(formData.type === 'limit' || formData.type === 'stop-limit') && (
            <EnhancedInput
              field="price"
              label="Limit Price"
              type="number"
              placeholder={getSmartPricesuggestion()}
              value={formData.price}
              onChange={(value) => setFormData(prev => ({ ...prev, price: value }))}
              prefix="$"
              helpText="Price at which the order will be executed"
              rightElement={
                <EnhancedButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setFormData(prev => ({ ...prev, price: getSmartPricesuggestion() }))}
                  className="h-6 text-xs"
                  haptic={true}
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Smart
                </EnhancedButton>
              }
            />
          )}

          {/* Stop Price (for stop orders) */}
          {(formData.type === 'stop' || formData.type === 'stop-limit') && (
            <EnhancedInput
              field="stopPrice"
              label="Stop Price"
              type="number"
              placeholder={currentPrice.toFixed(2)}
              value={formData.stopPrice}
              onChange={(value) => setFormData(prev => ({ ...prev, stopPrice: value }))}
              prefix="$"
              helpText="Price that triggers the stop order"
            />
          )}

          {/* Leverage */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-secondary">
                Leverage
              </Label>
              <div className={`text-lg font-bold ${
                formData.leverage <= 10 ? 'text-profit' : 
                formData.leverage <= 50 ? 'text-warning' : 'text-danger'
              }`}>
                {formData.leverage}x
              </div>
            </div>
            
            <div className="space-y-3">
              <input
                type="range"
                min="1"
                max={maxLeverage}
                value={formData.leverage}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, leverage: parseInt(e.target.value) }));
                  hapticFeedback.light();
                }}
                className="w-full h-2 bg-surface-2 rounded-lg appearance-none slider-thumb"
              />
              
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 25, 50].filter(lev => lev <= maxLeverage).map((lev) => (
                  <EnhancedButton
                    key={lev}
                    size="sm"
                    variant={formData.leverage === lev ? 'primary' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, leverage: lev }))}
                    className="h-8 text-xs"
                    haptic={true}
                  >
                    {lev}x
                  </EnhancedButton>
                ))}
              </div>
            </div>
          </div>

          {/* Risk Calculator */}
          {showRiskCalculator && (
            <Card className="bg-surface-2/50 border-default/30 animate-[slideDown_0.3s_ease-out]">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-bold text-primary flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Risk Analysis
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-secondary">Required Margin</div>
                    <div className="font-bold text-river-blue">
                      ${riskMetrics.requiredMargin.toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-secondary">Liquidation Price</div>
                    <div className="font-bold text-danger">
                      ${riskMetrics.liquidationPrice.toFixed(2)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-secondary">Max Loss</div>
                    <div className="font-bold text-loss">
                      ${riskMetrics.maxLoss.toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-secondary">Trading Fee</div>
                    <div className="font-bold text-secondary">
                      ${riskMetrics.tradingFee.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-default/20">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-secondary">Margin Usage</span>
                    <span className={`font-bold ${
                      riskMetrics.marginUsagePercent > 80 ? 'text-danger' :
                      riskMetrics.marginUsagePercent > 60 ? 'text-warning' : 'text-profit'
                    }`}>
                      {riskMetrics.marginUsagePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-3 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        riskMetrics.marginUsagePercent > 80 ? 'bg-danger' :
                        riskMetrics.marginUsagePercent > 60 ? 'bg-warning' : 'bg-profit'
                      }`}
                      style={{ width: `${Math.min(100, riskMetrics.marginUsagePercent)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced Options */}
          {showAdvanced && (
            <Card className="bg-surface-2/50 border-default/30 animate-[slideDown_0.3s_ease-out]">
              <CardContent className="p-4 space-y-4">
                <h4 className="font-bold text-primary flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  Advanced Options
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.reduceOnly}
                      onChange={(e) => setFormData(prev => ({ ...prev, reduceOnly: e.target.checked }))}
                      className="rounded border-default"
                    />
                    <span className="text-sm">Reduce Only</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.postOnly}
                      onChange={(e) => setFormData(prev => ({ ...prev, postOnly: e.target.checked }))}
                      className="rounded border-default"
                    />
                    <span className="text-sm">Post Only</span>
                  </label>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold text-secondary mb-2 block">
                    Time in Force
                  </Label>
                  <Select
                    value={formData.timeInForce}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, timeInForce: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GTC">Good Till Canceled</SelectItem>
                      <SelectItem value="IOC">Immediate or Cancel</SelectItem>
                      <SelectItem value="FOK">Fill or Kill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <EnhancedButton
            onClick={handleSubmit}
            disabled={!formData.amount || validations.some(v => v.type === 'error') || isSubmitting}
            variant={formData.side === 'buy' ? 'buy' : 'sell'}
            className="w-full h-14 text-lg font-bold shadow-lg"
            loading={isSubmitting}
            loadingText="Placing Order..."
            haptic={true}
            ripple={true}
          >
            <div className="flex items-center justify-center space-x-2">
              {formData.side === 'buy' ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span>
                {formData.type === 'market' ? 'Market' : 'Place'} {formData.side === 'buy' ? 'Buy' : 'Sell'}
              </span>
              {formData.amount && (
                <span className="text-sm opacity-90">
                  (${parseFloat(formData.amount).toLocaleString()})
                </span>
              )}
            </div>
          </EnhancedButton>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedTradingForm;