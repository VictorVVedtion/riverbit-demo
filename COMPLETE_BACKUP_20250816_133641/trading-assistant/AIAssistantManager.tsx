import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
  Bot,
  Brain,
  MessageSquare,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Zap,
  Activity,
  Settings,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

// Import components
import AITradingChatDialog from './AITradingChatDialog';
import AIAssistantDashboard from './AIAssistantDashboard';
import { TradingPlan } from './types';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export type AIMode = 'closed' | 'chat' | 'dashboard';

export interface AIAssistantState {
  mode: AIMode;
  isFullscreen: boolean;
  isMinimized: boolean;
  isPinned: boolean;
  lastUsed: Date;
  preferences: {
    autoOpen: boolean;
    notifications: boolean;
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    tradingStyle: 'scalping' | 'swing' | 'position';
  };
}

export interface AIAssistantManagerProps {
  /** Current trading context */
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
  /** Event handlers */
  onPlanExecute?: (plan: TradingPlan) => Promise<void>;
  onPlanBookmark?: (planId: string) => void;
  onPlanShare?: (plan: TradingPlan) => void;
  /** Custom styling */
  className?: string;
  /** Position for floating buttons */
  buttonPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

// ============================================================================
// AI ASSISTANT MANAGER COMPONENT
// ============================================================================

const AIAssistantManager: React.FC<AIAssistantManagerProps> = ({
  tradingContext,
  walletState,
  onPlanExecute,
  onPlanBookmark,
  onPlanShare,
  className = '',
  buttonPosition = 'bottom-right'
}) => {
  // ========== STATE MANAGEMENT ==========
  const [aiState, setAIState] = useState<AIAssistantState>({
    mode: 'closed',
    isFullscreen: false,
    isMinimized: false,
    isPinned: false,
    lastUsed: new Date(),
    preferences: {
      autoOpen: false,
      notifications: true,
      riskTolerance: 'moderate',
      tradingStyle: 'swing'
    }
  });

  const [hasNewInsights, setHasNewInsights] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // ========== EFFECTS ==========
  
  // Simulate new insights/notifications
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 30 seconds
        setHasNewInsights(true);
        setNotificationCount(prev => prev + 1);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss notifications when AI is opened
  useEffect(() => {
    if (aiState.mode !== 'closed') {
      setHasNewInsights(false);
      setNotificationCount(0);
    }
  }, [aiState.mode]);

  // ========== EVENT HANDLERS ==========
  
  const updateAIState = useCallback((updates: Partial<AIAssistantState>) => {
    setAIState(prev => ({
      ...prev,
      ...updates,
      lastUsed: new Date()
    }));
  }, []);

  const openChatMode = useCallback(() => {
    updateAIState({
      mode: 'chat',
      isFullscreen: false,
      isMinimized: false
    });
  }, [updateAIState]);

  const openDashboardMode = useCallback(() => {
    updateAIState({
      mode: 'dashboard',
      isFullscreen: true,
      isMinimized: false
    });
  }, [updateAIState]);

  const closeAI = useCallback(() => {
    updateAIState({
      mode: 'closed',
      isFullscreen: false,
      isMinimized: false,
      isPinned: false
    });
  }, [updateAIState]);

  const toggleFullscreen = useCallback(() => {
    updateAIState({
      isFullscreen: !aiState.isFullscreen,
      mode: aiState.isFullscreen ? 'chat' : 'dashboard'
    });
  }, [aiState.isFullscreen, updateAIState]);

  const handleChatDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      closeAI();
    }
  }, [closeAI]);

  // ========== UTILITY FUNCTIONS ==========
  
  const getButtonPositionClasses = () => {
    const baseClasses = 'fixed z-40';
    
    switch (buttonPosition) {
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'top-right':
        return `${baseClasses} top-20 right-4`;
      case 'top-left':
        return `${baseClasses} top-20 left-4`;
      default:
        return `${baseClasses} bottom-4 right-4`;
    }
  };

  // ========== RENDER FUNCTIONS ==========

  const renderFloatingButtons = () => {
    if (aiState.mode !== 'closed') return null;

    return (
      <div className={`${getButtonPositionClasses()} flex flex-col gap-3`}>
        <TooltipProvider>
          {/* AI Chat Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={openChatMode}
                className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-river-blue-main via-river-blue-light to-river-accent border border-river-blue/30 shadow-2xl hover:shadow-river-blue/25 hover:scale-110 transition-all duration-300 group"
              >
                <MessageSquare className="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-300" />
                
                {/* Notification Badge */}
                {hasNewInsights && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse"
                  >
                    {notificationCount}
                  </Badge>
                )}

                {/* Pulsing Ring Effect */}
                {hasNewInsights && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-river-blue animate-ping" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-surface-1 border border-border">
              <div className="text-sm">
                <p className="font-semibold">AI Trading Assistant</p>
                <p className="text-muted-foreground">Quick chat mode</p>
                {hasNewInsights && (
                  <p className="text-river-blue text-xs">{notificationCount} new insights</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>

          {/* AI Dashboard Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={openDashboardMode}
                className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 border border-purple-400/30 shadow-xl hover:shadow-purple-500/25 hover:scale-110 transition-all duration-300 group"
              >
                <Brain className="h-5 w-5 text-white group-hover:rotate-12 transition-transform duration-300" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-surface-1 border border-border">
              <div className="text-sm">
                <p className="font-semibold">AI Dashboard</p>
                <p className="text-muted-foreground">Full analytics mode</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  const renderAIInterface = () => {
    if (aiState.mode === 'closed') return null;

    if (aiState.mode === 'dashboard' || aiState.isFullscreen) {
      return (
        <div className="fixed inset-0 z-50 bg-surface-0/95 backdrop-blur-sm">
          <AIAssistantDashboard
            isFullscreen={aiState.isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onClose={closeAI}
            tradingContext={tradingContext}
            walletState={walletState}
            aiConfig={{
              riskTolerance: aiState.preferences.riskTolerance,
              tradingStyle: aiState.preferences.tradingStyle,
              alertsEnabled: aiState.preferences.notifications,
              autoExecuteEnabled: false
            }}
            onPlanExecute={onPlanExecute}
            onPlanBookmark={onPlanBookmark}
            onPlanShare={onPlanShare}
            className="h-full"
          />
        </div>
      );
    }

    if (aiState.mode === 'chat') {
      return (
        <AITradingChatDialog
          isOpen={true}
          onOpenChange={handleChatDialogOpenChange}
          mode="sidebar"
          allowFullscreen={true}
          tradingContext={tradingContext}
          walletState={walletState}
          onPlanExecute={onPlanExecute}
          onPlanBookmark={onPlanBookmark}
          onPlanShare={onPlanShare}
        />
      );
    }

    return null;
  };

  // Quick access button in trading panel (when AI tab is active)
  const renderInlineToggle = () => {
    if (aiState.mode === 'closed') return null;

    return (
      <div className="absolute top-2 right-2 z-10">
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleFullscreen}
          className="h-8 w-8 p-0 bg-surface-2/80 backdrop-blur-sm border border-border/30 hover:bg-surface-3"
          title={aiState.isFullscreen ? "Switch to chat mode" : "Switch to dashboard mode"}
        >
          {aiState.isFullscreen ? (
            <MessageSquare className="h-4 w-4" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  };

  // ========== MAIN RENDER ==========

  return (
    <div className={className}>
      {renderFloatingButtons()}
      {renderAIInterface()}
      {renderInlineToggle()}
      
      {/* Hidden state for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 left-2 z-50 bg-black/80 text-white text-xs p-2 rounded">
          AI Mode: {aiState.mode} | FS: {aiState.isFullscreen.toString()} | Notifications: {notificationCount}
        </div>
      )}
    </div>
  );
};

export default AIAssistantManager;