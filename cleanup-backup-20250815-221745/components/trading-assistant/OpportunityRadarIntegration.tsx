// Opportunity Radar Integration Example
// Shows how to integrate the opportunity radar into a trading dashboard

import React, { useState, useEffect } from 'react';
import { 
  startOpportunityRadar, 
  stopOpportunityRadar, 
  getActiveOpportunities,
  updateRadarPreferences,
  type OpportunityAlert 
} from '../../utils/tradingAssistant/opportunityRadar';
import { OpportunityRadarPanel } from './OpportunityRadarPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Activity, 
  TrendingUp, 
  Bell, 
  Settings,
  Play,
  Pause,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface OpportunityRadarIntegrationProps {
  className?: string;
  showFullPanel?: boolean;
  onOpportunityClick?: (alert: OpportunityAlert) => void;
}

export const OpportunityRadarIntegration: React.FC<OpportunityRadarIntegrationProps> = ({
  className = "",
  showFullPanel = true,
  onOpportunityClick
}) => {
  const [isActive, setIsActive] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<OpportunityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Update alerts periodically
  useEffect(() => {
    const updateAlerts = () => {
      const alerts = getActiveOpportunities();
      setRecentAlerts(alerts.slice(0, 3)); // Show only top 3
    };

    updateAlerts();
    const interval = setInterval(updateAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-start radar on component mount (optional)
  useEffect(() => {
    const autoStart = async () => {
      try {
        await startOpportunityRadar();
        setIsActive(true);
        toast.success('Opportunity Radar started automatically');
      } catch (error) {
        console.error('Failed to auto-start radar:', error);
      }
    };

    // Uncomment to auto-start
    // autoStart();

    return () => {
      // Cleanup is handled by the radar system
    };
  }, []);

  const toggleRadar = async () => {
    setIsLoading(true);
    try {
      if (isActive) {
        await stopOpportunityRadar();
        setIsActive(false);
        toast.success('Opportunity Radar stopped');
      } else {
        await startOpportunityRadar();
        setIsActive(true);
        toast.success('Opportunity Radar started');
      }
    } catch (error) {
      toast.error(`Failed to ${isActive ? 'stop' : 'start'} radar`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpportunityClick = (alert: OpportunityAlert) => {
    if (onOpportunityClick) {
      onOpportunityClick(alert);
    } else {
      // Default behavior - show toast with details
      toast.info(`${alert.symbol} Opportunity`, {
        description: alert.message,
        action: {
          label: 'View Details',
          onClick: () => console.log('Alert details:', alert)
        }
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-slate-800/500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'breakout': return <TrendingUp className="h-4 w-4" />;
      case 'reversal': return <Activity className="h-4 w-4" />;
      case 'momentum': return <Activity className="h-4 w-4" />;
      case 'volume_spike': return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (showFullPanel) {
    return (
      <div className={className}>
        <OpportunityRadarPanel />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Compact Radar Control */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Opportunity Radar
                {isActive && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isActive 
                  ? `Monitoring markets • ${recentAlerts.length} active alerts`
                  : 'Market scanning is stopped'
                }
              </CardDescription>
            </div>
            <Button
              onClick={toggleRadar}
              disabled={isLoading}
              variant={isActive ? "destructive" : "default"}
              size="sm"
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Activity className="h-4 w-4 animate-spin" />
              ) : isActive ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isActive ? 'Stop' : 'Start'}
            </Button>
          </div>
        </CardHeader>

        {recentAlerts.length > 0 && (
          <CardContent>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Recent Opportunities
              </h4>
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleOpportunityClick(alert)}
                >
                  <div className="flex items-center gap-3">
                    <Badge className={`${getPriorityColor(alert.priority)} text-white text-xs`}>
                      {alert.priority}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(alert.type)}
                      <span className="font-medium">{alert.symbol}</span>
                    </div>
                    <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {alert.message}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {alert.confidence.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quick Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Quick Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateRadarPreferences({ minConfidence: 80 })}
            >
              High Confidence Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateRadarPreferences({ minConfidence: 60 })}
            >
              Include Medium Confidence
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateRadarPreferences({ 
                enabledStrategies: ['breakout', 'momentum'] 
              })}
            >
              Trend Signals Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateRadarPreferences({ 
                enabledStrategies: ['breakout', 'reversal', 'momentum', 'volume_spike'] 
              })}
            >
              All Strategies
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Info */}
      {!isActive && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Opportunity Radar is stopped. Start it to begin monitoring markets for trading opportunities.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Example usage in a trading page
export const TradingPageWithRadar: React.FC = () => {
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityAlert | null>(null);

  const handleOpportunitySelect = (alert: OpportunityAlert) => {
    setSelectedOpportunity(alert);
    // Could navigate to trading interface with pre-filled order
    console.log('Selected opportunity:', alert);
    
    // Example: Pre-fill a trading form with opportunity data
    toast.success(`Loading ${alert.symbol} trading interface...`, {
      description: `Entry: $${alert.details.currentPrice} | Confidence: ${alert.confidence}%`
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold mb-2">Trading Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor markets and execute trades with intelligent opportunity detection
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main trading interface would go here */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Trading Interface</CardTitle>
              <CardDescription>
                {selectedOpportunity 
                  ? `Ready to trade ${selectedOpportunity.symbol} opportunity`
                  : 'Select an opportunity or search for symbols'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedOpportunity ? (
                <div className="space-y-4">
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{selectedOpportunity.symbol}</strong>: {selectedOpportunity.message}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Entry Price:</span>
                      <span className="ml-2 font-medium">
                        ${selectedOpportunity.details.currentPrice.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="ml-2 font-medium">
                        {selectedOpportunity.confidence.toFixed(1)}%
                      </span>
                    </div>
                    {selectedOpportunity.details.targetPrice && (
                      <div>
                        <span className="text-muted-foreground">Target:</span>
                        <span className="ml-2 font-medium">
                          ${selectedOpportunity.details.targetPrice.toFixed(4)}
                        </span>
                      </div>
                    )}
                    {selectedOpportunity.details.stopLoss && (
                      <div>
                        <span className="text-muted-foreground">Stop Loss:</span>
                        <span className="ml-2 font-medium">
                          ${selectedOpportunity.details.stopLoss.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button className="flex-1">
                      Execute Trade
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedOpportunity(null)}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4" />
                  <p>No opportunity selected</p>
                  <p className="text-sm">
                    Start the Opportunity Radar or manually search for symbols
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Opportunity Radar Sidebar */}
        <div className="lg:col-span-1">
          <OpportunityRadarIntegration
            showFullPanel={false}
            onOpportunityClick={handleOpportunitySelect}
          />
        </div>
      </div>
    </div>
  );
};

export default OpportunityRadarIntegration;