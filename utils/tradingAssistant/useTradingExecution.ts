import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  TradingPlan, 
  ExecutionPlan, 
  PreflightChecks, 
  ExecutionStatus,
  ExecutionEvent,
  TradingExecutionEngine,
  executionEngine
} from './executionEngine';

export interface UseTradingExecutionReturn {
  // State
  isExecuting: boolean;
  executionStatus: ExecutionStatus | null;
  executionHistory: ExecutionStatus[];
  error: string | null;
  
  // Actions
  executePlan: (plan: TradingPlan, userAddress: string) => Promise<void>;
  cancelExecution: (planId: string) => Promise<boolean>;
  clearError: () => void;
  clearHistory: () => void;
  
  // Event subscription
  addEventListener: (callback: (event: ExecutionEvent) => void) => () => void;
}

export function useTradingExecution(): UseTradingExecutionReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const eventListenersRef = useRef<Set<(event: ExecutionEvent) => void>>(new Set());
  const currentExecutionRef = useRef<string | null>(null);

  // Handle execution events
  const handleExecutionEvent = useCallback((event: ExecutionEvent) => {
    const { type, planId, data } = event;
    
    // Only update status for current execution
    if (currentExecutionRef.current && planId === currentExecutionRef.current) {
      switch (type) {
        case 'execution_started':
          setIsExecuting(true);
          setError(null);
          break;
          
        case 'step_started':
        case 'step_completed':
        case 'step_failed':
          // Update current status from engine
          const status = executionEngine.getExecutionStatus(planId);
          if (status) {
            setExecutionStatus(status);
          }
          break;
          
        case 'execution_completed':
          setIsExecuting(false);
          setExecutionStatus(data?.status || null);
          
          // Add to history
          const completedStatus = executionEngine.getExecutionStatus(planId);
          if (completedStatus) {
            setExecutionHistory(prev => [completedStatus, ...prev.slice(0, 9)]); // Keep last 10
          }
          
          currentExecutionRef.current = null;
          break;
          
        case 'execution_failed':
          setIsExecuting(false);
          setError(data?.error || 'Execution failed');
          
          // Add to history
          const failedStatus = executionEngine.getExecutionStatus(planId);
          if (failedStatus) {
            setExecutionHistory(prev => [failedStatus, ...prev.slice(0, 9)]);
          }
          
          currentExecutionRef.current = null;
          break;
          
        case 'execution_cancelled':
          setIsExecuting(false);
          setExecutionStatus(null);
          setError('Execution was cancelled');
          currentExecutionRef.current = null;
          break;
      }
    }
    
    // Forward events to component listeners
    eventListenersRef.current.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in execution event listener:', err);
      }
    });
  }, []);

  // Subscribe to execution engine events
  useEffect(() => {
    executionEngine.addEventListener(handleExecutionEvent);
    
    return () => {
      executionEngine.removeEventListener(handleExecutionEvent);
    };
  }, [handleExecutionEvent]);

  // Execute a trading plan
  const executePlan = useCallback(async (plan: TradingPlan, userAddress: string) => {
    if (isExecuting) {
      throw new Error('Another execution is already in progress');
    }

    try {
      setError(null);
      setIsExecuting(true);
      currentExecutionRef.current = plan.id;
      
      // Create execution plan
      const executionPlan = await executionEngine.createExecutionPlan(plan, userAddress);
      
      // Perform preflight checks
      const preflightChecks = await executionEngine.performPreflightChecks(executionPlan, userAddress);
      
      if (!preflightChecks.overall) {
        throw new Error(`Preflight checks failed: ${preflightChecks.blockers.join(', ')}`);
      }
      
      // Execute the plan
      const finalStatus = await executionEngine.executePlan(
        executionPlan, 
        userAddress,
        (status) => {
          setExecutionStatus(status);
        }
      );
      
      if (finalStatus.status === 'failed') {
        throw new Error(finalStatus.error || 'Execution failed');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown execution error';
      setError(errorMessage);
      setIsExecuting(false);
      currentExecutionRef.current = null;
      throw err;
    }
  }, [isExecuting]);

  // Cancel current execution
  const cancelExecution = useCallback(async (planId: string): Promise<boolean> => {
    if (!isExecuting || currentExecutionRef.current !== planId) {
      return false;
    }
    
    const success = await executionEngine.cancelExecution(planId);
    
    if (success) {
      setIsExecuting(false);
      setExecutionStatus(null);
      setError('Execution cancelled');
      currentExecutionRef.current = null;
    }
    
    return success;
  }, [isExecuting]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear execution history
  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
    executionEngine.clearCompletedExecutions();
  }, []);

  // Add event listener
  const addEventListener = useCallback((callback: (event: ExecutionEvent) => void) => {
    eventListenersRef.current.add(callback);
    
    // Return cleanup function
    return () => {
      eventListenersRef.current.delete(callback);
    };
  }, []);

  return {
    isExecuting,
    executionStatus,
    executionHistory,
    error,
    executePlan,
    cancelExecution,
    clearError,
    clearHistory,
    addEventListener
  };
}

// Convenience hook for getting execution status by plan ID
export function useExecutionStatus(planId: string | null): ExecutionStatus | null {
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  
  useEffect(() => {
    if (!planId) {
      setStatus(null);
      return;
    }
    
    const updateStatus = () => {
      const currentStatus = executionEngine.getExecutionStatus(planId);
      setStatus(currentStatus);
    };
    
    // Initial update
    updateStatus();
    
    // Subscribe to events for this plan
    const cleanup = executionEngine.addEventListener((event) => {
      if (event.planId === planId) {
        updateStatus();
      }
    });
    
    return cleanup;
  }, [planId]);
  
  return status;
}

// Hook for monitoring all executions
export function useExecutionMonitor() {
  const [allStatuses, setAllStatuses] = useState<ExecutionStatus[]>([]);
  
  useEffect(() => {
    const updateAllStatuses = () => {
      setAllStatuses(executionEngine.getAllExecutionStatuses());
    };
    
    // Initial update
    updateAllStatuses();
    
    // Subscribe to all events
    const cleanup = executionEngine.addEventListener(() => {
      updateAllStatuses();
    });
    
    return cleanup;
  }, []);
  
  return {
    allStatuses,
    activeExecutions: allStatuses.filter(s => s.status === 'executing' || s.status === 'preparing'),
    completedExecutions: allStatuses.filter(s => s.status === 'completed'),
    failedExecutions: allStatuses.filter(s => s.status === 'failed')
  };
}