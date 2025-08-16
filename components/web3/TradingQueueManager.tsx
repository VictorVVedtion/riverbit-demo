import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

export interface QueuedTrade {
  id: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  symbol: string;
  amount: number;
  price?: number;
  stopPrice?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  estimatedGas: number;
  maxSlippage: number;
  deadline: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

interface TradingQueueManagerProps {
  isConnected: boolean;
  userAddress?: string;
  onTradeExecuted: (trade: QueuedTrade) => void;
  onTradeFailed: (trade: QueuedTrade, error: string) => void;
}

const TradingQueueManager: React.FC<TradingQueueManagerProps> = ({
  isConnected,
  userAddress,
  onTradeExecuted,
  onTradeFailed
}) => {
  const [queue, setQueue] = useState<QueuedTrade[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Add trade to queue
  const addToQueue = useCallback((trade: Omit<QueuedTrade, 'id' | 'createdAt' | 'status' | 'retryCount'>) => {
    const newTrade: QueuedTrade = {
      ...trade,
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      status: 'pending',
      retryCount: 0
    };

    setQueue(prevQueue => {
      // Sort by priority: urgent -> high -> medium -> low
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const newQueue = [...prevQueue, newTrade];
      
      return newQueue.sort((a, b) => {
        if (a.status === 'processing') return -1;
        if (b.status === 'processing') return 1;
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    });

    toast.success(`Trade added to queue: ${trade.side.toUpperCase()} ${trade.amount} ${trade.symbol}`);
    return newTrade.id;
  }, []);

  // Remove trade from queue
  const removeFromQueue = useCallback((tradeId: string) => {
    setQueue(prevQueue => {
      const trade = prevQueue.find(t => t.id === tradeId);
      if (trade && trade.status === 'processing') {
        toast.error('Cannot remove trade currently being processed');
        return prevQueue;
      }
      
      toast.success('Trade removed from queue');
      return prevQueue.filter(t => t.id !== tradeId);
    });
  }, []);

  // Update trade status
  const updateTradeStatus = useCallback((tradeId: string, status: QueuedTrade['status'], error?: string) => {
    setQueue(prevQueue => 
      prevQueue.map(trade => 
        trade.id === tradeId 
          ? { ...trade, status, error, retryCount: error ? trade.retryCount + 1 : trade.retryCount }
          : trade
      )
    );
  }, []);

  // Simulate trade execution
  const executeTrade = async (trade: QueuedTrade): Promise<void> => {
    setCurrentProcessing(trade.id);
    updateTradeStatus(trade.id, 'processing');

    try {
      // Simulate transaction steps
      const steps = [
        'Validating trade parameters...',
        'Checking wallet balance...',
        'Estimating gas fees...',
        'Submitting transaction...',
        'Waiting for confirmation...',
        'Trade completed successfully!'
      ];

      for (let i = 0; i < steps.length; i++) {
        setProcessingProgress((i + 1) / steps.length * 100);
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        
        // Simulate potential failure
        if (Math.random() < 0.1 && i === 3) { // 10% chance of failure at submission
          throw new Error('Transaction failed: Insufficient gas or network congestion');
        }
      }

      updateTradeStatus(trade.id, 'completed');
      onTradeExecuted(trade);
      toast.success(`Trade executed: ${trade.side.toUpperCase()} ${trade.amount} ${trade.symbol}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateTradeStatus(trade.id, 'failed', errorMessage);
      onTradeFailed(trade, errorMessage);
      
      // Retry logic for failed trades
      if (trade.retryCount < trade.maxRetries) {
        toast.warning(`Trade failed, retrying... (${trade.retryCount + 1}/${trade.maxRetries})`);
        setTimeout(() => {
          updateTradeStatus(trade.id, 'pending');
        }, 5000); // Retry after 5 seconds
      } else {
        toast.error(`Trade failed permanently: ${errorMessage}`);
      }
    } finally {
      setCurrentProcessing(null);
      setProcessingProgress(0);
    }
  };

  // Process queue
  const processQueue = useCallback(async () => {
    if (!isConnected || isProcessing) return;

    const pendingTrades = queue.filter(t => t.status === 'pending');
    if (pendingTrades.length === 0) return;

    setIsProcessing(true);

    for (const trade of pendingTrades) {
      if (!isConnected) break; // Stop if disconnected during processing
      
      await executeTrade(trade);
      
      // Small delay between trades
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
  }, [queue, isConnected, isProcessing]);

  // Auto-process queue when new trades are added
  useEffect(() => {
    if (isConnected && !isProcessing) {
      const pendingTrades = queue.filter(t => t.status === 'pending');
      if (pendingTrades.length > 0) {
        const timer = setTimeout(processQueue, 2000); // Start processing after 2 seconds
        return () => clearTimeout(timer);
      }
    }
  }, [queue, isConnected, isProcessing, processQueue]);

  // Cleanup completed and failed trades periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setQueue(prevQueue => {
        const now = new Date();
        return prevQueue.filter(trade => {
          if (trade.status === 'pending' || trade.status === 'processing') return true;
          
          const ageMinutes = (now.getTime() - trade.createdAt.getTime()) / (1000 * 60);
          return ageMinutes < 30; // Keep for 30 minutes
        });
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: QueuedTrade['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'processing':
        return <Play className="w-4 h-4 text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled':
        return <Square className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: QueuedTrade['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'processing':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'cancelled':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority: QueuedTrade['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-400 border-red-400/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-400/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-400/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
    }
  };

  // Expose addToQueue function for parent components
  React.useImperativeHandle(React.createRef(), () => ({
    addToQueue
  }));

  if (!isConnected) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="text-center text-slate-400">
          <Pause className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Connect wallet to enable trading queue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Queue Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-white">Trading Queue</h3>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30 text-xs">
            {queue.filter(t => t.status === 'pending').length} pending
          </Badge>
          {isProcessing && (
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-400/30 text-xs animate-pulse">
              Processing...
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={processQueue}
            disabled={isProcessing || queue.filter(t => t.status === 'pending').length === 0}
            className="text-xs border-slate-600"
          >
            {isProcessing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isProcessing ? 'Processing' : 'Process Queue'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQueue(q => q.filter(t => t.status === 'processing'))}
            disabled={queue.length === 0}
            className="text-xs border-red-600/50 text-red-400"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Processing Progress */}
      {isProcessing && currentProcessing && (
        <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-400/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-400 text-sm font-medium">Processing trade...</span>
            <span className="text-blue-400 text-xs">{Math.round(processingProgress)}%</span>
          </div>
          <Progress value={processingProgress} className="h-2" />
        </div>
      )}

      {/* Queue List */}
      <div className="space-y-2">
        {queue.length === 0 ? (
          <div className="bg-slate-800/30 rounded-lg p-6 text-center">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No trades in queue</p>
          </div>
        ) : (
          queue.map((trade) => (
            <div
              key={trade.id}
              className={`bg-slate-800/50 rounded-lg p-3 border ${
                trade.id === currentProcessing 
                  ? 'border-blue-400/50 bg-blue-500/10' 
                  : 'border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(trade.status)}
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">
                        {trade.side.toUpperCase()} {trade.amount} {trade.symbol}
                      </span>
                      <Badge className={getPriorityColor(trade.priority)}>
                        {trade.priority}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1">
                      <span>Type: {trade.type}</span>
                      {trade.price && <span>Price: ${trade.price.toLocaleString()}</span>}
                      <span>Gas: {trade.estimatedGas.toLocaleString()}</span>
                      <span>Created: {trade.createdAt.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-medium ${getStatusColor(trade.status)}`}>
                    {trade.status.toUpperCase()}
                  </span>
                  
                  {trade.status === 'failed' && trade.retryCount < trade.maxRetries && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30 text-xs">
                      Retry {trade.retryCount}/{trade.maxRetries}
                    </Badge>
                  )}
                  
                  {(trade.status === 'pending' || trade.status === 'failed') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromQueue(trade.id)}
                      className="h-6 w-6 p-0 text-red-400 hover:bg-red-400/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {trade.error && (
                <div className="mt-2 p-2 bg-red-500/10 rounded border border-red-400/30">
                  <p className="text-red-400 text-xs">{trade.error}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Queue Stats */}
      {queue.length > 0 && (
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/30 rounded p-2 text-center">
            <div className="text-yellow-400 font-medium">
              {queue.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-slate-400">Pending</div>
          </div>
          <div className="bg-slate-800/30 rounded p-2 text-center">
            <div className="text-blue-400 font-medium">
              {queue.filter(t => t.status === 'processing').length}
            </div>
            <div className="text-slate-400">Processing</div>
          </div>
          <div className="bg-slate-800/30 rounded p-2 text-center">
            <div className="text-green-400 font-medium">
              {queue.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-slate-400">Completed</div>
          </div>
          <div className="bg-slate-800/30 rounded p-2 text-center">
            <div className="text-red-400 font-medium">
              {queue.filter(t => t.status === 'failed').length}
            </div>
            <div className="text-slate-400">Failed</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingQueueManager;