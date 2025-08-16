/**
 * RiverBit Trading Assistant - Comprehensive Risk Management System
 * 
 * This module provides intelligent risk controls that integrate with existing
 * RiverBit contracts and Web3 infrastructure to protect user accounts and
 * validate AI-generated trading plans.
 * 
 * Features:
 * - Account-level protection (daily loss limits, exposure limits)
 * - Position-level risk management (size, leverage, correlation limits)
 * - Plan validation system (reject dangerous plans before execution)
 * - Dynamic risk adjustment based on volatility and market conditions
 * - Emergency controls and automatic position closure
 * - User-customizable risk preferences
 */

import { TradingPlan, RiskLevel, PlanValidationResult } from '../../components/trading-assistant/types';
import { DEFAULT_PARAMS, formatUSDC, parseUSDC } from '../contractConfig';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface RiskParameters {
  // Account-level limits
  dailyLossLimit: number;           // Max daily loss in USDC
  totalExposureLimit: number;       // Max total position value in USDC
  maxPositionsCount: number;        // Max number of open positions
  
  // Position-level limits
  maxPositionSize: number;          // Max position size in USDC
  maxLeveragePerAsset: Record<string, number>; // Max leverage by asset type
  minRiskRewardRatio: number;       // Minimum risk/reward ratio
  
  // Correlation limits
  maxCorrelatedExposure: number;    // Max exposure to correlated assets
  correlationThreshold: number;     // Assets considered correlated above this
  
  // Volatility-based adjustments
  volatilityAdjustmentFactor: number; // How much to reduce size during high vol
  highVolatilityThreshold: number;    // Volatility % considered "high"
  
  // Emergency controls
  emergencyStopLossPercent: number; // Emergency stop loss percentage
  maxDrawdownPercent: number;       // Max portfolio drawdown before emergency stop
  
  // User preferences
  riskTolerance: RiskLevel;         // User's risk tolerance level
  autoStopLoss: boolean;            // Enable automatic stop loss
  enableEmergencyControls: boolean; // Enable emergency position closure
}

export interface UserRiskProfile {
  address: string;
  parameters: RiskParameters;
  currentExposure: number;
  dailyPnL: number;
  maxDrawdown: number;
  lastRiskCheck: number;
  violationCount: number;
  isBlocked: boolean;
  riskScore: number; // 0-100, higher = riskier
}

export interface PositionRisk {
  symbol: string;
  size: number;
  leverage: number;
  notionalValue: number;
  riskValue: number; // Value at risk
  correlationRisk: number;
  volatilityAdjustment: number;
  isRisky: boolean;
  riskFactors: string[];
}

export interface PlanRiskAssessment {
  planId: string;
  riskScore: number; // 0-100
  isAcceptable: boolean;
  violations: RiskViolation[];
  adjustedPlan?: Partial<TradingPlan>;
  emergencyActions: string[];
}

export interface RiskViolation {
  type: 'account' | 'position' | 'correlation' | 'volatility' | 'leverage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  limitValue: number;
  suggestedAction: string;
}

export interface MarketVolatilityData {
  symbol: string;
  volatility24h: number;
  volatility7d: number;
  averageVolatility: number;
  volatilityRank: number; // 1-10, 10 = extremely volatile
  lastUpdate: number;
}

export interface CorrelationMatrix {
  [symbol: string]: {
    [otherSymbol: string]: number; // -1 to 1, correlation coefficient
  };
}

export interface EmergencyAction {
  type: 'close_position' | 'reduce_leverage' | 'stop_trading' | 'liquidate_all';
  symbol?: string;
  reason: string;
  priority: number; // 1-10, 10 = immediate action required
  timestamp: number;
}

// ============================================================================
// DEFAULT RISK PARAMETERS
// ============================================================================

export const DEFAULT_RISK_PARAMETERS: RiskParameters = {
  // Account-level limits
  dailyLossLimit: 1000,             // $1000 max daily loss
  totalExposureLimit: 10000,        // $10k max total exposure
  maxPositionsCount: 10,            // Max 10 open positions
  
  // Position-level limits
  maxPositionSize: 2000,            // $2k max position size
  maxLeveragePerAsset: {
    'BTC': 50,
    'ETH': 30,
    'SOL': 20,
    'xAAPL': 3,
    'xTSLA': 3,
    'xMSFT': 3,
    'xGOOGL': 3,
    'default': 10
  },
  minRiskRewardRatio: 1.5,          // Minimum 1.5:1 risk/reward
  
  // Correlation limits
  maxCorrelatedExposure: 5000,      // $5k max in correlated assets
  correlationThreshold: 0.7,        // 70% correlation threshold
  
  // Volatility-based adjustments
  volatilityAdjustmentFactor: 0.5,  // Reduce position size by 50% in high vol
  highVolatilityThreshold: 0.05,    // 5% daily volatility = high
  
  // Emergency controls
  emergencyStopLossPercent: 0.15,   // 15% emergency stop loss
  maxDrawdownPercent: 0.20,         // 20% max portfolio drawdown
  
  // User preferences
  riskTolerance: 'medium',
  autoStopLoss: true,
  enableEmergencyControls: true
};

// Risk tolerance presets
export const RISK_TOLERANCE_PRESETS: Record<RiskLevel, Partial<RiskParameters>> = {
  low: {
    dailyLossLimit: 500,
    maxPositionSize: 1000,
    maxLeveragePerAsset: { 'BTC': 10, 'ETH': 10, 'default': 5 },
    minRiskRewardRatio: 2.0,
    emergencyStopLossPercent: 0.10,
    maxDrawdownPercent: 0.15
  },
  medium: {
    ...DEFAULT_RISK_PARAMETERS
  },
  high: {
    dailyLossLimit: 2000,
    maxPositionSize: 5000,
    maxLeveragePerAsset: { 'BTC': 100, 'ETH': 50, 'default': 20 },
    minRiskRewardRatio: 1.2,
    emergencyStopLossPercent: 0.20,
    maxDrawdownPercent: 0.25
  },
  extreme: {
    dailyLossLimit: 5000,
    maxPositionSize: 10000,
    maxLeveragePerAsset: { 'BTC': 100, 'ETH': 100, 'default': 50 },
    minRiskRewardRatio: 1.0,
    emergencyStopLossPercent: 0.25,
    maxDrawdownPercent: 0.30
  }
};

// Asset correlation matrix (simplified - should be updated from real data)
const ASSET_CORRELATIONS: CorrelationMatrix = {
  'BTC': { 'ETH': 0.8, 'SOL': 0.7, 'xAAPL': 0.2, 'xTSLA': 0.3 },
  'ETH': { 'BTC': 0.8, 'SOL': 0.85, 'xAAPL': 0.15, 'xTSLA': 0.25 },
  'SOL': { 'BTC': 0.7, 'ETH': 0.85, 'xAAPL': 0.1, 'xTSLA': 0.2 },
  'xAAPL': { 'BTC': 0.2, 'ETH': 0.15, 'xTSLA': 0.6, 'xMSFT': 0.7 },
  'xTSLA': { 'BTC': 0.3, 'ETH': 0.25, 'xAAPL': 0.6, 'xMSFT': 0.4 }
};

// ============================================================================
// RISK MANAGER CLASS
// ============================================================================

export class RiskManager {
  private userProfiles = new Map<string, UserRiskProfile>();
  private emergencyActions: EmergencyAction[] = [];
  private volatilityData = new Map<string, MarketVolatilityData>();
  private isEmergencyMode = false;

  constructor() {
    this.initializeDefaultData();
  }

  // ========================================================================
  // USER PROFILE MANAGEMENT
  // ========================================================================

