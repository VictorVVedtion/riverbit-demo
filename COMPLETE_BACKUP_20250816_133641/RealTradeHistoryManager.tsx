import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  ExternalLink, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign,
  Filter,
  Download,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { web3Manager, shortenAddress, formatNumber } from '../utils/web3Utils';

interface TradeEvent {
  type: 'PositionOpened' | 'PositionClosed' | 'Deposit' | 'Withdraw';
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  args: any;
  user: string;
  symbol?: string;
  size?: number;
  price?: number;
  pnl?: number;
  amount?: number;
}

interface RealTradeHistoryManagerProps {
  userAddress: string;
  onRefresh?: () => void;
}

const RealTradeHistoryManager: React.FC<RealTradeHistoryManagerProps> = ({
  userAddress,
  onRefresh
}) => {
  const [events, setEvents] = useState<TradeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [filter, setFilter] = useState<'all' | 'trades' | 'deposits'>('all');

  // Load historical events on mount and when user changes
  useEffect(() => {
    if (userAddress && web3Manager.isConnected) {
      loadHistoricalEvents();
    }
  }, [userAddress]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!userAddress || !web3Manager.isConnected) return;

    const callbacks = {
      onDeposit: (user: string, amount: number, txHash: string) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          addNewEvent({
            type: 'Deposit',
            blockNumber: 0,
            transactionHash: txHash,
            timestamp: Date.now(),
            args: { amount },
            user,
            amount
          });
          onRefresh?.();
        }
      },
      onWithdraw: (user: string, amount: number, txHash: string) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          addNewEvent({
            type: 'Withdraw',
            blockNumber: 0,
            transactionHash: txHash,
            timestamp: Date.now(),
            args: { amount },
            user,
            amount
          });
          onRefresh?.();
        }
      },
      onPositionOpened: (user: string, symbol: string, size: number, price: number, txHash: string) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          addNewEvent({
            type: 'PositionOpened',
            blockNumber: 0,
            transactionHash: txHash,
            timestamp: Date.now(),
            args: { symbol, size, price },
            user,
            symbol,
            size,
            price
          });
          onRefresh?.();
        }
      },
      onPositionClosed: (user: string, symbol: string, size: number, pnl: number, txHash: string) => {
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          addNewEvent({
            type: 'PositionClosed',
            blockNumber: 0,
            transactionHash: txHash,
            timestamp: Date.now(),
            args: { symbol, size, pnl },
            user,
            symbol,
            size,
            pnl
          });
          onRefresh?.();
        }
      }
    };

    web3Manager.setupContractEventListeners(callbacks);

    return () => {
      web3Manager.removeContractEventListeners();
    };
  }, [userAddress, onRefresh]);

  // Load historical events from blockchain
  const loadHistoricalEvents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get events from the last 1000 blocks (adjust as needed)
      const currentBlock = await web3Manager.contracts.riverbit?.provider?.getBlockNumber();
      const fromBlock = Math.max(0, (currentBlock || 0) - 1000);

      const historicalEvents = await web3Manager.getHistoricalEvents(
        userAddress,
        fromBlock,
        'latest'
      );

      // Process and format events
      const formattedEvents = await Promise.all(
        historicalEvents.map(async (event) => {
          try {
            // Get block timestamp
            const block = await web3Manager.contracts.riverbit?.provider?.getBlock(event.blockNumber);
            const timestamp = block ? block.timestamp * 1000 : Date.now();

            return {
              ...event,
              timestamp,
              user: userAddress
            } as TradeEvent;
          } catch (error) {
            console.warn('Failed to get block info for event:', event);
            return {
              ...event,
              timestamp: Date.now(),
              user: userAddress
            } as TradeEvent;
          }
        })
      );

      setEvents(formattedEvents);
      setLastUpdate(Date.now());

    } catch (error: any) {
      console.error('Failed to load historical events:', error);
      setError(error.message || 'Failed to load trading history');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new real-time event
  const addNewEvent = (event: TradeEvent) => {
    setEvents(prev => {
      // Check if event already exists (prevent duplicates)
      const exists = prev.some(e => e.transactionHash === event.transactionHash);
      if (exists) return prev;

      // Add new event at the beginning
      return [event, ...prev];
    });
    setLastUpdate(Date.now());
  };

  // Filter events based on type
  const filteredEvents = events.filter(event => {
    switch (filter) {
      case 'trades':
        return event.type === 'PositionOpened' || event.type === 'PositionClosed';
      case 'deposits':
        return event.type === 'Deposit' || event.type === 'Withdraw';
      default:
        return true;
    }
  });

  // Export history as JSON
  const exportHistory = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `riverbit-trading-history-${userAddress.slice(0, 8)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Get event display info
  const getEventDisplayInfo = (event: TradeEvent) => {
    switch (event.type) {
      case 'PositionOpened':
        return {
          icon: event.size && event.size > 0 ? TrendingUp : TrendingDown,
          iconColor: event.size && event.size > 0 ? 'text-green-500' : 'text-red-500',
          title: `${event.size && event.size > 0 ? 'Long' : 'Short'} ${event.symbol}`,
          subtitle: `Size: $${formatNumber(Math.abs(event.size || 0))} @ $${formatNumber(event.price || 0)}`,
          badge: event.size && event.size > 0 ? 'Long' : 'Short',
          badgeVariant: event.size && event.size > 0 ? 'default' : 'destructive'
        };
      case 'PositionClosed':
        return {
          icon: CheckCircle,
          iconColor: (event.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500',
          title: `Closed ${event.symbol}`,
          subtitle: `PnL: ${(event.pnl || 0) >= 0 ? '+' : ''}$${formatNumber(Math.abs(event.pnl || 0))}`,
          badge: (event.pnl || 0) >= 0 ? 'Profit' : 'Loss',
          badgeVariant: (event.pnl || 0) >= 0 ? 'default' : 'destructive'
        };
      case 'Deposit':
        return {
          icon: TrendingUp,
          iconColor: 'text-blue-500',
          title: 'Deposit',
          subtitle: `+$${formatNumber(event.amount || 0)} USDC`,
          badge: 'Deposit',
          badgeVariant: 'outline'
        };
      case 'Withdraw':
        return {
          icon: TrendingDown,
          iconColor: 'text-orange-500',
          title: 'Withdraw',
          subtitle: `-$${formatNumber(event.amount || 0)} USDC`,
          badge: 'Withdraw',
          badgeVariant: 'outline'
        };
      default:
        return {
          icon: Clock,
          iconColor: 'text-gray-300 font-medium',
          title: event.type,
          subtitle: 'Unknown event',
          badge: 'Unknown',
          badgeVariant: 'outline'
        };
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Trading History</span>
            {events.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {filteredEvents.length} events
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadHistoricalEvents}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            {events.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={exportHistory}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        {events.length > 0 && (
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-300 font-medium" />
            <div className="flex space-x-1">
              {(['all', 'trades', 'deposits'] as const).map((filterType) => (
                <Button
                  key={filterType}
                  variant={filter === filterType ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setFilter(filterType)}
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Last update info */}
        {lastUpdate > 0 && (
          <div className="text-xs text-gray-300 font-medium flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Last updated: {new Date(lastUpdate).toLocaleString()}</span>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm">Loading trading history...</span>
          </div>
        )}

        {/* Events list */}
        {!isLoading && filteredEvents.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredEvents.map((event, index) => {
              const displayInfo = getEventDisplayInfo(event);
              const IconComponent = displayInfo.icon;

              return (
                <div
                  key={`${event.transactionHash}-${index}`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <IconComponent className={`w-5 h-5 ${displayInfo.iconColor}`} />
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{displayInfo.title}</span>
                        <Badge
                          variant={displayInfo.badgeVariant as any}
                          className="text-xs"
                        >
                          {displayInfo.badge}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-300 font-medium">{displayInfo.subtitle}</div>
                      <div className="text-xs text-gray-300 font-medium">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => 
                        window.open(
                          `https://sepolia.arbiscan.io/tx/${event.transactionHash}`,
                          '_blank'
                        )
                      }
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !isLoading && events.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-300 font-medium">No trading history found</p>
            <p className="text-xs text-gray-300 font-medium mt-1">
              Start trading to see your transaction history here
            </p>
          </div>
        ) : !isLoading && filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-300 font-medium">No events match the current filter</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter('all')}
              className="mt-2"
            >
              Show all events
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default RealTradeHistoryManager;