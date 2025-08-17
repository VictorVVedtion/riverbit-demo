/**
 * Trading Plan Generator - AI计划卡生成服务
 * 从自然语言查询生成可执行的交易计划
 */

import { TradingPlan } from '../components/ai/TradingPlanCard';
import { riskManager } from './RiskManagementEngine';

// 市场状态枚举
export enum MarketRegime {
  TRENDING_HIGH_VOL = 'trending_high_vol',
  TRENDING_LOW_VOL = 'trending_low_vol', 
  RANGING_HIGH_VOL = 'ranging_high_vol',
  RANGING_LOW_VOL = 'ranging_low_vol'
}

// 技术指标分析结果
interface TechnicalAnalysis {
  sma20: number;
  sma50: number;
  rsi: number;
  atr: number;
  volume24h: number;
  volatility: number;
  support: number;
  resistance: number;
  regime: MarketRegime;
}

// 查询解析结果
interface QueryIntent {
  symbol: string;
  action: 'buy' | 'sell' | 'analyze' | 'check';
  timeframe?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

class TradingPlanGenerator {
  // 模拟技术分析数据（实际应接入真实数据源）
  private async getTechnicalAnalysis(symbol: string): Promise<TechnicalAnalysis> {
    // 模拟数据 - 实际应接入TradingView或其他数据源
    const mockPrice = symbol === 'BTC/USDT' ? 43500 : 2650;
    const mockVolatility = 0.02 + Math.random() * 0.03; // 2-5%波动率
    
    return {
      sma20: mockPrice * (0.98 + Math.random() * 0.04),
      sma50: mockPrice * (0.95 + Math.random() * 0.1),
      rsi: 30 + Math.random() * 40, // 30-70区间
      atr: mockPrice * mockVolatility,
      volume24h: 1000000000 + Math.random() * 500000000,
      volatility: mockVolatility,
      support: mockPrice * (0.97 + Math.random() * 0.02),
      resistance: mockPrice * (1.01 + Math.random() * 0.02),
      regime: this.detectMarketRegime(mockVolatility)
    };
  }

  // 检测市场状态
  private detectMarketRegime(volatility: number): MarketRegime {
    const highVol = volatility > 0.035;
    const trending = Math.random() > 0.4; // 模拟趋势检测
    
    if (trending && highVol) return MarketRegime.TRENDING_HIGH_VOL;
    if (trending && !highVol) return MarketRegime.TRENDING_LOW_VOL;
    if (!trending && highVol) return MarketRegime.RANGING_HIGH_VOL;
    return MarketRegime.RANGING_LOW_VOL;
  }

  // 解析自然语言查询
  private parseQuery(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();
    
    // 提取交易对
    let symbol = 'BTC/USDT'; // 默认
    if (lowerQuery.includes('eth') || lowerQuery.includes('以太')) symbol = 'ETH/USDT';
    if (lowerQuery.includes('sol') || lowerQuery.includes('索拉纳')) symbol = 'SOL/USDT';
    
    // 判断行动意图
    let action: 'buy' | 'sell' | 'analyze' | 'check' = 'analyze';
    if (lowerQuery.includes('买') || lowerQuery.includes('buy') || lowerQuery.includes('多')) action = 'buy';
    if (lowerQuery.includes('卖') || lowerQuery.includes('sell') || lowerQuery.includes('空')) action = 'sell';
    if (lowerQuery.includes('分析') || lowerQuery.includes('怎么样')) action = 'analyze';
    
    // 判断情绪倾向
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    const bullishWords = ['看涨', '看多', '上涨', '买入', '牛市', 'bull', 'long'];
    const bearishWords = ['看跌', '看空', '下跌', '卖出', '熊市', 'bear', 'short'];
    
    if (bullishWords.some(word => lowerQuery.includes(word))) sentiment = 'bullish';
    if (bearishWords.some(word => lowerQuery.includes(word))) sentiment = 'bearish';
    
    // 时间框架
    let timeframe = '15m';
    if (lowerQuery.includes('日') || lowerQuery.includes('day')) timeframe = '1d';
    if (lowerQuery.includes('小时') || lowerQuery.includes('hour') || lowerQuery.includes('h')) timeframe = '1h';
    if (lowerQuery.includes('分钟') || lowerQuery.includes('min') || lowerQuery.includes('m')) timeframe = '15m';
    
    return {
      symbol,
      action,
      timeframe,
      sentiment,
      confidence: 0.6 + Math.random() * 0.3 // 60-90%置信度
    };
  }

  // 计算仓位大小（风险管理）
  private calculatePositionSize(
    account: { balance: number; riskPerTrade: number },
    stopDistance: number,
    price: number
  ): number {
    // 风险占比法：风险金额 = 账户余额 × 单笔风险%
    const riskAmount = account.balance * (account.riskPerTrade / 100);
    // 仓位大小 = 风险金额 / (止损距离 × 价格)
    const positionValue = riskAmount / (stopDistance / price);
    return Math.min((positionValue / account.balance) * 100, 5); // 最大5%仓位
  }

  // 生成交易计划的核心逻辑
  private async generatePlanLogic(
    intent: QueryIntent,
    technical: TechnicalAnalysis,
    currentPrice: number
  ): Promise<Partial<TradingPlan>> {
    const { symbol, sentiment, confidence } = intent;
    
    // 确定方向
    let direction: 'long' | 'short' = 'long';
    let reasoning = '';
    let whyReasons: string[] = [];
    
    // 规则基线决策逻辑
    const priceAboveSMA20 = currentPrice > technical.sma20;
    const priceAboveSMA50 = currentPrice > technical.sma50;
    const rsiOversold = technical.rsi < 35;
    const rsiOverbought = technical.rsi > 65;
    const highVolume = technical.volume24h > 1200000000;
    
    // 决策树逻辑
    if (sentiment === 'bullish' || (priceAboveSMA20 && priceAboveSMA50 && !rsiOverbought)) {
      direction = 'long';
      reasoning = `${intent.timeframe} 突破关键均线支撑，RSI健康回调 → 小仓试多`;
      whyReasons = [
        `价格站稳20日均线(${technical.sma20.toFixed(0)})上方，趋势向好`,
        `RSI = ${technical.rsi.toFixed(0)}，未过热，有上升空间`,
        highVolume ? '成交量放大，资金流入' : '成交量平稳，适合建仓'
      ];
    } else if (sentiment === 'bearish' || (!priceAboveSMA20 && rsiOverbought)) {
      direction = 'short';
      reasoning = `${intent.timeframe} 跌破关键支撑，RSI超买释放 → 谨慎看空`;
      whyReasons = [
        `价格跌破20日均线(${technical.sma20.toFixed(0)})，趋势转弱`,
        `RSI = ${technical.rsi.toFixed(0)}，超买区域，回调压力大`,
        '技术面偏空，建议轻仓或观望'
      ];
    }
    
    // 计算入场、止损、目标价
    const atrMultiplier = technical.regime === MarketRegime.TRENDING_HIGH_VOL ? 1.5 : 1.2;
    let entryPrice = currentPrice;
    let stopLoss = direction === 'long' 
      ? Math.max(currentPrice - technical.atr * atrMultiplier, technical.support)
      : Math.min(currentPrice + technical.atr * atrMultiplier, technical.resistance);
    
    const riskDistance = Math.abs(entryPrice - stopLoss);
    const rewardDistance = riskDistance * 2; // 固定1:2 R:R
    let takeProfit = direction === 'long'
      ? entryPrice + rewardDistance
      : entryPrice - rewardDistance;
    
    // 风险等级
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (technical.volatility < 0.025) riskLevel = 'low';
    if (technical.volatility > 0.045) riskLevel = 'high';
    
    // 仓位计算
    const accountInfo = { balance: 10000, riskPerTrade: 1 }; // 模拟账户
    const positionSize = this.calculatePositionSize(accountInfo, riskDistance, currentPrice);
    
    return {
      symbol,
      direction,
      confidence: Math.round(confidence * 100),
      riskLevel,
      timeframe: intent.timeframe || '15m',
      reasoning,
      entryPrice,
      entryType: 'limit',
      stopLoss,
      takeProfit,
      positionSize: Math.round(positionSize * 10) / 10,
      riskReward: 2.0,
      validUntil: '30分钟',
      whyReasons,
      estimatedFees: 0.1,
      estimatedSlippage: 0.05
    };
  }

  // 主要的公共方法：从查询生成计划
  public async generatePlan(query: string, accountBalance: number = 10000): Promise<TradingPlan> {
    try {
      // 1. 解析查询意图
      const intent = this.parseQuery(query);
      
      // 2. 获取技术分析
      const technical = await this.getTechnicalAnalysis(intent.symbol);
      
      // 3. 获取当前价格（模拟）
      const currentPrice = intent.symbol === 'BTC/USDT' ? 43500 : 2650;
      
      // 4. 生成基础计划
      const planData = await this.generatePlanLogic(intent, technical, currentPrice);
      
      // 5. 生成完整计划对象
      let plan: TradingPlan = {
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        ...planData
      } as TradingPlan;
      
      // 6. 风控验证和调整
      const riskValidation = riskManager.validatePlan(plan, accountBalance);
      
      if (!riskValidation.isValid) {
        // 如果有严重违规，抛出错误
        throw new Error(`风控验证失败: ${riskValidation.violations.join(', ')}`);
      }
      
      // 应用风控调整
      if (riskValidation.adjustedPlan) {
        plan = { ...plan, ...riskValidation.adjustedPlan };
      }
      
      // 7. 生成存证
      const proof = riskManager.generateProof(plan);
      plan.hash = proof.planHash;
      
      // 8. 添加风控信息到推理中
      if (riskValidation.warnings.length > 0) {
        plan.whyReasons.push(`⚠️ 风控提示: ${riskValidation.warnings.join(', ')}`);
      }
      
      console.log(`📋 计划已生成并通过风控验证 (风险评分: ${riskValidation.riskScore})`);
      console.log(`📜 存证哈希: ${plan.hash}`);
      
      return plan;
      
    } catch (error) {
      console.error('生成交易计划失败:', error);
      throw error;
    }
  }

  // 生成计划哈希（用于存证）
  private generatePlanHash(plan: TradingPlan): string {
    const hashData = {
      symbol: plan.symbol,
      direction: plan.direction,
      entryPrice: plan.entryPrice,
      stopLoss: plan.stopLoss,
      takeProfit: plan.takeProfit,
      timestamp: plan.timestamp
    };
    
    // 简化的哈希生成（实际应使用加密哈希）
    return btoa(JSON.stringify(hashData)).slice(0, 16);
  }

  // 批量生成机会雷达计划
  public async generateOpportunityRadar(symbols: string[]): Promise<TradingPlan[]> {
    const plans: TradingPlan[] = [];
    
    for (const symbol of symbols) {
      try {
        // 模拟发现机会的查询
        const opportunities = [
          '突破回踩',
          '放量上涨', 
          '支撑反弹',
          '阻力突破'
        ];
        
        const randomOpportunity = opportunities[Math.floor(Math.random() * opportunities.length)];
        const query = `${symbol} ${randomOpportunity}机会`;
        
        const plan = await this.generatePlan(query);
        
        // 只推送高质量计划（置信度>70%）
        if (plan.confidence > 70) {
          plans.push(plan);
        }
      } catch (error) {
        console.warn(`生成${symbol}机会计划失败:`, error);
      }
    }
    
    return plans.slice(0, 3); // 最多3个机会
  }
}

// 导出单例
export const tradingPlanGenerator = new TradingPlanGenerator();
export default TradingPlanGenerator;