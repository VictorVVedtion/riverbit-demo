import React, { useState, lazy, Suspense, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { EnhancedButton } from '../ui/enhanced-button';
import LiquidGlassCard from '../ui/LiquidGlassCard';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import '../../styles/riverbit-colors.css';
import { 
  Settings, ChevronDown, BookmarkCheck, Bookmark, ExternalLink,
  BarChart3, Volume2, TrendingUp, TrendingDown, Activity, X, MoreHorizontal,
  Calculator, Shield, AlertTriangle, Info, Wallet, Target, StopCircle, Share2, Plus, Minus,
  ArrowUp, ArrowDown, DollarSign, Bot, CheckCircle, Loader2, ChevronUp
} from 'lucide-react';
import { mockTradingPairs, mockOrderBook, mockRecentTrades, mockPositions, mockHistoricalPositions } from '../../data/mockData';
import { getSelectedPair, filterTradingPairs, closeAllPositions, closePosition, calculateTotals } from '../../utils/helpers';
import { web3Manager, shortenAddress, formatNumber } from '../../utils/web3Utils';
import HyperPairSelector from '../HyperPairSelector';
import EliteTradingInterface from '../EliteTradingInterface';
import TradingViewIcon from '../TradingViewIcon';
import TradingViewPrice from '../TradingViewPrice';
import DynamicOrderBook from '../DynamicOrderBook';
import DynamicTradeHistory from '../DynamicTradeHistory';
import Web3ConnectionModern from '../Web3ConnectionModern';
import RealTradingExecutor from '../RealTradingExecutor';
import RealTradeHistoryManager from '../RealTradeHistoryManager';
import PositionSummaryFloat from '../PositionSummaryFloat';

// Lazy load the trading assistant for better performance
const TradingAssistantChat = lazy(() => import('../../utils/tradingAssistant/TradingAssistantChat'));

// Import new AI components
import AIAssistantManager from '../trading-assistant/AIAssistantManager';
import AIMobileOptimized from '../trading-assistant/AIMobileOptimized';
import { useIsMobile } from '../ui/use-mobile';

// Import new Plan Generator components
import { PlanGeneratorChat } from '../ai/PlanGeneratorChat';
import { TradingPlan } from '../ai/TradingPlanCard';

interface TradingPageProps {
  selectedTradingPair: string;
  setSelectedTradingPair: (pair: string) => void;
  marginMode: string;
  setMarginMode: (mode: string) => void;
  favoriteAssets: string[];
  onToggleFavorite: (symbol: string) => void;
}

export default function TradingPage({
  selectedTradingPair,
  setSelectedTradingPair,
  marginMode,
  setMarginMode,
  favoriteAssets,
  onToggleFavorite
}: TradingPageProps) {
  // Trading form states
  const [orderSide, setOrderSide] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [leverage, setLeverage] = useState(10);
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [chartInterval, setChartInterval] = useState('15m');
  const [pairSelectorOpen, setPairSelectorOpen] = useState(false);
  
  // Web3 states
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [showTradeDialog, setShowTradeDialog] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [realAccountData, setRealAccountData] = useState<any>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [showPositionFloat, setShowPositionFloat] = useState(true);
  const [showPositionSummary, setShowPositionSummary] = useState(false);
  
  // AI Assistant states
  const [isMobileAIOpen, setIsMobileAIOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Check wallet connection on component mount
  useEffect(() => {
    checkWalletConnection();
  }, []);
  
  // Check existing wallet connection
  const checkWalletConnection = async () => {
    if (web3Manager.isConnected) {
      setIsWalletConnected(true);
      setCurrentChainId(web3Manager.currentChainId);
      
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          await loadAccountData(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };
  
  // Load real account data from contract
  const loadAccountData = async (address: string) => {
    if (!web3Manager.isConnected || currentChainId !== 421614) return;
    
    setIsLoadingAccount(true);
    try {
      const [accountInfo, usdcBalance] = await Promise.all([
        web3Manager.getAccountInfo(address),
        web3Manager.getUSDCBalance(address)
      ]);
      
      setRealAccountData({
        ...accountInfo,
        usdcBalance
      });
    } catch (error) {
      console.error('Failed to load account data:', error);
    } finally {
      setIsLoadingAccount(false);
    }
  };
  
  // Handle wallet connection change
  const handleWalletConnectionChange = (connected: boolean, address?: string, chainId?: number) => {
    setIsWalletConnected(connected);
    setWalletAddress(address || '');
    setCurrentChainId(chainId || null);
    
    if (connected && address && chainId === 421614) {
      loadAccountData(address);
    } else {
      setRealAccountData(null);
    }
  };
  
  // Handle trade completion
  const handleTradeComplete = (txHash: string, tradeData: any) => {
    setTradeHistory(prev => [{
      ...tradeData,
      txHash,
      status: 'completed',
      timestamp: Date.now()
    }, ...prev]);
    
    // Reload account data
    if (walletAddress) {
      loadAccountData(walletAddress);
    }
    
    setShowTradeDialog(false);
    
    // Reset form
    setAmount('');
    setPrice('');
  };
  
  // Handle trade error
  const handleTradeError = (error: string) => {
    console.error('Trade error:', error);
    toast.error('Trade failed', { description: error });
  };

  // AI Event Handlers
  const handleAIPlanExecute = async (plan: any) => {
    try {
      // Convert AI plan to trade execution
      setOrderSide(plan.signal.direction === 'long' ? 'buy' : 'sell');
      setOrderType('limit');
      setPrice(plan.entry.price.toString());
      setAmount((plan.positionSize || 1000).toString());
      setLeverage(plan.leverage || 10);
      
      toast.success('AI Plan Loaded', {
        description: `${plan.signal.direction.toUpperCase()} ${plan.symbol} plan loaded into trading form`
      });
    } catch (error) {
      console.error('Failed to execute AI plan:', error);
      toast.error('Failed to execute AI plan');
    }
  };

  const handleAIPlanBookmark = (planId: string) => {
    toast.success('Plan Bookmarked', {
      description: 'Trading plan saved to your bookmarks'
    });
  };

  const handleAIPlanShare = (plan: any) => {
    const planText = `RiverBit AI Plan: ${plan.signal.direction.toUpperCase()} ${plan.symbol}\nEntry: $${plan.entry.price}\nTarget: $${plan.takeProfit.price}\nStop: $${plan.stopLoss.price}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'RiverBit AI Trading Plan',
        text: planText
      });
    } else {
      navigator.clipboard.writeText(planText);
      toast.success('Plan Copied', {
        description: 'Trading plan copied to clipboard'
      });
    }
  };

  // Get selected pair data
  const selectedPair = getSelectedPair(selectedTradingPair, mockTradingPairs);

  // Use real account data if available, otherwise fallback to mock
  const accountData = realAccountData ? {
    availableBalance: realAccountData.balance,
    usedMargin: realAccountData.totalMargin,
    equity: realAccountData.balance + realAccountData.totalMargin,
    marginLevel: realAccountData.totalMargin > 0 ? (realAccountData.balance / realAccountData.totalMargin) * 100 : 0,
    marginUsed: realAccountData.totalMargin,
    usdcBalance: realAccountData.usdcBalance
  } : {
    availableBalance: 12540.85,
    usedMargin: 2340.50,
    equity: 14881.35,
    marginLevel: 635.4,
    marginUsed: 2340.50,
    usdcBalance: 0
  };
  
  // Check if ready for real trading
  const isReadyForRealTrading = isWalletConnected && currentChainId === 421614 && amount && (orderType === 'market' || price);

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-surface-0 via-surface-1 to-surface-0 text-foreground">
      {/* SOTA Professional Trading Header - Modern Liquid Glass */}
      <div className="bg-surface-1/90 backdrop-blur-sm border-b border-default/30 px-4 lg:px-6 py-3 lg:py-4 flex-shrink-0 h-16 lg:h-18 shadow-lg z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 lg:space-x-6">
            <div className="flex items-center space-x-2">
              <TradingViewIcon symbol={selectedTradingPair} size={20} />
              <Button
                variant="ghost"
                onClick={() => setPairSelectorOpen(true)}
                className="h-10 px-3 lg:px-4 text-primary hover:bg-surface-2 hover:shadow-sm transition-all duration-200 rounded-lg border border-transparent hover:border-default/30"
              >
                <span className="font-bold text-base lg:text-lg">{selectedPair?.baseAsset}</span>
                <span className="text-secondary text-base lg:text-lg">/{selectedPair?.quoteAsset}</span>
                <ChevronDown className="w-4 h-4 ml-1 lg:ml-2 text-secondary" />
              </Button>
            </div>
            
            <HyperPairSelector
              selectedPair={selectedTradingPair}
              onPairSelect={setSelectedTradingPair}
              isOpen={pairSelectorOpen}
              onClose={() => setPairSelectorOpen(false)}
              favoriteAssets={favoriteAssets}
              onToggleFavorite={onToggleFavorite}
            />
            <div className="flex items-center space-x-2 lg:space-x-4 overflow-x-auto">
              <TradingViewPrice symbol={selectedTradingPair} />
              <div className="hidden sm:flex items-center space-x-2 lg:space-x-4 text-xs lg:text-sm">
                <div className="bg-surface-2 px-2 py-1 rounded-md border border-default/30 whitespace-nowrap">
                  <span className="text-secondary">24h: </span>
                  <span className="text-profit font-bold">+2.43%</span>
                </div>
                <div className="bg-surface-2 px-2 py-1 rounded-md border border-default/30 whitespace-nowrap">
                  <span className="text-secondary">Vol: </span>
                  <span className="text-river-blue font-bold">125.8K</span>
                </div>
                <div className="hidden lg:flex bg-surface-2 px-2 py-1 rounded-md border border-default/30 whitespace-nowrap">
                  <span className="text-secondary">OI: </span>
                  <span className="text-river-blue font-bold">$2.1B</span>
                </div>
                <div className="hidden xl:flex bg-surface-2 px-2 py-1 rounded-md border border-default/30 whitespace-nowrap">
                  <span className="text-secondary">Funding: </span>
                  <span className="text-loss font-bold">0.0125%</span>
                </div>
                {/* 移动端优化仓位状态显示 - 智能信息密度 */}
                {mockPositions.length > 0 && (
                  <div className="border-l border-default/50 pl-1 sm:pl-2 lg:pl-4 ml-1 sm:ml-2 lg:ml-4 flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
                    {/* 移动端紧凑仓位显示 */}
                    <div className="bg-surface-2 backdrop-blur-sm px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 rounded-md lg:rounded-lg border border-default/30 flex items-center space-x-1 cursor-pointer hover:bg-surface-3 transition-all" onClick={() => setShowPositionSummary(!showPositionSummary)} title="Click to toggle position panel">
                      <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-river-blue" />
                      <span className="text-secondary font-medium text-xs hidden xs:inline">Pos: </span>
                      <span className="text-primary font-bold text-xs sm:text-sm">{mockPositions.length}</span>
                      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse ${
                        mockPositions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? 'bg-profit' : 'bg-danger'
                      }`}></div>
                    </div>
                    {/* 移动端PnL显示 - 只在小屏显示核心信息 */}
                    <div className={`bg-surface-2 backdrop-blur-sm px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 rounded-md lg:rounded-lg border border-default/30 flex items-center space-x-1 ${
                      mockPositions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? 'border-profit/30' : 'border-danger/30'
                    }`}>
                      <span className="text-secondary font-medium text-xs hidden sm:inline">PnL: </span>
                      <span className={`font-bold text-xs sm:text-sm lg:text-base ${
                        mockPositions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? 'text-profit' : 'text-danger'
                      }`}>
                        {mockPositions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? '+' : ''}${Math.abs(mockPositions.reduce((sum, pos) => sum + pos.pnl, 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* USDC余额和钱包状态 - 移动端优化 */}
                <div className="border-l border-default/50 pl-1 sm:pl-2 lg:pl-4 ml-1 sm:ml-2 lg:ml-4 flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
                  {/* USDC余额 - 移动端紧凑显示 */}
                  <div className="bg-surface-2 backdrop-blur-sm px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 rounded-md lg:rounded-lg border border-default/30 flex items-center space-x-1">
                    <Wallet className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-river-blue" />
                    <span className="text-secondary font-medium text-xs hidden xs:inline">USDC: </span>
                    <span className="text-profit font-bold text-xs sm:text-sm">${accountData.usdcBalance?.toLocaleString() || '0'}</span>
                  </div>
                  {/* 钱包连接状态 - 移动端优化 */}
                  <div className="flex items-center">
                    {isWalletConnected ? (
                      <div className="bg-surface-2 backdrop-blur-sm px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 lg:py-1.5 rounded-md lg:rounded-lg border border-default/30 flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-profit rounded-full animate-pulse"></div>
                        <span className="text-xs text-primary font-medium hidden xs:inline">{shortenAddress(walletAddress)}</span>
                        {currentChainId !== 421614 && (
                          <Badge variant="destructive" className="text-xs h-3 sm:h-4 lg:h-5 px-1 py-0 sm:px-1 lg:px-2">
                            <span className="hidden sm:inline">Wrong Network</span>
                            <span className="sm:hidden">!</span>
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Web3ConnectionModern 
                        variant="inline"
                        onConnectionChange={handleWalletConnectionChange}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-3">
            <Select value={chartInterval} onValueChange={setChartInterval}>
              <SelectTrigger className="w-14 lg:w-16 xl:w-18 h-8 xl:h-9 text-xs bg-surface-2 backdrop-blur-sm border-default/50 hover:bg-surface-3 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-2 border-default">
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
                <SelectItem value="1d">1d</SelectItem>
              </SelectContent>
            </Select>
            {isWalletConnected && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 lg:h-9 lg:w-9 p-0 text-xs text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
                onClick={() => {
                  if (walletAddress) {
                    loadAccountData(walletAddress);
                  }
                }}
                title="Refresh account data"
              >
                <ArrowUp className="w-3 h-3 lg:w-4 lg:h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 浮动仓位摘要组件 - 桡面端优先 */}
      <PositionSummaryFloat
        positions={mockPositions}
        isVisible={showPositionFloat && mockPositions.length > 0}
        onToggle={() => setShowPositionFloat(!showPositionFloat)}
        onClose={() => setShowPositionFloat(false)}
        className={showPositionSummary ? "" : "hidden lg:block"}
      />
      
      {/* 移动端仓位快速访问按钮 - 增强交互 */}
      {mockPositions.length > 0 && (
        <div className="fixed bottom-20 right-4 z-50 lg:hidden">
          <Button
            onClick={() => setShowPositionSummary(!showPositionSummary)}
            className={`h-16 w-16 rounded-full shadow-2xl transition-all duration-300 border-2 active:scale-95 ${
              mockPositions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0
                ? 'bg-gradient-to-br from-profit/90 to-profit border-profit/50 hover:shadow-profit/30 active:shadow-profit/50'
                : 'bg-gradient-to-br from-danger/90 to-danger border-danger/50 hover:shadow-danger/30 active:shadow-danger/50'
            } backdrop-blur-sm hover:scale-110 animate-pulse`}
          >
            <div className="flex flex-col items-center text-white">
              <Shield className="w-6 h-6 mb-0.5" />
              <span className="text-xs font-bold">{mockPositions.length}</span>
              <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                mockPositions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? 'bg-white/80' : 'bg-white/80'
              } animate-pulse`}></div>
            </div>
          </Button>
          
          {/* 移动端 PnL 指示器 */}
          <div className={`absolute -top-2 -left-2 px-2 py-1 rounded-full text-xs font-bold shadow-lg transition-all duration-300 ${
            mockPositions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0
              ? 'bg-profit text-white border border-profit/50'
              : 'bg-danger text-white border border-danger/50'
          }`}>
            {mockPositions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? '+' : ''}${Math.abs(mockPositions.reduce((sum, pos) => sum + pos.pnl, 0)).toLocaleString()}
          </div>
        </div>
      )}

      {/* SOTA Main Trading Layout - Professional Design System */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-gradient-to-br from-surface-0 via-surface-1 to-surface-0">
        {/* Chart Area - Modern Liquid Glass Container */}
        <div className="flex-1 lg:flex-[2] flex flex-col min-h-0 h-[50vh] lg:h-auto border-r border-default/20 bg-surface-1">
          <div className="flex-1 bg-surface-1/90 backdrop-blur-sm min-h-0 relative overflow-hidden rounded-lg m-2">
            <ReliableTradingView
              symbol={selectedTradingPair}
              interval={chartInterval}
              theme="dark"
              width="100%"
              height="100%"
            />
            
            {/* SOTA实时数据浮层 - Liquid Glass Design */}
            <div className="absolute top-4 left-4 bg-surface-1/90 backdrop-blur-sm hover:bg-surface-1 rounded-xl p-4 z-20">
              <div className="flex items-center space-x-3 text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-profit rounded-full animate-pulse"></div>
                  <span className="text-secondary">Live</span>
                </div>
                <div className="text-muted">•</div>
                <div className="text-primary font-bold">{selectedTradingPair}</div>
                <div className="text-muted">•</div>
                <div className="text-river-blue font-bold">{chartInterval}</div>
              </div>
            </div>
          </div>
        </div>

        {/* SOTA Professional Trading Panel - Liquid Glass Design */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-default/30 bg-surface-1/90 backdrop-blur-sm flex flex-col h-[50vh] lg:h-auto flex-shrink-0">
          <Tabs defaultValue="trading" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-3 lg:mx-4 mt-3 mb-2 h-10 lg:h-11 bg-surface-2/80 backdrop-blur-sm border border-default/30 rounded-lg shadow-trading">
              <TabsTrigger value="trading" className="text-sm lg:text-base font-semibold text-secondary data-[state=active]:text-foreground data-[state=active]:bg-gradient-to-b data-[state=active]:from-surface-3 data-[state=active]:to-surface-2 data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-river-blue/40 rounded-md transition-all duration-300 hover:text-foreground px-2 lg:px-4">Trade</TabsTrigger>
              <TabsTrigger value="orderbook" className="text-sm lg:text-base font-semibold text-secondary data-[state=active]:text-foreground data-[state=active]:bg-gradient-to-b data-[state=active]:from-surface-3 data-[state=active]:to-surface-2 data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-river-blue/40 rounded-md transition-all duration-300 hover:text-foreground px-2 lg:px-4">
                <span className="hidden lg:inline">Orderbook</span>
                <span className="lg:hidden">Book</span>
              </TabsTrigger>
              <TabsTrigger value="trades" className="text-sm lg:text-base font-semibold text-secondary data-[state=active]:text-foreground data-[state=active]:bg-gradient-to-b data-[state=active]:from-surface-3 data-[state=active]:to-surface-2 data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-river-blue/40 rounded-md transition-all duration-300 hover:text-foreground px-2 lg:px-4">
                <span className="hidden lg:inline">Trades</span>
                <span className="lg:hidden">Hist</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trading" className="flex-1 flex flex-col overflow-hidden" data-trading-form>
              {/* 专业交易工具栏 - 修复重叠问题 */}
              <div className="border-b border-default/50 bg-surface-1 px-5 py-3 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-secondary font-semibold flex items-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>Trading Settings</span>
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-secondary hover:text-primary hover:bg-surface-3 rounded-md border border-transparent hover:border-default/30 transition-all">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex flex-col space-y-2 xl:flex-row xl:items-center xl:justify-between xl:space-y-0 xl:space-x-3">
                  {/* 移动端优先布局 - 保证金模式选择器 */}
                  <div className="flex items-center space-x-2 flex-1 lg:flex-none">
                    <div className="flex items-center space-x-1">
                      <Shield className="w-3 h-3 text-muted" />
                      <span className="text-xs text-muted whitespace-nowrap hidden sm:inline">Margin:</span>
                      <span className="text-xs text-muted whitespace-nowrap sm:hidden">M:</span>
                    </div>
                    <div className="relative flex bg-surface-2 rounded-lg p-0.5 border border-default shadow-sm flex-1 lg:flex-none">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMarginMode('cross')}
                        className={`h-5 text-xs px-2 lg:px-3 rounded-md transition-all duration-200 font-medium relative flex-1 lg:flex-none ${
                          marginMode === 'cross'
                            ? 'bg-river-blue text-primary shadow-md border border-river-blue'
                            : 'text-muted hover:text-river-blue hover:bg-river-blue/15'
                        }`}
                        title="Cross Margin: Share margin across all positions"
                      >
                        {marginMode === 'cross' && (
                          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-river-blue rounded-full animate-pulse" />
                        )}
                        <span className="hidden sm:inline">Cross</span>
                        <span className="sm:hidden">C</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMarginMode('isolated')}
                        className={`h-5 text-xs px-2 lg:px-3 rounded-md transition-all duration-200 font-medium relative flex-1 lg:flex-none ${
                          marginMode === 'isolated'
                            ? 'bg-loss text-primary shadow-md border border-loss'
                            : 'text-muted hover:text-loss hover:bg-loss/15'
                        }`}
                        title="Isolated Margin: Use fixed margin per position"
                      >
                        {marginMode === 'isolated' && (
                          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-loss rounded-full animate-pulse" />
                        )}
                        <span className="hidden sm:inline">Isolated</span>
                        <span className="sm:hidden">I</span>
                      </Button>
                    </div>
                  </div>
                  
                  {/* 杠杆快捷控制 - 响应式设计 */}
                  <div className="flex items-center space-x-2 flex-1 lg:flex-none">
                    <div className="flex items-center space-x-1">
                      <Target className="w-3 h-3 text-muted" />
                      <span className="text-xs text-muted whitespace-nowrap hidden sm:inline">Leverage:</span>
                      <span className="text-xs text-muted whitespace-nowrap sm:hidden">L:</span>
                    </div>
                    <div className="flex items-center bg-surface-2 rounded-lg px-2 py-1 border border-default shadow-sm flex-1 lg:flex-none justify-center lg:justify-start">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-4 w-4 p-0 text-muted hover:text-secondary hover:bg-surface-3 rounded transition-all"
                        onClick={() => setLeverage(Math.max(1, leverage - 1))}
                        title="Decrease leverage"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <div className="flex items-center mx-2">
                        <span className={`text-xs font-bold min-w-[28px] text-center ${
                          leverage <= 10 ? 'text-profit' :
                          leverage <= 50 ? 'text-loss' :
                          'text-danger'
                        }`}>{leverage}x</span>
                        <div className={`w-1 h-1 rounded-full ml-1 ${
                          leverage <= 10 ? 'bg-profit' :
                          leverage <= 50 ? 'bg-loss' :
                          'bg-danger'
                        } animate-pulse`}></div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-4 w-4 p-0 text-muted hover:text-secondary hover:bg-surface-3 rounded transition-all"
                        onClick={() => setLeverage(Math.min(100, leverage + 1))}
                        title="Increase leverage"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-4 lg:p-5 space-y-4 overflow-y-auto" data-trading-panel>
              {/* 专业账户信息面板 - Liquid Glass Style */}
              <div className="bg-surface-1/90 backdrop-blur-sm hover:bg-surface-1 rounded-lg p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary font-semibold flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Account Balance</span>
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs h-6 px-2 flex items-center space-x-1 font-semibold rounded-md transition-all ${
                      marginMode === 'cross'
                        ? 'bg-river-blue/15 text-river-blue border-river-blue/40 shadow-sm'
                        : 'bg-loss/15 text-loss border-loss/40 shadow-sm'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    <span>{marginMode === 'cross' ? 'Cross' : 'Isolated'}</span>
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-1/50 rounded-md p-2 border border-default/20">
                    <div className="text-secondary text-xs mb-1 font-medium">Available</div>
                    <div className="font-bold text-profit text-base">${accountData.availableBalance.toLocaleString()}</div>
                  </div>
                  <div className="bg-surface-1/50 rounded-md p-2 border border-default/20">
                    <div className="text-secondary text-xs mb-1 font-medium">Used</div>
                    <div className="font-bold text-loss text-base">${accountData.usedMargin.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-default/30">
                  <div className="text-center bg-surface-1/30 rounded-md p-2">
                    <div className="text-secondary text-xs font-medium">Equity</div>
                    <div className="font-bold text-river-blue text-sm">${accountData.equity.toLocaleString()}</div>
                  </div>
                  <div className="text-center bg-surface-1/30 rounded-md p-2">
                    <div className="text-secondary text-xs font-medium">Free</div>
                    <div className="font-bold text-primary text-sm">${(accountData.availableBalance - accountData.usedMargin).toLocaleString()}</div>
                  </div>
                  <div className="text-center bg-surface-1/30 rounded-md p-2">
                    <div className="text-secondary text-xs font-medium">Level</div>
                    <div className={`font-bold text-sm ${accountData.marginLevel > 200 ? 'text-profit' : accountData.marginLevel > 100 ? 'text-loss' : 'text-danger'}`}>
                      {accountData.marginLevel.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 多空选择 - Hyperliquid风格 */}
              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={() => setOrderSide('buy')}
                  className={`h-7 text-xs font-bold transition-all ${
                    orderSide === 'buy' 
                      ? 'bg-profit text-primary shadow-sm' 
                      : 'bg-surface-2 text-profit hover:bg-profit/20'
                  }`}
                >
                  Long
                </Button>
                <Button
                  onClick={() => setOrderSide('sell')}
                  className={`h-7 text-xs font-bold transition-all ${
                    orderSide === 'sell' 
                      ? 'bg-danger text-primary shadow-sm' 
                      : 'bg-surface-2 text-danger hover:bg-danger/20'
                  }`}
                >
                  Short
                </Button>
              </div>

              {/* 订单类型 - Hyperliquid风格 */}
              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={() => setOrderType('market')}
                  variant="outline"
                  className={`h-6 text-xs transition-all ${
                    orderType === 'market' 
                      ? 'bg-river-blue text-primary border-river-blue shadow-sm' 
                      : 'bg-surface-2 text-muted border-default'
                  }`}
                >
                  Market
                </Button>
                <Button
                  onClick={() => setOrderType('limit')}
                  variant="outline"
                  className={`h-6 text-xs transition-all ${
                    orderType === 'limit' 
                      ? 'bg-river-blue text-primary border-river-blue shadow-sm' 
                      : 'bg-surface-2 text-muted border-default'
                  }`}
                >
                  Limit
                </Button>
              </div>

              {/* 限价输入 */}
              {orderType === 'limit' && (
                <div>
                  <div className="text-sm text-secondary mb-2 font-medium flex items-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>Limit Price (USDT)</span>
                  </div>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={selectedPair?.price?.toString() || '0'}
                    className="h-10 text-sm bg-surface-2/80 backdrop-blur-sm border-default/50 text-primary focus:border-river-blue focus:ring-2 focus:ring-river-blue/20 transition-all duration-200 rounded-lg font-medium"
                  />
                </div>
              )}

              {/* 数量输入 - Hyperliquid风格 */}
              <div>
                <div className="text-xs text-muted mb-1">Size (USDT)</div>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-7 text-xs bg-surface-2 border-default text-primary focus:border-river-blue transition-colors"
                />
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {['25%', '50%', '75%', '100%'].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      className="h-5 text-xs bg-surface-2 border-default text-muted hover:bg-surface-3 transition-colors"
                      onClick={() => {
                        const balance = accountData.availableBalance;
                        const percentValue = parseInt(percent) / 100;
                        setAmount((balance * percentValue).toFixed(2));
                      }}
                    >
                      {percent}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 专业杠杆选择 - 优化设计 */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-secondary font-medium flex items-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>Leverage</span>
                  </span>
                  <div className="flex items-center space-x-2 bg-surface-2/60 px-2 py-1 rounded-md border border-default/30">
                    <span className={`text-base font-bold ${
                      leverage <= 10 ? 'text-profit' :
                      leverage <= 50 ? 'text-loss' :
                      'text-danger'
                    }`}>{leverage}x</span>
                    <div className={`w-2 h-2 rounded-full ${
                      leverage <= 10 ? 'bg-profit' :
                      leverage <= 50 ? 'bg-loss' :
                      'bg-danger'
                    } animate-pulse`}></div>
                  </div>
                </div>
                
                {/* 杠杆滑条 */}
                <div className="mb-3">
                  <Slider
                    value={[leverage]}
                    onValueChange={(value) => setLeverage(value[0])}
                    max={100}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>1x</span>
                    <span>25x</span>
                    <span>50x</span>
                    <span>100x</span>
                  </div>
                </div>
                
                {/* 快捷杠杆按钮 */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[10, 25, 50, 100].map((lev) => (
                    <Button
                      key={lev}
                      variant="outline"
                      size="sm"
                      onClick={() => setLeverage(lev)}
                      className={`h-7 text-xs font-medium transition-all duration-200 rounded-md border ${
                        leverage === lev 
                          ? 'bg-river-blue/20 text-river-blue border-river-blue/50 shadow-md' 
                          : 'bg-surface-2/60 border-default/50 text-secondary hover:bg-surface-3 hover:border-river-blue/30'
                      }`}
                    >
                      {lev}x
                    </Button>
                  ))}
                </div>
              </div>

              {/* 专业风险预览 */}
              {amount && (
                <div className="bg-gradient-to-br from-surface-2/80 to-surface-3/60 backdrop-blur-sm rounded-lg p-3 space-y-2 text-sm border border-default/30 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary font-medium flex items-center space-x-1">
                      <Shield className="w-3 h-3" />
                      <span>Required Margin:</span>
                    </span>
                    <span className="font-bold text-river-blue">${(parseFloat(amount) / leverage).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary font-medium flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Liquidation Price:</span>
                    </span>
                    <span className="font-bold text-danger">
                      ${(() => {
                        const currentPrice = selectedPair?.price || 45000;
                        const isLong = orderSide === 'buy';
                        const liqPrice = isLong 
                          ? currentPrice * (1 - 0.9 / leverage)
                          : currentPrice * (1 + 0.9 / leverage);
                        return liqPrice.toLocaleString();
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary font-medium flex items-center space-x-1">
                      <DollarSign className="w-3 h-3" />
                      <span>Trading Fee:</span>
                    </span>
                    <span className="font-bold text-loss">${(parseFloat(amount) * 0.0006).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* 高级交易选项 */}
              <div className="flex items-center justify-between bg-surface-2/50 rounded-lg p-2 border border-default/30">
                <span className="text-sm text-secondary font-medium flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Advanced Orders</span>
                </span>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" className="h-6 text-xs bg-surface-3/60 border-default/50 text-secondary hover:bg-surface-2 hover:text-primary transition-all">
                    TP/SL
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-xs bg-surface-3/60 border-default/50 text-secondary hover:bg-surface-2 hover:text-primary transition-all">
                    Reduce Only
                  </Button>
                </div>
              </div>

              </div>
              
              {/* 专业交易执行区域 - 移动端优化 */}
              <div className="p-3 xl:p-5 border-t border-default/50 bg-surface-1 flex-shrink-0">
                {/* 专业连接状态指示 */}
                {!isWalletConnected && (
                  <Alert className="mb-4 bg-surface-2/50 border-river-blue/30 backdrop-blur-sm">
                    <Wallet className="h-4 w-4 text-river-blue" />
                    <AlertDescription className="text-sm text-secondary font-medium">
                      Connect your wallet to start real trading
                    </AlertDescription>
                  </Alert>
                )}
                
                {isWalletConnected && currentChainId !== 421614 && (
                  <Alert className="mb-4 bg-surface-2/50 border-danger/30 backdrop-blur-sm">
                    <AlertTriangle className="h-4 w-4 text-danger" />
                    <AlertDescription className="text-sm text-secondary font-medium">
                      Switch to Arbitrum Sepolia network for trading
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* 交易按钮 - 修复重叠和可见性问题 */}
                {isWalletConnected && currentChainId === 421614 ? (
                  <Dialog open={showTradeDialog} onOpenChange={setShowTradeDialog}>
                    <DialogTrigger asChild>
                      <EnhancedButton 
                        size="trading" 
                        variant={orderSide === 'buy' ? 'buy' : 'sell'}
                        className="w-full"
                        disabled={!amount || (orderType === 'limit' && !price)}
                        haptic={true}
                        ripple={true}
                      >
                        <div className="flex items-center justify-center space-x-3">
                          {orderSide === 'buy' ? (
                            <TrendingUp className="w-6 h-6" />
                          ) : (
                            <TrendingDown className="w-6 h-6" />
                          )}
                          <div className="flex flex-col items-center">
                            <span className="font-black">{orderSide === 'buy' ? 'BUY' : 'SELL'} {selectedPair?.baseAsset}</span>
                            {amount && <span className="text-xs opacity-90 bg-black/30 px-2 py-0.5 rounded-full mt-1">${parseFloat(amount).toLocaleString()}</span>}
                          </div>
                        </div>
                      </EnhancedButton>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Execute Real Trade</DialogTitle>
                        <DialogDescription>
                          This will execute a real trade on Arbitrum Sepolia testnet.
                        </DialogDescription>
                      </DialogHeader>
                      <RealTradingExecutor
                        symbol={selectedTradingPair}
                        side={orderSide as 'buy' | 'sell'}
                        type={orderType as 'market' | 'limit'}
                        amount={amount}
                        price={price}
                        leverage={leverage}
                        marginMode={marginMode as 'cross' | 'isolated'}
                        onTradeComplete={handleTradeComplete}
                        onError={handleTradeError}
                      />
                    </DialogContent>
                  </Dialog>
                ) : (
                  <EnhancedButton 
                    size="trading" 
                    variant={orderSide === 'buy' ? 'buy' : 'sell'}
                    className="w-full"
                    disabled={!amount || (orderType === 'limit' && !price)}
                    haptic={true}
                    ripple={true}
                    onClick={() => {
                      if (!isWalletConnected) {
                        toast('尚未连接钱包', { description: '请先连接钱包再发起交易。' });
                        return;
                      }
                      if (currentChainId !== 421614) {
                        toast('网络不匹配', { description: '请切换到 Arbitrum Sepolia 网络。' });
                        return;
                      }
                      
                      const orderData = {
                        side: orderSide,
                        type: orderType,
                        amount: parseFloat(amount),
                        price: orderType === 'limit' ? parseFloat(price) : selectedPair?.price,
                        leverage,
                        symbol: selectedTradingPair,
                        margin: parseFloat(amount) / leverage,
                        timestamp: Date.now()
                      };
                      
                      console.log('Demo order placed:', orderData);
                      const confirmMessage = `模拟${orderSide === 'buy' ? '买入' : '卖出'}订单：\n\n` +
                        `交易对: ${selectedTradingPair}\n` +
                        `数量: ${amount} USDT\n` +
                        `价格: ${orderType === 'market' ? '市价' : '$' + price}\n` +
                        `杠杆: ${leverage}x\n` +
                        `保证金: $${(parseFloat(amount) / leverage).toLocaleString()}\n` +
                        `预计手续费: $${(parseFloat(amount) * 0.0006).toFixed(2)}`;
                      
                      toast.message('模拟订单预览', {
                        description: confirmMessage.replace(/\n/g, ' '),
                        action: {
                          label: '提交',
                          onClick: () => {
                            toast.success('模拟订单已提交');
                            setAmount('');
                            setPrice('');
                          }
                        },
                        cancel: {
                          label: '取消',
                          onClick: () => {}
                        }
                      });
                    }}
                  >
                      <div className="flex items-center justify-center space-x-3">
                        {!isWalletConnected ? (
                          <Wallet className="w-6 h-6" />
                        ) : orderSide === 'buy' ? (
                          <TrendingUp className="w-6 h-6" />
                        ) : (
                          <TrendingDown className="w-6 h-6" />
                        )}
                        <div className="flex flex-col items-center">
                          <span className="font-black">
                            {!isWalletConnected ? 'CONNECT WALLET' : 'DEMO'} {orderSide === 'buy' ? 'BUY' : 'SELL'}
                          </span>
                          {amount && <span className="text-xs opacity-90 bg-black/30 px-2 py-0.5 rounded-full mt-1">${parseFloat(amount).toLocaleString()}</span>}
                        </div>
                      </div>
                  </EnhancedButton>
                )}
              </div>
            </TabsContent>


            <TabsContent value="orderbook" className="flex-1 overflow-hidden">
              <DynamicOrderBook 
                symbol={selectedTradingPair}
                currentPrice={selectedPair?.price}
                className="h-full"
              />
            </TabsContent>

            <TabsContent value="trades" className="flex-1 overflow-hidden">
              <DynamicTradeHistory 
                symbol={selectedTradingPair}
                currentPrice={selectedPair?.price}
                className="h-full"
              />
            </TabsContent>

          </Tabs>
          
          {/* AI Plan Generator Section - 零门槛交易助手 */}
          <div className="border-t border-default/30 bg-surface-1/90 backdrop-blur-sm flex-shrink-0">
            <div className="p-3 lg:p-4">
              <PlanGeneratorChat
                accountBalance={accountData.availableBalance}
                onExecutePlan={(plan: TradingPlan) => {
                  // 将AI计划转换为交易表单
                  setOrderSide(plan.direction === 'long' ? 'buy' : 'sell');
                  setOrderType(plan.entryType === 'market' ? 'market' : 'limit');
                  if (plan.entryType === 'limit') {
                    setPrice(plan.entryPrice.toString());
                  }
                  setAmount((plan.positionSize * accountData.availableBalance / 100).toString());
                  setLeverage(10); // 默认杠杆
                  
                  toast.success('计划已加载到交易表单', {
                    description: `${plan.direction === 'long' ? '买入' : '卖出'} ${plan.symbol} 计划已准备就绪`
                  });
                }}
                onSimulatePlan={(plan: TradingPlan) => {
                  const planText = `模拟交易计划：${plan.direction === 'long' ? '买入' : '卖出'} ${plan.symbol}\n` +
                    `入场价: $${plan.entryPrice}\n` +
                    `止损价: $${plan.stopLoss}\n` +
                    `目标价: $${plan.takeProfit}\n` +
                    `仓位: ${plan.positionSize}%`;
                  
                  toast.success('模拟计划已启动', {
                    description: planText.replace(/\n/g, ' ')
                  });
                }}
                className="max-w-none"
              />
            </div>
          </div>
        </div>
      </div>


      {/* SOTA Position Management Panel - Unified Bottom Colors */}
      <div className={`${showPositionSummary ? 'h-auto max-h-96 lg:max-h-80' : 'h-16 lg:h-20'} bottom-panel flex-shrink-0 transition-all duration-300 overflow-hidden`}>
        <Tabs defaultValue="positions" className="h-full flex flex-col">
          <div className="flex items-center justify-between px-5 lg:px-6 py-3 lg:py-4 bottom-divider border-b bottom-bg-card cursor-pointer hover:bottom-bg-hover transition-all duration-200" onClick={() => setShowPositionSummary(!showPositionSummary)} title={showPositionSummary ? "Click to collapse" : "Click to expand positions"}>
            <div className="flex items-center space-x-4">
              <TabsList className="bottom-bg-card h-8 lg:h-10 bottom-divider border rounded-lg shadow-sm">
                <TabsTrigger value="positions" className="text-xs lg:text-sm font-bold px-2 lg:px-4 data-[state=active]:bottom-bg-hover data-[state=active]:shadow-lg data-[state=active]:bottom-text-emphasis transition-all bottom-text-secondary">Positions ({mockPositions.length})</TabsTrigger>
                <TabsTrigger value="orders" className="text-xs lg:text-sm font-bold px-2 lg:px-4 data-[state=active]:bottom-bg-hover data-[state=active]:shadow-lg data-[state=active]:bottom-text-emphasis transition-all bottom-text-secondary">Orders (0)</TabsTrigger>
                <TabsTrigger value="history" className="text-xs lg:text-sm font-bold px-2 lg:px-4 data-[state=active]:bottom-bg-hover data-[state=active]:shadow-lg data-[state=active]:bottom-text-emphasis transition-all bottom-text-secondary">History</TabsTrigger>
              </TabsList>
              
              {/* 展开/折叠按钮 */}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-surface-3 transition-all"
                title={showPositionSummary ? "Collapse" : "Expand"}
              >
                {showPositionSummary ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {mockPositions.length > 0 && (
              <div className="flex items-center space-x-2 lg:space-x-4">
                <div className="bottom-bg-card px-2 lg:px-4 py-1 lg:py-2 rounded-lg bottom-divider border flex items-center space-x-2">
                  <span className="text-xs lg:text-sm bottom-text-secondary font-bold">Total PnL:</span>
                  <span className={`font-black text-sm lg:text-lg ${mockPositions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? 'text-profit' : 'text-danger'}`}>
                    {mockPositions.reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? '+' : ''}${Math.abs(mockPositions.reduce((sum, pos) => sum + pos.pnl, 0)).toLocaleString()}
                  </span>
                </div>
                <Button size="sm" variant="outline" className="h-8 lg:h-9 px-2 lg:px-4 text-xs lg:text-sm bg-danger/10 border-danger/30 text-danger hover:bg-danger/20 hover:border-danger hover:text-white transition-all duration-200 font-bold bottom-button">
                  Close All
                </Button>
              </div>
            )}
          </div>
          
          <TabsContent value="positions" className={`${showPositionSummary ? 'block' : 'hidden'} px-4 lg:px-6 py-3 lg:py-4 max-h-80 overflow-y-auto`}>
            {mockPositions.length > 0 ? (
              <div className="space-y-3">
                {mockPositions.map((position, index) => (
                  <div key={index} className="bottom-card rounded-lg p-4 hover:bottom-bg-hover hover:shadow-md transition-all duration-200">
                    {/* 专业持仓头部 */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-4">
                        <Badge variant={position.side === 'long' ? 'default' : 'destructive'} className="text-sm font-bold px-3 py-1 rounded-md">
                          {position.side === 'long' ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {position.side.toUpperCase()} {position.leverage || '10'}x
                        </Badge>
                        <span className="font-bold text-lg bottom-text-primary">{position.symbol}</span>
                        <Badge variant="outline" className="text-sm bottom-text-secondary bottom-divider border bottom-bg-card">
                          <Shield className="w-3 h-3 mr-1" />
                          {position.marginMode || 'Cross'}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="h-8 w-8 text-sm bottom-button hover:bg-profit/20 hover:border-profit/50 hover:text-profit transition-all">
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 text-sm bottom-button hover:bg-loss/20 hover:border-loss/50 hover:text-loss transition-all">
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 text-sm px-3 bg-danger/20 border-danger/50 text-danger hover:bg-danger hover:text-primary transition-all bottom-button">
                          Close
                        </Button>
                      </div>
                    </div>
                    
                    {/* 专业数据网格 */}
                    <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                      <div className="bottom-bg-card rounded-md p-2 bottom-divider border">
                        <div className="bottom-text-tertiary text-xs mb-1 font-medium">Position Size</div>
                        <div className="font-bold bottom-text-primary text-base">{position.size}</div>
                      </div>
                      <div className="bottom-bg-card rounded-md p-2 bottom-divider border">
                        <div className="bottom-text-tertiary text-xs mb-1 font-medium">Entry Price</div>
                        <div className="font-bold bottom-text-primary text-base">${position.entryPrice?.toLocaleString() || '45,000'}</div>
                      </div>
                      <div className="bottom-bg-card rounded-md p-2 bottom-divider border">
                        <div className="bottom-text-tertiary text-xs mb-1 font-medium">Liquidation</div>
                        <div className="font-bold text-danger text-base">${position.liquidationPrice?.toLocaleString() || '40,500'}</div>
                      </div>
                      <div className="bottom-bg-card rounded-md p-2 bottom-divider border">
                        <div className="bottom-text-tertiary text-xs mb-1 font-medium">Margin Ratio</div>
                        <div className={`font-bold text-base ${(position.marginRatio || 75) > 50 ? 'text-profit' : 'text-loss'}`}>
                          {position.marginRatio || '75.3'}%
                        </div>
                      </div>
                    </div>
                    
                    {/* 专业盈亏显示 */}
                    <div className="flex justify-between items-center pt-4 bottom-divider border-t">
                      <div className="flex items-center space-x-6">
                        <div className={`bg-gradient-to-r rounded-lg p-3 border ${position.pnl >= 0 ? 'from-profit/10 to-profit/5 border-profit/30 text-profit' : 'from-danger/10 to-danger/5 border-danger/30 text-danger'}`}>
                          <span className="text-xl font-bold">
                            {position.pnl >= 0 ? '+' : ''}${Math.abs(position.pnl).toLocaleString()}
                          </span>
                          <span className="text-sm ml-2 opacity-80">
                            ({position.pnlPercent || ((position.pnl / 1000) * 100).toFixed(2)}%)
                          </span>
                        </div>
                        <div className="bottom-bg-card rounded-md p-2 bottom-divider border">
                          <div className="text-xs bottom-text-tertiary mb-1">Funding Rate</div>
                          <span className={`text-sm font-bold ${(position.fundingRate || 0.01) > 0 ? 'text-danger' : 'text-profit'}`}>
                            {(position.fundingRate || 0.01) > 0 ? '+' : ''}{((position.fundingRate || 0.01) * 100).toFixed(4)}%
                          </span>
                        </div>
                      </div>
                      <div className="bottom-bg-card rounded-md p-2 bottom-divider border text-center">
                        <div className="text-xs bottom-text-tertiary mb-1">Next Payment</div>
                        <div className="text-sm font-medium bottom-text-primary">{position.nextFunding || '2h 15m'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bottom-text-tertiary">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <div className="text-sm bottom-text-secondary">No positions</div>
                  <div className="text-xs bottom-text-tertiary mt-1">Open a position to start trading</div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="orders" className={`${showPositionSummary ? 'block' : 'hidden'} px-4 py-2`}>
            <div className="flex items-center justify-center h-full bottom-text-tertiary">
              <div className="text-center">
                <div className="text-4xl mb-2">📋</div>
                <div className="text-sm bottom-text-secondary">No open orders</div>
                <div className="text-xs bottom-text-tertiary mt-1">Place an order to see it here</div>
                <Button size="sm" variant="outline" className="mt-3 h-7 text-xs bottom-button">
                  Quick Order
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className={`${showPositionSummary ? 'block' : 'hidden'} px-4 py-2`}>
            <div className="space-y-2">
              {/* 模拟历史记录 */}
              <div className="text-xs bottom-text-tertiary mb-3 flex justify-between items-center">
                <span>Recent Trades</span>
                <Button size="sm" variant="outline" className="h-6 text-xs bottom-button">
                  Export
                </Button>
              </div>
              
              {[1,2,3].map((i) => (
                <div key={i} className="bottom-bg-card rounded p-2 bottom-divider border">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="default" className="text-xs bg-profit">LONG</Badge>
                      <span className="text-sm font-medium bottom-text-primary">BTC/USDT</span>
                      <span className="text-xs bottom-text-tertiary">10x</span>
                    </div>
                    <div className="text-xs text-profit font-bold">+$1,245</div>
                  </div>
                  <div className="flex justify-between text-xs bottom-text-tertiary">
                    <span>Entry: $44,500 → Exit: $45,250</span>
                    <span>2h ago</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>


      {/* AI Assistant Manager - Desktop floating buttons and dialogs */}
      {!isMobile && (
        <AIAssistantManager
          tradingContext={{
            selectedPair: selectedTradingPair,
            currentPrice: selectedPair?.price,
            accountBalance: accountData.availableBalance,
            positions: mockPositions,
            marketData: selectedPair
          }}
          walletState={{
            isConnected: isWalletConnected,
            address: walletAddress,
            chainId: currentChainId || undefined
          }}
          onPlanExecute={handleAIPlanExecute}
          onPlanBookmark={handleAIPlanBookmark}
          onPlanShare={handleAIPlanShare}
          buttonPosition="bottom-right"
        />
      )}

      {/* Mobile AI Optimized Interface */}
      {isMobile && (
        <AIMobileOptimized
          isOpen={isMobileAIOpen}
          onOpenChange={setIsMobileAIOpen}
          tradingContext={{
            selectedPair: selectedTradingPair,
            currentPrice: selectedPair?.price,
            accountBalance: accountData.availableBalance,
            positions: mockPositions
          }}
          walletState={{
            isConnected: isWalletConnected,
            address: walletAddress,
            chainId: currentChainId || undefined
          }}
          onPlanExecute={handleAIPlanExecute}
          onPlanBookmark={handleAIPlanBookmark}
          onPlanShare={handleAIPlanShare}
        />
      )}
    </div>
  );
}