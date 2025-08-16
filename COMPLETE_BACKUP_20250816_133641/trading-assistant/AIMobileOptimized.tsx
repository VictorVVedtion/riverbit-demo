import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { useIsMobile } from '../ui/use-mobile';
import {
  Bot,
  Brain,
  MessageSquare,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Shield,
  Zap,
  Send,
  Mic,
  MicOff,
  X,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Settings,
  Maximize2,
  Minimize2,
  RefreshCw,
  Clock,
  DollarSign,
  Percent,
  Eye,
  EyeOff,
  Volume2,
  VolumeX
} from 'lucide-react';

// Import components
import TradingAssistantChat from './TradingAssistantChat';
import { TradingPlan } from './types';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface AIMobileOptimizedProps {
  /** Whether the mobile AI is open */
  isOpen: boolean;
  /** Function to handle open/close */
  onOpenChange: (open: boolean) => void;
  /** Trading context */
  tradingContext?: {
    selectedPair: string;
    currentPrice?: number;
    accountBalance?: number;
    positions?: any[];
  };
  /** Wallet state */
  walletState?: {
    isConnected: boolean;
    address?: string;
    chainId?: number;
  };
  /** Event handlers */
  onPlanExecute?: (plan: TradingPlan) => Promise<void>;
  onPlanBookmark?: (planId: string) => void;
  onPlanShare?: (plan: TradingPlan) => void;
}

// ============================================================================
// MOBILE OPTIMIZED AI COMPONENT
// ============================================================================

