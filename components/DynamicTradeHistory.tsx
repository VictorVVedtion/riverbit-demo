import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useTradingViewPrice } from '../hooks/useTradingViewPrices';

interface TradeEntry {
  id: string;
  price: number;
  amount: number;
  time: string;
  side: 'buy' | 'sell';
  value: number;
  timestamp: number;
  isNew?: boolean;
}

interface DynamicTradeHistoryProps {
  symbol: string;
  currentPrice?: number;
  className?: string;
}

const DynamicTradeHistory: React.FC<DynamicTradeHistoryProps> = ({
  symbol,
  currentPrice = 43000,
  className = ''
}) => {
  // 获取实时价格数据
  const { priceData, loading } = useTradingViewPrice(symbol);
  const realPrice = priceData?.price || currentPrice;
  
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [tradeCount, setTradeCount] = useState(0);

  // 生成初始交易记录
  useEffect(() => {
    const initialTrades: TradeEntry[] = [];
    const now = Date.now();
    
    for (let i = 0; i < 15; i++) {
      const timestamp = now - (i * 1000 * 30); // 每30秒一个初始记录
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      const priceVariation = (Math.random() - 0.5) * realPrice * 0.001;
      const price = realPrice + priceVariation;
      const amount = Math.random() * 2 + 0.01;
      
      initialTrades.unshift({
        id: `trade_${i}_${timestamp}`,
        price: price,
        amount: amount,
        time: new Date(timestamp).toLocaleTimeString('zh-CN', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }),
        side: side,
        value: price * amount,
        timestamp: timestamp
      });
    }
    
    setTrades(initialTrades);
  }, [realPrice]);

  // 生成新的交易记录
  const generateNewTrade = useCallback(() => {
    if (!isRunning) return;

    const now = Date.now();
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    // 基于实时价格生成更真实的变动
    const priceVariation = (Math.random() - 0.5) * realPrice * 0.002;
    const price = realPrice + priceVariation;
    const amount = Math.random() * 5 + 0.01;
    
    const newTrade: TradeEntry = {
      id: `trade_${now}_${Math.random()}`,
      price: price,
      amount: amount,
      time: new Date(now).toLocaleTimeString('zh-CN', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }),
      side: side,
      value: price * amount,
      timestamp: now,
      isNew: true
    };

    setTrades(prev => {
      const updated = [newTrade, ...prev];
      // 保持最多30条记录
      if (updated.length > 30) {
        updated.splice(30);
      }
      return updated;
    });

    setTradeCount(prev => prev + 1);

    // 清除新交易标记
    setTimeout(() => {
      setTrades(current => 
        current.map(trade => 
          trade.id === newTrade.id 
            ? { ...trade, isNew: false }
            : trade
        )
      );
    }, 1000);
  }, [isRunning, realPrice]);

  // 定时生成新交易
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      // 随机决定是否生成新交易 (60%概率)
      if (Math.random() < 0.6) {
        generateNewTrade();
      }
    }, 2000 + Math.random() * 3000); // 2-5秒随机间隔
    
    return () => clearInterval(interval);
  }, [generateNewTrade, isRunning]);

  // 格式化价格
  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  // 格式化数量
  const formatAmount = (amount: number) => {
    return amount.toFixed(3);
  };

  // 格式化价值
  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  return (
    <div className={`${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">最新成交 - {symbol}</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            成交: {tradeCount}
          </Badge>
          <Button
            size="sm"
            variant={isRunning ? "destructive" : "default"}
            onClick={() => setIsRunning(!isRunning)}
            className="h-6 text-xs px-2"
          >
            {isRunning ? '暂停' : '启动'}
          </Button>
        </div>
      </div>

      {/* 表头 */}
      <div className="grid grid-cols-4 gap-2 px-4 py-2 text-xs text-gray-300 font-medium border-b">
        <span>时间</span>
        <span className="text-right">价格</span>
        <span className="text-right">数量</span>
        <span className="text-right">方向</span>
      </div>

      {/* 成交记录 */}
      <div className="max-h-80 overflow-y-auto">
        <div className="space-y-px">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className={`grid grid-cols-4 gap-2 px-4 py-2 text-xs transition-all duration-500 ${
                trade.isNew 
                  ? `animate-pulse ${trade.side === 'buy' ? 'bg-green-100' : 'bg-red-100'}` 
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <span className="text-gray-300 font-mono">
                {trade.time}
              </span>
              
              <span className={`text-right font-mono font-medium ${
                trade.side === 'buy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPrice(trade.price)}
              </span>
              
              <span className="text-right font-mono">
                {formatAmount(trade.amount)}
              </span>
              
              <div className="text-right">
                <Badge 
                  variant={trade.side === 'buy' ? 'default' : 'destructive'}
                  className={`text-xs px-2 py-0 ${
                    trade.side === 'buy' 
                      ? 'bg-green-100 text-green-700 border-green-300' 
                      : 'bg-red-100 text-red-700 border-red-300'
                  }`}
                >
                  {trade.side === 'buy' ? '买入' : '卖出'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部统计 */}
      <div className="px-4 py-2 border-t text-xs text-gray-300 font-medium">
        <div className="flex justify-between">
          <span>总成交: {trades.length}</span>
          <span>
            成交额: $
            {formatValue(trades.reduce((sum, trade) => sum + trade.value, 0))}
          </span>
        </div>
        {isRunning && (
          <div className="text-center mt-1 text-blue-600">
            <span className="animate-pulse">● 实时更新中</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicTradeHistory;