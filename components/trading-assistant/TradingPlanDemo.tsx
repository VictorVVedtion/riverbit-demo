import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import TradingPlanCard from './TradingPlanCard';
import { TradingPlan, RiskLevel, PlanDirection } from './types';
import { formatNumber } from '../../utils/web3Utils';
import { 
  Sparkles, 
  TrendingUp, 
  BarChart3, 
  Target,
  RefreshCw,
  Plus
} from 'lucide-react';

/**
 * Demo component showcasing TradingPlanCard functionality
 * This demonstrates integration with the RiverBit trading system
 */
const TradingPlanDemo: React.FC = () => {
  const [bookmarkedPlans, setBookmarkedPlans] = useState<Set<string>>(new Set());

  // Sample trading plans data
  const samplePlans: TradingPlan[] = [
    {
      id: '1',
      symbol: 'BTC',
      direction: 'long' as PlanDirection,
      status: 'active',
      entry: 42500,
      stopLoss: 41000,
      takeProfit: 45000,
      confidence: 78,
      riskLevel: 'medium' as RiskLevel,
      riskRewardRatio: 1.67,
      maxLoss: 750,
      potentialGain: 1250,
      reasoning: 'Strong support at $41,000 level with bullish divergence on RSI. Breaking above resistance at $42,000 could trigger momentum towards $45,000.',
      timeFrame: '4h',
      validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'ai',
      tags: ['breakout', 'rsi-divergence'],
      technicalIndicators: [
        { name: 'RSI', value: 65, signal: 'bullish', strength: 75 },
        { name: 'MACD', value: 125, signal: 'bullish', strength: 68 },
        { name: 'Volume', value: 85, signal: 'bullish', strength: 80 }
      ]
    },
    {
      id: '2',
      symbol: 'ETH',
      direction: 'short' as PlanDirection,
      status: 'active',
      entry: 2650,
      stopLoss: 2750,
      takeProfit: 2450,
      confidence: 65,
      riskLevel: 'high' as RiskLevel,
      riskRewardRatio: 2.0,
      maxLoss: 500,
      potentialGain: 1000,
      reasoning: 'Failed to break resistance at $2,700. Bearish divergence forming with declining volume. Target support at $2,450.',
      timeFrame: '1h',
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      updatedAt: new Date(),
      createdBy: 'ai',
      tags: ['resistance-rejection', 'bearish-divergence'],
      technicalIndicators: [
        { name: 'RSI', value: 35, signal: 'bearish', strength: 70 },
        { name: 'Volume', value: 45, signal: 'bearish', strength: 60 }
      ]
    },
    {
      id: '3',
      symbol: 'xAAPL',
      direction: 'long' as PlanDirection,
      status: 'executed',
      entry: 185.50,
      stopLoss: 182.00,
      takeProfit: 192.00,
      confidence: 82,
      riskLevel: 'low' as RiskLevel,
      riskRewardRatio: 1.86,
      maxLoss: 350,
      potentialGain: 650,
      reasoning: 'Strong earnings beat with positive guidance. Technical breakout above $185 confirms bullish momentum.',
      timeFrame: '1d',
      validUntil: new Date(Date.now() + 168 * 60 * 60 * 1000), // 1 week from now
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      updatedAt: new Date(),
      createdBy: 'ai',
      tags: ['earnings-beat', 'breakout']
    },
    {
      id: '4',
      symbol: 'SOL',
      direction: 'long' as PlanDirection,
      status: 'pending',
      entry: 95.00,
      stopLoss: 88.00,
      takeProfit: 110.00,
      confidence: 72,
      riskLevel: 'extreme' as RiskLevel,
      riskRewardRatio: 2.14,
      maxLoss: 700,
      potentialGain: 1500,
      reasoning: 'High-risk play on SOL ecosystem growth. Strong fundamentals but volatile price action. Wait for confirmation above $95.',
      timeFrame: '4h',
      validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now (expiring soon)
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      updatedAt: new Date(),
      createdBy: 'ai',
      tags: ['ecosystem-growth', 'high-volatility']
    }
  ];

  // Filter plans by status
  const activePlans = samplePlans.filter(plan => plan.status === 'active');
  const executedPlans = samplePlans.filter(plan => plan.status === 'executed');
  const allPlans = samplePlans;

  // Handler functions
  const handleExecute = async (plan: TradingPlan) => {
    console.log('Executing plan:', plan.id);
    // Here you would integrate with your Web3 execution logic
    alert(`Executing ${plan.direction} trade for ${plan.symbol} at $${plan.entry}`);
  };

  const handleBookmark = (planId: string) => {
    setBookmarkedPlans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  const handleShare = (plan: TradingPlan) => {
    const shareText = `🚀 Trading Plan: ${plan.direction.toUpperCase()} ${plan.symbol} @ $${plan.entry}\n📊 R:R 1:${plan.riskRewardRatio.toFixed(1)} | ⭐ ${plan.confidence}% confidence\n\n${plan.reasoning}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Trading Plan: ${plan.symbol}`,
        text: shareText
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Plan copied to clipboard!');
    }
  };

  const handleModify = (plan: TradingPlan) => {
    console.log('Modifying plan:', plan.id);
    // Here you would open a modification dialog
    alert(`Modify plan functionality would open here for ${plan.symbol}`);
  };

  const handleDelete = (planId: string) => {
    console.log('Deleting plan:', planId);
    // Here you would handle plan deletion
    alert(`Delete confirmation would appear here for plan ${planId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          RiverBit Trading Assistant
        </h1>
        <p className="text-muted-foreground">
          AI-powered trading plans with professional risk management
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Plans</p>
                <p className="text-2xl font-bold text-primary">{activePlans.length}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Confidence</p>
                <p className="text-2xl font-bold text-green-400">
                  {(activePlans.reduce((sum, plan) => sum + plan.confidence, 0) / activePlans.length || 0).toFixed(0)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. R:R</p>
                <p className="text-2xl font-bold text-river-accent">
                  1:{(activePlans.reduce((sum, plan) => sum + plan.riskRewardRatio, 0) / activePlans.length || 0).toFixed(1)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-river-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-foreground">
                  ${formatNumber(activePlans.reduce((sum, plan) => sum + plan.potentialGain, 0))}
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <Button className="btn-modern btn-premium">
          <Plus className="h-4 w-4 mr-2" />
          Generate New Plan
        </Button>
        <Button variant="outline" className="btn-modern">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Trading Plans Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="active">Active Plans ({activePlans.length})</TabsTrigger>
          <TabsTrigger value="executed">Executed ({executedPlans.length})</TabsTrigger>
          <TabsTrigger value="all">All Plans ({allPlans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activePlans.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {activePlans.map((plan) => (
                <TradingPlanCard
                  key={plan.id}
                  plan={plan}
                  isBookmarked={bookmarkedPlans.has(plan.id)}
                  onExecute={handleExecute}
                  onBookmark={handleBookmark}
                  onShare={handleShare}
                  onModify={handleModify}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Active Plans</h3>
                <p className="text-muted-foreground mb-4">
                  Generate your first AI-powered trading plan to get started.
                </p>
                <Button className="btn-modern btn-premium">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="executed" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {executedPlans.map((plan) => (
              <TradingPlanCard
                key={plan.id}
                plan={plan}
                isBookmarked={bookmarkedPlans.has(plan.id)}
                onBookmark={handleBookmark}
                onShare={handleShare}
                showActions={false}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {allPlans.map((plan) => (
              <TradingPlanCard
                key={plan.id}
                plan={plan}
                isBookmarked={bookmarkedPlans.has(plan.id)}
                onExecute={plan.status === 'active' ? handleExecute : undefined}
                onBookmark={handleBookmark}
                onShare={handleShare}
                onModify={plan.status === 'active' ? handleModify : undefined}
                onDelete={handleDelete}
                showActions={plan.status === 'active'}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradingPlanDemo;