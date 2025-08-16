import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Target, Shield, 
  DollarSign, Activity, Eye, EyeOff, BarChart3, Layers,
  Zap, Settings, Filter, RefreshCw
} from 'lucide-react';
import LiquidGlassCard from '../ui/LiquidGlassCard';
import RiverBentoGrid from '../ui/RiverBentoGrid';
import { Button } from '../ui/button';
import { systemPositions, userData, getSystemStats, getUserPoolContribution } from '../../data/riverPoolData';
import { UserShareOverview } from './UserShareOverview';
import { SystemStatusOverview } from './SystemStatusOverview';
import { 
  formatCurrency, formatPercentage, calculatePnLPercentage, 
  isLongPosition, getPositionSideText, getRiskLevel
} from '../../utils/riverPoolUtils';

export const SystemPositionsTab: React.FC = () => {
  const systemStats = getSystemStats();
  const userContribution = getUserPoolContribution();
  
  // Professional view state management
  const [showDetailedView, setShowDetailedView] = useState(true);
  const [filterRiskLevel, setFilterRiskLevel] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'pnl' | 'exposure' | 'margin'>('pnl');

  // Enhanced position data with real-time calculations
  const enhancedPositions = systemPositions.map(position => {
    const isLong = isLongPosition(position.side);
    const pnlPercentage = calculatePnLPercentage(position.unrealizedPnL, position.totalMargin);
    const userPnLShare = (position.unrealizedPnL * userData.sharePercent) / 100;
    const exposureRisk = getRiskLevel(position.exposurePercent, 'exposure');
    
    return {
      ...position,
      isLong,
      pnlPercentage,
      userPnLShare,
      exposureRisk,
      leverage: (position.netSize * position.avgPrice) / position.totalMargin,
      notionalValue: Math.abs(position.netSize) * position.currentPrice
    };
  });

  // Filter and sort positions
  const filteredPositions = enhancedPositions
    .filter(pos => filterRiskLevel === 'all' || pos.riskLevel === filterRiskLevel)
    .sort((a, b) => {
      switch (sortBy) {
        case 'pnl': return b.unrealizedPnL - a.unrealizedPnL;
        case 'exposure': return b.exposurePercent - a.exposurePercent;
        case 'margin': return b.totalMargin - a.totalMargin;
        default: return 0;
      }
    });

  return (
    <div className="space-y-6">
      {/* Professional System Header */}
      <LiquidGlassCard 
        variant="intense" 
        withGradient 
        className="p-6 border border-blue-400/20"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">系統持倉詳情</h2>
              <p className="text-gray-300 text-sm font-medium">Automated Market Making Positions</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-blue-400 border-blue-400/50 bg-blue-400/10 px-4 py-2">
              <Shield className="w-4 h-4 mr-2" />
              Auto-Managed
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailedView(!showDetailedView)}
              className="border-gray-600 text-gray-300 hover:border-blue-400 hover:text-blue-400"
            >
              {showDetailedView ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showDetailedView ? 'Simple' : 'Detailed'}
            </Button>
          </div>
        </div>
        
        {/* Real-time System Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Total Positions</div>
            <div className="text-xl font-bold text-white">{systemPositions.length}</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Net PnL</div>
            <div className={`text-xl font-bold ${systemStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {systemStats.totalPnL >= 0 ? '+' : ''}${systemStats.totalPnL.toFixed(0)}K
            </div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Total Margin</div>
            <div className="text-xl font-bold text-white">${systemStats.totalMargin.toFixed(0)}K</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Your Share</div>
            <div className="text-xl font-bold text-purple-400">{userData.sharePercent.toFixed(3)}%</div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Professional Controls Panel */}
      <RiverBentoGrid columns={12} spacing="normal">
        <div className="lg:col-span-4 md:col-span-6 col-span-12">
          <LiquidGlassCard variant="trading" className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-white">Filters & Controls</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Risk Level Filter</label>
                <div className="flex gap-2">
                  {['all', 'low', 'medium', 'high'].map((level) => (
                    <Button
                      key={level}
                      size="sm"
                      variant={filterRiskLevel === level ? 'default' : 'outline'}
                      onClick={() => setFilterRiskLevel(level as any)}
                      className="flex-1 text-xs"
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-2">Sort By</label>
                <div className="flex gap-2">
                  {[
                    { key: 'pnl', label: 'P&L' },
                    { key: 'exposure', label: 'Exposure' },
                    { key: 'margin', label: 'Margin' }
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={sortBy === key ? 'default' : 'outline'}
                      onClick={() => setSortBy(key as any)}
                      className="flex-1 text-xs"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        {/* User Share Overview Enhanced */}
        <div className="lg:col-span-4 md:col-span-6 col-span-12">
          <LiquidGlassCard variant="trading" className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-white">Your Position Share</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Pool Share</span>
                <span className="text-purple-400 font-bold">{userData.sharePercent.toFixed(3)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your P&L Share</span>
                <span className={`font-bold ${userContribution.shareOfPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {userContribution.shareOfPnL >= 0 ? '+' : ''}${userContribution.shareOfPnL.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Margin Contributed</span>
                <span className="text-white font-mono">${userContribution.contributedMargin.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Funding Share</span>
                <span className="text-green-400 font-mono">+${userContribution.shareOfFunding.toFixed(2)}</span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        {/* System Health Metrics */}
        <div className="lg:col-span-4 md:col-span-12 col-span-12">
          <LiquidGlassCard variant="trading" className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-white">System Health</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Overall Health</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-green-400 font-bold">Excellent</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Margin Utilization</span>
                <span className="text-blue-400 font-mono">{((systemStats.totalMargin / systemStats.totalTVL) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Risk Exposure</span>
                <span className="text-orange-400 font-mono">Medium</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Update</span>
                <span className="text-gray-300 text-sm">2 min ago</span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>
      </RiverBentoGrid>

      {/* Professional Position Display */}
      <LiquidGlassCard variant="trading" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Active Positions</h3>
              <p className="text-sm text-gray-400">Showing {filteredPositions.length} of {systemPositions.length} positions</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:border-blue-400 hover:text-blue-400"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Professional Data Grid */}
        <div className="space-y-4">
          {filteredPositions.map((position, index) => (
            <LiquidGlassCard 
              key={position.id} 
              variant="subtle" 
              className="p-5 hover:shadow-glow-river transition-all duration-300 group border border-slate-700/30 hover:border-blue-400/30"
            >
              {/* Position Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                      position.symbol === 'BTC' ? 'bg-orange-500/20 text-orange-400' :
                      position.symbol === 'ETH' ? 'bg-blue-500/20 text-blue-400' :
                      position.symbol === 'SOL' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {position.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{position.symbol}/USDT</div>
                      <div className="text-sm text-gray-400">Position #{index + 1}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={position.isLong ? "default" : "destructive"} className={`px-3 py-1 ${
                      position.isLong 
                        ? 'bg-green-400/20 text-green-400 border-green-400/30' 
                        : 'bg-red-400/20 text-red-400 border-red-400/30'
                    }`}>
                      {getPositionSideText(position.side)}
                    </Badge>
                    <Badge variant="outline" className={`px-3 py-1 ${
                      position.riskLevel === 'low' ? 'bg-green-400/10 text-green-400 border-green-400/30' :
                      position.riskLevel === 'medium' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' :
                      'bg-red-400/10 text-red-400 border-red-400/30'
                    }`}>
                      {position.riskLevel === 'low' ? 'Low Risk' :
                       position.riskLevel === 'medium' ? 'Medium Risk' : 'High Risk'}
                    </Badge>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-400">Last Updated</div>
                  <div className="text-sm text-gray-300 font-medium">{position.lastUpdated}</div>
                </div>
              </div>

              {/* Position Metrics Grid */}
              {showDetailedView ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                    <div className="text-xs text-gray-400 mb-1">Position Size</div>
                    <div className="text-sm font-mono font-bold text-white">
                      {Math.abs(position.netSize).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${position.notionalValue.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                    <div className="text-xs text-gray-400 mb-1">Entry Price</div>
                    <div className="text-sm font-mono font-bold text-white">
                      {formatCurrency(position.avgPrice)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Mark: {formatCurrency(position.currentPrice)}
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                    <div className="text-xs text-gray-400 mb-1">System Margin</div>
                    <div className="text-sm font-mono font-bold text-white">
                      {formatCurrency(position.totalMargin)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {position.leverage.toFixed(1)}x leverage
                    </div>
                  </div>
                  
                  <div className={`bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 ${
                    position.unrealizedPnL >= 0 ? 'border-green-400/20' : 'border-red-400/20'
                  }`}>
                    <div className="text-xs text-gray-400 mb-1">Unrealized P&L</div>
                    <div className={`text-sm font-mono font-bold flex items-center ${
                      position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {position.unrealizedPnL >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {position.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnL)}
                    </div>
                    <div className={`text-xs ${
                      position.pnlPercentage >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercentage(position.pnlPercentage)}
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                    <div className="text-xs text-gray-400 mb-1">TVL Exposure</div>
                    <div className="text-sm font-mono font-bold text-white">
                      {position.exposurePercent.toFixed(1)}%
                    </div>
                    <div className="mt-1">
                      <Progress 
                        value={position.exposurePercent} 
                        max={25}
                        className={`h-1 ${
                          position.exposureRisk === 'safe' ? '[&>div]:bg-green-500' :
                          position.exposureRisk === 'warning' ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                        }`}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                    <div className="text-xs text-gray-400 mb-1">Your P&L Share</div>
                    <div className={`text-sm font-mono font-bold ${
                      position.userPnLShare >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {position.userPnLShare >= 0 ? '+' : ''}{formatCurrency(position.userPnLShare)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {userData.sharePercent.toFixed(3)}% share
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Size & P&L</div>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-mono">{Math.abs(position.netSize).toLocaleString()}</span>
                      <span className={`font-bold ${position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {position.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnL)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Price & Exposure</div>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-mono">{formatCurrency(position.avgPrice)}</span>
                      <span className="text-blue-400 font-mono">{position.exposurePercent.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Your Share</div>
                    <div className={`text-white font-bold ${position.userPnLShare >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {position.userPnLShare >= 0 ? '+' : ''}{formatCurrency(position.userPnLShare)}
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Warning */}
              {position.exposurePercent > 20 && (
                <div className="mt-4 p-3 bg-orange-900/20 border border-orange-400/30 rounded-lg">
                  <div className="flex items-center text-orange-400">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">
                      High exposure position - System will auto-adjust risk exposure
                    </span>
                  </div>
                </div>
              )}
            </LiquidGlassCard>
          ))}
        </div>
      </LiquidGlassCard>

      {/* Professional Transparency Section */}
      <RiverBentoGrid columns={12} spacing="normal">
        <div className="lg:col-span-6 col-span-12">
          <LiquidGlassCard variant="trading" className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Automated Market Making</h3>
                <p className="text-sm text-gray-400">Transparent AMM mechanism</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></div>
                <span className="text-gray-300">RiverPool uses automated market making (AMM) mechanism</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></div>
                <span className="text-gray-300">System automatically adjusts positions based on market demand</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></div>
                <span className="text-gray-300">Users enjoy passive income without manual management</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></div>
                <span className="text-gray-300">All operations are fully transparent and auditable</span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        <div className="lg:col-span-6 col-span-12">
          <LiquidGlassCard variant="trading" className="p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Risk Management</h3>
                <p className="text-sm text-gray-400">Multi-layer protection system</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0"></div>
                <span className="text-gray-300">Single asset exposure limited to 25% of TVL</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0"></div>
                <span className="text-gray-300">System monitors and auto-adjusts risk exposure</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0"></div>
                <span className="text-gray-300">Insurance pool provides additional protection</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0"></div>
                <span className="text-gray-300">Auto circuit breaker on excessive 24h drawdown</span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>
      </RiverBentoGrid>

      {/* Revenue Sources Explanation */}
      <LiquidGlassCard variant="intense" className="p-6 border border-green-400/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Revenue Sources</h3>
            <p className="text-sm text-gray-400">How your returns are generated</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-4 border border-green-400/20">
          <p className="text-gray-300 leading-relaxed">
            Your returns come from trading fees generated by system market making, funding rate arbitrage, 
            and AMM spread income. As an LP, you share system profits proportional to your rLP holdings 
            while bearing corresponding market risks. The system operates with full transparency, 
            allowing real-time monitoring of all positions and performance metrics.
          </p>
        </div>
      </LiquidGlassCard>
    </div>
  );
};