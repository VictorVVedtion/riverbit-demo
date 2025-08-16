import React, { useState, useEffect } from 'react';
import { Bot, TrendingUp, TrendingDown, AlertTriangle, Zap, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface SmartAIPromptsProps {
  selectedSymbol: string;
  currentPrice: number;
  priceChange24h: number;
  volume: number;
  onPromptClick: (prompt: string) => void;
  onDismiss: () => void;
}

interface MarketCondition {
  type: 'breakout' | 'dip' | 'volatility' | 'momentum' | 'reversal';
  urgency: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestedPrompt: string;
  icon: React.ReactNode;
  color: string;
}

export const SmartAIPrompts: React.FC<SmartAIPromptsProps> = ({
  selectedSymbol,
  currentPrice,
  priceChange24h,
  volume,
  onPromptClick,
  onDismiss
}) => {
  const [currentCondition, setCurrentCondition] = useState<MarketCondition | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // 分析市场条件并生成智能提示
  useEffect(() => {
    const analyzeMarketCondition = (): MarketCondition | null => {
      const absChange = Math.abs(priceChange24h);
      
      // 突破条件 (涨幅 > 5% 且有音量)
      if (priceChange24h > 5 && volume > 1.5) {
        return {
          type: 'breakout',
          urgency: 'high',
          title: `${selectedSymbol} Breaking Out!`,
          description: `${priceChange24h.toFixed(1)}% surge with high volume`,
          suggestedPrompt: `${selectedSymbol} is pumping hard! Should I chase this momentum or wait for a pullback?`,
          icon: <TrendingUp className="w-4 h-4" />,
          color: 'text-green-400'
        };
      }
      
      // 大幅下跌 (跌幅 > 5%)
      if (priceChange24h < -5) {
        return {
          type: 'dip',
          urgency: 'high',
          title: `${selectedSymbol} Major Dip`,
          description: `${Math.abs(priceChange24h).toFixed(1)}% drop - potential opportunity?`,
          suggestedPrompt: `${selectedSymbol} is down ${Math.abs(priceChange24h).toFixed(1)}% today. Is this a good buying opportunity or should I wait?`,
          icon: <TrendingDown className="w-4 h-4" />,
          color: 'text-red-400'
        };
      }
      
      // 高波动 (绝对变化 > 3%)
      if (absChange > 3) {
        return {
          type: 'volatility',
          urgency: 'medium',
          title: `${selectedSymbol} High Volatility`,
          description: `${absChange.toFixed(1)}% movement - trading opportunities`,
          suggestedPrompt: `${selectedSymbol} is very volatile today. What's the best strategy to trade this volatility?`,
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'text-yellow-400'
        };
      }
      
      // 稳定上涨 (涨幅 2-5%)
      if (priceChange24h > 2 && priceChange24h <= 5) {
        return {
          type: 'momentum',
          urgency: 'medium',
          title: `${selectedSymbol} Steady Momentum`,
          description: `${priceChange24h.toFixed(1)}% healthy growth`,
          suggestedPrompt: `${selectedSymbol} is showing steady upward momentum. Should I add to my position or take profits?`,
          icon: <Zap className="w-4 h-4" />,
          color: 'text-blue-400'
        };
      }
      
      // 反转信号 (前期大涨后小幅回调)
      if (priceChange24h > -2 && priceChange24h < 2 && volume > 1.2) {
        return {
          type: 'reversal',
          urgency: 'low',
          title: `${selectedSymbol} Potential Setup`,
          description: 'Consolidation phase - watch for signals',
          suggestedPrompt: `${selectedSymbol} is consolidating. What should I watch for to catch the next move?`,
          icon: <Sparkles className="w-4 h-4" />,
          color: 'text-purple-400'
        };
      }
      
      return null;
    };

    const condition = analyzeMarketCondition();
    setCurrentCondition(condition);
    
    // 显示提示（仅高紧急度或用户首次使用）
    const isFirstTime = !localStorage.getItem('ai-prompts-seen');
    if (condition && (condition.urgency === 'high' || isFirstTime)) {
      setShowPrompt(true);
      localStorage.setItem('ai-prompts-seen', 'true');
    }
  }, [selectedSymbol, priceChange24h, volume]);

  // 自动隐藏提示
  useEffect(() => {
    if (showPrompt) {
      const timer = setTimeout(() => {
        setShowPrompt(false);
      }, 15000); // 15秒后自动隐藏
      
      return () => clearTimeout(timer);
    }
  }, [showPrompt]);

  if (!currentCondition || !showPrompt) {
    return null;
  }

  const handlePromptClick = () => {
    onPromptClick(currentCondition.suggestedPrompt);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss();
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-slide-in-right">
      <Card className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className={`${currentCondition.color}`}>
                {currentCondition.icon}
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-100">
                  {currentCondition.title}
                </h4>
                <p className="text-xs text-gray-300 font-medium">
                  {currentCondition.description}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-gray-300 font-medium hover:text-gray-200"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Urgency Badge */}
          <div className="flex items-center space-x-2 mb-3">
            <Badge 
              variant={currentCondition.urgency === 'high' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {currentCondition.urgency === 'high' ? '🔥 Hot' : 
               currentCondition.urgency === 'medium' ? '⚡ Active' : '👀 Watch'}
            </Badge>
            <span className="text-xs text-gray-300 font-medium">
              Click AI tab for analysis
            </span>
          </div>

          {/* AI Suggestion */}
          <div className="space-y-3">
            <p className="text-xs text-gray-300 italic">
              "Ask me: {currentCondition.suggestedPrompt.substring(0, 50)}..."
            </p>
            
            <div className="flex space-x-2">
              <Button
                onClick={handlePromptClick}
                size="sm"
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-8"
              >
                <Bot className="w-3 h-3 mr-1" />
                Ask AI
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-gray-300 font-medium border-slate-600"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// AI Tab 脉冲指示器组件
export const AITabPulse: React.FC<{
  hasAlert: boolean;
  urgency: 'low' | 'medium' | 'high';
}> = ({ hasAlert, urgency }) => {
  if (!hasAlert) return null;

  const getColorClass = () => {
    switch (urgency) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className={`absolute -top-1 -right-1 w-3 h-3 ${getColorClass()} rounded-full animate-ping`}>
      <div className={`w-3 h-3 ${getColorClass()} rounded-full`} />
    </div>
  );
};

// 首次使用指导tooltip
export const FirstTimeAITooltip: React.FC<{
  show: boolean;
  targetRef: React.RefObject<HTMLElement>;
  onComplete: () => void;
}> = ({ show, targetRef, onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "🤖 Meet Your AI Trading Assistant",
      content: "I can analyze markets, suggest strategies, and help you make better trading decisions.",
      action: "Got it!"
    },
    {
      title: "📊 Real-time Market Analysis",
      content: "I monitor price movements and alert you to trading opportunities as they happen.",
      action: "Cool!"
    },
    {
      title: "⚡ One-Click Trading Plans",
      content: "Ask me anything like 'Should I buy BTC?' and get executable trading plans instantly.",
      action: "Let's try it!"
    }
  ];

  if (!show) return null;

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center">
      {/* Spotlight effect */}
      <div 
        className="absolute inset-0 bg-gradient-radial from-transparent via-black/40 to-black/80"
        onClick={() => setStep(steps.length)}
      />
      
      {/* Tooltip */}
      <div className="relative z-10 bg-slate-900 border border-blue-500/30 rounded-xl p-6 mx-4 max-w-md shadow-2xl">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-100 mb-2">
            {currentStep.title}
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            {currentStep.content}
          </p>
          
          {/* Progress dots */}
          <div className="flex justify-center space-x-2 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index <= step ? 'bg-blue-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
          
          <Button
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                localStorage.setItem('ai-onboarding-complete', 'true');
                onComplete();
              }
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {currentStep.action}
          </Button>
        </div>
      </div>
    </div>
  );
};