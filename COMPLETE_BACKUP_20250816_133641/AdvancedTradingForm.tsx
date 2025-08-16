import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  AlertTriangle, 
  DollarSign,
  Calculator,
  Zap,
  RotateCcw,
  Settings,
  Info,
  Plus,
  Minus,
  Clock,
  StopCircle,
  Percent,
  Wallet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import '../styles/riverbit-colors.css';

interface AccountData {
  availableBalance: number;
  usedMargin: number;
  equity: number;
  marginLevel: number;
  usdcBalance: number;
}

interface TradingFormData {
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'oco' | 'trailing_stop';
  amount: string;
  price: string;
  stopPrice: string;
  limitPrice: string;
  trailingAmount: string;
  trailingPercent: string;
  leverage: number;
  marginMode: 'cross' | 'isolated';
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
  reduceOnly: boolean;
  postOnly: boolean;
  takeProfitPrice: string;
  stopLossPrice: string;
  enableTPSL: boolean;
}

interface AdvancedTradingFormProps {
  symbol: string;
  currentPrice: number;
  accountData: AccountData;
  onSubmit: (formData: TradingFormData) => void;
  isConnected: boolean;
  className?: string;
}

const AdvancedTradingForm: React.FC<AdvancedTradingFormProps> = ({
  symbol,
  currentPrice,
  accountData,
  onSubmit,
  isConnected,
  className = ''
}) => {
  const [formData, setFormData] = useState<TradingFormData>({
    side: 'buy',
    type: 'market',
    amount: '',
    price: '',
    stopPrice: '',
    limitPrice: '',
    trailingAmount: '',
    trailingPercent: '1',
    leverage: 10,
    marginMode: 'isolated',
    timeInForce: 'GTC',
    reduceOnly: false,
    postOnly: false,
    takeProfitPrice: '',
    stopLossPrice: '',
    enableTPSL: false
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Auto-fill price when switching to limit orders
  useEffect(() => {
    if (formData.type === 'limit' && !formData.price) {
      setFormData(prev => ({ ...prev, price: currentPrice.toString() }));
    }
  }, [formData.type, currentPrice]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    
    if (['limit', 'stop_limit'].includes(formData.type) && (!formData.price || parseFloat(formData.price) <= 0)) {
      errors.price = 'Price must be greater than 0';
    }
    
    if (['stop', 'stop_limit', 'trailing_stop'].includes(formData.type) && (!formData.stopPrice || parseFloat(formData.stopPrice) <= 0)) {
      errors.stopPrice = 'Stop price must be greater than 0';
    }
    
    if (formData.type === 'trailing_stop') {
      if (!formData.trailingAmount && !formData.trailingPercent) {
        errors.trailing = 'Trailing amount or percentage required';
      }
    }
    
    if (formData.enableTPSL) {
      if (formData.takeProfitPrice && parseFloat(formData.takeProfitPrice) <= 0) {
        errors.takeProfitPrice = 'Take profit price must be greater than 0';
      }
      if (formData.stopLossPrice && parseFloat(formData.stopLossPrice) <= 0) {
        errors.stopLossPrice = 'Stop loss price must be greater than 0';
      }
    }
    
    const requiredMargin = calculateRequiredMargin();
    if (requiredMargin > accountData.availableBalance) {
      errors.margin = 'Insufficient available balance';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, accountData.availableBalance]);

  // Calculate required margin
  const calculateRequiredMargin = useCallback(() => {
    if (!formData.amount) return 0;
    const amount = parseFloat(formData.amount);
    return amount / formData.leverage;
  }, [formData.amount, formData.leverage]);

  // Calculate potential P&L
  const calculatePnL = useCallback(() => {
    if (!formData.amount || !formData.price) return { profit: 0, loss: 0 };
    
    const amount = parseFloat(formData.amount);
    const price = parseFloat(formData.price) || currentPrice;
    const isLong = formData.side === 'buy';
    
    // 1% price movement example
    const priceMove = price * 0.01;
    const profit = isLong ? amount * (priceMove / price) * formData.leverage : amount * (-priceMove / price) * formData.leverage;
    const loss = -profit;
    
    return { profit, loss };
  }, [formData.amount, formData.price, formData.side, formData.leverage, currentPrice]);

  // Calculate liquidation price
  const liquidationPrice = useMemo(() => {
    if (!formData.amount || !currentPrice) return 0;
    
    const entryPrice = parseFloat(formData.price) || currentPrice;
    const isLong = formData.side === 'buy';
    const maintenanceMargin = 0.01; // 1% maintenance margin
    
    if (formData.marginMode === 'isolated') {
      const leverage = formData.leverage;
      const liqPrice = isLong 
        ? entryPrice * (1 - (1 / leverage) + maintenanceMargin)
        : entryPrice * (1 + (1 / leverage) - maintenanceMargin);
      return Math.max(0, liqPrice);
    }
    
    // Cross margin calculation (simplified)
    const totalEquity = accountData.equity;
    const positionValue = parseFloat(formData.amount);
    const liqPrice = isLong
      ? entryPrice - (totalEquity * entryPrice * maintenanceMargin) / positionValue
      : entryPrice + (totalEquity * entryPrice * maintenanceMargin) / positionValue;
    
    return Math.max(0, liqPrice);
  }, [formData, currentPrice, accountData.equity]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!validateForm()) return;
    
    setIsCalculating(true);
    setTimeout(() => {
      onSubmit(formData);
      setIsCalculating(false);
    }, 500);
  }, [formData, validateForm, onSubmit]);

  // Quick amount buttons
  const quickAmountPercentages = [25, 50, 75, 100];
  
  const setQuickAmount = useCallback((percentage: number) => {
    const balance = accountData.availableBalance;
    const amount = (balance * percentage) / 100;
    setFormData(prev => ({ ...prev, amount: amount.toFixed(2) }));
  }, [accountData.availableBalance]);

  // Order type configurations
  const orderTypeConfigs = {
    market: { label: 'Market', icon: Zap, description: 'Execute immediately at best available price' },
    limit: { label: 'Limit', icon: Target, description: 'Execute only at specified price or better' },
    stop: { label: 'Stop Market', icon: StopCircle, description: 'Market order triggered at stop price' },
    stop_limit: { label: 'Stop Limit', icon: Settings, description: 'Limit order triggered at stop price' },
    oco: { label: 'OCO', icon: RotateCcw, description: 'One-Cancels-Other order pair' },
    trailing_stop: { label: 'Trailing Stop', icon: TrendingUp, description: 'Stop that trails the market price' }
  };

  const pnl = calculatePnL();
  const requiredMargin = calculateRequiredMargin();
  const isFormValid = Object.keys(validationErrors).length === 0 && formData.amount && isConnected;

  return (
    <Card className={`${className} bg-gradient-to-br from-surface-1 to-surface-2 border border-default/30 shadow-professional`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-river-blue" />
            <span className="text-lg font-bold">Advanced Trading</span>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {symbol}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Account Overview */}
        <div className="bg-gradient-to-r from-surface-2/80 to-surface-3/60 rounded-lg p-4 border border-default/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-primary flex items-center space-x-2">
              <Wallet className="w-4 h-4" />
              <span>Account Overview</span>
            </h4>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                formData.marginMode === 'cross' 
                  ? 'bg-river-blue/15 text-river-blue border-river-blue/40' 
                  : 'bg-loss/15 text-loss border-loss/40'
              }`}
            >
              <Shield className="w-3 h-3 mr-1" />
              {formData.marginMode === 'cross' ? 'Cross' : 'Isolated'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-1/50 rounded-md p-2 border border-default/20">
              <div className="text-secondary text-xs mb-1">Available</div>
              <div className="font-bold text-profit">${accountData.availableBalance.toLocaleString()}</div>
            </div>
            <div className="bg-surface-1/50 rounded-md p-2 border border-default/20">
              <div className="text-secondary text-xs mb-1">Used Margin</div>
              <div className="font-bold text-loss">${accountData.usedMargin.toLocaleString()}</div>
            </div>
            <div className="bg-surface-1/50 rounded-md p-2 border border-default/20">
              <div className="text-secondary text-xs mb-1">Equity</div>
              <div className="font-bold text-river-blue">${accountData.equity.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Side Selection */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={formData.side === 'buy' ? 'default' : 'outline'}
            onClick={() => setFormData(prev => ({ ...prev, side: 'buy' }))}
            className={`h-12 font-bold transition-all ${
              formData.side === 'buy' 
                ? 'bg-profit hover:bg-profit/90 text-white shadow-lg shadow-profit/25' 
                : 'border-profit/30 text-profit hover:bg-profit/10'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Buy / Long
          </Button>
          <Button
            variant={formData.side === 'sell' ? 'default' : 'outline'}
            onClick={() => setFormData(prev => ({ ...prev, side: 'sell' }))}
            className={`h-12 font-bold transition-all ${
              formData.side === 'sell' 
                ? 'bg-loss hover:bg-loss/90 text-white shadow-lg shadow-loss/25' 
                : 'border-loss/30 text-loss hover:bg-loss/10'
            }`}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Sell / Short
          </Button>
        </div>

        {/* Order Type Selection */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Order Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
          >
            <SelectTrigger className="h-11 bg-surface-2/80 border-default/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(orderTypeConfigs).map(([type, config]) => (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center space-x-2">
                    <config.icon className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-muted">{config.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Amount Input */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">
            Order Size (USDT)
          </Label>
          <Input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            className="h-11 text-base font-medium bg-surface-2/80 border-default/50"
          />
          {validationErrors.amount && (
            <div className="text-xs text-loss mt-1 flex items-center space-x-1">
              <AlertCircle className="w-3 h-3" />
              <span>{validationErrors.amount}</span>
            </div>
          )}
          
          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            {quickAmountPercentages.map((percentage) => (
              <Button
                key={percentage}
                variant="outline"
                size="sm"
                onClick={() => setQuickAmount(percentage)}
                className="h-8 text-xs font-medium bg-surface-2/60 border-default/40 hover:bg-surface-3/60"
              >
                {percentage}%
              </Button>
            ))}
          </div>
        </div>

        {/* Price Inputs based on order type */}
        {['limit', 'stop_limit'].includes(formData.type) && (
          <div>
            <Label className="text-sm font-semibold mb-2 block">
              Limit Price (USDT)
            </Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder={currentPrice.toString()}
              className="h-11 text-base font-medium bg-surface-2/80 border-default/50"
            />
            {validationErrors.price && (
              <div className="text-xs text-loss mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>{validationErrors.price}</span>
              </div>
            )}
          </div>
        )}

        {['stop', 'stop_limit', 'trailing_stop'].includes(formData.type) && (
          <div>
            <Label className="text-sm font-semibold mb-2 block">
              Stop Price (USDT)
            </Label>
            <Input
              type="number"
              value={formData.stopPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, stopPrice: e.target.value }))}
              placeholder="Stop trigger price"
              className="h-11 text-base font-medium bg-surface-2/80 border-default/50"
            />
            {validationErrors.stopPrice && (
              <div className="text-xs text-loss mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>{validationErrors.stopPrice}</span>
              </div>
            )}
          </div>
        )}

        {formData.type === 'trailing_stop' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                Trail Amount (USDT)
              </Label>
              <Input
                type="number"
                value={formData.trailingAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, trailingAmount: e.target.value }))}
                placeholder="Amount"
                className="h-11 bg-surface-2/80 border-default/50"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                Trail Percent (%)
              </Label>
              <Input
                type="number"
                value={formData.trailingPercent}
                onChange={(e) => setFormData(prev => ({ ...prev, trailingPercent: e.target.value }))}
                placeholder="Percentage"
                className="h-11 bg-surface-2/80 border-default/50"
              />
            </div>
          </div>
        )}

        {/* Leverage Control */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Leverage</span>
            </Label>
            <div className="flex items-center space-x-2 bg-surface-2/60 px-3 py-1 rounded-lg border border-default/30">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFormData(prev => ({ ...prev, leverage: Math.max(1, prev.leverage - 1) }))}
                className="h-6 w-6 p-0"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className={`text-lg font-bold min-w-[40px] text-center ${
                formData.leverage <= 10 ? 'text-profit' :
                formData.leverage <= 50 ? 'text-loss' :
                'text-danger'
              }`}>
                {formData.leverage}x
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFormData(prev => ({ ...prev, leverage: Math.min(100, prev.leverage + 1) }))}
                className="h-6 w-6 p-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <Slider
            value={[formData.leverage]}
            onValueChange={(value) => setFormData(prev => ({ ...prev, leverage: value[0] }))}
            max={100}
            min={1}
            step={1}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted mt-2">
            <span>1x</span>
            <span>25x</span>
            <span>50x</span>
            <span>100x</span>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="space-y-4 p-4 bg-surface-2/50 rounded-lg border border-default/30">
          <h4 className="font-semibold text-primary text-sm">Advanced Options</h4>
          
          {/* Margin Mode */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">Margin Mode</Label>
            <div className="flex bg-surface-3/60 rounded-lg p-0.5">
              <Button
                size="sm"
                variant={formData.marginMode === 'cross' ? 'default' : 'ghost'}
                onClick={() => setFormData(prev => ({ ...prev, marginMode: 'cross' }))}
                className="h-7 px-3 text-xs"
              >
                Cross
              </Button>
              <Button
                size="sm"
                variant={formData.marginMode === 'isolated' ? 'default' : 'ghost'}
                onClick={() => setFormData(prev => ({ ...prev, marginMode: 'isolated' }))}
                className="h-7 px-3 text-xs"
              >
                Isolated
              </Button>
            </div>
          </div>

          {/* Time in Force */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">Time in Force</Label>
            <Select
              value={formData.timeInForce}
              onValueChange={(value) => setFormData(prev => ({ ...prev, timeInForce: value as any }))}
            >
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GTC">GTC</SelectItem>
                <SelectItem value="IOC">IOC</SelectItem>
                <SelectItem value="FOK">FOK</SelectItem>
                <SelectItem value="DAY">DAY</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Order Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.reduceOnly}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reduceOnly: checked }))}
              />
              <Label className="text-xs">Reduce Only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.postOnly}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, postOnly: checked }))}
              />
              <Label className="text-xs">Post Only</Label>
            </div>
          </div>

          {/* TP/SL */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.enableTPSL}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableTPSL: checked }))}
              />
              <Label className="text-sm">Take Profit / Stop Loss</Label>
            </div>
            
            {formData.enableTPSL && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-secondary">Take Profit</Label>
                  <Input
                    type="number"
                    value={formData.takeProfitPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, takeProfitPrice: e.target.value }))}
                    placeholder="TP Price"
                    className="h-9 text-sm bg-surface-3/60"
                  />
                </div>
                <div>
                  <Label className="text-xs text-secondary">Stop Loss</Label>
                  <Input
                    type="number"
                    value={formData.stopLossPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, stopLossPrice: e.target.value }))}
                    placeholder="SL Price"
                    className="h-9 text-sm bg-surface-3/60"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Risk Analysis */}
        {formData.amount && (
          <div className="bg-gradient-to-br from-surface-2/80 to-surface-3/60 rounded-lg p-4 border border-default/30">
            <h4 className="font-semibold text-primary text-sm mb-3 flex items-center space-x-2">
              <Calculator className="w-4 h-4" />
              <span>Risk Analysis</span>
            </h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-secondary">Required Margin:</span>
                  <span className="font-bold text-river-blue">${requiredMargin.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Liquidation Price:</span>
                  <span className="font-bold text-danger">${liquidationPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Trading Fee:</span>
                  <span className="font-bold text-loss">${(parseFloat(formData.amount || '0') * 0.0006).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-secondary">Est. Profit (1%):</span>
                  <span className="font-bold text-profit">+${Math.abs(pnl.profit).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Est. Loss (1%):</span>
                  <span className="font-bold text-loss">-${Math.abs(pnl.loss).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Margin Ratio:</span>
                  <span className={`font-bold ${
                    accountData.marginLevel > 200 ? 'text-profit' : 
                    accountData.marginLevel > 100 ? 'text-loss' : 'text-danger'
                  }`}>
                    {accountData.marginLevel.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        {!isConnected && (
          <Alert className="border-river-blue/30 bg-river-blue/10">
            <Wallet className="h-4 w-4 text-river-blue" />
            <AlertDescription className="text-river-blue">
              Connect your wallet to start trading with real funds
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isCalculating}
          className={`w-full h-14 text-lg font-bold transition-all duration-200 ${
            formData.side === 'buy'
              ? 'bg-profit hover:bg-profit/90 text-white shadow-lg shadow-profit/25 hover:shadow-profit/40 hover:scale-[1.02]'
              : 'bg-loss hover:bg-loss/90 text-white shadow-lg shadow-loss/25 hover:shadow-loss/40 hover:scale-[1.02]'
          }`}
        >
          {isCalculating ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {formData.side === 'buy' ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span>
                {!isConnected ? 'Connect Wallet to ' : ''}
                {formData.side === 'buy' ? 'Buy' : 'Sell'} {symbol.split('/')[0]}
              </span>
              {formData.amount && (
                <span className="text-sm opacity-90">
                  (${parseFloat(formData.amount).toLocaleString()})
                </span>
              )}
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdvancedTradingForm;