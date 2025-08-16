/**
 * RiverBit Risk Manager Integration Examples
 * 
 * This file demonstrates how to integrate the risk management system
 * with existing RiverBit contracts and UI components.
 */

import { riskManager, setupUserRiskProfile, quickValidatePlan, getSafePositionSize } from './riskManager';
import { TradingPlan, RiskLevel } from '../../components/trading-assistant/types';
import { CONTRACT_CONFIG, formatUSDC } from '../contractConfig';

// ============================================================================
// INTEGRATION WITH WEB3 CONTRACTS
// ============================================================================

/**
 * Get user account data from RiverBit contract for risk assessment
 */
export async function getUserAccountData(userAddress: string, provider: any): Promise<any> {
  try {
    // This would use the actual Web3 provider to get real data
    // For now, we'll use mock data similar to the TradingPage component
    
    const mockAccountData = {
      balance: 12540.85,
      usedMargin: 2340.50,
      equity: 14881.35,
      marginLevel: 635.4,
      positions: {
        'BTC': {
          size: 0.5,
          leverage: 10,
          entryPrice: 43000,
          unrealizedPnL: 150,
          unrealizedPnLPercent: 0.035,
          notionalValue: 21500
        },
        'ETH': {
          size: -2.0,
          leverage: 5,
          entryPrice: 2500,
          unrealizedPnL: -75,
          unrealizedPnLPercent: -0.015,
          notionalValue: 12500
        }
      }
    };

    return mockAccountData;
  } catch (error) {
    console.error('Failed to get account data:', error);
    throw error;
  }
}

/**
 * Real-time risk monitoring for active positions
 */
export async function monitorPositionRisk(userAddress: string, provider: any): Promise<void> {
  try {
    const accountData = await getUserAccountData(userAddress, provider);
    const profile = riskManager.getUserProfile(userAddress);
    
    if (!profile) {
      console.warn('No risk profile found for user:', userAddress);
      return;
    }

    // Check for emergency conditions
    const emergencyActions = await riskManager.checkEmergencyStop(userAddress, accountData);
    
    if (emergencyActions.length > 0) {
      console.warn('🚨 Emergency actions required:', emergencyActions);
      
      // Execute emergency actions if needed
      for (const action of emergencyActions) {
        if (action.priority >= 9) {
          await riskManager.executeEmergencyAction(action);
        }
      }
    }

    // Analyze individual position risks
    const positions = Object.entries(accountData.positions).map(([symbol, data]: [string, any]) => ({
      symbol,
      size: data.size,
      leverage: data.leverage
    }));

    const positionRisks = await riskManager.analyzePositionRisk(userAddress, positions);
    
    // Log any risky positions
    const riskyPositions = positionRisks.filter(p => p.isRisky);
    if (riskyPositions.length > 0) {
      console.warn('⚠️ Risky positions detected:', riskyPositions);
    }

  } catch (error) {
    console.error('Risk monitoring failed:', error);
  }
}

// ============================================================================
// INTEGRATION WITH TRADING PLANS
// ============================================================================

/**
 * Validate and execute a trading plan with risk checks
 */
export async function executeTradeWithRiskChecks(
  plan: TradingPlan,
  userAddress: string,
  provider: any
): Promise<{ success: boolean; message: string; txHash?: string }> {
  try {
    // 1. Get current account data
    const accountData = await getUserAccountData(userAddress, provider);
    
    // 2. Validate plan against risk parameters
    const validation = await riskManager.validateTradingPlan(plan, userAddress, accountData);
    
    if (!validation.isValid) {
      return {
        success: false,
        message: `Trade rejected: ${validation.errors.join(', ')}`
      };
    }

    // 3. Show warnings if any
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Trade warnings:', validation.warnings);
    }

    // 4. Calculate safe position size
    const profile = riskManager.getUserProfile(userAddress);
    const safeSize = getSafePositionSize(
      accountData.balance, 
      profile?.parameters.riskTolerance || 'medium'
    );

    // 5. Adjust position size if needed
    const planSize = plan.maxLoss / Math.abs(plan.entry - plan.stopLoss) * plan.entry;
    if (planSize > safeSize) {
      console.log(`📉 Reducing position size from ${planSize} to ${safeSize} for safety`);
    }

    // 6. Execute the trade (mock implementation)
    // In real implementation, this would call the RiverBit contract
    const executionResult = await mockExecuteTrade(plan, Math.min(planSize, safeSize), provider);
    
    if (executionResult.success) {
      // 7. Update risk profile after successful trade
      await updateRiskProfileAfterTrade(userAddress, plan, executionResult.txHash!);
    }

    return executionResult;

  } catch (error) {
    console.error('Trade execution failed:', error);
    return {
      success: false,
      message: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Mock trade execution function
 */
async function mockExecuteTrade(
  plan: TradingPlan, 
  positionSize: number, 
  provider: any
): Promise<{ success: boolean; message: string; txHash?: string }> {
  // Simulate trade execution delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
  
  return {
    success: true,
    message: `Trade executed successfully. Position: ${positionSize.toFixed(2)} ${plan.symbol}`,
    txHash: mockTxHash
  };
}

/**
 * Update risk profile after trade execution
 */
async function updateRiskProfileAfterTrade(
  userAddress: string, 
  plan: TradingPlan, 
  txHash: string
): Promise<void> {
  const profile = riskManager.getUserProfile(userAddress);
  if (!profile) return;

  // Update exposure and activity
  profile.currentExposure += plan.maxLoss;
  profile.lastRiskCheck = Date.now();
  
  console.log(`✅ Trade executed: ${plan.symbol} ${plan.direction} - TX: ${txHash}`);
}

// ============================================================================
// INTEGRATION WITH UI COMPONENTS
// ============================================================================

/**
 * Get risk status for UI display
 */
export function getRiskStatusForUI(userAddress: string): {
  status: 'safe' | 'warning' | 'danger';
  message: string;
  riskScore: number;
  canTrade: boolean;
} {
  const profile = riskManager.getUserProfile(userAddress);
  
  if (!profile) {
    return {
      status: 'warning',
      message: 'No risk profile found',
      riskScore: 50,
      canTrade: false
    };
  }

  const riskScore = profile.riskScore;
  const isBlocked = profile.isBlocked;

  if (isBlocked) {
    return {
      status: 'danger',
      message: 'Account blocked due to risk violations',
      riskScore,
      canTrade: false
    };
  }

  if (riskScore >= 80) {
    return {
      status: 'danger',
      message: 'High risk - trade with caution',
      riskScore,
      canTrade: true
    };
  }

  if (riskScore >= 60) {
    return {
      status: 'warning',
      message: 'Moderate risk - consider reducing exposure',
      riskScore,
      canTrade: true
    };
  }

  return {
    status: 'safe',
    message: 'Risk level acceptable',
    riskScore,
    canTrade: true
  };
}

/**
 * Generate risk badges for trading interface
 */
export function getRiskBadges(userAddress: string): Array<{
  label: string;
  value: string;
  color: 'green' | 'yellow' | 'red';
  tooltip: string;
}> {
  const profile = riskManager.getUserProfile(userAddress);
  if (!profile) return [];

  const badges = [];

  // Risk score badge
  const riskScore = profile.riskScore;
  badges.push({
    label: 'Risk Score',
    value: `${riskScore}/100`,
    color: riskScore < 40 ? 'green' : riskScore < 70 ? 'yellow' : 'red',
    tooltip: `Current account risk level: ${riskScore}/100`
  });

  // Daily loss status
  const dailyLossPercent = Math.abs(profile.dailyPnL) / profile.parameters.dailyLossLimit * 100;
  badges.push({
    label: 'Daily Loss',
    value: `${dailyLossPercent.toFixed(1)}%`,
    color: dailyLossPercent < 50 ? 'green' : dailyLossPercent < 80 ? 'yellow' : 'red',
    tooltip: `Daily loss: ${Math.abs(profile.dailyPnL)}/${profile.parameters.dailyLossLimit}`
  });

  // Exposure status
  const exposurePercent = profile.currentExposure / profile.parameters.totalExposureLimit * 100;
  badges.push({
    label: 'Exposure',
    value: `${exposurePercent.toFixed(1)}%`,
    color: exposurePercent < 60 ? 'green' : exposurePercent < 85 ? 'yellow' : 'red',
    tooltip: `Total exposure: ${profile.currentExposure}/${profile.parameters.totalExposureLimit}`
  });

  return badges;
}

/**
 * Get recommended position size for trading interface
 */
export function getRecommendedPositionSize(
  userAddress: string,
  symbol: string,
  accountBalance: number
): {
  recommended: number;
  maximum: number;
  reason: string;
} {
  const profile = riskManager.getUserProfile(userAddress);
  
  if (!profile) {
    const safeSize = getSafePositionSize(accountBalance, 'medium');
    return {
      recommended: safeSize * 0.5,
      maximum: safeSize,
      reason: 'Default risk settings applied'
    };
  }

  const maxPositionSize = profile.parameters.maxPositionSize;
  const volatility = riskManager.getVolatilityData(symbol);
  
  let recommended = Math.min(
    accountBalance * 0.05, // 5% of balance
    maxPositionSize * 0.7  // 70% of max allowed
  );

  let reason = 'Based on account balance and risk settings';

  // Adjust for volatility
  if (volatility && volatility.volatility24h > profile.parameters.highVolatilityThreshold) {
    recommended *= profile.parameters.volatilityAdjustmentFactor;
    reason = 'Reduced due to high volatility';
  }

  // Adjust for risk score
  if (profile.riskScore > 70) {
    recommended *= 0.5;
    reason = 'Reduced due to high risk score';
  }

  return {
    recommended: Math.max(10, recommended), // Minimum $10
    maximum: Math.min(maxPositionSize, accountBalance * 0.1),
    reason
  };
}

// ============================================================================
// UTILITY FUNCTIONS FOR DEMO
// ============================================================================

/**
 * Initialize demo user with sample risk profile
 */
export async function initializeDemoUser(userAddress: string): Promise<void> {
  try {
    await setupUserRiskProfile(userAddress, 'medium', {
      dailyLossLimit: 1000,
      maxPositionSize: 2000,
      enableEmergencyControls: true,
      autoStopLoss: true
    });

    // Add some sample volatility data
    riskManager.updateVolatilityData('BTC', {
      symbol: 'BTC',
      volatility24h: 0.04,
      volatility7d: 0.06,
      averageVolatility: 0.045,
      volatilityRank: 6,
      lastUpdate: Date.now()
    });

    riskManager.updateVolatilityData('ETH', {
      symbol: 'ETH',
      volatility24h: 0.055,
      volatility7d: 0.08,
      averageVolatility: 0.065,
      volatilityRank: 7,
      lastUpdate: Date.now()
    });

    console.log('✅ Demo user initialized with risk profile');
  } catch (error) {
    console.error('Failed to initialize demo user:', error);
  }
}

/**
 * Create sample trading plan for testing
 */
export function createSampleTradingPlan(symbol: string = 'BTC'): TradingPlan {
  return {
    id: `plan_${Date.now()}`,
    symbol,
    direction: 'long',
    status: 'pending',
    entry: 43000,
    stopLoss: 41500,
    takeProfit: 45000,
    confidence: 75,
    riskLevel: 'medium',
    riskRewardRatio: 1.33,
    maxLoss: 750,
    potentialGain: 1000,
    reasoning: 'Technical breakout pattern with strong volume confirmation',
    timeFrame: '1h',
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'ai',
    tags: ['breakout', 'momentum'],
    marketConditions: 'Bullish trend continuation'
  };
}

/**
 * Test the risk management system
 */
export async function testRiskManagement(): Promise<void> {
  console.log('🧪 Testing RiverBit Risk Management System...\n');

  const testUserAddress = '0x1234567890123456789012345678901234567890';

  try {
    // 1. Initialize user
    console.log('1. Initializing demo user...');
    await initializeDemoUser(testUserAddress);

    // 2. Create and validate a trading plan
    console.log('2. Creating sample trading plan...');
    const plan = createSampleTradingPlan('BTC');
    
    console.log('3. Validating trading plan...');
    const validation = await quickValidatePlan(plan, testUserAddress);
    console.log(`   Result: ${validation.message}`);

    // 3. Test position size recommendations
    console.log('4. Getting position size recommendations...');
    const positionRec = getRecommendedPositionSize(testUserAddress, 'BTC', 10000);
    console.log(`   Recommended: $${positionRec.recommended.toFixed(2)}`);
    console.log(`   Maximum: $${positionRec.maximum.toFixed(2)}`);
    console.log(`   Reason: ${positionRec.reason}`);

    // 4. Test risk status
    console.log('5. Checking risk status...');
    const riskStatus = getRiskStatusForUI(testUserAddress);
    console.log(`   Status: ${riskStatus.status.toUpperCase()}`);
    console.log(`   Message: ${riskStatus.message}`);
    console.log(`   Can Trade: ${riskStatus.canTrade ? 'YES' : 'NO'}`);

    // 5. Generate risk report
    console.log('6. Generating risk report...');
    const report = riskManager.generateRiskReport(testUserAddress);
    console.log(report);

    // 6. Test emergency scenario
    console.log('7. Testing emergency scenario...');
    const emergencyActions = await riskManager.checkEmergencyStop(testUserAddress, {
      balance: 5000,
      dailyPnL: -1200, // Exceeds daily loss limit
      positions: {}
    });
    
    if (emergencyActions.length > 0) {
      console.log('   🚨 Emergency actions triggered:');
      emergencyActions.forEach(action => {
        console.log(`   - ${action.type}: ${action.reason} (Priority: ${action.priority})`);
      });
    } else {
      console.log('   ✅ No emergency actions needed');
    }

    console.log('\n✅ Risk management system test completed successfully!');

  } catch (error) {
    console.error('❌ Risk management test failed:', error);
  }
}

// Export everything for use in other parts of the application
export {
  riskManager,
  setupUserRiskProfile,
  quickValidatePlan,
  getSafePositionSize
};