import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import SmartTradingAssistant from './ai/SmartTradingAssistant';

interface ProfessionalTradingInterfaceProps {
  userAddress?: string;
  isConnected: boolean;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
}

const ProfessionalTradingInterface: React.FC<ProfessionalTradingInterfaceProps> = ({
  userAddress,
  isConnected,
  isWalletConnected,
  onConnectWallet,
}) => {
  const [selectedPair, setSelectedPair] = useState('BTC/USDT');
  const [orderType, setOrderType] = useState('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState(10);
  
  // Real-time price data
  const [btcPrice, setBtcPrice] = useState(67425.23);
  const [priceChange, setPriceChange] = useState(2.45);
  const [showAIInsights, setShowAIInsights] = useState(false);

  // Update price every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 100;
      const newPrice = Math.max(btcPrice + change, 50000);
      setBtcPrice(newPrice);
      setPriceChange((Math.random() - 0.5) * 5);
    }, 3000);

    return () => clearInterval(interval);
  }, [btcPrice]);

  // Mock positions data
  const positions = [
    { pair: 'BTC/USDT', side: 'Long', size: '0.5 BTC', pnl: '+$1,234.56', margin: '$5,000', entry: '$65,420' },
    { pair: 'ETH/USDT', side: 'Short', size: '10 ETH', pnl: '-$234.78', margin: '$2,500', entry: '$3,456' },
    { pair: 'SOL/USDT', side: 'Long', size: '50 SOL', pnl: '+$567.89', margin: '$1,200', entry: '$198' },
  ];

  // Mock order book data
  const orderBook = {
    asks: [
      { price: 67435.23, amount: 0.2345 },
      { price: 67430.12, amount: 0.5678 },
      { price: 67425.89, amount: 1.2341 },
    ],
    bids: [
      { price: 67420.45, amount: 0.8765 },
      { price: 67415.23, amount: 1.5432 },
      { price: 67410.12, amount: 0.4321 },
    ]
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(value);
  };

  const handleQuickClose = (percentage: number, positionIndex?: number) => {
    const message = positionIndex !== undefined 
      ? `Closing ${percentage}% of position ${positionIndex}` 
      : `Closing ${percentage}% of all positions`;
    toast.success(`📊 ${message}`);
  };

  const handleTrade = () => {
    if (!isWalletConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    const orderValue = (parseFloat(amount) || 0) * btcPrice;
    toast.success(`${side.toUpperCase()} order placed: ${amount} BTC (${formatUSD(orderValue)})`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      
      {/* Compact Professional Header */}
      <div className="h-16 bg-slate-900 border-b border-slate-700 flex items-center px-6">
        <div className="flex items-center space-x-8">
          {/* Trading Pair & Price */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">{selectedPair}</h1>
            <div className="text-2xl font-mono font-bold text-white">
              ${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-sm font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="flex items-center space-x-6 text-sm text-slate-400">
            <span>Vol: $2.4B</span>
            <span>High: $68,234</span>
            <span>Low: $66,543</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="ml-auto flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAIInsights(!showAIInsights)}
            className={`text-xs ${showAIInsights ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400'}`}
          >
            AI Insights
          </Button>
          {!isWalletConnected && (
            <Button onClick={onConnectWallet} size="sm" className="bg-blue-600 hover:bg-blue-700">
              Connect Wallet
            </Button>
          )}
        </div>
      </div>

      {/* AI Smart Notification Bar */}
      {showAIInsights && (
        <div className="h-10 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-b border-blue-700/30 flex items-center px-6">
          <div className="flex items-center space-x-4 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-blue-400">BTC突破关键阻力位$67,500，建议关注多头机会</span>
            <Badge className="bg-green-500/20 text-green-400 border-green-400/30 text-xs">
              85% 置信度
            </Badge>
          </div>
        </div>
      )}

      {/* Main Trading Area */}
      <div className="flex h-[calc(100vh-64px)]">
        
        {/* Chart Area - 70% width */}
        <div className="flex-1 bg-slate-900">
          <div className="h-full p-4">
            <div className="h-full bg-slate-800 rounded border border-slate-700 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">TradingView Chart Component</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Panel - 30% width */}
        <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col">
          
          {/* Trading Form */}
          <div className="p-4 border-b border-slate-700">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Trade {selectedPair.split('/')[0]}</h3>
              
              {/* Buy/Sell Toggle */}
              <div className="flex space-x-1 p-1 bg-slate-800 rounded">
                <Button 
                  size="sm" 
                  variant={side === 'buy' ? 'default' : 'ghost'}
                  onClick={() => setSide('buy')}
                  className={`flex-1 ${side === 'buy' ? 'bg-green-600 text-white' : 'text-green-400'}`}
                >
                  BUY
                </Button>
                <Button 
                  size="sm" 
                  variant={side === 'sell' ? 'default' : 'ghost'}
                  onClick={() => setSide('sell')}
                  className={`flex-1 ${side === 'sell' ? 'bg-red-600 text-white' : 'text-red-400'}`}
                >
                  SELL
                </Button>
              </div>
            </div>

            {/* Order Type */}
            <div className="mb-3">
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant={orderType === 'market' ? 'default' : 'outline'}
                  onClick={() => setOrderType('market')}
                  className="flex-1 text-xs"
                >
                  Market
                </Button>
                <Button
                  size="sm"
                  variant={orderType === 'limit' ? 'default' : 'outline'}
                  onClick={() => setOrderType('limit')}
                  className="flex-1 text-xs"
                >
                  Limit
                </Button>
              </div>
            </div>

            {/* Price Input (if limit order) */}
            {orderType === 'limit' && (
              <div className="mb-3">
                <label className="text-xs text-slate-400 mb-1 block">Price (USDT)</label>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter price"
                  className="bg-slate-800 border-slate-600 text-sm"
                />
              </div>
            )}

            {/* Amount Input */}
            <div className="mb-3">
              <label className="text-xs text-slate-400 mb-1 block">Amount (BTC)</label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-slate-800 border-slate-600 text-sm"
              />
              <div className="text-xs text-slate-400 mt-1">
                ≈ {formatUSD((parseFloat(amount) || 0) * btcPrice)}
              </div>
            </div>

            {/* Leverage */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">Leverage</label>
                <span className="text-xs text-white">{leverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded appearance-none cursor-pointer"
              />
            </div>

            {/* Trade Button */}
            <Button 
              onClick={handleTrade}
              className={`w-full h-10 font-semibold ${side === 'buy' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={!isWalletConnected}
            >
              {side.toUpperCase()} {selectedPair.split('/')[0]}
            </Button>
          </div>

          {/* AI Trading Suggestions (when enabled) */}
          {showAIInsights && (
            <div className="p-4 border-b border-slate-700">
              <SmartTradingAssistant
                currentSymbol={selectedPair}
                currentPrice={btcPrice}
                userPositions={positions}
                isConnected={isConnected}
                onApplyRecommendation={(rec) => {
                  setAmount('0.1');
                  setPrice(rec.entry.toString());
                  setSide(rec.action as 'buy' | 'sell');
                  toast.success('AI建议已应用到交易表单');
                }}
              />
            </div>
          )}

          {/* Order Book */}
          <div className="flex-1 p-4">
            <h4 className="text-sm font-semibold text-white mb-3">Order Book</h4>
            
            {/* Asks */}
            <div className="mb-2">
              {orderBook.asks.slice(0, 3).map((ask, i) => (
                <div key={i} className="flex justify-between text-xs py-1">
                  <span className="text-red-400 font-mono">{ask.price.toLocaleString()}</span>
                  <span className="text-slate-400 font-mono">{ask.amount.toFixed(4)}</span>
                </div>
              ))}
            </div>

            {/* Current Price */}
            <div className="text-center py-2 border-y border-slate-700 mb-2">
              <span className="text-white font-mono font-bold">
                {btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Bids */}
            <div>
              {orderBook.bids.slice(0, 3).map((bid, i) => (
                <div key={i} className="flex justify-between text-xs py-1">
                  <span className="text-green-400 font-mono">{bid.price.toLocaleString()}</span>
                  <span className="text-slate-400 font-mono">{bid.amount.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Positions Table - Bottom Section */}
      <div className="h-52 bg-slate-900 border-t border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Positions</h3>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleQuickClose(50)}
              className="text-yellow-400 border-yellow-400/50 text-xs"
            >
              Close 50%
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleQuickClose(100)}
              className="text-red-400 border-red-400/50 text-xs"
            >
              Close All
            </Button>
          </div>
        </div>
        
        {/* Positions Table */}
        <div className="bg-slate-800 rounded border border-slate-700">
          {/* Table Header */}
          <div className="grid grid-cols-7 gap-4 p-3 border-b border-slate-700 text-xs text-slate-400 font-medium">
            <span>Pair</span>
            <span>Side</span>
            <span>Size</span>
            <span>Entry</span>
            <span>Mark</span>
            <span>PnL</span>
            <span>Actions</span>
          </div>
          
          {/* Position Rows */}
          {positions.map((position, i) => (
            <div key={i} className="grid grid-cols-7 gap-4 p-3 border-b border-slate-700/50 hover:bg-slate-700/20">
              <span className="text-white text-sm">{position.pair}</span>
              <span className={`text-sm font-medium ${
                position.side === 'Long' ? 'text-green-400' : 'text-red-400'
              }`}>
                {position.side}
              </span>
              <span className="text-white text-sm font-mono">{position.size}</span>
              <span className="text-slate-300 text-sm font-mono">{position.entry}</span>
              <span className="text-white text-sm font-mono">${btcPrice.toFixed(0)}</span>
              <span className={`text-sm font-mono ${
                position.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'
              }`}>
                {position.pnl}
              </span>
              <div className="flex items-center space-x-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleQuickClose(25, i)}
                  className="text-xs px-2 py-1 h-6 border-slate-600 text-slate-400"
                >
                  25%
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleQuickClose(100, i)}
                  className="text-xs px-2 py-1 h-6 border-red-600/50 text-red-400"
                >
                  Close
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalTradingInterface;