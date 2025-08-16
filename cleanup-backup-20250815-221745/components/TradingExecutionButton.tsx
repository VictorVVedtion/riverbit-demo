import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  TradingPlan,
  ExecutionStatus 
} from '../utils/tradingAssistant/executionEngine';
import { useTradingExecution } from '../utils/tradingAssistant/useTradingExecution';
import TradingPlanConfirmDialog from './TradingPlanConfirmDialog';
import { formatNumber } from '../utils/web3Utils';
import { 
  Play, 
  Loader, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react';

interface TradingExecutionButtonProps {
  tradingPlan: TradingPlan;
  userAddress: string;
  isConnected: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  onExecutionStart?: (planId: string) => void;
  onExecutionComplete?: (status: ExecutionStatus) => void;
  onExecutionError?: (error: string) => void;
}

const TradingExecutionButton: React.FC<TradingExecutionButtonProps> = ({
  tradingPlan,
  userAddress,
  isConnected,
  className = '',
  variant = 'default',
  size = 'default',
  onExecutionStart,
  onExecutionComplete,
  onExecutionError
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const {
    isExecuting,
    executionStatus,
    error,
    executePlan,
    clearError,
    addEventListener
  } = useTradingExecution();

  // Subscribe to execution events
  React.useEffect(() => {
    const cleanup = addEventListener((event) => {
      switch (event.type) {
        case 'execution_started':
          onExecutionStart?.(event.planId);
          break;
        case 'execution_completed':
          onExecutionComplete?.(event.data?.status);
          break;
        case 'execution_failed':
          onExecutionError?.(event.data?.error || 'Execution failed');
          setLastError(event.data?.error || 'Execution failed');
          break;
      }
    });
    
    return cleanup;
  }, [addEventListener, onExecutionStart, onExecutionComplete, onExecutionError]);

  const handleExecute = async () => {
    if (!isConnected) {
      setLastError('Please connect your wallet first');
      return;
    }
    
    setDialogOpen(true);
  };

  const handleDialogExecute = async (executionPlan: any) => {
    try {
      clearError();
      setLastError(null);
      await executePlan(tradingPlan, userAddress);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Execution failed';
      setLastError(errorMessage);
      throw err;
    }
  };

  const getButtonContent = () => {
    if (isExecuting && executionStatus?.planId === tradingPlan.id) {
      return (
        <>
          <Loader className="h-4 w-4 animate-spin mr-2" />
          Executing ({executionStatus.progress.toFixed(0)}%)
        </>
      );
    }

    if (executionStatus?.planId === tradingPlan.id && executionStatus.status === 'completed') {
      return (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Executed
        </>
      );
    }

    if (executionStatus?.planId === tradingPlan.id && executionStatus.status === 'failed') {
      return (
        <>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Failed
        </>
      );
    }

    return (
      <>
        <Play className="h-4 w-4 mr-2" />
        Execute Trade
      </>
    );
  };

  const getButtonVariant = () => {
    if (executionStatus?.planId === tradingPlan.id) {
      switch (executionStatus.status) {
        case 'completed':
          return 'outline';
        case 'failed':
          return 'destructive';
        case 'executing':
          return 'outline';
        default:
          return variant;
      }
    }
    return variant;
  };

  const isDisabled = () => {
    if (!isConnected) return true;
    if (isExecuting && executionStatus?.planId === tradingPlan.id) return true;
    if (executionStatus?.planId === tradingPlan.id && executionStatus.status === 'completed') return true;
    return false;
  };

  const getActionIcon = () => {
    switch (tradingPlan.action) {
      case 'long':
      case 'buy':
        return <TrendingUp className="h-3 w-3" />;
      case 'short':
      case 'sell':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <DollarSign className="h-3 w-3" />;
    }
  };

  const getConfidenceColor = () => {
    if (tradingPlan.confidence >= 80) return 'text-green-400';
    if (tradingPlan.confidence >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  return (
    <div className="space-y-3">
      {/* Trading Plan Summary */}
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getActionIcon()}
            <span className="font-medium text-sm">
              {tradingPlan.symbol} {tradingPlan.action.toUpperCase()}
            </span>
            <Badge variant="outline" className="text-xs">
              {tradingPlan.leverage}x
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-300 font-medium">Confidence:</span>
            <span className={`text-xs font-medium ${getConfidenceColor()}`}>
              {tradingPlan.confidence}%
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-300 font-medium">Size:</span>
            <span className="ml-1 font-medium">${formatNumber(tradingPlan.size)}</span>
          </div>
          <div>
            <span className="text-gray-300 font-medium">Timeframe:</span>
            <span className="ml-1 font-medium">{tradingPlan.timeframe}</span>
          </div>
        </div>

        {tradingPlan.reasoning && (
          <div className="mt-2 p-2 bg-blue-900/20 rounded border border-blue-800/30">
            <p className="text-xs text-blue-200 leading-relaxed">
              {tradingPlan.reasoning}
            </p>
          </div>
        )}
      </div>

      {/* Execution Status */}
      {executionStatus?.planId === tradingPlan.id && (
        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-600/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium">Execution Status</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-medium">Progress:</span>
              <span className="font-medium">{executionStatus.progress.toFixed(0)}%</span>
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-medium">Steps:</span>
              <span className="font-medium">
                {executionStatus.currentStep + 1} / {executionStatus.totalSteps}
              </span>
            </div>
            
            {executionStatus.currentStepStatus && (
              <div className="text-xs text-blue-200 bg-blue-900/30 rounded p-2">
                {executionStatus.currentStepStatus.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {(error || lastError) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {error || lastError}
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Warning */}
      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Connect your wallet to execute this trading plan
          </AlertDescription>
        </Alert>
      )}

      {/* Execute Button */}
      <Button
        onClick={handleExecute}
        disabled={isDisabled()}
        variant={getButtonVariant() as any}
        size={size}
        className={`w-full ${className}`}
      >
        {getButtonContent()}
      </Button>

      {/* Execution Dialog */}
      <TradingPlanConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tradingPlan={tradingPlan}
        userAddress={userAddress}
        onExecute={handleDialogExecute}
        isExecuting={isExecuting && executionStatus?.planId === tradingPlan.id}
        executionStatus={executionStatus?.planId === tradingPlan.id ? executionStatus : null}
      />
    </div>
  );
};

export default TradingExecutionButton;