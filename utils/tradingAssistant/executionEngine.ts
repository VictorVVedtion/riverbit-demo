import { ethers } from 'ethers';
import { web3Manager, TransactionStatus, Transaction, formatNumber } from '../web3Utils';
import { DEFAULT_PARAMS, formatUSDC, parseUSDC } from '../contractConfig';

// Trading Plan Types
export interface TradingPlan {
  id: string;
  symbol: string;
  action: 'buy' | 'sell' | 'long' | 'short' | 'close_long' | 'close_short';
  size: number; // Position size in USDT
  leverage?: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
  confidence: number; // 0-100
  timeframe: string;
  metadata?: Record<string, any>;
}

// Execution Step Types
export interface ExecutionStep {
  id: string;
  type: 'approve' | 'deposit' | 'open_position' | 'close_position' | 'withdraw';
  description: string;
  params: Record<string, any>;
  estimatedGas?: string;
  requiredBalance?: number;
  requiredAllowance?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  txHash?: string;
  error?: string;
}

// Execution Plan
export interface ExecutionPlan {
  id: string;
  tradingPlan: TradingPlan;
  steps: ExecutionStep[];
  totalEstimatedGas: string;
  requiredBalance: number;
  requiredAllowance: number;
  createdAt: Date;
}

// Pre-flight Check Results
export interface PreflightChecks {
  balanceCheck: {
    passed: boolean;
    required: number;
    available: number;
    shortfall?: number;
  };
  allowanceCheck: {
    passed: boolean;
    required: number;
    current: number;
    needsApproval: boolean;
  };
  marketCheck: {
    passed: boolean;
    currentPrice: number;
    priceDeviation?: number;
    maxSlippage: number;
  };
  leverageCheck: {
    passed: boolean;
    requested: number;
    maxAllowed: number;
  };
  marginCheck: {
    passed: boolean;
    requiredMargin: number;
    availableMargin: number;
  };
  overall: boolean;
  warnings: string[];
  blockers: string[];
}

// Execution Status
export interface ExecutionStatus {
  planId: string;
  status: 'preparing' | 'confirming' | 'executing' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  totalSteps: number;
  progress: number; // 0-100
  completedSteps: ExecutionStep[];
  currentStepStatus?: ExecutionStep;
  transactions: Transaction[];
  startTime: Date;
  endTime?: Date;
  error?: string;
}

// Event Types
export type ExecutionEventType = 
  | 'plan_created'
  | 'preflight_started'
  | 'preflight_completed'
  | 'execution_started'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'execution_completed'
  | 'execution_failed'
  | 'execution_cancelled';

export interface ExecutionEvent {
  type: ExecutionEventType;
  planId: string;
  data?: any;
  timestamp: Date;
}

// Trading Execution Engine
export class TradingExecutionEngine {
  private executionStatuses = new Map<string, ExecutionStatus>();
  private eventListeners: Array<(event: ExecutionEvent) => void> = [];

  // Event Management
  addEventListener(callback: (event: ExecutionEvent) => void) {
    this.eventListeners.push(callback);
  }

  removeEventListener(callback: (event: ExecutionEvent) => void) {
    const index = this.eventListeners.indexOf(callback);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private emitEvent(type: ExecutionEventType, planId: string, data?: any) {
    const event: ExecutionEvent = {
      type,
      planId,
      data,
      timestamp: new Date()
    };
    
    this.eventListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in execution event listener:', error);
      }
    });
  }

  // Convert Trading Plan to Execution Plan
  async createExecutionPlan(tradingPlan: TradingPlan, userAddress: string): Promise<ExecutionPlan> {
    this.emitEvent('plan_created', tradingPlan.id, { tradingPlan });

    const steps: ExecutionStep[] = [];
    let totalGasEstimate = 0;
    let requiredBalance = 0;
    let requiredAllowance = 0;

    // Get current account info
    const accountInfo = await web3Manager.getAccountInfo(userAddress);
    const currentPosition = await web3Manager.getPosition(userAddress, tradingPlan.symbol);
    const currentPrice = await web3Manager.getAssetPrice(tradingPlan.symbol);

    // Determine what steps are needed based on the trading plan
    const { action, size, leverage = 10 } = tradingPlan;
    
    if (action === 'long' || action === 'buy') {
      // Opening a long position
      const notionalValue = size;
      const requiredMargin = notionalValue / leverage;
      
      // Check if we need to deposit more funds
      if (accountInfo.balance < requiredMargin) {
        const depositAmount = requiredMargin - accountInfo.balance + (requiredMargin * 0.1); // 10% buffer
        requiredBalance += depositAmount;
        requiredAllowance += depositAmount;

        // Add approval step if needed
        const currentAllowance = await web3Manager.checkUSDCAllowance(userAddress);
        if (currentAllowance < depositAmount) {
          steps.push({
            id: `approve-${Date.now()}`,
            type: 'approve',
            description: `Approve ${formatNumber(depositAmount)} USDC for trading`,
            params: { amount: depositAmount },
            estimatedGas: '0.001',
            requiredAllowance: depositAmount,
            status: 'pending'
          });
          totalGasEstimate += 0.001;
        }

        // Add deposit step
        steps.push({
          id: `deposit-${Date.now()}`,
          type: 'deposit',
          description: `Deposit ${formatNumber(depositAmount)} USDC to trading account`,
          params: { amount: depositAmount },
          estimatedGas: '0.002',
          requiredBalance: depositAmount,
          status: 'pending'
        });
        totalGasEstimate += 0.002;
      }

      // Add open position step
      steps.push({
        id: `open-${Date.now()}`,
        type: 'open_position',
        description: `Open ${action} position: ${formatNumber(size)} USDT on ${tradingPlan.symbol} with ${leverage}x leverage`,
        params: {
          symbol: tradingPlan.symbol,
          size: size,
          leverage: leverage,
          isLong: true
        },
        estimatedGas: '0.003',
        requiredBalance: requiredMargin,
        status: 'pending'
      });
      totalGasEstimate += 0.003;

    } else if (action === 'short' || action === 'sell') {
      // Opening a short position
      const notionalValue = size;
      const requiredMargin = notionalValue / leverage;
      
      // Similar logic for short positions
      if (accountInfo.balance < requiredMargin) {
        const depositAmount = requiredMargin - accountInfo.balance + (requiredMargin * 0.1);
        requiredBalance += depositAmount;
        requiredAllowance += depositAmount;

        // Add approval step if needed
        const currentAllowance = await web3Manager.checkUSDCAllowance(userAddress);
        if (currentAllowance < depositAmount) {
          steps.push({
            id: `approve-${Date.now()}`,
            type: 'approve',
            description: `Approve ${formatNumber(depositAmount)} USDC for trading`,
            params: { amount: depositAmount },
            estimatedGas: '0.001',
            requiredAllowance: depositAmount,
            status: 'pending'
          });
          totalGasEstimate += 0.001;
        }

        steps.push({
          id: `deposit-${Date.now()}`,
          type: 'deposit',
          description: `Deposit ${formatNumber(depositAmount)} USDC to trading account`,
          params: { amount: depositAmount },
          estimatedGas: '0.002',
          requiredBalance: depositAmount,
          status: 'pending'
        });
        totalGasEstimate += 0.002;
      }

      steps.push({
        id: `open-${Date.now()}`,
        type: 'open_position',
        description: `Open ${action} position: ${formatNumber(size)} USDT on ${tradingPlan.symbol} with ${leverage}x leverage`,
        params: {
          symbol: tradingPlan.symbol,
          size: -size, // Negative for short
          leverage: leverage,
          isLong: false
        },
        estimatedGas: '0.003',
        status: 'pending'
      });
      totalGasEstimate += 0.003;

    } else if (action === 'close_long' || action === 'close_short') {
      // Closing position
      if (currentPosition === 0) {
        throw new Error(`No ${action === 'close_long' ? 'long' : 'short'} position found for ${tradingPlan.symbol}`);
      }

      const positionSize = Math.abs(currentPosition);
      const closeSize = size > 0 ? Math.min(size, positionSize) : positionSize;

      steps.push({
        id: `close-${Date.now()}`,
        type: 'close_position',
        description: `Close ${action === 'close_long' ? 'long' : 'short'} position: ${formatNumber(closeSize)} USDT on ${tradingPlan.symbol}`,
        params: {
          symbol: tradingPlan.symbol,
          size: action === 'close_long' ? -closeSize : closeSize // Opposite of current position
        },
        estimatedGas: '0.003',
        status: 'pending'
      });
      totalGasEstimate += 0.003;
    }

    const executionPlan: ExecutionPlan = {
      id: tradingPlan.id,
      tradingPlan,
      steps,
      totalEstimatedGas: totalGasEstimate.toFixed(4),
      requiredBalance,
      requiredAllowance,
      createdAt: new Date()
    };

    return executionPlan;
  }

  // Perform Pre-flight Checks
  async performPreflightChecks(
    executionPlan: ExecutionPlan, 
    userAddress: string
  ): Promise<PreflightChecks> {
    this.emitEvent('preflight_started', executionPlan.id);

    const { tradingPlan, requiredBalance, requiredAllowance } = executionPlan;
    const checks: PreflightChecks = {
      balanceCheck: { passed: false, required: requiredBalance, available: 0 },
      allowanceCheck: { passed: false, required: requiredAllowance, current: 0, needsApproval: false },
      marketCheck: { passed: false, currentPrice: 0, maxSlippage: DEFAULT_PARAMS.slippageTolerance },
      leverageCheck: { passed: false, requested: tradingPlan.leverage || 1, maxAllowed: 1 },
      marginCheck: { passed: false, requiredMargin: 0, availableMargin: 0 },
      overall: false,
      warnings: [],
      blockers: []
    };

    try {
      // 1. Balance Check
      const usdcBalance = await web3Manager.getUSDCBalance(userAddress);
      checks.balanceCheck.available = usdcBalance;
      checks.balanceCheck.passed = usdcBalance >= requiredBalance;
      
      if (!checks.balanceCheck.passed) {
        checks.balanceCheck.shortfall = requiredBalance - usdcBalance;
        checks.blockers.push(`Insufficient USDC balance. Need ${formatNumber(requiredBalance)}, have ${formatNumber(usdcBalance)}`);
      }

      // 2. Allowance Check
      const allowance = await web3Manager.checkUSDCAllowance(userAddress);
      checks.allowanceCheck.current = allowance;
      checks.allowanceCheck.needsApproval = allowance < requiredAllowance;
      checks.allowanceCheck.passed = allowance >= requiredAllowance;

      if (checks.allowanceCheck.needsApproval) {
        checks.warnings.push(`USDC approval needed for ${formatNumber(requiredAllowance)} USDC`);
      }

      // 3. Market Check
      const currentPrice = await web3Manager.getAssetPrice(tradingPlan.symbol);
      checks.marketCheck.currentPrice = currentPrice;
      checks.marketCheck.passed = true; // Always pass for now

      if (tradingPlan.entryPrice) {
        const priceDeviation = Math.abs(currentPrice - tradingPlan.entryPrice) / tradingPlan.entryPrice;
        checks.marketCheck.priceDeviation = priceDeviation;
        
        if (priceDeviation > checks.marketCheck.maxSlippage) {
          checks.warnings.push(`Price deviation ${(priceDeviation * 100).toFixed(2)}% exceeds max slippage ${(checks.marketCheck.maxSlippage * 100).toFixed(2)}%`);
        }
      }

      // 4. Leverage Check
      const isXStock = tradingPlan.symbol.startsWith('x');
      const maxLeverage = isXStock ? DEFAULT_PARAMS.maxLeverage.xStock : DEFAULT_PARAMS.maxLeverage.crypto;
      checks.leverageCheck.maxAllowed = maxLeverage;
      checks.leverageCheck.passed = (tradingPlan.leverage || 1) <= maxLeverage;

      if (!checks.leverageCheck.passed) {
        checks.blockers.push(`Leverage ${tradingPlan.leverage}x exceeds maximum ${maxLeverage}x for ${isXStock ? 'stocks' : 'crypto'}`);
      }

      // 5. Margin Check
      const accountInfo = await web3Manager.getAccountInfo(userAddress);
      const requiredMargin = tradingPlan.size / (tradingPlan.leverage || 1);
      checks.marginCheck.requiredMargin = requiredMargin;
      checks.marginCheck.availableMargin = accountInfo.balance - accountInfo.totalMargin;
      checks.marginCheck.passed = checks.marginCheck.availableMargin >= requiredMargin;

      if (!checks.marginCheck.passed) {
        checks.blockers.push(`Insufficient available margin. Need ${formatNumber(requiredMargin)}, have ${formatNumber(checks.marginCheck.availableMargin)}`);
      }

      // Overall check
      checks.overall = checks.balanceCheck.passed && 
                      checks.leverageCheck.passed && 
                      checks.marginCheck.passed && 
                      checks.marketCheck.passed;

    } catch (error) {
      console.error('Preflight checks failed:', error);
      checks.blockers.push(`System error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.emitEvent('preflight_completed', executionPlan.id, { checks });
    return checks;
  }

  // Execute Trading Plan
  async executePlan(
    executionPlan: ExecutionPlan, 
    userAddress: string,
    onStepUpdate?: (status: ExecutionStatus) => void
  ): Promise<ExecutionStatus> {
    const planId = executionPlan.id;
    
    // Initialize execution status
    const status: ExecutionStatus = {
      planId,
      status: 'executing',
      currentStep: 0,
      totalSteps: executionPlan.steps.length,
      progress: 0,
      completedSteps: [],
      transactions: [],
      startTime: new Date()
    };

    this.executionStatuses.set(planId, status);
    this.emitEvent('execution_started', planId, { executionPlan });

    try {
      // Execute each step
      for (let i = 0; i < executionPlan.steps.length; i++) {
        const step = executionPlan.steps[i];
        
        // Update status
        status.currentStep = i;
        status.currentStepStatus = { ...step, status: 'in_progress' };
        status.progress = (i / executionPlan.steps.length) * 100;
        
        this.emitEvent('step_started', planId, { step, stepIndex: i });
        onStepUpdate?.(status);

        try {
          // Execute the step
          const txHash = await this.executeStep(step, userAddress);
          
          // Update step status
          step.status = 'completed';
          step.txHash = txHash;
          status.completedSteps.push(step);
          
          // Add transaction to status
          if (txHash) {
            status.transactions.push({
              hash: txHash,
              type: this.mapStepTypeToTransactionType(step.type),
              status: TransactionStatus.SUCCESS,
              timestamp: Date.now(),
              amount: step.params.amount,
              symbol: step.params.symbol
            });
          }

          this.emitEvent('step_completed', planId, { step, txHash });
          
        } catch (error) {
          // Handle step failure
          step.status = 'failed';
          step.error = error instanceof Error ? error.message : 'Unknown error';
          
          status.status = 'failed';
          status.error = `Step ${i + 1} failed: ${step.error}`;
          status.endTime = new Date();
          
          this.emitEvent('step_failed', planId, { step, error: step.error });
          this.emitEvent('execution_failed', planId, { error: status.error });
          
          onStepUpdate?.(status);
          return status;
        }
      }

      // Execution completed successfully
      status.status = 'completed';
      status.progress = 100;
      status.endTime = new Date();
      
      this.emitEvent('execution_completed', planId, { status });
      onStepUpdate?.(status);
      
      return status;

    } catch (error) {
      // Handle overall execution failure
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown execution error';
      status.endTime = new Date();
      
      this.emitEvent('execution_failed', planId, { error: status.error });
      onStepUpdate?.(status);
      
      return status;
    }
  }

  // Execute Individual Step
  private async executeStep(step: ExecutionStep, userAddress: string): Promise<string | null> {
    const { type, params } = step;

    switch (type) {
      case 'approve':
        const approveTx = await web3Manager.approveUSDC(params.amount);
        await approveTx.wait();
        return approveTx.hash;

      case 'deposit':
        const depositTx = await web3Manager.deposit(params.amount);
        await depositTx.wait();
        return depositTx.hash;

      case 'open_position':
        const openTx = await web3Manager.openPosition(
          params.symbol,
          params.size,
          params.leverage
        );
        await openTx.wait();
        return openTx.hash;

      case 'close_position':
        const closeTx = await web3Manager.closePosition(
          params.symbol,
          params.size
        );
        await closeTx.wait();
        return closeTx.hash;

      case 'withdraw':
        const withdrawTx = await web3Manager.withdraw(params.amount);
        await withdrawTx.wait();
        return withdrawTx.hash;

      default:
        throw new Error(`Unknown step type: ${type}`);
    }
  }

  // Helper method to map step types to transaction types
  private mapStepTypeToTransactionType(stepType: ExecutionStep['type']): Transaction['type'] {
    const mapping: Record<ExecutionStep['type'], Transaction['type']> = {
      'approve': 'deposit', // Closest match
      'deposit': 'deposit',
      'open_position': 'open_position',
      'close_position': 'close_position',
      'withdraw': 'withdraw'
    };
    return mapping[stepType];
  }

  // Cancel Execution
  async cancelExecution(planId: string): Promise<boolean> {
    const status = this.executionStatuses.get(planId);
    if (!status || status.status === 'completed' || status.status === 'failed') {
      return false;
    }

    status.status = 'cancelled';
    status.endTime = new Date();
    
    this.emitEvent('execution_cancelled', planId, { status });
    return true;
  }

  // Get Execution Status
  getExecutionStatus(planId: string): ExecutionStatus | null {
    return this.executionStatuses.get(planId) || null;
  }

  // Get All Execution Statuses
  getAllExecutionStatuses(): ExecutionStatus[] {
    return Array.from(this.executionStatuses.values());
  }

  // Clear Completed Executions
  clearCompletedExecutions(): void {
    for (const [planId, status] of this.executionStatuses) {
      if (status.status === 'completed' || status.status === 'failed') {
        this.executionStatuses.delete(planId);
      }
    }
  }

  // Utility Methods
  static generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static estimateExecutionTime(executionPlan: ExecutionPlan): number {
    // Estimate based on number of steps and step types
    let timeEstimate = 0;
    
    for (const step of executionPlan.steps) {
      switch (step.type) {
        case 'approve':
          timeEstimate += 30; // 30 seconds
          break;
        case 'deposit':
        case 'withdraw':
          timeEstimate += 45; // 45 seconds
          break;
        case 'open_position':
        case 'close_position':
          timeEstimate += 60; // 60 seconds
          break;
        default:
          timeEstimate += 30;
      }
    }
    
    return timeEstimate;
  }

  static calculateTotalCost(executionPlan: ExecutionPlan): {
    gasCost: number;
    tradingFees: number;
    total: number;
  } {
    const gasCost = parseFloat(executionPlan.totalEstimatedGas);
    const tradingFees = executionPlan.tradingPlan.size * 0.001; // 0.1% trading fee estimate
    
    return {
      gasCost,
      tradingFees,
      total: gasCost + tradingFees
    };
  }
}

// Global execution engine instance
export const executionEngine = new TradingExecutionEngine();

// Export types for use in components
export type {
  TradingPlan,
  ExecutionStep,
  ExecutionPlan,
  PreflightChecks,
  ExecutionStatus,
  ExecutionEvent,
  ExecutionEventType
};