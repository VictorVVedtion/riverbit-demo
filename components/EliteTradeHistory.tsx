import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { formatNumber } from '../utils/web3Utils';
import { 
  History, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Filter,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Trade {
  id: string;
  timestamp: Date;
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  price: number;
  total: number;
  fee: number;
  status: 'completed' | 'pending' | 'failed';
  txHash?: string;
}

interface TradeHistoryProps {
  userAddress?: string;
}

const EliteTradeHistory: React.FC<TradeHistoryProps> = ({ userAddress }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');

  // Mock data generation
  useEffect(() => {
    const generateMockTrades = (): Trade[] => {
      const symbols = ['BTC', 'ETH', 'SOL', 'xAAPL', 'xTSLA'];
      const mockTrades: Trade[] = [];
      
      for (let i = 0; i < 20; i++) {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const size = Math.random() * 5 + 0.1;
        const price = Math.random() * 50000 + 30000;
        const total = size * price;
        const fee = total * 0.001; // 0.1% fee
        
        mockTrades.push({
          id: `trade-${i}`,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          symbol,
          side,
          size,
          price,
          total,
          fee,
          status: Math.random() > 0.1 ? 'completed' : Math.random() > 0.5 ? 'pending' : 'failed',
          txHash: `0x${Math.random().toString(16).substring(2, 42)}`
        });
      }
      
      return mockTrades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    };

    setTrades(generateMockTrades());
  }, [userAddress]);

  const filteredTrades = trades.filter(trade => {
    if (filter !== 'all' && trade.side !== filter) return false;
    
    const now = new Date();
    const tradeTime = trade.timestamp;
    
    switch (timeRange) {
      case '24h':
        return now.getTime() - tradeTime.getTime() <= 24 * 60 * 60 * 1000;
      case '7d':
        return now.getTime() - tradeTime.getTime() <= 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return now.getTime() - tradeTime.getTime() <= 30 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  });

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: Trade['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: Trade['status']) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
    }
  };

  return (
    <div className="liquid-glass-subtle rounded-2xl border border-slate-700/30 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-white">Trade History</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white p-1">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white p-1">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {(['all', 'buy', 'sell'] as const).map((filterOption) => (
              <Button
                key={filterOption}
                size="sm"
                variant={filter === filterOption ? "default" : "ghost"}
                onClick={() => setFilter(filterOption)}
                className={`text-xs ${
                  filter === filterOption 
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filterOption === 'all' ? 'All' : filterOption === 'buy' ? 'Buy' : 'Sell'}
              </Button>
            ))}
          </div>
          
          <div className="h-4 w-px bg-slate-700" />
          
          <div className="flex items-center gap-1">
            {(['24h', '7d', '30d', 'all'] as const).map((timeOption) => (
              <Button
                key={timeOption}
                size="sm"
                variant={timeRange === timeOption ? "default" : "ghost"}
                onClick={() => setTimeRange(timeOption)}
                className={`text-xs ${
                  timeRange === timeOption 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {timeOption}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Trade List */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredTrades.length === 0 ? (
          <div className="p-8 text-center">
            <History className="h-12 w-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 text-sm mb-1">No trades found</p>
            <p className="text-slate-500 text-xs">Execute your first trade to see history</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {filteredTrades.map((trade) => (
              <div key={trade.id} className="p-4 hover:bg-slate-800/20 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {trade.side === 'buy' ? (
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <span className="font-medium text-white">{trade.symbol}/USDT</span>
                    </div>
                    
                    <Badge 
                      size="sm" 
                      className={`text-xs ${
                        trade.side === 'buy' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}
                    >
                      {trade.side.toUpperCase()}
                    </Badge>
                    
                    <div className="flex items-center gap-1">
                      {getStatusIcon(trade.status)}
                      <span className={`text-xs ${getStatusColor(trade.status)}`}>
                        {trade.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {trade.txHash && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-cyan-400 p-1"
                        onClick={() => window.open(`https://sepolia.arbiscan.io/tx/${trade.txHash}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Size</div>
                    <div className="font-mono text-white">{trade.size.toFixed(4)}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Price</div>
                    <div className="font-mono text-white">${formatNumber(trade.price)}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Total</div>
                    <div className="font-mono text-white">${formatNumber(trade.total)}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Time</div>
                    <div className="text-slate-300 text-xs">{formatTime(trade.timestamp)}</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/30">
                  <div className="text-xs text-slate-400">
                    Fee: <span className="text-slate-300 font-mono">${trade.fee.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    ID: {trade.id.slice(-8)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {filteredTrades.length > 0 && (
        <div className="p-4 border-t border-slate-700/30 bg-slate-800/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total Trades</div>
              <div className="text-lg font-bold text-white">{filteredTrades.length}</div>
            </div>
            
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Volume</div>
              <div className="text-lg font-bold text-white">
                ${formatNumber(filteredTrades.reduce((sum, trade) => sum + trade.total, 0))}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Fees Paid</div>
              <div className="text-lg font-bold text-orange-400">
                ${formatNumber(filteredTrades.reduce((sum, trade) => sum + trade.fee, 0))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EliteTradeHistory;