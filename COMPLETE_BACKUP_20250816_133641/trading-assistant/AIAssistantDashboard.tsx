import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  RiverBrandCard, 
  RiverBrandText, 
  RiverBrandButton,
  RiverStatusIndicator,
  RiverPriceDisplay
} from '../ui/riverbit-brand-system';
import {
  Brain,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Shield,
  Zap,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Percent,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Settings,
  Maximize2,
  Minimize2,
  X,
  Bot,
  Sparkles,
  LineChart,
  TrendingUp as TrendingUpIcon,
  Users,
  Globe,
  Wallet,
  MessageSquare,
  Lightbulb,
  BookmarkPlus,
  Share2,
  Download,
  Upload,
  Filter,
  Search,
  Calendar,
  Star,
  Heart,
  ThumbsUp
} from 'lucide-react';

// Import existing components
import TradingAssistantChat from './TradingAssistantChat';
import { TradingPlan } from './types';
import { OpportunityRadarPanel } from './OpportunityRadarPanel';
import { PerformanceDashboard } from './PerformanceDashboard';
import { RiskManagerPanel } from './RiskManagerPanel';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface MarketInsight {
  id: string;
  symbol: string;
  type: 'opportunity' | 'risk' | 'analysis' | 'alert';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  price?: number;
  change?: number;
  volume?: number;
  timestamp: Date;
  tags: string[];
}

export interface AIPerformanceMetrics {
  totalPredictions: number;
  accuracyRate: number;
  profitableTrades: number;
  totalPnL: number;
  avgHoldTime: string;
  bestPerformingStrategy: string;
  riskScore: number;
  successfulAlerts: number;
}

export interface AIAssistantDashboardProps {
  /** Whether dashboard is in fullscreen mode */
  isFullscreen?: boolean;
  /** Function to handle fullscreen toggle */
  onToggleFullscreen?: () => void;
  /** Function to handle dashboard close */
  onClose?: () => void;
  /** Trading context data */
  tradingContext?: {
    selectedPair: string;
    currentPrice?: number;
    accountBalance?: number;
    positions?: any[];
    marketData?: any;
  };
  /** Wallet connection state */
  walletState?: {
    isConnected: boolean;
    address?: string;
    chainId?: number;
  };
  /** AI configuration */
  aiConfig?: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    tradingStyle: 'scalping' | 'swing' | 'position';
    alertsEnabled: boolean;
    autoExecuteEnabled: boolean;
  };
  /** Event handlers */
  onPlanExecute?: (plan: TradingPlan) => Promise<void>;
  onPlanBookmark?: (planId: string) => void;
  onPlanShare?: (plan: TradingPlan) => void;
  onInsightAction?: (insight: MarketInsight, action: string) => void;
  /** Custom styling */
  className?: string;
}

// ============================================================================
// MOCK DATA (In production, this would come from APIs)
// ============================================================================

const mockMarketInsights: MarketInsight[] = [
  {
    id: '1',
    symbol: 'BTC/USDT',
    type: 'opportunity',
    title: 'Strong Support Level Detected',
    description: 'BTC is testing the $43,200 support level with high volume. Historical data shows 78% bounce rate from this level.',
    confidence: 85,
    impact: 'high',
    timeframe: '4h',
    price: 43245,
    change: -2.3,
    volume: 1250000,
    timestamp: new Date(),
    tags: ['support', 'volume', 'technical']
  },
  {
    id: '2',
    symbol: 'ETH/USDT',
    type: 'risk',
    title: 'Potential Resistance Rejection',
    description: 'ETH approaching key resistance at $2,680. Multiple rejections from this level in the past week.',
    confidence: 72,
    impact: 'medium',
    timeframe: '1h',
    price: 2665,
    change: 1.2,
    volume: 890000,
    timestamp: new Date(),
    tags: ['resistance', 'rejection', 'caution']
  },
  {
    id: '3',
    symbol: 'SOL/USDT',
    type: 'alert',
    title: 'Unusual Volume Spike',
    description: 'SOL experiencing 340% above average volume. Possible breakout or breakdown imminent.',
    confidence: 91,
    impact: 'high',
    timeframe: '15m',
    price: 89.45,
    change: 5.7,
    volume: 2100000,
    timestamp: new Date(),
    tags: ['volume', 'breakout', 'momentum']
  }
];

const mockPerformanceMetrics: AIPerformanceMetrics = {
  totalPredictions: 342,
  accuracyRate: 73.8,
  profitableTrades: 89,
  totalPnL: 12450.75,
  avgHoldTime: '2h 34m',
  bestPerformingStrategy: 'Momentum Breakout',
  riskScore: 6.2,
  successfulAlerts: 156
};

// ============================================================================
// AI ASSISTANT DASHBOARD COMPONENT
// ============================================================================

const AIAssistantDashboard: React.FC<AIAssistantDashboardProps> = ({
  isFullscreen = false,
  onToggleFullscreen,
  onClose,
  tradingContext,
  walletState,
  aiConfig,
  onPlanExecute,
  onPlanBookmark,
  onPlanShare,
  onInsightAction,
  className = ''
}) => {
  // ========== STATE MANAGEMENT ==========
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<MarketInsight[]>(mockMarketInsights);
  const [performanceMetrics, setPerformanceMetrics] = useState<AIPerformanceMetrics>(mockPerformanceMetrics);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ========== EFFECTS ==========
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        // Simulate real-time updates
        setInsights(prev => prev.map(insight => ({
          ...insight,
          confidence: Math.max(50, Math.min(95, insight.confidence + (Math.random() - 0.5) * 5)),
          timestamp: new Date()
        })));
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // ========== COMPUTED VALUES ==========
  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      const hoursAgo = (Date.now() - insight.timestamp.getTime()) / (1000 * 60 * 60);
      switch (selectedTimeframe) {
        case '1h': return hoursAgo <= 1;
        case '4h': return hoursAgo <= 4;
        case '24h': return hoursAgo <= 24;
        default: return true;
      }
    });
  }, [insights, selectedTimeframe]);

  const portfolioValue = tradingContext?.accountBalance || 0;
  const totalPnL = performanceMetrics.totalPnL;
  const pnlPercentage = portfolioValue > 0 ? (totalPnL / portfolioValue) * 100 : 0;

  // ========== EVENT HANDLERS ==========
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const newInsight: MarketInsight = {
        id: Date.now().toString(),
        symbol: tradingContext?.selectedPair || 'BTC/USDT',
        type: 'analysis',
        title: 'AI Market Analysis Complete',
        description: 'Deep learning models have identified new patterns in market microstructure.',
        confidence: Math.floor(Math.random() * 30) + 70,
        impact: 'medium',
        timeframe: '1h',
        price: tradingContext?.currentPrice,
        change: (Math.random() - 0.5) * 10,
        timestamp: new Date(),
        tags: ['ai-analysis', 'patterns', 'microstructure']
      };
      
      setInsights(prev => [newInsight, ...prev]);
      setIsAnalyzing(false);
    }, 3000);
  };

  const handleInsightAction = (insight: MarketInsight, action: string) => {
    onInsightAction?.(insight, action);
    
    // Update insight based on action
    setInsights(prev => prev.map(item => 
      item.id === insight.id 
        ? { ...item, tags: [...item.tags, action] }
        : item
    ));
  };

  // ========== RENDER FUNCTIONS ==========

  const renderDashboardHeader = () => (
    <div className="flex items-center justify-between p-6 border-b border-border/50 bg-surface-1/80 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-river-blue-main/20 via-river-blue-light/20 to-river-accent/20 border border-river-blue/30">
            <Brain className="h-8 w-8 text-river-blue-main animate-pulse" />
          </div>
          <div>
            <RiverBrandText variant="heading" gradient className="text-2xl">
              RiverBit AI Dashboard
            </RiverBrandText>
            <p className="text-muted-foreground text-sm">
              Advanced AI-powered trading intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <RiverStatusIndicator 
            status={walletState?.isConnected ? 'online' : 'offline'}
            label={walletState?.isConnected ? 'Live Data' : 'Demo Mode'}
            size="md"
          />
          
          <Badge variant="outline" className="gap-2 bg-surface-2/50 border-river-blue/30">
            <Activity className="h-3 w-3" />
            {tradingContext?.selectedPair || 'BTC/USDT'}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-surface-2/50 rounded-lg p-2 border border-border/30">
          <Switch 
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
            id="auto-refresh"
          />
          <label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
            Auto Refresh
          </label>
        </div>

        <RiverBrandButton
          variant="secondary"
          size="sm"
          onClick={handleRunAnalysis}
          loading={isAnalyzing}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          AI Analysis
        </RiverBrandButton>

        <Button
          size="sm"
          variant="ghost"
          onClick={onToggleFullscreen}
          className="text-muted-foreground hover:text-foreground"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="text-muted-foreground hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* AI Performance Metrics */}
      <div className="lg:col-span-2 space-y-6">
        <RiverBrandCard variant="premium" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <RiverBrandText variant="subtitle" weight="bold">
              AI Performance Overview
            </RiverBrandText>
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="4h">4 Hours</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-2/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-river-blue-main">
                {performanceMetrics.accuracyRate}%
              </div>
              <div className="text-sm text-muted-foreground">Accuracy Rate</div>
            </div>
            
            <div className="bg-surface-2/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-500">
                ${performanceMetrics.totalPnL.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total PnL</div>
            </div>
            
            <div className="bg-surface-2/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">
                {performanceMetrics.totalPredictions}
              </div>
              <div className="text-sm text-muted-foreground">Predictions</div>
            </div>
            
            <div className="bg-surface-2/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">
                {performanceMetrics.riskScore}/10
              </div>
              <div className="text-sm text-muted-foreground">Risk Score</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Trading Success Rate</span>
              <span className="text-sm font-medium">{performanceMetrics.accuracyRate}%</span>
            </div>
            <Progress value={performanceMetrics.accuracyRate} className="h-2" />
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Risk Management</span>
              <span className="text-sm font-medium">{100 - performanceMetrics.riskScore * 10}%</span>
            </div>
            <Progress value={100 - performanceMetrics.riskScore * 10} className="h-2" />
          </div>
        </RiverBrandCard>

        {/* Market Insights */}
        <RiverBrandCard variant="trading" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <RiverBrandText variant="subtitle" weight="bold">
              Live Market Insights
            </RiverBrandText>
            <Badge variant="outline" className="gap-1">
              <Eye className="h-3 w-3" />
              {filteredInsights.length} Active
            </Badge>
          </div>

          <ScrollArea className="h-80">
            <div className="space-y-4">
              {filteredInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 rounded-lg border border-border/30 bg-surface-1/50 hover:bg-surface-2/50 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          insight.type === 'opportunity' ? 'default' :
                          insight.type === 'risk' ? 'destructive' :
                          insight.type === 'alert' ? 'secondary' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {insight.type}
                      </Badge>
                      
                      <Badge variant="outline" className="text-xs">
                        {insight.symbol}
                      </Badge>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {insight.timeframe}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-xs font-medium text-river-blue-main">
                        {insight.confidence}% confidence
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleInsightAction(insight, 'bookmark')}>
                            <BookmarkPlus className="h-4 w-4 mr-2" />
                            Bookmark
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleInsightAction(insight, 'share')}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleInsightAction(insight, 'trade')}>
                            <Target className="h-4 w-4 mr-2" />
                            Create Plan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <h4 className="font-semibold text-sm mb-2">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground mb-3">{insight.description}</p>

                  {insight.price && (
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>${insight.price.toLocaleString()}</span>
                      </div>
                      {insight.change && (
                        <div className={`flex items-center gap-1 ${insight.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {insight.change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          <span>{Math.abs(insight.change).toFixed(2)}%</span>
                        </div>
                      )}
                      {insight.volume && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <BarChart3 className="h-3 w-3" />
                          <span>{(insight.volume / 1000000).toFixed(1)}M</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-1 mt-3">
                    {insight.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs px-2 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </RiverBrandCard>
      </div>

      {/* AI Chat Integration */}
      <div className="space-y-6">
        <RiverBrandCard variant="glass" className="h-[600px] p-0 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-surface-1/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-river-blue-main" />
              <RiverBrandText variant="body" weight="semibold">
                AI Chat Assistant
              </RiverBrandText>
            </div>
          </div>
          
          <TradingAssistantChat
            userAddress={walletState?.address}
            isConnected={walletState?.isConnected || false}
            accountBalance={tradingContext?.accountBalance}
            onPlanExecute={onPlanExecute}
            onPlanBookmark={onPlanBookmark}
            onPlanShare={onPlanShare}
            className="h-full border-0 bg-transparent"
          />
        </RiverBrandCard>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="p-6">
      <PerformanceDashboard 
        accountData={{
          balance: tradingContext?.accountBalance || 0,
          positions: tradingContext?.positions || []
        }}
        className="mb-6"
      />
    </div>
  );

  const renderOpportunitiesTab = () => (
    <div className="p-6">
      <OpportunityRadarPanel 
        selectedPair={tradingContext?.selectedPair || 'BTC/USDT'}
        className="mb-6"
      />
    </div>
  );

  const renderRiskTab = () => (
    <div className="p-6">
      <RiskManagerPanel 
        positions={tradingContext?.positions || []}
        accountBalance={tradingContext?.accountBalance || 0}
        className="mb-6"
      />
    </div>
  );

  // ========== MAIN RENDER ==========

  return (
    <div className={`h-full flex flex-col bg-gradient-to-br from-surface-0 via-surface-1 to-surface-0 ${className}`}>
      {renderDashboardHeader()}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-6 mt-4 bg-surface-2/50 backdrop-blur-sm border border-border/30">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="gap-2">
            <Target className="h-4 w-4" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-2">
            <Shield className="h-4 w-4" />
            Risk Management
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="overview" className="mt-0 h-full">
            {renderOverviewTab()}
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-0 h-full">
            {renderAnalyticsTab()}
          </TabsContent>
          
          <TabsContent value="opportunities" className="mt-0 h-full">
            {renderOpportunitiesTab()}
          </TabsContent>
          
          <TabsContent value="risk" className="mt-0 h-full">
            {renderRiskTab()}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AIAssistantDashboard;