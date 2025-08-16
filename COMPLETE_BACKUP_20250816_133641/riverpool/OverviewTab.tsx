import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Wallet, TrendingUp, DollarSign, Target, Activity } from 'lucide-react';
import LiquidGlassCard from '../ui/LiquidGlassCard';
import RiverBentoGrid from '../ui/RiverBentoGrid';
import { poolData, userData } from '../../data/riverPoolData';

export const OverviewTab: React.FC = () => {
  // Calculate enhanced metrics
  const portfolioValue = userData.rLPHolding * poolData.rLPPrice;
  const todayGain = userData.todayEarnings;
  const todayGainPercent = portfolioValue > 0 ? (todayGain / portfolioValue) * 100 : 0;
  const unrealizedPnL = 425.82;
  const roi = 4.07;

  return (
    <div className="space-y-6">
      {/* River Portfolio Header - Enhanced Professional Design */}
      <LiquidGlassCard 
        variant="intense" 
        className="p-6 border border-river-surface/30 bg-gradient-to-r from-river-depth/80 to-river-flow/20 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-r from-river-surface to-river-glow rounded-xl flex items-center justify-center shadow-lg shadow-river-surface/30">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Portfolio Holdings</h2>
              <p className="text-river-surface/80 text-sm font-medium">智能做市收益概覽 • Intelligent Market Making</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-white tracking-wider">
              ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-lg font-semibold mt-1 flex items-center justify-end gap-2 ${
              todayGainPercent >= 0 ? 'text-river-profit' : 'text-river-loss'
            }`}>
              <TrendingUp className={`w-5 h-5 ${todayGainPercent < 0 ? 'rotate-180' : ''}`} />
              {todayGainPercent >= 0 ? '+' : ''}{todayGainPercent.toFixed(2)}% (24h)
            </div>
          </div>
        </div>
        
        {/* Professional Quick Stats - River Themed */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-river-surface/10 rounded-xl border border-river-surface/20 hover:bg-river-surface/15 transition-all duration-300">
            <div className="text-sm text-river-surface/70 mb-2 font-medium">Pool Share</div>
            <div className="text-xl font-bold text-white">{userData.sharePercent.toFixed(3)}%</div>
            <div className="text-xs text-gray-400 mt-1">Your ownership</div>
          </div>
          <div className="text-center p-4 bg-river-glow/10 rounded-xl border border-river-glow/20 hover:bg-river-glow/15 transition-all duration-300">
            <div className="text-sm text-river-glow/70 mb-2 font-medium">rLP Price</div>
            <div className="text-xl font-bold text-white">${poolData.rLPPrice.toFixed(4)}</div>
            <div className="text-xs text-gray-400 mt-1">Current rate</div>
          </div>
          <div className="text-center p-4 bg-river-profit/10 rounded-xl border border-river-profit/20 hover:bg-river-profit/15 transition-all duration-300">
            <div className="text-sm text-river-profit/70 mb-2 font-medium">Projected APY</div>
            <div className="text-xl font-bold text-river-profit">+{(todayGainPercent * 365).toFixed(1)}%</div>
            <div className="text-xs text-gray-400 mt-1">Annualized</div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Professional Metrics Grid with River Bento System - Mobile Optimized */}
      <RiverBentoGrid columns={12} spacing="normal" className="mobile-optimized-container">
        {/* rLP Holdings - River Design */}
        <div className="lg:col-span-3 md:col-span-6 col-span-12">
          <LiquidGlassCard 
            variant="trading" 
            className="p-6 hover:shadow-lg hover:shadow-river-surface/20 transition-all duration-300 group h-full border border-river-surface/20"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-river-surface to-river-glow rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-river-surface/25">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-river-surface font-semibold">rLP Holdings</div>
                  <div className="text-xs text-gray-400">Liquidity Provider Tokens</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-3xl font-bold text-white number-animate tracking-tight">
                {userData.rLPHolding.toLocaleString()}
              </div>
              <div className="text-sm text-gray-300">
                Current Price: <span className="font-mono text-river-glow font-semibold">${poolData.rLPPrice.toFixed(4)}</span>
              </div>
              <div className="text-xs text-gray-400">
                Total Supply: {(poolData.totalSupply || 1000000).toLocaleString()} rLP
              </div>
            </div>
            
            {/* River-themed progress bar for pool share */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span className="font-medium">Pool Share</span>
                <span className="text-river-surface font-semibold">{userData.sharePercent.toFixed(3)}%</span>
              </div>
              <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-river-surface to-river-glow h-2 rounded-full transition-all duration-500 shadow-glow"
                  style={{ width: `${Math.min(userData.sharePercent * 4, 100)}%` }}
                ></div>
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Portfolio Value - River Design */}
        <div className="lg:col-span-3 md:col-span-6 col-span-12">
          <LiquidGlassCard 
            variant="trading" 
            className="p-6 hover:shadow-lg hover:shadow-river-glow/20 transition-all duration-300 group h-full border border-river-glow/20"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-river-glow to-river-flow rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-river-glow/25">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-river-glow font-semibold">Portfolio Value</div>
                  <div className="text-xs text-gray-400">Total Holdings Worth</div>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-300 ${
                todayGainPercent >= 0 
                  ? 'bg-river-profit/20 text-river-profit border-river-profit/30 shadow-lg shadow-river-profit/10' 
                  : 'bg-river-loss/20 text-river-loss border-river-loss/30 shadow-lg shadow-river-loss/10'
              }`}>
                24h {todayGainPercent >= 0 ? '+' : ''}{todayGainPercent.toFixed(2)}%
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-3xl font-bold text-white number-animate tracking-tight">
                ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-300">
                Pool Share: <span className="font-mono text-river-glow font-semibold">{userData.sharePercent.toFixed(3)}%</span>
              </div>
              <div className="text-xs text-gray-400">
                {userData.rLPHolding.toLocaleString()} rLP × ${poolData.rLPPrice.toFixed(4)}
              </div>
            </div>
            
            {/* River-themed value trend indicator */}
            <div className="mt-4 flex items-center gap-2">
              {todayGainPercent >= 0 ? (
                <TrendingUp className="w-5 h-5 text-river-profit" />
              ) : (
                <TrendingUp className="w-5 h-5 text-river-loss rotate-180" />
              )}
              <span className={`text-sm font-semibold ${
                todayGainPercent >= 0 ? 'text-river-profit' : 'text-river-loss'
              }`}>
                {todayGainPercent >= 0 ? '+' : ''}${todayGain.toFixed(2)} Today
              </span>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Cumulative Earnings - River Design */}
        <div className="lg:col-span-3 md:col-span-6 col-span-12">
          <LiquidGlassCard 
            variant="trading" 
            className="p-6 hover:shadow-lg hover:shadow-river-profit/20 transition-all duration-300 group h-full border border-river-profit/20"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-river-profit to-river-glow rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-river-profit/25">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-river-profit font-semibold">Total Earnings</div>
                  <div className="text-xs text-gray-400">Cumulative Realized</div>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-river-profit/20 text-river-profit border border-river-profit/30 shadow-lg shadow-river-profit/10">
                All Time
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-3xl font-bold text-river-profit number-animate tracking-tight">
                +${userData.totalEarnings.toFixed(2)}
              </div>
              <div className="text-sm text-river-profit/80">
                Today: <span className="font-mono font-semibold">+${userData.todayEarnings.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-400">
                Daily AVG: +${(userData.totalEarnings / 30).toFixed(2)}
              </div>
            </div>
            
            {/* River-themed earnings breakdown */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs bg-river-profit/5 p-2 rounded-lg">
                <span className="text-gray-400 font-medium">Trading Fees</span>
                <span className="text-river-profit font-mono font-semibold">+${(userData.totalEarnings * 0.7).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs bg-river-profit/5 p-2 rounded-lg">
                <span className="text-gray-400 font-medium">Funding Fees</span>
                <span className="text-river-profit font-mono font-semibold">+${(userData.totalEarnings * 0.3).toFixed(2)}</span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Unrealized PnL - River Design */}
        <div className="lg:col-span-3 md:col-span-6 col-span-12">
          <LiquidGlassCard 
            variant="trading" 
            className="p-6 hover:shadow-lg hover:shadow-river-warning/20 transition-all duration-300 group h-full border border-river-warning/20"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-river-warning to-river-flow rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-river-warning/25">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-river-warning font-semibold">Unrealized P&L</div>
                  <div className="text-xs text-gray-400">Current Positions</div>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-300 shadow-lg ${
                roi >= 0 
                  ? 'bg-river-profit/20 text-river-profit border-river-profit/30 shadow-river-profit/10' 
                  : 'bg-river-loss/20 text-river-loss border-river-loss/30 shadow-river-loss/10'
              }`}>
                ROI {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
              </div>
            </div>
            
            <div className="space-y-3">
              <div className={`text-3xl font-bold number-animate tracking-tight ${
                unrealizedPnL >= 0 ? 'text-river-profit' : 'text-river-loss'
              }`}>
                {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL}
              </div>
              <div className={`text-sm ${unrealizedPnL >= 0 ? 'text-river-profit/80' : 'text-river-loss/80'}`}>
                ROI: <span className="font-mono font-semibold">{roi >= 0 ? '+' : ''}{roi.toFixed(2)}%</span>
              </div>
              <div className="text-xs text-gray-400">
                Since inception: {Math.ceil(Math.random() * 90 + 30)} days
              </div>
            </div>
            
            {/* River-themed performance metrics */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs bg-river-profit/5 p-2 rounded-lg">
                <span className="text-gray-400 font-medium">Best Day</span>
                <span className="text-river-profit font-mono font-semibold">+${(unrealizedPnL * 0.15).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs bg-river-loss/5 p-2 rounded-lg">
                <span className="text-gray-400 font-medium">Worst Day</span>
                <span className="text-river-loss font-mono font-semibold">-${(unrealizedPnL * 0.08).toFixed(2)}</span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>
      </RiverBentoGrid>
    </div>
  );
};