  /**
   * Create or update user risk profile
   */
  async createUserProfile(
    userAddress: string, 
    customParameters?: Partial<RiskParameters>
  ): Promise<UserRiskProfile> {
    const parameters = {
      ...DEFAULT_RISK_PARAMETERS,
      ...customParameters
    };

    const profile: UserRiskProfile = {
      address: userAddress,
      parameters,
      currentExposure: 0,
      dailyPnL: 0,
      maxDrawdown: 0,
      lastRiskCheck: Date.now(),
      violationCount: 0,
      isBlocked: false,
      riskScore: 50 // Start with medium risk score
    };

    this.userProfiles.set(userAddress, profile);
    return profile;
  }

  /**
   * Update user risk preferences
   */
  async updateRiskPreferences(
    userAddress: string,
    updates: Partial<RiskParameters>
  ): Promise<void> {
    const profile = this.getUserProfile(userAddress);
    if (!profile) {
      throw new Error('User profile not found');
    }

    profile.parameters = { ...profile.parameters, ...updates };
    profile.lastRiskCheck = Date.now();
    
    // Recalculate risk score based on new parameters
    profile.riskScore = this.calculateRiskScore(profile.parameters);
  }

  /**
   * Apply risk tolerance preset
   */
  async applyRiskTolerance(
    userAddress: string, 
    riskLevel: RiskLevel
  ): Promise<void> {
    const preset = RISK_TOLERANCE_PRESETS[riskLevel];
    await this.updateRiskPreferences(userAddress, {
      ...preset,
      riskTolerance: riskLevel
    });
  }

  /**
   * Get user risk profile
   */
  getUserProfile(userAddress: string): UserRiskProfile | undefined {
    return this.userProfiles.get(userAddress);
  }

  // ========================================================================
  // PLAN VALIDATION
  // ========================================================================

  /**
   * Validate trading plan against risk parameters
   */
  async validateTradingPlan(
    plan: TradingPlan,
    userAddress: string,
    currentAccountData?: any
  ): Promise<PlanValidationResult> {
    const profile = this.getUserProfile(userAddress);
    if (!profile) {
      return {
        isValid: false,
        errors: ['User risk profile not found'],
        warnings: [],
        score: 0,
        suggestions: ['Create a risk profile first']
      };
    }

    const assessment = await this.assessPlanRisk(plan, profile, currentAccountData);
    
    return {
      isValid: assessment.isAcceptable,
      errors: assessment.violations
        .filter(v => v.severity === 'critical' || v.severity === 'high')
        .map(v => v.message),
      warnings: assessment.violations
        .filter(v => v.severity === 'medium' || v.severity === 'low')
        .map(v => v.message),
      score: assessment.riskScore,
      suggestions: assessment.violations.map(v => v.suggestedAction)
    };
  }

  /**
   * Assess risk for a trading plan
   */
  private async assessPlanRisk(
    plan: TradingPlan,
    profile: UserRiskProfile,
    currentAccountData?: any
  ): Promise<PlanRiskAssessment> {
    const violations: RiskViolation[] = [];
    let riskScore = 0;

    // Get current market data
    const volatility = this.getVolatilityData(plan.symbol);
    const positionSize = this.calculatePositionSize(plan);
    const leverage = this.inferLeverage(plan);

    // 1. Position size check
    if (positionSize > profile.parameters.maxPositionSize) {
      violations.push({
        type: 'position',
        severity: 'high',
        message: `Position size ${positionSize} exceeds limit ${profile.parameters.maxPositionSize}`,
        currentValue: positionSize,
        limitValue: profile.parameters.maxPositionSize,
        suggestedAction: `Reduce position size to ${profile.parameters.maxPositionSize}`
      });
      riskScore += 25;
    }

    // 2. Leverage check
    const maxLeverage = profile.parameters.maxLeveragePerAsset[plan.symbol] || 
                       profile.parameters.maxLeveragePerAsset.default;
    if (leverage > maxLeverage) {
      violations.push({
        type: 'leverage',
        severity: 'high',
        message: `Leverage ${leverage}x exceeds limit ${maxLeverage}x for ${plan.symbol}`,
        currentValue: leverage,
        limitValue: maxLeverage,
        suggestedAction: `Reduce leverage to ${maxLeverage}x`
      });
      riskScore += 20;
    }

    // 3. Risk/Reward ratio check
    if (plan.riskRewardRatio < profile.parameters.minRiskRewardRatio) {
      violations.push({
        type: 'position',
        severity: 'medium',
        message: `Risk/reward ratio ${plan.riskRewardRatio} below minimum ${profile.parameters.minRiskRewardRatio}`,
        currentValue: plan.riskRewardRatio,
        limitValue: profile.parameters.minRiskRewardRatio,
        suggestedAction: `Improve risk/reward ratio to at least ${profile.parameters.minRiskRewardRatio}`
      });
      riskScore += 15;
    }

    // 4. Volatility adjustment
    if (volatility && volatility.volatility24h > profile.parameters.highVolatilityThreshold) {
      const adjustedSize = positionSize * profile.parameters.volatilityAdjustmentFactor;
      violations.push({
        type: 'volatility',
        severity: 'medium',
        message: `High volatility detected (${(volatility.volatility24h * 100).toFixed(2)}%), consider reducing position size`,
        currentValue: positionSize,
        limitValue: adjustedSize,
        suggestedAction: `Reduce position size to ${adjustedSize.toFixed(0)} due to high volatility`
      });
      riskScore += 10;
    }

    // 5. Daily loss limit check (if we have account data)
    if (currentAccountData && profile.dailyPnL < -profile.parameters.dailyLossLimit) {
      violations.push({
        type: 'account',
        severity: 'critical',
        message: `Daily loss limit exceeded: ${profile.dailyPnL} < ${-profile.parameters.dailyLossLimit}`,
        currentValue: Math.abs(profile.dailyPnL),
        limitValue: profile.parameters.dailyLossLimit,
        suggestedAction: 'Stop trading for today - daily loss limit reached'
      });
      riskScore += 40;
    }

    // 6. Correlation risk check
    const correlationRisk = await this.assessCorrelationRisk(plan.symbol, profile, currentAccountData);
    if (correlationRisk.isRisky) {
      violations.push({
        type: 'correlation',
        severity: 'medium',
        message: `High correlation risk detected with existing positions`,
        currentValue: correlationRisk.correlationRisk,
        limitValue: profile.parameters.maxCorrelatedExposure,
        suggestedAction: 'Consider diversifying into uncorrelated assets'
      });
      riskScore += 15;
    }

    // Calculate emergency actions if needed
    const emergencyActions: string[] = [];
    if (riskScore > 80) {
      emergencyActions.push('Reduce position size by 50%');
      emergencyActions.push('Set tight stop loss');
      emergencyActions.push('Monitor position closely');
    }

    return {
      planId: plan.id,
      riskScore,
      isAcceptable: riskScore < 70 && !violations.some(v => v.severity === 'critical'),
      violations,
      emergencyActions
    };
  }

  // ========================================================================
  // POSITION RISK ANALYSIS
  // ========================================================================

  /**
   * Analyze risk for existing positions
   */
  async analyzePositionRisk(
    userAddress: string,
    positions: Array<{symbol: string, size: number, leverage: number}>
  ): Promise<PositionRisk[]> {
    const profile = this.getUserProfile(userAddress);
    if (!profile) {
      throw new Error('User profile not found');
    }

    const positionRisks: PositionRisk[] = [];

    for (const position of positions) {
      const volatility = this.getVolatilityData(position.symbol);
      const correlationRisk = await this.calculateCorrelationRisk(
        position.symbol, 
        positions, 
        profile.parameters
      );

      const notionalValue = Math.abs(position.size) * position.leverage;
      const riskValue = notionalValue * 0.1; // Simplified VAR calculation
      
      const volatilityAdjustment = volatility 
        ? (volatility.volatility24h > profile.parameters.highVolatilityThreshold ? 
           profile.parameters.volatilityAdjustmentFactor : 1.0)
        : 1.0;

      const riskFactors: string[] = [];
      
      if (notionalValue > profile.parameters.maxPositionSize) {
        riskFactors.push('Position size exceeds limit');
      }
      
      if (position.leverage > (profile.parameters.maxLeveragePerAsset[position.symbol] || 10)) {
        riskFactors.push('Leverage exceeds limit');
      }
      
      if (volatility && volatility.volatility24h > profile.parameters.highVolatilityThreshold) {
        riskFactors.push('High volatility detected');
      }
      
      if (correlationRisk > profile.parameters.correlationThreshold) {
        riskFactors.push('High correlation risk');
      }

      positionRisks.push({
        symbol: position.symbol,
        size: position.size,
        leverage: position.leverage,
        notionalValue,
        riskValue,
        correlationRisk,
        volatilityAdjustment,
        isRisky: riskFactors.length > 0,
        riskFactors
      });
    }

    return positionRisks;
  }

  // ========================================================================
  // EMERGENCY CONTROLS
  // ========================================================================

  /**
   * Check if emergency stop is needed
   */
  async checkEmergencyStop(
    userAddress: string,
    currentAccountData: any
  ): Promise<EmergencyAction[]> {
    const profile = this.getUserProfile(userAddress);
    if (!profile || !profile.parameters.enableEmergencyControls) {
      return [];
    }

    const actions: EmergencyAction[] = [];
    const now = Date.now();

    // Check daily loss limit
    if (profile.dailyPnL < -profile.parameters.dailyLossLimit) {
      actions.push({
        type: 'stop_trading',
        reason: `Daily loss limit exceeded: ${profile.dailyPnL}`,
        priority: 9,
        timestamp: now
      });
    }

    // Check maximum drawdown
    const drawdownPercent = Math.abs(profile.maxDrawdown) / (currentAccountData.balance || 1);
    if (drawdownPercent > profile.parameters.maxDrawdownPercent) {
      actions.push({
        type: 'liquidate_all',
        reason: `Maximum drawdown exceeded: ${(drawdownPercent * 100).toFixed(2)}%`,
        priority: 10,
        timestamp: now
      });
    }

    // Check emergency stop loss for individual positions
    if (currentAccountData.positions) {
      for (const [symbol, position] of Object.entries(currentAccountData.positions)) {
        const positionData = position as any;
        if (positionData.unrealizedPnLPercent < -profile.parameters.emergencyStopLossPercent) {
          actions.push({
            type: 'close_position',
            symbol,
            reason: `Emergency stop loss triggered: ${(positionData.unrealizedPnLPercent * 100).toFixed(2)}%`,
            priority: 8,
            timestamp: now
          });
        }
      }
    }

    // Add to emergency actions list
    this.emergencyActions.push(...actions);
    
    // Set emergency mode if critical actions are needed
    if (actions.some(a => a.priority >= 9)) {
      this.isEmergencyMode = true;
    }

    return actions;
  }

  /**
   * Execute emergency action
   */
  async executeEmergencyAction(action: EmergencyAction): Promise<boolean> {
    try {
      console.warn(`🚨 EMERGENCY ACTION: ${action.type} - ${action.reason}`);
      
      // In a real implementation, this would call the contract methods
      // For now, we'll just log the action
      
      switch (action.type) {
        case 'close_position':
          // await this.closePosition(action.symbol);
          console.log(`Would close position for ${action.symbol}`);
          break;
          
        case 'reduce_leverage':
          // await this.reduceLeverage(action.symbol);
          console.log(`Would reduce leverage for ${action.symbol}`);
          break;
          
        case 'stop_trading':
          // Block user from trading
          console.log('Would stop all trading for user');
          break;
          
        case 'liquidate_all':
          // await this.liquidateAllPositions();
          console.log('Would liquidate all positions');
          break;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to execute emergency action:', error);
      return false;
    }
  }

  // ========================================================================
  // MARKET ANALYSIS
  // ========================================================================

  /**
   * Update volatility data for an asset
   */
  updateVolatilityData(symbol: string, data: MarketVolatilityData): void {
    this.volatilityData.set(symbol, data);
  }

  /**
   * Get volatility data for an asset
   */
  getVolatilityData(symbol: string): MarketVolatilityData | undefined {
    return this.volatilityData.get(symbol);
  }

  /**
   * Calculate dynamic position size based on volatility
   */
  calculateDynamicPositionSize(
    baseSize: number,
    symbol: string,
    riskParameters: RiskParameters
  ): number {
    const volatility = this.getVolatilityData(symbol);
    if (!volatility) return baseSize;

    const volatilityMultiplier = volatility.volatility24h > riskParameters.highVolatilityThreshold
      ? riskParameters.volatilityAdjustmentFactor
      : 1.0;

    return baseSize * volatilityMultiplier;
  }

  // ========================================================================
  // CORRELATION ANALYSIS
  // ========================================================================

  /**
   * Assess correlation risk for a new position
   */
  private async assessCorrelationRisk(
    newSymbol: string,
    profile: UserRiskProfile,
    currentAccountData?: any
  ): Promise<PositionRisk> {
    const correlationRisk = currentAccountData && currentAccountData.positions
      ? await this.calculateCorrelationRisk(newSymbol, currentAccountData.positions, profile.parameters)
      : 0;

    return {
      symbol: newSymbol,
      size: 0,
      leverage: 1,
      notionalValue: 0,
      riskValue: 0,
      correlationRisk,
      volatilityAdjustment: 1,
      isRisky: correlationRisk > profile.parameters.correlationThreshold,
      riskFactors: correlationRisk > profile.parameters.correlationThreshold 
        ? ['High correlation with existing positions'] 
        : []
    };
  }

  /**
   * Calculate correlation risk between assets
   */
  private async calculateCorrelationRisk(
    symbol: string,
    positions: any,
    parameters: RiskParameters
  ): Promise<number> {
    let totalCorrelatedExposure = 0;
    
    for (const [existingSymbol, position] of Object.entries(positions)) {
      if (existingSymbol === symbol) continue;
      
      const correlation = ASSET_CORRELATIONS[symbol]?.[existingSymbol] || 0;
      if (Math.abs(correlation) > parameters.correlationThreshold) {
        const positionData = position as any;
        totalCorrelatedExposure += Math.abs(positionData.notionalValue || 0);
      }
    }
    
    return totalCorrelatedExposure / parameters.maxCorrelatedExposure;
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Calculate position size from trading plan
   */
  private calculatePositionSize(plan: TradingPlan): number {
    // Simplified calculation - in reality would be more complex
    return plan.maxLoss / Math.abs(plan.entry - plan.stopLoss) * plan.entry;
  }

  /**
   * Infer leverage from trading plan
   */
  private inferLeverage(plan: TradingPlan): number {
    // Simplified - would calculate based on margin requirements
    const riskPercent = Math.abs(plan.entry - plan.stopLoss) / plan.entry;
    return Math.min(100, Math.floor(1 / riskPercent));
  }

  /**
   * Calculate risk score based on parameters
   */
  private calculateRiskScore(parameters: RiskParameters): number {
    let score = 50; // Start with medium risk
    
    // Adjust based on leverage limits
    const avgLeverage = Object.values(parameters.maxLeveragePerAsset).reduce((a, b) => a + b, 0) / 
                       Object.values(parameters.maxLeveragePerAsset).length;
    score += (avgLeverage - 10) * 2; // Higher leverage = higher risk
    
    // Adjust based on position size limits
    score += (parameters.maxPositionSize - 2000) / 100; // Larger positions = higher risk
    
    // Adjust based on daily loss tolerance
    score += (parameters.dailyLossLimit - 1000) / 50; // Higher loss tolerance = higher risk
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Initialize default market data
   */
  private initializeDefaultData(): void {
    // Initialize with some sample volatility data
    const defaultSymbols = ['BTC', 'ETH', 'SOL', 'xAAPL', 'xTSLA'];
    
    defaultSymbols.forEach(symbol => {
      this.volatilityData.set(symbol, {
        symbol,
        volatility24h: 0.03, // 3% default volatility
        volatility7d: 0.05,  // 5% weekly volatility
        averageVolatility: 0.04,
        volatilityRank: 5,   // Medium volatility
        lastUpdate: Date.now()
      });
    });
  }

  // ========================================================================
  // PUBLIC API METHODS
  // ========================================================================

  /**
   * Get current emergency status
   */
  getEmergencyStatus(): { isEmergencyMode: boolean; pendingActions: EmergencyAction[] } {
    return {
      isEmergencyMode: this.isEmergencyMode,
      pendingActions: this.emergencyActions.filter(a => a.timestamp > Date.now() - 3600000) // Last hour
    };
  }

  /**
   * Get risk metrics for user
   */
  getUserRiskMetrics(userAddress: string): UserRiskProfile | null {
    return this.getUserProfile(userAddress) || null;
  }

  /**
   * Generate risk report
   */
  generateRiskReport(userAddress: string): string {
    const profile = this.getUserProfile(userAddress);
    if (!profile) {
      return 'No risk profile found for user';
    }

    const riskLevel = profile.parameters.riskTolerance;
    const riskScore = profile.riskScore;
    const violations = profile.violationCount;

    return `
🛡️ Risk Management Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 User: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}
🎚️ Risk Tolerance: ${riskLevel.toUpperCase()}
📊 Risk Score: ${riskScore}/100 ${riskScore > 70 ? '🔴' : riskScore > 40 ? '🟡' : '🟢'}
⚠️ Violations: ${violations}

💰 Account Limits:
   • Daily Loss Limit: $${profile.parameters.dailyLossLimit.toLocaleString()}
   • Max Position Size: $${profile.parameters.maxPositionSize.toLocaleString()}
   • Total Exposure Limit: $${profile.parameters.totalExposureLimit.toLocaleString()}

⚡ Emergency Controls: ${profile.parameters.enableEmergencyControls ? 'ENABLED' : 'DISABLED'}
🛑 Auto Stop Loss: ${profile.parameters.autoStopLoss ? 'ENABLED' : 'DISABLED'}

${profile.isBlocked ? '🚨 ACCOUNT BLOCKED DUE TO RISK VIOLATIONS' : '✅ Account in good standing'}
    `;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const riskManager = new RiskManager();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new user with risk preferences
 */
export async function setupUserRiskProfile(
  userAddress: string,
  riskTolerance: RiskLevel = 'medium',
  customParams?: Partial<RiskParameters>
): Promise<UserRiskProfile> {
  const preset = RISK_TOLERANCE_PRESETS[riskTolerance];
  const parameters = { ...preset, ...customParams };
  
  return await riskManager.createUserProfile(userAddress, parameters);
}

/**
 * Quick plan validation for UI components
 */
export async function quickValidatePlan(
  plan: TradingPlan,
  userAddress: string
): Promise<{ isValid: boolean; message: string }> {
  try {
    const result = await riskManager.validateTradingPlan(plan, userAddress);
    
    if (result.isValid) {
      return { isValid: true, message: '✅ Plan passes risk checks' };
    } else {
      const errorCount = result.errors.length;
      const warningCount = result.warnings.length;
      return { 
        isValid: false, 
        message: `⚠️ ${errorCount} errors, ${warningCount} warnings detected` 
      };
    }
  } catch (error) {
    return { isValid: false, message: '❌ Risk validation failed' };
  }
}

/**
 * Get safe position size recommendation
 */
export function getSafePositionSize(
  accountBalance: number,
  riskTolerance: RiskLevel = 'medium'
): number {
  const preset = RISK_TOLERANCE_PRESETS[riskTolerance];
  const maxRiskPercent = riskTolerance === 'low' ? 0.02 : 
                        riskTolerance === 'medium' ? 0.05 :
                        riskTolerance === 'high' ? 0.10 : 0.15;
  
  return Math.min(
    accountBalance * maxRiskPercent,
    preset.maxPositionSize || DEFAULT_RISK_PARAMETERS.maxPositionSize
  );
}

/**
 * Check if symbol is supported
 */
export function isSupportedSymbol(symbol: string): boolean {
  return DEFAULT_PARAMS.supportedSymbols.includes(symbol);
}

// Export the main class and utilities
export default RiskManager;