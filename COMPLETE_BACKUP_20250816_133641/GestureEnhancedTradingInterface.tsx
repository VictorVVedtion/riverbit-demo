import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { EnhancedButton } from './ui/enhanced-button';
import { Skeleton, TradingSkeleton, Loading } from './ui/enhanced-skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Settings, 
  Plus,
  Minus,
  Target,
  Wallet,
  Eye,
  EyeOff,
  Zap,
  X,
  Search,
  Activity,
  DollarSign,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { gestureUtils, hapticFeedback } from '../utils/animationUtils';
import '../styles/riverbit-colors.css';

interface GesturePosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercent: number;
  leverage: number;
}

interface GestureTradingProps {
  selectedPair: string;
  currentPrice: number;
  positions: GesturePosition[];
  accountData: {
    balance: number;
    equity: number;
    marginUsed: number;
  };
  onPlaceOrder: (orderData: any) => void;
  isLoading?: boolean;
  className?: string;
}

const GestureEnhancedTradingInterface: React.FC<GestureTradingProps> = ({
  selectedPair,
  currentPrice,
  positions,
  accountData,
  onPlaceOrder,
  isLoading = false,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('trade');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [priceAnimation, setPriceAnimation] = useState<'up' | 'down' | null>(null);
  const [lastPrice, setLastPrice] = useState(currentPrice);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const orderFormRef = useRef<HTMLDivElement>(null);
  const leverageSliderRef = useRef<HTMLDivElement>(null);

  // Price change animation
  useEffect(() => {
    if (currentPrice !== lastPrice) {
      setPriceAnimation(currentPrice > lastPrice ? 'up' : 'down');
      setLastPrice(currentPrice);
      
      // Haptic feedback for price changes
      if (Math.abs(currentPrice - lastPrice) / lastPrice > 0.005) { // 0.5% change
        hapticFeedback.light();
      }
      
      setTimeout(() => setPriceAnimation(null), 600);
    }
  }, [currentPrice, lastPrice]);

  // Gesture handlers
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Swipe gestures for tab navigation
    const unsubscribeSwipe = gestureUtils.detectSwipe(container, (direction, velocity) => {
      hapticFeedback.light();
      
      if (direction === 'left') {
        // Swipe left: next tab
        if (activeTab === 'trade') setActiveTab('positions');
        else if (activeTab === 'positions') setActiveTab('charts');
      } else if (direction === 'right') {
        // Swipe right: previous tab
        if (activeTab === 'charts') setActiveTab('positions');
        else if (activeTab === 'positions') setActiveTab('trade');
      }
    });

    return unsubscribeSwipe;
  }, [activeTab]);

  // Long press gesture for quick orders
  const handleLongPress = useCallback((side: 'buy' | 'sell') => {
    hapticFeedback.heavy();
    setOrderSide(side);
    
    // Auto-fill quick order
    const quickAmount = (accountData.balance * 0.1).toString(); // 10% of balance
    setAmount(quickAmount);
    
    // Show visual feedback
    const button = document.querySelector(`[data-side="${side}"]`) as HTMLElement;
    if (button) {
      button.style.transform = 'scale(0.95)';
      button.style.filter = 'brightness(1.2)';
      setTimeout(() => {
        button.style.transform = '';
        button.style.filter = '';
      }, 200);
    }
  }, [accountData.balance]);

  // Leverage slider gesture
  const handleLeverageGesture = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!leverageSliderRef.current) return;
    
    const rect = leverageSliderRef.current.getBoundingClientRect();
    const x = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const percentage = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    const newLeverage = Math.round(1 + percentage * 99); // 1x to 100x
    
    setLeverage(newLeverage);
    hapticFeedback.light();
  }, []);

  // Quick amount calculation
  const calculateQuickAmount = useCallback((percentage: number) => {
    const availableBalance = accountData.balance - accountData.marginUsed;
    const quickAmount = (availableBalance * percentage) / 100;
    setAmount(quickAmount.toFixed(2));
    hapticFeedback.medium();
  }, [accountData]);

  // Enhanced order submission with animation
  const handleOrderSubmit = useCallback(async () => {
    if (!amount) return;
    
    hapticFeedback.success();
    
    const orderData = {
      side: orderSide,
      type: orderType,
      amount: parseFloat(amount),
      price: orderType === 'limit' ? parseFloat(price) : currentPrice,
      leverage,
      symbol: selectedPair
    };
    
    // Visual feedback
    const submitButton = document.querySelector('[data-submit="true"]') as HTMLElement;
    if (submitButton) {
      submitButton.style.transform = 'scale(0.95)';
      setTimeout(() => {
        submitButton.style.transform = '';
      }, 150);
    }
    
    await onPlaceOrder(orderData);
    setAmount('');
    setPrice('');
  }, [orderSide, orderType, amount, price, leverage, currentPrice, selectedPair, onPlaceOrder]);

  // Position swipe actions
  const handlePositionSwipe = useCallback((positionId: string, direction: 'left' | 'right') => {
    hapticFeedback.medium();
    
    if (direction === 'left') {
      // Swipe left to close position
      console.log('Close position:', positionId);
    } else if (direction === 'right') {
      // Swipe right to add to position
      console.log('Add to position:', positionId);
    }
  }, []);

  const totalPnl = positions.reduce((sum, pos) => sum + pos.pnl, 0);

  if (isLoading) {
    return (
      <div className={`${className} h-screen flex flex-col bg-surface-0`}>
        <Loading variant="spinner" size="lg" message="Loading trading interface..." overlay />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`${className} h-screen flex flex-col bg-surface-0 overflow-hidden relative`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Enhanced Mobile Header */}
      <div className="bg-gradient-to-r from-surface-1 to-surface-2 border-b border-default/30 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-primary">{selectedPair}</h1>
            <Badge variant="outline" className="text-xs animate-pulse">
              <div className="w-1.5 h-1.5 bg-profit rounded-full mr-1 animate-pulse" />
              Live
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <EnhancedButton size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Search className="w-4 h-4" />
            </EnhancedButton>
            <EnhancedButton size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Settings className="w-4 h-4" />
            </EnhancedButton>
          </div>
        </div>
        
        {/* Animated Price Display */}
        <div className="mt-2">
          <div 
            className={`text-2xl font-black font-mono text-primary transition-all duration-300 ${
              priceAnimation === 'up' ? 'text-profit scale-105' : 
              priceAnimation === 'down' ? 'text-loss scale-105' : ''
            }`}
          >
            ${currentPrice.toLocaleString()}
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <Badge 
              variant="outline" 
              className={`transition-all duration-300 ${
                priceAnimation === 'up' ? 'bg-profit/20 border-profit/40 text-profit' :
                priceAnimation === 'down' ? 'bg-loss/20 border-loss/40 text-loss' :
                'bg-profit/10 border-profit/30 text-profit'
              }`}
            >
              {priceAnimation === 'up' ? <ArrowUp className="w-3 h-3 mr-1" /> : 
               priceAnimation === 'down' ? <ArrowDown className="w-3 h-3 mr-1" /> : 
               <TrendingUp className="w-3 h-3 mr-1" />}
              +2.34% (24h)
            </Badge>
            <span className="text-secondary">Vol: 2.1M</span>
          </div>
        </div>
      </div>

      {/* Enhanced Account Summary */}
      <div className="bg-surface-1/50 border-b border-default/20 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-river-blue" />
            <span className="text-sm font-semibold text-secondary">Portfolio</span>
            <EnhancedButton 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="h-6 w-6 p-0"
              haptic={true}
            >
              {isBalanceVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </EnhancedButton>
          </div>
          
          <div className={`text-right transition-all duration-300 ${totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            <div className="text-lg font-bold">
              {isBalanceVisible ? (
                `${totalPnl >= 0 ? '+' : ''}$${Math.abs(totalPnl).toLocaleString()}`
              ) : '••••••'}
            </div>
            <div className="text-xs">Unrealized P&L</div>
          </div>
        </div>
        
        {isBalanceVisible && (
          <div className="grid grid-cols-3 gap-3 mt-3 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-surface-2/60 rounded-lg p-2 text-center backdrop-blur-sm">
              <div className="text-xs text-secondary">Balance</div>
              <div className="font-bold text-primary">${accountData.balance.toLocaleString()}</div>
            </div>
            <div className="bg-surface-2/60 rounded-lg p-2 text-center backdrop-blur-sm">
              <div className="text-xs text-secondary">Equity</div>
              <div className="font-bold text-river-blue">${accountData.equity.toLocaleString()}</div>
            </div>
            <div className="bg-surface-2/60 rounded-lg p-2 text-center backdrop-blur-sm">
              <div className="text-xs text-secondary">Margin</div>
              <div className="font-bold text-loss">${accountData.marginUsed.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Tab Navigation with Gesture Indicators */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 my-2 h-11 bg-surface-2/80 relative">
          <div className="absolute bottom-0 left-0 text-xs text-muted px-2 py-1">
            ← swipe →
          </div>
          <TabsTrigger value="trade" className="font-semibold transition-all duration-200">
            <DollarSign className="w-4 h-4 mr-2" />
            Trade
          </TabsTrigger>
          <TabsTrigger value="positions" className="font-semibold transition-all duration-200">
            <BarChart3 className="w-4 h-4 mr-2" />
            Positions
          </TabsTrigger>
          <TabsTrigger value="charts" className="font-semibold transition-all duration-200">
            <Activity className="w-4 h-4 mr-2" />
            Charts
          </TabsTrigger>
        </TabsList>

        {/* Enhanced Trading Tab */}
        <TabsContent value="trade" className="flex-1 px-4 space-y-4 animate-[slideIn_0.3s_ease-out]">
          <div ref={orderFormRef}>
            {/* Enhanced Order Side Selection */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <EnhancedButton
                variant={orderSide === 'buy' ? 'buy' : 'outline'}
                onClick={() => setOrderSide('buy')}
                onMouseDown={() => handleLongPress('buy')}
                data-side="buy"
                className="h-12 font-bold transition-all duration-200"
                haptic={true}
                ripple={true}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Buy
              </EnhancedButton>
              <EnhancedButton
                variant={orderSide === 'sell' ? 'sell' : 'outline'}
                onClick={() => setOrderSide('sell')}
                onMouseDown={() => handleLongPress('sell')}
                data-side="sell"
                className="h-12 font-bold transition-all duration-200"
                haptic={true}
                ripple={true}
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Sell
              </EnhancedButton>
            </div>

            {/* Enhanced Order Type Toggle */}
            <div className="flex bg-surface-2/60 rounded-lg p-1 mb-4">
              <EnhancedButton
                size="sm"
                variant={orderType === 'market' ? 'primary' : 'ghost'}
                onClick={() => setOrderType('market')}
                className="flex-1 h-9 font-medium"
                haptic={true}
              >
                <Zap className="w-3 h-3 mr-1" />
                Market
              </EnhancedButton>
              <EnhancedButton
                size="sm"
                variant={orderType === 'limit' ? 'primary' : 'ghost'}
                onClick={() => setOrderType('limit')}
                className="flex-1 h-9 font-medium"
                haptic={true}
              >
                <Target className="w-3 h-3 mr-1" />
                Limit
              </EnhancedButton>
            </div>

            {/* Limit Price Input */}
            {orderType === 'limit' && (
              <div className="mb-4 animate-[slideDown_0.2s_ease-out]">
                <label className="text-sm font-semibold text-secondary block mb-2">
                  Limit Price (USDT)
                </label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={currentPrice.toString()}
                  className="h-12 text-lg font-medium bg-surface-2/80 transition-all duration-200 focus:ring-2 focus:ring-river-blue/50"
                />
              </div>
            )}

            {/* Amount Input with Quick Buttons */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-secondary block mb-2">
                Amount (USDT)
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 text-lg font-medium bg-surface-2/80 mb-3 transition-all duration-200 focus:ring-2 focus:ring-river-blue/50"
              />
              
              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((percentage) => (
                  <EnhancedButton
                    key={percentage}
                    variant="outline"
                    size="sm"
                    onClick={() => calculateQuickAmount(percentage)}
                    className="h-9 text-sm font-medium bg-surface-2/40 border-default/40 transition-all duration-200 hover:scale-105"
                    haptic={true}
                  >
                    {percentage}%
                  </EnhancedButton>
                ))}
              </div>
            </div>

            {/* Enhanced Leverage Control */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-secondary">Leverage</label>
                <div className="flex items-center space-x-2 bg-surface-2/60 px-3 py-1 rounded-lg">
                  <EnhancedButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setLeverage(Math.max(1, leverage - 1))}
                    className="h-6 w-6 p-0"
                    haptic={true}
                  >
                    <Minus className="w-3 h-3" />
                  </EnhancedButton>
                  <span className={`text-lg font-bold min-w-[32px] text-center transition-colors duration-200 ${
                    leverage <= 10 ? 'text-profit' : leverage <= 50 ? 'text-loss' : 'text-danger'
                  }`}>
                    {leverage}x
                  </span>
                  <EnhancedButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setLeverage(Math.min(100, leverage + 1))}
                    className="h-6 w-6 p-0"
                    haptic={true}
                  >
                    <Plus className="w-3 h-3" />
                  </EnhancedButton>
                </div>
              </div>
              
              {/* Gesture-enabled Leverage Slider */}
              <div 
                ref={leverageSliderRef}
                className="relative h-2 bg-surface-2/60 rounded-full cursor-pointer"
                onTouchMove={handleLeverageGesture}
                onMouseMove={handleLeverageGesture}
              >
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-profit to-loss rounded-full transition-all duration-200"
                  style={{ width: `${(leverage - 1) / 99 * 100}%` }}
                />
                <div 
                  className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-lg transform -translate-y-1/2 transition-all duration-200"
                  style={{ left: `calc(${(leverage - 1) / 99 * 100}% - 8px)` }}
                />
              </div>
              
              {/* Quick Leverage Buttons */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[5, 10, 25, 50].map((lev) => (
                  <EnhancedButton
                    key={lev}
                    variant={leverage === lev ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setLeverage(lev)}
                    className="h-8 text-xs font-medium transition-all duration-200"
                    haptic={true}
                  >
                    {lev}x
                  </EnhancedButton>
                ))}
              </div>
            </div>

            {/* Risk Preview */}
            {amount && (
              <div className="bg-surface-2/50 rounded-lg p-3 space-y-2 mb-4 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Required Margin:</span>
                  <span className="font-bold text-river-blue">
                    ${(parseFloat(amount) / leverage).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Est. Liq. Price:</span>
                  <span className="font-bold text-danger">
                    ${(currentPrice * (orderSide === 'buy' ? 0.9 : 1.1)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Trading Fee:</span>
                  <span className="font-bold text-loss">
                    ${(parseFloat(amount) * 0.0006).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Enhanced Positions Tab */}
        <TabsContent value="positions" className="flex-1 px-4 animate-[slideIn_0.3s_ease-out]">
          {positions.length > 0 ? (
            <div className="space-y-3">
              {positions.map((position) => (
                <Card 
                  key={position.id} 
                  className="bg-surface-1/60 border border-default/30 cursor-pointer transition-all duration-200 hover:shadow-lg"
                  onTouchStart={(e) => {
                    // Setup for swipe gesture
                    const startX = e.touches[0].clientX;
                    const handleTouchEnd = (endEvent: TouchEvent) => {
                      const endX = endEvent.changedTouches[0].clientX;
                      const diff = endX - startX;
                      if (Math.abs(diff) > 50) {
                        handlePositionSwipe(position.id, diff > 0 ? 'right' : 'left');
                      }
                    };
                    document.addEventListener('touchend', handleTouchEnd, { once: true });
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={position.side === 'long' ? 'default' : 'destructive'}
                          className="transition-all duration-200"
                        >
                          {position.side === 'long' ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {position.side.toUpperCase()}
                        </Badge>
                        <span className="font-bold">{position.symbol}</span>
                        <span className="text-xs text-muted">{position.leverage}x</span>
                      </div>
                      
                      <div className={`text-right transition-all duration-200 ${position.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                        <div className="font-bold">
                          {position.pnl >= 0 ? '+' : ''}${Math.abs(position.pnl).toLocaleString()}
                        </div>
                        <div className="text-xs">
                          ({position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                      <div>
                        <div className="text-secondary">Size</div>
                        <div className="font-bold">{position.size}</div>
                      </div>
                      <div>
                        <div className="text-secondary">Entry</div>
                        <div className="font-bold">${position.entryPrice.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-secondary">Mark</div>
                        <div className="font-bold">${position.markPrice.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <EnhancedButton 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 h-8 text-xs"
                        haptic={true}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </EnhancedButton>
                      <EnhancedButton 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 h-8 text-xs"
                        haptic={true}
                      >
                        <Minus className="w-3 h-3 mr-1" />
                        Reduce
                      </EnhancedButton>
                      <EnhancedButton 
                        size="sm" 
                        variant="danger" 
                        className="flex-1 h-8 text-xs"
                        haptic={true}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Close
                      </EnhancedButton>
                    </div>
                    
                    <div className="text-xs text-muted mt-2 text-center">
                      ← swipe left to close • swipe right to add →
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-center">
              <div className="animate-[fadeIn_0.5s_ease-out]">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <div className="text-lg font-medium mb-1">No positions</div>
                <div className="text-sm text-muted">Open a position to start trading</div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="flex-1 p-4 animate-[slideIn_0.3s_ease-out]">
          <TradingSkeleton.Chart />
        </TabsContent>
      </Tabs>

      {/* Enhanced Bottom Trading Button */}
      <div className="bg-surface-1 border-t border-default/30 p-4 flex-shrink-0">
        <EnhancedButton
          onClick={handleOrderSubmit}
          disabled={!amount}
          variant={orderSide === 'buy' ? 'buy' : 'sell'}
          className={`w-full h-14 text-lg font-bold transition-all duration-300 ${
            orderSide === 'buy'
              ? 'shadow-lg shadow-profit/25 hover:shadow-xl hover:shadow-profit/30'
              : 'shadow-lg shadow-loss/25 hover:shadow-xl hover:shadow-loss/30'
          }`}
          data-submit="true"
          haptic={true}
          ripple={true}
          loading={isLoading}
          loadingText="Placing Order..."
        >
          <div className="flex items-center justify-center space-x-2">
            {orderSide === 'buy' ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            <span>
              {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedPair.split('/')[0]}
            </span>
            {amount && (
              <span className="text-sm opacity-90">
                (${parseFloat(amount).toLocaleString()})
              </span>
            )}
          </div>
        </EnhancedButton>
      </div>
    </div>
  );
};

export default GestureEnhancedTradingInterface;