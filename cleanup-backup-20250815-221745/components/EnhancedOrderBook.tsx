import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useTradingViewPrice } from '../hooks/useTradingViewPrices';
import { 
  MoreHorizontal, 
  Settings, 
  Maximize2, 
  TrendingUp, 
  TrendingDown,
  Volume2,
  Zap,
  Eye,
  MousePointer
} from 'lucide-react';
import '../styles/riverbit-colors.css';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  depth: number;
  id: string;
  timestamp: number;
  isNew?: boolean;
  orders?: number; // Number of orders at this level
  avgOrderSize?: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastPrice: number;
  spread: number;
  spreadPercent: number;
  volume24h: number;
  priceChange24h: number;
}

interface EnhancedOrderBookProps {
  symbol: string;
  currentPrice?: number;
  className?: string;
  onPriceClick?: (price: number) => void;
  compact?: boolean;
}

const EnhancedOrderBook: React.FC<EnhancedOrderBookProps> = ({
  symbol,
  currentPrice = 43000,
  className = '',
  onPriceClick,
  compact = false
}) => {
  const { priceData, loading } = useTradingViewPrice(symbol);
  const realPrice = priceData?.price || currentPrice;
  
  const [orderBook, setOrderBook] = useState<OrderBookData>(() => generateInitialOrderBook(realPrice));
  const [isRunning, setIsRunning] = useState(true);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'bids' | 'asks'>('full');
  const [showOrders, setShowOrders] = useState(false);
  const [aggregation, setAggregation] = useState(0.01); // Price aggregation level

  // Generate professional order book data
  function generateInitialOrderBook(price: number): OrderBookData {
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];
    
    // Generate more realistic bid/ask data with varying depths
    for (let i = 0; i < 20; i++) {
      // Bids (decreasing prices)
      const bidPriceDiff = (i + 1) * (aggregation + Math.random() * aggregation * 2);
      const bidPrice = price - bidPriceDiff;
      const bidAmount = (Math.random() * 8 + 0.5) * (1 + Math.random() * 0.5); // Realistic volumes
      const bidOrders = Math.floor(Math.random() * 5) + 1;
      
      const bidTotal = i === 0 ? bidAmount : bids[i-1].total + bidAmount;
      
      bids.push({
        price: bidPrice,
        amount: bidAmount,
        total: bidTotal,
        depth: Math.min((bidTotal / 50) * 100, 100),
        orders: bidOrders,
        avgOrderSize: bidAmount / bidOrders,
        id: `bid_${i}_${Date.now()}`,
        timestamp: Date.now()
      });

      // Asks (increasing prices) 
      const askPriceDiff = (i + 1) * (aggregation + Math.random() * aggregation * 2);
      const askPrice = price + askPriceDiff;
      const askAmount = (Math.random() * 8 + 0.5) * (1 + Math.random() * 0.5);
      const askOrders = Math.floor(Math.random() * 5) + 1;
      
      const askTotal = i === 0 ? askAmount : asks[i-1].total + askAmount;
      
      asks.push({
        price: askPrice,
        amount: askAmount,
        total: askTotal,
        depth: Math.min((askTotal / 50) * 100, 100),
        orders: askOrders,
        avgOrderSize: askAmount / askOrders,
        id: `ask_${i}_${Date.now()}`,
        timestamp: Date.now()
      });
    }

    const spread = asks[0]?.price - bids[0]?.price || 0;
    const spreadPercent = (spread / price) * 100;

    return {
      bids,
      asks,
      lastPrice: price,
      spread,
      spreadPercent,
      volume24h: Math.random() * 10000000 + 5000000, // Random 24h volume
      priceChange24h: (Math.random() - 0.5) * 5 // Random 24h change
    };
  }

  // Dynamic order book updates with more sophisticated logic
  const updateOrderBook = useCallback(() => {
    if (!isRunning) return;

    setOrderBook(prev => {
      const newBids = [...prev.bids];
      const newAsks = [...prev.asks];
      
      const updateType = Math.random();
      
      if (updateType < 0.3) {
        // 30%: Add new order at best price levels
        const isBid = Math.random() < 0.5;
        const orders = isBid ? newBids : newAsks;
        
        if (orders.length > 0) {
          const bestPrice = orders[0].price;
          const priceImprovement = isBid ? aggregation * 0.1 : -aggregation * 0.1;
          const newPrice = bestPrice + priceImprovement;
          
          const newOrder: OrderBookEntry = {
            price: newPrice,
            amount: Math.random() * 3 + 0.2,
            total: 0,
            depth: 0,
            orders: Math.floor(Math.random() * 3) + 1,
            avgOrderSize: 0,
            id: `${isBid ? 'bid' : 'ask'}_new_${Date.now()}_${Math.random()}`,
            timestamp: Date.now(),
            isNew: true
          };
          
          newOrder.avgOrderSize = newOrder.amount / newOrder.orders!;
          
          if (isBid) {
            orders.unshift(newOrder);
            orders.sort((a, b) => b.price - a.price);
          } else {
            orders.unshift(newOrder);
            orders.sort((a, b) => a.price - b.price);
          }
          
          // Recalculate totals and depths
          let runningTotal = 0;
          for (let i = 0; i < orders.length; i++) {
            runningTotal += orders[i].amount;
            orders[i].total = runningTotal;
            orders[i].depth = Math.min((runningTotal / 50) * 100, 100);
          }
          
          if (orders.length > 25) orders.splice(25);
        }
      } else if (updateType < 0.6) {
        // 30%: Modify existing orders
        const isBid = Math.random() < 0.5;
        const orders = isBid ? newBids : newAsks;
        const index = Math.floor(Math.random() * Math.min(orders.length, 8));
        
        if (orders[index]) {
          const sizeChange = (Math.random() - 0.5) * 2;
          orders[index].amount = Math.max(0.01, orders[index].amount + sizeChange);
          orders[index].isNew = true;
          
          // Recalculate dependent values
          let runningTotal = 0;
          for (let i = 0; i < orders.length; i++) {
            runningTotal += orders[i].amount;
            orders[i].total = runningTotal;
            orders[i].depth = Math.min((runningTotal / 50) * 100, 100);
          }
        }
      } else {
        // 40%: Remove orders (filled/cancelled)
        const isBid = Math.random() < 0.5;
        const orders = isBid ? newBids : newAsks;
        
        if (orders.length > 8) {
          const removeIndex = Math.floor(Math.random() * (orders.length - 5)) + 3;
          orders.splice(removeIndex, 1);
          
          // Recalculate totals
          let runningTotal = 0;
          for (let i = 0; i < orders.length; i++) {
            runningTotal += orders[i].amount;
            orders[i].total = runningTotal;
            orders[i].depth = Math.min((runningTotal / 50) * 100, 100);
          }
        }
      }
      
      // Clear new order flags after animation
      setTimeout(() => {
        setOrderBook(current => ({
          ...current,
          bids: current.bids.map(bid => ({ ...bid, isNew: false })),
          asks: current.asks.map(ask => ({ ...ask, isNew: false }))
        }));
      }, 400);
      
      const bestBid = newBids[0]?.price || realPrice;
      const bestAsk = newAsks[0]?.price || realPrice;
      const spread = bestAsk - bestBid;
      const spreadPercent = (spread / realPrice) * 100;
      
      return {
        ...prev,
        bids: newBids,
        asks: newAsks,
        lastPrice: realPrice,
        spread,
        spreadPercent
      };
    });
  }, [isRunning, realPrice, aggregation]);

  // Update interval with market hours simulation
  useEffect(() => {
    if (!isRunning) return;
    
    // Faster updates during "market hours" for realism
    const now = new Date();
    const isMarketHours = now.getHours() >= 9 && now.getHours() <= 16;
    const updateInterval = isMarketHours ? 800 + Math.random() * 1200 : 1500 + Math.random() * 2500;
    
    const interval = setInterval(updateOrderBook, updateInterval);
    return () => clearInterval(interval);
  }, [updateOrderBook, isRunning]);

  // Price formatting with proper precision
  const formatPrice = useCallback((price: number) => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 10) return price.toFixed(3);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  }, []);

  const formatAmount = useCallback((amount: number) => {
    if (amount >= 1000) return (amount / 1000).toFixed(2) + 'K';
    if (amount >= 1) return amount.toFixed(3);
    return amount.toFixed(4);
  }, []);

  // Handle price clicks for order placement
  const handlePriceClick = useCallback((price: number) => {
    setSelectedPrice(price);
    onPriceClick?.(price);
  }, [onPriceClick]);

  // Memoized data for performance
  const { displayBids, displayAsks } = useMemo(() => {
    const bidsToShow = viewMode === 'asks' ? [] : orderBook.bids.slice(0, compact ? 8 : 15);
    const asksToShow = viewMode === 'bids' ? [] : orderBook.asks.slice(0, compact ? 8 : 15);
    
    return {
      displayBids: bidsToShow,
      displayAsks: asksToShow.reverse() // Show asks from highest to lowest
    };
  }, [orderBook.bids, orderBook.asks, viewMode, compact]);

  return (
    <div className={`${className} bg-gradient-to-br from-surface-1 to-surface-2 border border-default/30 rounded-xl shadow-professional`}>
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 border-b border-default/30 bg-surface-2/50">
        <div className="flex items-center space-x-3">
          <h3 className="font-bold text-primary flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-river-blue" />
            <span>Order Book</span>
          </h3>
          
          {!loading && priceData && (
            <Badge variant="outline" className="text-xs bg-profit/10 border-profit/30 text-profit">
              <div className="w-2 h-2 bg-profit rounded-full mr-1 animate-pulse"></div>
              Live
            </Badge>
          )}
          
          <Badge variant="outline" className="text-xs font-mono">
            ±{formatPrice(aggregation)}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Mode Selector */}
          <div className="flex bg-surface-3/60 rounded-lg p-0.5">
            {['full', 'bids', 'asks'].map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={viewMode === mode ? "default" : "ghost"}
                onClick={() => setViewMode(mode as any)}
                className={`h-6 px-2 text-xs transition-all ${
                  viewMode === mode 
                    ? 'bg-river-blue text-white shadow-sm' 
                    : 'text-muted hover:text-primary'
                }`}
              >
                {mode === 'full' && <Eye className="w-3 h-3" />}
                {mode === 'bids' && <TrendingUp className="w-3 h-3 text-profit" />}
                {mode === 'asks' && <TrendingDown className="w-3 h-3 text-loss" />}
              </Button>
            ))}
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowOrders(!showOrders)}
            className="h-6 w-6 p-0 text-muted hover:text-primary"
            title="Toggle order count display"
          >
            <MousePointer className="w-3 h-3" />
          </Button>
          
          <Button
            size="sm"
            variant={isRunning ? "destructive" : "default"}
            onClick={() => setIsRunning(!isRunning)}
            className="h-6 text-xs px-2 font-medium"
          >
            {isRunning ? (
              <>
                <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                Live
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 mr-1" />
                Start
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-muted hover:text-primary"
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Enhanced Spread Information */}
      <div className="px-4 py-2 bg-surface-2/30 border-b border-default/20">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-secondary">
              Spread: <span className="font-mono text-primary font-bold">${orderBook.spread.toFixed(2)}</span>
            </span>
            <span className="text-secondary">
              ({orderBook.spreadPercent.toFixed(4)}%)
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-secondary">
              24h Vol: <span className="font-mono text-river-blue font-bold">
                ${(orderBook.volume24h / 1000000).toFixed(2)}M
              </span>
            </span>
            <span className={`font-mono font-bold ${
              orderBook.priceChange24h >= 0 ? 'text-profit' : 'text-loss'
            }`}>
              {orderBook.priceChange24h >= 0 ? '+' : ''}{orderBook.priceChange24h.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Table Header */}
      <div className="grid grid-cols-3 gap-2 px-4 py-2 text-xs text-secondary border-b border-default/20 bg-surface-1/30">
        <span className="font-semibold">Price (USDT)</span>
        <span className="text-right font-semibold">Size ({symbol.split('/')[0]})</span>
        <span className="text-right font-semibold flex items-center justify-end space-x-1">
          <span>Total</span>
          {showOrders && <span>(Orders)</span>}
        </span>
      </div>

      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {/* Enhanced Asks Section */}
        {viewMode !== 'bids' && (
          <div className="space-y-0">
            {displayAsks.map((ask, index) => (
              <div
                key={ask.id}
                className={`grid grid-cols-3 gap-2 px-4 py-1.5 text-xs relative cursor-pointer transition-all duration-200 ${
                  ask.isNew 
                    ? 'bg-loss/20 animate-pulse border-l-2 border-loss' 
                    : 'hover:bg-loss/5 hover:border-l-2 hover:border-loss/50'
                } ${selectedPrice === ask.price ? 'ring-1 ring-loss bg-loss/10' : ''}
                ${hoverPrice === ask.price ? 'bg-loss/8' : ''}`}
                onClick={() => handlePriceClick(ask.price)}
                onMouseEnter={() => setHoverPrice(ask.price)}
                onMouseLeave={() => setHoverPrice(null)}
              >
                {/* Depth Visualization */}
                <div 
                  className="absolute inset-0 bg-loss/10 transition-all duration-300"
                  style={{ width: `${ask.depth}%` }}
                />
                
                <span className="font-mono text-loss font-semibold relative z-10 flex items-center">
                  {formatPrice(ask.price)}
                  {ask.isNew && <div className="w-1 h-1 bg-loss rounded-full ml-1 animate-ping" />}
                </span>
                
                <span className="text-right font-mono font-medium text-primary relative z-10">
                  {formatAmount(ask.amount)}
                </span>
                
                <div className="text-right font-mono text-secondary relative z-10 flex items-center justify-end space-x-1">
                  <span>{formatAmount(ask.total)}</span>
                  {showOrders && (
                    <span className="text-xs text-muted">({ask.orders})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Middle Price Display */}
        {viewMode === 'full' && (
          <div className="py-4 px-4 bg-gradient-to-r from-surface-2/60 via-surface-3/60 to-surface-2/60 border-y border-default/30">
            <div className="text-center">
              <div className="text-2xl font-black font-mono text-primary mb-1 tracking-tight">
                ${formatPrice(orderBook.lastPrice)}
              </div>
              <div className="flex items-center justify-center space-x-3 text-xs">
                <Badge 
                  variant="outline" 
                  className={`font-mono ${
                    orderBook.priceChange24h >= 0 
                      ? 'bg-profit/10 border-profit/30 text-profit' 
                      : 'bg-loss/10 border-loss/30 text-loss'
                  }`}
                >
                  {orderBook.priceChange24h >= 0 ? '↗' : '↘'} 
                  {Math.abs(orderBook.priceChange24h).toFixed(2)}%
                </Badge>
                <span className="text-secondary font-medium">Mark Price</span>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Bids Section */}
        {viewMode !== 'asks' && (
          <div className="space-y-0">
            {displayBids.map((bid, index) => (
              <div
                key={bid.id}
                className={`grid grid-cols-3 gap-2 px-4 py-1.5 text-xs relative cursor-pointer transition-all duration-200 ${
                  bid.isNew 
                    ? 'bg-profit/20 animate-pulse border-l-2 border-profit' 
                    : 'hover:bg-profit/5 hover:border-l-2 hover:border-profit/50'
                } ${selectedPrice === bid.price ? 'ring-1 ring-profit bg-profit/10' : ''}
                ${hoverPrice === bid.price ? 'bg-profit/8' : ''}`}
                onClick={() => handlePriceClick(bid.price)}
                onMouseEnter={() => setHoverPrice(bid.price)}
                onMouseLeave={() => setHoverPrice(null)}
              >
                {/* Depth Visualization */}
                <div 
                  className="absolute inset-0 bg-profit/10 transition-all duration-300"
                  style={{ width: `${bid.depth}%` }}
                />
                
                <span className="font-mono text-profit font-semibold relative z-10 flex items-center">
                  {formatPrice(bid.price)}
                  {bid.isNew && <div className="w-1 h-1 bg-profit rounded-full ml-1 animate-ping" />}
                </span>
                
                <span className="text-right font-mono font-medium text-primary relative z-10">
                  {formatAmount(bid.amount)}
                </span>
                
                <div className="text-right font-mono text-secondary relative z-10 flex items-center justify-end space-x-1">
                  <span>{formatAmount(bid.total)}</span>
                  {showOrders && (
                    <span className="text-xs text-muted">({bid.orders})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Footer Stats */}
      <div className="px-4 py-3 border-t border-default/30 bg-surface-2/30">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-secondary">Total Bids:</span>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-profit">{orderBook.bids.length}</span>
              <span className="font-mono text-profit">
                {orderBook.bids.reduce((sum, bid) => sum + bid.amount, 0).toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-secondary">Total Asks:</span>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-loss">{orderBook.asks.length}</span>
              <span className="font-mono text-loss">
                {orderBook.asks.reduce((sum, ask) => sum + ask.amount, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        {isRunning && (
          <div className="text-center mt-2">
            <div className="flex items-center justify-center space-x-2 text-river-blue">
              <div className="w-1 h-1 bg-river-blue rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">Real-time orderbook updates</span>
              <div className="w-1 h-1 bg-river-blue rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedOrderBook;