import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Activity, TrendingUp, MessageSquare, Target, Wallet } from 'lucide-react';

// Import the trading assistant components
import TradingAssistantChat from './TradingAssistantChat';
import TradingPlanCard from './TradingPlanCard';
import { TradingPlan } from './types';

/**
 * Example integration showing how to use the Trading Assistant components
 * in a real RiverBit page with proper styling and functionality
 */
const TradingAssistantIntegrationExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'plans' | 'analysis'>('chat');
  const [isConnected, setIsConnected] = useState(true);
  const [userAddress] = useState('0x742d35Cc6633C0532925a3b8D4e28dcf7b3A6b7C');
  const [accountBalance] = useState(5000);

  // Example trading plan data
  const examplePlan: TradingPlan = {
    id: 'plan_example_1',
    symbol: 'BTC',
    direction: 'long',
    status: 'active',
    entry: 45000,
    stopLoss: 43500,
    takeProfit: 48000,
    confidence: 85,
    riskLevel: 'medium',
    riskRewardRatio: 1.8,
    maxLoss: 1500,
    potentialGain: 3000,
    reasoning: 'Strong technical breakout above $44,000 resistance with high volume confirmation. RSI shows bullish momentum while maintaining healthy levels.',
    timeFrame: '4h',
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'ai',
    tags: ['breakout', 'momentum', 'high-volume'],
    technicalIndicators: [
      { name: 'RSI', value: 68, signal: 'bullish', strength: 75 },
      { name: 'MACD', value: 1.2, signal: 'bullish', strength: 80 },
      { name: 'Volume', value: 150, signal: 'bullish', strength: 90 }
    ]
  };

  const handlePlanExecution = async (plan: TradingPlan) => {
    console.log('Executing plan:', plan);
    // Integration with RiverBit trading system would go here
    // This would call the web3Manager or trading interface
    alert(`Trading plan executed: ${plan.direction.toUpperCase()} ${plan.symbol} at $${plan.entry}`);
  };

  const handlePlanBookmark = (planId: string) => {
    console.log('Bookmarking plan:', planId);
    // Save to user's bookmarked plans
  };

  const handlePlanShare = (plan: TradingPlan) => {
    console.log('Sharing plan:', plan);
    // Share functionality (copy link, social media, etc.)
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              RiverBit Trading Assistant
            </h1>
            <p className="text-muted-foreground mt-2">
              AI-powered trading insights and automated plan generation
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2">
              <Activity className="h-4 w-4" />
              Live Market Data
            </Badge>
            <Badge variant="outline" className="gap-2">
              <Wallet className="h-4 w-4" />
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant="default">
              Live Demo
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 glass-nav rounded-lg">
          {[
            { id: 'chat', label: 'AI Chat', icon: MessageSquare },
            { id: 'plans', label: 'Trading Plans', icon: Target },
            { id: 'analysis', label: 'Market Analysis', icon: TrendingUp }
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? 'default' : 'ghost'}
              className={`flex-1 gap-2 ${activeTab === id ? 'btn-modern' : ''}`}
              onClick={() => setActiveTab(id as any)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {activeTab === 'chat' && (
              <div className="h-[700px]">
                <TradingAssistantChat
                  userAddress={userAddress}
                  isConnected={isConnected}
                  accountBalance={accountBalance}
                  onPlanExecute={handlePlanExecution}
                  onPlanBookmark={handlePlanBookmark}
                  onPlanShare={handlePlanShare}
                  className="h-full"
                />
              </div>
            )}

            {activeTab === 'plans' && (
              <div className="space-y-4">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      AI-Generated Trading Plans
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TradingPlanCard
                      plan={examplePlan}
                      onExecute={handlePlanExecution}
                      onBookmark={handlePlanBookmark}
                      onShare={handlePlanShare}
                      showActions={true}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'analysis' && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Market Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Advanced Market Analysis</h3>
                    <p className="text-muted-foreground">
                      Real-time market insights, technical indicators, and AI-powered analysis
                      would be displayed here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            
            {/* Account Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <span className="font-semibold">${accountBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <span className="text-xs font-mono">
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Network</span>
                  <Badge variant="outline">Arbitrum</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full btn-modern" variant="outline">
                  Analyze BTC
                </Button>
                <Button className="w-full btn-modern" variant="outline">
                  Generate ETH Plan
                </Button>
                <Button className="w-full btn-modern" variant="outline">
                  Portfolio Review
                </Button>
                <Button className="w-full btn-modern" variant="outline">
                  Risk Assessment
                </Button>
              </CardContent>
            </Card>

            {/* Market Status */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Market Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Connection</span>
                    <Badge variant="default" className="status-online">
                      Live
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Data Feed</span>
                    <Badge variant="outline">
                      Real-time
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">AI Engine</span>
                    <Badge variant="default">
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>BTC analysis completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Trading plan generated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Risk alert triggered</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Integration Notes */}
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            <strong>🎉 Integration Complete!</strong> The TradingAssistantChat component is now fully integrated 
            with RiverBit's design system. Features include: glass morphism styling, responsive design, 
            real-time chat capabilities, AI-powered trading plan generation, speech-to-text input, 
            message history, plan bookmarking, and seamless Web3 integration.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

// Example of integrating with existing TradingInterface component
export const TradingInterfaceWithAssistant: React.FC = () => {
  // Sample AI-generated trading plan
  const aiGeneratedPlan: TradingPlan = {
    id: 'ai-btc-001',
    symbol: 'BTC',
    direction: 'long',
    status: 'active',
    entry: 43200,
    stopLoss: 41800,
    takeProfit: 46000,
    confidence: 85,
    riskLevel: 'medium',
    riskRewardRatio: 2.0,
    maxLoss: 700,
    potentialGain: 1400,
    reasoning: 'BTC has formed a bullish flag pattern after breaking above $42,000. Strong buying volume confirms momentum. RSI shows healthy pullback without oversold conditions.',
    timeFrame: '4h',
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'ai',
    tags: ['bullish-flag', 'volume-confirmation'],
    technicalIndicators: [
      { name: 'RSI', value: 58, signal: 'bullish', strength: 75 },
      { name: 'MACD', value: 245, signal: 'bullish', strength: 80 },
      { name: 'Volume', value: 92, signal: 'bullish', strength: 85 }
    ]
  };

  // Integration with existing Web3 manager
  const handleExecutePlan = async (plan: TradingPlan) => {
    try {
      // Import your existing web3Manager
      const { web3Manager } = await import('../../utils/web3Utils');
      
      // Calculate position size based on plan
      const positionSize = plan.maxLoss; // or calculate based on user's risk preference
      const leverage = 10; // or calculate based on plan.riskRewardRatio
      
      // Execute the trade using existing RiverBit infrastructure
      const finalSize = plan.direction === 'long' ? positionSize : -positionSize;
      const tx = await web3Manager.openPosition(plan.symbol, finalSize, leverage);
      
      console.log('Trade executed:', tx.hash);
      
      // Update plan status or trigger notification
      // updatePlanStatus(plan.id, 'executed');
      
    } catch (error) {
      console.error('Failed to execute AI trading plan:', error);
      // Handle error appropriately
    }
  };

  const handleSharePlan = (plan: TradingPlan) => {
    const shareText = `🤖 AI Trading Signal\n📈 ${plan.direction.toUpperCase()} ${plan.symbol}\n💰 Entry: $${plan.entry}\n🎯 Target: $${plan.takeProfit}\n🛡️ Stop: $${plan.stopLoss}\n📊 R:R 1:${plan.riskRewardRatio}\n⭐ Confidence: ${plan.confidence}%\n\n${plan.reasoning}`;
    
    if (navigator.share) {
      navigator.share({
        title: `AI Trading Plan: ${plan.symbol}`,
        text: shareText,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(shareText);
      // Show toast notification: "Plan copied to clipboard!"
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Trading Assistant Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            AI Trading Assistant
          </h3>
          <span className="text-xs text-muted-foreground">
            Powered by RiverBit AI
          </span>
        </div>
        
        {/* Trading Plan Card */}
        <TradingPlanCard
          plan={aiGeneratedPlan}
          onExecute={handleExecutePlan}
          onShare={handleSharePlan}
          onBookmark={(planId) => {
            // Integrate with your bookmark system
            console.log('Bookmarking plan:', planId);
          }}
          onModify={(plan) => {
            // Open modification dialog or redirect to edit page
            console.log('Modifying plan:', plan.id);
          }}
          className="max-w-md" // Constrain width if needed
        />
      </div>

      {/* Rest of your existing trading interface */}
      {/* ... existing components ... */}
    </div>
  );
};

// Example of compact mode for sidebar
export const TradingAssistantSidebar: React.FC = () => {
  const quickPlan: TradingPlan = {
    id: 'quick-001',
    symbol: 'SOL',
    direction: 'long',
    status: 'active',
    entry: 95,
    stopLoss: 88,
    takeProfit: 110,
    confidence: 78,
    riskLevel: 'medium',
    riskRewardRatio: 2.14,
    maxLoss: 350,
    potentialGain: 750,
    reasoning: 'SOL ecosystem expansion with strong fundamentals',
    timeFrame: '4h',
    validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'ai'
  };

  return (
    <div className="w-80 p-4 space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground">
        Latest AI Signal
      </h3>
      
      <TradingPlanCard
        plan={quickPlan}
        compact={true}
        showActions={true}
        onExecute={async (plan) => {
          // Quick execute
          console.log('Quick execute:', plan.symbol);
        }}
      />
    </div>
  );
};

export default TradingAssistantIntegrationExample;