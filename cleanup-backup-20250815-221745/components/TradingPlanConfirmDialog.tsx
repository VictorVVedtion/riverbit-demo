import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { formatNumber, formatPercentage } from '../utils/web3Utils';
import { 
  TradingPlan, 
  ExecutionPlan, 
  PreflightChecks, 
  ExecutionStatus,
  TradingExecutionEngine
} from '../utils/tradingAssistant/executionEngine';
import { 
  AlertTriangle, 
  CheckCircle,
  Clock,
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Target,
  AlertCircle,
  Info,
  Loader,
  X,
  ChevronRight
} from 'lucide-react';

interface TradingPlanConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradingPlan: TradingPlan | null;
  userAddress: string;
  onExecute: (executionPlan: ExecutionPlan) => Promise<void>;
  isExecuting?: boolean;
  executionStatus?: ExecutionStatus | null;
}

type DialogState = 'plan_review' | 'preflight' | 'confirmation' | 'executing' | 'completed' | 'failed';

const TradingPlanConfirmDialog: React.FC<TradingPlanConfirmDialogProps> = ({
  open,
  onOpenChange,
  tradingPlan,
  userAddress,
  onExecute,
  isExecuting = false,
  executionStatus
}) => {
  const [dialogState, setDialogState] = useState<DialogState>('plan_review');
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const [preflightChecks, setPreflightChecks] = useState<PreflightChecks | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes or plan changes
  useEffect(() => {
    if (open && tradingPlan) {
      setDialogState('plan_review');
      setExecutionPlan(null);
      setPreflightChecks(null);
      setError(null);
    }
  }, [open, tradingPlan]);

  // Update dialog state based on execution status
  useEffect(() => {
    if (executionStatus) {
      switch (executionStatus.status) {
        case 'executing':
          setDialogState('executing');
          break;
        case 'completed':
          setDialogState('completed');
          break;
        case 'failed':
          setDialogState('failed');
          break;
      }
    }
  }, [executionStatus]);

  const createExecutionPlan = async () => {
    if (!tradingPlan) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const engine = new TradingExecutionEngine();
      const plan = await engine.createExecutionPlan(tradingPlan, userAddress);
      setExecutionPlan(plan);
      setDialogState('preflight');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create execution plan');
    } finally {
      setIsLoading(false);
    }
  };

  const runPreflightChecks = async () => {
    if (!executionPlan) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const engine = new TradingExecutionEngine();
      const checks = await engine.performPreflightChecks(executionPlan, userAddress);
      setPreflightChecks(checks);
      setDialogState('confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preflight checks failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!executionPlan) return;
    
    setDialogState('executing');
    try {
      await onExecute(executionPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
      setDialogState('failed');
    }
  };

  const getDialogTitle = () => {
    switch (dialogState) {
      case 'plan_review':
        return 'Review Trading Plan';
      case 'preflight':
        return 'Preparing Execution';
      case 'confirmation':
        return 'Confirm Execution';
      case 'executing':
        return 'Executing Trade';
      case 'completed':
        return 'Execution Completed';
      case 'failed':
        return 'Execution Failed';
      default:
        return 'Trading Plan';
    }
  };

  const getActionIcon = () => {
    if (!tradingPlan) return <Target className="h-6 w-6" />;
    
    switch (tradingPlan.action) {
      case 'long':
      case 'buy':
        return <TrendingUp className="h-6 w-6 text-green-600" />;
      case 'short':
      case 'sell':
        return <TrendingDown className="h-6 w-6 text-red-600" />;
      case 'close_long':
      case 'close_short':
        return <X className="h-6 w-6 text-orange-600" />;
      default:
        return <Target className="h-6 w-6" />;
    }
  };

  const renderPlanReview = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          {getActionIcon()}
          <div>
            <h3 className="font-semibold">{tradingPlan?.symbol} {tradingPlan?.action.toUpperCase()}</h3>
            <p className="text-sm text-gray-300">Size: ${formatNumber(tradingPlan?.size || 0)} USDT</p>
          </div>
          <Badge variant="outline" className="ml-auto">
            {tradingPlan?.leverage}x leverage
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-300">Confidence:</span>
            <span className="ml-2 font-medium">{tradingPlan?.confidence}%</span>
          </div>
          <div>
            <span className="text-gray-300">Timeframe:</span>
            <span className="ml-2 font-medium">{tradingPlan?.timeframe}</span>
          </div>
        </div>
      </div>

      {tradingPlan?.reasoning && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Analysis</h4>
          <p className="text-sm text-blue-800">{tradingPlan.reasoning}</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderPreflight = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Loader className="h-5 w-5 animate-spin" />
        <span className="font-medium">Analyzing execution requirements...</span>
      </div>

      {executionPlan && (
        <div className="bg-slate-800/50 rounded-lg p-4">
          <h4 className="font-medium mb-3">Execution Steps</h4>
          <div className="space-y-2">
            {executionPlan.steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <span>{step.description}</span>
                <span className="ml-auto text-gray-300 font-medium">{step.estimatedGas} ETH</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-4">
          <Loader className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-300">Running preflight checks...</p>
        </div>
      )}
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-4">
      {preflightChecks && (
        <>
          {/* Overall Status */}
          <div className={`rounded-lg p-4 ${preflightChecks.overall ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {preflightChecks.overall ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${preflightChecks.overall ? 'text-green-900' : 'text-red-900'}`}>
                {preflightChecks.overall ? 'Ready to Execute' : 'Execution Blocked'}
              </span>
            </div>
            
            {preflightChecks.blockers.length > 0 && (
              <div className="space-y-1">
                {preflightChecks.blockers.map((blocker, index) => (
                  <p key={index} className="text-sm text-red-800">• {blocker}</p>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Checks */}
          <div className="space-y-3">
            <h4 className="font-medium">Validation Results</h4>
            
            {/* Balance Check */}
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Balance</span>
              </div>
              <div className="flex items-center gap-2">
                {preflightChecks.balanceCheck.passed ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">
                  ${formatNumber(preflightChecks.balanceCheck.available)} / ${formatNumber(preflightChecks.balanceCheck.required)}
                </span>
              </div>
            </div>

            {/* Leverage Check */}
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Leverage</span>
              </div>
              <div className="flex items-center gap-2">
                {preflightChecks.leverageCheck.passed ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">
                  {preflightChecks.leverageCheck.requested}x / {preflightChecks.leverageCheck.maxAllowed}x
                </span>
              </div>
            </div>

            {/* Market Check */}
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">Market</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  ${formatNumber(preflightChecks.marketCheck.currentPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {preflightChecks.warnings.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Warnings:</p>
                  {preflightChecks.warnings.map((warning, index) => (
                    <p key={index} className="text-sm">• {warning}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Execution Summary */}
          {executionPlan && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Execution Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-700">Total Steps:</span>
                  <span className="ml-2 font-medium text-blue-900">{executionPlan.steps.length}</span>
                </div>
                <div>
                  <span className="text-blue-700">Estimated Gas:</span>
                  <span className="ml-2 font-medium text-blue-900">{executionPlan.totalEstimatedGas} ETH</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderExecuting = () => (
    <div className="space-y-4">
      {executionStatus && (
        <>
          <div className="text-center mb-4">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-2" />
            <h3 className="font-medium">Executing Trade</h3>
            <p className="text-sm text-gray-300">
              Step {executionStatus.currentStep + 1} of {executionStatus.totalSteps}
            </p>
          </div>

          <Progress value={executionStatus.progress} className="mb-4" />

          {executionStatus.currentStepStatus && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Current Step</span>
              </div>
              <p className="text-sm text-blue-800">
                {executionStatus.currentStepStatus.description}
              </p>
            </div>
          )}

          {executionStatus.completedSteps.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Completed Steps</h4>
              <div className="space-y-2">
                {executionStatus.completedSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <span>{step.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderCompleted = () => (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h3 className="font-semibold text-green-900">Trade Executed Successfully!</h3>
        <p className="text-sm text-gray-300 mt-1">
          Your {tradingPlan?.action} position for {tradingPlan?.symbol} has been opened.
        </p>
      </div>
      
      {executionStatus?.transactions && (
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Transactions</h4>
          <div className="space-y-2">
            {executionStatus.transactions.map((tx, index) => (
              <div key={index} className="text-sm">
                <a 
                  href={`https://sepolia.arbiscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderFailed = () => (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <div>
        <h3 className="font-semibold text-red-900">Execution Failed</h3>
        <p className="text-sm text-gray-300 mt-1">
          {executionStatus?.error || error || 'An unexpected error occurred during execution.'}
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (dialogState) {
      case 'plan_review':
        return renderPlanReview();
      case 'preflight':
        return renderPreflight();
      case 'confirmation':
        return renderConfirmation();
      case 'executing':
        return renderExecuting();
      case 'completed':
        return renderCompleted();
      case 'failed':
        return renderFailed();
      default:
        return null;
    }
  };

  const renderFooter = () => {
    switch (dialogState) {
      case 'plan_review':
        return (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={createExecutionPlan} disabled={isLoading}>
              {isLoading ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
              Continue
            </Button>
          </>
        );
      
      case 'preflight':
        return (
          <>
            <Button variant="outline" onClick={() => setDialogState('plan_review')}>
              Back
            </Button>
            <Button onClick={runPreflightChecks} disabled={isLoading}>
              {isLoading ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
              Run Checks
            </Button>
          </>
        );
      
      case 'confirmation':
        return (
          <>
            <Button variant="outline" onClick={() => setDialogState('preflight')}>
              Back
            </Button>
            <Button 
              onClick={handleExecute} 
              disabled={!preflightChecks?.overall || isExecuting}
              className={preflightChecks?.overall ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {isExecuting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
              Execute Trade
            </Button>
          </>
        );
      
      case 'executing':
        return (
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Close & Monitor
          </Button>
        );
      
      case 'completed':
      case 'failed':
        return (
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        );
      
      default:
        return null;
    }
  };

  if (!tradingPlan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getActionIcon()}
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {dialogState === 'plan_review' && 'Review the AI-generated trading plan before execution.'}
            {dialogState === 'preflight' && 'Preparing execution plan and running validation checks.'}
            {dialogState === 'confirmation' && 'Confirm all details before executing the trade.'}
            {dialogState === 'executing' && 'Your trade is being executed on the blockchain.'}
            {dialogState === 'completed' && 'Your trade has been successfully executed.'}
            {dialogState === 'failed' && 'The trade execution encountered an error.'}
          </DialogDescription>
        </DialogHeader>

        {renderContent()}

        <DialogFooter className="flex gap-2">
          {renderFooter()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TradingPlanConfirmDialog;