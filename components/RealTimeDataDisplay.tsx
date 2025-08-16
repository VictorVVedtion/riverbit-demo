import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, Activity, Zap, Eye, Volume2 } from 'lucide-react';

interface RealTimeDataProps {
  symbol: string;
  price?: number;
  change24h?: number;
  volume?: string;
  className?: string;
}

interface TickerData {
  price: number;
  change: number;
  volume: string;
  timestamp: number;
  direction: 'up' | 'down' | 'neutral';
}

const RealTimeDataDisplay: React.FC<RealTimeDataProps> = ({
  symbol,
  price = 50000,
  change24h = 2.5,
  volume = "1.2B",
  className = ""
}) => {
  const [tickerData, setTickerData] = useState<TickerData>({
    price: price,
    change: change24h,
    volume: volume,
    timestamp: Date.now(),
    direction: 'neutral'
  });
  
  const [lastPrice, setLastPrice] = useState(price);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [isLive, setIsLive] = useState(true);

  // 模拟实时数据更新
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const priceChange = (Math.random() - 0.5) * 100; // ±50的价格波动
      const changePercent = (Math.random() - 0.5) * 0.5; // ±0.25%的变化
      
      const newPrice = Math.max(lastPrice + priceChange, 1000); // 最低价格1000
      const direction = newPrice > lastPrice ? 'up' : newPrice < lastPrice ? 'down' : 'neutral';
      
      setTickerData({
        price: newPrice,
        change: change24h + changePercent,
        volume: volume,
        timestamp: Date.now(),
        direction
      });
      
      // 设置价格闪烁效果
      if (direction !== 'neutral') {
        setPriceFlash(direction);
        setTimeout(() => setPriceFlash(null), 600);
      }
      
      setLastPrice(newPrice);
    }, 2000 + Math.random() * 3000); // 2-5秒随机间隔

    return () => clearInterval(interval);
  }, [lastPrice, change24h, volume, isLive]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={`${className}`}>
      {/* 主要价格显示 - SOTA级别设计 */}
      <Card className="card-modern glass-premium border-primary/20 relative overflow-hidden">
        {/* 实时数据流背景效果 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-primary/20 to-transparent rounded-full blur-xl"></div>
        </div>
        
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl tracking-wide">{symbol}</span>
                <Badge variant="outline" className="glass-card border-primary/30 text-primary">
                  Perpetual
                </Badge>
              </div>
              
              {/* 实时指示器 */}
              <div className="flex items-center space-x-2">
                <div className={`connection-indicator ${isLive ? 'status-online' : 'status-danger'} w-2 h-2 rounded-full`}></div>
                <span className="text-xs text-muted-foreground data-professional">
                  {isLive ? 'LIVE' : 'PAUSED'}
                </span>
              </div>
            </CardTitle>
            
            {/* 控制按钮 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsLive(!isLive)}
                className={`btn-modern p-2 rounded-lg transition-all duration-300 ${
                  isLive 
                    ? 'bg-success-500/20 text-success-500 hover:bg-success-500/30' 
                    : 'bg-danger-500/20 text-danger-500 hover:bg-danger-500/30'
                }`}
              >
                {isLive ? <Activity className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 relative z-10">
          {/* 价格和变化 */}
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <div className={`text-3xl lg:text-4xl font-bold data-professional tracking-tight transition-all duration-300 ${
                priceFlash === 'up' ? 'data-flash-green' : 
                priceFlash === 'down' ? 'data-flash-red' : ''
              }`}>
                {formatPrice(tickerData.price)}
              </div>
              <div className="text-xs text-muted-foreground">
                Last updated: {formatTime(tickerData.timestamp)}
              </div>
            </div>
            
            <div className="text-right space-y-1">
              <div className={`flex items-center space-x-2 text-lg font-bold ${
                tickerData.change >= 0 ? 'text-success-500' : 'text-danger-500'
              }`}>
                {tickerData.change >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <span className="data-professional">
                  {tickerData.change >= 0 ? '+' : ''}{tickerData.change.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">24h Change</div>
            </div>
          </div>

          {/* 实时指标 */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border-light">
            <div className="glass-card p-3 rounded-lg border border-border-light text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Volume2 className="w-4 h-4 text-volume-blue" />
                <span className="text-xs text-muted-foreground font-medium">Volume</span>
              </div>
              <div className="data-professional font-semibold text-volume-blue">
                ${tickerData.volume}
              </div>
            </div>
            
            <div className="glass-card p-3 rounded-lg border border-border-light text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Zap className="w-4 h-4 text-warning-500" />
                <span className="text-xs text-muted-foreground font-medium">Volatility</span>
              </div>
              <div className="data-professional font-semibold text-warning-500">
                {Math.abs(tickerData.change * 0.8).toFixed(1)}%
              </div>
            </div>
            
            <div className="glass-card p-3 rounded-lg border border-border-light text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Momentum</span>
              </div>
              <div className={`data-professional font-semibold ${
                tickerData.direction === 'up' ? 'text-success-500' : 
                tickerData.direction === 'down' ? 'text-danger-500' : 'text-neutral-gray'
              }`}>
                {tickerData.direction === 'up' ? 'BULLISH' : 
                 tickerData.direction === 'down' ? 'BEARISH' : 'NEUTRAL'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeDataDisplay;