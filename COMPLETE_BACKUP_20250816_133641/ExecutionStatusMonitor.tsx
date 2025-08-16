import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { useExecutionMonitor } from '../utils/tradingAssistant/useTradingExecution';
import { ExecutionStatus } from '../utils/tradingAssistant/executionEngine';
import { formatNumber } from '../utils/web3Utils';
import { 
  Activity,
  CheckCircle, 
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  X,
  ExternalLink,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

interface ExecutionStatusMonitorProps {
  className?: string;
  showCompleted?: boolean;
  maxItems?: number;
}

const ExecutionStatusMonitor: React.FC<ExecutionStatusMonitorProps> = ({
  className = '',
  showCompleted = true,
  maxItems = 10
}) => {
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  
  const { 
    allStatuses, 
    activeExecutions, 
    completedExecutions, 
    failedExecutions 
  } = useExecutionMonitor();

  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status.status) {
      case 'executing':
      case 'preparing':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-300 font-medium" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executing':
      case 'preparing':
        return 'text-blue-400 bg-blue-900/30 border-blue-700';
      case 'completed':
        return 'text-green-400 bg-green-900/30 border-green-700';
      case 'failed':
        return 'text-red-400 bg-red-900/30 border-red-700';
      case 'cancelled':
        return 'text-orange-400 bg-orange-900/30 border-orange-700';
      default:
        return 'text-gray-300 font-medium bg-gray-900/30 border-gray-700';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'long':
      case 'buy':
        return <TrendingUp className="h-3 w-3 text-green-400" />;
      case 'short':
      case 'sell':
        return <TrendingDown className="h-3 w-3 text-red-400" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const renderExecutionItem = (execution: ExecutionStatus) => {
    const plan = execution.planId ? execution : null;
    const isActive = execution.status === 'executing' || execution.status === 'preparing';
    const isExpanded = showDetails === execution.planId;

    return (
      <div key={execution.planId} className="bg-slate-800/30 rounded-lg border border-slate-700/50">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(execution)}
              <div className="flex items-center gap-1">
                {/* {getActionIcon(plan?.tradingPlan?.action || '')} */}
                <span className="font-medium text-sm">
                  Execution #{execution.planId.slice(-6)}
                </span>
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs ${getStatusColor(execution.status)}`}
              >
                {execution.status.toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetails(isExpanded ? null : execution.planId)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {/* Progress for active executions */}
          {isActive && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-300 font-medium mb-1">
                <span>Step {execution.currentStep + 1} of {execution.totalSteps}</span>
                <span>{execution.progress.toFixed(0)}%</span>
              </div>
              <Progress value={execution.progress} className="h-1" />
            </div>
          )}

          {/* Current step for active executions */}
          {isActive && execution.currentStepStatus && (
            <div className="text-xs text-blue-200 bg-blue-900/30 rounded p-2 mb-2">
              {execution.currentStepStatus.description}
            </div>
          )}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-300 font-medium">Duration:</span>
              <span className="ml-1">{formatDuration(execution.startTime, execution.endTime)}</span>
            </div>
            <div>
              <span className="text-gray-300 font-medium">Steps:</span>
              <span className="ml-1">{execution.completedSteps.length} / {execution.totalSteps}</span>
            </div>
          </div>

          {/* Error display */}
          {execution.error && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                {execution.error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <>
            <Separator />
            <div className="p-3 space-y-3">
              {/* Completed steps */}
              {execution.completedSteps.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-300 mb-2">Completed Steps</h4>
                  <div className="space-y-1">
                    {execution.completedSteps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 text-xs">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="flex-1">{step.description}</span>
                        {step.txHash && (
                          <a
                            href={`https://sepolia.arbiscan.io/tx/${step.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              {execution.transactions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-300 mb-2">Transactions</h4>
                  <div className="space-y-1">
                    {execution.transactions.map((tx, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="flex-1">{tx.type}</span>
                        <a
                          href={`https://sepolia.arbiscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline font-mono"
                        >
                          {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const visibleExecutions = showCompleted 
    ? allStatuses.slice(0, maxItems)
    : activeExecutions.slice(0, maxItems);

  if (allStatuses.length === 0) {
    return null;
  }

  return (
    <Card className={`bg-slate-900/50 border-slate-700 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Execution Monitor
            </CardTitle>
            <CardDescription className="text-xs">
              {activeExecutions.length} active, {completedExecutions.length} completed, {failedExecutions.length} failed
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCollapsed(!collapsed)}
              className="h-6 w-6 p-0"
            >
              {collapsed ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0 space-y-2">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-blue-900/30 rounded p-2 text-center">
              <div className="text-lg font-bold text-blue-400">{activeExecutions.length}</div>
              <div className="text-xs text-blue-300">Active</div>
            </div>
            <div className="bg-green-900/30 rounded p-2 text-center">
              <div className="text-lg font-bold text-green-400">{completedExecutions.length}</div>
              <div className="text-xs text-green-300">Completed</div>
            </div>
            <div className="bg-red-900/30 rounded p-2 text-center">
              <div className="text-lg font-bold text-red-400">{failedExecutions.length}</div>
              <div className="text-xs text-red-300">Failed</div>
            </div>
          </div>

          {/* Execution list */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {visibleExecutions.map(renderExecutionItem)}
          </div>

          {/* Show more button */}
          {allStatuses.length > maxItems && (
            <div className="text-center pt-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs h-6"
                onClick={() => setShowDetails(null)}
              >
                {allStatuses.length - maxItems} more executions...
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ExecutionStatusMonitor;