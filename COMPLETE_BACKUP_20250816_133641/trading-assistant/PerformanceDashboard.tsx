/**
 * Performance Dashboard Component for Trading Assistant
 * Displays comprehensive performance metrics and analytics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  performanceTracker, 
  PerformanceUtils,
  type PerformanceDashboard as DashboardData,
  type StrategyPerformance,
  type RealTimePosition,
  type PerformanceAlert,
  type BacktestResult
} from '../../utils/tradingAssistant/performanceTracker';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  AlertTriangle,
  BarChart3,
  Activity,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface PerformanceDashboardProps {
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  className = "" 
}) => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [backtests, setBacktests] = useState<BacktestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSensitiveData, setShowSensitiveData] = useState(true);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const dashboardData = performanceTracker.generateDashboard();
      const alertsData = performanceTracker.getAlerts();
      const backtestData = performanceTracker.getBacktestResults();
      
      setDashboard(dashboardData);
      setAlerts(alertsData);
      setBacktests(backtestData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    const data = performanceTracker.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (performanceTracker.importData(content)) {
          loadDashboardData();
          alert('Data imported successfully!');
        } else {
          alert('Failed to import data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    performanceTracker.acknowledgeAlert(alertId);
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No performance data available. Start trading to see your performance metrics.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-gray-300">
            Last updated: {new Date(dashboard.lastUpdated).toLocaleString()}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSensitiveData(!showSensitiveData)}
          >
            {showSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showSensitiveData ? 'Hide P&L' : 'Show P&L'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          
          <label className="inline-flex">
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="w-4 h-4 mr-1" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportData}
            />
          </label>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter(a => !a.acknowledged).length > 0 && (
        <div className="space-y-2">
          {alerts.filter(a => !a.acknowledged).slice(0, 3).map(alert => (
            <Alert 
              key={alert.id}
              className={`${
                alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex justify-between items-center">
                <span>{alert.message}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => acknowledgeAlert(alert.id)}
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="backtests">Backtests</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Trades"
              value={dashboard.overview.totalTrades.toString()}
              icon={<BarChart3 className="w-5 h-5" />}
              trend={dashboard.overview.totalTrades > 0 ? 'up' : 'neutral'}
            />
            
            <MetricCard
              title="Win Rate"
              value={PerformanceUtils.formatPercentage(dashboard.overview.winRate)}
              icon={<Target className="w-5 h-5" />}
              trend={dashboard.overview.winRate >= 50 ? 'up' : 'down'}
              color={PerformanceUtils.getWinRateColor(dashboard.overview.winRate)}
            />
            
            <MetricCard
              title="Total P&L"
              value={showSensitiveData ? PerformanceUtils.formatPnL(dashboard.overview.totalPnL) : '***'}
              icon={<DollarSign className="w-5 h-5" />}
              trend={dashboard.overview.totalPnL >= 0 ? 'up' : 'down'}
              color={PerformanceUtils.getPerformanceColor(dashboard.overview.totalPnL)}
            />
            
            <MetricCard
              title="Avg R:R"
              value={dashboard.overview.averageRiskReward.toFixed(2)}
              icon={<TrendingUp className="w-5 h-5" />}
              trend={dashboard.overview.averageRiskReward >= 1.5 ? 'up' : 'down'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Max Drawdown</span>
                  <span className="text-red-600">
                    {PerformanceUtils.formatPercentage(-dashboard.overview.maxDrawdown)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Current Drawdown</span>
                  <span className="text-red-600">
                    {PerformanceUtils.formatPercentage(-dashboard.overview.currentDrawdown)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Profit Factor</span>
                  <span className={dashboard.overview.profitFactor >= 1 ? 'text-green-600' : 'text-red-600'}>
                    {dashboard.overview.profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sharpe Ratio</span>
                  <span>{dashboard.overview.sharpeRatio.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Best/Worst Trades */}
            <Card>
              <CardHeader>
                <CardTitle>Trade Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboard.overview.bestTrade && (
                  <div>
                    <h4 className="font-medium text-green-600 mb-1">Best Trade</h4>
                    <div className="text-sm text-gray-300">
                      <div>{dashboard.overview.bestTrade.symbol} {dashboard.overview.bestTrade.direction}</div>
                      <div className="font-medium text-green-600">
                        {showSensitiveData ? PerformanceUtils.formatPnL(dashboard.overview.bestTrade.pnl || 0) : '***'}
                      </div>
                    </div>
                  </div>
                )}
                
                {dashboard.overview.worstTrade && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-1">Worst Trade</h4>
                    <div className="text-sm text-gray-300">
                      <div>{dashboard.overview.worstTrade.symbol} {dashboard.overview.worstTrade.direction}</div>
                      <div className="font-medium text-red-600">
                        {showSensitiveData ? PerformanceUtils.formatPnL(dashboard.overview.worstTrade.pnl || 0) : '***'}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Strategies Tab */}
        <TabsContent value="strategies" className="space-y-4">
          {dashboard.strategies.length === 0 ? (
            <Alert>
              <AlertDescription>
                No strategy performance data available yet.
              </AlertDescription>
            </Alert>
          ) : (
            dashboard.strategies.map(strategy => (
              <StrategyCard 
                key={strategy.strategyName} 
                strategy={strategy} 
                showSensitiveData={showSensitiveData}
              />
            ))
          )}
        </TabsContent>

        {/* Active Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          {dashboard.activePositions.length === 0 ? (
            <Alert>
              <AlertDescription>
                No active positions.
              </AlertDescription>
            </Alert>
          ) : (
            dashboard.activePositions.map(position => (
              <PositionCard 
                key={position.planId} 
                position={position} 
                showSensitiveData={showSensitiveData}
              />
            ))
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Condition Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.marketConditions.length === 0 ? (
                <p className="text-gray-300">Insufficient data for market condition analysis.</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.marketConditions.map(condition => (
                    <div key={condition.condition} className="flex justify-between items-center">
                      <span className="capitalize">{condition.condition}</span>
                      <div className="text-right">
                        <div className="text-sm">
                          {condition.totalTrades} trades, {condition.winRate.toFixed(1)}% win rate
                        </div>
                        <div className={`text-sm ${PerformanceUtils.getPerformanceColor(condition.averagePnL)}`}>
                          Avg: {showSensitiveData ? PerformanceUtils.formatPnL(condition.averagePnL) : '***'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Current Exposure</span>
                <span>{showSensitiveData ? `$${dashboard.riskMetrics.currentExposure.toLocaleString()}` : '***'}</span>
              </div>
              <div className="flex justify-between">
                <span>Risk per Trade</span>
                <span>{dashboard.riskMetrics.riskPerTrade.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Average Leverage</span>
                <span>{dashboard.riskMetrics.leverageRatio.toFixed(1)}x</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backtests Tab */}
        <TabsContent value="backtests" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Backtest Results</h3>
            <Button size="sm" onClick={() => {
              // In a real implementation, this would open a backtest configuration dialog
              alert('Backtest configuration dialog would open here');
            }}>
              Run New Backtest
            </Button>
          </div>
          
          {backtests.length === 0 ? (
            <Alert>
              <AlertDescription>
                No backtest results available. Run a backtest to analyze strategy performance.
              </AlertDescription>
            </Alert>
          ) : (
            backtests.slice(0, 5).map(backtest => (
              <BacktestCard 
                key={backtest.id} 
                backtest={backtest} 
                showSensitiveData={showSensitiveData}
              />
            ))
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Performance Alerts</h3>
            <div className="text-sm text-gray-300">
              {alerts.filter(a => !a.acknowledged).length} unacknowledged
            </div>
          </div>
          
          {alerts.length === 0 ? (
            <Alert>
              <AlertDescription>
                No alerts. The system will notify you of important performance events.
              </AlertDescription>
            </Alert>
          ) : (
            alerts.map(alert => (
              <AlertCard 
                key={alert.id} 
                alert={alert} 
                onAcknowledge={() => acknowledgeAlert(alert.id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper Components

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend = 'neutral',
  color = 'text-gray-900'
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-300">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`${
          trend === 'up' ? 'text-green-600' :
          trend === 'down' ? 'text-red-600' :
          'text-gray-300 font-medium'
        }`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

interface StrategyCardProps {
  strategy: StrategyPerformance;
  showSensitiveData: boolean;
}

const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, showSensitiveData }) => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle className="capitalize">{strategy.strategyName.replace('_', ' ')}</CardTitle>
        <Badge variant={strategy.winRate >= 50 ? 'default' : 'destructive'}>
          {strategy.winRate.toFixed(1)}% Win Rate
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-gray-300">Total Trades</p>
          <p className="font-medium">{strategy.totalTrades}</p>
        </div>
        <div>
          <p className="text-sm text-gray-300">Total P&L</p>
          <p className={`font-medium ${PerformanceUtils.getPerformanceColor(strategy.totalPnL)}`}>
            {showSensitiveData ? PerformanceUtils.formatPnL(strategy.totalPnL) : '***'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-300">Avg R:R</p>
          <p className="font-medium">{strategy.averageRiskReward.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-300">Max Drawdown</p>
          <p className="font-medium text-red-600">
            {PerformanceUtils.formatPercentage(-strategy.maxDrawdown)}
          </p>
        </div>
      </div>
      
      {strategy.currentStreak > 0 && (
        <div className="mt-3 pt-3 border-t">
          <span className="text-sm text-gray-300">Current Streak: </span>
          <span className={`font-medium ${
            strategy.currentStreakType === 'win' ? 'text-green-600' : 'text-red-600'
          }`}>
            {strategy.currentStreak} {strategy.currentStreakType}s
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

interface PositionCardProps {
  position: RealTimePosition;
  showSensitiveData: boolean;
}

const PositionCard: React.FC<PositionCardProps> = ({ position, showSensitiveData }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">
            {position.symbol} {position.direction.toUpperCase()}
          </h4>
          <p className="text-sm text-gray-300">
            Entry: ${position.entryPrice.toFixed(2)} | 
            Size: {showSensitiveData ? `$${position.positionSize.toLocaleString()}` : '***'} | 
            {position.leverage}x
          </p>
        </div>
        <div className="text-right">
          <p className={`font-medium ${PerformanceUtils.getPerformanceColor(position.unrealizedPnL)}`}>
            {showSensitiveData ? PerformanceUtils.formatPnL(position.unrealizedPnL) : '***'}
          </p>
          <p className={`text-sm ${PerformanceUtils.getPerformanceColor(position.unrealizedPnLPercentage)}`}>
            {PerformanceUtils.formatPercentage(position.unrealizedPnLPercentage)}
          </p>
        </div>
      </div>
      
      <div className="mt-3 flex justify-between text-sm text-gray-300">
        <span>
          <Clock className="w-3 h-3 inline mr-1" />
          {PerformanceUtils.formatDuration(position.timeInTrade)}
        </span>
        <span>Risk: {showSensitiveData ? `$${position.riskAmount.toFixed(2)}` : '***'}</span>
      </div>
    </CardContent>
  </Card>
);

interface BacktestCardProps {
  backtest: BacktestResult;
  showSensitiveData: boolean;
}

const BacktestCard: React.FC<BacktestCardProps> = ({ backtest, showSensitiveData }) => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle>
          {backtest.strategyName} - {backtest.symbol} ({backtest.timeframe})
        </CardTitle>
        <Badge variant={backtest.winRate >= 50 ? 'default' : 'destructive'}>
          {backtest.winRate.toFixed(1)}% Win Rate
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-gray-300">Total Trades</p>
          <p className="font-medium">{backtest.totalTrades}</p>
        </div>
        <div>
          <p className="text-sm text-gray-300">Total Return</p>
          <p className={`font-medium ${PerformanceUtils.getPerformanceColor(backtest.totalReturn)}`}>
            {showSensitiveData ? PerformanceUtils.formatPnL(backtest.totalReturn) : '***'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-300">Max Drawdown</p>
          <p className="font-medium text-red-600">
            {PerformanceUtils.formatPercentage(-backtest.maxDrawdown)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-300">Profit Factor</p>
          <p className="font-medium">{backtest.profitFactor.toFixed(2)}</p>
        </div>
      </div>
      
      <div className="mt-3 text-sm text-gray-300">
        Period: {new Date(backtest.startDate).toLocaleDateString()} - {new Date(backtest.endDate).toLocaleDateString()}
      </div>
    </CardContent>
  </Card>
);

interface AlertCardProps {
  alert: PerformanceAlert;
  onAcknowledge: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onAcknowledge }) => (
  <Alert className={`${
    alert.severity === 'critical' ? 'border-red-500' :
    alert.severity === 'high' ? 'border-orange-500' :
    alert.severity === 'medium' ? 'border-yellow-500' :
    'border-blue-500'
  } ${alert.acknowledged ? 'opacity-60' : ''}`}>
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Badge variant={
              alert.severity === 'critical' ? 'destructive' :
              alert.severity === 'high' ? 'destructive' :
              alert.severity === 'medium' ? 'secondary' :
              'default'
            }>
              {alert.severity.toUpperCase()}
            </Badge>
            <span className="text-xs text-gray-300 font-medium">
              {new Date(alert.timestamp).toLocaleString()}
            </span>
          </div>
          <p>{alert.message}</p>
        </div>
        {!alert.acknowledged && (
          <Button size="sm" variant="ghost" onClick={onAcknowledge}>
            Acknowledge
          </Button>
        )}
      </div>
    </AlertDescription>
  </Alert>
);

export default PerformanceDashboard;