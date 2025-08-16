import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { formatNumber } from '../utils/web3Utils';
import { 
  BookOpen, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

interface OrderBookProps {
  symbol: string;
  onPriceClick?: (price: number) => void;
}

const EliteOrderBook: React.FC<OrderBookProps> = ({ symbol, onPriceClick }) => {
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [spread, setSpread] = useState(0);
  const [lastPrice, setLastPrice] = useState(0);

  // Mock data generation for demonstration
  useEffect(() => {
    const generateOrderBookData = () => {
      const basePrice = 45000; // Mock BTC price
      const mockBids: OrderBookEntry[] = [];
      const mockAsks: OrderBookEntry[] = [];
      
      let totalBids = 0;
      let totalAsks = 0;
      
      // Generate bids (buy orders) - prices below current price
      for (let i = 0; i < 15; i++) {
        const price = basePrice - (i + 1) * (Math.random() * 50 + 10);
        const size = Math.random() * 5 + 0.1;
        totalBids += size;
        mockBids.push({
          price,
          size,
          total: totalBids
        });
      }
      
      // Generate asks (sell orders) - prices above current price
      for (let i = 0; i < 15; i++) {
        const price = basePrice + (i + 1) * (Math.random() * 50 + 10);
        const size = Math.random() * 5 + 0.1;
        totalAsks += size;
        mockAsks.push({
          price,
          size,
          total: totalAsks
        });
      }
      
      setBids(mockBids);
      setAsks(mockAsks.reverse());
      setSpread(mockAsks[mockAsks.length - 1]?.price - mockBids[0]?.price || 0);
      setLastPrice(basePrice);
    };

    generateOrderBookData();
    const interval = setInterval(generateOrderBookData, 5000);
    
    return () => clearInterval(interval);
  }, [symbol]);

  const maxBidTotal = Math.max(...bids.map(b => b.total));
  const maxAskTotal = Math.max(...asks.map(a => a.total));

  return (
    <div className="liquid-glass-subtle rounded-2xl border border-slate-700/30 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-white">Order Book</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs">
              {symbol}/USDT
            </Badge>
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white p-1">
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Order Book Content */}
      <div className="relative">
        <div className="p-4">
          {/* Headers */}
          <div className="grid grid-cols-3 gap-4 text-xs text-slate-400 uppercase tracking-wide mb-3 px-2">
            <div className="text-right">Price (USDT)</div>
            <div className="text-right">Size ({symbol})</div>
            <div className="text-right">Total</div>
          </div>

          {/* Asks (Sell Orders) */}
          <div className="space-y-1 mb-4">
            {asks.slice(0, 10).map((ask, index) => (
              <div
                key={`ask-${index}`}
                className="relative group cursor-pointer hover:bg-red-500/5 transition-colors rounded-lg p-2"
                onClick={() => onPriceClick?.(ask.price)}
              >
                {/* Depth Visualization */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-red-500/10 transition-all duration-300 rounded-lg"
                  style={{ width: `${(ask.total / maxAskTotal) * 100}%` }}
                />
                
                <div className="relative z-10 grid grid-cols-3 gap-4 text-sm">
                  <div className="text-right font-mono text-red-400 font-medium">
                    {formatNumber(ask.price)}
                  </div>
                  <div className="text-right font-mono text-slate-300">
                    {ask.size.toFixed(4)}
                  </div>
                  <div className="text-right font-mono text-slate-400 text-xs">
                    {ask.total.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Spread & Last Price */}
          <div className="bg-slate-800/40 rounded-xl p-3 mb-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Last Price</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">+2.3%</span>
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-white mb-1">
                ${formatNumber(lastPrice)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="text-slate-400">
                  Spread: <span className="text-orange-400 font-mono">${formatNumber(spread)}</span>
                </div>
                <div className="text-slate-400">
                  {((spread / lastPrice) * 100).toFixed(3)}%
                </div>
              </div>
            </div>
          </div>

          {/* Bids (Buy Orders) */}
          <div className="space-y-1">
            {bids.slice(0, 10).map((bid, index) => (
              <div
                key={`bid-${index}`}
                className="relative group cursor-pointer hover:bg-emerald-500/5 transition-colors rounded-lg p-2"
                onClick={() => onPriceClick?.(bid.price)}
              >
                {/* Depth Visualization */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 transition-all duration-300 rounded-lg"
                  style={{ width: `${(bid.total / maxBidTotal) * 100}%` }}
                />
                
                <div className="relative z-10 grid grid-cols-3 gap-4 text-sm">
                  <div className="text-right font-mono text-emerald-400 font-medium">
                    {formatNumber(bid.price)}
                  </div>
                  <div className="text-right font-mono text-slate-300">
                    {bid.size.toFixed(4)}
                  </div>
                  <div className="text-right font-mono text-slate-400 text-xs">
                    {bid.total.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Book Summary */}
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 uppercase tracking-wide">Total Bids</span>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {bids.reduce((sum, bid) => sum + bid.size, 0).toFixed(2)}
                </div>
                <div className="text-xs text-emerald-400/70">
                  ${formatNumber(bids.reduce((sum, bid) => sum + (bid.size * bid.price), 0))}
                </div>
              </div>
              
              <div className="bg-red-500/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-red-400 uppercase tracking-wide">Total Asks</span>
                </div>
                <div className="text-lg font-bold font-mono text-red-400">
                  {asks.reduce((sum, ask) => sum + ask.size, 0).toFixed(2)}
                </div>
                <div className="text-xs text-red-400/70">
                  ${formatNumber(asks.reduce((sum, ask) => sum + (ask.size * ask.price), 0))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EliteOrderBook;