const AIMobileOptimized: React.FC<AIMobileOptimizedProps> = ({
  isOpen,
  onOpenChange,
  tradingContext,
  walletState,
  onPlanExecute,
  onPlanBookmark,
  onPlanShare
}) => {
  const isMobile = useIsMobile();
  
  // ========== STATE MANAGEMENT ==========
  const [activeView, setActiveView] = useState<'chat' | 'insights' | 'settings'>('chat');
  const [isMinimized, setIsMinimized] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [autoHide, setAutoHide] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ========== MOBILE SPECIFIC EFFECTS ==========
  
  // Haptic feedback for mobile interactions
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticFeedback || !window.navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30]
    };
    
    window.navigator.vibrate(patterns[type]);
  }, [hapticFeedback]);

  // Auto-hide on scroll (mobile behavior)
  useEffect(() => {
    if (!autoHide || !isMobile) return;

    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsMinimized(true);
      } else if (currentScrollY < lastScrollY) {
        setIsMinimized(false);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [autoHide, isMobile]);

  // ========== QUICK ACTIONS FOR MOBILE ==========
  
  const quickActions = [
    {
      label: 'BTC Analysis',
      icon: <TrendingUp className="h-4 w-4" />,
      prompt: 'Analyze Bitcoin now',
      color: 'bg-green-500'
    },
    {
      label: 'Market Check',
      icon: <Activity className="h-4 w-4" />,
      prompt: 'Quick market overview',
      color: 'bg-blue-500'
    },
    {
      label: 'Risk Review',
      icon: <Shield className="h-4 w-4" />,
      prompt: 'Check my risk levels',
      color: 'bg-orange-500'
    },
    {
      label: 'Entry Points',
      icon: <Target className="h-4 w-4" />,
      prompt: 'Show me entry opportunities',
      color: 'bg-purple-500'
    }
  ];

  // ========== EVENT HANDLERS ==========
  
  const handleQuickAction = (prompt: string) => {
    triggerHaptic('light');
    setQuickInput(prompt);
    setActiveView('chat');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const toggleVoiceMode = () => {
    triggerHaptic('medium');
    setIsVoiceMode(!isVoiceMode);
  };

  const handleMinimizeToggle = () => {
    triggerHaptic('light');
    setIsMinimized(!isMinimized);
  };

  // ========== RENDER FUNCTIONS ==========

  const renderMobileHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-border/50 bg-surface-1/95 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-river-blue-main/20 to-river-accent/20">
          <Brain className="h-5 w-5 text-river-blue-main animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">RiverBit AI</h3>
          <p className="text-xs text-muted-foreground">
            {walletState?.isConnected ? 'Live Assistant' : 'Demo Mode'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Minimize button for mobile */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleMinimizeToggle}
          className="h-8 w-8 p-0"
        >
          {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {/* Close button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div className="p-4 border-b border-border/50">
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction(action.prompt)}
            className="h-12 flex flex-col items-center justify-center gap-1 border-border/50 hover:bg-accent/50 transition-all duration-200"
          >
            <div className={`p-1 rounded ${action.color}/20`}>
              {action.icon}
            </div>
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );

  const renderMobileChat = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <TradingAssistantChat
        userAddress={walletState?.address}
        isConnected={walletState?.isConnected || false}
        accountBalance={tradingContext?.accountBalance}
        onPlanExecute={onPlanExecute}
        onPlanBookmark={onPlanBookmark}
        onPlanShare={onPlanShare}
        className="h-full border-0 bg-transparent"
      />
    </div>
  );

  const renderMobileInsights = () => (
    <div className="p-4 space-y-4">
      <div className="text-center py-8 text-muted-foreground">
        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm">AI Insights</p>
        <p className="text-xs mt-1">Real-time market analysis</p>
      </div>
    </div>
  );

  const renderMobileSettings = () => (
    <div className="p-4 space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-sm">AI Preferences</h4>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Haptic Feedback</p>
            <p className="text-xs text-muted-foreground">Vibrate on interactions</p>
          </div>
          <Switch checked={hapticFeedback} onCheckedChange={setHapticFeedback} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Auto Hide</p>
            <p className="text-xs text-muted-foreground">Hide when scrolling</p>
          </div>
          <Switch checked={autoHide} onCheckedChange={setAutoHide} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Voice Mode</p>
            <p className="text-xs text-muted-foreground">Speech recognition</p>
          </div>
          <Switch checked={isVoiceMode} onCheckedChange={setIsVoiceMode} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">Trading alerts</p>
          </div>
          <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-sm">Trading Style</h4>
        
        <div className="grid grid-cols-3 gap-2">
          {['Conservative', 'Balanced', 'Aggressive'].map((style) => (
            <Button
              key={style}
              variant="outline"
              size="sm"
              className="h-10 text-xs"
            >
              {style}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-sm">Quick Actions</h4>
        
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Download className="h-4 w-4 mr-2" />
            Export Analysis
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-red-500 border-red-200 hover:bg-red-50">
            <X className="h-4 w-4 mr-2" />
            Reset AI
          </Button>
        </div>
      </div>
    </div>
  );

  const renderMobileNav = () => (
    <div className="border-t border-border/50 bg-surface-1/95 backdrop-blur-sm">
      <div className="grid grid-cols-3">
        {[
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'insights', label: 'Insights', icon: Eye },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="ghost"
            size="sm"
            onClick={() => {
              triggerHaptic('light');
              setActiveView(id as any);
            }}
            className={`h-14 flex flex-col items-center justify-center gap-1 rounded-none ${
              activeView === id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );

  // ========== MAIN RENDER ==========

  if (!isMobile) {
    // Return null for desktop - use regular components
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className={`h-[85vh] p-0 border-border/50 bg-surface-0/95 backdrop-blur-xl transition-all duration-300 ${
          isMinimized ? 'h-20' : 'h-[85vh]'
        }`}
      >
        <div ref={containerRef} className="h-full flex flex-col">
          {renderMobileHeader()}
          
          {!isMinimized && (
            <>
              {renderQuickActions()}
              
              <div className="flex-1 overflow-hidden">
                {activeView === 'chat' && renderMobileChat()}
                {activeView === 'insights' && renderMobileInsights()}
                {activeView === 'settings' && renderMobileSettings()}
              </div>

              {renderMobileNav()}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AIMobileOptimized;