import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  XCircle, 
  Loader,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  Shield,
  Clock,
  DollarSign,
  Percent
} from 'lucide-react';
import { hapticFeedback } from '../utils/animationUtils';

// Feedback Types
type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'trade' | 'price';

interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: {
    price?: number;
    change?: number;
    changePercent?: number;
    volume?: number;
    side?: 'buy' | 'sell';
    amount?: number;
  };
}

interface FeedbackContextType {
  showFeedback: (feedback: Omit<FeedbackMessage, 'id'>) => string;
  hideFeedback: (id: string) => void;
  showSuccess: (title: string, message: string, duration?: number) => string;
  showError: (title: string, message: string, duration?: number) => string;
  showWarning: (title: string, message: string, duration?: number) => string;
  showInfo: (title: string, message: string, duration?: number) => string;
  showLoading: (title: string, message: string) => string;
  showTradeConfirmation: (side: 'buy' | 'sell', amount: number, price: number) => string;
  showPriceAlert: (price: number, change: number, changePercent: number) => string;
  clearAll: () => void;
}

const FeedbackContext = createContext<FeedbackContextType | null>(null);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

// Floating Toast Component
const FloatingToast: React.FC<{
  feedback: FeedbackMessage;
  onClose: (id: string) => void;
  index: number;
}> = ({ feedback, onClose, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Entrance animation
    setTimeout(() => setIsVisible(true), 50);

    // Auto-hide timer
    if (!feedback.persistent && feedback.duration) {
      timerRef.current = setTimeout(() => {
        handleClose();
      }, feedback.duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [feedback.duration, feedback.persistent]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(feedback.id);
    }, 300);
  }, [feedback.id, onClose]);

  const getIcon = () => {
    switch (feedback.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-profit" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-danger" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'info':
        return <Info className="h-5 w-5 text-river-blue" />;
      case 'loading':
        return <Loader className="h-5 w-5 text-river-blue animate-spin" />;
      case 'trade':
        return feedback.metadata?.side === 'buy' ? 
          <TrendingUp className="h-5 w-5 text-profit" /> : 
          <TrendingDown className="h-5 w-5 text-loss" />;
      case 'price':
        return <DollarSign className="h-5 w-5 text-river-blue" />;
      default:
        return <Info className="h-5 w-5 text-river-blue" />;
    }
  };

  const getBackgroundClass = () => {
    switch (feedback.type) {
      case 'success':
        return 'bg-gradient-to-r from-profit/10 to-profit/5 border-profit/30 shadow-lg shadow-profit/10';
      case 'error':
        return 'bg-gradient-to-r from-danger/10 to-danger/5 border-danger/30 shadow-lg shadow-danger/10';
      case 'warning':
        return 'bg-gradient-to-r from-warning/10 to-warning/5 border-warning/30 shadow-lg shadow-warning/10';
      case 'trade':
        const tradeColor = feedback.metadata?.side === 'buy' ? 'profit' : 'loss';
        return `bg-gradient-to-r from-${tradeColor}/10 to-${tradeColor}/5 border-${tradeColor}/30 shadow-lg shadow-${tradeColor}/10`;
      default:
        return 'bg-gradient-to-r from-surface-1 to-surface-2 border-default/30 shadow-lg';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ease-out ${
        isVisible && !isExiting 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
      }`}
      style={{ 
        transform: `translateY(${index * 80}px) ${isVisible && !isExiting ? 'translateX(0)' : 'translateX(100%)'}`,
        transitionDelay: `${index * 50}ms`
      }}
    >
      <div 
        className={`max-w-sm w-full border rounded-lg p-4 backdrop-blur-sm cursor-pointer ${getBackgroundClass()}`}
        onClick={handleClose}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-bold text-white truncate">
                {feedback.title}
              </h4>
              {!feedback.persistent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="text-slate-400 hover:text-white transition-colors duration-150"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <p className="text-sm text-slate-300 font-medium mb-2 leading-tight">
              {feedback.message}
            </p>

            {/* Trade-specific metadata */}
            {feedback.type === 'trade' && feedback.metadata && (
              <div className="flex items-center space-x-3 text-xs">
                <Badge variant="outline" className={`${
                  feedback.metadata.side === 'buy' ? 'text-profit border-profit/30' : 'text-loss border-loss/30'
                }`}>
                  {feedback.metadata.side?.toUpperCase()}
                </Badge>
                <span className="text-primary font-mono">
                  ${feedback.metadata.amount?.toLocaleString()}
                </span>
                <span className="text-secondary font-mono">
                  @ ${feedback.metadata.price?.toLocaleString()}
                </span>
              </div>
            )}

            {/* Price-specific metadata */}
            {feedback.type === 'price' && feedback.metadata && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-primary font-mono font-bold">
                  ${feedback.metadata.price?.toLocaleString()}
                </span>
                <span className={`font-mono ${
                  (feedback.metadata.changePercent || 0) >= 0 ? 'text-profit' : 'text-loss'
                }`}>
                  {(feedback.metadata.changePercent || 0) >= 0 ? '+' : ''}
                  {feedback.metadata.changePercent?.toFixed(2)}%
                </span>
              </div>
            )}

            {/* Action button */}
            {feedback.action && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  feedback.action!.onClick();
                  handleClose();
                }}
                className="mt-2 text-xs text-river-blue hover:text-river-blue/80 font-semibold transition-colors duration-150"
              >
                {feedback.action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Bar Component
const StatusBar: React.FC<{
  feedbacks: FeedbackMessage[];
}> = ({ feedbacks }) => {
  const activeFeedback = feedbacks.find(f => f.persistent);
  
  if (!activeFeedback) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-surface-1/95 via-surface-2/90 to-surface-1/95 backdrop-blur-sm border-t border-river-blue/20 shadow-lg">
      <div className="max-w-screen-xl mx-auto px-4 py-3">
        <div className="flex items-center space-x-3">
          {activeFeedback.type === 'loading' && (
            <Loader className="h-4 w-4 text-river-blue animate-spin flex-shrink-0" />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">
                {activeFeedback.title}
              </span>
              <span className="text-sm font-medium text-slate-300">
                {activeFeedback.message}
              </span>
            </div>
          </div>
          
          {activeFeedback.metadata?.side && (
            <Badge variant="outline" className={`text-xs font-semibold ${
              activeFeedback.metadata.side === 'buy' 
                ? 'text-profit border-profit/40 bg-profit/10' 
                : 'text-loss border-loss/40 bg-loss/10'
            }`}>
              {activeFeedback.metadata.side.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Provider Component
export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [feedbacks, setFeedbacks] = useState<FeedbackMessage[]>([]);

  const showFeedback = useCallback((feedback: Omit<FeedbackMessage, 'id'>) => {
    const id = `feedback-${Date.now()}-${Math.random()}`;
    const newFeedback: FeedbackMessage = {
      ...feedback,
      id,
      duration: feedback.duration || 4000,
    };

    setFeedbacks(prev => [...prev, newFeedback]);

    // Haptic feedback based on type
    switch (feedback.type) {
      case 'success':
      case 'trade':
        hapticFeedback.success();
        break;
      case 'error':
        hapticFeedback.error();
        break;
      case 'warning':
        hapticFeedback.medium();
        break;
      default:
        hapticFeedback.light();
    }

    return id;
  }, []);

  const hideFeedback = useCallback((id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message: string, duration = 4000) => {
    return showFeedback({ type: 'success', title, message, duration });
  }, [showFeedback]);

  const showError = useCallback((title: string, message: string, duration = 6000) => {
    return showFeedback({ type: 'error', title, message, duration });
  }, [showFeedback]);

  const showWarning = useCallback((title: string, message: string, duration = 5000) => {
    return showFeedback({ type: 'warning', title, message, duration });
  }, [showFeedback]);

  const showInfo = useCallback((title: string, message: string, duration = 4000) => {
    return showFeedback({ type: 'info', title, message, duration });
  }, [showFeedback]);

  const showLoading = useCallback((title: string, message: string) => {
    return showFeedback({ type: 'loading', title, message, persistent: true });
  }, [showFeedback]);

  const showTradeConfirmation = useCallback((side: 'buy' | 'sell', amount: number, price: number) => {
    return showFeedback({
      type: 'trade',
      title: 'Order Executed',
      message: `${side === 'buy' ? 'Bought' : 'Sold'} successfully`,
      duration: 5000,
      metadata: { side, amount, price },
    });
  }, [showFeedback]);

  const showPriceAlert = useCallback((price: number, change: number, changePercent: number) => {
    return showFeedback({
      type: 'price',
      title: 'Price Alert',
      message: changePercent >= 0 ? 'Target price reached' : 'Stop loss triggered',
      duration: 6000,
      metadata: { price, change, changePercent },
    });
  }, [showFeedback]);

  const clearAll = useCallback(() => {
    setFeedbacks([]);
  }, []);

  const contextValue: FeedbackContextType = {
    showFeedback,
    hideFeedback,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showTradeConfirmation,
    showPriceAlert,
    clearAll,
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      
      {/* Floating Toasts */}
      {feedbacks
        .filter(f => !f.persistent)
        .map((feedback, index) => (
          <FloatingToast
            key={feedback.id}
            feedback={feedback}
            onClose={hideFeedback}
            index={index}
          />
        ))}
      
      {/* Status Bar */}
      <StatusBar feedbacks={feedbacks} />
    </FeedbackContext.Provider>
  );
};

// Hook for trading-specific feedback
export const useTradingFeedback = () => {
  const feedback = useFeedback();

  return {
    ...feedback,
    
    // Enhanced trading feedback methods
    orderPlaced: (side: 'buy' | 'sell', amount: number, price: number, type: 'market' | 'limit') => {
      return feedback.showInfo(
        'Order Placed',
        `${type === 'market' ? 'Market' : 'Limit'} ${side} order submitted`,
        3000
      );
    },

    orderFilled: (side: 'buy' | 'sell', amount: number, price: number) => {
      return feedback.showTradeConfirmation(side, amount, price);
    },

    orderCanceled: (orderId: string) => {
      return feedback.showWarning(
        'Order Canceled',
        `Order ${orderId.slice(0, 8)}... has been canceled`,
        3000
      );
    },

    insufficientBalance: (required: number, available: number) => {
      return feedback.showError(
        'Insufficient Balance',
        `Need $${required.toLocaleString()} but only $${available.toLocaleString()} available`,
        5000
      );
    },

    positionLiquidated: (symbol: string, amount: number) => {
      return feedback.showError(
        'Position Liquidated',
        `${symbol} position of $${amount.toLocaleString()} has been liquidated`,
        8000
      );
    },

    connectionLost: () => {
      return feedback.showError(
        'Connection Lost',
        'Reconnecting to trading servers...',
        0
      );
    },

    connectionRestored: () => {
      return feedback.showSuccess(
        'Connected',
        'Trading connection restored',
        3000
      );
    },
  };
};

export default FeedbackProvider;