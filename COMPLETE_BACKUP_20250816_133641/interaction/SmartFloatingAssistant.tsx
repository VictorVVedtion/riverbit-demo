"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { 
  MessageCircle, 
  X, 
  Minimize2, 
  Maximize2, 
  Mic, 
  Volume2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Zap,
  Bot,
  HelpCircle
} from "lucide-react";

// Types
interface AssistantState {
  isVisible: boolean;
  isExpanded: boolean;
  isMinimized: boolean;
  currentMode: 'chat' | 'suggestions' | 'alerts' | 'voice';
  unreadCount: number;
}

interface UserBehavior {
  pageVisitTime: number;
  clickCount: number;
  scrollDepth: number;
  lastAction: string;
  isStuck: boolean;
  hasErrors: boolean;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface MarketCondition {
  volatility: number;
  priceChange24h: number;
  volume: number;
  alerts: Array<{
    type: 'warning' | 'info' | 'danger';
    message: string;
    timestamp: Date;
  }>;
}

interface AssistantSuggestion {
  id: string;
  type: 'action' | 'tip' | 'warning' | 'opportunity';
  title: string;
  description: string;
  action?: () => void;
  priority: 'low' | 'medium' | 'high';
  icon: React.ReactNode;
}

// Smart display logic hook
function useSmartDisplayLogic() {
  const [userBehavior, setUserBehavior] = React.useState<UserBehavior>({
    pageVisitTime: 0,
    clickCount: 0,
    scrollDepth: 0,
    lastAction: '',
    isStuck: false,
    hasErrors: false,
    experienceLevel: 'intermediate'
  });

  const [marketCondition, setMarketCondition] = React.useState<MarketCondition>({
    volatility: 2.5,
    priceChange24h: -3.2,
    volume: 1500000,
    alerts: []
  });

  // Monitor user behavior
  React.useEffect(() => {
    let visitStartTime = Date.now();
    let lastScrollY = window.scrollY;
    let scrollDepth = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentDepth = Math.min((currentScrollY / documentHeight) * 100, 100);
      scrollDepth = Math.max(scrollDepth, currentDepth);
    };

    const handleClick = () => {
      setUserBehavior(prev => ({
        ...prev,
        clickCount: prev.clickCount + 1,
        lastAction: 'click'
      }));
    };

    const updateBehavior = () => {
      const visitTime = Date.now() - visitStartTime;
      const isStuck = visitTime > 30000 && scrollDepth < 20; // 30s on page, minimal scroll
      
      setUserBehavior(prev => ({
        ...prev,
        pageVisitTime: visitTime,
        scrollDepth,
        isStuck
      }));
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('click', handleClick);
    const behaviorInterval = setInterval(updateBehavior, 5000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleClick);
      clearInterval(behaviorInterval);
    };
  }, []);

  // Calculate if assistant should show
  const shouldShow = React.useMemo(() => {
    const { isStuck, hasErrors, experienceLevel, pageVisitTime } = userBehavior;
    const { volatility, priceChange24h } = marketCondition;

    // Always show for beginners
    if (experienceLevel === 'beginner') return true;
    
    // Show when user seems stuck
    if (isStuck) return true;
    
    // Show on errors
    if (hasErrors) return true;
    
    // Show during high market volatility
    if (Math.abs(priceChange24h) > 5 || volatility > 5) return true;
    
    // Show after long visit with minimal interaction
    if (pageVisitTime > 60000 && userBehavior.clickCount < 3) return true;
    
    return false;
  }, [userBehavior, marketCondition]);

  return { shouldShow, userBehavior, marketCondition, setUserBehavior, setMarketCondition };
}

// Generate contextual suggestions
function useAssistantSuggestions(userBehavior: UserBehavior, marketCondition: MarketCondition) {
  return React.useMemo<AssistantSuggestion[]>(() => {
    const suggestions: AssistantSuggestion[] = [];

    // Beginner tips
    if (userBehavior.experienceLevel === 'beginner') {
      suggestions.push({
        id: 'beginner-tip',
        type: 'tip',
        title: '新手指南',
        description: '了解基础交易概念和风险管理',
        priority: 'high',
        icon: <Lightbulb className="h-4 w-4" />
      });
    }

    // Market volatility warnings
    if (Math.abs(marketCondition.priceChange24h) > 5) {
      suggestions.push({
        id: 'volatility-warning',
        type: 'warning',
        title: '市场波动剧烈',
        description: `24小时变化${marketCondition.priceChange24h.toFixed(1)}%，建议谨慎交易`,
        priority: 'high',
        icon: <AlertTriangle className="h-4 w-4" />
      });
    }

    // Stuck user assistance
    if (userBehavior.isStuck) {
      suggestions.push({
        id: 'help-stuck',
        type: 'action',
        title: '需要帮助吗？',
        description: '看起来你可能遇到了问题，我可以为你介绍页面功能',
        priority: 'medium',
        icon: <HelpCircle className="h-4 w-4" />
      });
    }

    // Trading opportunities
    if (marketCondition.volume > 1000000) {
      suggestions.push({
        id: 'trading-opportunity',
        type: 'opportunity',
        title: '交易机会',
        description: '当前交易量活跃，是交易的好时机',
        priority: 'medium',
        icon: <TrendingUp className="h-4 w-4" />
      });
    }

    // Quick actions
    suggestions.push({
      id: 'quick-trade',
      type: 'action',
      title: '快速交易',
      description: '一键设置常用交易参数',
      priority: 'low',
      icon: <Zap className="h-4 w-4" />
    });

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [userBehavior, marketCondition]);
}

// Main component
export function SmartFloatingAssistant() {
  const { shouldShow, userBehavior, marketCondition, setUserBehavior } = useSmartDisplayLogic();
  const suggestions = useAssistantSuggestions(userBehavior, marketCondition);
  
  const [state, setState] = React.useState<AssistantState>({
    isVisible: false,
    isExpanded: false,
    isMinimized: false,
    currentMode: 'suggestions',
    unreadCount: 0
  });

  const [isVoiceActive, setIsVoiceActive] = React.useState(false);
  const [currentMessage, setCurrentMessage] = React.useState('');

  // Show/hide logic
  React.useEffect(() => {
    if (shouldShow && !state.isVisible) {
      setState(prev => ({ ...prev, isVisible: true }));
    }
  }, [shouldShow, state.isVisible]);

  // Voice recognition (mock implementation)
  const handleVoiceToggle = React.useCallback(() => {
    setIsVoiceActive(prev => !prev);
    if (!isVoiceActive) {
      // Mock voice recognition
      setTimeout(() => {
        setCurrentMessage('语音输入: 帮我设置止损单');
        setIsVoiceActive(false);
      }, 3000);
    }
  }, [isVoiceActive]);

  // Handle suggestion click
  const handleSuggestionClick = React.useCallback((suggestion: AssistantSuggestion) => {
    if (suggestion.action) {
      suggestion.action();
    } else {
      // Default action - expand chat
      setState(prev => ({ 
        ...prev, 
        isExpanded: true, 
        currentMode: 'chat' 
      }));
      setCurrentMessage(`关于: ${suggestion.title}`);
    }
  }, []);

  // Don't render if not visible
  if (!state.isVisible) return null;

  return (
    <TooltipProvider>
      <div className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300 ease-out",
        state.isMinimized ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      )}>
        {/* Minimized state */}
        {!state.isExpanded && (
          <div className="relative">
            <Button
              onClick={() => setState(prev => ({ ...prev, isExpanded: true }))}
              className={cn(
                "relative h-14 w-14 rounded-full shadow-lg",
                "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700",
                "border-2 border-white/20",
                "transition-all duration-300 hover:scale-110"
              )}
            >
              <Bot className="h-6 w-6 text-white" />
              
              {/* Notification badge */}
              {state.unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {state.unreadCount > 9 ? '9+' : state.unreadCount}
                </Badge>
              )}
              
              {/* Pulse animation for high priority suggestions */}
              {suggestions.some(s => s.priority === 'high') && (
                <div className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse" />
              )}
            </Button>
            
            {/* Quick preview tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute inset-0" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">AI助手</p>
                  {suggestions.slice(0, 2).map(suggestion => (
                    <p key={suggestion.id} className="text-xs text-muted-foreground">
                      • {suggestion.title}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Expanded state */}
        {state.isExpanded && (
          <Card className="w-80 shadow-2xl border-border/50 backdrop-blur-sm bg-background/95">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">AI交易助手</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {state.currentMode === 'suggestions' ? '智能建议' : 
                       state.currentMode === 'chat' ? '对话模式' : 
                       state.currentMode === 'alerts' ? '市场提醒' : '语音助手'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleVoiceToggle}
                    className={cn(
                      "h-7 w-7 p-0",
                      isVoiceActive && "bg-red-500 text-white"
                    )}
                  >
                    <Mic className="h-3 w-3" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, isMinimized: true }))}
                    className="h-7 w-7 p-0"
                  >
                    <Minimize2 className="h-3 w-3" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, isExpanded: false }))}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Mode tabs */}
              <div className="flex gap-1">
                {[
                  { mode: 'suggestions' as const, icon: Lightbulb, label: '建议' },
                  { mode: 'chat' as const, icon: MessageCircle, label: '对话' },
                  { mode: 'alerts' as const, icon: AlertTriangle, label: '提醒' }
                ].map(({ mode, icon: Icon, label }) => (
                  <Button
                    key={mode}
                    variant={state.currentMode === mode ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, currentMode: mode }))}
                    className="flex-1 h-7 text-xs"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>

              <Separator />

              {/* Content area */}
              <div className="min-h-48 max-h-64 overflow-y-auto">
                {state.currentMode === 'suggestions' && (
                  <div className="space-y-2">
                    {suggestions.length > 0 ? suggestions.map(suggestion => (
                      <div 
                        key={suggestion.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          "hover:bg-muted/50",
                          suggestion.priority === 'high' && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10",
                          suggestion.priority === 'medium' && "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/10",
                          suggestion.priority === 'low' && "border-gray-200 dark:border-gray-800"
                        )}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            "mt-0.5 p-1 rounded",
                            suggestion.type === 'warning' && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                            suggestion.type === 'tip' && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                            suggestion.type === 'opportunity' && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                            suggestion.type === 'action' && "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                          )}>
                            {suggestion.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium mb-1">{suggestion.title}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {suggestion.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        暂无建议
                      </div>
                    )}
                  </div>
                )}

                {state.currentMode === 'chat' && (
                  <div className="space-y-3">
                    {currentMessage && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm">{currentMessage}</p>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">常用问题：</p>
                      {[
                        '如何设置止损？',
                        '什么是杠杆交易？',
                        '如何分析市场趋势？',
                        '怎样管理交易风险？'
                      ].map((question) => (
                        <Button
                          key={question}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs h-auto py-2 px-3"
                          onClick={() => setCurrentMessage(question)}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {state.currentMode === 'alerts' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">市场状况</p>
                      <Badge variant="outline" className="text-xs">
                        实时
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">24小时变化</span>
                          <span className={cn(
                            "text-sm font-mono",
                            marketCondition.priceChange24h >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {marketCondition.priceChange24h >= 0 ? '+' : ''}{marketCondition.priceChange24h.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">波动率</span>
                          <span className="text-sm font-mono">{marketCondition.volatility.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">24小时交易量</span>
                          <span className="text-sm font-mono">
                            ${(marketCondition.volume / 1000000).toFixed(1)}M
                          </span>
                        </div>
                      </div>

                      {marketCondition.alerts.length > 0 ? (
                        marketCondition.alerts.map((alert, index) => (
                          <div 
                            key={index}
                            className={cn(
                              "p-2 rounded border-l-4",
                              alert.type === 'danger' && "border-l-red-500 bg-red-50/50 dark:bg-red-900/10",
                              alert.type === 'warning' && "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10",
                              alert.type === 'info' && "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                            )}
                          >
                            <p className="text-xs">{alert.message}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-xs text-muted-foreground py-4">
                          暂无市场提醒
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Voice feedback */}
              {isVoiceActive && (
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <Volume2 className="h-4 w-4 text-red-600 animate-pulse" />
                  <span className="text-sm text-red-600 dark:text-red-400">正在聆听...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}