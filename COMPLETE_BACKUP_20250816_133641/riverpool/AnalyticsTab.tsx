import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  ComposedChart, ReferenceLine
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Target, BarChart3, 
  PieChart as PieChartIcon, Zap, Shield, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, Minus, DollarSign,
  Clock, Users, Globe, Layers, Filter, RefreshCw,
  Eye, EyeOff, Settings, Download, Share2, Calendar
} from 'lucide-react';
import LiquidGlassCard from '../ui/LiquidGlassCard';
import RiverBentoGrid from '../ui/RiverBentoGrid';
import { useRiverBitWeb3 } from '../../providers/RiverBitWeb3Provider';
import { useRiverBitEvents } from '../../hooks/useRiverBitContracts';

// Professional analytics data types
interface PortfolioMetrics {
  totalValue: number;
  totalPnL: number;
  pnlPercentage: number;
  roi: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgHoldTime: number;
  totalTrades: number;
}

interface PerformanceData {
  date: string;
  portfolioValue: number;
  pnl: number;
  volume: number;
  trades: number;
}

interface AssetPerformance {
  asset: string;
  pnl: number;
  percentage: number;
  volume: number;
  trades: number;
  winRate: number;
}

interface RiskMetrics {
  var95: number;
  var99: number;
  expectedShortfall: number;
  betaToMarket: number;
  correlation: number;
  volatility: number;
}

// Mock portfolio metrics - will be replaced with real data in component
const mockPortfolioMetricsData: PortfolioMetrics = {
  totalValue: 125750.50,
  totalPnL: 25750.50,
  pnlPercentage: 25.78,
  roi: 28.45,
  sharpeRatio: 1.85,
  maxDrawdown: -8.32,
  winRate: 68.5,
  profitFactor: 2.34,
  avgHoldTime: 4.2,
  totalTrades: 127
};

const mockPerformanceData: PerformanceData[] = [
  { date: '2024-07-01', portfolioValue: 100000, pnl: 0, volume: 45000, trades: 12 },
  { date: '2024-07-08', portfolioValue: 102500, pnl: 2500, volume: 52000, trades: 15 },
  { date: '2024-07-15', portfolioValue: 98750, pnl: -1250, volume: 48000, trades: 18 },
  { date: '2024-07-22', portfolioValue: 105200, pnl: 5200, volume: 61000, trades: 21 },
  { date: '2024-07-29', portfolioValue: 108900, pnl: 8900, volume: 58000, trades: 19 },
  { date: '2024-08-05', portfolioValue: 115600, pnl: 15600, volume: 67000, trades: 24 },
  { date: '2024-08-12', portfolioValue: 125750, pnl: 25750, volume: 72000, trades: 28 }
];

// Mock asset performance data - will be replaced with real data in component
const mockAssetPerformanceData: AssetPerformance[] = [
  { asset: 'ETH', pnl: 12500, percentage: 48.5, volume: 285000, trades: 45, winRate: 72 },
  { asset: 'BTC', pnl: 8900, percentage: 34.6, volume: 198000, trades: 32, winRate: 69 },
  { asset: 'SOL', pnl: 3200, percentage: 12.4, volume: 89000, trades: 28, winRate: 64 },
  { asset: 'AVAX', pnl: 1150, percentage: 4.5, volume: 42000, trades: 22, winRate: 59 }
];

const mockRiskMetrics: RiskMetrics = {
  var95: -2850,
  var99: -4200,
  expectedShortfall: -5100,
  betaToMarket: 1.25,
  correlation: 0.78,
  volatility: 18.5
};

const mockVolumeData = [
  { time: '00:00', volume: 1200, price: 3240 },
  { time: '04:00', volume: 890, price: 3258 },
  { time: '08:00', volume: 2100, price: 3275 },
  { time: '12:00', volume: 3400, price: 3292 },
  { time: '16:00', volume: 2850, price: 3285 },
  { time: '20:00', volume: 1950, price: 3270 }
];

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

// Professional metric card component
interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, value, change, icon, trend = 'neutral', subtitle 
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-river-profit';
      case 'down': return 'text-river-loss';
      default: return 'text-river-surface';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="w-4 h-4" />;
      case 'down': return <ArrowDownRight className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };

  return (
    <LiquidGlassCard 
      variant="trading" 
      className="p-6 hover:shadow-lg hover:shadow-river-surface/20 transition-all duration-300 border border-river-surface/20"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-river-surface to-river-glow rounded-lg flex items-center justify-center">
              <div className="text-white">{icon}</div>
            </div>
            <span className="text-river-surface text-sm font-semibold">{title}</span>
          </div>
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">{value}</div>
          {subtitle && (
            <div className="text-xs text-gray-400">{subtitle}</div>
          )}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all duration-300 ${
            trend === 'up' ? 'bg-river-profit/20 border-river-profit/30 text-river-profit' :
            trend === 'down' ? 'bg-river-loss/20 border-river-loss/30 text-river-loss' :
            'bg-river-surface/20 border-river-surface/30 text-river-surface'
          }`}>
            {getTrendIcon()}
            <span className="text-sm font-semibold">
              {formatPercentage(change)}
            </span>
          </div>
        )}
      </div>
    </LiquidGlassCard>
  );
};

// Chart container component
interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  height?: number;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ 
  title, children, actions, height = 300 
}) => {
  return (
    <LiquidGlassCard variant="chart" className="p-6 border border-river-glow/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-river-glow to-river-flow rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      <div style={{ height }}>
        {children}
      </div>
    </LiquidGlassCard>
  );
};

export const AnalyticsTab: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'1D' | '7D' | '30D' | '90D'>('7D');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Web3 integration
  const {
    isConnected: web3Connected,
    accountInfo,
    positions,
    orders,
    usdcBalance,
    ethBalance
  } = useRiverBitWeb3();
  
  const { events } = useRiverBitEvents();

  // Real portfolio metrics from Web3 data (moved inside component)
  const portfolioMetrics = useMemo((): PortfolioMetrics => {
    if (!web3Connected || !accountInfo) {
      // Return mock data when not connected
      return mockPortfolioMetricsData;
    }
    
    // Calculate real metrics from Web3 data
    const totalValue = parseFloat(accountInfo.equity);
    const totalPnL = parseFloat(accountInfo.totalPnl);
    const balance = parseFloat(accountInfo.balance);
    const pnlPercentage = balance > 0 ? (totalPnL / balance * 100) : 0;
    
    // Calculate win rate from positions
    const profitablePositions = positions.filter(p => parseFloat(p.unrealizedPnl) > 0).length;
    const winRate = positions.length > 0 ? (profitablePositions / positions.length * 100) : 0;
    
    // Calculate completed trades from events
    const tradeEvents = events.filter(e => e.type === 'OrderExecuted' || e.type === 'PositionClosed');
    const totalTrades = Math.max(tradeEvents.length, positions.length + orders.length);
    
    return {
      totalValue,
      totalPnL,
      pnlPercentage,
      roi: pnlPercentage, // Simplified ROI calculation
      sharpeRatio: 1.85, // Would need historical data for accurate calculation
      maxDrawdown: -8.32, // Would need historical data for accurate calculation
      winRate,
      profitFactor: 2.34, // Would need profit/loss history for accurate calculation
      avgHoldTime: 4.2, // Would need position history for accurate calculation
      totalTrades
    };
  }, [web3Connected, accountInfo, positions, orders, events]);

  // Real asset performance from Web3 positions (moved inside component)
  const assetPerformance = useMemo((): AssetPerformance[] => {
    if (!web3Connected || positions.length === 0) {
      // Return mock data when not connected or no positions
      return mockAssetPerformanceData;
    }
    
    // Group positions by asset
    const assetGroups = positions.reduce((acc, position) => {
      const asset = position.market.replace('-PERP', '').replace('/USDT', '');
      if (!acc[asset]) {
        acc[asset] = {
          positions: [],
          totalPnl: 0,
          totalVolume: 0
        };
      }
      acc[asset].positions.push(position);
      acc[asset].totalPnl += parseFloat(position.unrealizedPnl);
      acc[asset].totalVolume += parseFloat(position.size) * parseFloat(position.entryPrice);
      return acc;
    }, {} as Record<string, { positions: any[], totalPnl: number, totalVolume: number }>);
    
    const totalPnl = Object.values(assetGroups).reduce((sum, group) => sum + group.totalPnl, 0);
    
    return Object.entries(assetGroups).map(([asset, group]) => {
      const profitablePositions = group.positions.filter(p => parseFloat(p.unrealizedPnl) > 0).length;
      const winRate = group.positions.length > 0 ? (profitablePositions / group.positions.length * 100) : 0;
      const percentage = totalPnl !== 0 ? (group.totalPnl / totalPnl * 100) : 0;
      
      return {
        asset,
        pnl: group.totalPnl,
        percentage: Math.abs(percentage),
        volume: group.totalVolume,
        trades: group.positions.length,
        winRate
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [web3Connected, positions]);

  const portfolioTrend = useMemo(() => {
    return portfolioMetrics.pnlPercentage >= 0 ? 'up' : 'down';
  }, [portfolioMetrics.pnlPercentage]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <LiquidGlassCard variant="subtle" className="p-3 border border-river-surface/30 bg-river-depth/90 backdrop-blur-xl">
          <p className="text-river-surface/80 text-sm mb-1 font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-white font-semibold">
              {entry.name}: {typeof entry.value === 'number' && entry.name.includes('$') 
                ? formatCurrency(entry.value) 
                : formatNumber(entry.value)}
            </p>
          ))}
        </LiquidGlassCard>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* River Analytics Header with Controls */}
      <LiquidGlassCard 
        variant="intense" 
        className="p-6 border border-river-glow/30 bg-gradient-to-r from-river-depth/80 to-river-glow/10 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-r from-river-glow to-river-flow rounded-xl flex items-center justify-center shadow-lg shadow-river-glow/30">
              <PieChartIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Portfolio Analytics</h2>
              <p className="text-river-glow/80 text-sm font-medium">
                {web3Connected ? 'Live trading performance metrics and insights' : 'Demo trading performance metrics and insights'}
              </p>
              {web3Connected && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-river-profit rounded-full animate-pulse"></div>
                  <span className="text-xs text-river-profit font-medium">Connected to {positions.length} active positions</span>
                </div>
              )}
            </div>
          </div>
        
          <div className="flex items-center gap-3">
            {/* River Timeframe Selector */}
            <div className="flex items-center bg-river-depth/60 rounded-xl p-1 border border-river-surface/20">
              {(['1D', '7D', '30D', '90D'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeframe(period)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                    timeframe === period
                      ? 'bg-river-glow text-white shadow-lg shadow-river-glow/25'
                      : 'text-river-surface/70 hover:text-river-surface hover:bg-river-surface/10'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            
            {/* River Advanced Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-river-depth/60 hover:bg-river-surface/10 rounded-xl transition-all duration-300 border border-river-surface/20 text-river-surface hover:text-white"
            >
              {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAdvanced ? 'Simple' : 'Advanced'}
            </button>
            
            {/* River Action Buttons */}
            <div className="flex items-center gap-2">
              <button className="p-3 text-river-surface/70 hover:text-river-surface hover:bg-river-surface/10 rounded-xl transition-all duration-300">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button className="p-3 text-river-surface/70 hover:text-river-surface hover:bg-river-surface/10 rounded-xl transition-all duration-300">
                <Download className="w-4 h-4" />
              </button>
              <button className="p-3 text-river-surface/70 hover:text-river-surface hover:bg-river-surface/10 rounded-xl transition-all duration-300">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Key Metrics Grid */}
      <RiverBentoGrid columns={12} spacing="normal">
        <div className="lg:col-span-3 md:col-span-6 col-span-12">
          <MetricCard
            title="Portfolio Value"
            value={formatCurrency(portfolioMetrics.totalValue)}
            change={portfolioMetrics.pnlPercentage}
            icon={<DollarSign className="w-5 h-5" />}
            trend={portfolioTrend}
            subtitle="Total assets under management"
          />
        </div>
        
        <div className="lg:col-span-3 md:col-span-6 col-span-12">
          <MetricCard
            title="Total P&L"
            value={formatCurrency(portfolioMetrics.totalPnL)}
            change={portfolioMetrics.roi}
            icon={<TrendingUp className="w-5 h-5" />}
            trend={portfolioTrend}
            subtitle="Realized + unrealized gains"
          />
        </div>
        
        <div className="lg:col-span-3 md:col-span-6 col-span-12">
          <MetricCard
            title="Win Rate"
            value={`${portfolioMetrics.winRate}%`}
            change={5.2}
            icon={<Target className="w-5 h-5" />}
            trend="up"
            subtitle="Successful trades ratio"
          />
        </div>
        
        <div className="lg:col-span-3 md:col-span-6 col-span-12">
          <MetricCard
            title="Sharpe Ratio"
            value={portfolioMetrics.sharpeRatio.toFixed(2)}
            change={0.15}
            icon={<Activity className="w-5 h-5" />}
            trend="up"
            subtitle="Risk-adjusted returns"
          />
        </div>
      </RiverBentoGrid>

      {/* Portfolio Performance Chart */}
      <ChartContainer 
        title="Portfolio Performance" 
        actions={
          <div className="flex items-center gap-2 text-sm text-secondary">
            <Calendar className="w-4 h-4" />
            <span>Last {timeframe}</span>
          </div>
        }
        height={400}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mockPerformanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis 
              dataKey="date" 
              stroke="var(--text-secondary)"
              fontSize={12}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              yAxisId="portfolio"
              stroke="var(--text-secondary)"
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <YAxis 
              yAxisId="volume"
              orientation="right"
              stroke="var(--text-secondary)"
              fontSize={12}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Portfolio Value Area */}
            <Area
              yAxisId="portfolio"
              type="monotone"
              dataKey="portfolioValue"
              fill="url(#portfolioGradient)"
              stroke="var(--river-blue-500)"
              strokeWidth={2}
              name="Portfolio Value ($)"
            />
            
            {/* Volume Bars */}
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="var(--river-blue-300)"
              opacity={0.3}
              name="Volume ($)"
            />
            
            {/* P&L Line */}
            <Line
              yAxisId="portfolio"
              type="monotone"
              dataKey="pnl"
              stroke="var(--digital-green-500)"
              strokeWidth={2}
              dot={{ fill: 'var(--digital-green-500)', strokeWidth: 2, r: 4 }}
              name="P&L ($)"
            />
            
            {/* Zero P&L Reference */}
            <ReferenceLine 
              yAxisId="portfolio"
              y={100000} 
              stroke="var(--text-muted)" 
              strokeDasharray="2 2" 
            />
            
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--river-blue-500)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--river-blue-500)" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Asset Performance and Risk Metrics */}
      <RiverBentoGrid columns={12} spacing="normal">
        {/* Asset Performance */}
        <div className="lg:col-span-8 col-span-12">
          <ChartContainer title="Asset Performance Breakdown" height={350}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis 
                  dataKey="asset" 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="pnl" 
                  name="P&L ($)"
                  radius={[4, 4, 0, 0]}
                >
                  {assetPerformance.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.pnl >= 0 ? 'var(--digital-green-500)' : 'var(--critical-red-500)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
        
        {/* Portfolio Allocation */}
        <div className="lg:col-span-4 col-span-12">
          <ChartContainer title="Portfolio Allocation" height={350}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetPerformance}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  dataKey="percentage"
                  startAngle={90}
                  endAngle={450}
                >
                  {assetPerformance.map((entry, index) => {
                    const colors = ['var(--river-blue-500)', 'var(--digital-green-500)', 'var(--precision-orange-500)', 'var(--critical-red-500)'];
                    return (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    );
                  })}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <LiquidGlassCard variant="subtle" className="p-3 border border-default">
                          <p className="text-primary font-semibold">{data.asset}</p>
                          <p className="text-secondary text-sm">{data.percentage.toFixed(1)}%</p>
                          <p className="text-sm text-profit">{formatCurrency(data.pnl)}</p>
                        </LiquidGlassCard>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend */}
            <div className="mt-4 space-y-2">
              {assetPerformance.map((asset, index) => {
                const colors = ['var(--river-blue-500)', 'var(--digital-green-500)', 'var(--precision-orange-500)', 'var(--critical-red-500)'];
                return (
                  <div key={asset.asset} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: colors[index % colors.length] }}
                      />
                      <span className="text-secondary">{asset.asset}</span>
                    </div>
                    <span className="text-primary font-medium">{asset.percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </ChartContainer>
        </div>
      </RiverBentoGrid>

      {/* Advanced Metrics (conditional) */}
      {showAdvanced && (
        <>
          {/* Risk Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MetricCard
              title="Value at Risk (95%)"
              value={formatCurrency(mockRiskMetrics.var95)}
              icon={<Shield className="w-5 h-5" />}
              trend="down"
              subtitle="Maximum expected loss"
            />
            
            <MetricCard
              title="Max Drawdown"
              value={formatPercentage(portfolioMetrics.maxDrawdown)}
              icon={<AlertTriangle className="w-5 h-5" />}
              trend="down"
              subtitle="Largest peak-to-trough decline"
            />
            
            <MetricCard
              title="Beta to Market"
              value={mockRiskMetrics.betaToMarket.toFixed(2)}
              icon={<BarChart3 className="w-5 h-5" />}
              trend="neutral"
              subtitle="Market correlation coefficient"
            />
          </div>
          
          {/* Volume Analysis */}
          <ChartContainer title="24h Volume Distribution" height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis 
                  dataKey="time" 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="var(--river-blue-500)"
                  fill="url(#volumeGradient)"
                  strokeWidth={2}
                  name="Volume ($)"
                />
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--river-blue-500)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--river-blue-500)" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
          
          {/* Trading Statistics */}
          <RiverBentoGrid columns={12} spacing="normal">
            <div className="lg:col-span-3 md:col-span-6 col-span-12">
              <MetricCard
                title="Profit Factor"
                value={portfolioMetrics.profitFactor.toFixed(2)}
                icon={<Zap className="w-5 h-5" />}
                trend="up"
                subtitle="Gross profit / gross loss"
              />
            </div>
            
            <div className="lg:col-span-3 md:col-span-6 col-span-12">
              <MetricCard
                title="Avg Hold Time"
                value={`${portfolioMetrics.avgHoldTime.toFixed(1)}d`}
                icon={<Clock className="w-5 h-5" />}
                trend="neutral"
                subtitle="Average position duration"
              />
            </div>
            
            <div className="lg:col-span-3 md:col-span-6 col-span-12">
              <MetricCard
                title="Total Trades"
                value={formatNumber(portfolioMetrics.totalTrades)}
                icon={<Activity className="w-5 h-5" />}
                trend="up"
                subtitle="Completed transactions"
              />
            </div>
            
            <div className="lg:col-span-3 md:col-span-6 col-span-12">
              <MetricCard
                title="Volatility"
                value={`${mockRiskMetrics.volatility.toFixed(1)}%`}
                icon={<TrendingUp className="w-5 h-5" />}
                trend="neutral"
                subtitle="Annual volatility measure"
              />
            </div>
          </RiverBentoGrid>
        </>
      )}
      
      {/* River Performance Summary */}
      <LiquidGlassCard variant="trading" className="p-6 border border-river-glow/30 bg-gradient-to-r from-river-depth/60 to-river-glow/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-river-glow to-river-flow rounded-xl flex items-center justify-center shadow-lg shadow-river-glow/25">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Performance Summary</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-river-surface/60">
            <div className="w-2 h-2 bg-river-profit rounded-full animate-pulse"></div>
            <span>Updated 2 minutes ago</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-river-profit/10 rounded-xl border border-river-profit/20">
            <div className="text-2xl font-bold text-river-profit mb-2 tracking-tight">
              {formatPercentage(portfolioMetrics.roi)}
            </div>
            <div className="text-sm text-river-profit/70 font-medium">Return on Investment</div>
          </div>
          
          <div className="text-center p-4 bg-river-glow/10 rounded-xl border border-river-glow/20">
            <div className="text-2xl font-bold text-river-glow mb-2 tracking-tight">
              {portfolioMetrics.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-sm text-river-glow/70 font-medium">Sharpe Ratio</div>
          </div>
          
          <div className="text-center p-4 bg-river-surface/10 rounded-xl border border-river-surface/20">
            <div className="text-2xl font-bold text-river-surface mb-2 tracking-tight">
              {portfolioMetrics.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-river-surface/70 font-medium">Win Rate</div>
          </div>
          
          <div className="text-center p-4 bg-river-loss/10 rounded-xl border border-river-loss/20">
            <div className="text-2xl font-bold text-river-loss mb-2 tracking-tight">
              {formatPercentage(portfolioMetrics.maxDrawdown)}
            </div>
            <div className="text-sm text-river-loss/70 font-medium">Max Drawdown</div>
          </div>
        </div>
      </LiquidGlassCard>
    </div>
  );
};

export default AnalyticsTab;