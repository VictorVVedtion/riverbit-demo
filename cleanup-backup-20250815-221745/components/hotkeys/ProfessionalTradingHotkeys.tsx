import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  Keyboard, 
  Target, 
  Zap, 
  Settings,
  X,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Move,
  Percent,
  DollarSign,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Clock,
  Lock,
  Unlock
} from 'lucide-react';
import LiquidGlassCard from '../ui/LiquidGlassCard';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface TradingAction {
  id: string;
  key: string;
  combination?: string[];
  description: string;
  category: 'position' | 'order' | 'chart' | 'risk' | 'global';
  action: () => void;
  enabled: boolean;
  professional: boolean; // Mark as pro trader feature
  icon: React.ReactNode;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
}

interface ProfessionalTradingHotkeysProps {
  onQuickClose?: (percentage: number) => void;
  onFlipPosition?: () => void;
  onToggleSide?: () => void;
  onCancelLastOrder?: () => void;
  onCancelAllOrders?: () => void;
  onUndoLastAction?: () => void;
  onAddToPosition?: () => void;
  onReducePosition?: () => void;
  onAdjustPrice?: (direction: 'up' | 'down', multiplier?: number) => void;
  onSwitchTimeframe?: (direction: 'up' | 'down') => void;
  onToggleDataFeed?: () => void;
  onEmergencyStop?: () => void;
  currentSide: 'buy' | 'sell';
  isDataPaused: boolean;
  hasPosition: boolean;
  hasOrders: boolean;
}

const ProfessionalTradingHotkeys: React.FC<ProfessionalTradingHotkeysProps> = ({
  onQuickClose,
  onFlipPosition,
  onToggleSide,
  onCancelLastOrder,
  onCancelAllOrders,
  onUndoLastAction,
  onAddToPosition,
  onReducePosition,
  onAdjustPrice,
  onSwitchTimeframe,
  onToggleDataFeed,
  onEmergencyStop,
  currentSide = 'buy',
  isDataPaused = false,
  hasPosition = false,
  hasOrders = false
}) => {
  const [showHotkeyGuide, setShowHotkeyGuide] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const [keyPressVisual, setKeyPressVisual] = useState<string>('');

  // Professional trading hotkey definitions
  const tradingActions: TradingAction[] = [
    // Emergency & Critical Actions
    {
      id: 'emergency-stop',
      key: 'Escape',
      combination: ['Escape', 'Escape'],
      description: 'Emergency Stop All',
      category: 'risk',
      urgency: 'emergency',
      professional: true,
      icon: <X className="w-4 h-4" />,
      action: () => {
        onEmergencyStop?.();
        setLastAction('Emergency stop activated');
        toast.error('🚨 Emergency stop activated - All positions closed');
      },
      enabled: hasPosition
    },

    // Position Management - Industry Standard
    {
      id: 'quick-close-25',
      key: 'Q',
      description: 'Close 25% Position',
      category: 'position',
      urgency: 'medium',
      professional: true,
      icon: <Percent className="w-4 h-4" />,
      action: () => {
        onQuickClose?.(25);
        setLastAction('Closed 25% of position');
        toast.success('📊 Closed 25% of position');
      },
      enabled: hasPosition
    },
    {
      id: 'quick-close-50',
      key: 'W',
      description: 'Close 50% Position',
      category: 'position',
      urgency: 'medium',
      professional: true,
      icon: <Percent className="w-4 h-4" />,
      action: () => {
        onQuickClose?.(50);
        setLastAction('Closed 50% of position');
        toast.success('📊 Closed 50% of position');
      },
      enabled: hasPosition
    },
    {
      id: 'quick-close-75',
      key: 'E',
      description: 'Close 75% Position',
      category: 'position',
      urgency: 'medium',
      professional: true,
      icon: <Percent className="w-4 h-4" />,
      action: () => {
        onQuickClose?.(75);
        setLastAction('Closed 75% of position');
        toast.success('📊 Closed 75% of position');
      },
      enabled: hasPosition
    },
    {
      id: 'close-all',
      key: 'R',
      description: 'Close All Positions',
      category: 'position',
      urgency: 'high',
      professional: true,
      icon: <X className="w-4 h-4" />,
      action: () => {
        onQuickClose?.(100);
        setLastAction('Closed all positions');
        toast.success('🎯 All positions closed');
      },
      enabled: hasPosition
    },
    {
      id: 'toggle-side',
      key: 'T',
      description: 'Toggle Long/Short',
      category: 'position',
      urgency: 'low',
      professional: true,
      icon: currentSide === 'buy' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
      action: () => {
        onToggleSide?.();
        setLastAction(`Switched to ${currentSide === 'buy' ? 'short' : 'long'}`);
        toast.info(`🔄 Switched to ${currentSide === 'buy' ? 'short' : 'long'}`);
      },
      enabled: true
    },
    {
      id: 'flip-position',
      key: 'Y',
      description: 'Flip Position',
      category: 'position',
      urgency: 'high',
      professional: true,
      icon: <Move className="w-4 h-4" />,
      action: () => {
        onFlipPosition?.();
        setLastAction('Flipped position');
        toast.success('🔄 Position flipped');
      },
      enabled: hasPosition
    },

    // Order Management
    {
      id: 'cancel-last',
      key: 'C',
      description: 'Cancel Last Order',
      category: 'order',
      urgency: 'medium',
      professional: true,
      icon: <X className="w-4 h-4" />,
      action: () => {
        onCancelLastOrder?.();
        setLastAction('Cancelled last order');
        toast.success('❌ Last order cancelled');
      },
      enabled: hasOrders
    },
    {
      id: 'cancel-all-orders',
      key: 'X',
      combination: ['Ctrl', 'X'],
      description: 'Cancel All Orders',
      category: 'order',
      urgency: 'high',
      professional: true,
      icon: <X className="w-4 h-4" />,
      action: () => {
        onCancelAllOrders?.();
        setLastAction('Cancelled all orders');
        toast.success('🗑️ All orders cancelled');
      },
      enabled: hasOrders
    },
    {
      id: 'undo-action',
      key: 'Z',
      combination: ['Ctrl', 'Z'],
      description: 'Undo Last Action',
      category: 'order',
      urgency: 'medium',
      professional: true,
      icon: <RotateCcw className="w-4 h-4" />,
      action: () => {
        onUndoLastAction?.();
        toast.info('↶ Last action undone');
      },
      enabled: true
    },

    // Position Sizing
    {
      id: 'add-position',
      key: 'A',
      description: 'Add to Position',
      category: 'position',
      urgency: 'medium',
      professional: true,
      icon: <TrendingUp className="w-4 h-4" />,
      action: () => {
        onAddToPosition?.();
        setLastAction('Added to position');
        toast.success('➕ Added to position');
      },
      enabled: hasPosition
    },
    {
      id: 'reduce-position',
      key: 'D',
      description: 'Reduce Position',
      category: 'position',
      urgency: 'medium',
      professional: true,
      icon: <TrendingDown className="w-4 h-4" />,
      action: () => {
        onReducePosition?.();
        setLastAction('Reduced position');
        toast.success('➖ Reduced position');
      },
      enabled: hasPosition
    },

    // Chart Navigation
    {
      id: 'price-up',
      key: 'ArrowUp',
      description: 'Adjust Price Up',
      category: 'chart',
      urgency: 'low',
      professional: true,
      icon: <ArrowUp className="w-4 h-4" />,
      action: () => {
        onAdjustPrice?.('up');
        setLastAction('Price adjusted up');
      },
      enabled: true
    },
    {
      id: 'price-down',
      key: 'ArrowDown',
      description: 'Adjust Price Down',
      category: 'chart',
      urgency: 'low',
      professional: true,
      icon: <ArrowDown className="w-4 h-4" />,
      action: () => {
        onAdjustPrice?.('down');
        setLastAction('Price adjusted down');
      },
      enabled: true
    },
    {
      id: 'price-up-10x',
      key: 'ArrowUp',
      combination: ['Shift', 'ArrowUp'],
      description: 'Adjust Price Up 10x',
      category: 'chart',
      urgency: 'low',
      professional: true,
      icon: <ArrowUp className="w-4 h-4" />,
      action: () => {
        onAdjustPrice?.('up', 10);
        setLastAction('Price adjusted up 10x');
      },
      enabled: true
    },
    {
      id: 'price-down-10x',
      key: 'ArrowDown',
      combination: ['Shift', 'ArrowDown'],
      description: 'Adjust Price Down 10x',
      category: 'chart',
      urgency: 'low',
      professional: true,
      icon: <ArrowDown className="w-4 h-4" />,
      action: () => {
        onAdjustPrice?.('down', 10);
        setLastAction('Price adjusted down 10x');
      },
      enabled: true
    },
    {
      id: 'timeframe-up',
      key: 'PageUp',
      description: 'Higher Timeframe',
      category: 'chart',
      urgency: 'low',
      professional: false,
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => {
        onSwitchTimeframe?.('up');
        setLastAction('Switched to higher timeframe');
        toast.info('📈 Higher timeframe');
      },
      enabled: true
    },
    {
      id: 'timeframe-down',
      key: 'PageDown',
      description: 'Lower Timeframe',
      category: 'chart',
      urgency: 'low',
      professional: false,
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => {
        onSwitchTimeframe?.('down');
        setLastAction('Switched to lower timeframe');
        toast.info('📉 Lower timeframe');
      },
      enabled: true
    },
    {
      id: 'toggle-data',
      key: 'Space',
      description: 'Pause/Resume Data',
      category: 'chart',
      urgency: 'low',
      professional: false,
      icon: isDataPaused ? <Clock className="w-4 h-4" /> : <Zap className="w-4 h-4" />,
      action: () => {
        onToggleDataFeed?.();
        setLastAction(isDataPaused ? 'Data resumed' : 'Data paused');
        toast.info(isDataPaused ? '▶️ Data resumed' : '⏸️ Data paused');
      },
      enabled: true
    },

    // Global Controls
    {
      id: 'show-hotkeys',
      key: '?',
      description: 'Show Hotkey Guide',
      category: 'global',
      urgency: 'low',
      professional: false,
      icon: <Keyboard className="w-4 h-4" />,
      action: () => {
        setShowHotkeyGuide(true);
        setLastAction('Opened hotkey guide');
      },
      enabled: true
    },
    {
      id: 'lock-hotkeys',
      key: 'L',
      combination: ['Ctrl', 'L'],
      description: 'Lock/Unlock Hotkeys',
      category: 'global',
      urgency: 'low',
      professional: true,
      icon: isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />,
      action: () => {
        setIsLocked(!isLocked);
        setLastAction(isLocked ? 'Hotkeys unlocked' : 'Hotkeys locked');
        toast.info(isLocked ? '🔓 Hotkeys unlocked' : '🔒 Hotkeys locked');
      },
      enabled: true
    }
  ];

  // Visual key press feedback
  const showKeyPress = useCallback((key: string) => {
    setKeyPressVisual(key);
    setTimeout(() => setKeyPressVisual(''), 800);
  }, []);

  // Enhanced keyboard handler with professional features
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isLocked) return;
    
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const pressedKey = event.key;
    const hasCtrl = event.ctrlKey || event.metaKey;
    const hasShift = event.shiftKey;
    const hasAlt = event.altKey;

    // Special handling for double ESC
    if (pressedKey === 'Escape') {
      let escapeCount = parseInt(sessionStorage.getItem('escapeCount') || '0');
      escapeCount++;
      sessionStorage.setItem('escapeCount', escapeCount.toString());
      
      if (escapeCount === 1) {
        setTimeout(() => sessionStorage.setItem('escapeCount', '0'), 1000);
        showKeyPress('ESC (1/2)');
        toast.warning('⚠️ Press ESC again to emergency stop');
        return;
      } else if (escapeCount === 2) {
        sessionStorage.setItem('escapeCount', '0');
        const emergencyAction = tradingActions.find(a => a.id === 'emergency-stop');
        if (emergencyAction && emergencyAction.enabled) {
          emergencyAction.action();
          showKeyPress('ESC ESC');
        }
        return;
      }
    } else {
      sessionStorage.setItem('escapeCount', '0');
    }

    for (const action of tradingActions) {
      if (!action.enabled) continue;

      let matches = false;

      if (action.combination) {
        const combo = action.combination;
        matches = true;

        if (combo.includes('Ctrl') && !hasCtrl) matches = false;
        if (combo.includes('Shift') && !hasShift) matches = false;
        if (combo.includes('Alt') && !hasAlt) matches = false;

        const keyInCombo = combo.find(k => !['Ctrl', 'Shift', 'Alt'].includes(k));
        if (keyInCombo && pressedKey !== keyInCombo) matches = false;
      } else {
        matches = pressedKey === action.key && !hasCtrl && !hasShift && !hasAlt;
      }

      if (matches) {
        event.preventDefault();
        action.action();
        showKeyPress(action.combination ? action.combination.join('+') : action.key);
        break;
      }
    }
  }, [isLocked, tradingActions, showKeyPress]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Group actions by category
  const actionsByCategory = tradingActions.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = [];
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, TradingAction[]>);

  const categoryLabels = {
    risk: 'Risk Management',
    position: 'Position Management', 
    order: 'Order Management',
    chart: 'Chart Navigation',
    global: 'System Controls'
  };

  const categoryDescriptions = {
    risk: 'Emergency stops and risk control',
    position: 'Size management and position controls',
    order: 'Order placement and cancellation',
    chart: 'Price adjustment and timeframe navigation', 
    global: 'Interface and system settings'
  };

  const categoryColors = {
    position: 'from-emerald-500/10 via-green-400/5 to-emerald-600/10 border-emerald-400/30',
    order: 'from-blue-500/10 via-cyan-400/5 to-blue-600/10 border-blue-400/30',
    chart: 'from-purple-500/10 via-violet-400/5 to-purple-600/10 border-purple-400/30',
    risk: 'from-red-500/10 via-orange-400/5 to-red-600/10 border-red-400/30',
    global: 'from-slate-500/10 via-gray-400/5 to-slate-600/10 border-slate-400/30'
  };

  const categoryGlows = {
    position: 'shadow-emerald-500/20',
    order: 'shadow-blue-500/20', 
    chart: 'shadow-purple-500/20',
    risk: 'shadow-red-500/20',
    global: 'shadow-slate-500/20'
  };

  return (
    <>
      {/* Enhanced Key Press Visual Feedback with Liquid Glass */}
      {keyPressVisual && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in-50 duration-200">
          <div className="relative group">
            {/* Liquid glass container with dynamic glow */}
            <div className="bg-gradient-to-br from-white/10 via-blue-500/5 to-purple-500/10 backdrop-blur-2xl border border-white/20 rounded-3xl px-12 py-8 shadow-2xl">
              {/* Inner glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-purple-500/10 rounded-3xl opacity-50"></div>
              
              {/* Animated border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-purple-500/20 animate-pulse"></div>
              
              {/* Key text with enhanced styling */}
              <div className="relative z-10 text-4xl font-mono font-bold text-center bg-gradient-to-r from-white via-cyan-200 to-blue-200 bg-clip-text text-transparent">
                {keyPressVisual}
              </div>
              
              {/* Ripple effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-400/30 to-purple-500/30 animate-ping opacity-20"></div>
            </div>
            
            {/* Outer glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-500/20 rounded-3xl blur-xl -z-10 animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Enhanced Last Action Indicator with Liquid Glass */}
      {lastAction && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40 animate-in slide-in-from-top duration-300">
          <div className="relative group">
            {/* Liquid glass background */}
            <div className="bg-gradient-to-r from-white/10 via-cyan-500/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-3 shadow-lg">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-2xl opacity-60"></div>
              
              {/* Text with gradient */}
              <div className="relative z-10 text-sm font-medium bg-gradient-to-r from-white to-cyan-100 bg-clip-text text-transparent">
                {lastAction}
              </div>
            </div>
            
            {/* Subtle outer glow */}
            <div className="absolute inset-0 bg-cyan-400/10 rounded-2xl blur-lg -z-10"></div>
          </div>
        </div>
      )}

      {/* Enhanced Hotkey Status & Controls with Liquid Glass */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end space-y-3 z-40">
        {/* Status Badge with Liquid Glass */}
        <div className="relative group">
          <Badge 
            variant={isLocked ? "destructive" : "default"}
            className={`relative z-10 ${isLocked 
              ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-400/40 text-red-200' 
              : 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-emerald-400/40 text-emerald-200'
            } backdrop-blur-xl shadow-lg`}
          >
            {isLocked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
            Hotkeys {isLocked ? 'Locked' : 'Active'}
          </Badge>
          {/* Glow effect */}
          <div className={`absolute inset-0 ${isLocked ? 'bg-red-400/20' : 'bg-emerald-400/20'} rounded-lg blur-md -z-10`}></div>
        </div>
        
        {/* Control Button with Enhanced Liquid Glass */}
        <div className="relative group">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowHotkeyGuide(true)}
            className="relative z-10 bg-gradient-to-r from-white/10 via-cyan-500/5 to-white/10 backdrop-blur-xl border-white/20 text-white hover:border-cyan-400/60 hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-blue-500/10 transition-all duration-300 shadow-lg"
          >
            <Keyboard className="w-4 h-4 mr-2" />
            Pro Hotkeys
          </Button>
          {/* Enhanced glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-lg blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      </div>

      {/* Professional Hotkey Guide */}
      {showHotkeyGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Enhanced Liquid Glass Container */}
            <div className="relative bg-gradient-to-br from-white/[0.08] via-cyan-500/[0.03] to-purple-500/[0.08] backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl">
              {/* Inner glow layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 via-transparent to-purple-500/5 rounded-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-400/3 to-transparent rounded-3xl"></div>
              
              {/* Animated border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-purple-500/20 animate-pulse opacity-30"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Target className="w-6 h-6 text-river-surface" />
                  <h2 className="text-2xl font-bold text-white">Professional Trading Hotkeys</h2>
                  <Badge variant="outline" className="border-river-surface/40 text-river-surface">
                    {tradingActions.filter(a => a.professional).length} Pro Features
                  </Badge>
                </div>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHotkeyGuide(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto">
                {/* Risk Management comes first - highest priority */}
                {Object.entries(actionsByCategory)
                  .sort(([a], [b]) => {
                    const order = ['risk', 'position', 'order', 'chart', 'global'];
                    return order.indexOf(a) - order.indexOf(b);
                  })
                  .map(([category, actions]) => (
                  <div key={category} className="space-y-3">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center space-x-3 mb-1">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${categoryColors[category as keyof typeof categoryColors]} shadow-lg`} />
                        <span>{categoryLabels[category as keyof typeof categoryLabels]}</span>
                        <Badge size="sm" className="text-xs bg-white/10 text-white/70 border-white/20">
                          {actions.length}
                        </Badge>
                      </h3>
                      <p className="text-sm text-gray-400 ml-7">
                        {categoryDescriptions[category as keyof typeof categoryDescriptions]}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      {actions.map((action) => (
                        <div 
                          key={action.id}
                          className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                            action.enabled 
                              ? `bg-gradient-to-br ${categoryColors[action.category]} hover:scale-[1.02] hover:shadow-lg ${categoryGlows[action.category]} backdrop-blur-sm` 
                              : 'bg-gray-800/30 border-gray-600/30 opacity-50'
                          } ${action.urgency === 'emergency' ? 'border-red-400/60 bg-gradient-to-br from-red-500/20 to-orange-500/20 shadow-red-500/30' : ''}`}
                        >
                          {/* Inner glow effect */}
                          {action.enabled && (
                            <div className={`absolute inset-0 bg-gradient-to-br ${categoryColors[action.category]} rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {action.icon}
                              <span className="text-sm font-medium text-white">
                                {action.description}
                              </span>
                              {action.professional && (
                                <Badge size="sm" className="bg-river-surface/20 text-river-surface text-xs">
                                  PRO
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              {action.combination ? (
                                action.combination.map((key, index) => (
                                  <React.Fragment key={key}>
                                    {index > 0 && <span className="text-xs text-gray-400 mx-1">+</span>}
                                    <kbd className="relative bg-gradient-to-br from-black/60 via-gray-800/60 to-black/60 backdrop-blur-sm border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-mono shadow-inner">
                                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg"></div>
                                      <span className="relative z-10">{key}</span>
                                    </kbd>
                                  </React.Fragment>
                                ))
                              ) : (
                                <kbd className="relative bg-gradient-to-br from-black/60 via-gray-800/60 to-black/60 backdrop-blur-sm border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-mono shadow-inner">
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg"></div>
                                  <span className="relative z-10">{action.key}</span>
                                </kbd>
                              )}
                            </div>
                          </div>
                          
                          {action.urgency === 'emergency' && (
                            <div className="mt-2 text-xs text-red-400">
                              ⚠️ Emergency function - Use with caution
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  ))
                }
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 bg-gradient-to-r from-white/5 to-transparent rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-white/80 font-medium flex items-center space-x-2">
                      <Target className="w-4 h-4 text-cyan-400" />
                      <span>Professional Trading Hotkeys</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      💡 Hotkeys disabled in input fields • Industry-standard GMX/Hyperliquid mappings
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-200 border-emerald-400/30">
                      {tradingActions.filter(a => a.professional).length} Pro Features
                    </Badge>
                    <Button
                      size="sm"
                      variant={isLocked ? "destructive" : "outline"}
                      onClick={() => setIsLocked(!isLocked)}
                      className={`${isLocked 
                        ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-400/40 text-red-200' 
                        : 'bg-gradient-to-r from-white/10 to-white/5 border-white/20 text-white'
                      } backdrop-blur-sm`}
                    >
                      {isLocked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
                      {isLocked ? 'Unlock' : 'Lock'} Hotkeys
                    </Button>
                  </div>
                </div>
              </div>
              </div>
            </div>
            
            {/* Outer glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-blue-500/10 to-purple-500/10 rounded-3xl blur-2xl -z-10 animate-pulse"></div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfessionalTradingHotkeys;