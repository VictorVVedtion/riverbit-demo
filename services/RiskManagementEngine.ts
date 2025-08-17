/**
 * Risk Management Engine - 风控引擎
 * 确保交易计划符合风控要求，防止作恶
 */

import { TradingPlan } from '../components/ai/TradingPlanCard';

// 风控规则配置
interface RiskLimits {
  maxDailyLoss: number; // 每日最大亏损百分比
  maxSingleRisk: number; // 单笔最大风险百分比
  maxLeverage: number; // 最大杠杆
  minRiskReward: number; // 最小风险回报比
  maxSlippage: number; // 最大滑点容忍
  blackoutEvents: string[]; // 黑名单事件
}

// 账户风控状态
interface AccountRiskState {
  dailyPnL: number;
  totalExposure: number;
  openPositions: number;
  riskScore: number;
  isBlackedOut: boolean;
  lastUpdate: number;
}

// 风控验证结果
interface RiskValidationResult {
  isValid: boolean;
  violations: string[];
  warnings: string[];
  riskScore: number;
  adjustedPlan?: Partial<TradingPlan>;
}

// 存证记录
interface ProofRecord {
  planHash: string;
  timestamp: number;
  parameters: Partial<TradingPlan>;
  signature: string;
  blockNumber?: number;
}

class RiskManagementEngine {
  private defaultLimits: RiskLimits = {
    maxDailyLoss: 5, // 5%
    maxSingleRisk: 2, // 2%
    maxLeverage: 50, // 50x
    minRiskReward: 1.5, // 1:1.5
    maxSlippage: 0.5, // 0.5%
    blackoutEvents: ['FOMC', 'NFP', 'CPI'] // 重大事件期间限制
  };

  private accountState: AccountRiskState = {
    dailyPnL: 0,
    totalExposure: 0,
    openPositions: 0,
    riskScore: 0,
    isBlackedOut: false,
    lastUpdate: Date.now()
  };

  private proofRecords: Map<string, ProofRecord> = new Map();

  // 主要风控验证函数
  public validatePlan(plan: TradingPlan, accountBalance: number): RiskValidationResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;
    let adjustedPlan: Partial<TradingPlan> = {};

    // 1. 账户级风控检查
    const accountRisk = this.checkAccountLimits(plan, accountBalance);
    violations.push(...accountRisk.violations);
    warnings.push(...accountRisk.warnings);
    riskScore += accountRisk.score;

    // 2. 计划级风控检查
    const planRisk = this.checkPlanLimits(plan);
    violations.push(...planRisk.violations);
    warnings.push(...planRisk.warnings);
    riskScore += planRisk.score;

    // 3. 市场环境检查
    const marketRisk = this.checkMarketConditions(plan);
    violations.push(...marketRisk.violations);
    warnings.push(...marketRisk.warnings);
    riskScore += marketRisk.score;

    // 4. 自动调整（如果可能）
    if (violations.length === 0 && warnings.length > 0) {
      adjustedPlan = this.generateAdjustedPlan(plan, warnings);
    }

    // 5. 强制风控 - 不可移除的保护
    const forcedSafeguards = this.applyForcedSafeguards(plan);
    Object.assign(adjustedPlan, forcedSafeguards);

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      riskScore: Math.min(100, riskScore),
      adjustedPlan: Object.keys(adjustedPlan).length > 0 ? adjustedPlan : undefined
    };
  }

  // 账户级风控检查
  private checkAccountLimits(plan: TradingPlan, accountBalance: number): {
    violations: string[], warnings: string[], score: number
  } {
    const violations: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // 检查每日亏损限制
    const projectedDailyLoss = this.accountState.dailyPnL;
    if (Math.abs(projectedDailyLoss) >= accountBalance * (this.defaultLimits.maxDailyLoss / 100)) {
      violations.push(`超出每日最大亏损限制 ${this.defaultLimits.maxDailyLoss}%`);
      score += 30;
    }

    // 检查单笔风险
    const riskAmount = this.calculateRiskAmount(plan, accountBalance);
    const riskPercent = (riskAmount / accountBalance) * 100;
    
    if (riskPercent > this.defaultLimits.maxSingleRisk) {
      violations.push(`单笔风险 ${riskPercent.toFixed(2)}% 超出限制 ${this.defaultLimits.maxSingleRisk}%`);
      score += 25;
    } else if (riskPercent > this.defaultLimits.maxSingleRisk * 0.8) {
      warnings.push(`单笔风险接近限制 (${riskPercent.toFixed(2)}%)`);
      score += 10;
    }

    // 检查总敞口
    const totalExposure = this.accountState.totalExposure + (plan.positionSize * accountBalance / 100);
    if (totalExposure > accountBalance * 3) { // 最大3倍总敞口
      violations.push('总敞口过大，请减少仓位或关闭其他头寸');
      score += 20;
    }

    return { violations, warnings, score };
  }

  // 计划级风控检查
  private checkPlanLimits(plan: TradingPlan): {
    violations: string[], warnings: string[], score: number
  } {
    const violations: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // 检查R:R比例
    if (plan.riskReward < this.defaultLimits.minRiskReward) {
      violations.push(`风险回报比 1:${plan.riskReward} 低于最小要求 1:${this.defaultLimits.minRiskReward}`);
      score += 20;
    }

    // 检查杠杆限制（从计划中推断）
    const impliedLeverage = this.calculateImpliedLeverage(plan);
    if (impliedLeverage > this.defaultLimits.maxLeverage) {
      violations.push(`隐含杠杆 ${impliedLeverage}x 超出最大限制 ${this.defaultLimits.maxLeverage}x`);
      score += 25;
    }

    // 检查止损设置（强制要求）
    if (!plan.stopLoss || plan.stopLoss === plan.entryPrice) {
      violations.push('必须设置有效的止损价格');
      score += 30;
    }

    // 检查价格合理性
    const priceDeviation = Math.abs(plan.entryPrice - plan.stopLoss) / plan.entryPrice;
    if (priceDeviation > 0.2) { // 20%以上的止损距离
      warnings.push('止损距离较大，请确认风险承受能力');
      score += 15;
    }

    return { violations, warnings, score };
  }

  // 市场环境检查
  private checkMarketConditions(plan: TradingPlan): {
    violations: string[], warnings: string[], score: number
  } {
    const violations: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // 检查黑名单事件
    if (this.accountState.isBlackedOut || this.isBlackoutPeriod()) {
      violations.push('当前处于重大事件窗口期，暂停自动交易');
      score += 50;
    }

    // 检查市场波动性
    if (plan.riskLevel === 'high') {
      warnings.push('当前市场波动性较高，建议降低仓位');
      score += 10;
    }

    // 检查流动性（模拟）
    const liquidityScore = this.checkLiquidity(plan.symbol);
    if (liquidityScore < 0.5) {
      warnings.push('标的流动性不足，可能存在较大滑点');
      score += 15;
    }

    return { violations, warnings, score };
  }

  // 生成调整后的计划
  private generateAdjustedPlan(plan: TradingPlan, warnings: string[]): Partial<TradingPlan> {
    const adjustments: Partial<TradingPlan> = {};

    // 根据警告自动调整
    warnings.forEach(warning => {
      if (warning.includes('仓位')) {
        // 自动降低仓位
        adjustments.positionSize = Math.max(0.5, plan.positionSize * 0.8);
      }
      
      if (warning.includes('滑点')) {
        // 调整为限价单
        adjustments.entryType = 'limit';
      }
    });

    return adjustments;
  }

  // 应用强制保护措施
  private applyForcedSafeguards(plan: TradingPlan): Partial<TradingPlan> {
    const safeguards: Partial<TradingPlan> = {};

    // 强制止损（不可移除）
    if (!plan.stopLoss) {
      const isLong = plan.direction === 'long';
      const emergencyStopDistance = plan.entryPrice * 0.05; // 5%紧急止损
      safeguards.stopLoss = isLong 
        ? plan.entryPrice - emergencyStopDistance
        : plan.entryPrice + emergencyStopDistance;
    }

    // 强制有效期限制
    safeguards.validUntil = '1小时'; // 最大1小时有效期

    // 强制最大滑点保护
    if (plan.estimatedSlippage > this.defaultLimits.maxSlippage) {
      safeguards.estimatedSlippage = this.defaultLimits.maxSlippage;
      safeguards.entryType = 'limit'; // 强制限价单
    }

    return safeguards;
  }

  // 生成计划存证
  public generateProof(plan: TradingPlan): ProofRecord {
    const timestamp = Date.now();
    const parameters = {
      symbol: plan.symbol,
      direction: plan.direction,
      entryPrice: plan.entryPrice,
      stopLoss: plan.stopLoss,
      takeProfit: plan.takeProfit,
      positionSize: plan.positionSize,
      confidence: plan.confidence,
      timestamp
    };

    // 生成哈希（简化版本）
    const planHash = this.generateSecureHash(parameters);
    
    // 生成数字签名（模拟）
    const signature = this.generateSignature(planHash, timestamp);

    const proof: ProofRecord = {
      planHash,
      timestamp,
      parameters,
      signature
    };

    // 存储到本地记录
    this.proofRecords.set(planHash, proof);

    // 模拟上链存证（实际实现需要连接区块链）
    this.simulateOnChainCommit(proof);

    return proof;
  }

  // 验证存证
  public verifyProof(planHash: string, revealedPlan: TradingPlan): boolean {
    const proof = this.proofRecords.get(planHash);
    if (!proof) return false;

    // 验证参数匹配
    const matches = 
      proof.parameters.symbol === revealedPlan.symbol &&
      proof.parameters.direction === revealedPlan.direction &&
      proof.parameters.entryPrice === revealedPlan.entryPrice &&
      proof.parameters.stopLoss === revealedPlan.stopLoss &&
      proof.parameters.takeProfit === revealedPlan.takeProfit;

    return matches;
  }

  // 辅助方法
  private calculateRiskAmount(plan: TradingPlan, accountBalance: number): number {
    const positionValue = (plan.positionSize / 100) * accountBalance;
    const stopDistance = Math.abs(plan.entryPrice - plan.stopLoss);
    return (stopDistance / plan.entryPrice) * positionValue;
  }

  private calculateImpliedLeverage(plan: TradingPlan): number {
    // 从仓位大小和风险推算杠杆
    const riskPercent = Math.abs(plan.entryPrice - plan.stopLoss) / plan.entryPrice;
    return Math.round(plan.positionSize / (riskPercent * 100));
  }

  private checkLiquidity(symbol: string): number {
    // 模拟流动性检查
    const liquidityMap: Record<string, number> = {
      'BTC/USDT': 0.95,
      'ETH/USDT': 0.90,
      'SOL/USDT': 0.80
    };
    return liquidityMap[symbol] || 0.70;
  }

  private isBlackoutPeriod(): boolean {
    // 模拟重大事件检查
    const now = new Date();
    const hour = now.getHours();
    
    // 美国市场开盘前后2小时（重大数据发布时间）
    if (hour >= 13 && hour <= 15) { // UTC时间
      return Math.random() < 0.1; // 10%概率处于黑名单期
    }
    
    return false;
  }

  private generateSecureHash(data: any): string {
    // 简化的哈希生成（实际应使用加密哈希函数）
    const jsonString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private generateSignature(hash: string, timestamp: number): string {
    // 模拟数字签名
    return btoa(`${hash}:${timestamp}:riverbit`).slice(0, 16);
  }

  private simulateOnChainCommit(proof: ProofRecord): void {
    // 模拟区块链提交
    setTimeout(() => {
      proof.blockNumber = Math.floor(Math.random() * 1000000) + 18000000;
      console.log(`📜 计划存证已上链: ${proof.planHash} (区块 #${proof.blockNumber})`);
    }, 2000);
  }

  // 公共接口
  public updateAccountState(state: Partial<AccountRiskState>): void {
    this.accountState = { ...this.accountState, ...state, lastUpdate: Date.now() };
  }

  public getAccountRiskScore(): number {
    return this.accountState.riskScore;
  }

  public getRiskLimits(): RiskLimits {
    return { ...this.defaultLimits };
  }

  public getProofHistory(): ProofRecord[] {
    return Array.from(this.proofRecords.values());
  }
}

// 导出单例
export const riskManager = new RiskManagementEngine();
export default RiskManagementEngine;