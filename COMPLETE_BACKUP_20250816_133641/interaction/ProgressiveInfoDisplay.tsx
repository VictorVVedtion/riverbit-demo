"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Separator } from "../ui/separator";
import {
  ChevronDown,
  ChevronRight,
  Info,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  Clock,
  DollarSign,
  Percent,
  Target,
  Shield
} from "lucide-react";

// Types
interface InfoLevel {
  key: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
  priority: number;
  category: 'basic' | 'detailed' | 'advanced';
  requiresInteraction?: boolean;
}

interface UserProfile {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredComplexity: 'simple' | 'standard' | 'detailed';
  visitCount: number;
  focusAreas: string[];
}

interface DisplayContext {
  screenSize: 'mobile' | 'tablet' | 'desktop';
  currentPage: string;
  userAttention: 'high' | 'medium' | 'low';
  timeOnPage: number;
}

// Progressive Info Hook
function useProgressiveInfo(
  infoLevels: InfoLevel[],
  userProfile: UserProfile,
  context: DisplayContext
) {
  const [visibleLevels, setVisibleLevels] = React.useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());
  const [userPreferences, setUserPreferences] = React.useState({
    autoExpand: true,
    showAdvanced: userProfile.experienceLevel === 'advanced',
    compactMode: context.screenSize === 'mobile'
  });

  // Determine which info levels to show based on user profile and context
  const filteredLevels = React.useMemo(() => {
    return infoLevels
      .filter(level => {
        // Filter by experience level
        if (level.category === 'advanced' && userProfile.experienceLevel === 'beginner') {
          return false;
        }
        
        // Filter by user preferences
        if (level.category === 'advanced' && !userPreferences.showAdvanced) {
          return false;
        }
        
        // Filter by screen size
        if (context.screenSize === 'mobile' && level.category === 'detailed' && !visibleLevels.has(level.key)) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => b.priority - a.priority);
  }, [infoLevels, userProfile, context, userPreferences, visibleLevels]);

  // Auto-expand logic based on user behavior
  React.useEffect(() => {
    if (!userPreferences.autoExpand) return;

    const timer = setTimeout(() => {
      if (context.timeOnPage > 10000 && context.userAttention === 'low') {
        // User seems stuck, show more info
        const nextLevel = filteredLevels.find(level => 
          !visibleLevels.has(level.key) && level.category === 'detailed'
        );
        if (nextLevel) {
          setVisibleLevels(prev => new Set([...prev, nextLevel.key]));
        }
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [context.timeOnPage, context.userAttention, filteredLevels, visibleLevels, userPreferences]);

  const toggleLevel = React.useCallback((levelKey: string) => {
    setVisibleLevels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(levelKey)) {
        newSet.delete(levelKey);
      } else {
        newSet.add(levelKey);
      }
      return newSet;
    });
  }, []);

  const toggleSection = React.useCallback((sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  }, []);

  return {
    filteredLevels,
    visibleLevels,
    expandedSections,
    userPreferences,
    setUserPreferences,
    toggleLevel,
    toggleSection
  };
}

// Trading Metric Component with Progressive Disclosure
interface ProgressiveTradingMetricProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'percentage' | 'absolute';
  infoLevels: InfoLevel[];
  userProfile: UserProfile;
  context: DisplayContext;
  className?: string;
}

export function ProgressiveTradingMetric({
  title,
  value,
  change,
  changeType = 'percentage',
  infoLevels,
  userProfile,
  context,
  className
}: ProgressiveTradingMetricProps) {
  const {
    filteredLevels,
    visibleLevels,
    expandedSections,
    userPreferences,
    toggleLevel,
    toggleSection
  } = useProgressiveInfo(infoLevels, userProfile, context);

  const isPositive = change ? change > 0 : null;
  const changeColor = isPositive === null ? 'text-muted-foreground' : 
                     isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <TooltipProvider>
      <Card className={cn("relative overflow-hidden", className)}>
        {/* Layer 1: Core Data (Always Visible) */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            {filteredLevels.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('main')}
                className="h-6 w-6 p-0"
              >
                {expandedSections.has('main') ? 
                  <ChevronDown className="h-3 w-3" /> : 
                  <ChevronRight className="h-3 w-3" />
                }
              </Button>
            )}
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{value}</span>
            {change !== undefined && (
              <Badge variant="secondary" className={cn("text-xs", changeColor)}>
                {isPositive ? '+' : ''}{change.toFixed(changeType === 'percentage' ? 2 : 4)}
                {changeType === 'percentage' ? '%' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* Layer 2: Detailed Information (Hover/Click to Show) */}
        <Collapsible open={expandedSections.has('main')}>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Basic info level */}
              {filteredLevels.filter(l => l.category === 'basic').map(level => (
                <div key={level.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {level.icon}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground cursor-help">
                          {level.label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{level.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="font-mono">
                    {/* Mock data based on level */}
                    {level.key === 'volume24h' ? '$1.2M' :
                     level.key === 'high24h' ? '$52,340' :
                     level.key === 'low24h' ? '$49,820' : 'N/A'}
                  </span>
                </div>
              ))}

              {/* Detailed info level */}
              {filteredLevels.filter(l => l.category === 'detailed').map(level => (
                <div key={level.key}>
                  {!visibleLevels.has(level.key) && level.requiresInteraction ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleLevel(level.key)}
                      className="w-full justify-start text-xs h-8"
                    >
                      <Eye className="h-3 w-3 mr-2" />
                      显示 {level.label}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {level.icon}
                          <span className="text-sm text-muted-foreground">{level.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {/* Mock detailed data */}
                            {level.key === 'marketCap' ? '$980.5B' :
                             level.key === 'circulatingSupply' ? '19.2M BTC' :
                             level.key === 'maxSupply' ? '21M BTC' : 'N/A'}
                          </span>
                          {level.requiresInteraction && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLevel(level.key)}
                              className="h-6 w-6 p-0"
                            >
                              <EyeOff className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">
                        {level.description}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Advanced info level */}
              {filteredLevels.filter(l => l.category === 'advanced').map(level => (
                <Collapsible key={level.key} open={visibleLevels.has(level.key)}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLevel(level.key)}
                      className="w-full justify-between text-xs h-8 p-2"
                    >
                      <div className="flex items-center gap-2">
                        {level.icon}
                        <span>{level.label}</span>
                        <Badge variant="outline" className="text-xs">高级</Badge>
                      </div>
                      {visibleLevels.has(level.key) ? 
                        <ChevronDown className="h-3 w-3" /> : 
                        <ChevronRight className="h-3 w-3" />
                      }
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 pt-2">
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">指标值:</span>
                          <span className="ml-2 font-mono">
                            {level.key === 'technicalAnalysis' ? 'RSI: 45.2' :
                             level.key === 'onChainMetrics' ? 'NVT: 23.4' :
                             level.key === 'derivatives' ? 'OI: $12.3B' : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">变化:</span>
                          <span className="ml-2 font-mono text-green-600">+2.1%</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground">{level.description}</p>
                      
                      {/* Mini chart or visualization */}
                      <div className="h-12 bg-muted/30 rounded flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground ml-2">图表视图</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}

              {/* Layer 3: Advanced Data (Click to Expand) */}
              {filteredLevels.some(l => l.category === 'advanced') && (
                <Separator />
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </TooltipProvider>
  );
}

// Portfolio Overview with Progressive Disclosure
interface ProgressivePortfolioProps {
  userProfile: UserProfile;
  context: DisplayContext;
  className?: string;
}

export function ProgressivePortfolioOverview({
  userProfile,
  context,
  className
}: ProgressivePortfolioProps) {
  const portfolioInfoLevels: InfoLevel[] = [
    // Layer 1 - Core
    {
      key: 'totalValue',
      label: '总价值',
      description: '投资组合的当前总价值',
      icon: <DollarSign className="h-4 w-4" />,
      priority: 100,
      category: 'basic'
    },
    {
      key: 'todayPnL',
      label: '今日盈亏',
      description: '今天的盈亏变化',
      icon: <TrendingUp className="h-4 w-4" />,
      priority: 90,
      category: 'basic'
    },
    
    // Layer 2 - Detailed
    {
      key: 'allocation',
      label: '资产分配',
      description: '各类资产在投资组合中的占比',
      icon: <Target className="h-4 w-4" />,
      priority: 80,
      category: 'detailed',
      requiresInteraction: true
    },
    {
      key: 'performance',
      label: '历史表现',
      description: '投资组合的历史收益表现',
      icon: <BarChart3 className="h-4 w-4" />,
      priority: 70,
      category: 'detailed'
    },
    
    // Layer 3 - Advanced
    {
      key: 'riskMetrics',
      label: '风险指标',
      description: '投资组合的风险评估指标',
      icon: <Shield className="h-4 w-4" />,
      priority: 60,
      category: 'advanced'
    },
    {
      key: 'correlations',
      label: '相关性分析',
      description: '资产间的相关性和多样化程度',
      icon: <BarChart3 className="h-4 w-4" />,
      priority: 50,
      category: 'advanced'
    }
  ];

  const mockData = {
    totalValue: 125430.50,
    todayChange: 2847.30,
    todayChangePercent: 2.32
  };

  return (
    <div className={cn("space-y-4", className)}>
      <ProgressiveTradingMetric
        title="投资组合总览"
        value={`$${mockData.totalValue.toLocaleString()}`}
        change={mockData.todayChangePercent}
        changeType="percentage"
        infoLevels={portfolioInfoLevels}
        userProfile={userProfile}
        context={context}
      />
    </div>
  );
}

// Trading Position with Progressive Disclosure
interface ProgressivePositionProps {
  symbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  userProfile: UserProfile;
  context: DisplayContext;
  className?: string;
}

export function ProgressivePositionCard({
  symbol,
  size,
  entryPrice,
  currentPrice,
  userProfile,
  context,
  className
}: ProgressivePositionProps) {
  const positionPnL = (currentPrice - entryPrice) * size;
  const positionPnLPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

  const positionInfoLevels: InfoLevel[] = [
    {
      key: 'entryPrice',
      label: '入场价格',
      description: '建仓时的平均价格',
      icon: <DollarSign className="h-4 w-4" />,
      priority: 90,
      category: 'basic'
    },
    {
      key: 'currentPrice',
      label: '当前价格',
      description: '最新市场价格',
      icon: <TrendingUp className="h-4 w-4" />,
      priority: 85,
      category: 'basic'
    },
    {
      key: 'marketValue',
      label: '市场价值',
      description: '持仓的当前市场价值',
      icon: <DollarSign className="h-4 w-4" />,
      priority: 80,
      category: 'detailed'
    },
    {
      key: 'stopLoss',
      label: '止损设置',
      description: '当前设置的止损价格和距离',
      icon: <Shield className="h-4 w-4" />,
      priority: 75,
      category: 'detailed',
      requiresInteraction: true
    },
    {
      key: 'riskReward',
      label: '风险收益比',
      description: '该持仓的风险收益分析',
      icon: <Target className="h-4 w-4" />,
      priority: 60,
      category: 'advanced'
    },
    {
      key: 'technicals',
      label: '技术分析',
      description: '基于技术指标的分析建议',
      icon: <BarChart3 className="h-4 w-4" />,
      priority: 55,
      category: 'advanced'
    }
  ];

  return (
    <ProgressiveTradingMetric
      title={`${symbol} 持仓`}
      value={size.toFixed(4)}
      change={positionPnLPercent}
      changeType="percentage"
      infoLevels={positionInfoLevels}
      userProfile={userProfile}
      context={context}
      className={className}
    />
  );
}

// Configuration Panel for User Preferences
interface InfoDisplayConfigProps {
  userProfile: UserProfile;
  onProfileUpdate: (profile: Partial<UserProfile>) => void;
  className?: string;
}

export function InfoDisplayConfig({
  userProfile,
  onProfileUpdate,
  className
}: InfoDisplayConfigProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="h-4 w-4" />
          信息显示设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">经验等级</label>
          <div className="grid grid-cols-3 gap-2">
            {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
              <Button
                key={level}
                variant={userProfile.experienceLevel === level ? "default" : "outline"}
                size="sm"
                onClick={() => onProfileUpdate({ experienceLevel: level })}
                className="text-xs"
              >
                {level === 'beginner' ? '新手' : 
                 level === 'intermediate' ? '进阶' : '专家'}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">信息详细度</label>
          <div className="grid grid-cols-3 gap-2">
            {(['simple', 'standard', 'detailed'] as const).map(complexity => (
              <Button
                key={complexity}
                variant={userProfile.preferredComplexity === complexity ? "default" : "outline"}
                size="sm"
                onClick={() => onProfileUpdate({ preferredComplexity: complexity })}
                className="text-xs"
              >
                {complexity === 'simple' ? '简洁' : 
                 complexity === 'standard' ? '标准' : '详细'}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}