import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Zap, Activity, X, Lightbulb, ArrowRight, Brain, MessageCircle } from 'lucide-react';
import LiquidGlassCard from './ui/LiquidGlassCard';
import RiverBentoGrid from './ui/RiverBentoGrid';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';
import TradingViewChart from './trading/TradingViewChart';
import HyperliquidAssetSelector from './trading/HyperliquidAssetSelector';
import OptimizedTradingForm from './trading/OptimizedTradingForm';
import CompactPositionsPanel from './trading/CompactPositionsPanel';
import MarketDataPanel from './trading/MarketDataPanel';
import ProfessionalOrderBook from './trading/ProfessionalOrderBook';
import AITradingChatDialog from './ai/AITradingChatDialog';
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
  
  // AI 分析对话框状态
  const [showAIChat, setShowAIChat] = useState(false);

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
  
  // Enhanced Animation states with SOTA micro-interactions
  const [priceFlashClass, setPriceFlashClass] = useState('');
  const [portfolioAnimClass, setPortfolioAnimClass] = useState('');
  const [orderBookAnimClass, setOrderBookAnimClass] = useState('');
  const [positionAnimClass, setPositionAnimClass] = useState('');
  const [lastPrice, setLastPrice] = useState(currentPrice?.price || 67425.23);
  const [animatingPositions, setAnimatingPositions] = useState<number[]>([]);
  
  // 优化：使用 useRef 管理定时器，防止内存泄漏
  const priceFlashTimer = useRef<NodeJS.Timeout | null>(null);
  const portfolioValueTimer = useRef<NodeJS.Timeout | null>(null);
  
  // SOTA Micro-interaction states for 60fps performance
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | null>(null);
  const [portfolioValueChange, setPortfolioValueChange] = useState<'increase' | 'decrease' | null>(null);
  const [recentOrderSuccess, setRecentOrderSuccess] = useState(false);
  // 优化的统一加载和错误状态管理
  const [loadingStates, setLoadingStates] = useState({
    price: false,
    portfolio: false,
    positions: false,
    orderbook: false,
    trading: false,
    walletConnection: false
  });
  
  const [errorStates, setErrorStates] = useState({
    price: null as string | null,
    portfolio: null as string | null,
    positions: null as string | null,
    orderbook: null as string | null,
    trading: null as string | null,
    walletConnection: null as string | null
  });
  const [hoverStates, setHoverStates] = useState({
    tradingPanel: false,
    orderBook: false,
    positions: false
  });

  // 统一的状态管理工具函数
  const setLoading = useCallback((key: keyof typeof loadingStates, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: isLoading }));
    // 清除相关错误状态
    if (isLoading) {
      setErrorStates(prev => ({ ...prev, [key]: null }));
    }
  }, []);

  const setError = useCallback((key: keyof typeof errorStates, error: string | null) => {
    setErrorStates(prev => ({ ...prev, [key]: error }));
    // 自动清除加载状态
    if (error) {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    }
  }, []);

  const clearError = useCallback((key: keyof typeof errorStates) => {
    setErrorStates(prev => ({ ...prev, [key]: null }));
  }, []);

  // 增强的通知系统工具函数
  const showNotification = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    options?: { 
      description?: string;
      duration?: number;
      action?: { label: string; onClick: () => void };
    }
  ) => {
    const { description, duration = 4000, action } = options || {};
    
    switch (type) {
      case 'success':
        toast.success(message, { 
          description,
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick
          } : undefined
        });
        break;
      case 'error':
        toast.error(message, { 
          description,
          duration: duration * 1.5, // Errors stay longer
          action: action ? {
            label: action.label,
            onClick: action.onClick
          } : undefined
        });
        break;
      case 'warning':
        toast.warning(message, { 
          description,
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick
          } : undefined
        });
        break;
      case 'info':
        toast.info(message, { 
          description,
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick
          } : undefined
        });
        break;
    }
  }, []);

  // 增强的数字输入格式化工具
  const formatNumberInput = useCallback((value: string, type: 'price' | 'amount' | 'percentage' = 'amount') => {
    // 移除非数字字符，保留小数点
    let cleaned = value.replace(/[^\d.]/g, '');
    
    // 防止多个小数点
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // 根据类型限制小数位数
    if (parts.length === 2) {
      const decimals = type === 'price' ? 2 : type === 'percentage' ? 1 : 6;
      cleaned = parts[0] + '.' + parts[1].slice(0, decimals);
    }
    
    return cleaned;
  }, []);

  // 数字输入验证函数
  const validateNumberInput = useCallback((value: string, min = 0, max?: number) => {
    const num = parseFloat(value);
    const errors: string[] = [];
    
    if (isNaN(num)) {
      errors.push('Please enter a valid number');
    } else {
      if (num < min) {
        errors.push(`Value must be at least ${min}`);
      }
      if (max !== undefined && num > max) {
        errors.push(`Value cannot exceed ${max}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);
  
  // 优化的价格闪烁动画 - 防止内存泄漏和不必要的重渲染
  const handlePriceFlashAnimation = useCallback((currentPriceValue: number) => {
    if (currentPriceValue === lastPrice) return;
    
    const change = currentPriceValue - lastPrice;
    const direction = change >= 0 ? 'up' : 'down';
    
    setLastPrice(currentPriceValue);
    setPriceChangeDirection(direction);
    
    // 清除之前的定时器
    if (priceFlashTimer.current) {
      clearTimeout(priceFlashTimer.current);
    }
    
    // SOTA micro-interaction flash animation with 60fps optimization
    setPriceFlashClass(change >= 0 ? 'price-flash-green-micro' : 'price-flash-red-micro');
    
    // 设置新的定时器
    priceFlashTimer.current = setTimeout(() => {
      setPriceFlashClass('');
      setPriceChangeDirection(null);
      priceFlashTimer.current = null;
    }, 600);
    
    // Trigger portfolio value change animation if significant price movement
    if (Math.abs(change) > currentPriceValue * 0.001) { // 0.1% threshold
      if (portfolioValueTimer.current) {
        clearTimeout(portfolioValueTimer.current);
      }
      
      setPortfolioValueChange(direction === 'up' ? 'increase' : 'decrease');
      portfolioValueTimer.current = setTimeout(() => {
        setPortfolioValueChange(null);
        portfolioValueTimer.current = null;
      }, 800);
    }
  }, [lastPrice]);

  // Enhanced price animation with SOTA micro-interactions
  useEffect(() => {
    if (currentPrice?.price) {
      handlePriceFlashAnimation(currentPrice.price);
    }
  }, [currentPrice?.price, handlePriceFlashAnimation]);

  // 清理定时器防止内存泄漏
  useEffect(() => {
    return () => {
      if (priceFlashTimer.current) {
        clearTimeout(priceFlashTimer.current);
      }
      if (portfolioValueTimer.current) {
        clearTimeout(portfolioValueTimer.current);
      }
    };
  }, []);
  const [showPositionsDialog, setShowPositionsDialog] = useState(false); // Positions对话框模式
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false); // 键盘快捷键帮助
  const [compactMode, setCompactMode] = useState(false); // 紧凑模式
  const volume24h = 2400000000; // 24小时交易量（美元）

  // Enhanced professional hotkey handlers with SOTA micro-interactions
  const handleQuickClose = (percentage: number, positionIndex?: number) => {
    const message = positionIndex !== undefined 
      ? `Closing ${percentage}% of position ${positionIndex}` 
      : `Closing ${percentage}% of all positions`;
    console.log(`Professional hotkey: ${message}`);
    
    // Show success celebration animation
    setRecentOrderSuccess(true);
    toast.success(`📊 ${message}`);
    
    // Enhanced position animation with micro-interactions
    if (positionIndex !== undefined) {
      setAnimatingPositions(prev => [...prev, positionIndex]);
      setLoading('positions', true);
      
      // Show profit celebration for successful close
      setPositionAnimClass('position-profit-micro');
      
      setTimeout(() => {
        setAnimatingPositions(prev => prev.filter(idx => idx !== positionIndex));
        setLoading('positions', false);
        setRecentOrderSuccess(false);
        setPositionAnimClass('');
      }, 1200); // Extended for success celebration
    } else {
      setPositionAnimClass('position-loss-micro');
      setTimeout(() => setPositionAnimClass(''), 800);
    }
    
    // Real trading integration would go here
  };

  // 全局快捷键处理
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // 防止在输入框中触发快捷键
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                            document.activeElement?.tagName === 'TEXTAREA';
      
      if (isInputFocused && !event.altKey && !event.ctrlKey && !event.metaKey) {
        return; // 在输入框中只允许组合键快捷键
      }

      
      // Alt+C 快捷键切换紧凑模式
      if (event.altKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setCompactMode(prev => !prev);
        showNotification('success', `Compact Mode ${compactMode ? 'Disabled' : 'Enabled'}`, {
          description: compactMode ? 'Interface expanded for more details' : 'Interface condensed for efficiency'
        });
      }

      // Alt+P 快捷键打开/关闭持仓面板
      if (event.altKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setShowPositionsDialog(prev => !prev);
        toast.success(`Positions Panel ${showPositionsDialog ? 'Closed' : 'Opened'}`);
      }

      // Alt+H 或 ? 键显示快捷键帮助
      if ((event.altKey && event.key.toLowerCase() === 'h') || (!event.altKey && event.key === '?')) {
        event.preventDefault();
        setShowKeyboardHelp(prev => !prev);
      }

      // Alt+1/2/3/4 快速平仓 25%/50%/75%/100%
      if (event.altKey && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        const percentages = { '1': 25, '2': 50, '3': 75, '4': 100 };
        const percentage = percentages[event.key as keyof typeof percentages];
        handleQuickClose(percentage);
      }

      // Ctrl/Cmd + B/S 快速买入/卖出
      if ((event.ctrlKey || event.metaKey) && ['b', 's'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        const side = event.key.toLowerCase() === 'b' ? 'buy' : 'sell';
        toast.success(`Quick ${side.toUpperCase()} order selected`);
        // This would trigger the trading form to switch to buy/sell mode
      }

      // 数字键1-9快速设置杠杆
      if (!event.altKey && !event.ctrlKey && !event.metaKey && !isInputFocused) {
        const leverageKey = parseInt(event.key);
        if (leverageKey >= 1 && leverageKey <= 9) {
          event.preventDefault();
          const leverageValues = [1, 2, 5, 10, 20, 25, 50, 75, 100];
          const newLeverage = leverageValues[leverageKey - 1];
          showNotification('info', `Leverage set to ${newLeverage}x`, {
          description: 'Leverage updated for next trade',
          duration: 2000
        });
        }
      }
      
      // Esc键关闭所有对话框
      if (event.key === 'Escape') {
        event.preventDefault();
        if (showKeyboardHelp) {
          setShowKeyboardHelp(false);
        } else if (showPositionsDialog) {
          setShowPositionsDialog(false);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [compactMode, showPositionsDialog, showKeyboardHelp, handleQuickClose]);

  // Enhanced real-time data simulation with SOTA micro-interactions
  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 100;
      const newPrice = Math.max(btcPrice + change, 50000);
      const direction = newPrice > btcPrice ? 'up' : 'down';
      
      // Loading state simulation for realistic data fetch feel
      setLoading('price', true);
      
      setTimeout(() => {
        // Update price with enhanced micro-interaction feedback
        if (newPrice > btcPrice) {
          setPriceFlashClass('price-flash-green-micro');
          setPriceChangeDirection('up');
        } else if (newPrice < btcPrice) {
          setPriceFlashClass('price-flash-red-micro');
          setPriceChangeDirection('down');
        }
        
        setLastPrice(btcPrice);
        setBtcPrice(newPrice);
        setPriceChange((Math.random() - 0.5) * 5);
        setLoading('price', false);
        
        // Enhanced portfolio animation for significant changes
        if (Math.abs(change) > 50) {
          setPortfolioAnimClass('portfolio-increase-micro');
          setPortfolioValueChange('increase');
          setTimeout(() => {
            setPortfolioAnimClass('');
            setPortfolioValueChange(null);
          }, 1000);
        }
        
        // Enhanced order book animation with loading states
        setLoading('orderbook', true);
        setOrderBookAnimClass('data-update');
        setTimeout(() => {
          setOrderBookAnimClass('');
          setLoading('orderbook', false);
        }, 300);
        
        // Clear price flash after animation with proper timing
        setTimeout(() => {
          setPriceFlashClass('');
          setPriceChangeDirection(null);
        }, 600);
      }, 100); // Slight delay to show loading state for realistic feel
    }, 3000);

    return () => clearInterval(interval);
  }, [btcPrice]);

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

  // 生成实时热门市场数据 - 使用 useMemo 避免无限重渲染
  const marketData = useMemo(() => {
    return hotMarketSymbols.map(symbol => {
      const price = getPrice(symbol);
      const displaySymbol = symbol.replace('-PERP', '/USDT');
      return {
        symbol: displaySymbol,
        price: price ? `$${price.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '--',
        change: price ? `${price.changePercent24h >= 0 ? '+' : ''}${price.changePercent24h.toFixed(2)}%` : '--',
        volume: symbol === 'BTC-PERP' ? '$2.4B' : symbol === 'ETH-PERP' ? '$1.8B' : '$890M'
      };
    });
  }, [hotMarketSymbols, getPrice]);

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

  // 价格稳定化辅助函数 - 创建伪随机但稳定的数值
  const getStableRandom = useCallback((seed: number, index: number) => {
    const x = Math.sin(seed + index * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }, []);

  // 生成基于实时价格的模拟订单簿数据 - 优化性能避免无限重渲染
  const orderBook = useMemo(() => {
    const basePrice = currentPrice?.price || 67425;
    const minSpread = basePrice * 0.0001; // 最小价差 0.01%
    
    // 使用价格的整数部分作为种子，确保在相同价格区间内数据稳定
    const priceSeed = Math.floor(basePrice / 10) * 10;
    
    // 生成卖单（Ask Orders）- 价格由低到高
    const asks = [];
    let cumulativeAskAmount = 0;
    
    for (let i = 0; i < 8; i++) {
      // 非线性价格分布，靠近市价的订单密度更高
      const priceStep = i < 3 ? 
        minSpread * (1 + i * 0.5) : 
        minSpread * (2 + (i - 3) * 1.2);
      const price = basePrice + priceStep;
      
      // 使用稳定随机数生成真实的订单量分布
      const randomFactor = getStableRandom(priceSeed, i * 2);
      let baseAmount;
      if (i === 0) baseAmount = 0.05 + randomFactor * 0.1; // 小订单
      else if (i < 3) baseAmount = 0.1 + randomFactor * 0.2; // 中等订单  
      else baseAmount = 0.3 + randomFactor * 0.5; // 大额挂单
      
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
      
      // 使用稳定随机数生成买单量（买单通常比卖单稍大）
      const randomFactor = getStableRandom(priceSeed, i * 2 + 1);
      let baseAmount;
      if (i === 0) baseAmount = 0.08 + randomFactor * 0.12;
      else if (i < 3) baseAmount = 0.15 + randomFactor * 0.25;
      else baseAmount = 0.4 + randomFactor * 0.6;
      
      cumulativeBidAmount += baseAmount;
      
      bids.push({
        price: Math.round(price * 100) / 100,
        amount: Math.round(baseAmount * 10000) / 10000,
        total: Math.round(cumulativeBidAmount * 10000) / 10000,
        depth: Math.round((cumulativeBidAmount * price) * 100) / 100
      });
    }
    
    return { asks, bids };
  }, [currentPrice?.price, getStableRandom]);

  // 专业四象限布局配置 - Golden Ratio Optimized Padding
  const layoutConfig = {
    containerPadding: 'p-3', // Reduced from p-4 to increase visual content area
    gridGap: 'gap-2', // Reduced from gap-3 for tighter professional layout
    gridRows: 'grid-rows-[80px_1fr_200px]',
    headerHeight: 'min-h-[80px]',
    headerPadding: 'px-4 py-3', // Asymmetric padding for header
    tradingPadding: 'p-3', // Reduced from p-4 for more trading content space
    chartPadding: 'p-2', // Minimal padding for maximum chart area
    orderBookPadding: 'p-2' // Minimal padding for data density
  };

  // 转换订单簿数据格式以匹配ProfessionalOrderBook接口 - 使用 useMemo 优化
  const orderBookData = useMemo(() => {
    const { asks, bids } = orderBook;
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
    
    return {
      bids,
      asks,
      spread,
      spreadPercent,
      lastPrice: currentPrice?.price || midPrice,
      timestamp: Date.now()
    };
  }, [orderBook, currentPrice?.price]);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${layoutConfig.containerPadding} overflow-x-hidden mobile-swipe-enabled trading-interface-optimized content-loading gpu-accelerated`}>
      
      {/* 统一错误显示组件 */}
      {Object.entries(errorStates).some(([, error]) => error) && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {Object.entries(errorStates).map(([key, error]) => 
            error && (
              <div
                key={key}
                className="bg-red-500/90 backdrop-blur-md text-white px-4 py-3 rounded-lg shadow-lg border border-red-400/50 animate-in slide-in-from-right-2 duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{key.charAt(0).toUpperCase() + key.slice(1)} Error</div>
                    <div className="text-xs opacity-90">{error}</div>
                  </div>
                  <button
                    onClick={() => clearError(key as keyof typeof errorStates)}
                    className="ml-4 text-white hover:text-red-200 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
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
      {/* SOTA专业交易网格布局 - 四象限设计 */}
      <RiverBentoGrid columns={12} className={`min-h-screen ${layoutConfig.gridRows} ${layoutConfig.gridGap} optimized-grid above-fold`}>
        
        {/* Enhanced Price Header - Dynamic Professional Trading Standard */}
        <LiquidGlassCard 
          bentoSize="full" 
          variant="chart"
          className={`flex items-center justify-between ${layoutConfig.headerPadding} ${layoutConfig.headerHeight} silky-card layout-stable`}
        >
          <div className="flex items-center space-x-4">
            {/* 使用 HyperliquidAssetSelector 替换静态选择器 */}
            <HyperliquidAssetSelector
              selectedAsset={selectedAsset}
              onAssetSelect={(assetId) => {
                setSelectedAsset(assetId);
                setSelectedPair(assetId.replace('-PERP', '/USDT'));
              }}
            />
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className={`text-xl font-mono font-bold text-trading-text-primary micro-interactive-precise tracking-wide ${priceFlashClass} ${loadingStates.price ? 'skeleton-micro' : ''} ${portfolioValueChange === 'increase' ? 'portfolio-increase-micro' : portfolioValueChange === 'decrease' ? 'portfolio-decrease-micro' : ''}`}>
                  {loadingStates.price ? (
                    <span className="inline-block w-32 h-6 bg-gray-600 rounded skeleton-micro"></span>
                  ) : (
                    <>
                      ${currentPrice ? currentPrice.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '67,425.23'}
                      {priceChangeDirection && (
                        <span className={`ml-2 inline-flex items-center text-sm ${priceChangeDirection === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                          {priceChangeDirection === 'up' ? '▲' : '▼'}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className={`text-sm font-semibold smooth-transition ${(currentPrice?.changePercent24h || 0) >= 0 ? 'text-trading-green-500' : 'text-trading-red-500'}`}>
                  {(currentPrice?.changePercent24h || 0) >= 0 ? '+' : ''}{(currentPrice?.changePercent24h || 2.45).toFixed(2)}% (24h)
                </div>
              </div>
              
              <div className="flex flex-col space-y-0.5">
                <div className="flex space-x-1.5">
                  <Badge variant="outline" className="text-trading-green-500 border-trading-green-500/50 bg-trading-green-500/10 px-2 py-0.5 text-xs font-semibold">
                    Vol: $2.4B
                  </Badge>
                  <Badge variant="outline" className="text-primary border-primary/50 bg-primary/10 px-2 py-0.5 text-xs font-semibold">
                    High: $68,234
                  </Badge>
                  <Badge variant="outline" className="text-trading-red-500 border-trading-red-500/50 bg-trading-red-500/10 px-2 py-0.5 text-xs font-semibold">
                    Low: $66,543
                  </Badge>
                </div>
                <div className="flex space-x-2 text-xs">
                  <div className="text-trading-text-secondary">24h Range: <span className="font-mono">$66,543 - $68,234</span></div>
                  <div className="text-trading-text-secondary">Market Cap: <span className="font-mono text-trading-text-primary">$1.34T</span></div>
                </div>
              </div>
            </div>
          </div>

        </LiquidGlassCard>

        {/* Portfolio & Market Data - Left Data Panel (2/12 = 16.67% width) - Golden Ratio Optimized */}
        <LiquidGlassCard 
          bentoSize="data" 
          variant="trading"
          className="flex flex-col overflow-hidden col-span-2 layout-stable-strict"
        >
          <MarketDataPanel
            portfolioData={portfolioData}
            marketData={marketData}
            portfolioAnimClass={`${portfolioAnimClass} ${portfolioValueChange === 'increase' ? 'portfolio-increase-micro' : portfolioValueChange === 'decrease' ? 'portfolio-decrease-micro' : ''}`}
            className="flex-1"
            onOpenPositions={() => setShowPositionsDialog(true)}
            orderBookData={orderBookData}
            onPriceClick={(price, side) => {
              // Enhanced feedback with micro-interactions
              setPrice(price.toString());
              setSide(side);
              setRecentOrderSuccess(true);
              toast.success(`价格 $${price} 已填充到${side === 'buy' ? '买入' : '卖出'}订单`);
              setTimeout(() => setRecentOrderSuccess(false), 800);
            }}
          />
        </LiquidGlassCard>

        {/* Professional Chart Area - Hero Layout (8/12 = 66.67% width) - Golden Ratio Optimized */}
        <LiquidGlassCard 
          bentoSize="hero" 
          variant="chart"
          className={`p-3 flex flex-col col-span-8 layout-stable above-fold`}
        >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">BTC/USDT Chart</h3>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline">1m</Button>
                  <Button size="sm" variant="outline">5m</Button>
                  <Button size="sm" variant="default">1h</Button>
                  <Button size="sm" variant="outline">4h</Button>
                  <Button size="sm" variant="outline">1D</Button>
                  
                  {/* AI 分析按钮 */}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowAIChat(true)}
                    className="ml-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/30 text-purple-300 hover:bg-gradient-to-r hover:from-purple-600/30 hover:to-blue-600/30 hover:border-purple-400/50 transition-all duration-200"
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    AI 分析
                  </Button>
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

        {/* 专业交易面板 - 右侧 (2/12 = 16.67% width) - Golden Ratio Optimized */}
        <LiquidGlassCard 
          bentoSize="trading" 
          variant="trading"
          withRipple={true}
          className={`px-4 py-3 border border-river-surface/20 flex flex-col col-span-2 row-span-2 layout-stable`}
        >
            <OptimizedTradingForm
              selectedPair={selectedPair}
              currentPrice={currentPrice?.price || btcPrice}
              isConnected={isWalletConnected}
              onTrade={(tradeData) => {
                console.log('交易数据:', tradeData);
                // 这里可以集成实际的交易逻辑
              }}
              // 传递订单簿点击后的数据到交易表单
              initialPrice={price}
              initialAmount={amount}
              initialSide={side}
              className="h-full"
            />
        </LiquidGlassCard>

        {/* Bottom Positions Panel - Compact Active Positions */}
        <LiquidGlassCard 
          bentoSize="full" 
          variant="trading"
          className={`${positionAnimClass} below-fold layout-stable`}
        >
          <CompactPositionsPanel
            positions={positions}
            currentPrice={currentPrice?.price || btcPrice}
            onClosePosition={handleQuickClose}
            animatingPositions={animatingPositions}
            className="p-3"
          />
        </LiquidGlassCard>

      </RiverBentoGrid>

      {/* Positions Dialog */}
      <Dialog open={showPositionsDialog} onOpenChange={setShowPositionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Trading Activity</span>
            </DialogTitle>
            <DialogDescription>
              Manage your positions, pending orders, and view order history.
            </DialogDescription>
          </DialogHeader>
          <CompactPositionsPanel
            positions={positions}
            currentPrice={currentPrice?.price || btcPrice}
            onClosePosition={handleQuickClose}
            animatingPositions={animatingPositions}
            onTabChange={(tab) => {
              console.log('Tab changed to:', tab);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Keyboard Shortcuts</span>
            </DialogTitle>
            <DialogDescription>
              Professional trading shortcuts for enhanced efficiency
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-trading-text-primary border-b border-slate-700 pb-1">Interface</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">Compact Mode</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">Alt + C</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">Positions Panel</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">Alt + P</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">Help Dialog</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">Alt + H</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">Close Dialog</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">Esc</code>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-trading-text-primary border-b border-slate-700 pb-1">Trading</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">Quick Buy</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">Ctrl + B</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">Quick Sell</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">Ctrl + S</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">Close 25%</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">Alt + 1</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">Close 50%</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">Alt + 2</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">Close 75%</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">Alt + 3</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">Close 100%</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">Alt + 4</code>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 md:col-span-2">
              <h3 className="font-semibold text-trading-text-primary border-b border-slate-700 pb-1">Leverage Quick Set</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">1x</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">1</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">2x</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">2</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">5x</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">3</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">10x</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">4</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">20x</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">5</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">25x</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">6</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">50x</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">7</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">75x</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">8</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-trading-text-secondary">100x</span>
                  <code className="bg-slate-800 px-2 py-1 rounded text-xs">9</code>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-3 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-trading-text-secondary">
              💡 <strong>Pro Tip:</strong> Press <code className="bg-slate-700 px-1 rounded">?</code> anytime to open this help dialog quickly
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Trading Chat Dialog */}
      <AITradingChatDialog
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        userAddress={userAddress}
        isConnected={isConnected}
        currentSymbol={selectedPair}
        currentPrice={currentPrice?.price || btcPrice}
      />

{/* Panel Slide Animation */}
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
        
/* Mobile Button Optimizations */
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

export default React.memo(LiquidBentoTradingInterface);
