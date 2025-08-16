import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { 
  Wallet, Eye, EyeOff, Activity
} from 'lucide-react';
import DirectTradingView from './DirectTradingView';
import { usePriceUpdates } from '../utils/priceApi';

// Mock data for demo purposes
const mockTradingPairs = [
  { 
    symbol: 'BTC/USDT', 
    price: 43250.50, 
    change24h: 2.45, 
    volume: '2.8B',
    high24h: 44100,
    low24h: 42800
  },
  { 
    symbol: 'ETH/USDT', 
    price: 2640.80, 
    change24h: -1.2, 
    volume: '1.2B',
    high24h: 2680,
    low24h: 2580
  },
  { 
    symbol: 'xAAPL/USDT', 
    price: 185.20, 
    change24h: 0.8, 
    volume: '45M',
    high24h: 187.5,
    low24h: 183.1
  },
  { 
    symbol: 'xTSLA/USDT', 
    price: 248.90, 
    change24h: -2.1, 
    volume: '38M',
    high24h: 255.2,
    low24h: 246.8
  },
  { 
    symbol: 'xMSFT/USDT', 
    price: 378.85, 
    change24h: 0.8, 
    volume: '28.5M',
    high24h: 381.2,
    low24h: 376.1
  },
  { 
    symbol: 'xNVDA/USDT', 
    price: 875.28, 
    change24h: 3.2, 
    volume: '52.6M',
    high24h: 885.5,
    low24h: 868.9
  }
];

const mockOrderBook = {
  bids: [
    { price: 43240, size: 0.5, total: 0.5 },
    { price: 43235, size: 1.2, total: 1.7 },
    { price: 43230, size: 0.8, total: 2.5 },
    { price: 43225, size: 2.1, total: 4.6 },
    { price: 43220, size: 1.5, total: 6.1 },
  ],
  asks: [
    { price: 43255, size: 0.3, total: 0.3 },
    { price: 43260, size: 0.9, total: 1.2 },
    { price: 43265, size: 1.4, total: 2.6 },
    { price: 43270, size: 0.7, total: 3.3 },
    { price: 43275, size: 2.2, total: 5.5 },
  ]
};

const mockTrades = [
  { price: 43250, size: 0.15, time: '14:25:32', side: 'buy' },
  { price: 43245, size: 0.08, time: '14:25:28', side: 'sell' },
  { price: 43255, size: 0.22, time: '14:25:25', side: 'buy' },
  { price: 43248, size: 0.11, time: '14:25:20', side: 'sell' },
  { price: 43252, size: 0.19, time: '14:25:15', side: 'buy' },
];

interface EliteTradingInterfaceProps {
  isWalletConnected?: boolean;
  onConnectWallet?: () => void;
  userAddress?: string;
  isConnected?: boolean;
}

