import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { EnhancedButton } from './ui/enhanced-button';
import { Skeleton } from './ui/enhanced-skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Volume2,
  Zap,
  Eye,
  Maximize2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Percent,
  Clock,
  Target
} from 'lucide-react';
import { hapticFeedback, performanceUtils } from '../utils/animationUtils';

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
}

interface TradeEntry {
  id: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

interface EnhancedRealTimeDisplayProps {
  symbol: string;
  initialPrice?: number;
  onPriceClick?: (price: number) => void;
  className?: string;
}

const EnhancedRealTimeDisplay: React.FC<EnhancedRealTimeDisplayProps> = ({
  symbol,
  initialPrice = 45000,
  onPriceClick,
  className = ''
}) => {
  const [priceData, setPriceData] = useState<PriceData>({
    price: initialPrice,
    change: 1234.56,
    changePercent: 2.84,
    volume: 2150000,
    high24h: 46800,
    low24h: 43200,
    timestamp: Date.now(),
  });

  const [orderBook, setOrderBook] = useState<OrderBookData>({
    bids: [],
    asks: [],
    spread: 0.5,
    spreadPercent: 0.001,
  });

  const [recentTrades, setRecentTrades] = useState<TradeEntry[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [priceAnimation, setPriceAnimation] = useState<'up' | 'down' | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const priceRef = useRef<HTMLDivElement>(null);
  const orderBookRef = useRef<HTMLDivElement>(null);
  const tradesRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastPriceRef = useRef(initialPrice);

  // Generate realistic orderbook data
  const generateOrderBook = useCallback((basePrice: number): OrderBookData => {
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];
    
    // Generate bids (buy orders) below current price
    for (let i = 0; i < 15; i++) {
      const price = basePrice - (i + 1) * (Math.random() * 2 + 0.5);
      const size = Math.random() * 5 + 0.1;
      const total = bids.reduce((sum, bid) => sum + bid.size, 0) + size;
      bids.push({ price, size, total });
    }

    // Generate asks (sell orders) above current price
    for (let i = 0; i < 15; i++) {
      const price = basePrice + (i + 1) * (Math.random() * 2 + 0.5);
      const size = Math.random() * 5 + 0.1;
      const total = asks.reduce((sum, ask) => sum + ask.size, 0) + size;
      asks.push({ price, size, total });
    }

    const spread = asks[0]?.price - bids[0]?.price || 0;
    const spreadPercent = spread / basePrice;

    return { bids, asks, spread, spreadPercent };
  }, []);

  // Generate realistic trade data
  const generateTrade = useCallback((currentPrice: number): TradeEntry => {
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const priceVariation = (Math.random() - 0.5) * 10;
    const price = currentPrice + priceVariation;
    const size = Math.random() * 2 + 0.01;
    
    return {
      id: `${Date.now()}-${Math.random()}`,
      price,
      size,
      side,
      timestamp: Date.now(),
    };
  }, []);

  // Smooth price animation
  const animatePrice = useCallback((newPrice: number) => {
    const oldPrice = lastPriceRef.current;
    const direction = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : null;
    
    if (direction) {
      setPriceAnimation(direction);
      
      // Haptic feedback for significant moves
      const changePercent = Math.abs((newPrice - oldPrice) / oldPrice);
      if (changePercent > 0.001) { // 0.1% change
        hapticFeedback.light();
      }
      
      // Price pulse effect
      if (priceRef.current) {
        priceRef.current.style.transform = 'scale(1.02)';
        priceRef.current.style.transition = 'transform 0.15s ease-out';
        
        setTimeout(() => {
          if (priceRef.current) {
            priceRef.current.style.transform = 'scale(1)';
          }
        }, 150);
      }
      
      // Clear animation after duration
      setTimeout(() => setPriceAnimation(null), 600);
    }
    
    lastPriceRef.current = newPrice;
  }, []);

  // Simulated real-time data updates
  useEffect(() => {
    if (!isAutoRefresh) return;

    const updateData = () => {
      const now = Date.now();
      const timeDiff = now - lastUpdate;
      
      // Update price with realistic volatility
      const volatility = 0.0002; // 0.02% base volatility
      const priceChange = (Math.random() - 0.5) * priceData.price * volatility;
      const newPrice = Math.max(0.01, priceData.price + priceChange);
      
      animatePrice(newPrice);
      
      // Update price data
      setPriceData(prev => {
        const change = newPrice - initialPrice;
        const changePercent = (change / initialPrice) * 100;
        
        return {
          ...prev,
          price: newPrice,
          change,
          changePercent,
          volume: prev.volume + Math.random() * 1000,
          timestamp: now,
        };
      });

      // Update order book
      setOrderBook(generateOrderBook(newPrice));

      // Add new trade occasionally
      if (Math.random() > 0.7) {
        const newTrade = generateTrade(newPrice);
        setRecentTrades(prev => [newTrade, ...prev.slice(0, 49)]); // Keep last 50 trades
      }

      setLastUpdate(now);
    };

    // Use RAF for smooth updates
    const animate = () => {
      updateData();
      animationFrameRef.current = requestAnimationFrame(() => {
        setTimeout(animate, 100 + Math.random() * 200); // Variable interval
      });
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAutoRefresh, lastUpdate, priceData.price, generateOrderBook, generateTrade, animatePrice, initialPrice]);

  // Manual refresh with animation
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticFeedback.medium();
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate fresh data
    const newPrice = priceData.price + (Math.random() - 0.5) * 100;
    animatePrice(newPrice);
    
    setPriceData(prev => ({
      ...prev,
      price: newPrice,
      volume: prev.volume + Math.random() * 10000,
      timestamp: Date.now(),
    }));
    
    setOrderBook(generateOrderBook(newPrice));
    setRefreshing(false);
  }, [priceData.price, generateOrderBook, animatePrice]);

  // Click handlers with haptic feedback
  const handlePriceClick = useCallback(() => {
    hapticFeedback.light();
    onPriceClick?.(priceData.price);
  }, [priceData.price, onPriceClick]);

  const handleOrderBookClick = useCallback((price: number) => {
    hapticFeedback.light();
    onPriceClick?.(price);
  }, [onPriceClick]);

  // Memoized components for performance
  const PriceDisplay = useMemo(() => (
    <Card className="bg-gradient-to-br from-surface-1 to-surface-2 border-default/30 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-river-blue" />
            {symbol} Price
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${isConnected ? 'text-profit' : 'text-loss'}`}>
              <div className={`w-2 h-2 rounded-full mr-1 ${
                isConnected ? 'bg-profit animate-pulse' : 'bg-loss'
              }`} />
              {isConnected ? 'Live' : 'Disconnected'}
            </Badge>
            <EnhancedButton
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              loading={refreshing}
              className="h-7 w-7 p-0"
              haptic={true}
            >
              <RefreshCw className="h-3 w-3" />
            </EnhancedButton>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div 
          ref={priceRef}
          className={`text-3xl font-black font-mono cursor-pointer transition-all duration-300 ${
            priceAnimation === 'up' ? 'text-profit scale-105' : 
            priceAnimation === 'down' ? 'text-loss scale-105' : 
            'text-primary'
          }`}
          onClick={handlePriceClick}
        >
          ${priceData.price.toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })}
        </div>
        
        <div className="flex items-center gap-4 mt-2">
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            priceData.changePercent >= 0 ? 'text-profit' : 'text-loss'
          }`}>
            {priceData.changePercent >= 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {priceData.changePercent >= 0 ? '+' : ''}{priceData.changePercent.toFixed(2)}%
          </div>
          
          <div className={`text-sm font-mono ${
            priceData.change >= 0 ? 'text-profit' : 'text-loss'
          }`}>
            {priceData.change >= 0 ? '+' : ''}${priceData.change.toFixed(2)}
          </div>
          
          <div className="text-sm text-secondary">
            Vol: {(priceData.volume / 1000000).toFixed(1)}M
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-default/20">
          <div>
            <div className="text-xs text-secondary">24h High</div>
            <div className="text-sm font-bold text-profit">
              ${priceData.high24h.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-secondary">24h Low</div>
            <div className="text-sm font-bold text-loss">
              ${priceData.low24h.toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  ), [symbol, priceData, priceAnimation, isConnected, refreshing, handleRefresh, handlePriceClick]);

  const OrderBookDisplay = useMemo(() => (
    <Card className="bg-surface-1/60 border-default/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-river-blue" />
          Order Book
        </CardTitle>
        <div className="text-xs text-secondary">
          Spread: ${orderBook.spread.toFixed(2)} ({(orderBook.spreadPercent * 100).toFixed(3)}%)
        </div>
      </CardHeader>
      
      <CardContent ref={orderBookRef} className="p-0">
        <div className="h-64 overflow-hidden">
          {/* Asks (Sell Orders) */}
          <div className="space-y-1 p-3 pb-1">
            {orderBook.asks.slice(0, 8).reverse().map((ask, index) => (
              <div 
                key={`ask-${index}`}
                className="flex justify-between items-center text-xs cursor-pointer hover:bg-loss/10 p-1 rounded transition-colors duration-150"
                onClick={() => handleOrderBookClick(ask.price)}
              >
                <span className="text-loss font-mono">
                  ${ask.price.toFixed(2)}
                </span>
                <span className="text-secondary font-mono">
                  {ask.size.toFixed(3)}
                </span>
                <span className="text-muted font-mono">
                  {ask.total.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
          
          {/* Spread Indicator */}
          <div className="border-t border-b border-default/30 py-2 px-3 bg-surface-2/30">
            <div className="text-center text-xs font-bold text-river-blue">
              Spread: ${orderBook.spread.toFixed(2)}
            </div>
          </div>
          
          {/* Bids (Buy Orders) */}
          <div className="space-y-1 p-3 pt-1">
            {orderBook.bids.slice(0, 8).map((bid, index) => (
              <div 
                key={`bid-${index}`}
                className="flex justify-between items-center text-xs cursor-pointer hover:bg-profit/10 p-1 rounded transition-colors duration-150"
                onClick={() => handleOrderBookClick(bid.price)}
              >
                <span className="text-profit font-mono">
                  ${bid.price.toFixed(2)}
                </span>
                <span className="text-secondary font-mono">
                  {bid.size.toFixed(3)}
                </span>
                <span className="text-muted font-mono">
                  {bid.total.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-3 border-t border-default/20 text-xs text-muted text-center">
          Click any price to use in order form
        </div>
      </CardContent>
    </Card>
  ), [orderBook, handleOrderBookClick]);

  const RecentTradesDisplay = useMemo(() => (
    <Card className="bg-surface-1/60 border-default/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-river-blue" />
          Recent Trades
        </CardTitle>
      </CardHeader>
      
      <CardContent ref={tradesRef} className="p-0">
        <div className="h-64 overflow-y-auto">
          {recentTrades.length > 0 ? (
            <div className="space-y-1 p-3">
              {recentTrades.map((trade, index) => (
                <div 
                  key={trade.id}
                  className={`flex justify-between items-center text-xs p-1 rounded transition-all duration-300 ${
                    index === 0 ? 'animate-[fadeIn_0.3s_ease-out] bg-surface-2/50' : ''
                  }`}
                >
                  <span className={`font-mono font-semibold ${
                    trade.side === 'buy' ? 'text-profit' : 'text-loss'
                  }`}>
                    ${trade.price.toFixed(2)}
                  </span>
                  <span className="text-secondary font-mono">
                    {trade.size.toFixed(3)}
                  </span>
                  <span className="text-muted">
                    {new Date(trade.timestamp).toLocaleTimeString('en-US', { 
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-secondary">
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm">Waiting for trades...</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  ), [recentTrades]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-primary">Market Data</h2>
        <div className="flex items-center gap-2">
          <EnhancedButton
            size="sm"
            variant={isAutoRefresh ? 'primary' : 'outline'}
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className="text-xs"
            haptic={true}
          >
            <Zap className="h-3 w-3 mr-1" />
            Auto
          </EnhancedButton>
        </div>
      </div>

      {/* Main Price Display */}
      {PriceDisplay}

      {/* Order Book and Trades Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {OrderBookDisplay}
        {RecentTradesDisplay}
      </div>
    </div>
  );
};

export default EnhancedRealTimeDisplay;