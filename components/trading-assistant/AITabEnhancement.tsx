import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface AITabEnhancementProps {
  isActive: boolean;
  hasOpportunities: boolean;
  marketCondition: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  onActivate: () => void;
}

export const AITabEnhancement: React.FC<AITabEnhancementProps> = ({
  isActive,
  hasOpportunities,
  marketCondition,
  onActivate
}) => {
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    // 有机会时显示脉冲效果
    if (hasOpportunities && !isActive) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [hasOpportunities, isActive]);

  const getMarketIcon = () => {
    switch (marketCondition) {
      case 'bullish': return <TrendingUp className="w-2 h-2 text-green-400" />;
      case 'bearish': return <TrendingUp className="w-2 h-2 text-red-400 rotate-180" />;
      case 'volatile': return <AlertCircle className="w-2 h-2 text-yellow-400" />;
      default: return null;
    }
  };

  const getMarketMessage = () => {
    switch (marketCondition) {
      case 'bullish': return 'Strong uptrend detected';
      case 'bearish': return 'Bearish signals found';
      case 'volatile': return 'High volatility period';
      default: return 'Market analysis ready';
    }
  };

  return (
    <div className="relative">
      {/* AI Tab with enhanced visual cues */}
      <button
        onClick={onActivate}
        className={`
          text-xs text-gray-300 data-[state=active]:text-white 
          data-[state=active]:bg-slate-700 flex items-center gap-1 px-3 py-2 
          transition-all duration-300 relative overflow-hidden
          ${showPulse ? 'animate-pulse' : ''}
          ${hasOpportunities ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20' : ''}
        `}
        data-state={isActive ? 'active' : 'inactive'}
      >
        <div className="relative">
          <Bot className={`w-3 h-3 transition-all duration-300 ${showPulse ? 'animate-bounce' : ''}`} />
          
          {/* Opportunity indicator */}
          {hasOpportunities && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping" />
          )}
          
          {/* Market condition indicator */}
          <div className="absolute -bottom-1 -right-1">
            {getMarketIcon()}
          </div>
        </div>
        
        <span className="font-medium">AI</span>
        
        {/* New feature badge */}
        {!isActive && (
          <Sparkles className="w-2 h-2 text-yellow-400 animate-pulse ml-1" />
        )}
      </button>

      {/* Smart tooltip/hint */}
      {hasOpportunities && !isActive && (
        <div className="absolute top-full left-0 mt-1 z-50 animate-fade-in">
          <div className="bg-slate-800 border border-blue-500/30 rounded-lg px-3 py-2 text-xs text-gray-300 shadow-lg">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
              <span>{getMarketMessage()}</span>
            </div>
            <div className="text-blue-400 mt-1">Click for AI analysis →</div>
          </div>
        </div>
      )}
    </div>
  );
};

// 新手引导组件
export const AIOnboardingTooltip: React.FC<{
  show: boolean;
  onDismiss: () => void;
}> = ({ show, onDismiss }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-6 mx-4 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-100">Meet Your AI Trading Assistant</h3>
            <p className="text-sm text-gray-300 font-medium">Get instant trading insights and strategies</p>
          </div>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span>Ask questions like "Should I buy BTC?"</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <div className="w-2 h-2 bg-blue-400 rounded-full" />
            <span>Get trading plans with entry/exit points</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <div className="w-2 h-2 bg-purple-400 rounded-full" />
            <span>Execute trades with one click</span>
          </div>
        </div>
        
        <Button onClick={onDismiss} className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
          Try AI Assistant
        </Button>
      </div>
    </div>
  );
};