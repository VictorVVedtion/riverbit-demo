import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Alert, AlertDescription } from '../ui/alert';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  DollarSign,
  Bookmark,
  BookmarkCheck,
  Share2,
  Edit,
  Trash2,
  MoreHorizontal,
  PlayCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  TrendingDown as Risk,
  Activity
} from 'lucide-react';
import { TradingPlan, TradingPlanCardProps, RiskLevel, PlanDirection } from './types';
import { formatNumber } from '../../utils/web3Utils';

/**
 * Professional Trading Plan Card Component
 * Matches RiverBit's glass morphism and gradient design system
 */
const TradingPlanCard: React.FC<TradingPlanCardProps> = ({
  plan,
  isBookmarked = false,
  onExecute,
  onBookmark,
  onShare,
  onModify,
  onDelete,
  showActions = true,
  compact = false,
  className = ''
}) => {
  const [isExecuting, setIsExecuting] = useState(false);

  // Risk level styling
  const getRiskLevelStyles = (risk: RiskLevel) => {
    switch (risk) {
      case 'low':
        return {
          color: 'text-green-400',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20'
        };
      case 'medium':
        return {
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/20'
        };
      case 'high':
        return {
          color: 'text-orange-400',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/20'
        };
      case 'extreme':
        return {
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20'
        };
    }
  };

  // Direction styling
  const getDirectionStyles = (direction: PlanDirection) => {
    return direction === 'long' 
      ? {
          color: 'text-green-400',
          bg: 'bg-green-500/10',
          icon: TrendingUp
        }
      : {
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          icon: TrendingDown
        };
  };

  // Status styling
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'text-blue-400', bg: 'bg-blue-500/10' };
      case 'executed':
        return { color: 'text-green-400', bg: 'bg-green-500/10' };
      case 'expired':
        return { color: 'text-gray-300 font-medium', bg: 'bg-slate-800/500/10' };
      case 'cancelled':
        return { color: 'text-red-400', bg: 'bg-red-500/10' };
      default:
        return { color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    }
  };

  const riskStyles = getRiskLevelStyles(plan.riskLevel);
  const directionStyles = getDirectionStyles(plan.direction);
  const statusStyles = getStatusStyles(plan.status);
  const DirectionIcon = directionStyles.icon;

  // Calculate time remaining
  const timeRemaining = plan.validUntil.getTime() - Date.now();
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
  const isExpiringSoon = hoursRemaining < 24;

  // Handle execution
  const handleExecute = async () => {
    if (!onExecute) return;
    
    setIsExecuting(true);
    try {
      await onExecute(plan);
    } finally {
      setIsExecuting(false);
    }
  };

  // Format percentage
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <Card 
      className={`
        glass-card card-modern relative overflow-hidden transition-all duration-300
        hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10
        ${compact ? 'p-3' : 'p-4'}
        ${className}
      `}
    >
      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-river-blue-main/5 pointer-events-none" />
      
      {/* Header */}
      <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <DirectionIcon className={`h-5 w-5 ${directionStyles.color}`} />
              <CardTitle className="text-lg font-semibold text-foreground">
                {plan.symbol}
              </CardTitle>
            </div>
            
            {/* Direction Badge */}
            <Badge 
              variant="outline" 
              className={`${directionStyles.bg} ${directionStyles.color} border-current/20 capitalize`}
            >
              {plan.direction}
            </Badge>
          </div>

          {/* Actions */}
          {showActions && (
            <CardAction>
              <div className="flex items-center gap-2">
                {/* Bookmark */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onBookmark?.(plan.id)}
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>

                {/* More Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onShare?.(plan)}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Plan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onModify?.(plan)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modify Plan
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(plan.id)}
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Plan
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardAction>
          )}
        </div>

        {/* Status and Risk Badges */}
        <div className="flex items-center gap-2 mt-2">
          <Badge 
            variant="outline" 
            className={`${statusStyles.bg} ${statusStyles.color} border-current/20 capitalize`}
          >
            {plan.status}
          </Badge>
          
          <Badge 
            variant="outline" 
            className={`${riskStyles.bg} ${riskStyles.color} border-current/20 capitalize`}
          >
            <Risk className="h-3 w-3 mr-1" />
            {plan.riskLevel} Risk
          </Badge>
          
          {isExpiringSoon && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
              <Clock className="h-3 w-3 mr-1" />
              {hoursRemaining}h left
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Levels */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Entry</p>
            <p className="text-sm font-semibold text-foreground">
              ${formatNumber(plan.entry)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Stop Loss</p>
            <p className="text-sm font-semibold text-red-400">
              ${formatNumber(plan.stopLoss)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Take Profit</p>
            <p className="text-sm font-semibold text-green-400">
              ${formatNumber(plan.takeProfit)}
            </p>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="space-y-3">
          {/* Confidence Meter */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground">Confidence</span>
              <span className="text-xs font-semibold text-primary">
                {formatPercentage(plan.confidence)}
              </span>
            </div>
            <Progress 
              value={plan.confidence} 
              className="h-2 bg-primary/20"
            />
          </div>

          {/* Risk/Reward Ratio */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">R:R Ratio</p>
              <p className="text-sm font-semibold text-river-accent">
                1:{plan.riskRewardRatio.toFixed(1)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Max Loss</p>
              <p className="text-sm font-semibold text-red-400">
                ${formatNumber(plan.maxLoss)}
              </p>
            </div>
          </div>
        </div>

        {/* Reasoning */}
        {!compact && plan.reasoning && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Analysis</p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {plan.reasoning}
            </p>
          </div>
        )}

        {/* Technical Indicators */}
        {!compact && plan.technicalIndicators && plan.technicalIndicators.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Indicators</p>
            <div className="flex flex-wrap gap-2">
              {plan.technicalIndicators.slice(0, 3).map((indicator, index) => (
                <Badge 
                  key={index}
                  variant="outline" 
                  className={`text-xs ${
                    indicator.signal === 'bullish' ? 'text-green-400 border-green-500/20' :
                    indicator.signal === 'bearish' ? 'text-red-400 border-red-500/20' :
                    'text-gray-300 font-medium border-gray-500/20'
                  }`}
                >
                  {indicator.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Warning for high risk */}
        {plan.riskLevel === 'extreme' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is an extreme risk trade. Only risk capital you can afford to lose.
            </AlertDescription>
          </Alert>
        )}

        {/* Execute Button */}
        {plan.status === 'active' && onExecute && (
          <Button
            onClick={handleExecute}
            disabled={isExecuting}
            className={`
              w-full btn-modern
              ${plan.direction === 'long' 
                ? 'btn-trading-long bg-green-600 hover:bg-green-700' 
                : 'btn-trading-short bg-red-600 hover:bg-red-700'
              }
              text-white font-medium
            `}
          >
            {isExecuting ? (
              <>
                <div className="loading-spinner h-4 w-4 mr-2" />
                Executing...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Execute Trade
              </>
            )}
          </Button>
        )}

        {/* Time and Creator Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            <span>{plan.timeFrame} • {plan.createdBy === 'ai' ? 'AI Generated' : 'Manual'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Valid until {plan.validUntil.toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingPlanCard;