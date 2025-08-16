import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Settings, 
  Plus,
  Minus,
  Target,
  Shield,
  Wallet,
  Clock,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Eye,
  EyeOff,
  Zap,
  X,
  Menu,
  Search,
  Star,
  Activity,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import '../styles/riverbit-colors.css';

interface MobilePosition {
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

interface MobileTradingInterfaceProps {
  selectedPair: string;
  currentPrice: number;
  positions: MobilePosition[];
  accountData: {
    balance: number;
    equity: number;
    marginUsed: number;
  };
  onPlaceOrder: (orderData: any) => void;
  className?: string;
}

const MobileTradingInterface: React.FC<MobileTradingInterfaceProps> = ({
  selectedPair,
  currentPrice,
  positions,
  accountData,
  onPlaceOrder,
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
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [positionDetailsOpen, setPositionDetailsOpen] = useState<string | null>(null);

  // Calculate quick amount percentages
  const calculateQuickAmount = useCallback((percentage: number) => {
    const availableBalance = accountData.balance - accountData.marginUsed;
    const amount = (availableBalance * percentage) / 100;
    setAmount(amount.toFixed(2));
  }, [accountData]);

  // Mobile-optimized order submission
  const handleOrderSubmit = useCallback(() => {
    const orderData = {
      side: orderSide,
      type: orderType,
      amount: parseFloat(amount),
      price: orderType === 'limit' ? parseFloat(price) : currentPrice,
      leverage,
      symbol: selectedPair
    };
    
    onPlaceOrder(orderData);
    setAmount('');
    setPrice('');
    setQuickOrderOpen(false);
  }, [orderSide, orderType, amount, price, leverage, currentPrice, selectedPair, onPlaceOrder]);

  // Total portfolio P&L
  const totalPnl = positions.reduce((sum, pos) => sum + pos.pnl, 0);

  return (
    <div className={`${className} h-screen flex flex-col bg-surface-0 overflow-hidden`}>
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-surface-1 to-surface-2 border-b border-default/30 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-primary">{selectedPair}</h1>
            <Badge variant="outline" className="text-xs">
              <div className="w-1.5 h-1.5 bg-profit rounded-full mr-1 animate-pulse" />
              Live
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Search className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Price Display */}
        <div className="mt-2">
          <div className="text-2xl font-black font-mono text-primary">
            ${currentPrice.toLocaleString()}
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <Badge variant="outline" className="bg-profit/10 border-profit/30 text-profit">
              ↗ +2.34% (24h)
            </Badge>
            <span className="text-secondary">Vol: 2.1M</span>
          </div>
        </div>
      </div>

      {/* Mobile Account Summary - Collapsible */}
      <div className="bg-surface-1/50 border-b border-default/20 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-river-blue" />
            <span className="text-sm font-semibold text-secondary">Portfolio</span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="h-6 w-6 p-0"
            >
              {isBalanceVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </Button>
          </div>
          
          <div className={`text-right ${totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            <div className="text-lg font-bold">
              {isBalanceVisible ? (
                `${totalPnl >= 0 ? '+' : ''}$${Math.abs(totalPnl).toLocaleString()}`
              ) : '••••••'}
            </div>
            <div className="text-xs">Unrealized P&L</div>
          </div>
        </div>
        
        {isBalanceVisible && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-surface-2/60 rounded-lg p-2 text-center">
              <div className="text-xs text-secondary">Balance</div>
              <div className="font-bold text-primary">${accountData.balance.toLocaleString()}</div>
            </div>
            <div className="bg-surface-2/60 rounded-lg p-2 text-center">
              <div className="text-xs text-secondary">Equity</div>
              <div className="font-bold text-river-blue">${accountData.equity.toLocaleString()}</div>
            </div>
            <div className="bg-surface-2/60 rounded-lg p-2 text-center">
              <div className="text-xs text-secondary">Margin</div>
              <div className="font-bold text-loss">${accountData.marginUsed.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 my-2 h-11 bg-surface-2/80">
          <TabsTrigger value="trade" className="font-semibold">
            <DollarSign className="w-4 h-4 mr-2" />
            Trade
          </TabsTrigger>
          <TabsTrigger value="positions" className="font-semibold">
            <BarChart3 className="w-4 h-4 mr-2" />
            Positions
          </TabsTrigger>
          <TabsTrigger value="charts" className="font-semibold">
            <Activity className="w-4 h-4 mr-2" />
            Charts
          </TabsTrigger>
        </TabsList>

        {/* Trading Tab Content */}
        <TabsContent value="trade" className="flex-1 px-4 space-y-4">
          {/* Order Side Selection */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={orderSide === 'buy' ? 'default' : 'outline'}
              onClick={() => setOrderSide('buy')}
              className={`h-12 font-bold transition-all ${
                orderSide === 'buy' 
                  ? 'bg-profit hover:bg-profit/90 text-white shadow-lg' 
                  : 'border-profit/30 text-profit hover:bg-profit/10'
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Buy
            </Button>
            <Button
              variant={orderSide === 'sell' ? 'default' : 'outline'}
              onClick={() => setOrderSide('sell')}
              className={`h-12 font-bold transition-all ${
                orderSide === 'sell' 
                  ? 'bg-loss hover:bg-loss/90 text-white shadow-lg' 
                  : 'border-loss/30 text-loss hover:bg-loss/10'
              }`}
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Sell
            </Button>
          </div>

          {/* Order Type Toggle */}
          <div className="flex bg-surface-2/60 rounded-lg p-1">
            <Button
              size="sm"
              variant={orderType === 'market' ? 'default' : 'ghost'}
              onClick={() => setOrderType('market')}
              className="flex-1 h-9 font-medium"
            >
              <Zap className="w-3 h-3 mr-1" />
              Market
            </Button>
            <Button
              size="sm"
              variant={orderType === 'limit' ? 'default' : 'ghost'}
              onClick={() => setOrderType('limit')}
              className="flex-1 h-9 font-medium"
            >
              <Target className="w-3 h-3 mr-1" />
              Limit
            </Button>
          </div>

          {/* Limit Price Input */}
          {orderType === 'limit' && (
            <div>
              <label className="text-sm font-semibold text-secondary block mb-2">
                Limit Price (USDT)
              </label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currentPrice.toString()}
                className="h-12 text-lg font-medium bg-surface-2/80"
              />
            </div>
          )}

          {/* Amount Input with Quick Buttons */}
          <div>
            <label className="text-sm font-semibold text-secondary block mb-2">
              Amount (USDT)
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-12 text-lg font-medium bg-surface-2/80 mb-3"
            />
            
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((percentage) => (
                <Button
                  key={percentage}
                  variant="outline"
                  size="sm"
                  onClick={() => calculateQuickAmount(percentage)}
                  className="h-9 text-sm font-medium bg-surface-2/40 border-default/40"
                >
                  {percentage}%
                </Button>
              ))}
            </div>
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-secondary">Leverage</label>
              <div className="flex items-center space-x-2 bg-surface-2/60 px-3 py-1 rounded-lg">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLeverage(Math.max(1, leverage - 1))}
                  className="h-6 w-6 p-0"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className={`text-lg font-bold min-w-[32px] text-center ${
                  leverage <= 10 ? 'text-profit' : leverage <= 50 ? 'text-loss' : 'text-danger'
                }`}>
                  {leverage}x
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLeverage(Math.min(100, leverage + 1))}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {/* Quick Leverage Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 25, 50].map((lev) => (
                <Button
                  key={lev}
                  variant={leverage === lev ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLeverage(lev)}
                  className="h-8 text-xs font-medium"
                >
                  {lev}x
                </Button>
              ))}
            </div>
          </div>

          {/* Risk Preview */}
          {amount && (
            <div className="bg-surface-2/50 rounded-lg p-3 space-y-2">
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

          {/* Advanced Options Toggle */}
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full h-10 text-sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Advanced Options
            {showAdvanced ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>

          {showAdvanced && (
            <div className="space-y-3 p-3 bg-surface-2/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">Reduce Only</span>
                <input type="checkbox" className="toggle" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Post Only</span>
                <input type="checkbox" className="toggle" />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Positions Tab Content */}
        <TabsContent value="positions" className="flex-1 px-4">
          {positions.length > 0 ? (
            <div className="space-y-3">
              {positions.map((position) => (
                <Card key={position.id} className="bg-surface-1/60 border border-default/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant={position.side === 'long' ? 'default' : 'destructive'}>
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
                      
                      <div className={`text-right ${position.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                        <div className="font-bold">
                          {position.pnl >= 0 ? '+' : ''}${Math.abs(position.pnl).toLocaleString()}
                        </div>
                        <div className="text-xs">
                          ({position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-xs">
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
                    
                    <div className="flex space-x-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                        <Minus className="w-3 h-3 mr-1" />
                        Reduce
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs">
                        <X className="w-3 h-3 mr-1" />
                        Close
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <div className="text-lg font-medium mb-1">No positions</div>
                <div className="text-sm text-muted">Open a position to start trading</div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Charts Tab Content */}
        <TabsContent value="charts" className="flex-1 p-4">
          <div className="bg-surface-1/60 rounded-lg border border-default/30 h-full flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <div className="text-lg font-medium mb-1">Chart Integration</div>
              <div className="text-sm text-muted">TradingView mobile chart would go here</div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating Action Button for Quick Order */}
      <div className="fixed bottom-6 right-6 z-50">
        <Sheet open={quickOrderOpen} onOpenChange={setQuickOrderOpen}>
          <SheetTrigger asChild>
            <Button 
              size="lg"
              className={`w-14 h-14 rounded-full shadow-2xl ${
                orderSide === 'buy' 
                  ? 'bg-profit hover:bg-profit/90' 
                  : 'bg-loss hover:bg-loss/90'
              } text-white`}
            >
              <Zap className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] bg-surface-1">
            <SheetHeader>
              <SheetTitle>Quick Order</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-4">
              {/* Quick order form would go here */}
              <div className="text-center">
                <div className="text-lg">Quick Order Interface</div>
                <div className="text-sm text-muted">Swipe up for full trading panel</div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Fixed Bottom Trading Button */}
      <div className="bg-surface-1 border-t border-default/30 p-4 flex-shrink-0">
        <Button
          onClick={handleOrderSubmit}
          disabled={!amount}
          className={`w-full h-14 text-lg font-bold transition-all duration-200 ${
            orderSide === 'buy'
              ? 'bg-profit hover:bg-profit/90 text-white shadow-lg shadow-profit/25'
              : 'bg-loss hover:bg-loss/90 text-white shadow-lg shadow-loss/25'
          }`}
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
        </Button>
      </div>
    </div>
  );
};

export default MobileTradingInterface;