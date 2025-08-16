import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useTradingViewPrice } from '../hooks/useTradingViewPrices';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  depth: number;
  id: string;
  timestamp: number;
  isNew?: boolean;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastPrice: number;
  spread: number;
  spreadPercent: number;
}

interface DynamicOrderBookProps {
  symbol: string;
  currentPrice?: number;
  className?: string;
}

const DynamicOrderBook: React.FC<DynamicOrderBookProps> = ({
  symbol,
  currentPrice = 43000,
  className = ''
}) => {
  // 获取实时价格数据
  const { priceData, loading } = useTradingViewPrice(symbol);
  const realPrice = priceData?.price || currentPrice;
  
  const [orderBook, setOrderBook] = useState<OrderBookData>(() => generateInitialOrderBook(realPrice));
  const [isRunning, setIsRunning] = useState(true);
  const [updateCount, setUpdateCount] = useState(0);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);

  // 生成初始订单薄
  function generateInitialOrderBook(price: number): OrderBookData {
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];
    
    // 生成买单 (价格从高到低)
    for (let i = 0; i < 10; i++) {
      const orderPrice = price - (i + 1) * (price * 0.0001 + Math.random() * price * 0.0002);
      const amount = Math.random() * 5 + 0.1;
      const total = i === 0 ? amount : bids[i-1].total + amount;
      
      bids.push({
        price: orderPrice,
        amount: amount,
        total: total,
        depth: Math.min((total / 10) * 100, 100),
        id: `bid_${i}_${Date.now()}`,
        timestamp: Date.now()
      });
    }

    // 生成卖单 (价格从低到高)
    for (let i = 0; i < 10; i++) {
      const orderPrice = price + (i + 1) * (price * 0.0001 + Math.random() * price * 0.0002);
      const amount = Math.random() * 5 + 0.1;
      const total = i === 0 ? amount : asks[i-1].total + amount;
      
      asks.push({
        price: orderPrice,
        amount: amount,
        total: total,
        depth: Math.min((total / 10) * 100, 100),
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
      spreadPercent
    };
  }

  // 当价格变化时重新生成订单薄
  useEffect(() => {
    setOrderBook(generateInitialOrderBook(realPrice));
  }, [realPrice]);

  // 动态更新订单薄
  const updateOrderBook = useCallback(() => {
    if (!isRunning) return;

    setOrderBook(prev => {
      const newBids = [...prev.bids];
      const newAsks = [...prev.asks];
      
      // 基于实时价格调整订单薄
      const currentMarketPrice = realPrice;
      
      // 随机选择更新类型
      const updateType = Math.random();
      
      if (updateType < 0.4) {
        // 40%概率：修改现有订单
        const isBid = Math.random() < 0.5;
        const orders = isBid ? newBids : newAsks;
        const index = Math.floor(Math.random() * Math.min(orders.length, 5));
        
        if (orders[index]) {
          // 修改数量
          const change = (Math.random() - 0.5) * 2; // -1 到 1
          orders[index].amount = Math.max(0.01, orders[index].amount + change);
          orders[index].isNew = true;
          
          // 重新计算总计
          let runningTotal = 0;
          for (let i = 0; i < orders.length; i++) {
            runningTotal += orders[i].amount;
            orders[i].total = runningTotal;
            orders[i].depth = Math.min((runningTotal / 20) * 100, 100);
          }
        }
      } else if (updateType < 0.7) {
        // 30%概率：添加新订单 - 基于实时价格
        const isBid = Math.random() < 0.5;
        const orders = isBid ? newBids : newAsks;
        
        // 基于实时市场价格计算新订单价格
        const priceVariation = currentMarketPrice * 0.0001 * (Math.random() * 4 + 1);
        const newPrice = isBid ? 
          currentMarketPrice - priceVariation : 
          currentMarketPrice + priceVariation;
          
        const newOrder: OrderBookEntry = {
          price: newPrice,
          amount: Math.random() * 3 + 0.1,
          total: 0,
          depth: 0,
          id: `${isBid ? 'bid' : 'ask'}_new_${Date.now()}_${Math.random()}`,
          timestamp: Date.now(),
          isNew: true
        };
        
        // 插入到正确位置并重新计算
        if (isBid) {
          orders.unshift(newOrder);
          orders.sort((a, b) => b.price - a.price); // 买单价格从高到低
        } else {
          orders.unshift(newOrder);
          orders.sort((a, b) => a.price - b.price); // 卖单价格从低到高
        }
        
        // 限制订单数量
        if (orders.length > 15) {
          orders.splice(15);
        }
        
        // 重新计算总计
        let runningTotal = 0;
        for (let i = 0; i < orders.length; i++) {
          runningTotal += orders[i].amount;
          orders[i].total = runningTotal;
          orders[i].depth = Math.min((runningTotal / 20) * 100, 100);
        }
      } else {
        // 30%概率：移除订单
        const isBid = Math.random() < 0.5;
        const orders = isBid ? newBids : newAsks;
        
        if (orders.length > 5) {
          const removeIndex = Math.floor(Math.random() * Math.min(orders.length - 3, 5)) + 3; // 不删除前3个
          orders.splice(removeIndex, 1);
          
          // 重新计算总计
          let runningTotal = 0;
          for (let i = 0; i < orders.length; i++) {
            runningTotal += orders[i].amount;
            orders[i].total = runningTotal;
            orders[i].depth = Math.min((runningTotal / 20) * 100, 100);
          }
        }
      }
      
      // 清除之前的新订单标记
      setTimeout(() => {
        setOrderBook(current => ({
          ...current,
          bids: current.bids.map(bid => ({ ...bid, isNew: false })),
          asks: current.asks.map(ask => ({ ...ask, isNew: false }))
        }));
      }, 300);
      
      // 计算价差 - 使用实时价格
      const bestBid = newBids[0]?.price || currentMarketPrice;
      const bestAsk = newAsks[0]?.price || currentMarketPrice;
      const spread = bestAsk - bestBid;
      const spreadPercent = (spread / currentMarketPrice) * 100;
      
      return {
        bids: newBids,
        asks: newAsks,
        lastPrice: currentMarketPrice, // 使用实时价格
        spread,
        spreadPercent
      };
    });
    
    setUpdateCount(prev => prev + 1);
  }, [isRunning, realPrice]);

  // 定时更新订单薄
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(updateOrderBook, 1000 + Math.random() * 2000); // 1-3秒随机更新
    return () => clearInterval(interval);
  }, [updateOrderBook, isRunning]);

  // 格式化价格显示
  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  // 格式化数量显示
  const formatAmount = (amount: number) => {
    return amount.toFixed(3);
  };

  return (
    <div className={`${className}`}>
      {/* 头部控制 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-sm">订单薄 - {symbol}</h3>
          {!loading && priceData && (
            <Badge variant="outline" className="text-xs text-green-600">
              {priceData.source === 'coingecko' && '🦎'}
              {priceData.source === 'yahoo' && '📊'}
              {priceData.source === 'fmp' && '💰'}
              {priceData.source === 'iex' && '⚡'}
              {priceData.source === 'twelvedata' && '📈'}
              实时
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            更新: {updateCount}
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

      {/* 价差信息 */}
      <div className="px-4 py-2 bg-slate-800/50 text-xs flex justify-between">
        <span>价差: <span className="font-mono">${orderBook.spread.toFixed(2)}</span></span>
        <span>({orderBook.spreadPercent.toFixed(4)}%)</span>
      </div>

      {/* 订单薄表头 */}
      <div className="grid grid-cols-3 gap-2 px-4 py-2 text-xs text-gray-300 font-medium border-b">
        <span>价格 (USDT)</span>
        <span className="text-right">数量</span>
        <span className="text-right">累计</span>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {/* 卖单区域 */}
        <div className="space-y-px">
          {orderBook.asks.slice().reverse().map((ask, index) => (
            <div
              key={ask.id}
              className={`grid grid-cols-3 gap-2 px-4 py-1 text-xs relative transition-all duration-300 cursor-pointer ${
                ask.isNew ? 'bg-red-100 animate-pulse' : 'hover:bg-red-50'
              } ${selectedPrice === ask.price ? 'ring-2 ring-red-300 bg-red-50' : ''}`}
              onClick={() => setSelectedPrice(selectedPrice === ask.price ? null : ask.price)}
            >
              {/* 深度条 */}
              <div 
                className="absolute inset-0 bg-red-100 opacity-30"
                style={{ width: `${ask.depth}%` }}
              />
              
              <span className="font-mono text-red-600 relative z-10">
                {formatPrice(ask.price)}
              </span>
              <span className="text-right font-mono relative z-10">
                {formatAmount(ask.amount)}
              </span>
              <span className="text-right font-mono text-gray-300 relative z-10">
                {formatAmount(ask.total)}
              </span>
            </div>
          ))}
        </div>

        {/* 中间价格显示 */}
        <div className="py-3 px-4 bg-gray-100 border-y">
          <div className="text-center">
            <div className="text-lg font-bold font-mono">
              ${formatPrice(orderBook.lastPrice)}
            </div>
            <div className="text-xs text-gray-300 font-medium">最新成交价</div>
          </div>
        </div>

        {/* 买单区域 */}
        <div className="space-y-px">
          {orderBook.bids.map((bid, index) => (
            <div
              key={bid.id}
              className={`grid grid-cols-3 gap-2 px-4 py-1 text-xs relative transition-all duration-300 ${
                bid.isNew ? 'bg-green-100 animate-pulse' : 'hover:bg-green-50'
              }`}
            >
              {/* 深度条 */}
              <div 
                className="absolute inset-0 bg-green-100 opacity-30"
                style={{ width: `${bid.depth}%` }}
              />
              
              <span className="font-mono text-green-600 relative z-10">
                {formatPrice(bid.price)}
              </span>
              <span className="text-right font-mono relative z-10">
                {formatAmount(bid.amount)}
              </span>
              <span className="text-right font-mono text-gray-300 relative z-10">
                {formatAmount(bid.total)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 底部信息 */}
      <div className="px-4 py-2 border-t text-xs text-gray-300 font-medium bg-slate-800/50">
        <div className="flex justify-between mb-1">
          <span>总买单: <span className="font-semibold text-green-600">{orderBook.bids.length}</span></span>
          <span>总卖单: <span className="font-semibold text-red-600">{orderBook.asks.length}</span></span>
        </div>
        <div className="flex justify-between">
          <span>
            买量: <span className="font-mono text-green-600">
              {orderBook.bids.reduce((sum, bid) => sum + bid.amount, 0).toFixed(2)}
            </span>
          </span>
          <span>
            卖量: <span className="font-mono text-red-600">
              {orderBook.asks.reduce((sum, ask) => sum + ask.amount, 0).toFixed(2)}
            </span>
          </span>
        </div>
        {isRunning && (
          <div className="text-center mt-2 text-green-600">
            <span className="animate-pulse text-xs">● 实时排单中</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicOrderBook;