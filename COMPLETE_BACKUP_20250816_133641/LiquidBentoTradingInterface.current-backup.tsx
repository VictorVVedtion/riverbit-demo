import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Zap, Brain, Target, Activity, X, Lightbulb, ArrowRight, MessageCircle, Send, Mic, Wallet, AlertTriangle } from 'lucide-react';
import LiquidGlassCard from './ui/LiquidGlassCard';
import RiverBentoGrid from './ui/RiverBentoGrid';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import NaturalCard from './ui/NaturalCard';
import NaturalPriceDisplay from './ui/NaturalPriceDisplay';
import NaturalAIInterface from './ui/NaturalAIInterface';
import { toast } from 'sonner';
import TradingAssistantChat from './trading-assistant/TradingAssistantChat';
import AITradingChatDialog from './ai/AITradingChatDialog';
import TradingViewChart from './trading/TradingViewChart';
import PositionManager from './trading/PositionManager';
import HyperliquidAssetSelector from './trading/HyperliquidAssetSelector';
import { useRealTimePrices } from '../hooks/useRealTimePrices';

// Web3 imports
import { useRiverBitWeb3 } from '../providers/RiverBitWeb3Provider';
import { tradingService } from '../services/TradingService';
import { useGasPrice } from '../utils/gasOptimization';
import { MARKET_CONFIG, type OrderSide, type OrderType, type MarginMode } from '../constants/contractConstants';

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
  // Web3 integration
  const {
    isConnected: web3Connected,
    address: web3Address,
    isValidNetwork,
    accountInfo,
    usdcBalance,
    ethBalance,
    positions,
    orders,
    events,
    isLoadingAccount,
    connectWallet,
    disconnectWallet,
    switchToValidNetwork,
    placeOrder,
    cancelOrder,
    closePosition,
    approveUSDC,
    error: web3Error,
    clearError
  } = useRiverBitWeb3();

  // Trading state
  const [selectedPair, setSelectedPair] = useState('BTC-PERP');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [side, setSide] = useState<OrderSide>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [marginMode, setMarginMode] = useState<MarginMode>('cross');
  
  // Chart state
  const [chartInterval, setChartInterval] = useState('1h');
  
  // 快速止损/止盈设置
  const [quickTP, setQuickTP] = useState('');
  const [quickSL, setQuickSL] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Real-time price data from new price service
  const { getPrice } = useRealTimePrices([selectedPair]);
  const { gasPrices, isLoading: isGasLoading } = useGasPrice();

  // Get real-time price from our new service
  const realTimePrice = getPrice(selectedPair);
  const btcPrice = realTimePrice?.price || 67425.23;
  const priceChange = realTimePrice?.changePercent24h || 2.45;
  const isRealTimePrice = !!realTimePrice;
  const [isDataPaused, setIsDataPaused] = useState(false);
  
  // Real position and order data
  const hasPosition = positions.length > 0;
  const hasOrders = orders.length > 0;
  
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

  // Price change animation effect (removed duplicate declaration)
  
  useEffect(() => {
    const newPrice = realTimePrice?.price || btcPrice;
    
    if (newPrice !== lastPrice) {
      // Trigger price flash animation
      if (newPrice > lastPrice) {
        setPriceFlashClass('price-flash-up');
      } else if (newPrice < lastPrice) {
        setPriceFlashClass('price-flash-down');
      }
      
      setLastPrice(newPrice);
      
      // Trigger portfolio animation for significant changes
      const change = Math.abs(newPrice - lastPrice);
      if (change > lastPrice * 0.001) { // 0.1% change
        setPortfolioAnimClass('pulse-highlight');
        setTimeout(() => setPortfolioAnimClass(''), 1000);
      }
      
      // Trigger order book animation
      setOrderBookAnimClass('data-update');
      setTimeout(() => setOrderBookAnimClass(''), 300);
      
      // Reset price flash after animation
      setTimeout(() => setPriceFlashClass(''), 300);
    }
  }, [realTimePrice, lastPrice, btcPrice]);

  // Enhanced real-time validation
  const getValidationStatus = () => {
    if (!web3Connected) {
      return { valid: false, message: '💳 Connect wallet to start trading', type: 'warning' };
    }
    
    if (!isValidNetwork) {
      return { valid: false, message: '🔗 Switch to Arbitrum Sepolia testnet', type: 'error' };
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      return { valid: false, message: '💵 Enter trade amount', type: 'info' };
    }
    
    if (parseFloat(amount) < 10) {
      return { valid: false, message: '⚠️ Minimum $10 USDT required', type: 'warning' };
    }
    
    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      return { valid: false, message: '🎯 Set limit price', type: 'info' };
    }
    
    return { valid: true, message: '✅ Ready to trade', type: 'success' };
  };

  // Trading functions
  const handleTrade = async () => {
    const validation = getValidationStatus();
    
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    try {
      // 如果是市价单，amount是USDT金额，需要转换为BTC数量
      const orderSize = orderType === 'market' 
        ? (parseFloat(amount) / btcPrice).toString() // USDT转BTC
        : amount; // 限价单直接使用BTC数量

      await placeOrder({
        market: selectedPair,
        side,
        size: orderSize,
        price: orderType === 'limit' ? price : undefined,
        orderType,
        marginMode,
        leverage
      });

      // Clear form after successful trade
      setAmount('');
      if (orderType === 'limit') setPrice('');
      
      toast.success(`${side.toUpperCase()} order placed successfully`);
    } catch (error) {
      console.error('Trade failed:', error);
      // Error is already handled by the Web3 provider
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder(orderId);
      toast.success('Order cancelled successfully');
    } catch (error) {
      console.error('Cancel order failed:', error);
    }
  };

  const handleClosePosition = async (positionId: string, size: string) => {
    try {
      await closePosition({ positionId, size });
      toast.success('Position closed successfully');
    } catch (error) {
      console.error('Close position failed:', error);
    }
  };

  // Calculate trading fees and position metrics
  const tradingFees = React.useMemo(() => {
    if (!amount || !btcPrice) return null;
    
    // 如果是市价单，amount是USDT金额，需要转换为BTC数量
    const btcSize = orderType === 'market' 
      ? (parseFloat(amount) / btcPrice).toString()
      : amount;
    
    return tradingService.calculateTradingFees({
      size: btcSize,
      price: orderType === 'limit' ? price || btcPrice.toString() : btcPrice.toString(),
      orderType,
      isMarketMaker: orderType === 'limit'
    });
  }, [amount, price, btcPrice, orderType]);

  const positionMetrics = React.useMemo(() => {
    if (!amount || !btcPrice) return null;
    
    const entryPrice = orderType === 'limit' ? price || btcPrice.toString() : btcPrice.toString();
    
    // 如果是市价单，amount是USDT金额，需要转换为BTC数量
    const btcSize = orderType === 'market' 
      ? (parseFloat(amount) / btcPrice).toString()
      : amount;
    
    return tradingService.calculatePositionMetrics({
      side,
      size: btcSize,
      entryPrice,
      currentPrice: btcPrice.toString(),
      leverage
    });
  }, [amount, price, btcPrice, side, orderType, leverage]);

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
  const calculateRiskReward = () => {
    if (!quickTP || !quickSL || !amount) return null;
    
    const entryPrice = orderType === 'market' ? btcPrice : (parseFloat(price) || btcPrice);
    const tpPrice = parseFloat(quickTP);
    const slPrice = parseFloat(quickSL);
    
    if (side === 'buy') {
      const reward = tpPrice - entryPrice;
      const risk = entryPrice - slPrice;
      return risk > 0 ? (reward / risk).toFixed(2) : null;
    } else {
      const reward = entryPrice - tpPrice;
      const risk = slPrice - entryPrice;
      return risk > 0 ? (reward / risk).toFixed(2) : null;
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

  // Convert trading pair to TradingView symbol
  const getTradingViewSymbol = (pair: string) => {
    const symbol = pair.replace('-PERP', '');
    switch (symbol) {
      // 加密货币
      case 'BTC':
        return 'BINANCE:BTCUSDT';
      case 'ETH':
        return 'BINANCE:ETHUSDT';
      case 'SOL':
        return 'BINANCE:SOLUSDT';
      
      // 美股
      case 'AAPL':
        return 'NASDAQ:AAPL';
      case 'MSFT':
        return 'NASDAQ:MSFT';
      case 'TSLA':
        return 'NASDAQ:TSLA';
      case 'GOOGL':
        return 'NASDAQ:GOOGL';
      case 'NVDA':
        return 'NASDAQ:NVDA';
      case 'AMZN':
        return 'NASDAQ:AMZN';
      case 'META':
        return 'NASDAQ:META';
      
      default:
        return 'BINANCE:BTCUSDT';
    }
  };

  const getLiquidationPrice = () => {
    const currentPrice = orderType === 'market' ? btcPrice : (parseFloat(price) || btcPrice);
    
    // 获取BTC数量用于计算
    const btcAmount = orderType === 'market' 
      ? (parseFloat(amount) || 0) / btcPrice  // USDT转BTC
      : parseFloat(amount) || 0;              // 直接使用BTC数量
    
    if (!btcAmount || !leverage) return 0;
    
    const liqDistance = currentPrice / leverage;
    return side === 'buy' ? currentPrice - liqDistance : currentPrice + liqDistance;
  };

  // 移除了Risk/Reward自动计算功能


  const handleEmergencyCloseAll = () => {
    console.log('Emergency close all positions');
    // 紧急平仓所有持仓
  };

  // Portfolio data from Web3 with enhanced calculations
  const portfolioData = React.useMemo(() => {
    if (!web3Connected || !accountInfo) {
      return {
        totalBalance: '--',
        pnl: '--',
        pnlPercent: '--',
        positions: 0,
        openOrders: 0,
        marginUtilization: '--',
        freeMargin: '--',
        isHealthy: true
      };
    }

    const totalPnl = parseFloat(accountInfo.totalPnl);
    const balance = parseFloat(accountInfo.balance);
    const equity = parseFloat(accountInfo.equity);
    const usedMargin = parseFloat(accountInfo.usedMargin);
    const freeMargin = parseFloat(accountInfo.freeMargin);
    const pnlPercent = balance > 0 ? (totalPnl / balance * 100) : 0;
    const marginUtilization = balance > 0 ? (usedMargin / balance * 100) : 0;

    return {
      totalBalance: formatUSD(equity),
      pnl: totalPnl >= 0 ? `+${formatUSD(totalPnl)}` : formatUSD(totalPnl),
      pnlPercent: pnlPercent >= 0 ? `+${pnlPercent.toFixed(2)}%` : `${pnlPercent.toFixed(2)}%`,
      positions: positions.length,
      openOrders: orders.length,
      marginUtilization: `${marginUtilization.toFixed(1)}%`,
      freeMargin: formatUSD(freeMargin),
      isHealthy: marginUtilization < 80
    };
  }, [web3Connected, accountInfo, positions, orders]);

  const marketData = [
    { symbol: 'BTC/USDT', price: '$67,425.23', change: '+2.45%', volume: '$2.4B' },
    { symbol: 'ETH/USDT', price: '$3,456.78', change: '-1.23%', volume: '$1.8B' },
    { symbol: 'SOL/USDT', price: '$198.45', change: '+5.67%', volume: '$890M' },
  ];

  // Transform real positions for display
  const displayPositions = React.useMemo(() => {
    return positions.map(position => {
      const pnl = parseFloat(position.unrealizedPnl);
      const size = parseFloat(position.size);
      const symbol = position.market.replace('-PERP', '');
      
      return {
        pair: `${symbol}/USDT`,
        side: position.side === 'buy' ? 'Long' : 'Short',
        size: `${size} ${symbol}`,
        pnl: pnl >= 0 ? `+$${pnl.toFixed(2)}` : `$${pnl.toFixed(2)}`,
        margin: formatUSD(parseFloat(position.entryPrice) * size / position.leverage),
        leverage: `${position.leverage}x`,
        entryPrice: formatUSD(parseFloat(position.entryPrice))
      };
    });
  }, [positions]);

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
    <div className="min-h-screen w-full aurora-bg p-4 overflow-x-hidden mobile-swipe-enabled" style={{
      background: 'linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 50%, var(--surface-2) 100%)'
    }}>
      {/* Animation Styles */}
      <style>{`
        @keyframes flash-green {
          0% { 
            background-color: rgba(34, 197, 94, 0.2);
            box-shadow: 0 0 0 rgba(34, 197, 94, 0);
            transform: scale(1);
          }
          50% { 
            background-color: rgba(34, 197, 94, 0.4);
            box-shadow: 0 0 16px rgba(34, 197, 94, 0.3);
            transform: scale(1.02);
          }
          100% { 
            background-color: transparent;
            box-shadow: 0 0 0 rgba(34, 197, 94, 0);
            transform: scale(1);
          }
        }
        
        @keyframes flash-red {
          0% { 
            background-color: rgba(239, 68, 68, 0.2);
            box-shadow: 0 0 0 rgba(239, 68, 68, 0);
            transform: scale(1);
          }
          50% { 
            background-color: rgba(239, 68, 68, 0.4);
            box-shadow: 0 0 16px rgba(239, 68, 68, 0.3);
            transform: scale(1.02);
          }
          100% { 
            background-color: transparent;
            box-shadow: 0 0 0 rgba(239, 68, 68, 0);
            transform: scale(1);
          }
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
          animation: flash-green 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
          border-radius: 12px;
          transform: scale(1.02);
        }
        
        .price-flash-down {
          animation: flash-red 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
          border-radius: 12px;
          transform: scale(1.02);
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
          transition: all 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
          transform: translateZ(0);
        }
        
        .button-press:active {
          transform: scale(0.95) translateZ(0);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        .button-press:hover {
          transform: translateY(-1px) scale(1.02) translateZ(0);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
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
            0 8px 32px rgba(0, 0, 0, 0.25),
            0 4px 16px rgba(0, 212, 255, 0.1),
            0 1px 0 rgba(255, 255, 255, 0.1) inset,
            0 -1px 0 rgba(0, 0, 0, 0.1) inset;
          transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .premium-shadow:hover {
          box-shadow: 
            0 16px 48px rgba(0, 0, 0, 0.3),
            0 8px 24px rgba(0, 212, 255, 0.15),
            0 2px 0 rgba(255, 255, 255, 0.15) inset,
            0 -2px 0 rgba(0, 0, 0, 0.1) inset;
        }
        
        /* Premium Chart Container System */
        .chart-container-premium {
          container-type: inline-size;
          position: relative;
        }
        
        .professional-trading-chart {
          min-height: 420px !important;
          height: 100% !important;
          width: 100% !important;
          border-radius: 12px;
          overflow: hidden;
        }
        
        .professional-trading-chart iframe {
          min-height: 420px !important;
          height: 100% !important;
          width: 100% !important;
          border-radius: 12px;
          border: none;
        }
        
        /* Professional 16:9 Chart Optimization */
        [style*="aspect-ratio: 16/9"] .professional-trading-chart {
          min-height: 420px !important;
        }
        
        [style*="aspect-ratio: 16/9"] .professional-trading-chart iframe {
          min-height: 420px !important;
        }
        
        /* Chart Transition Animations */
        .chart-container-premium {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Enhanced 2024 Professional Chart Hover Enhancement */
        .chart-container-premium:hover {
          box-shadow: 
            0 12px 48px rgba(59, 130, 246, 0.2),
            0 4px 16px rgba(0, 212, 255, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          border-color: rgba(59, 130, 246, 0.4);
          transform: translateY(-2px);
          backdrop-filter: blur(32px) saturate(1.6);
        }
        
        /* Responsive Chart Optimizations */
        @media (max-width: 1024px) {
          .chart-container-premium {
            min-height: 350px !important;
          }
          
          .professional-trading-chart {
            min-height: 350px !important;
          }
          
          .professional-trading-chart iframe {
            min-height: 350px !important;
          }
        }
        
        @media (max-width: 768px) {
          .chart-container-premium {
            min-height: 280px !important;
          }
          
          .professional-trading-chart {
            min-height: 280px !important;
          }
          
          .professional-trading-chart iframe {
            min-height: 280px !important;
          }
        }
      `}</style>
      {/* Professional Trading Grid Layout - Optimized DEX Standard Layout */}
      <RiverBentoGrid columns={12} className="min-h-screen grid-rows-[120px_1fr] gap-3">
        
        {/* Enhanced Price Header - Professional Trading Standard */}
        <LiquidGlassCard 
          bentoSize="full" 
          variant="chart"
          className="flex items-center justify-between p-6 aurora-card aurora-float"
        >
          <div className="flex items-center space-x-8">
            {/* Hyperliquid 风格的资产选择器 */}
            <HyperliquidAssetSelector
              selectedAsset={selectedPair}
              onAssetSelect={setSelectedPair}
              className="flex-shrink-0"
            />
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="flex items-center justify-end space-x-2 mb-1">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    isRealTimePrice ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></div>
                  <span className="text-xs text-gray-400">
                    {isRealTimePrice ? 'Live Price' : 'Loading...'}
                  </span>
                </div>
                <NaturalPriceDisplay
                  price={btcPrice}
                  change={priceChange >= 0 ? Math.abs(priceChange * btcPrice / 100) : -Math.abs(priceChange * btcPrice / 100)}
                  changePercent={priceChange}
                  size="xl"
                  showRipple={true}
                  className="aurora-intense text-gradient-dynamic"
                />
              </div>
              
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-3">
                  <Badge variant="outline" className="neon-green border-green-400/50 bg-green-400/10 px-4 py-2 text-sm font-semibold">
                    Vol: $2.4B
                  </Badge>
                  <Badge variant="outline" className="aurora-text-primary border-blue-400/50 bg-blue-400/10 px-4 py-2 text-sm font-semibold">
                    High: $68,234
                  </Badge>
                  <Badge variant="outline" className="text-orange-400 border-orange-400/50 bg-orange-400/10 px-4 py-2 text-sm font-semibold">
                    Low: $66,543
                  </Badge>
                </div>
                <div className="flex space-x-3 text-sm">
                  <div className="text-gray-300">24h Range: <span className="font-mono">$66,543 - $68,234</span></div>
                  <div className="text-gray-300">Market Cap: <span className="font-mono text-white">$1.34T</span></div>
                  {realTimePrice && (
                    <div className="text-gray-300">Live Price: <span className="font-mono text-green-400">${realTimePrice.price.toFixed(2)}</span>
                      <span className="ml-1 text-xs text-green-400">●</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="aurora-button aurora-pulse aurora-shimmer">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <NaturalAIInterface
              isActive={showAIAssistant}
              isThinking={false}
              confidence={0.87}
              onToggle={() => setShowAIAssistant(!showAIAssistant)}
              variant="panel"
              size="lg"
              className="natural-ai-header-button"
            />
          </div>
        </LiquidGlassCard>

        {/* Portfolio & Market Data - Left Data Panel (2 columns) */}
        <NaturalCard 
          variant={portfolioData.isHealthy ? 'calm' : 'alert'}
          breathing={true}
          interactive={true}
          className="col-span-2 p-4 flex flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
            {/* Compact Portfolio Overview */}
            <NaturalCard 
              variant={portfolioData.pnl.startsWith('+') ? 'trending' : portfolioData.pnl.startsWith('-') ? 'alert' : 'calm'}
              breathing={false}
              className={`space-y-3 ${portfolioAnimClass} p-3`}
            >
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
                  {web3Connected && portfolioData.freeMargin !== '--' && (
                    <div className="text-xs text-gray-500 mt-1">
                      {portfolioData.freeMargin} available
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <div className={`rounded-lg p-2 border ${portfolioData.pnl.startsWith('+') ? 'bg-green-900/20 border-green-400/30' : 'bg-red-900/20 border-red-400/30'}`}>
                    <div className={`text-xs mb-1 ${portfolioData.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>Unrealized PnL</div>
                    <div className={`text-sm font-mono font-bold smooth-transition ${portfolioData.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{portfolioData.pnl}</div>
                  </div>
                  <div className={`rounded-lg p-2 border ${portfolioData.isHealthy ? 'bg-blue-900/20 border-blue-400/30' : 'bg-orange-900/20 border-orange-400/30'}`}>
                    <div className={`text-xs mb-1 ${portfolioData.isHealthy ? 'text-blue-400' : 'text-orange-400'}`}>Margin Usage</div>
                    <div className={`text-sm font-mono font-bold smooth-transition ${portfolioData.isHealthy ? 'text-blue-400' : 'text-orange-400'}`}>{portfolioData.marginUtilization}</div>
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
            </NaturalCard>
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

                <div className="py-1 text-center border-y border-slate-600 bg-slate-800/30 rounded relative">
                  <span className={`text-sm font-mono font-bold text-white smooth-transition ${priceFlashClass}`}>
                    {btcPrice.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                  {web3Connected && realTimePrice && (
                    <div className="absolute top-0 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live contract price"></div>
                  )}
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
        </NaturalCard>

        {/* Chart & Positions Combined Area - Professional DEX Layout */}
        <div className="col-span-7 flex flex-col gap-3">
          {/* Chart Area - Professional Trading Chart */}
          <LiquidGlassCard 
            bentoSize="chart" 
            variant="chart"
            className="p-3 flex-1 min-h-0"
          >
          <div className="h-full flex flex-col min-h-0">
            {/* Professional Chart Header */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-white">{selectedPair.replace('-PERP', '/USDT')} Chart</h3>
              </div>
              
              {/* Time Interval Controls */}
              <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700">
                <Button 
                  size="sm" 
                  variant={chartInterval === '1' ? 'default' : 'ghost'}
                  onClick={() => setChartInterval('1')}
                  className="px-3 py-1 h-8 text-xs font-medium"
                >
                  1m
                </Button>
                <Button 
                  size="sm" 
                  variant={chartInterval === '5' ? 'default' : 'ghost'}
                  onClick={() => setChartInterval('5')}
                  className="px-3 py-1 h-8 text-xs font-medium"
                >
                  5m
                </Button>
                <Button 
                  size="sm" 
                  variant={chartInterval === '60' ? 'default' : 'ghost'}
                  onClick={() => setChartInterval('60')}
                  className="px-3 py-1 h-8 text-xs font-medium"
                >
                  1h
                </Button>
                <Button 
                  size="sm" 
                  variant={chartInterval === '240' ? 'default' : 'ghost'}
                  onClick={() => setChartInterval('240')}
                  className="px-3 py-1 h-8 text-xs font-medium"
                >
                  4h
                </Button>
                <Button 
                  size="sm" 
                  variant={chartInterval === 'D' ? 'default' : 'ghost'}
                  onClick={() => setChartInterval('D')}
                  className="px-3 py-1 h-8 text-xs font-medium"
                >
                  1D
                </Button>
              </div>
            </div>
            
            {/* Professional TradingView K线图 - 16:9 Professional Ratio */}
            <div 
              className="flex-1 min-h-0 bg-slate-900/30 rounded-lg border border-slate-700/30 overflow-hidden relative chart-container-premium"
              style={{
                aspectRatio: '16/9',
                minHeight: '420px'
              }}
            >
              <TradingViewChart
                key={selectedPair} // 强制在资产变化时重新创建图表
                symbol={getTradingViewSymbol(selectedPair)}
                interval={chartInterval}
                theme="dark"
                autosize={true}
                hide_side_toolbar={true}
                hide_legend={true}
                enable_publishing={false}
                allow_symbol_change={false}
                save_image={false}
                show_popup_button={false}
                no_referral_id={true}
                className="w-full h-full professional-trading-chart"
              />
            </div>
          </div>
        </LiquidGlassCard>

          {/* Positions Panel - Compact DEX Style */}
          <LiquidGlassCard 
            bentoSize="positions" 
            variant="medium"
            className={`p-4 flex flex-col ${positionAnimClass}`}
          >
            {/* Compact Professional Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h3 className="text-base font-semibold text-white">Positions</h3>
                <span className="text-sm text-gray-400">({positions.length})</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-400 font-mono">+$1,632.45</span>
                </div>
              </div>
              
              {/* Compact Action Controls */}
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleQuickClose(25)}
                  className="px-2 py-1 text-yellow-400 hover:bg-yellow-500/20 text-xs"
                >
                  25%
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleQuickClose(50)}
                  className="px-2 py-1 text-orange-400 hover:bg-orange-500/20 text-xs"
                >
                  50%
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleQuickClose(100)}
                  className="px-2 py-1 text-red-400 hover:bg-red-500/20 text-xs"
                >
                  Close All
                </Button>
              </div>
            </div>
            
            {/* Compact Data Table */}
            <div className="w-full positions-mobile-compact">
              {/* Header */}
              <div className="border-b border-slate-700 pb-2 mb-2">
                <div className="grid grid-cols-[120px_60px_100px_100px_100px_120px_120px] gap-2 text-xs font-medium text-gray-400 uppercase">
                  <span>Pair</span>
                  <span>Side</span>
                  <span>Size</span>
                  <span>Entry</span>
                  <span>Mark</span>
                  <span>PnL</span>
                  <span>Actions</span>
                </div>
              </div>
              
              {/* Position Rows */}
              <div className="space-y-1">
                {displayPositions.length === 0 && web3Connected ? (
                  <div className="text-center py-4 text-gray-400">
                    <div className="text-sm">No open positions</div>
                  </div>
                ) : displayPositions.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <div className="text-sm">Demo Mode - Connect wallet</div>
                  </div>
                ) : (
                  displayPositions.map((position, i) => {
                    const entryPrice = parseFloat(position.entryPrice || '67000');
                    const size = parseFloat(position.size.split(' ')[0] || '0');
                    const currentPrice = btcPrice;
                    const isLong = position.side === 'Long';
                    const realTimePnl = isLong 
                      ? (currentPrice - entryPrice) * size
                      : (entryPrice - currentPrice) * size;
                    
                    return (
                      <div key={i} className={`group relative rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-all ${
                        animatingPositions.includes(i) ? 'scale-[1.01] shadow-lg shadow-blue-500/20' : ''
                      }`}>
                        <div className="grid grid-cols-[120px_60px_100px_100px_100px_120px_120px] gap-2 items-center p-2">
                          <div>
                            <span className="text-white font-medium text-sm">{position.pair}</span>
                          </div>
                          <div>
                            <span className={`text-xs font-semibold px-1 py-0.5 rounded ${
                              position.side === 'Long' 
                                ? 'text-green-400 bg-green-400/10' 
                                : 'text-red-400 bg-red-400/10'
                            }`}>
                              {position.side}
                            </span>
                          </div>
                          <div>
                            <span className="text-white font-mono text-sm">{position.size}</span>
                          </div>
                          <div>
                            <span className="text-gray-300 font-mono text-sm">
                              ${web3Connected ? entryPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '65,420'}
                            </span>
                          </div>
                          <div>
                            <span className="text-white font-mono text-sm">${currentPrice.toFixed(0)}</span>
                          </div>
                          <div>
                            <span className={`font-mono text-sm font-medium ${
                              (web3Connected ? realTimePnl >= 0 : position.pnl.startsWith('+')) ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {web3Connected 
                                ? `${realTimePnl >= 0 ? '+' : ''}$${realTimePnl.toFixed(2)}`
                                : position.pnl
                              }
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleQuickClose(50, i)}
                              className="px-2 py-1 h-6 text-xs border-orange-500/40 text-orange-400"
                            >
                              50%
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleQuickClose(100, i)}
                              className="px-2 py-1 h-6 text-xs border-red-500/40 text-red-400"
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            {/* Compact Footer */}
            <div className="mt-4 pt-4 border-t border-slate-700/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{positions.length}</div>
                    <div className="text-xs text-gray-400">Positions</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${portfolioData.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                      {portfolioData.pnl}
                    </div>
                    <div className="text-xs text-gray-400">PnL</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">{portfolioData.totalBalance}</div>
                    <div className="text-xs text-gray-400">Portfolio</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      web3Connected && isValidNetwork ? 'bg-green-400' : 'bg-gray-400'
                    }`}></div>
                    <span>{web3Connected && isValidNetwork ? 'Live' : 'Demo'}</span>
                  </div>
                </div>
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Professional Trading Panel - Right Side (3 columns) */}
        <LiquidGlassCard 
          bentoSize="trading" 
          variant="trading"
          withRipple={true}
          className="col-span-3 p-5 border border-river-surface/20 flex flex-col aurora-card aurora-border aurora-intense"
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
            </div>

            {/* Quick Help for New Users */}
            {!web3Connected && (
              <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-200">
                    <div className="font-semibold mb-1">New to RiverBit? Start here:</div>
                    <div className="space-y-1 text-blue-300">
                      <div>1. Connect MetaMask or compatible wallet</div>
                      <div>2. Switch to Arbitrum Sepolia testnet</div>
                      <div>3. Get free USDC from testnet faucet</div>
                      <div>4. Start trading with $10+ USDT</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {web3Connected && !isValidNetwork && (
              <div className="mb-4 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-orange-200">
                    <div className="font-semibold mb-1">Wrong Network Detected</div>
                    <div className="text-orange-300">
                      Please switch to Arbitrum Sepolia testnet to continue trading.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
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
                <button
                  onClick={() => setShowAIChatDialog(!showAIChatDialog)}
                  className={`
                    professional-ai-chat-button compact-variant
                    ${showAIChatDialog ? 'ai-chat-active' : 'ai-chat-inactive'}
                  `}
                  title="AI Trading Intelligence (Click to chat)"
                  aria-label="Open AI Trading Chat"
                  role="button"
                >
                  {/* Professional Compact Background */}
                  <div className="ai-chat-bg-layer" />
                  
                  {/* AI Chat Status */}
                  <div className={`ai-chat-indicator ${showAIChatDialog ? 'indicator-active' : 'indicator-standby'}`}>
                    <Brain className="ai-chat-brain-icon" />
                    <div className="ai-chat-neural-flow">
                      <div className="chat-neural-dot" />
                      <div className="chat-neural-dot" />
                      <div className="chat-neural-dot" />
                    </div>
                  </div>
                  
                  {/* Active State Enhancement */}
                  {showAIChatDialog && (
                    <>
                      <div className="ai-chat-activity-ring" />
                      <div className="ai-chat-pulse-overlay" />
                    </>
                  )}
                  
                  {/* Hover State */}
                  <div className="ai-chat-hover-layer" />
                </button>
            </div>

            {showAIChatDialog ? (
              <div className="p-4 bg-slate-800 rounded-lg">
                <div>AI Chat Interface</div>
              </div>
            ) : (
              <div className="p-4">Trading Form Placeholder</div>
            )}
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
        
        /* Professional DEX Mobile Layout Optimizations */
        @media (max-width: 768px) {
          /* Chart & Positions Column Group - Stack Vertically on Mobile */
          .col-span-7 {
            grid-column: 1 / -1 !important;
            order: 2;
          }
          
          /* Data Panel - Full Width on Mobile */
          .col-span-2 {
            grid-column: 1 / -1 !important;
            order: 1;
          }
          
          /* Trading Panel - Full Width on Mobile */
          .col-span-3 {
            grid-column: 1 / -1 !important;
            order: 3;
          }
          
          /* Compact Positions Table for Mobile */
          .positions-mobile-compact {
            overflow-x: auto;
          }
          
          .positions-mobile-compact .grid {
            grid-template-columns: 80px 50px 80px 80px 80px 90px 100px;
            gap: 1px;
          }
          
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
        
        /* Professional AI Interface Animations */
        @keyframes river-flow {
          0% { transform: translateX(-10px) translateY(-5px) rotate(0deg); }
          33% { transform: translateX(5px) translateY(-10px) rotate(1deg); }
          66% { transform: translateX(-5px) translateY(5px) rotate(-1deg); }
          100% { transform: translateX(-10px) translateY(-5px) rotate(0deg); }
        }
        
        @keyframes gentle-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>

    </div>
  );
};

export default LiquidBentoTradingInterface;