import { useState, useEffect, useCallback } from 'react';

interface UserOnboardingState {
  hasSeenOnboarding: boolean;
  completedSteps: string[];
  currentStep: number;
  firstLogin: boolean;
  hasConnectedWallet: boolean;
  hasMadeFirstTrade: boolean;
  hasUsedRiverPool: boolean;
  hasUsedAI: boolean;
  showWelcomeMessage: boolean;
  showTooltips: boolean;
  onboardingVersion: string;
}

interface NewUserFeature {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector or page
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
  condition?: () => boolean;
}

export const useNewUserExperience = () => {
  const ONBOARDING_VERSION = '1.0.0';
  const STORAGE_KEY = 'riverbit_user_onboarding';

  // Initialize state from localStorage
  const [state, setState] = useState<UserOnboardingState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check if onboarding version changed
        if (parsed.onboardingVersion !== ONBOARDING_VERSION) {
          return getDefaultState();
        }
        return parsed;
      } catch {
        return getDefaultState();
      }
    }
    return getDefaultState();
  });

  function getDefaultState(): UserOnboardingState {
    return {
      hasSeenOnboarding: false,
      completedSteps: [],
      currentStep: 0,
      firstLogin: true,
      hasConnectedWallet: false,
      hasMadeFirstTrade: false,
      hasUsedRiverPool: false,
      hasUsedAI: false,
      showWelcomeMessage: true,
      showTooltips: true,
      onboardingVersion: ONBOARDING_VERSION
    };
  }

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // New user experience features
  const newUserFeatures: NewUserFeature[] = [
    {
      id: 'wallet-connection',
      title: '连接钱包',
      description: '点击右上角连接您的钱包开始使用',
      target: '[data-wallet-button]',
      position: 'bottom',
      condition: () => !state.hasConnectedWallet
    },
    {
      id: 'trading-interface',
      title: '交易界面',
      description: '这里是专业的永续合约交易面板',
      target: '[data-trading-panel]',
      position: 'left',
      condition: () => state.hasConnectedWallet && !state.hasMadeFirstTrade
    },
    {
      id: 'ai-assistant',
      title: 'AI交易助手',
      description: '点击AI标签获取智能交易建议',
      target: '[data-ai-tab]',
      position: 'top',
      condition: () => state.hasConnectedWallet && !state.hasUsedAI
    },
    {
      id: 'riverpool',
      title: 'RiverPool流动性池',
      description: '在这里参与流动性挖矿获取收益',
      target: '[data-riverpool-nav]',
      position: 'bottom',
      condition: () => state.hasConnectedWallet && !state.hasUsedRiverPool
    }
  ];

  // Actions
  const markOnboardingComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasSeenOnboarding: true,
      firstLogin: false,
      showWelcomeMessage: false
    }));
  }, []);

  const markStepCompleted = useCallback((stepId: string) => {
    setState(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, stepId])]
    }));
  }, []);

  const markWalletConnected = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasConnectedWallet: true
    }));
  }, []);

  const markFirstTrade = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasMadeFirstTrade: true
    }));
  }, []);

  const markRiverPoolUsed = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasUsedRiverPool: true
    }));
  }, []);

  const markAIUsed = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasUsedAI: true
    }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: step
    }));
  }, []);

  const dismissWelcomeMessage = useCallback(() => {
    setState(prev => ({
      ...prev,
      showWelcomeMessage: false
    }));
  }, []);

  const toggleTooltips = useCallback(() => {
    setState(prev => ({
      ...prev,
      showTooltips: !prev.showTooltips
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setState(getDefaultState());
  }, []);

  // Check if user should see onboarding
  const shouldShowOnboarding = !state.hasSeenOnboarding && state.firstLogin;

  // Get active features based on conditions
  const getActiveFeatures = useCallback(() => {
    return newUserFeatures.filter(feature => 
      state.showTooltips && 
      (!feature.condition || feature.condition())
    );
  }, [state.showTooltips, newUserFeatures]);

  // Check if user is new (less than 7 days since first login)
  const isNewUser = useCallback(() => {
    // This would ideally check account creation date
    // For now, we'll use a simple check
    return !state.hasMadeFirstTrade || 
           !state.hasUsedRiverPool || 
           !state.hasUsedAI;
  }, [state.hasMadeFirstTrade, state.hasUsedRiverPool, state.hasUsedAI]);

  // Get onboarding progress percentage
  const getOnboardingProgress = useCallback(() => {
    const totalSteps = 5; // welcome, wallet, trading, riverpool, ai
    const completed = state.completedSteps.length;
    return Math.round((completed / totalSteps) * 100);
  }, [state.completedSteps]);

  // Check if specific milestones are reached
  const hasReachedMilestone = useCallback((milestone: string) => {
    switch (milestone) {
      case 'wallet_connected':
        return state.hasConnectedWallet;
      case 'first_trade':
        return state.hasMadeFirstTrade;
      case 'riverpool_used':
        return state.hasUsedRiverPool;
      case 'ai_used':
        return state.hasUsedAI;
      case 'onboarding_complete':
        return state.hasSeenOnboarding;
      default:
        return false;
    }
  }, [state]);

  // New user hints and tips
  const getContextualHints = useCallback((currentPage: string) => {
    const hints: Record<string, string[]> = {
      trading: [
        '💡 提示：新手建议从小额交易开始，熟悉操作后再增加仓位',
        '⚡ 快捷键：按Space键快速切换买卖方向',
        '🛡️ 风险提醒：记得设置止损价格保护您的资金'
      ],
      riverpool: [
        '💰 收益提示：RiverPool的年化收益通常在15-30%之间',
        '📊 多样化：建议分散投资不同的池子降低风险',
        '🔄 灵活性：可以随时提取，但建议长期持有获得更好收益'
      ],
      assets: [
        '📈 资产管理：定期检查您的投资组合表现',
        '💎 长期投资：考虑将部分资金投入稳定的流动性池',
        '📊 分析工具：使用AI助手分析您的投资策略'
      ]
    };

    return hints[currentPage] || [];
  }, []);

  return {
    // State
    state,
    shouldShowOnboarding,
    isNewUser: isNewUser(),
    onboardingProgress: getOnboardingProgress(),
    
    // Features and hints
    activeFeatures: getActiveFeatures(),
    getContextualHints,
    
    // Actions
    markOnboardingComplete,
    markStepCompleted,
    markWalletConnected,
    markFirstTrade,
    markRiverPoolUsed,
    markAIUsed,
    setCurrentStep,
    dismissWelcomeMessage,
    toggleTooltips,
    resetOnboarding,
    hasReachedMilestone
  };
};