import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// 统一状态管理 - 解决各模块独立运行问题
interface TradingAssistantState {
  // 用户状态
  user: {
    address?: string;
    isConnected: boolean;
    preferences: UserPreferences;
    onboardingComplete: boolean;
  };
  
  // 市场数据
  market: {
    currentSymbol: string;
    currentPrice: number;
    priceHistory: PriceData[];
    marketCondition: 'bullish' | 'bearish' | 'neutral' | 'volatile';
    lastUpdate: number;
  };
  
  // 交易计划
  tradingPlans: {
    active: TradingPlan[];
    history: TradingPlan[];
    currentPlan?: TradingPlan;
    generationInProgress: boolean;
  };
  
  // 机会雷达
  opportunities: {
    active: Opportunity[];
    alerts: Alert[];
    scanning: boolean;
    lastScan: number;
  };
  
  // 风险管理
  risk: {
    dailyLoss: number;
    maxDailyLoss: number;
    activePositions: Position[];
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    emergencyStop: boolean;
  };
  
  // 性能跟踪
  performance: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    bestTrade: Trade | null;
    worstTrade: Trade | null;
    currentDrawdown: number;
  };
  
  // UI状态
  ui: {
    activeTab: 'trading' | 'orderbook' | 'trades' | 'ai';
    chatOpen: boolean;
    showOnboarding: boolean;
    notifications: Notification[];
    theme: 'dark' | 'light';
  };
}

interface TradingAssistantActions {
  // 用户操作
  setUserAddress: (address: string) => void;
  setUserPreferences: (preferences: Partial<UserPreferences>) => void;
  completeOnboarding: () => void;
  
  // 市场数据操作
  updateMarketData: (symbol: string, price: number) => void;
  setMarketCondition: (condition: TradingAssistantState['market']['marketCondition']) => void;
  
  // 交易计划操作
  addTradingPlan: (plan: TradingPlan) => void;
  updateTradingPlan: (id: string, updates: Partial<TradingPlan>) => void;
  executeTradingPlan: (id: string) => void;
  setCurrentPlan: (plan: TradingPlan | undefined) => void;
  
  // 机会雷达操作
  addOpportunity: (opportunity: Opportunity) => void;
  removeOpportunity: (id: string) => void;
  addAlert: (alert: Alert) => void;
  clearAlert: (id: string) => void;
  setScanningStatus: (scanning: boolean) => void;
  
  // 风险管理操作
  updateRiskMetrics: (metrics: Partial<TradingAssistantState['risk']>) => void;
  triggerEmergencyStop: () => void;
  addPosition: (position: Position) => void;
  removePosition: (id: string) => void;
  
  // 性能跟踪操作
  updatePerformance: (metrics: Partial<TradingAssistantState['performance']>) => void;
  addTrade: (trade: Trade) => void;
  
  // UI操作
  setActiveTab: (tab: TradingAssistantState['ui']['activeTab']) => void;
  toggleChat: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  showOnboardingModal: () => void;
  hideOnboardingModal: () => void;
}

