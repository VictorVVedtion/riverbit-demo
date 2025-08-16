import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
// Remove tooltip import to avoid dependency issues
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  X,
  Lightbulb,
  ArrowRight,
  Target,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';
import { useNewUserExperience } from '../../hooks/useNewUserExperience';

interface SmartTooltip {
  id: string;
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  priority: number;
  trigger: 'hover' | 'click' | 'auto';
  action?: {
    label: string;
    onClick: () => void;
  };
  condition?: () => boolean;
  delay?: number;
  persistent?: boolean;
}

interface SmartTooltipSystemProps {
  currentPage: string;
  isWalletConnected: boolean;
  onNavigate: (page: string) => void;
}

const SmartTooltipSystem: React.FC<SmartTooltipSystemProps> = ({
  currentPage,
  isWalletConnected,
  onNavigate
}) => {
  const {
    state,
    isNewUser,
    markStepCompleted,
    getContextualHints,
    toggleTooltips
  } = useNewUserExperience();

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [dismissedTooltips, setDismissedTooltips] = useState<Set<string>>(new Set());
  const [showHintsPanel, setShowHintsPanel] = useState(false);

  // Define smart tooltips for different contexts
  const smartTooltips: SmartTooltip[] = [
    // Trading page tooltips
    {
      id: 'wallet-connect-hint',
      target: '[data-wallet-button]',
      title: '连接钱包开始交易',
      content: '连接您的Web3钱包以开始使用RiverBit的所有功能。我们支持MetaMask、WalletConnect等主流钱包。',
      position: 'bottom',
      priority: 10,
      trigger: 'auto',
      delay: 2000,
      condition: () => !isWalletConnected && currentPage === 'trading',
      action: {
        label: '连接钱包',
        onClick: () => {
          // Trigger wallet connection
          const walletButton = document.querySelector('[data-wallet-button]') as HTMLButtonElement;
          walletButton?.click();
        }
      }
    },
    {
      id: 'trading-form-hint',
      target: '[data-trading-form]',
      title: '永续合约交易',
      content: '选择交易方向（做多/做空），设置杠杆和数量。建议新手从小额开始，逐步熟悉操作。',
      position: 'left',
      priority: 8,
      trigger: 'hover',
      condition: () => isWalletConnected && currentPage === 'trading' && isNewUser,
      action: {
        label: '了解更多',
        onClick: () => setShowHintsPanel(true)
      }
    },
    {
      id: 'ai-assistant-hint',
      target: '[data-ai-tab]',
      title: 'AI交易助手',
      content: '获取专业的市场分析和交易建议。问问AI："现在适合买入BTC吗？"',
      position: 'top',
      priority: 7,
      trigger: 'auto',
      delay: 5000,
      condition: () => isWalletConnected && currentPage === 'trading' && !state.hasUsedAI,
      action: {
        label: '试试AI助手',
        onClick: () => {
          const aiTab = document.querySelector('[data-ai-tab]') as HTMLButtonElement;
          aiTab?.click();
          markStepCompleted('ai_tutorial');
        }
      }
    },
    
    // RiverPool page tooltips
    {
      id: 'riverpool-intro',
      target: '[data-riverpool-overview]',
      title: '智能流动性池',
      content: '存入资金参与自动做市，获取稳定收益。年化收益率通常在15-30%。',
      position: 'bottom',
      priority: 9,
      trigger: 'auto',
      delay: 1000,
      condition: () => currentPage === 'riverpool' && !state.hasUsedRiverPool,
      action: {
        label: '开始存入',
        onClick: () => {
          const depositTab = document.querySelector('[data-deposit-tab]') as HTMLButtonElement;
          depositTab?.click();
        }
      }
    },
    {
      id: 'pool-risk-hint',
      target: '[data-risk-indicator]',
      title: '风险指标',
      content: '关注池子的风险状态。绿色表示安全，黄色需要注意，红色建议谨慎操作。',
      position: 'right',
      priority: 6,
      trigger: 'hover',
      condition: () => currentPage === 'riverpool'
    },

    // General navigation hints
    {
      id: 'navigation-hint',
      target: '[data-navigation]',
      title: '功能导航',
      content: '探索RiverBit的所有功能：交易、资产管理、RiverPool、推荐计划等。',
      position: 'bottom',
      priority: 5,
      trigger: 'hover',
      condition: () => isNewUser
    }
  ];

  // Filter active tooltips based on conditions
  const activeTooltips = smartTooltips.filter(tooltip => 
    state.showTooltips &&
    !dismissedTooltips.has(tooltip.id) &&
    (!tooltip.condition || tooltip.condition())
  );

  // Auto-show tooltips with delay
  useEffect(() => {
    const autoTooltips = activeTooltips.filter(t => 
      t.trigger === 'auto' && t.delay
    );

    const timers = autoTooltips.map(tooltip => 
      setTimeout(() => {
        setActiveTooltip(tooltip.id);
      }, tooltip.delay!)
    );

    return () => timers.forEach(clearTimeout);
  }, [activeTooltips, currentPage]);

  // Handle tooltip dismiss
  const dismissTooltip = (tooltipId: string) => {
    setDismissedTooltips(prev => new Set([...prev, tooltipId]));
    setActiveTooltip(null);
  };

  // Get contextual hints for current page
  const currentHints = getContextualHints(currentPage);

  // Smart Tooltip Component
  const SmartTooltipWrapper: React.FC<{ tooltip: SmartTooltip }> = ({ tooltip }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      if (tooltip.trigger === 'auto' && activeTooltip === tooltip.id) {
        setIsVisible(true);
      }
    }, [activeTooltip, tooltip.id, tooltip.trigger]);

    const tooltipContent = (
      <Card className="max-w-xs bg-surface-1 border border-river-blue/30 shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-river-blue" />
              <h4 className="font-semibold text-sm">{tooltip.title}</h4>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => dismissTooltip(tooltip.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          <p className="text-xs text-secondary mb-3 leading-relaxed">
            {tooltip.content}
          </p>
          
          <div className="flex items-center justify-between">
            {tooltip.action && (
              <Button
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  tooltip.action!.onClick();
                  dismissTooltip(tooltip.id);
                }}
              >
                {tooltip.action.label}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 text-secondary"
              onClick={() => dismissTooltip(tooltip.id)}
            >
              知道了
            </Button>
          </div>
        </CardContent>
      </Card>
    );

    if (tooltip.trigger === 'hover') {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <div className="absolute pointer-events-none" />
          </PopoverTrigger>
          <PopoverContent side={tooltip.position}>
            {tooltipContent}
          </PopoverContent>
        </Popover>
      );
    }

    if (tooltip.trigger === 'auto' && isVisible) {
      return (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            {tooltipContent}
          </div>
        </div>
      );
    }

    return null;
  };

  // Hints Panel Component
  const HintsPanel = () => (
    <div className="fixed bottom-4 right-4 z-40">
      <Popover open={showHintsPanel} onOpenChange={setShowHintsPanel}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            className="rounded-full h-12 w-12 shadow-lg bg-river-blue hover:bg-river-blue/90"
            title="查看提示"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="end" 
          className="w-80 p-0 bg-surface-1 border border-border shadow-xl"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-river-blue" />
                <h3 className="font-semibold">智能提示</h3>
              </div>
              <Badge variant="outline" className="text-xs">
                {currentPage}
              </Badge>
            </div>

            {currentHints.length > 0 ? (
              <div className="space-y-3">
                {currentHints.map((hint, index) => (
                  <div key={index} className="p-3 bg-surface-2 rounded-lg border border-border">
                    <p className="text-sm">{hint}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-secondary">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">当前页面暂无特别提示</p>
              </div>
            )}

            <div className="border-t border-border mt-4 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">显示智能提示</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleTooltips}
                  className={state.showTooltips ? 'text-river-blue' : 'text-secondary'}
                >
                  {state.showTooltips ? '开启' : '关闭'}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div>
      {/* Render active tooltips */}
      {activeTooltips.map(tooltip => (
        <SmartTooltipWrapper key={tooltip.id} tooltip={tooltip} />
      ))}
      
      {/* Hints panel for new users */}
      {isNewUser && <HintsPanel />}
      
      {/* Contextual help overlay */}
      {activeTooltip && (
        <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none" />
      )}
    </div>
  );
};

export default SmartTooltipSystem;