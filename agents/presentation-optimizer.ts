/**
 * RiverBit Presentation Optimizer Agent
 * 专业级投资人演示数据优化和美化系统
 */

import { mockAssets, mockPositions, mockTradingPairs, mockRiverPoolData, mockAllocationData } from '../data/mockData';
import { assetData } from '../data/assetsData';
import { poolData, userData, xStockPairs, systemPositions } from '../data/riverPoolData';

// 演示优化配置接口
interface PresentationConfig {
  demoMode: 'investor' | 'user' | 'technical';
  narrativeTheme: 'growth' | 'stability' | 'innovation' | 'comprehensive';
  dataEnhancement: {
    increaseMetrics: boolean;
    addTrendlines: boolean;
    enhanceVisuals: boolean;
    optimizeNumbers: boolean;
  };
  targetAudience: 'vcs' | 'institutions' | 'retail' | 'technical';
}

// 演示数据优化器
export class PresentationOptimizer {
  private config: PresentationConfig;
  private originalData: {
    mockAssets: any[];
    mockPositions: any[];
    poolData: any;
    userData: any;
  } = {
    mockAssets: [],
    mockPositions: [],
    poolData: {},
    userData: {}
  };
  
  constructor(config: PresentationConfig) {
    this.config = config;
    this.backupOriginalData();
  }

  private backupOriginalData() {
    this.originalData = {
      mockAssets: [...mockAssets],
      mockPositions: [...mockPositions],
      poolData: { ...poolData },
      userData: { ...userData }
    };
  }

  // 核心优化：投资人演示数据美化
  optimizeForInvestorDemo(): OptimizedDemoData {
    return {
      // 1. 关键指标增强
      enhancedMetrics: this.enhanceKeyMetrics(),
      
      // 2. 视觉数据优化
      visualOptimizations: this.optimizeVisualData(),
      
      // 3. 故事线设计
      narrativeFlow: this.createNarrativeFlow(),
      
      // 4. 数据模拟场景
      simulatedScenarios: this.createDemoScenarios(),
      
      // 5. 专业性提升
      professionalEnhancements: this.addProfessionalElements()
    };
  }

  // 1. 关键指标增强
  private enhanceKeyMetrics() {
    const multiplier = this.config.demoMode === 'investor' ? 1.5 : 1.2;
    
    return {
      // TVL 增强
      enhancedTVL: {
        current: Math.round(poolData.tvl * multiplier),
        growth30d: 145.2, // 展示强劲增长
        monthlyTrend: [8500000, 9200000, 10800000, 12450000],
        projectedTVL: Math.round(poolData.tvl * multiplier * 2.5) // 6个月预测
      },
      
      // APY 优化展示
      enhancedAPY: {
        current: Math.round(poolData.apr30d * 1.1 * 10) / 10,
        historical: [18.5, 22.1, 26.8, 31.2, 28.9, 24.8],
        benchmark: {
          tradfi: 3.5,
          defiAverage: 8.2,
          riverbit: poolData.apr30d
        }
      },
      
      // 用户增长数据
      userGrowthMetrics: {
        totalUsers: 8547,
        activeUsers: 6234,
        monthlyGrowth: 34.5,
        retentionRate: 87.3,
        averageDeposit: 12450
      },
      
      // 交易性能指标
      tradingPerformance: {
        winRate: 82.4,
        sharpeRatio: 2.67,
        maxDrawdown: 2.1,
        volatility: 6.8,
        totalTrades: 45678,
        profitFactor: 3.45
      }
    };
  }

  // 2. 视觉数据优化
  private optimizeVisualData() {
    return {
      // 图表配置优化
      chartConfigurations: {
        tvlChart: {
          type: 'area',
          gradient: true,
          smoothing: true,
          annotations: [
            { x: '2024-01-15', text: '机构投资者入场', type: 'milestone' },
            { x: '2024-02-01', text: 'xStock 上线', type: 'feature' },
            { x: '2024-03-01', text: 'TVL 突破 1000万', type: 'achievement' }
          ]
        },
        
        performanceChart: {
          type: 'composite',
          showBenchmarks: true,
          highlightPeriods: ['bull_market', 'volatile_period', 'stable_growth'],
          overlays: ['volume', 'apy', 'user_growth']
        }
      },
      
      // 颜色主题优化
      enhancedTheme: {
        primary: '#10B981', // 成功绿色
        secondary: '#3B82F6', // 专业蓝色
        accent: '#F59E0B', // 警告黄色
        success: '#059669',
        gradients: {
          bullish: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          bearish: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          neutral: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)'
        }
      },
      
      // 动画和交互增强
      animations: {
        countUp: true,
        staggered: true,
        hoverEffects: 'enhanced',
        loadingTransitions: 'smooth'
      }
    };
  }

  // 3. 故事线设计
  private createNarrativeFlow() {
    const narratives = {
      growth: {
        title: "RiverBit: 引领 DeFi 2.0 创新浪潮",
        chapters: [
          {
            title: "市场痛点与机遇",
            highlights: ["传统 DeFi 流动性分散", "用户体验复杂", "收益不稳定"],
            data: ["DeFi TVL 增长 340%", "用户需求未被满足", "技术创新空间巨大"]
          },
          {
            title: "RiverBit 创新解决方案",
            highlights: ["统一流动性池", "AI 驱动策略", "xStock 股票永续"],
            data: ["APY 提升 3x", "滑点降低 60%", "用户留存率 87%"]
          },
          {
            title: "强劲增长数据",
            highlights: ["TVL 快速增长", "用户规模扩大", "技术指标领先"],
            data: ["月增长率 45%", "8500+ 活跃用户", "Sharpe 比率 2.67"]
          },
          {
            title: "未来发展路线",
            highlights: ["多链扩展", "机构产品", "全球化布局"],
            data: ["目标 TVL 1亿", "合作机构 50+", "支持 10+ 链"]
          }
        ]
      },
      
      stability: {
        title: "RiverBit: 稳健收益的 DeFi 基础设施",
        chapters: [
          {
            title: "风险管理体系",
            highlights: ["多层风险控制", "实时监控系统", "保险基金保障"],
            data: ["最大回撤 < 3%", "99.9% 系统可用性", "保险基金覆盖率 12%"]
          },
          {
            title: "稳定收益表现",
            highlights: ["持续正收益", "低波动性", "可预测回报"],
            data: ["年化收益 24.8%", "波动率 6.8%", "正收益天数 89%"]
          }
        ]
      }
    };
    
    return narratives[this.config.narrativeTheme] || narratives.growth;
  }

  // 4. 演示场景构造
  private createDemoScenarios() {
    return {
      // 实时交易场景
      liveTrading: {
        name: "实时交易展示",
        duration: "5分钟",
        script: [
          "展示实时价格更新",
          "执行一笔 xAAPL 交易",
          "显示 P&L 实时变化",
          "展示风险控制机制"
        ],
        data: this.generateLiveTradingData()
      },
      
      // 流动性池演示
      liquidityDemo: {
        name: "RiverPool 流动性演示",
        duration: "3分钟",
        script: [
          "展示存款流程",
          "实时收益计算",
          "系统持仓管理",
          "收益分配机制"
        ],
        data: this.generateLiquidityData()
      },
      
      // 压力测试场景
      stressTest: {
        name: "系统稳定性展示",
        duration: "2分钟",
        script: [
          "模拟市场波动",
          "风险控制响应",
          "系统自动调整",
          "保护机制激活"
        ],
        data: this.generateStressTestData()
      }
    };
  }

  // 5. 专业性提升
  private addProfessionalElements() {
    return {
      // 技术架构展示
      architecture: {
        diagrams: [
          "system_overview.svg",
          "liquidity_flow.svg", 
          "risk_management.svg",
          "scaling_architecture.svg"
        ],
        metrics: {
          tps: 10000,
          latency: "<50ms",
          uptime: "99.95%",
          nodes: 12
        }
      },
      
      // 财务模型
      financialModel: {
        revenueStreams: [
          { name: "交易手续费", contribution: 45, growth: 23.5 },
          { name: "资金费率", contribution: 30, growth: 18.2 },
          { name: "清算费用", contribution: 15, growth: 12.8 },
          { name: "其他收入", contribution: 10, growth: 8.5 }
        ],
        projections: {
          year1: { revenue: 2400000, profit: 1680000, margin: 70 },
          year2: { revenue: 8500000, profit: 5950000, margin: 70 },
          year3: { revenue: 24000000, profit: 16800000, margin: 70 }
        }
      },
      
      // 竞争优势分析
      competitiveAnalysis: {
        metrics: [
          { name: "APY", riverbit: 24.8, competitor1: 12.5, competitor2: 8.9 },
          { name: "滑点", riverbit: 0.02, competitor1: 0.08, competitor2: 0.15 },
          { name: "Gas 费用", riverbit: 0.003, competitor1: 0.012, competitor2: 0.025 },
          { name: "支持资产", riverbit: 50, competitor1: 15, competitor2: 8 }
        ]
      }
    };
  }

  // 生成实时交易数据
  private generateLiveTradingData() {
    return {
      symbol: "xAAPL/USDT",
      entryPrice: 185.50,
      currentPrice: 187.20,
      position: 1000,
      pnl: 1700,
      pnlPercent: 0.92,
      sequence: [
        { time: 0, price: 185.50, action: "entry" },
        { time: 30, price: 186.20, action: "update" },
        { time: 60, price: 187.20, action: "profit" },
        { time: 90, price: 186.80, action: "volatility" },
        { time: 120, price: 187.50, action: "exit" }
      ]
    };
  }

  // 生成流动性数据
  private generateLiquidityData() {
    return {
      depositAmount: 10000,
      rLPReceived: 9234.56,
      estimatedAPY: 28.9,
      dailyEarnings: 7.93,
      systemStats: {
        totalTVL: 14250000,
        utilizationRate: 78.5,
        avgAPY: 24.8
      }
    };
  }

  // 生成压力测试数据
  private generateStressTestData() {
    return {
      scenario: "市场急跌 -15%",
      systemResponse: {
        positionAdjustment: "自动减仓 30%",
        hedging: "开启对冲策略",
        liquidity: "启动紧急流动性",
        downside: "最大回撤 2.8%"
      },
      recovery: {
        timeToStable: "45秒",
        systemHealth: "98.5%",
        userImpact: "最小化"
      }
    };
  }

  // 获取优化后的演示数据
  getOptimizedData(component: string) {
    const optimized = this.optimizeForInvestorDemo();
    
    switch (component) {
      case 'dashboard':
        return this.optimizeDashboardData(optimized);
      case 'trading':
        return this.optimizeTradingData(optimized);
      case 'riverpool':
        return this.optimizeRiverPoolData(optimized);
      case 'analytics':
        return this.optimizeAnalyticsData(optimized);
      default:
        return optimized;
    }
  }

  // 仪表板数据优化
  private optimizeDashboardData(optimized: OptimizedDemoData) {
    return {
      keyMetrics: {
        totalTVL: optimized.enhancedMetrics.enhancedTVL.current,
        currentAPY: optimized.enhancedMetrics.enhancedAPY.current,
        totalUsers: optimized.enhancedMetrics.userGrowthMetrics.totalUsers,
        winRate: optimized.enhancedMetrics.tradingPerformance.winRate
      },
      trendData: optimized.enhancedMetrics.enhancedTVL.monthlyTrend,
      alerts: [
        { type: 'success', message: 'TVL 创历史新高！', importance: 'high' },
        { type: 'info', message: '新增 xStock 交易对 3 个', importance: 'medium' }
      ]
    };
  }

  // 交易数据优化
  private optimizeTradingData(optimized: OptimizedDemoData) {
    return {
      enhancedPairs: mockTradingPairs.map(pair => ({
        ...pair,
        volume: this.enhanceVolume(pair.volume),
        change24h: this.smoothenChange(pair.change24h),
        technicalIndicators: this.addTechnicalIndicators(pair.symbol)
      })),
      marketInsights: this.generateMarketInsights(),
      tradingSignals: this.generateTradingSignals()
    };
  }

  // RiverPool 数据优化
  private optimizeRiverPoolData(optimized: OptimizedDemoData) {
    return {
      enhancedStats: {
        ...poolData,
        tvl: optimized.enhancedMetrics.enhancedTVL.current,
        apr30d: optimized.enhancedMetrics.enhancedAPY.current,
        userCount: optimized.enhancedMetrics.userGrowthMetrics.totalUsers
      },
      systemPerformance: optimized.enhancedMetrics.tradingPerformance,
      projections: optimized.professionalEnhancements.financialModel.projections
    };
  }

  // 分析数据优化
  private optimizeAnalyticsData(optimized: OptimizedDemoData) {
    return {
      performanceMetrics: optimized.enhancedMetrics.tradingPerformance,
      growthAnalytics: optimized.enhancedMetrics.userGrowthMetrics,
      marketComparison: optimized.professionalEnhancements.competitiveAnalysis,
      riskMetrics: {
        var95: 2.3,
        expectedShortfall: 3.1,
        correlationMatrix: this.generateCorrelationMatrix()
      }
    };
  }

  // 辅助方法
  private enhanceVolume(volume: string): string {
    const num = parseFloat(volume.replace(/[^\d.]/g, ''));
    const enhanced = num * 1.3;
    return volume.includes('B') ? `${enhanced.toFixed(1)}B` : 
           volume.includes('M') ? `${enhanced.toFixed(1)}M` : 
           `${enhanced.toFixed(0)}K`;
  }

  private smoothenChange(change: number): number {
    // 使演示数据看起来更稳定
    return Math.round(change * 0.8 * 100) / 100;
  }

  private addTechnicalIndicators(symbol: string) {
    return {
      rsi: Math.random() * 40 + 40, // 40-80 范围
      macd: Math.random() * 2 - 1,
      bollinger: {
        upper: Math.random() * 10 + 5,
        lower: Math.random() * 5,
        signal: Math.random() > 0.5 ? 'bullish' : 'neutral'
      }
    };
  }

  private generateMarketInsights() {
    return [
      {
        title: "xStock 市场表现强劲",
        description: "科技股永续合约交易量增长 45%",
        impact: "positive",
        confidence: 87
      },
      {
        title: "流动性深度持续改善",
        description: "平均滑点降低至 0.02%",
        impact: "positive", 
        confidence: 93
      }
    ];
  }

  private generateTradingSignals() {
    return [
      { symbol: "xAAPL/USDT", signal: "BUY", strength: 85, reason: "技术突破" },
      { symbol: "xNVDA/USDT", signal: "HOLD", strength: 65, reason: "整理阶段" },
      { symbol: "BTC/USDT", signal: "BUY", strength: 78, reason: "支撑位反弹" }
    ];
  }

  private generateCorrelationMatrix() {
    return {
      "xAAPL": { "xMSFT": 0.72, "xNVDA": 0.68, "BTC": 0.23 },
      "xMSFT": { "xAAPL": 0.72, "xNVDA": 0.65, "BTC": 0.19 },
      "xNVDA": { "xAAPL": 0.68, "xMSFT": 0.65, "BTC": 0.31 },
      "BTC": { "xAAPL": 0.23, "xMSFT": 0.19, "xNVDA": 0.31 }
    };
  }

  // 重置为原始数据
  resetToOriginal() {
    Object.assign(mockAssets, this.originalData.mockAssets);
    Object.assign(mockPositions, this.originalData.mockPositions);
    Object.assign(poolData, this.originalData.poolData);
    Object.assign(userData, this.originalData.userData);
  }

  // 保存演示配置
  saveConfig(name: string) {
    const config = {
      name,
      config: this.config,
      timestamp: Date.now(),
      optimizations: this.optimizeForInvestorDemo()
    };
    
    localStorage.setItem(`riverbit-demo-${name}`, JSON.stringify(config));
    return config;
  }

  // 加载演示配置
  loadConfig(name: string) {
    const saved = localStorage.getItem(`riverbit-demo-${name}`);
    if (saved) {
      const config = JSON.parse(saved);
      this.config = config.config;
      return config.optimizations;
    }
    return null;
  }
}

// 类型定义
interface OptimizedDemoData {
  enhancedMetrics: {
    enhancedTVL: any;
    enhancedAPY: any;
    userGrowthMetrics: any;
    tradingPerformance: any;
  };
  visualOptimizations: {
    chartConfigurations: any;
    enhancedTheme: any;
    animations: any;
  };
  narrativeFlow: {
    title: string;
    chapters: any[];
  };
  simulatedScenarios: {
    liveTrading: any;
    liquidityDemo: any;
    stressTest: any;
  };
  professionalEnhancements: {
    architecture: any;
    financialModel: any;
    competitiveAnalysis: any;
  };
}

// 预设配置
export const DEMO_PRESETS = {
  // VC 投资人演示
  vc_pitch: {
    demoMode: 'investor' as const,
    narrativeTheme: 'growth' as const,
    dataEnhancement: {
      increaseMetrics: true,
      addTrendlines: true,
      enhanceVisuals: true,
      optimizeNumbers: true
    },
    targetAudience: 'vcs' as const
  },
  
  // 机构投资者演示
  institutional: {
    demoMode: 'investor' as const,
    narrativeTheme: 'stability' as const,
    dataEnhancement: {
      increaseMetrics: false,
      addTrendlines: true,
      enhanceVisuals: true,
      optimizeNumbers: false
    },
    targetAudience: 'institutions' as const
  },
  
  // 技术展示
  technical_demo: {
    demoMode: 'technical' as const,
    narrativeTheme: 'innovation' as const,
    dataEnhancement: {
      increaseMetrics: false,
      addTrendlines: true,
      enhanceVisuals: false,
      optimizeNumbers: false
    },
    targetAudience: 'technical' as const
  },
  
  // 零售用户演示
  retail_demo: {
    demoMode: 'user' as const,
    narrativeTheme: 'comprehensive' as const,
    dataEnhancement: {
      increaseMetrics: false,
      addTrendlines: false,
      enhanceVisuals: true,
      optimizeNumbers: true
    },
    targetAudience: 'retail' as const
  }
};

// 演示效果评估
export class PresentationAnalytics {
  private metrics: {
    timestamp: number;
    event: string;
    data: any;
  }[] = [];
  
  // 记录演示指标
  trackMetric(event: string, data: Record<string, any>) {
    this.metrics.push({
      timestamp: Date.now(),
      event,
      data
    });
  }
  
  // 生成演示报告
  generateReport() {
    return {
      totalDuration: this.calculateDuration(),
      engagementScore: this.calculateEngagement(),
      keyHighlights: this.extractHighlights(),
      recommendedImprovements: this.generateRecommendations()
    };
  }
  
  private calculateDuration() {
    if (this.metrics.length === 0) return 0;
    return this.metrics[this.metrics.length - 1].timestamp - this.metrics[0].timestamp;
  }
  
  private calculateEngagement() {
    const interactions = this.metrics.filter(m => m.event.includes('interaction'));
    return Math.min(100, interactions.length * 5);
  }
  
  private extractHighlights() {
    return [
      "用户对 TVL 增长数据关注度高",
      "xStock 交易功能获得积极反馈", 
      "RiverPool 收益率展示效果良好"
    ];
  }
  
  private generateRecommendations() {
    return [
      "增加实时数据更新频率",
      "优化移动端展示效果",
      "添加更多交互式图表"
    ];
  }
}

// 导出默认实例
export const presentationOptimizer = new PresentationOptimizer(DEMO_PRESETS.vc_pitch);
export const presentationAnalytics = new PresentationAnalytics();

// 快速启动演示优化
export const startOptimizedDemo = (preset: keyof typeof DEMO_PRESETS = 'vc_pitch') => {
  const optimizer = new PresentationOptimizer(DEMO_PRESETS[preset]);
  return optimizer.optimizeForInvestorDemo();
};