import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface MarketDataItem {
  symbol: string;
  price: string;
  change: string;
  volume: string;
}

interface PortfolioData {
  totalBalance: string;
  pnl: string;
  pnlPercent: string;
  positions: number;
  openOrders: number;
}

interface OrderBookData {
  bids: Array<{price: number; amount: number; total: number}>;
  asks: Array<{price: number; amount: number; total: number}>;
  spread: number;
  lastPrice: number;
}

interface MarketDataPanelProps {
  portfolioData: PortfolioData;
  marketData: MarketDataItem[];
  portfolioAnimClass?: string;
  className?: string;
  onOpenPositions?: () => void;
  orderBookData?: OrderBookData;
  onPriceClick?: (price: number, side: 'buy' | 'sell') => void;
}

const MarketDataPanel: React.FC<MarketDataPanelProps> = ({
  portfolioData,
  marketData,
  portfolioAnimClass = '',
  className = '',
  onOpenPositions,
  orderBookData,
  onPriceClick
}) => {
  // 处理市场数据排序（按变化率）
  const sortedMarketData = useMemo(() => {
    return [...marketData].sort((a, b) => {
      const aChange = parseFloat(a.change.replace(/[%+]/g, ''));
      const bChange = parseFloat(b.change.replace(/[%+]/g, ''));
      return bChange - aChange; // 降序排列
    });
  }, [marketData]);

  return (
    <div className={`p-2 flex flex-col overflow-hidden ${className}`}>
      <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
        {/* 超紧凑型投资组合概览 */}
        <div className={`space-y-2 ${portfolioAnimClass}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Portfolio</h3>
            <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-green-600 rounded-md flex items-center justify-center">
              <DollarSign className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/50">
              <div className="text-xs text-gray-400 mb-0.5">Total Balance</div>
              <div className="text-base font-mono font-bold text-white">{portfolioData.totalBalance}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-green-900/20 rounded-lg p-1.5 border border-green-400/30">
                <div className="text-xs text-green-400 mb-0.5">24h PnL</div>
                <div className="text-sm font-mono font-bold text-green-400">{portfolioData.pnl}</div>
              </div>
              <div className="bg-blue-900/20 rounded-lg p-1.5 border border-blue-400/30">
                <div className="text-xs text-blue-400 mb-0.5">ROI</div>
                <div className="text-sm font-mono font-bold text-blue-400">+12.3%</div>
              </div>
            </div>
            
            <div className="flex justify-between text-xs">
              <button 
                onClick={onOpenPositions}
                className="text-center hover:bg-slate-700/50 rounded-md p-1 transition-colors group"
                title="Open Positions Panel"
              >
                <div className="text-white font-semibold group-hover:text-blue-400 transition-colors">{portfolioData.positions}</div>
                <div className="text-gray-400 group-hover:text-blue-300 transition-colors">Positions</div>
              </button>
              <button 
                onClick={onOpenPositions}
                className="text-center hover:bg-slate-700/50 rounded-md p-1 transition-colors group"
                title="Open Orders Panel"
              >
                <div className="text-white font-semibold group-hover:text-blue-400 transition-colors">{portfolioData.openOrders}</div>
                <div className="text-gray-400 group-hover:text-blue-300 transition-colors">Orders</div>
              </button>
              <div className="text-center">
                <div className="text-white font-semibold">87.5%</div>
                <div className="text-gray-400">Win Rate</div>
              </div>
            </div>
            
            {/* Quick Action Button */}
            {onOpenPositions && (
              <div className="mt-2">
                <Button
                  onClick={onOpenPositions}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs bg-slate-800/40 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                >
                  <Activity className="w-3 h-3 mr-1" />
                  View All Positions
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 超紧凑型热门市场 */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-white">Hot Markets</h3>
          <div className="space-y-0.5">
            {sortedMarketData.slice(0, 4).map((market, i) => {
              const isPositive = market.change.startsWith('+');
              const changeValue = Math.abs(parseFloat(market.change.replace(/[%+]/g, '')));
              
              return (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-1.5 hover:bg-slate-800/40 rounded-md cursor-pointer transition-all duration-200 border border-slate-700/30 group"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isPositive ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <div>
                      <div className="text-xs font-semibold text-white">{market.symbol}</div>
                      <div className="text-xs text-gray-400">{market.volume}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-medium text-white group-hover:text-blue-400 transition-colors">
                      {market.price}
                    </div>
                    <div className={`text-xs font-semibold flex items-center ${
                      isPositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {isPositive ? '+' : ''}{changeValue.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 市场概况指标 */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Market Overview</h3>
          <div className="grid grid-cols-1 gap-2">
            {/* 恐慌贪婪指数 */}
            <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Fear & Greed Index</span>
                <Badge variant="outline" className="text-xs bg-green-400/10 text-green-400 border-green-400/30">
                  Greed
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: '72%' }}></div>
                </div>
                <span className="text-sm font-bold text-green-400">72</span>
              </div>
            </div>

            {/* 市场统计 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/50">
                <div className="text-xs text-gray-400">24h Volume</div>
                <div className="text-sm font-mono font-bold text-white">$847B</div>
                <div className="text-xs text-green-400">+12.4%</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/50">
                <div className="text-xs text-gray-400">Market Cap</div>
                <div className="text-sm font-mono font-bold text-white">$2.4T</div>
                <div className="text-xs text-blue-400">Stable</div>
              </div>
            </div>

            {/* 主导性指标 */}
            <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">BTC Dominance</span>
                <span className="text-xs font-bold text-orange-400">52.3%</span>
              </div>
              <div className="mt-1 flex-1 bg-slate-700 rounded-full h-1.5">
                <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: '52.3%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 简化订单簿 */}
        {orderBookData && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">Order Book</h3>
            <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/50">
              
              {/* 卖单 (Asks) - 从低到高显示 */}
              <div className="space-y-0.5 mb-2">
                {orderBookData.asks.slice(0, 3).reverse().map((ask, i) => (
                  <button
                    key={`ask-${i}`}
                    onClick={() => onPriceClick?.(ask.price, 'sell')}
                    className="w-full flex items-center justify-between text-xs hover:bg-red-500/10 rounded px-1 py-0.5 transition-colors group"
                  >
                    <span className="text-red-400 font-mono group-hover:text-red-300">
                      ${ask.price.toFixed(2)}
                    </span>
                    <span className="text-gray-400 font-mono text-right">
                      {ask.amount.toFixed(4)}
                    </span>
                  </button>
                ))}
              </div>

              {/* 价差显示 */}
              <div className="flex items-center justify-center py-1 border-y border-slate-600/50">
                <span className="text-xs text-yellow-400 font-mono">
                  Spread: ${orderBookData.spread.toFixed(2)}
                </span>
              </div>

              {/* 买单 (Bids) - 从高到低显示 */}
              <div className="space-y-0.5 mt-2">
                {orderBookData.bids.slice(0, 3).map((bid, i) => (
                  <button
                    key={`bid-${i}`}
                    onClick={() => onPriceClick?.(bid.price, 'buy')}
                    className="w-full flex items-center justify-between text-xs hover:bg-green-500/10 rounded px-1 py-0.5 transition-colors group"
                  >
                    <span className="text-green-400 font-mono group-hover:text-green-300">
                      ${bid.price.toFixed(2)}
                    </span>
                    <span className="text-gray-400 font-mono text-right">
                      {bid.amount.toFixed(4)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部状态指示器 */}
      <div className="mt-2 pt-2 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live Data</span>
          </div>
          <span>Updated {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default MarketDataPanel;