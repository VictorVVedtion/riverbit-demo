// Opportunity Radar Control Panel - UI for managing market scanning and alerts

import React, { useState, useEffect, useCallback } from 'react';
import { 
  opportunityRadar, 
  type OpportunityAlert, 
  type UserPreferences,
  type MarketSnapshot 
} from '../../utils/tradingAssistant/opportunityRadar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  Play, 
  Pause, 
  Settings, 
  Bell, 
  TrendingUp, 
  Activity, 
  Volume2, 
  RotateCcw,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

interface OpportunityRadarPanelProps {
  className?: string;
}

export const OpportunityRadarPanel: React.FC<OpportunityRadarPanelProps> = ({ 
  className = "" 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<OpportunityAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<OpportunityAlert[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    isScanning: false,
    activeAlerts: 0,
    monitoredSymbols: 0,
    lastScanTime: 0
  });
  const [selectedAlert, setSelectedAlert] = useState<OpportunityAlert | null>(null);

  // Update data periodically
  const updateData = useCallback(() => {
    const status = opportunityRadar.getStatus();
    const alerts = opportunityRadar.getActiveAlerts();
    const history = opportunityRadar.getAlertHistory(24);
    const prefs = opportunityRadar.getPreferences();

    setSystemStatus(status);
    setActiveAlerts(alerts);
    setAlertHistory(history);
    setPreferences(prefs);
    setIsScanning(status.isScanning);
  }, []);

  useEffect(() => {
    updateData();
    const interval = setInterval(updateData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateData]);

  // Start/Stop scanning
  const toggleScanning = async () => {
    try {
      if (isScanning) {
        await opportunityRadar.stop();
        toast.success('Opportunity Radar stopped');
      } else {
        await opportunityRadar.start();
        toast.success('Opportunity Radar started');
      }
      updateData();
    } catch (error) {
      toast.error('Failed to toggle Opportunity Radar');
      console.error(error);
    }
  };

  // Update preferences
  const updatePreferences = (newPrefs: Partial<UserPreferences>) => {
    opportunityRadar.updatePreferences(newPrefs);
    setPreferences(prev => prev ? { ...prev, ...newPrefs } : null);
    toast.success('Preferences updated');
  };

  // Dismiss alert
  const dismissAlert = (alertId: string) => {
    opportunityRadar.dismissAlert(alertId);
    updateData();
    toast.success('Alert dismissed');
  };

  // Force scan symbol
  const forceScanSymbol = async (symbol: string) => {
    try {
      const opportunities = await opportunityRadar.forceScanSymbol(symbol);
      if (opportunities.length > 0) {
        toast.success(`Found ${opportunities.length} opportunities for ${symbol}`);
      } else {
        toast.info(`No opportunities found for ${symbol}`);
      }
      updateData();
    } catch (error) {
      toast.error(`Failed to scan ${symbol}`);
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-slate-800/500';
    }
  };

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <TrendingUp className="h-4 w-4" />;
      case 'medium': return <Activity className="h-4 w-4" />;
      case 'low': return <Target className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'breakout': return <TrendingUp className="h-4 w-4" />;
      case 'reversal': return <RotateCcw className="h-4 w-4" />;
      case 'momentum': return <Activity className="h-4 w-4" />;
      case 'volume_spike': return <Volume2 className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (!preferences) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Opportunity Radar
              </CardTitle>
              <CardDescription>
                Real-time market scanning for trading opportunities
              </CardDescription>
            </div>
            <Button
              onClick={toggleScanning}
              variant={isScanning ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isScanning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isScanning ? 'Stop' : 'Start'} Radar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {systemStatus.activeAlerts}
              </div>
              <div className="text-sm text-muted-foreground">Active Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {systemStatus.monitoredSymbols}
              </div>
              <div className="text-sm text-muted-foreground">Monitored Symbols</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {alertHistory.length}
              </div>
              <div className="text-sm text-muted-foreground">24h Alerts</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isScanning ? 'text-green-500' : 'text-gray-300 font-medium'}`}>
                {isScanning ? <CheckCircle className="h-8 w-8 mx-auto" /> : <XCircle className="h-8 w-8 mx-auto" />}
              </div>
              <div className="text-sm text-muted-foreground">
                {isScanning ? 'Scanning' : 'Stopped'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="history">Alert History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Active Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4" />
                  <p>No active alerts</p>
                  <p className="text-sm">
                    {isScanning ? 'Radar is scanning for opportunities...' : 'Start the radar to begin monitoring'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <Card key={alert.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${getPriorityColor(alert.priority)} text-white`}>
                            {getPriorityIcon(alert.priority)}
                            {alert.priority.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getTypeIcon(alert.type)}
                            {alert.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary">{alert.symbol}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <h4 className="font-medium mb-2">{alert.message}</h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <span className="ml-1 font-medium">
                              ${alert.details.currentPrice.toFixed(4)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Change:</span>
                            <span className={`ml-1 font-medium ${alert.details.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {alert.details.priceChange > 0 ? '+' : ''}{alert.details.priceChange.toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Confidence:</span>
                            <span className="ml-1 font-medium">{alert.confidence.toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">R/R:</span>
                            <span className="ml-1 font-medium">
                              {alert.details.riskReward?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <Progress value={alert.confidence} className="h-2" />
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Alert History Tab */}
        <TabsContent value="history" className="space-y-4">
          {alertHistory.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4" />
                  <p>No alert history</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alertHistory.slice(0, 20).map((alert) => (
                <Card key={alert.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getPriorityColor(alert.priority)} text-white text-xs`}>
                        {alert.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{alert.symbol}</Badge>
                      <span className="text-sm">{alert.message}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6">
            {/* Basic Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Basic Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Enable Real-time Scanning</div>
                    <div className="text-sm text-muted-foreground">
                      Monitor price feeds in real-time via WebSocket
                    </div>
                  </div>
                  <Switch checked={true} disabled />
                </div>

                <div className="space-y-2">
                  <label className="font-medium">Minimum Confidence</label>
                  <div className="px-3">
                    <Slider
                      value={[preferences.minConfidence]}
                      onValueChange={([value]) => updatePreferences({ minConfidence: value })}
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0%</span>
                      <span>{preferences.minConfidence}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-medium">Max Alerts per Hour</label>
                  <div className="px-3">
                    <Slider
                      value={[preferences.maxAlerts]}
                      onValueChange={([value]) => updatePreferences({ maxAlerts: value })}
                      max={50}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1</span>
                      <span>{preferences.maxAlerts}</span>
                      <span>50</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Symbol Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Monitored Symbols</CardTitle>
                <CardDescription>
                  Select which symbols to monitor for opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {['BTC', 'ETH', 'SOL', 'xAAPL', 'xTSLA', 'xMSFT', 'xGOOGL'].map((symbol) => (
                    <div key={symbol} className="flex items-center space-x-2">
                      <Switch
                        checked={preferences.enabledSymbols.includes(symbol)}
                        onCheckedChange={(checked) => {
                          const newSymbols = checked 
                            ? [...preferences.enabledSymbols, symbol]
                            : preferences.enabledSymbols.filter(s => s !== symbol);
                          updatePreferences({ enabledSymbols: newSymbols });
                        }}
                      />
                      <label className="text-sm font-medium">{symbol}</label>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => forceScanSymbol(symbol)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Strategy Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Detection Strategies</CardTitle>
                <CardDescription>
                  Choose which opportunity types to detect
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'breakout', label: 'Breakout Signals', icon: TrendingUp },
                    { key: 'reversal', label: 'Reversal Signals', icon: RotateCcw },
                    { key: 'momentum', label: 'Momentum Continuation', icon: Activity },
                    { key: 'volume_spike', label: 'Volume Spikes', icon: Volume2 }
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Switch
                        checked={preferences.enabledStrategies.includes(key)}
                        onCheckedChange={(checked) => {
                          const newStrategies = checked
                            ? [...preferences.enabledStrategies, key]
                            : preferences.enabledStrategies.filter(s => s !== key);
                          updatePreferences({ enabledStrategies: newStrategies });
                        }}
                      />
                      <Icon className="h-4 w-4" />
                      <label className="text-sm font-medium">{label}</label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { key: 'toast', label: 'Toast Notifications' },
                    { key: 'browser', label: 'Browser Notifications' },
                    { key: 'sound', label: 'Sound Alerts' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Switch
                        checked={preferences.notificationMethods.includes(key as any)}
                        onCheckedChange={(checked) => {
                          const newMethods = checked
                            ? [...preferences.notificationMethods, key as any]
                            : preferences.notificationMethods.filter(m => m !== key);
                          updatePreferences({ notificationMethods: newMethods });
                        }}
                      />
                      <label className="text-sm font-medium">{label}</label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <Card className="fixed inset-4 z-50 bg-background border shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getPriorityIcon(selectedAlert.priority)}
                Alert Details - {selectedAlert.symbol}
              </CardTitle>
              <Button variant="ghost" onClick={() => setSelectedAlert(null)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>{selectedAlert.message}</AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Signal Details</h4>
                <ul className="text-sm space-y-1">
                  {selectedAlert.details.signals.map((signal, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Trade Setup</h4>
                <div className="text-sm space-y-1">
                  <div>Entry: ${selectedAlert.details.currentPrice.toFixed(4)}</div>
                  {selectedAlert.details.targetPrice && (
                    <div>Target: ${selectedAlert.details.targetPrice.toFixed(4)}</div>
                  )}
                  {selectedAlert.details.stopLoss && (
                    <div>Stop Loss: ${selectedAlert.details.stopLoss.toFixed(4)}</div>
                  )}
                  {selectedAlert.details.riskReward && (
                    <div>Risk/Reward: {selectedAlert.details.riskReward.toFixed(1)}</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OpportunityRadarPanel;