// 创建统一的状态管理store
export const useTradingAssistantStore = create<TradingAssistantState & TradingAssistantActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // 初始状态
      user: {
        isConnected: false,
        preferences: {
          riskTolerance: 'medium',
          notifications: true,
          autoExecute: false,
          theme: 'dark'
        },
        onboardingComplete: false
      },
      
      market: {
        currentSymbol: 'BTC',
        currentPrice: 0,
        priceHistory: [],
        marketCondition: 'neutral',
        lastUpdate: 0
      },
      
      tradingPlans: {
        active: [],
        history: [],
        generationInProgress: false
      },
      
      opportunities: {
        active: [],
        alerts: [],
        scanning: false,
        lastScan: 0
      },
      
      risk: {
        dailyLoss: 0,
        maxDailyLoss: 1000,
        activePositions: [],
        riskLevel: 'low',
        emergencyStop: false
      },
      
      performance: {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        bestTrade: null,
        worstTrade: null,
        currentDrawdown: 0
      },
      
      ui: {
        activeTab: 'trading',
        chatOpen: false,
        showOnboarding: false,
        notifications: [],
        theme: 'dark'
      },
      
      // Actions
      setUserAddress: (address) => set((state) => {
        state.user.address = address;
        state.user.isConnected = true;
      }),
      
      setUserPreferences: (preferences) => set((state) => {
        state.user.preferences = { ...state.user.preferences, ...preferences };
      }),
      
      completeOnboarding: () => set((state) => {
        state.user.onboardingComplete = true;
        state.ui.showOnboarding = false;
      }),
      
      updateMarketData: (symbol, price) => set((state) => {
        state.market.currentSymbol = symbol;
        state.market.currentPrice = price;
        state.market.lastUpdate = Date.now();
        
        // 添加到价格历史
        state.market.priceHistory.push({
          timestamp: Date.now(),
          price,
          symbol
        });
        
        // 保持最近100个数据点
        if (state.market.priceHistory.length > 100) {
          state.market.priceHistory = state.market.priceHistory.slice(-100);
        }
      }),
      
      setMarketCondition: (condition) => set((state) => {
        state.market.marketCondition = condition;
      }),
      
      addTradingPlan: (plan) => set((state) => {
        state.tradingPlans.active.push(plan);
      }),
      
      updateTradingPlan: (id, updates) => set((state) => {
        const plan = state.tradingPlans.active.find(p => p.id === id);
        if (plan) {
          Object.assign(plan, updates);
        }
      }),
      
      executeTradingPlan: (id) => set((state) => {
        const planIndex = state.tradingPlans.active.findIndex(p => p.id === id);
        if (planIndex !== -1) {
          const plan = state.tradingPlans.active[planIndex];
          plan.status = 'executing';
          
          // 移到历史记录
          state.tradingPlans.history.push({ ...plan, executedAt: Date.now() });
          state.tradingPlans.active.splice(planIndex, 1);
        }
      }),
      
      setCurrentPlan: (plan) => set((state) => {
        state.tradingPlans.currentPlan = plan;
      }),
      
      addOpportunity: (opportunity) => set((state) => {
        state.opportunities.active.push(opportunity);
      }),
      
      removeOpportunity: (id) => set((state) => {
        state.opportunities.active = state.opportunities.active.filter(o => o.id !== id);
      }),
      
      addAlert: (alert) => set((state) => {
        state.opportunities.alerts.push(alert);
        
        // 同时添加UI通知
        state.ui.notifications.push({
          id: Date.now().toString(),
          type: 'opportunity',
          title: alert.title,
          message: alert.message,
          timestamp: Date.now()
        });
      }),
      
      clearAlert: (id) => set((state) => {
        state.opportunities.alerts = state.opportunities.alerts.filter(a => a.id !== id);
      }),
      
      setScanningStatus: (scanning) => set((state) => {
        state.opportunities.scanning = scanning;
        if (scanning) {
          state.opportunities.lastScan = Date.now();
        }
      }),
      
      updateRiskMetrics: (metrics) => set((state) => {
        Object.assign(state.risk, metrics);
      }),
      
      triggerEmergencyStop: () => set((state) => {
        state.risk.emergencyStop = true;
        
        // 添加紧急停止通知
        state.ui.notifications.push({
          id: Date.now().toString(),
          type: 'emergency',
          title: 'Emergency Stop Activated',
          message: 'All trading activities have been suspended',
          timestamp: Date.now()
        });
      }),
      
      addPosition: (position) => set((state) => {
        state.risk.activePositions.push(position);
      }),
      
      removePosition: (id) => set((state) => {
        state.risk.activePositions = state.risk.activePositions.filter(p => p.id !== id);
      }),
      
      updatePerformance: (metrics) => set((state) => {
        Object.assign(state.performance, metrics);
      }),
      
      addTrade: (trade) => set((state) => {
        state.performance.totalTrades += 1;
        state.performance.totalPnL += trade.pnl;
        
        // 更新最佳/最差交易
        if (!state.performance.bestTrade || trade.pnl > state.performance.bestTrade.pnl) {
          state.performance.bestTrade = trade;
        }
        if (!state.performance.worstTrade || trade.pnl < state.performance.worstTrade.pnl) {
          state.performance.worstTrade = trade;
        }
        
        // 计算胜率
        // 这里需要访问历史交易数据来计算胜率
      }),
      
      setActiveTab: (tab) => set((state) => {
        state.ui.activeTab = tab;
        
        // 如果切换到AI标签，关闭引导
        if (tab === 'ai' && state.ui.showOnboarding) {
          state.ui.showOnboarding = false;
        }
      }),
      
      toggleChat: () => set((state) => {
        state.ui.chatOpen = !state.ui.chatOpen;
      }),
      
      addNotification: (notification) => set((state) => {
        state.ui.notifications.push(notification);
        
        // 限制通知数量
        if (state.ui.notifications.length > 10) {
          state.ui.notifications = state.ui.notifications.slice(-10);
        }
      }),
      
      removeNotification: (id) => set((state) => {
        state.ui.notifications = state.ui.notifications.filter(n => n.id !== id);
      }),
      
      showOnboardingModal: () => set((state) => {
        state.ui.showOnboarding = true;
      }),
      
      hideOnboardingModal: () => set((state) => {
        state.ui.showOnboarding = false;
      })
    }))
  )
);

// 智能选择器hooks
export const useMarketData = () => useTradingAssistantStore((state) => state.market);
export const useOpportunities = () => useTradingAssistantStore((state) => state.opportunities);
export const useRiskStatus = () => useTradingAssistantStore((state) => state.risk);
export const usePerformance = () => useTradingAssistantStore((state) => state.performance);
export const useUIState = () => useTradingAssistantStore((state) => state.ui);

// 复合选择器
export const useAITabState = () => {
  return useTradingAssistantStore((state) => ({
    hasOpportunities: state.opportunities.active.length > 0,
    marketCondition: state.market.marketCondition,
    isActive: state.ui.activeTab === 'ai',
    showOnboarding: state.ui.showOnboarding && !state.user.onboardingComplete,
    notifications: state.ui.notifications
  }));
};

// 类型定义
interface UserPreferences {
  riskTolerance: 'low' | 'medium' | 'high';
  notifications: boolean;
  autoExecute: boolean;
  theme: 'dark' | 'light';
}

interface PriceData {
  timestamp: number;
  price: number;
  symbol: string;
}

interface TradingPlan {
  id: string;
  symbol: string;
  action: 'buy' | 'sell';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  status: 'pending' | 'executing' | 'executed' | 'cancelled';
  reasoning: string[];
  createdAt: number;
  executedAt?: number;
}

interface Opportunity {
  id: string;
  symbol: string;
  type: 'breakout' | 'reversal' | 'momentum';
  confidence: number;
  description: string;
  timestamp: number;
}

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'opportunity' | 'risk' | 'info';
  timestamp: number;
}

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  timestamp: number;
}

interface Notification {
  id: string;
  type: 'opportunity' | 'risk' | 'emergency' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: number;
}