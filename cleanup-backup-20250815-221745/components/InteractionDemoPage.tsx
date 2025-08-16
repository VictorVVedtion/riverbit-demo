import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { EnhancedButton } from './ui/enhanced-button';
import { Skeleton, TradingSkeleton, Loading } from './ui/enhanced-skeleton';
import { FeedbackProvider, useFeedback, useTradingFeedback } from './InstantFeedbackSystem';
import GestureEnhancedTradingInterface from './GestureEnhancedTradingInterface';
import EnhancedRealTimeDisplay from './EnhancedRealTimeDisplay';
import EnhancedTradingForm from './EnhancedTradingForm';
import { InteractionSystemDemo } from './interaction/InteractionSystemDemo';
import { 
  Sparkles, 
  Zap, 
  Target, 
  Activity,
  Smartphone,
  Monitor,
  Palette,
  Settings,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Heart,
  Star,
  Rocket
} from 'lucide-react';
import '../styles/animations.css';

// Mock data for demonstrations
const mockPositions = [
  {
    id: '1',
    symbol: 'BTC/USDT',
    side: 'long' as const,
    size: 0.5,
    entryPrice: 44500,
    markPrice: 45000,
    pnl: 250,
    pnlPercent: 1.12,
    leverage: 10,
  },
  {
    id: '2',
    symbol: 'ETH/USDT',
    side: 'short' as const,
    size: -2.5,
    entryPrice: 2800,
    markPrice: 2750,
    pnl: 125,
    pnlPercent: 1.79,
    leverage: 5,
  },
];

const mockAccountData = {
  balance: 10000,
  equity: 10375,
  marginUsed: 2500,
};

// Demo Control Panel
const DemoControls: React.FC<{
  onAction: (action: string) => void;
  isPlaying: boolean;
}> = ({ onAction, isPlaying }) => {
  const feedback = useFeedback();
  const tradingFeedback = useTradingFeedback();

  const demoActions = [
    {
      id: 'success',
      label: 'Success Feedback',
      icon: CheckCircle,
      color: 'text-profit',
      action: () => feedback.showSuccess('Order Executed', 'Your buy order has been filled successfully'),
    },
    {
      id: 'error',
      label: 'Error Feedback',
      icon: XCircle,
      color: 'text-danger',
      action: () => feedback.showError('Order Failed', 'Insufficient balance to place this order'),
    },
    {
      id: 'warning',
      label: 'Warning Feedback',
      icon: AlertTriangle,
      color: 'text-warning',
      action: () => feedback.showWarning('High Risk', 'This leverage setting may result in liquidation'),
    },
    {
      id: 'info',
      label: 'Info Feedback',
      icon: Info,
      color: 'text-river-blue',
      action: () => feedback.showInfo('Market Update', 'New trading pair BTC/USDT is now available'),
    },
    {
      id: 'trade',
      label: 'Trade Confirmation',
      icon: TrendingUp,
      color: 'text-profit',
      action: () => tradingFeedback.orderFilled('buy', 1000, 45000),
    },
    {
      id: 'loading',
      label: 'Loading State',
      icon: Activity,
      color: 'text-river-blue',
      action: () => {
        const id = feedback.showLoading('Processing', 'Placing your order...');
        setTimeout(() => {
          feedback.hideFeedback(id);
          tradingFeedback.orderFilled('sell', 500, 44800);
        }, 3000);
      },
    },
  ];

  return (
    <Card className="bg-gradient-to-br from-surface-1 to-surface-2 border-default/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-river-blue" />
          Interaction Demo Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <EnhancedButton
            size="sm"
            variant={isPlaying ? 'danger' : 'buy'}
            onClick={() => onAction(isPlaying ? 'pause' : 'play')}
            haptic={true}
            ripple={true}
          >
            {isPlaying ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
            {isPlaying ? 'Pause' : 'Play'} Demo
          </EnhancedButton>
          
          <EnhancedButton
            size="sm"
            variant="outline"
            onClick={() => onAction('reset')}
            haptic={true}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </EnhancedButton>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {demoActions.map((action) => (
            <EnhancedButton
              key={action.id}
              size="sm"
              variant="outline"
              onClick={action.action}
              className="justify-start h-12 text-left"
              haptic={true}
              ripple={true}
            >
              <action.icon className={`h-4 w-4 mr-2 ${action.color}`} />
              <span className="text-xs">{action.label}</span>
            </EnhancedButton>
          ))}
        </div>

        <div className="pt-4 border-t border-default/20">
          <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Interactive Features
          </h4>
          
          <div className="space-y-2 text-xs text-secondary">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Haptic</Badge>
              <span>Vibration feedback on mobile devices</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Ripple</Badge>
              <span>Material Design ripple effects</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Gestures</Badge>
              <span>Swipe navigation and touch interactions</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Real-time</Badge>
              <span>Live price updates with smooth animations</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Smart Forms</Badge>
              <span>Progressive validation and smart suggestions</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Animation Showcase
const AnimationShowcase: React.FC = () => {
  const [animationType, setAnimationType] = useState<string>('fadeIn');
  const [isAnimating, setIsAnimating] = useState(false);

  const animations = [
    { id: 'fadeIn', name: 'Fade In', class: 'animate-[fadeIn_0.5s_ease-out]' },
    { id: 'slideIn', name: 'Slide In', class: 'animate-[slideIn_0.5s_ease-out]' },
    { id: 'scaleIn', name: 'Scale In', class: 'animate-[scaleIn_0.5s_ease-out]' },
    { id: 'bounce', name: 'Bounce', class: 'animate-bounce' },
    { id: 'pulse', name: 'Pulse', class: 'animate-pulse' },
    { id: 'spin', name: 'Spin', class: 'animate-spin' },
  ];

  const triggerAnimation = (type: string) => {
    setAnimationType(type);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  return (
    <Card className="bg-surface-1/60 border-default/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-river-blue" />
          Animation Showcase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {animations.map((anim) => (
            <EnhancedButton
              key={anim.id}
              size="sm"
              variant={animationType === anim.id ? 'primary' : 'outline'}
              onClick={() => triggerAnimation(anim.id)}
              className="text-xs"
              haptic={true}
            >
              {anim.name}
            </EnhancedButton>
          ))}
        </div>

        <div className="flex justify-center p-8 bg-surface-2/30 rounded-lg">
          <div
            className={`w-16 h-16 bg-gradient-to-br from-river-blue to-profit rounded-lg flex items-center justify-center ${
              isAnimating ? animations.find(a => a.id === animationType)?.class : ''
            }`}
          >
            <Star className="h-8 w-8 text-white" />
          </div>
        </div>

        <div className="text-center text-sm text-secondary">
          Click any animation button to see the effect
        </div>
      </CardContent>
    </Card>
  );
};

// Component Showcase
const ComponentShowcase: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState('buttons');
  const [isLoading, setIsLoading] = useState(false);

  const components = [
    { id: 'buttons', name: 'Enhanced Buttons', icon: Target },
    { id: 'loading', name: 'Loading States', icon: Activity },
    { id: 'skeletons', name: 'Skeleton Screens', icon: BarChart3 },
    { id: 'feedback', name: 'Instant Feedback', icon: Zap },
  ];

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <Card className="bg-surface-1/60 border-default/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-river-blue" />
          Component Showcase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {components.map((comp) => (
            <EnhancedButton
              key={comp.id}
              size="sm"
              variant={selectedComponent === comp.id ? 'primary' : 'outline'}
              onClick={() => setSelectedComponent(comp.id)}
              className="text-xs"
              haptic={true}
            >
              <comp.icon className="h-3 w-3 mr-1" />
              {comp.name}
            </EnhancedButton>
          ))}
        </div>

        <div className="p-4 bg-surface-2/30 rounded-lg space-y-4">
          {selectedComponent === 'buttons' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <EnhancedButton variant="buy" haptic={true} ripple={true}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Buy Order
                </EnhancedButton>
                <EnhancedButton variant="sell" haptic={true} ripple={true}>
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Sell Order
                </EnhancedButton>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <EnhancedButton size="sm" variant="primary" haptic={true}>
                  Primary
                </EnhancedButton>
                <EnhancedButton size="sm" variant="outline" haptic={true}>
                  Outline
                </EnhancedButton>
                <EnhancedButton size="sm" variant="ghost" haptic={true}>
                  Ghost
                </EnhancedButton>
              </div>
            </div>
          )}

          {selectedComponent === 'loading' && (
            <div className="space-y-4">
              <EnhancedButton
                onClick={simulateLoading}
                loading={isLoading}
                loadingText="Processing..."
                variant="primary"
                className="w-full"
                haptic={true}
              >
                Trigger Loading State
              </EnhancedButton>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Loading variant="spinner" size="md" />
                  <div className="text-xs text-secondary mt-2">Spinner</div>
                </div>
                <div className="text-center">
                  <Loading variant="dots" size="md" />
                  <div className="text-xs text-secondary mt-2">Dots</div>
                </div>
                <div className="text-center">
                  <Loading variant="pulse" size="md" />
                  <div className="text-xs text-secondary mt-2">Pulse</div>
                </div>
              </div>
            </div>
          )}

          {selectedComponent === 'skeletons' && (
            <div className="space-y-4">
              <TradingSkeleton.Price />
              <TradingSkeleton.Account />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton variant="text" lines={5} />
              </div>
            </div>
          )}

          {selectedComponent === 'feedback' && (
            <div className="text-center text-sm text-secondary">
              Use the Demo Controls above to trigger different feedback types
              <div className="mt-2">
                <Heart className="h-4 w-4 mx-auto text-profit animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Demo Page Component
const InteractionDemoPageContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(45000);

  // Simulate price updates
  useEffect(() => {
    if (!isDemoPlaying) return;

    const interval = setInterval(() => {
      setCurrentPrice(prev => {
        const change = (Math.random() - 0.5) * 100;
        return Math.max(1000, prev + change);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isDemoPlaying]);

  const handleDemoAction = (action: string) => {
    switch (action) {
      case 'play':
        setIsDemoPlaying(true);
        break;
      case 'pause':
        setIsDemoPlaying(false);
        break;
      case 'reset':
        setIsDemoPlaying(false);
        setCurrentPrice(45000);
        break;
    }
  };

  const handleOrderSubmit = async (orderData: any) => {
    console.log('Order submitted:', orderData);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const handlePriceClick = (price: number) => {
    console.log('Price clicked:', price);
  };

  return (
    <div className="min-h-screen bg-surface-0 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-river-blue to-profit rounded-full">
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-primary">
                RiverBit Enhanced Interactions
              </h1>
              <p className="text-lg text-secondary">
                World-class micro-interactions and smooth animations
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-sm">
            <Badge variant="outline" className="bg-profit/10 border-profit/30 text-profit">
              <CheckCircle className="h-3 w-3 mr-1" />
              Haptic Feedback
            </Badge>
            <Badge variant="outline" className="bg-river-blue/10 border-river-blue/30 text-river-blue">
              <Zap className="h-3 w-3 mr-1" />
              Instant Response
            </Badge>
            <Badge variant="outline" className="bg-warning/10 border-warning/30 text-warning">
              <Smartphone className="h-3 w-3 mr-1" />
              Mobile Optimized
            </Badge>
          </div>
        </div>

        {/* Demo Controls */}
        <DemoControls 
          onAction={handleDemoAction}
          isPlaying={isDemoPlaying}
        />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 h-12 bg-surface-2/80">
            <TabsTrigger value="overview" className="font-semibold">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="advanced" className="font-semibold">
              <Sparkles className="h-4 w-4 mr-2" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="mobile" className="font-semibold">
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="desktop" className="font-semibold">
              <Monitor className="h-4 w-4 mr-2" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="realtime" className="font-semibold">
              <BarChart3 className="h-4 w-4 mr-2" />
              Real-time
            </TabsTrigger>
            <TabsTrigger value="forms" className="font-semibold">
              <Target className="h-4 w-4 mr-2" />
              Forms
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimationShowcase />
              <ComponentShowcase />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <InteractionSystemDemo />
          </TabsContent>

          <TabsContent value="mobile" className="space-y-6">
            <div className="max-w-md mx-auto">
              <GestureEnhancedTradingInterface
                selectedPair="BTC/USDT"
                currentPrice={currentPrice}
                positions={mockPositions}
                accountData={mockAccountData}
                onPlaceOrder={handleOrderSubmit}
                className="border border-default/30 rounded-lg overflow-hidden shadow-2xl"
              />
            </div>
          </TabsContent>

          <TabsContent value="desktop" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <EnhancedRealTimeDisplay
                  symbol="BTC/USDT"
                  initialPrice={currentPrice}
                  onPriceClick={handlePriceClick}
                />
              </div>
              <div>
                <EnhancedTradingForm
                  symbol="BTC/USDT"
                  currentPrice={currentPrice}
                  accountBalance={mockAccountData.balance}
                  availableMargin={mockAccountData.balance - mockAccountData.marginUsed}
                  maxLeverage={100}
                  onSubmitOrder={handleOrderSubmit}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="realtime" className="space-y-6">
            <EnhancedRealTimeDisplay
              symbol="BTC/USDT"
              initialPrice={currentPrice}
              onPriceClick={handlePriceClick}
            />
          </TabsContent>

          <TabsContent value="forms" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <EnhancedTradingForm
                symbol="BTC/USDT"
                currentPrice={currentPrice}
                accountBalance={mockAccountData.balance}
                availableMargin={mockAccountData.balance - mockAccountData.marginUsed}
                maxLeverage={100}
                onSubmitOrder={handleOrderSubmit}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Wrap with FeedbackProvider
const InteractionDemoPage: React.FC = () => {
  return (
    <FeedbackProvider>
      <InteractionDemoPageContent />
    </FeedbackProvider>
  );
};

export default InteractionDemoPage;