const EliteTradingInterface: React.FC<EliteTradingInterfaceProps> = ({
  isWalletConnected = false,
  onConnectWallet,
  userAddress,
  isConnected = false
}) => {
  const [selectedPair, setSelectedPair] = useState(mockTradingPairs[0]);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState([1]);
  const [showDemoMode, setShowDemoMode] = useState(!isWalletConnected);
  const [chartType, setChartType] = useState<'simple' | 'direct'>('direct'); // 默认使用iframe方式
  const [enablePriceUpdates, setEnablePriceUpdates] = useState(false); // 默认关闭实时更新
  
  // 获取实时价格数据 - 使用useMemo避免重新创建数组
  const symbols = useMemo(() => mockTradingPairs.map(pair => pair.symbol), []);
  const { prices, loading } = usePriceUpdates(enablePriceUpdates ? symbols : [], 60000); // 1分钟更新一次

  // Demo mode toggle
  const toggleDemoMode = () => {
    setShowDemoMode(!showDemoMode);
  };

  // Price data monitoring for real-time updates
  useEffect(() => {
    if (enablePriceUpdates && prices[selectedPair.symbol]) {
      // Update local state if needed for real-time display
    }
  }, [prices, selectedPair.symbol, enablePriceUpdates]);

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const formatChange = (change: number) => {
    return `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-white flex flex-col">
      {/* Elite Header */}
      <div className="h-16 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Pair Selector */}
          <Select 
            value={selectedPair.symbol} 
            onValueChange={(value) => {
              const pair = mockTradingPairs.find(p => p.symbol === value);
              if (pair) setSelectedPair(pair);
            }}
          >
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockTradingPairs.map((pair) => (
                <SelectItem key={pair.symbol} value={pair.symbol}>
                  {pair.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Price Display - 使用真实价格数据 */}
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold font-mono">
              {loading ? (
                <div className="animate-pulse bg-slate-700 rounded w-24 h-8"></div>
              ) : enablePriceUpdates && prices[selectedPair.symbol] ? (
                `$${formatPrice(prices[selectedPair.symbol].price)}`
              ) : (
                `$${formatPrice(selectedPair.price)}`
              )}
            </div>
            <div className={`text-sm font-semibold px-2 py-1 rounded ${
              (enablePriceUpdates && prices[selectedPair.symbol]?.change24h !== undefined ? prices[selectedPair.symbol].change24h : selectedPair.change24h) >= 0 
                ? 'text-green-400 bg-green-400/10' 
                : 'text-red-400 bg-red-400/10'
            }`}>
              {loading ? (
                <div className="animate-pulse bg-slate-700 rounded w-16 h-6"></div>
              ) : (
                formatChange(enablePriceUpdates && prices[selectedPair.symbol]?.change24h !== undefined ? prices[selectedPair.symbol].change24h : selectedPair.change24h)
              )}
            </div>
            {!loading && enablePriceUpdates && prices[selectedPair.symbol] && (
              <div className="text-xs text-green-400 flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></div>
                Live
              </div>
            )}
          </div>

          {/* 24h Stats - 使用真实数据 */}
          <div className="hidden lg:flex items-center space-x-6 text-sm text-slate-400">
            <div>
              <span className="text-slate-500">24h High:</span>
              <span className="ml-1 text-white">
                ${formatPrice(enablePriceUpdates && prices[selectedPair.symbol]?.high24h !== undefined ? prices[selectedPair.symbol].high24h : selectedPair.high24h)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">24h Low:</span>
              <span className="ml-1 text-white">
                ${formatPrice(enablePriceUpdates && prices[selectedPair.symbol]?.low24h !== undefined ? prices[selectedPair.symbol].low24h : selectedPair.low24h)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">24h Volume:</span>
              <span className="ml-1 text-white">
                {enablePriceUpdates && prices[selectedPair.symbol]?.volume ? prices[selectedPair.symbol].volume : selectedPair.volume}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Price Updates Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnablePriceUpdates(!enablePriceUpdates)}
            className={`border-slate-700 hover:bg-slate-800 ${enablePriceUpdates ? 'text-green-400 border-green-600' : ''}`}
          >
            <Activity className="w-4 h-4 mr-2" />
            {enablePriceUpdates ? 'Live Prices' : 'Static Prices'}
          </Button>

          {/* Demo Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDemoMode}
            className="border-slate-700 hover:bg-slate-800"
          >
            {showDemoMode ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            {showDemoMode ? 'Demo Mode' : 'Live Mode'}
          </Button>

          {/* Wallet Connection */}
          {isWalletConnected ? (
            <div className="flex items-center space-x-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Connected</span>
            </div>
          ) : (
            <Button 
              onClick={onConnectWallet}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>

      {/* Main Trading Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Chart Section */}
        <div className="flex-1 flex flex-col bg-slate-950">
          <div className="flex-1 p-4">
            <Card className="h-full bg-slate-900/50 border-slate-800 relative">
              {/* Chart Type Toggle */}
              <div className="absolute top-2 right-2 z-10 flex space-x-1">
                <Button
                  size="sm"
                  variant={chartType === 'direct' ? 'default' : 'outline'}
                  onClick={() => setChartType('direct')}
                  className="text-xs bg-slate-800/80 border-slate-700"
                >
                  Iframe
                </Button>
                <Button
                  size="sm"
                  variant={chartType === 'simple' ? 'default' : 'outline'}
                  onClick={() => setChartType('simple')}
                  className="text-xs bg-slate-800/80 border-slate-700"
                >
                  Widget
                </Button>
              </div>
              
              {chartType === 'simple' ? (
                <SimpleTradingView
                  symbol={selectedPair.symbol}
                  theme="dark"
                  interval="1h"
                  width="100%"
                  height="100%"
                />
              ) : (
                <DirectTradingView
                  symbol={selectedPair.symbol}
                  theme="dark"
                  interval="1h"
                  width="100%"
                  height="100%"
                />
              )}
            </Card>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-96 bg-slate-900/50 border-l border-slate-800 flex flex-col">
          <Tabs defaultValue="trade" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-4 mb-0 bg-slate-800">
              <TabsTrigger value="trade">Trade</TabsTrigger>
              <TabsTrigger value="orderbook">Book</TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
            </TabsList>

            <TabsContent value="trade" className="flex-1 p-4 space-y-4">
              {/* Order Type Toggle */}
              <div className="flex space-x-2">
                <Button
                  variant={orderType === 'market' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderType('market')}
                  className="flex-1"
                >
                  Market
                </Button>
                <Button
                  variant={orderType === 'limit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderType('limit')}
                  className="flex-1"
                >
                  Limit
                </Button>
              </div>

              {/* Buy/Sell Toggle */}
              <div className="flex space-x-2">
                <Button
                  variant={orderSide === 'buy' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderSide('buy')}
                  className={`flex-1 ${orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-600/20'}`}
                >
                  Buy / Long
                </Button>
                <Button
                  variant={orderSide === 'sell' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderSide('sell')}
                  className={`flex-1 ${orderSide === 'sell' ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-600/20'}`}
                >
                  Sell / Short
                </Button>
              </div>

              {/* Leverage Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Leverage</span>
                  <span className="text-sm font-bold">{leverage[0]}x</span>
                </div>
                <Slider
                  value={leverage}
                  onValueChange={setLeverage}
                  max={100}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Price Input (for limit orders) */}
              {orderType === 'limit' && (
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Price (USDT)</label>
                  <Input
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Amount (USDT)</label>
                <Input
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {['25%', '50%', '75%', 'Max'].map((percent) => (
                  <Button
                    key={percent}
                    variant="outline"
                    size="sm"
                    className="border-slate-700 hover:bg-slate-700"
                    onClick={() => {
                      // Demo calculation
                      const baseAmount = 1000; // Demo balance
                      const multiplier = percent === 'Max' ? 1 : parseInt(percent) / 100;
                      setAmount((baseAmount * multiplier).toFixed(2));
                    }}
                  >
                    {percent}
                  </Button>
                ))}
              </div>

              {/* Order Summary */}
              <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Est. Fee:</span>
                  <span>${showDemoMode ? '2.50' : '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total:</span>
                  <span className="font-bold">
                    ${amount ? (parseFloat(amount) + (showDemoMode ? 2.50 : 0)).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>

              {/* Place Order Button */}
              <Button
                className={`w-full h-12 font-bold ${
                  orderSide === 'buy' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={!amount}
                onClick={() => {
                  if (showDemoMode) {
                    alert(`Demo ${orderSide} order placed!\nAmount: $${amount}\nLeverage: ${leverage[0]}x`);
                  } else if (!isWalletConnected) {
                    onConnectWallet?.();
                  }
                }}
              >
                {showDemoMode 
                  ? `Demo ${orderSide === 'buy' ? 'Buy' : 'Sell'}` 
                  : isWalletConnected 
                    ? `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${selectedPair.symbol.split('/')[0]}`
                    : 'Connect Wallet to Trade'
                }
              </Button>

              {showDemoMode && (
                <div className="text-xs text-center text-slate-500 bg-slate-800/30 rounded p-2">
                  🎯 Demo Mode: Experience full functionality without wallet connection
                </div>
              )}
            </TabsContent>

            <TabsContent value="orderbook" className="flex-1 p-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400">Order Book</h3>
                
                {/* Asks */}
                <div className="space-y-1">
                  {mockOrderBook.asks.reverse().map((ask, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-red-400">${formatPrice(ask.price)}</span>
                      <span className="text-slate-400">{ask.size}</span>
                      <span className="text-slate-500">{ask.total}</span>
                    </div>
                  ))}
                </div>

                {/* Spread */}
                <div className="text-center py-2 border-y border-slate-800">
                  <span className="text-xs text-slate-500">
                    Spread: ${(mockOrderBook.asks[0].price - mockOrderBook.bids[0].price).toFixed(2)}
                  </span>
                </div>

                {/* Bids */}
                <div className="space-y-1">
                  {mockOrderBook.bids.map((bid, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-green-400">${formatPrice(bid.price)}</span>
                      <span className="text-slate-400">{bid.size}</span>
                      <span className="text-slate-500">{bid.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="trades" className="flex-1 p-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400">Recent Trades</h3>
                <div className="space-y-2">
                  {mockTrades.map((trade, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className={trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                        ${formatPrice(trade.price)}
                      </span>
                      <span className="text-slate-400">{trade.size}</span>
                      <span className="text-slate-500">{trade.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EliteTradingInterface;