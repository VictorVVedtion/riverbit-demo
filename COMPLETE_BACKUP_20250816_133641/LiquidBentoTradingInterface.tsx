import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Zap, Brain, Target, Activity, X, Lightbulb, ArrowRight } from 'lucide-react';
import LiquidGlassCard from './ui/LiquidGlassCard';
import RiverBentoGrid from './ui/RiverBentoGrid';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import TradingAssistantChat from './trading-assistant/TradingAssistantChat';
import AITradingChatDialog from './ai/AITradingChatDialog';
import TradingViewChart from './trading/TradingViewChart';
import HyperliquidAssetSelector from './trading/HyperliquidAssetSelector';
import { useRealTimePrices } from '../hooks/useRealTimePrices';

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
  const [selectedAsset, setSelectedAsset] = useState('BTC-PERP');
  const [orderType, setOrderType] = useState('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState(10);
  
  // 快速止损/止盈设置
  const [quickTP, setQuickTP] = useState('');
  const [quickSL, setQuickSL] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 实时价格数据（替换模拟数据）
  const hotMarketSymbols = ['BTC-PERP', 'ETH-PERP', 'SOL-PERP'];
  const { prices, isLoading: pricesLoading, getPrice } = useRealTimePrices([selectedAsset, ...hotMarketSymbols]);
  const currentPrice = getPrice(selectedAsset);
  const [isDataPaused, setIsDataPaused] = useState(false);
  const [hasPosition, setHasPosition] = useState(true); // Mock data
  const [hasOrders, setHasOrders] = useState(true); // Mock data
  
  // Price state for animations and calculations
  const [btcPrice, setBtcPrice] = useState(67425.23);
  const [priceChange, setPriceChange] = useState(2.45);
  
  // Animation states
  const [priceFlashClass, setPriceFlashClass] = useState('');
  const [portfolioAnimClass, setPortfolioAnimClass] = useState('');
  const [orderBookAnimClass, setOrderBookAnimClass] = useState('');
  const [positionAnimClass, setPositionAnimClass] = useState('');
  const [lastPrice, setLastPrice] = useState(currentPrice?.price || 67425.23);
  const [animatingPositions, setAnimatingPositions] = useState<number[]>([]);
  
  // Price animation with real-time data
  useEffect(() => {
    if (currentPrice && currentPrice.price !== lastPrice) {
      const change = currentPrice.price - lastPrice;
      setLastPrice(currentPrice.price);
      
      // Flash animation for price changes
      setPriceFlashClass(change >= 0 ? 'price-flash-green' : 'price-flash-red');
      setTimeout(() => setPriceFlashClass(''), 600);
    }
  }, [currentPrice, lastPrice]);
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
    const marketPrice = currentPrice?.price || btcPrice;
    const entryPrice = orderType === 'market' ? marketPrice : (parseFloat(price) || marketPrice);
    const usdtAmount = parseFloat(amount) || 0;
    if (!usdtAmount || !leverage) return 0;
    
    const liqDistance = entryPrice / leverage;
    return side === 'buy' ? entryPrice - liqDistance : entryPrice + liqDistance;
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

  // 生成实时热门市场数据
  const marketData = hotMarketSymbols.map(symbol => {
    const price = getPrice(symbol);
    const displaySymbol = symbol.replace('-PERP', '/USDT');
    return {
      symbol: displaySymbol,
      price: price ? `$${price.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '--',
      change: price ? `${price.changePercent24h >= 0 ? '+' : ''}${price.changePercent24h.toFixed(2)}%` : '--',
      volume: symbol === 'BTC-PERP' ? '$2.4B' : symbol === 'ETH-PERP' ? '$1.8B' : '$890M'
    };
  });

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

  // 生成基于实时价格的模拟订单簿数据
  const generateOrderBook = () => {
    const basePrice = currentPrice?.price || 67425;
    const minSpread = basePrice * 0.0001; // 最小价差 0.01%
    const maxSpread = basePrice * 0.003;  // 最大价差 0.3%
    
    // 生成卖单（Ask Orders）- 价格由低到高
    const asks = [];
    let cumulativeAskAmount = 0;
    
    for (let i = 0; i < 8; i++) {
      // 非线性价格分布，靠近市价的订单密度更高
      const priceStep = i < 3 ? 
        minSpread * (1 + i * 0.5) : 
        minSpread * (2 + (i - 3) * 1.2);
      const price = basePrice + priceStep;
      
      // 真实的订单量分布：靠近市价订单量较小，远离市价订单量较大
      let baseAmount;
      if (i === 0) baseAmount = 0.05 + Math.random() * 0.1; // 最接近市价的小单
      else if (i < 3) baseAmount = 0.1 + Math.random() * 0.2; // 中等订单
      else baseAmount = 0.3 + Math.random() * 0.5; // 大额挂单
      
      // 添加市场深度的真实性：有时会有大额订单
      if (Math.random() < 0.15) baseAmount *= 2.5; // 15%概率出现大额订单
      
      cumulativeAskAmount += baseAmount;
      
      asks.push({
        price: Math.round(price * 100) / 100,
        amount: Math.round(baseAmount * 10000) / 10000,
        total: Math.round(cumulativeAskAmount * 10000) / 10000,
        depth: Math.round((cumulativeAskAmount * price) * 100) / 100 // 累计美元价值
      });
    }
    
    // 生成买单（Bid Orders）- 价格由高到低
    const bids = [];
    let cumulativeBidAmount = 0;
    
    for (let i = 0; i < 8; i++) {
      const priceStep = i < 3 ? 
        minSpread * (1 + i * 0.5) : 
        minSpread * (2 + (i - 3) * 1.2);
      const price = basePrice - priceStep;
      
      // 买单通常比卖单稍微大一些（模拟流动性差异）
      let baseAmount;
      if (i === 0) baseAmount = 0.08 + Math.random() * 0.12;
      else if (i < 3) baseAmount = 0.15 + Math.random() * 0.25;
      else baseAmount = 0.4 + Math.random() * 0.6;
      
      if (Math.random() < 0.18) baseAmount *= 3; // 18%概率出现大额买单
      
      cumulativeBidAmount += baseAmount;
      
      bids.push({
        price: Math.round(price * 100) / 100,
        amount: Math.round(baseAmount * 10000) / 10000,
        total: Math.round(cumulativeBidAmount * 10000) / 10000,
        depth: Math.round((cumulativeBidAmount * price) * 100) / 100
      });
    }
    
    return { asks, bids };
  };
  
  const orderBook = generateOrderBook();

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
      {/* Professional Trading Grid Layout - Compact Layout for Single Screen View */}
      <RiverBentoGrid columns={12} className="min-h-screen grid-rows-[80px_1fr_200px] gap-3">
        
        {/* Enhanced Price Header - Compact Professional Trading Standard */}
        <LiquidGlassCard 
          bentoSize="full" 
          variant="chart"
          className="flex items-center justify-between p-4"
        >
          <div className="flex items-center space-x-6">
            {/* 使用 HyperliquidAssetSelector 替换静态选择器 */}
            <HyperliquidAssetSelector
              selectedAsset={selectedAsset}
              onAssetSelect={(assetId) => {
                setSelectedAsset(assetId);
                setSelectedPair(assetId.replace('-PERP', '/USDT'));
              }}
            />
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className={`text-3xl font-mono font-bold text-white smooth-transition ${priceFlashClass} tracking-wider`}>
                  ${currentPrice ? currentPrice.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '67,425.23'}
                </div>
                <div className={`text-base font-semibold smooth-transition ${(currentPrice?.changePercent24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(currentPrice?.changePercent24h || 0) >= 0 ? '+' : ''}{(currentPrice?.changePercent24h || 2.45).toFixed(2)}% (24h)
                </div>
              </div>
              
              <div className="flex flex-col space-y-1">
                <div className="flex space-x-2">
                  <Badge variant="outline" className="text-green-400 border-green-400/50 bg-green-400/10 px-3 py-1 text-xs font-semibold">
                    Vol: $2.4B
                  </Badge>
                  <Badge variant="outline" className="text-blue-400 border-blue-400/50 bg-blue-400/10 px-3 py-1 text-xs font-semibold">
                    High: $68,234
                  </Badge>
                  <Badge variant="outline" className="text-orange-400 border-orange-400/50 bg-orange-400/10 px-3 py-1 text-xs font-semibold">
                    Low: $66,543
                  </Badge>
                </div>
                <div className="flex space-x-3 text-xs">
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
                {/* Order Book Header */}
                <div className="grid grid-cols-3 text-xs text-gray-400 font-semibold px-1 pb-1 border-b border-slate-700/50">
                  <span>Price (USDT)</span>
                  <span className="text-center">Size (BTC)</span>
                  <span className="text-right">Total</span>
                </div>
                
                {/* Ask Orders - 卖单从下到上显示 */}
                <div className={`space-y-0.5 ${orderBookAnimClass}`}>
                  {orderBook.asks.slice(0, 5).reverse().map((ask, i) => {
                    const maxDepth = Math.max(...orderBook.asks.slice(0, 5).map(a => a.total));
                    const depthPercent = (ask.total / maxDepth) * 100;
                    
                    return (
                      <div 
                        key={i} 
                        className="relative grid grid-cols-3 text-xs hover:bg-red-900/20 p-1 rounded cursor-pointer smooth-transition group"
                      >
                        {/* 深度背景条 */}
                        <div 
                          className="absolute inset-0 bg-red-500/10 rounded"
                          style={{ width: `${depthPercent}%` }}
                        />
                        
                        <span className="relative text-red-400 font-mono font-semibold z-10">
                          {ask.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="relative text-center text-gray-300 font-mono z-10">
                          {ask.amount.toFixed(4)}
                        </span>
                        <span className="relative text-right text-gray-400 font-mono text-xs z-10">
                          {ask.total.toFixed(3)}
                        </span>
                        
                        {/* Hover tooltip */}
                        <div className="absolute left-full ml-2 top-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          ${ask.depth?.toLocaleString()} depth
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Spread Display */}
                <div className="py-2 text-center border-y border-slate-600 bg-slate-800/40 rounded">
                  <div className={`text-sm font-mono font-bold text-white smooth-transition ${priceFlashClass}`}>
                    {(currentPrice?.price || btcPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    <span className="text-orange-400">
                      ⚡ ${Math.abs((orderBook.asks[0]?.price || 0) - (orderBook.bids[0]?.price || 0)).toFixed(2)}
                    </span>
                    <span className="ml-2 text-purple-400">
                      ({(Math.abs((orderBook.asks[0]?.price || 0) - (orderBook.bids[0]?.price || 0)) / (currentPrice?.price || btcPrice) * 100).toFixed(3)}%)
                    </span>
                  </div>
                </div>

                {/* Bid Orders - 买单从上到下显示 */}
                <div className={`space-y-0.5 ${orderBookAnimClass}`}>
                  {orderBook.bids.slice(0, 5).map((bid, i) => {
                    const maxDepth = Math.max(...orderBook.bids.slice(0, 5).map(b => b.total));
                    const depthPercent = (bid.total / maxDepth) * 100;
                    
                    return (
                      <div 
                        key={i} 
                        className="relative grid grid-cols-3 text-xs hover:bg-green-900/20 p-1 rounded cursor-pointer smooth-transition group"
                      >
                        {/* 深度背景条 */}
                        <div 
                          className="absolute inset-0 bg-green-500/10 rounded"
                          style={{ width: `${depthPercent}%` }}
                        />
                        
                        <span className="relative text-green-400 font-mono font-semibold z-10">
                          {bid.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="relative text-center text-gray-300 font-mono z-10">
                          {bid.amount.toFixed(4)}
                        </span>
                        <span className="relative text-right text-gray-400 font-mono text-xs z-10">
                          {bid.total.toFixed(3)}
                        </span>
                        
                        {/* Hover tooltip */}
                        <div className="absolute left-full ml-2 top-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          ${bid.depth?.toLocaleString()} depth
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </LiquidGlassCard>

        {/* Professional Chart Area - Hero Layout (7×4 = 58% width, 80%+ screen height) */}
        <LiquidGlassCard 
          bentoSize="hero" 
          variant="chart"
          className="p-4 flex flex-col"
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
              
              {/* 真实 TradingView K线图表 */}
              <div className="flex-1 relative min-h-0">
                <TradingViewChart
                  symbol={`BINANCE:${selectedAsset.replace('-PERP', 'USDT')}`}
                  interval="1h"
                  theme="dark"
                  className="w-full h-full"
                  autosize={true}
                />
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
          {showAIChatDialog ? (
            // AI Chat Interface - 嵌入式
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Brain className="w-6 h-6 text-purple-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">AI Trading Assistant</h3>
                    <p className="text-sm text-gray-400">Intelligent Trading Guidance</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowAIChatDialog(false)}
                  className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* AI Chat Container - 使用完整高度 */}
              <div className="flex-1 min-h-0">
                <TradingAssistantChat
                  userAddress={userAddress}
                  isConnected={isConnected}
                  accountBalance={125340.56}
                  className="h-full"
                  selectedTradingPair={selectedPair}
                  currentPrice={currentPrice?.price || 67425}
                  onPlanExecute={async (plan) => {
                    console.log('执行交易计划:', plan);
                  }}
                  onPlanBookmark={(planId) => {
                    console.log('收藏计划:', planId);
                  }}
                  onPlanShare={(plan) => {
                    console.log('分享计划:', plan);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
            {/* Enhanced Trading Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xl font-bold text-white">Trade BTC</h3>
                <p className="text-sm text-gray-400">Professional Order Entry</p>
              </div>
              <div className="flex items-center space-x-2 bg-slate-800/50 rounded-xl p-1 border border-slate-700">
                <Button 
                  size="sm" 
                  variant={side === 'buy' ? 'default' : 'ghost'}
                  onClick={() => setSide('buy')}
                  className={`button-press smooth-transition touch-feedback touch-scale px-4 py-2.5 rounded-lg font-semibold flex-1 ${side === 'buy' ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30' : 'text-green-400 hover:bg-green-400/10'}`}
                >
                  BUY
                </Button>
                <Button 
                  size="sm" 
                  variant={side === 'sell' ? 'default' : 'ghost'}
                  onClick={() => setSide('sell')}
                  className={`button-press smooth-transition touch-feedback touch-scale px-4 py-2.5 rounded-lg font-semibold flex-1 ${side === 'sell' ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30' : 'text-red-400 hover:bg-red-400/10'}`}
                >
                  SELL
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setShowAIChatDialog(!showAIChatDialog)}
                  className={`button-press smooth-transition touch-feedback touch-scale px-3 py-2.5 rounded-lg font-medium flex items-center space-x-1 relative ${showAIChatDialog ? 'text-purple-300 bg-purple-500/15 border border-purple-400/30' : 'text-purple-400 hover:bg-purple-400/10 hover:text-purple-300'}`}
                  title="AI交易对话 (点击打开聊天)"
                >
                  <Brain className="w-4 h-4" />
                  {showAIChatDialog && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  )}
                </Button>
              </div>
            </div>

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
              
              {/* Risk/Reward Display - 只读显示 */}
              <div className="mt-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-300">Risk/Reward Analysis</label>
                  <div className="text-xs text-gray-400">Auto-calculated</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-slate-700/30 rounded border border-slate-600/50">
                    <div className="text-xs text-gray-400 mb-1">Risk/Reward Ratio</div>
                    <div className="text-sm font-mono font-bold text-blue-400">
                      {quickTP && quickSL ? `1:${((parseFloat(quickTP) - (currentPrice?.price || btcPrice)) / ((currentPrice?.price || btcPrice) - parseFloat(quickSL))).toFixed(2)}` : '--'}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-slate-700/30 rounded border border-slate-600/50">
                    <div className="text-xs text-gray-400 mb-1">Risk Level</div>
                    <div className={`text-sm font-bold ${
                      !quickTP || !quickSL ? 'text-gray-400' :
                      ((parseFloat(quickTP) - (currentPrice?.price || btcPrice)) / ((currentPrice?.price || btcPrice) - parseFloat(quickSL))) >= 2 ? 'text-green-400' :
                      ((parseFloat(quickTP) - (currentPrice?.price || btcPrice)) / ((currentPrice?.price || btcPrice) - parseFloat(quickSL))) >= 1 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {!quickTP || !quickSL ? '--' :
                       ((parseFloat(quickTP) - (currentPrice?.price || btcPrice)) / ((currentPrice?.price || btcPrice) - parseFloat(quickSL))) >= 2 ? 'Good' :
                       ((parseFloat(quickTP) - (currentPrice?.price || btcPrice)) / ((currentPrice?.price || btcPrice) - parseFloat(quickSL))) >= 1 ? 'Fair' : 'Poor'}
                    </div>
                  </div>
                </div>
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
                    value={price || (currentPrice?.price.toString() || btcPrice.toString())}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={`Market: $${(currentPrice?.price || btcPrice).toLocaleString()}`}
                    className="bg-slate-800/50 border-slate-600 font-mono text-sm h-8 smooth-transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Amount (USDT)</label>
                <div className="relative">
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-800/50 border-slate-600 font-mono text-sm h-8 pr-16 smooth-transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    ≈ {((parseFloat(amount) || 0) / (currentPrice?.price || btcPrice)).toFixed(6)} BTC
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
                    <div className="text-center">
                      Advanced TP/SL settings
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
                    <span className="text-gray-300">Margin: {parseFloat(amount) ? ((parseFloat(amount)) / leverage).toFixed(0) : '0'} USDT</span>
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
                  <span className="text-gray-400">Total Size:</span>
                  <span className="font-mono text-white">{formatUSD(parseFloat(amount) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Est. BTC:</span>
                  <span className="font-mono text-white">{((parseFloat(amount) || 0) / (currentPrice?.price || btcPrice)).toFixed(6)} BTC</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Liquidation:</span>
                  <span className="font-mono text-orange-400">${getLiquidationPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Margin Req:</span>
                  <span className="font-mono text-gray-300">{formatUSD((parseFloat(amount) || 0) / leverage)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Trading Fee:</span>
                  <span className="font-mono text-gray-300">{formatUSD((parseFloat(amount) || 0) * 0.0005)}</span>
                </div>
              </div>
            </div>

            {/* AI Trading Assistant Panel - Enhanced with Mobile Optimization */}
            {showAIAssistant && (
              <div className="mt-4 p-4 bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl border border-purple-400/30 animate-slide-in-right">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold text-purple-400">AI Trading Assistant</h4>
                    <Badge variant="outline" className="text-xs border-green-400 text-green-400 ml-2">
                      Live
                    </Badge>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowAIAssistant(false)}
                    className="h-6 w-6 p-0 text-purple-400 hover:text-purple-300"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div className="text-xs text-purple-300 bg-purple-900/20 rounded-lg p-3 border border-purple-400/20">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold mb-1">AI Market Analysis</div>
                        <div>BTC showing bullish momentum above $67,000. RSI indicates healthy correction potential.</div>
                        <div className="mt-2 text-xs text-purple-400">
                          Entry: $67,200 • SL: $66,500 • TP: $68,800
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-xs bg-purple-900/20 border-purple-400/50 text-purple-300 hover:bg-purple-800/30 h-9 font-medium"
                      onClick={() => {
                        setSide('buy');
                        setLeverage(10);
                        setAmount('0.1');
                        setPrice('67200');
                      }}
                    >
                      <ArrowRight className="w-3 h-3 mr-2" />
                      Apply AI Strategy
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs bg-purple-900/20 border-purple-400/50 text-purple-300 hover:bg-purple-800/30 h-8"
                      >
                        📊 Analysis
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs bg-purple-900/20 border-purple-400/50 text-purple-300 hover:bg-purple-800/30 h-8"
                      >
                        🎯 Alerts
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-400 border-t border-purple-400/20 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <Activity className="w-3 h-3" />
                        <span>Confidence: 78%</span>
                      </span>
                      <span className="text-xs opacity-70">Updated 30s ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </LiquidGlassCard>

        {/* Bottom Positions Panel - Compact Active Positions */}
        <LiquidGlassCard 
          bentoSize="full" 
          variant="trading"
          className={`p-4 ${positionAnimClass}`}
        >
          {/* Enhanced Professional Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-bold text-white">Active Positions</h3>
              <span className="text-sm text-gray-400">({positions.length})</span>
              <div className="flex items-center space-x-2">
                <span className="text-base text-green-400 font-mono font-bold">+$1,632.45</span>
                <Badge variant="outline" className="text-green-400 border-green-400/50 bg-green-400/10 text-xs px-2 py-1">
                  +3.42%
                </Badge>
              </div>
            </div>
            
            {/* Professional Action Controls */}
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleQuickClose(25)}
                className="px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-500/20 border-yellow-400/50"
              >
                Close 25%
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleQuickClose(50)}
                className="px-2 py-1 text-xs text-orange-400 hover:bg-orange-500/20 border-orange-400/50"
              >
                Close 50%
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleQuickClose(100)}
                className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 border-red-400/50"
              >
                Close All
              </Button>
            </div>
          </div>
          
          {/* Professional Data Table */}
          <div className="w-full">
            {/* Enhanced Header */}
            <div className="border-b border-slate-700 pb-2 mb-3">
              <div className="grid grid-cols-[140px_80px_120px_120px_120px_140px_120px_140px] gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <span>Trading Pair</span>
                <span>Side</span>
                <span>Position Size</span>
                <span>Entry Price</span>
                <span>Mark Price</span>
                <span>Unrealized PnL</span>
                <span>Margin</span>
                <span>Actions</span>
              </div>
            </div>
            
            {/* Position Rows - Compact Display */}
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {positions.map((position, i) => (
                <div key={i} className={`group relative rounded-lg border border-slate-700/40 hover:border-slate-600/60 transition-all duration-200 ${
                  animatingPositions.includes(i) ? 'scale-[1.01] shadow-lg shadow-blue-500/20' : ''
                } bg-slate-800/20 hover:bg-slate-800/40 p-2`}>
                  <div className="grid grid-cols-[140px_80px_120px_120px_120px_140px_120px_140px] gap-4 items-center">
                    <div>
                      <span className="text-white font-semibold text-sm">{position.pair}</span>
                    </div>
                    <div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        position.side === 'Long' 
                          ? 'text-green-400 bg-green-400/20 border border-green-400/40' 
                          : 'text-red-400 bg-red-400/20 border border-red-400/40'
                      }`}>
                        {position.side}
                      </span>
                    </div>
                    <div>
                      <span className="text-white font-mono text-sm font-medium">{position.size}</span>
                    </div>
                    <div>
                      <span className="text-gray-300 font-mono text-sm">$65,420.50</span>
                    </div>
                    <div>
                      <span className="text-white font-mono text-sm font-medium">${btcPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className={`font-mono text-sm font-bold ${
                        position.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.pnl}
                      </span>
                      <div className={`text-xs font-medium ${
                        position.pnl.startsWith('+') ? 'text-green-400/70' : 'text-red-400/70'
                      }`}>
                        {position.pnl.startsWith('+') ? '+2.34%' : '-1.12%'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-300 font-mono text-sm">{position.margin}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleQuickClose(50, i)}
                        className="px-2 py-1 text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                      >
                        50%
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleQuickClose(100, i)}
                        className="px-2 py-1 text-xs border-red-500/50 text-red-400 hover:bg-red-500/20"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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