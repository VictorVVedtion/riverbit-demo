import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Zap, Brain, Target, Activity, X, Lightbulb, ArrowRight, MessageCircle, Send, Mic } from 'lucide-react';
import LiquidGlassCard from './ui/LiquidGlassCard';
import RiverBentoGrid from './ui/RiverBentoGrid';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import TradingAssistantChat from './trading-assistant/TradingAssistantChat';
import AITradingChatDialog from './ai/AITradingChatDialog';

interface LiquidBentoTradingInterfaceProps {
  userAddress?: string;
  isConnected: boolean;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
}

const LiquidBentoTradingInterface: React.FC<LiquidBentoTradingInterfaceProps> = ({
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
  
  // 快速止损/止盈设置
  const [quickTP, setQuickTP] = useState('');
  const [quickSL, setQuickSL] = useState('');
  const [riskRewardRatio, setRiskRewardRatio] = useState('1:2');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 模拟实时数据
  const [btcPrice, setBtcPrice] = useState(67425.23);
  const [priceChange, setPriceChange] = useState(2.45);
  const [isDataPaused, setIsDataPaused] = useState(false);
  const [hasPosition, setHasPosition] = useState(true); // Mock data
  const [hasOrders, setHasOrders] = useState(true); // Mock data
  
  // Animation states
  const [priceFlashClass, setPriceFlashClass] = useState('');
  const [portfolioAnimClass, setPortfolioAnimClass] = useState('');
  const [orderBookAnimClass, setOrderBookAnimClass] = useState('');
  const [positionAnimClass, setPositionAnimClass] = useState('');
  const [lastPrice, setLastPrice] = useState(67425.23);
  const [animatingPositions, setAnimatingPositions] = useState<number[]>([]);
  const [showAIAssistant, setShowAIAssistant] = useState(false); // AI Assist模式（头部按钮）
  const [showAIChatDialog, setShowAIChatDialog] = useState(false); // AI Chat对话框模式（交易面板按钮）

  // 全局AI助手快捷键处理
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Alt+A 快捷键打开/关闭AI助手
      if (event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setShowAIAssistant(prev => !prev);
      }
      
      // Esc键关闭AI助手
      if (event.key === 'Escape' && showAIAssistant) {
        event.preventDefault();
        setShowAIAssistant(false);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showAIAssistant]);

  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 100;
      const newPrice = Math.max(btcPrice + change, 50000);
      
      // Trigger price flash animation
      if (newPrice > btcPrice) {
        setPriceFlashClass('price-flash-up');
      } else if (newPrice < btcPrice) {
        setPriceFlashClass('price-flash-down');
      }
      
      setLastPrice(btcPrice);
      setBtcPrice(newPrice);
      setPriceChange((Math.random() - 0.5) * 5);
      
      // Trigger portfolio animation for significant changes
      if (Math.abs(change) > 50) {
        setPortfolioAnimClass('pulse-highlight');
        setTimeout(() => setPortfolioAnimClass(''), 1000);
      }
      
      // Trigger order book animation
      setOrderBookAnimClass('data-update');
      setTimeout(() => setOrderBookAnimClass(''), 300);
      
      // Reset price flash after animation
      setTimeout(() => setPriceFlashClass(''), 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [btcPrice]);

  // Professional hotkey handlers
  const handleQuickClose = (percentage: number, positionIndex?: number) => {
    const message = positionIndex !== undefined 
      ? `Closing ${percentage}% of position ${positionIndex}` 
      : `Closing ${percentage}% of all positions`;
    console.log(`Professional hotkey: ${message}`);
    toast.success(`📊 ${message}`);
    
    // Trigger position animation
    if (positionIndex !== undefined) {
      setAnimatingPositions(prev => [...prev, positionIndex]);
      setTimeout(() => {
        setAnimatingPositions(prev => prev.filter(idx => idx !== positionIndex));
      }, 500);
    } else {
      setPositionAnimClass('liquidation-warning');
      setTimeout(() => setPositionAnimClass(''), 800);
    }
    
    // Real trading integration would go here
  };


  // 计算函数
  const calculateTPSL = (entryPrice: number, riskReward: string) => {
    const [risk, reward] = riskReward.split(':').map(Number);
    const slDistance = entryPrice * 0.02; // 默认2%止损
    const tpDistance = slDistance * (reward / risk);
    
    if (side === 'buy') {
      return {
        stopLoss: entryPrice - slDistance,
        takeProfit: entryPrice + tpDistance
      };
    } else {
      return {
        stopLoss: entryPrice + slDistance,
        takeProfit: entryPrice - tpDistance
      };
    }
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(value);
  };

  const getRiskLevel = (lev: number) => {
    if (lev <= 5) return { text: 'Low', color: 'text-green-400' };
    if (lev <= 20) return { text: 'Medium', color: 'text-yellow-400' };
    if (lev <= 50) return { text: 'High', color: 'text-orange-400' };
    return { text: 'Extreme', color: 'text-red-400' };
  };

  const getLiquidationPrice = () => {
    const currentPrice = orderType === 'market' ? btcPrice : (parseFloat(price) || btcPrice);
    const margin = parseFloat(amount) || 0;
    if (!margin || !leverage) return 0;
    
    const liqDistance = currentPrice / leverage;
    return side === 'buy' ? currentPrice - liqDistance : currentPrice + liqDistance;
  };

  // 自动计算TP/SL
  const handleRiskRewardChange = (ratio: string) => {
    setRiskRewardRatio(ratio);
    const entryPrice = orderType === 'market' ? btcPrice : (parseFloat(price) || btcPrice);
    const { stopLoss, takeProfit } = calculateTPSL(entryPrice, ratio);
    setQuickSL(stopLoss.toFixed(2));
    setQuickTP(takeProfit.toFixed(2));
  };


  const handleEmergencyCloseAll = () => {
    console.log('Emergency close all positions');
    // 紧急平仓所有持仓
  };

  // 模拟数据
  const portfolioData = {
    totalBalance: '$125,340.56',
    pnl: '+$2,845.23',
    pnlPercent: '+2.35%',
    positions: 3,
    openOrders: 2
  };

  const marketData = [
    { symbol: 'BTC/USDT', price: '$67,425.23', change: '+2.45%', volume: '$2.4B' },
    { symbol: 'ETH/USDT', price: '$3,456.78', change: '-1.23%', volume: '$1.8B' },
    { symbol: 'SOL/USDT', price: '$198.45', change: '+5.67%', volume: '$890M' },
  ];

  const positions = [
    { pair: 'BTC/USDT', side: 'Long', size: '0.5 BTC', pnl: '+$1,234.56', margin: '$5,000' },
    { pair: 'ETH/USDT', side: 'Short', size: '10 ETH', pnl: '-$234.78', margin: '$2,500' },
    { pair: 'SOL/USDT', side: 'Long', size: '50 SOL', pnl: '+$567.89', margin: '$1,200' },
    { pair: 'AVAX/USDT', side: 'Short', size: '25 AVAX', pnl: '-$123.45', margin: '$800' },
    { pair: 'MATIC/USDT', side: 'Long', size: '1000 MATIC', pnl: '+$89.12', margin: '$400' },
    { pair: 'DOT/USDT', side: 'Short', size: '100 DOT', pnl: '-$45.67', margin: '$600' },
    { pair: 'LINK/USDT', side: 'Long', size: '50 LINK', pnl: '+$234.56', margin: '$900' },
    { pair: 'ADA/USDT', side: 'Short', size: '2000 ADA', pnl: '-$67.89', margin: '$300' },
  ];

  const orderBook = {
    asks: [
      { price: 67435.23, amount: 0.2345, total: 15821.45 },
      { price: 67430.12, amount: 0.5678, total: 38291.02 },
      { price: 67425.89, amount: 1.2341, total: 83245.67 },
    ],
    bids: [
      { price: 67420.45, amount: 0.8765, total: 59102.34 },
      { price: 67415.23, amount: 1.5432, total: 104023.67 },
      { price: 67410.12, amount: 0.4321, total: 29134.78 },
    ]
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 overflow-x-hidden mobile-swipe-enabled">
      {/* Animation Styles */}
      <style>{`
        @keyframes flash-green {
          0% { background-color: rgba(34, 197, 94, 0.2); }
          50% { background-color: rgba(34, 197, 94, 0.4); }
          100% { background-color: transparent; }
        }
        
        @keyframes flash-red {
          0% { background-color: rgba(239, 68, 68, 0.2); }
          50% { background-color: rgba(239, 68, 68, 0.4); }
          100% { background-color: transparent; }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        
        @keyframes slide-in {
          0% { transform: translateX(-10px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes liquidation-flash {
          0%, 100% { background-color: transparent; }
          25% { background-color: rgba(239, 68, 68, 0.2); }
          75% { background-color: rgba(239, 68, 68, 0.1); }
        }
        
        .price-flash-up {
          animation: flash-green 300ms cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 8px;
        }
        
        .price-flash-down {
          animation: flash-red 300ms cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 8px;
        }
        
        .data-update {
          transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .pulse-highlight {
          animation: pulse 1s ease-in-out;
        }
        
        .slide-in {
          animation: slide-in 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .liquidation-warning {
          animation: liquidation-flash 800ms ease-in-out;
        }
        
        .smooth-transition {
          transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .hover-scale {
          transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .hover-scale:hover {
          transform: scale(1.02);
        }
        
        .button-press {
          transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .button-press:active {
          transform: scale(0.98);
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.3) rgba(30, 41, 59, 0.1);
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.1);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 3px;
          transition: background 0.2s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
        
        .gradient-border {
          position: relative;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95));
        }
        
        .gradient-border::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.5));
          border-radius: inherit;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: xor;
        }
        
        .premium-shadow {
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.15),
            0 1px 3px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
      `}</style>
      {/* Professional Trading Grid Layout - Right-Handed Optimized for GMX/Hyperliquid standards */}
      <RiverBentoGrid columns={12} className="min-h-screen grid-rows-[120px_500px_380px] gap-3">
        
        {/* Enhanced Price Header - Professional Trading Standard */}
        <LiquidGlassCard 
          bentoSize="full" 
          variant="chart"
          className="flex items-center justify-between p-6"
        >
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                <span className="text-black font-bold text-lg">₿</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">BTC/USDT</h1>
                <p className="text-gray-300 text-base font-medium">Bitcoin / Tether USDT</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className={`text-4xl font-mono font-bold text-white smooth-transition ${priceFlashClass} tracking-wider`}>
                  ${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className={`text-lg font-semibold smooth-transition mt-1 ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (24h)
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-3">
                  <Badge variant="outline" className="text-green-400 border-green-400/50 bg-green-400/10 px-4 py-2 text-sm font-semibold">
                    Vol: $2.4B
                  </Badge>
                  <Badge variant="outline" className="text-blue-400 border-blue-400/50 bg-blue-400/10 px-4 py-2 text-sm font-semibold">
                    High: $68,234
                  </Badge>
                  <Badge variant="outline" className="text-orange-400 border-orange-400/50 bg-orange-400/10 px-4 py-2 text-sm font-semibold">
                    Low: $66,543
                  </Badge>
                </div>
                <div className="flex space-x-3 text-sm">
                  <div className="text-gray-300">24h Range: <span className="font-mono">$66,543 - $68,234</span></div>
                  <div className="text-gray-300">Market Cap: <span className="font-mono text-white">$1.34T</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="border-river-surface text-river-surface">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAIAssistant(!showAIAssistant)}
              className={`border-purple-400 text-purple-400 transition-all duration-200 ${
                showAIAssistant ? 'bg-purple-400/20 border-purple-300' : 'hover:bg-purple-400/10'
              }`}
              title="Toggle AI Assistant (Alt+A)"
            >
              <Brain className="w-4 h-4 mr-2" />
              AI Assist
              <span className="ml-2 text-xs opacity-70">Alt+A</span>
            </Button>
          </div>
        </LiquidGlassCard>

        {/* Portfolio & Market Data - Left Data Panel (17% width) */}
        <LiquidGlassCard 
          bentoSize="data" 
          variant="trading"
          className="p-4 flex flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
            {/* Compact Portfolio Overview */}
            <div className={`space-y-3 ${portfolioAnimClass}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Portfolio</h3>
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
                  <div className="text-xs text-gray-400 mb-1">Total Balance</div>
                  <div className="text-lg font-mono font-bold text-white smooth-transition">{portfolioData.totalBalance}</div>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-green-900/20 rounded-lg p-2 border border-green-400/30">
                    <div className="text-xs text-green-400 mb-1">24h PnL</div>
                    <div className="text-sm font-mono font-bold text-green-400 smooth-transition">{portfolioData.pnl}</div>
                  </div>
                  <div className="bg-blue-900/20 rounded-lg p-2 border border-blue-400/30">
                    <div className="text-xs text-blue-400 mb-1">ROI</div>
                    <div className="text-sm font-mono font-bold text-blue-400 smooth-transition">+12.3%</div>
                  </div>
                </div>
                
                <div className="flex justify-between text-xs">
                  <div className="text-center">
                    <div className="text-white font-semibold">{portfolioData.positions}</div>
                    <div className="text-gray-400">Pos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">{portfolioData.openOrders}</div>
                    <div className="text-gray-400">Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">87.5%</div>
                    <div className="text-gray-400">Win</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Compact Markets Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Hot Markets</h3>
              <div className="space-y-1">
                {marketData.slice(0, 3).map((market, i) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-800/40 rounded-lg cursor-pointer hover-scale smooth-transition border border-slate-700/30">
                    <div>
                      <div className="text-xs font-semibold text-white">{market.symbol}</div>
                      <div className="text-xs text-gray-400">{market.volume}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-medium text-white smooth-transition">{market.price}</div>
                      <div className={`text-xs font-semibold smooth-transition ${market.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                        {market.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compact Order Book */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Order Book</h3>
                <Badge variant="outline" className="text-xs border-river-surface text-river-surface">BTC/USDT</Badge>
              </div>

              <div className="space-y-1">
                {/* Compact Ask Orders */}
                <div className={`space-y-1 ${orderBookAnimClass}`}>
                  {orderBook.asks.slice(0, 2).map((ask, i) => (
                    <div key={i} className="grid grid-cols-2 text-xs hover:bg-red-900/20 p-1 rounded cursor-pointer smooth-transition">
                      <span className="text-red-400 font-mono font-semibold">{ask.price.toLocaleString()}</span>
                      <span className="text-right text-gray-300 font-mono">{ask.amount.toFixed(3)}</span>
                    </div>
                  ))}
                </div>

                <div className="py-1 text-center border-y border-slate-600 bg-slate-800/30 rounded">
                  <span className={`text-sm font-mono font-bold text-white smooth-transition ${priceFlashClass}`}>
                    {btcPrice.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Compact Bid Orders */}
                <div className={`space-y-1 ${orderBookAnimClass}`}>
                  {orderBook.bids.slice(0, 2).map((bid, i) => (
                    <div key={i} className="grid grid-cols-2 text-xs hover:bg-green-900/20 p-1 rounded cursor-pointer smooth-transition">
                      <span className="text-green-400 font-mono font-semibold">{bid.price.toLocaleString()}</span>
                      <span className="text-right text-gray-300 font-mono">{bid.amount.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </LiquidGlassCard>

        {/* Chart Area - Main Hero Area (58% width) */}
        <LiquidGlassCard 
          bentoSize="chart" 
          variant="chart"
          className="p-4"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">BTC/USDT Chart</h3>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">1m</Button>
                <Button size="sm" variant="outline">5m</Button>
                <Button size="sm" variant="default">1h</Button>
                <Button size="sm" variant="outline">4h</Button>
                <Button size="sm" variant="outline">1D</Button>
              </div>
            </div>
            
            {/* 模拟图表区域 */}
            <div className="flex-1 bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-lg border border-slate-700/30 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">TradingView Chart Component</p>
                <p className="text-sm text-slate-500">Advanced charting coming soon</p>
              </div>
            </div>
          </div>
        </LiquidGlassCard>

        {/* Professional Trading Panel - Right Side (25% width) */}
        <LiquidGlassCard 
          bentoSize="trading" 
          variant="trading"
          withRipple={true}
          className="p-5 border border-river-surface/20 flex flex-col"
        >
          <div className="space-y-4">
            {/* Enhanced Trading Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {showAIChatDialog ? 'AI Trading Assistant' : 'Trade BTC'}
                </h3>
                <p className="text-sm text-gray-400">
                  {showAIChatDialog ? 'Intelligent Trading Guidance' : 'Professional Order Entry'}
                </p>
              </div>
              <div className="flex items-center space-x-2 bg-slate-800/50 rounded-xl p-1 border border-slate-700">
                <Button 
                  size="sm" 
                  variant={side === 'buy' && !showAIChatDialog ? 'default' : 'ghost'}
                  onClick={() => {
                    setSide('buy');
                    setShowAIChatDialog(false);
                  }}
                  className={`button-press smooth-transition touch-feedback touch-scale px-4 py-2.5 rounded-lg font-semibold flex-1 ${side === 'buy' && !showAIChatDialog ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30' : 'text-green-400 hover:bg-green-400/10'}`}
                >
                  BUY
                </Button>
                <Button 
                  size="sm" 
                  variant={side === 'sell' && !showAIChatDialog ? 'default' : 'ghost'}
                  onClick={() => {
                    setSide('sell');
                    setShowAIChatDialog(false);
                  }}
                  className={`button-press smooth-transition touch-feedback touch-scale px-4 py-2.5 rounded-lg font-semibold flex-1 ${side === 'sell' && !showAIChatDialog ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30' : 'text-red-400 hover:bg-red-400/10'}`}
                >
                  SELL
                </Button>
                <Button 
                  size="sm" 
                  variant={showAIChatDialog ? 'default' : 'ghost'}
                  onClick={() => setShowAIChatDialog(!showAIChatDialog)}
                  className={`button-press smooth-transition touch-feedback touch-scale px-3 py-2.5 rounded-lg font-medium flex items-center space-x-1 relative ${showAIChatDialog ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30' : 'text-purple-400 hover:bg-purple-400/10 hover:text-purple-300'}`}
                  title="AI交易对话 (点击打开聊天)"
                >
                  <Brain className="w-4 h-4" />
                  {showAIChatDialog && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  )}
                </Button>
              </div>
            </div>

            {/* 条件渲染：AI对话模式 or 交易表单模式 */}
            {showAIChatDialog ? (
              // AI Trading Chat Interface
              <div className="flex-1 flex flex-col">
                {/* AI Chat Container */}
                <div className="flex-1 bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl border border-purple-400/30 p-4">
                  <TradingAssistantChat
                    userAddress={userAddress}
                    isConnected={isConnected}
                    accountBalance={125340.56}
                    className="h-full border-0 bg-transparent"
                    selectedTradingPair="BTC/USDT"
                    currentPrice={btcPrice}
                    onPlanExecute={async (plan) => {
                      console.log('执行交易计划:', plan);
                      // 应用AI建议到交易表单
                      setSide(plan.side || 'buy');
                      setLeverage(plan.leverage || 10);
                      setAmount(plan.amount?.toString() || '1000');
                      if (plan.price) setPrice(plan.price.toString());
                      // 切换回交易模式
                      setShowAIChatDialog(false);
                    }}
                    onPlanBookmark={(planId) => {
                      console.log('收藏计划:', planId);
                    }}
                    onPlanShare={(plan) => {
                      console.log('分享计划:', plan);
                    }}
                  />
                </div>
                
                {/* AI Quick Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-purple-900/20 border-purple-400/50 text-purple-300 hover:bg-purple-800/30"
                    onClick={() => setShowAIChatDialog(false)}
                  >
                    ↩️ 返回交易
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-purple-900/20 border-purple-400/50 text-purple-300 hover:bg-purple-800/30"
                  >
                    📊 市场分析
                  </Button>
                </div>
              </div>
            ) : (
              // Trading Form Interface
              <>
            {/* Professional Quick Actions */}
            <div className="space-y-3 p-4 bg-slate-900/60 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-300">Leverage</label>
                <span className={`text-sm font-bold px-2 py-1 rounded-lg ${getRiskLevel(leverage).color} bg-slate-800/60`}>
                  {leverage}x ({getRiskLevel(leverage).text})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  size="sm" 
                  variant={leverage === 10 ? 'default' : 'outline'} 
                  onClick={() => setLeverage(10)} 
                  className={`button-press font-semibold ${leverage === 10 ? 'bg-blue-600 text-white' : 'border-slate-600 text-slate-300 hover:border-blue-400'}`}
                >
                  10x
                </Button>
                <Button 
                  size="sm" 
                  variant={leverage === 25 ? 'default' : 'outline'} 
                  onClick={() => setLeverage(25)} 
                  className={`button-press font-semibold ${leverage === 25 ? 'bg-orange-600 text-white' : 'border-slate-600 text-slate-300 hover:border-orange-400'}`}
                >
                  25x
                </Button>
                <Button 
                  size="sm" 
                  variant={leverage === 50 ? 'default' : 'outline'} 
                  onClick={() => setLeverage(50)} 
                  className={`button-press font-semibold ${leverage === 50 ? 'bg-red-600 text-white' : 'border-slate-600 text-slate-300 hover:border-red-400'}`}
                >
                  50x
                </Button>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <label className="text-sm font-semibold text-gray-300">Risk/Reward</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm" 
                  variant={riskRewardRatio === '1:2' ? 'default' : 'outline'} 
                  onClick={() => handleRiskRewardChange('1:2')} 
                  className={`button-press font-semibold ${riskRewardRatio === '1:2' ? 'bg-green-600 text-white' : 'border-slate-600 text-slate-300'}`}
                >
                  1:2 Ratio
                </Button>
                <Button 
                  size="sm" 
                  variant={riskRewardRatio === '1:3' ? 'default' : 'outline'} 
                  onClick={() => handleRiskRewardChange('1:3')} 
                  className={`button-press font-semibold ${riskRewardRatio === '1:3' ? 'bg-green-600 text-white' : 'border-slate-600 text-slate-300'}`}
                >
                  1:3 Ratio
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Order Type</label>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant={orderType === 'market' ? 'default' : 'outline'}
                    onClick={() => setOrderType('market')}
                    className="flex-1 text-xs py-1 button-press"
                  >
                    Market
                  </Button>
                  <Button
                    size="sm"
                    variant={orderType === 'limit' ? 'default' : 'outline'}
                    onClick={() => setOrderType('limit')}
                    className="flex-1 text-xs py-1 button-press"
                  >
                    Limit
                  </Button>
                </div>
              </div>

              {orderType === 'limit' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Price (USDT)</label>
                  <Input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Enter price"
                    className="bg-slate-800/50 border-slate-600 text-sm h-8 smooth-transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Amount (BTC)</label>
                <div className="relative">
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-800/50 border-slate-600 font-mono text-sm h-8 pr-16 smooth-transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    ≈ {formatUSD((parseFloat(amount) || 0) * btcPrice)}
                  </div>
                </div>
              </div>

              {/* TP/SL 快速设置区域 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Take Profit / Stop Loss</label>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-river-surface hover:text-white"
                  >
                    {showAdvanced ? 'Simple' : 'Advanced'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <Input
                      value={quickTP}
                      onChange={(e) => setQuickTP(e.target.value)}
                      placeholder="Take Profit"
                      className="bg-slate-800/50 border-green-600/30 text-xs font-mono h-8"
                    />
                  </div>
                  <div>
                    <Input
                      value={quickSL}
                      onChange={(e) => setQuickSL(e.target.value)}
                      placeholder="Stop Loss"
                      className="bg-slate-800/50 border-red-600/30 text-xs font-mono h-8"
                    />
                  </div>
                </div>
                {showAdvanced && (
                  <div className="text-xs text-gray-400 bg-slate-800/30 p-2 rounded">
                    <div className="flex justify-between">
                      <span>Risk/Reward: {riskRewardRatio}</span>
                      <span>Expected: {quickTP && quickSL ? `${((parseFloat(quickTP) - btcPrice) / (btcPrice - parseFloat(quickSL)) * 100).toFixed(1)}%` : 'N/A'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">Leverage: {leverage}x</label>
                  <span className={`text-xs font-semibold ${getRiskLevel(leverage).color}`}>
                    {getRiskLevel(leverage).text} Risk
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1x</span>
                  <span>25x</span>
                  <span>50x</span>
                  <span>100x</span>
                </div>
                
                {/* 风险指示器 */}
                <div className={`mt-2 p-2 rounded-lg ${
                  leverage <= 5 ? 'bg-green-900/20 border border-green-600/30' :
                  leverage <= 20 ? 'bg-yellow-900/20 border border-yellow-600/30' :
                  leverage <= 50 ? 'bg-orange-900/20 border border-orange-600/30' :
                  'bg-red-900/20 border border-red-600/30'
                }`}>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">Liquidation: ${getLiquidationPrice().toFixed(2)}</span>
                    <span className="text-gray-300">Margin: {parseFloat(amount) ? ((parseFloat(amount) * btcPrice) / leverage).toFixed(0) : '0'} USD</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1">
                <Button size="sm" variant="outline" className="text-xs py-1 button-press">25%</Button>
                <Button size="sm" variant="outline" className="text-xs py-1 button-press">50%</Button>
                <Button size="sm" variant="outline" className="text-xs py-1 button-press">75%</Button>
                <Button size="sm" variant="outline" className="text-xs py-1 button-press">100%</Button>
              </div>
            </div>

            {/* Professional Execute Button */}
            <div className="pt-2">
              <Button 
                className={`w-full h-12 button-press smooth-transition touch-feedback touch-scale text-lg font-bold tracking-wide ${side === 'buy' 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-600/30' 
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-600/30'
                } border-0 rounded-xl`}
                disabled={!isWalletConnected}
              >
                <Zap className="w-5 h-5 mr-3" />
                {side.toUpperCase()} BTC
              </Button>
              
              {/* Trading Summary */}
              <div className="mt-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Est. Cost:</span>
                  <span className="font-mono text-white">{formatUSD((parseFloat(amount) || 0) * btcPrice)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Liquidation:</span>
                  <span className="font-mono text-orange-400">${getLiquidationPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Fees:</span>
                  <span className="font-mono text-gray-300">~$2.50</span>
                </div>
              </div>
            </div>
              </>
            )}

          </div>
        </LiquidGlassCard>

        {/* Active Positions - Completely Redesigned Professional Layout */}
        <LiquidGlassCard 
          bentoSize="full" 
          variant="medium"
          className={`p-6 flex flex-col ${positionAnimClass}`}
        >
          {/* Enhanced Professional Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-5">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-white">Positions</h3>
                <span className="text-sm text-gray-400">({positions.length})</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-green-400 font-mono">+$1,632.45</span>
              </div>
            </div>
            
            {/* Enhanced Action Controls */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-slate-800/40 rounded-xl p-1.5 border border-slate-700/50">
                <Button 
                  size="default" 
                  variant="ghost" 
                  onClick={() => handleQuickClose(25)}
                  className="px-4 py-2.5 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 button-press font-medium text-sm rounded-lg"
                >
                  Close 25%
                </Button>
                <Button 
                  size="default" 
                  variant="ghost" 
                  onClick={() => handleQuickClose(50)}
                  className="px-4 py-2.5 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 button-press font-medium text-sm rounded-lg"
                >
                  Close 50%
                </Button>
                <Button 
                  size="default" 
                  variant="ghost" 
                  onClick={() => handleQuickClose(100)}
                  className="px-4 py-2.5 text-red-400 hover:bg-red-500/20 hover:text-red-300 button-press font-medium text-sm rounded-lg"
                >
                  Close All
                </Button>
              </div>
              <Button 
                size="default" 
                variant="destructive" 
                onClick={handleEmergencyCloseAll}
                className="px-5 py-2.5 bg-red-600/90 hover:bg-red-600 button-press font-medium text-sm rounded-lg"
              >
                <Target className="w-4 h-4 mr-2" />
                Emergency Close
              </Button>
            </div>
          </div>
          
          {/* Professional Data Table with Improved Spacing */}
          <div className="w-full">
            {/* Professional Data Table Header */}
            <div className="border-b border-slate-700 pb-2 mb-3">
              <div className="grid grid-cols-[140px_80px_120px_120px_120px_140px_180px] gap-4 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <span>Pair</span>
                <span>Side</span>
                <span>Size</span>
                <span>Entry</span>
                <span>Mark</span>
                <span>PnL</span>
                <span>Actions</span>
              </div>
            </div>
            
            {/* Enhanced Position Rows with Premium Spacing */}
            <div className="space-y-2">
              {positions.map((position, i) => (
                <div key={i} className={`group relative overflow-hidden rounded-xl border border-slate-700/30 hover:border-slate-600/50 smooth-transition ${
                  animatingPositions.includes(i) ? 'scale-[1.01] shadow-lg shadow-blue-500/20 border-blue-500/40' : ''
                }`}>
                  {/* Gradient Background Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-800/20 via-slate-900/30 to-slate-800/20 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  
                  <div className="relative grid grid-cols-[140px_80px_120px_120px_120px_140px_180px] gap-4 items-center p-3">
                    {/* Trading Pair */}
                    <div>
                      <span className="text-white font-medium text-sm">{position.pair}</span>
                    </div>
                    
                    {/* Side */}
                    <div>
                      <span className={`text-xs font-semibold ${
                        position.side === 'Long' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.side}
                      </span>
                    </div>
                    
                    {/* Size */}
                    <div>
                      <span className="text-white font-mono text-sm">{position.size}</span>
                    </div>
                    
                    {/* Entry Price */}
                    <div>
                      <span className="text-gray-300 font-mono text-sm">$65,420</span>
                    </div>
                    
                    {/* Mark Price */}
                    <div>
                      <span className="text-white font-mono text-sm">${btcPrice.toFixed(0)}</span>
                    </div>
                    
                    {/* PnL */}
                    <div>
                      <span className={`font-mono text-sm font-medium ${
                        position.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.pnl}
                      </span>
                    </div>
                    
                    {/* Professional Risk Management Actions */}
                    <div className="flex items-center justify-center space-x-2 opacity-70 group-hover:opacity-100 transition-all duration-300">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleQuickClose(25, i)}
                        className="px-3 py-2 h-9 text-sm font-bold border-yellow-500/40 text-yellow-400 hover:border-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/15 button-press rounded-lg transition-all shadow-sm"
                      >
                        25%
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleQuickClose(50, i)}
                        className="px-3 py-2 h-9 text-sm font-bold border-orange-500/40 text-orange-400 hover:border-orange-400 hover:text-orange-300 hover:bg-orange-400/15 button-press rounded-lg transition-all shadow-sm"
                      >
                        50%
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleQuickClose(100, i)}
                        className="px-3 py-2 h-9 text-sm font-bold border-red-500/40 text-red-400 hover:bg-red-600/20 hover:border-red-400 hover:text-red-300 button-press rounded-lg transition-all shadow-sm"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Premium Footer Section */}
          <div className="mt-6 pt-6 border-t border-gradient-to-r from-slate-700/30 via-slate-600/50 to-slate-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{positions.length}</div>
                  <div className="text-sm text-gray-400 font-medium">Total Positions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">+$1,632.45</div>
                  <div className="text-sm text-gray-400 font-medium">Total PnL</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">${(125340.56).toLocaleString()}</div>
                  <div className="text-sm text-gray-400 font-medium">Portfolio Value</div>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Live updates</span>
                </div>
                <span>•</span>
                <span>Ctrl+Q: Quick close all</span>
                <span>•</span>
                <span>Esc: Emergency stop</span>
              </div>
            </div>
          </div>
        </LiquidGlassCard>


      </RiverBentoGrid>


      {/* AI Panel Slide Animation */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 300ms ease-out;
        }
        
        /* Mobile AI Button Optimizations */
        @media (max-width: 768px) {
          .ai-mobile-stack {
            flex-direction: column;
            gap: 8px;
          }
          
          .ai-mobile-stack .ai-button {
            width: 100%;
            justify-content: center;
          }
          
          .trading-buttons-mobile {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          
          .ai-panel-mobile {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 50;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 16px 16px 0 0;
            max-height: 70vh;
            overflow-y: auto;
          }
        }
      `}</style>


    </div>
  );
};

export default LiquidBentoTradingInterface;