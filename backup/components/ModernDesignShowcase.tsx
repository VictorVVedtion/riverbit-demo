import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import LiquidGlassCard from './ui/LiquidGlassCard';
import { BentoGrid, BentoCard } from './ui/BentoGrid';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, 
  BarChart3, Wallet, Target, Shield, Zap, Star,
  ArrowUpRight, Users, Globe, Layers
} from 'lucide-react';

const ModernDesignShowcase: React.FC = () => {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const tradingMetrics = [
    { label: 'Total Volume', value: '$2.4B', change: '+12.5%', trend: 'up', icon: BarChart3 },
    { label: 'Active Traders', value: '24.8K', change: '+8.2%', trend: 'up', icon: Users },
    { label: 'Total TVL', value: '$456M', change: '-2.1%', trend: 'down', icon: Wallet },
    { label: 'Avg. Leverage', value: '12.4x', change: '+1.8%', trend: 'up', icon: Target }
  ];

  const portfolioItems = [
    { asset: 'BTC/USDT', position: '$45,230', pnl: '+$2,340', pnlPercent: '+5.45%', isPositive: true },
    { asset: 'ETH/USDT', position: '$23,120', pnl: '-$890', pnlPercent: '-3.71%', isPositive: false },
    { asset: 'SOL/USDT', position: '$12,450', pnl: '+$1,230', pnlPercent: '+10.98%', isPositive: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-0 via-surface-1 to-surface-0 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header with Liquid Glass */}
        <LiquidGlassCard 
          variant="intense" 
          withReflection 
          className="p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-4xl font-bold text-gradient-river mb-2">
                RiverBit DEX
              </h1>
              <p className="text-lg text-muted-foreground">
                Modern Liquid Glass & Bento Grid Design System
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-profit/20 text-profit border-profit/30">
                <div className="w-2 h-2 bg-profit rounded-full animate-pulse mr-2" />
                Live
              </Badge>
              <Button variant="outline" className="liquid-glass-interactive">
                <Zap className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            </div>
          </div>
        </LiquidGlassCard>

        {/* Trading Metrics Bento Grid */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-primary flex items-center">
            <BarChart3 className="w-6 h-6 mr-3" />
            Trading Metrics
          </h2>
          
          <BentoGrid>
            {tradingMetrics.map((metric, index) => (
              <BentoCard
                key={metric.label}
                size="small"
                variant="primary"
                withGlow
                className="cursor-pointer"
                onClick={() => setActiveCard(activeCard === metric.label ? null : metric.label)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-river-blue/20 rounded-lg p-2">
                    <metric.icon className="w-5 h-5 text-river-blue" />
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      metric.trend === 'up' 
                        ? 'text-profit border-profit/30 bg-profit/10' 
                        : 'text-danger border-danger/30 bg-danger/10'
                    }`}
                  >
                    {metric.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {metric.change}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                  <p className="text-3xl font-bold text-primary mb-2">{metric.value}</p>
                  
                  {activeCard === metric.label && (
                    <div className="mt-4 pt-4 border-t border-border/30 space-y-2 animate-in fade-in-50 slide-in-from-bottom-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">24h High:</span>
                        <span className="text-primary font-medium">+18.2%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">24h Low:</span>
                        <span className="text-primary font-medium">-2.1%</span>
                      </div>
                    </div>
                  )}
                </div>
              </BentoCard>
            ))}
            
            {/* Large Chart Card */}
            <BentoCard size="large" variant="default" className="bg-gradient-to-br from-surface-2/80 to-surface-3/60">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-primary">Volume Chart</h3>
                  <Button size="sm" variant="ghost" className="text-xs">
                    <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="flex-1 bg-surface-1/50 rounded-lg p-4 relative overflow-hidden">
                  {/* Simulated Chart */}
                  <div className="absolute inset-0 bg-gradient-to-r from-river-blue/20 via-transparent to-profit/20 animate-pulse" />
                  <div className="relative z-10 h-full flex items-end justify-around space-x-1">
                    {[40, 65, 30, 80, 55, 90, 45, 75, 35, 60, 85, 50].map((height, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-river-blue to-river-blue/60 rounded-t transition-all duration-500 hover:from-profit hover:to-profit/60"
                        style={{ height: `${height}%`, width: '8px' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </BentoCard>
          </BentoGrid>
        </div>

        {/* Portfolio Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-primary flex items-center">
            <Wallet className="w-6 h-6 mr-3" />
            Portfolio Overview
          </h2>
          
          <BentoGrid variant="dense">
            {/* Portfolio Summary */}
            <BentoCard size="medium" variant="success" withGlow>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">Total Portfolio</h3>
                  <Star className="w-5 h-5 text-yellow-400" />
                </div>
                
                <div className="space-y-3">
                  <div className="bg-surface-1/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold text-primary">$80,800</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-profit/10 rounded-lg p-3 border border-profit/20">
                      <p className="text-xs text-muted-foreground">Total PnL</p>
                      <p className="text-lg font-bold text-profit">+$2,680</p>
                    </div>
                    <div className="bg-river-blue/10 rounded-lg p-3 border border-river-blue/20">
                      <p className="text-xs text-muted-foreground">24h Change</p>
                      <p className="text-lg font-bold text-river-blue">+3.42%</p>
                    </div>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Individual Positions */}
            {portfolioItems.map((item, index) => (
              <BentoCard
                key={item.asset}
                size="small"
                variant={item.isPositive ? 'success' : 'danger'}
                interactive
                className="group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-primary">{item.asset}</h4>
                    <div className={`w-2 h-2 rounded-full ${item.isPositive ? 'bg-profit' : 'bg-danger'} animate-pulse`} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Position</span>
                      <span className="text-sm font-medium text-primary">{item.position}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">PnL</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${item.isPositive ? 'text-profit' : 'text-danger'}`}>
                          {item.pnl}
                        </span>
                        <span className={`text-xs ml-1 ${item.isPositive ? 'text-profit' : 'text-danger'}`}>
                          {item.pnlPercent}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full group-hover:bg-river-blue/20 group-hover:border-river-blue/40 transition-all"
                  >
                    <Activity className="w-3 h-3 mr-2" />
                    Manage
                  </Button>
                </div>
              </BentoCard>
            ))}

            {/* Action Cards */}
            <BentoCard size="small" variant="primary" interactive className="group">
              <div className="h-full flex flex-col items-center justify-center space-y-3 text-center">
                <div className="bg-river-blue/20 rounded-full p-4 group-hover:scale-110 transition-transform">
                  <Globe className="w-8 h-8 text-river-blue" />
                </div>
                <div>
                  <h4 className="font-semibold text-primary">Explore Markets</h4>
                  <p className="text-sm text-muted-foreground">Discover new trading pairs</p>
                </div>
              </div>
            </BentoCard>

            <BentoCard size="small" variant="warning" interactive className="group">
              <div className="h-full flex flex-col items-center justify-center space-y-3 text-center">
                <div className="bg-warning/20 rounded-full p-4 group-hover:scale-110 transition-transform">
                  <Layers className="w-8 h-8 text-warning" />
                </div>
                <div>
                  <h4 className="font-semibold text-primary">Advanced Tools</h4>
                  <p className="text-sm text-muted-foreground">Professional trading suite</p>
                </div>
              </div>
            </BentoCard>
          </BentoGrid>
        </div>

        {/* Interactive Demo Section */}
        <LiquidGlassCard variant="performance" withRipple withGradient className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-gradient-river">Interactive Elements Demo</h3>
            <p className="text-muted-foreground">Click and interact with these elements to see the liquid glass effects</p>
            
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <Button className="liquid-ripple performance-hover bg-gradient-to-r from-river-blue to-river-blue-dark">
                <Zap className="w-4 h-4 mr-2" />
                Ripple Effect
              </Button>
              
              <Button variant="outline" className="liquid-glass-interactive border-profit/30 text-profit hover:bg-profit/10">
                <TrendingUp className="w-4 h-4 mr-2" />
                Glass Hover
              </Button>
              
              <Button variant="outline" className="performance-ripple border-river-blue/30 text-river-blue">
                <Target className="w-4 h-4 mr-2" />
                Performance Optimized
              </Button>
            </div>
          </div>
        </LiquidGlassCard>

      </div>
    </div>
  );
};

export default ModernDesignShowcase;