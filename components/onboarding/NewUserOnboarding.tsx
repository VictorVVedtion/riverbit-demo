import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  CheckCircle,
  Circle,
  ArrowRight,
  Wallet,
  TrendingUp,
  Droplets,
  Shield,
  Target,
  Sparkles,
  AlertTriangle,
  Info,
  BookOpen,
  Play,
  Gift,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { RiverBrandText, RiverBrandButton, RiverBrandCard } from '../ui/riverbit-brand-system';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  completed: boolean;
  skippable?: boolean;
}

interface NewUserOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userAddress?: string;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  onNavigateTo: (page: string) => void;
}

const NewUserOnboarding: React.FC<NewUserOnboardingProps> = ({
  isOpen,
  onClose,
  onComplete,
  userAddress,
  isWalletConnected,
  onConnectWallet,
  onNavigateTo
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Initialize onboarding steps
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'welcome',
      title: '欢迎来到RiverBit',
      description: '专业级永续合约交易平台',
      icon: <Sparkles className="w-6 h-6" />,
      content: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-river-blue-main via-river-blue-light to-river-accent rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <div>
            <RiverBrandText variant="heading" gradient className="mb-4">
              欢迎来到RiverBit
            </RiverBrandText>
            <RiverBrandText variant="subtitle" className="text-secondary mb-6">
              全球领先的DeFi永续合约交易平台
            </RiverBrandText>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="p-4 bg-surface-2 rounded-lg">
              <TrendingUp className="w-6 h-6 text-river-blue mb-2" />
              <h4 className="font-semibold mb-1">永续交易</h4>
              <p className="text-sm text-secondary">专业级永续合约交易，支持高杠杆</p>
            </div>
            <div className="p-4 bg-surface-2 rounded-lg">
              <Droplets className="w-6 h-6 text-river-blue mb-2" />
              <h4 className="font-semibold mb-1">RiverPool</h4>
              <p className="text-sm text-secondary">智能流动性池，自动做市收益</p>
            </div>
            <div className="p-4 bg-surface-2 rounded-lg">
              <Sparkles className="w-6 h-6 text-river-blue mb-2" />
              <h4 className="font-semibold mb-1">AI助手</h4>
              <p className="text-sm text-secondary">智能交易分析和策略建议</p>
            </div>
            <div className="p-4 bg-surface-2 rounded-lg">
              <Shield className="w-6 h-6 text-river-blue mb-2" />
              <h4 className="font-semibold mb-1">安全保障</h4>
              <p className="text-sm text-secondary">多重安全机制，资金保护</p>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              RiverBit采用最先进的DeFi技术，为您提供专业、安全、高效的交易体验
            </AlertDescription>
          </Alert>
        </div>
      ),
      completed: false
    },
    {
      id: 'wallet',
      title: '连接钱包',
      description: '安全连接您的Web3钱包',
      icon: <Wallet className="w-6 h-6" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <RiverBrandText variant="subtitle" className="mb-2">
              连接您的钱包
            </RiverBrandText>
            <p className="text-secondary mb-6">
              连接钱包后即可开始交易，我们支持MetaMask等主流钱包
            </p>
          </div>

          {!isWalletConnected ? (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>安全提示：</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• 确保您访问的是官方网站</li>
                    <li>• 检查钱包地址的准确性</li>
                    <li>• 不要分享您的私钥或助记词</li>
                    <li>• 建议使用硬件钱包以获得最佳安全性</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <RiverBrandButton 
                onClick={onConnectWallet}
                className="w-full"
                size="lg"
              >
                <Wallet className="w-5 h-5 mr-2" />
                连接钱包
              </RiverBrandButton>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="font-semibold text-success">钱包连接成功！</p>
                <p className="text-sm text-secondary mt-1">
                  地址：{userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
                </p>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  钱包已连接，您现在可以进行交易、存入资金到RiverPool等操作
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      ),
      action: !isWalletConnected ? {
        label: '连接钱包',
        onClick: onConnectWallet,
        variant: 'primary' as const
      } : undefined,
      completed: isWalletConnected
    },
    {
      id: 'trading',
      title: '永续交易',
      description: '了解永续合约交易基础',
      icon: <TrendingUp className="w-6 h-6" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <RiverBrandText variant="subtitle" className="mb-2">
              永续合约交易
            </RiverBrandText>
            <p className="text-secondary mb-6">
              无需持有实际资产，通过价格差获取收益
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2 text-river-blue" />
                杠杆交易
              </h4>
              <p className="text-sm text-secondary">
                支持1x-100x杠杆，以小博大，但请注意风险控制
              </p>
            </div>
            
            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                做多/做空
              </h4>
              <p className="text-sm text-secondary">
                预期价格上涨时做多，预期下跌时做空，双向获利机会
              </p>
            </div>

            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-orange-500" />
                风险管理
              </h4>
              <p className="text-sm text-secondary">
                设置止损止盈，使用合理仓位，避免过度杠杆
              </p>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>风险提示：</strong>杠杆交易存在爆仓风险，请根据自身风险承受能力合理使用杠杆
            </AlertDescription>
          </Alert>
        </div>
      ),
      action: {
        label: '体验交易',
        onClick: () => onNavigateTo('trading'),
        variant: 'primary' as const
      },
      completed: false,
      skippable: true
    },
    {
      id: 'riverpool',
      title: 'RiverPool流动性池',
      description: '参与流动性挖矿，获得被动收益',
      icon: <Droplets className="w-6 h-6" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
              <Droplets className="w-8 h-8 text-white" />
            </div>
            <RiverBrandText variant="subtitle" className="mb-2">
              RiverPool智能流动性池
            </RiverBrandText>
            <p className="text-secondary mb-6">
              存入资金，让AI自动为您进行做市，获得稳定收益
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-cyan-600">自动做市</h4>
              <p className="text-sm text-secondary">
                智能算法自动调整价格，为交易者提供流动性，您获得手续费分成
              </p>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-green-600">稳定收益</h4>
              <p className="text-sm text-secondary">
                年化收益率通常在15-30%，相比传统理财产品具有明显优势
              </p>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-purple-600">灵活存取</h4>
              <p className="text-sm text-secondary">
                随时存入提取，流动性好，适合不同的资金需求
              </p>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              RiverPool采用先进的AMM算法，风险相对较低，适合稳健型投资者
            </AlertDescription>
          </Alert>
        </div>
      ),
      action: {
        label: '探索RiverPool',
        onClick: () => onNavigateTo('riverpool'),
        variant: 'primary' as const
      },
      completed: false,
      skippable: true
    },
    {
      id: 'ai-assistant',
      title: 'AI交易助手',
      description: '智能分析，专业建议',
      icon: <Sparkles className="w-6 h-6" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <RiverBrandText variant="subtitle" className="mb-2">
              AI交易助手
            </RiverBrandText>
            <p className="text-secondary mb-6">
              基于大数据和机器学习的智能交易分析系统
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2 text-purple-500" />
                智能分析
              </h4>
              <p className="text-sm text-secondary">
                实时分析市场数据，识别交易机会和风险信号
              </p>
            </div>
            
            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center">
                <BookOpen className="w-4 h-4 mr-2 text-blue-500" />
                策略建议
              </h4>
              <p className="text-sm text-secondary">
                根据市场情况提供个性化的交易策略和建议
              </p>
            </div>

            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-green-500" />
                风险提醒
              </h4>
              <p className="text-sm text-secondary">
                主动识别高风险操作，提供风险预警和建议
              </p>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
            <h4 className="font-semibold mb-2">常用问法示例：</h4>
            <ul className="text-sm text-secondary space-y-1">
              <li>• "现在适合买入BTC吗？"</li>
              <li>• "给我一个ETH的交易策略"</li>
              <li>• "帮我分析当前市场风险"</li>
              <li>• "我应该什么时候止损？"</li>
            </ul>
          </div>
        </div>
      ),
      action: {
        label: '体验AI助手',
        onClick: () => onNavigateTo('trading'),
        variant: 'primary' as const
      },
      completed: false,
      skippable: true
    },
    {
      id: 'complete',
      title: '新手教程完成',
      description: '开始您的RiverBit之旅',
      icon: <Gift className="w-6 h-6" />,
      content: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
            <Gift className="w-10 h-10 text-white" />
          </div>
          
          <div>
            <RiverBrandText variant="heading" className="mb-4">
              🎉 欢迎加入RiverBit！
            </RiverBrandText>
            <RiverBrandText variant="subtitle" className="text-secondary mb-6">
              您已完成新手教程，现在可以开始专业交易了
            </RiverBrandText>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <RiverBrandCard variant="trading" className="p-4">
              <h4 className="font-semibold mb-2">新手福利</h4>
              <ul className="text-sm text-secondary space-y-1 text-left">
                <li>• 首次交易免手续费</li>
                <li>• 新用户专享低风险策略推荐</li>
                <li>• 专属客服支持</li>
                <li>• RiverPool新手奖励计划</li>
              </ul>
            </RiverBrandCard>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              记住：理性投资，风险自控。遇到问题可随时咨询我们的AI助手或客服团队
            </AlertDescription>
          </Alert>
        </div>
      ),
      action: {
        label: '开始交易',
        onClick: () => {
          onComplete();
          onNavigateTo('trading');
        },
        variant: 'primary' as const
      },
      completed: false
    }
  ]);

  // Calculate progress
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Handle step completion
  const markStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
  };

  // Navigation handlers
  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      markStepCompleted(steps[currentStep].id);
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    setShowSkipDialog(false);
    onComplete();
  };

  // Auto-complete wallet step when connected
  useEffect(() => {
    if (isWalletConnected && steps[1]?.id === 'wallet') {
      markStepCompleted('wallet');
    }
  }, [isWalletConnected]);

  const currentStepData = steps[currentStep];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}>
        <DialogContent className="max-w-4xl sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-4xl xl:max-w-5xl h-[80vh] sm:h-[85vh] p-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row h-full min-h-[520px]">
            {/* Sidebar with progress */}
            <div className="w-full sm:w-80 bg-surface-2 p-6 border-b sm:border-b-0 sm:border-r border-border overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">新手引导</h3>
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-secondary mt-2">
                    步骤 {currentStep + 1} / {steps.length}
                  </p>
                </div>

                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        index === currentStep
                          ? 'bg-river-blue/10 border border-river-blue/30'
                          : index < currentStep || completedSteps.has(step.id)
                          ? 'bg-green-500/10 border border-green-500/30'
                          : 'bg-surface-3'
                      }`}
                    >
                      <div className={`flex-shrink-0 ${
                        index < currentStep || completedSteps.has(step.id)
                          ? 'text-green-500'
                          : index === currentStep
                          ? 'text-river-blue'
                          : 'text-muted'
                      }`}>
                        {index < currentStep || completedSteps.has(step.id) ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : index === currentStep ? (
                          step.icon
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm ${
                          index === currentStep ? 'text-river-blue' : 
                          index < currentStep || completedSteps.has(step.id) ? 'text-green-600' : 'text-muted'
                        }`}>
                          {step.title}
                        </h4>
                        <p className="text-xs text-secondary truncate">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-river-blue/10 rounded-lg text-river-blue">
                      {currentStepData.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{currentStepData.title}</h2>
                      <p className="text-secondary">{currentStepData.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSkipDialog(true)}
                    className="text-secondary hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                {currentStepData.content}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    上一步
                  </Button>

                  <div className="flex items-center space-x-3">
                    {currentStepData.skippable && (
                      <Button
                        variant="ghost"
                        onClick={goToNextStep}
                        className="text-secondary"
                      >
                        跳过
                      </Button>
                    )}
                    
                    {currentStepData.action ? (
                      <RiverBrandButton
                        onClick={() => {
                          currentStepData.action?.onClick();
                          if (currentStep < steps.length - 1) {
                            goToNextStep();
                          }
                        }}
                        variant={currentStepData.action.variant}
                      >
                        {currentStepData.action.label}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </RiverBrandButton>
                    ) : (
                      <RiverBrandButton
                        onClick={goToNextStep}
                        disabled={currentStep === steps.length - 1}
                      >
                        {currentStep === steps.length - 1 ? '完成' : '下一步'}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </RiverBrandButton>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skip confirmation dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>跳过新手引导？</DialogTitle>
            <DialogDescription>
              新手引导能帮助您快速了解RiverBit的核心功能和安全使用方法。
              确定要跳过吗？您随时可以在帮助中心重新查看教程。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkipDialog(false)}>
              继续引导
            </Button>
            <Button onClick={skipOnboarding}>
              确定跳过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewUserOnboarding;