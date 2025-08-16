/**
 * Risk Manager Panel Component
 * 
 * A comprehensive UI component that integrates the RiverBit risk management
 * system with the trading interface, providing real-time risk monitoring,
 * position size recommendations, and emergency controls.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  DollarSign,
  Info,
  RefreshCw,
  StopCircle
} from 'lucide-react';

import { 
  riskManager, 
  setupUserRiskProfile,
  getRiskStatusForUI,
  getRiskBadges,
  getRecommendedPositionSize,
  initializeDemoUser
} from '../../utils/tradingAssistant/riskManagerIntegration';

import { RiskLevel, TradingPlan } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface RiskManagerPanelProps {
  userAddress?: string;
  accountData?: {
    balance: number;
    usedMargin: number;
    equity: number;
    positions: any;
  };
  selectedSymbol?: string;
  onPositionSizeChange?: (size: number) => void;
  onRiskLevelChange?: (level: RiskLevel) => void;
  className?: string;
}

interface EmergencyAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  action?: string;
  priority: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RiskManagerPanel({
  userAddress = '0x1234567890123456789012345678901234567890',
  accountData,
  selectedSymbol = 'BTC',
  onPositionSizeChange,
  onRiskLevelChange,
  className = ''
}: RiskManagerPanelProps) {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoMonitoring, setAutoMonitoring] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Risk data
  const [riskStatus, setRiskStatus] = useState(getRiskStatusForUI(userAddress));
  const [riskBadges, setRiskBadges] = useState(getRiskBadges(userAddress));
  const [positionRec, setPositionRec] = useState(
    getRecommendedPositionSize(userAddress, selectedSymbol, accountData?.balance || 10000)
  );

  // ========================================================================
  // INITIALIZATION AND EFFECTS
  // ========================================================================

  useEffect(() => {
    initializeRiskProfile();
  }, [userAddress]);

  useEffect(() => {
    if (isInitialized) {
      updateRiskData();
    }
  }, [userAddress, accountData, selectedSymbol, isInitialized]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoMonitoring && isInitialized) {
      interval = setInterval(() => {
        updateRiskData();
        checkEmergencyConditions();
      }, 10000); // Update every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoMonitoring, isInitialized]);

  // ========================================================================
  // FUNCTIONS
  // ========================================================================

  const initializeRiskProfile = async () => {
    setIsLoading(true);
    try {
      await initializeDemoUser(userAddress);
      setIsInitialized(true);
      updateRiskData();
    } catch (error) {
      console.error('Failed to initialize risk profile:', error);
      setEmergencyAlerts(prev => [...prev, {
        type: 'error',
        message: 'Failed to initialize risk profile',
        priority: 5
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRiskData = useCallback(() => {
    try {
      const newRiskStatus = getRiskStatusForUI(userAddress);
      const newRiskBadges = getRiskBadges(userAddress);
      const newPositionRec = getRecommendedPositionSize(
        userAddress, 
        selectedSymbol, 
        accountData?.balance || 10000
      );

      setRiskStatus(newRiskStatus);
      setRiskBadges(newRiskBadges);
      setPositionRec(newPositionRec);
      setLastUpdate(new Date());

      // Notify parent of recommended position size
      if (onPositionSizeChange) {
        onPositionSizeChange(newPositionRec.recommended);
      }

    } catch (error) {
      console.error('Failed to update risk data:', error);
    }
  }, [userAddress, selectedSymbol, accountData, onPositionSizeChange]);

  const checkEmergencyConditions = useCallback(async () => {
    if (!accountData) return;

    try {
      const emergencyActions = await riskManager.checkEmergencyStop(userAddress, accountData);
      
      if (emergencyActions.length > 0) {
        const alerts: EmergencyAlert[] = emergencyActions.map(action => ({
          type: action.priority >= 9 ? 'error' : 'warning',
          message: action.reason,
          action: action.type,
          priority: action.priority
        }));

        setEmergencyAlerts(prev => [...prev, ...alerts]);
      }
    } catch (error) {
      console.error('Emergency check failed:', error);
    }
  }, [userAddress, accountData]);

  const handleRiskLevelChange = async (newLevel: RiskLevel) => {
    setIsLoading(true);
    try {
      await riskManager.applyRiskTolerance(userAddress, newLevel);
      setRiskLevel(newLevel);
      updateRiskData();
      
      if (onRiskLevelChange) {
        onRiskLevelChange(newLevel);
      }
    } catch (error) {
      console.error('Failed to update risk level:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissAlert = (index: number) => {
    setEmergencyAlerts(prev => prev.filter((_, i) => i !== index));
  };

  const executeEmergencyStop = async () => {
    if (!window.confirm('Are you sure you want to execute emergency stop? This will close all positions.')) {
      return;
    }

    setIsLoading(true);
    try {
      // In real implementation, this would call contract methods
      console.log('🚨 Emergency stop executed');
      setEmergencyAlerts([{
        type: 'info',
        message: 'Emergency stop executed - all positions closed',
        priority: 10
      }]);
    } catch (error) {
      console.error('Emergency stop failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const getRiskColor = (status: string) => {
    switch (status) {
      case 'safe': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'warning': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'danger': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-300 font-medium bg-gray-400/10 border-gray-400/20';
    }
  };

  const getRiskIcon = (status: string) => {
    switch (status) {
      case 'safe': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'danger': return <XCircle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getBadgeColor = (color: 'green' | 'yellow' | 'red') => {
    switch (color) {
      case 'green': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'yellow': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'red': return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  if (!isInitialized && isLoading) {
    return (
      <Card className={`bg-slate-900/50 border-slate-700/50 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2 text-gray-300 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Initializing risk management...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={`bg-slate-900/50 border-slate-700/50 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-100 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span>Risk Management</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-300 font-medium">Auto</span>
                <Switch
                  checked={autoMonitoring}
                  onCheckedChange={setAutoMonitoring}
                  size="sm"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="h-8 w-8 p-0"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Emergency Alerts */}
          {emergencyAlerts.length > 0 && (
            <div className="space-y-2">
              {emergencyAlerts.slice(0, 3).map((alert, index) => (
                <Alert 
                  key={index} 
                  className={`${
                    alert.type === 'error' ? 'border-red-500/50 bg-red-500/10' :
                    alert.type === 'warning' ? 'border-yellow-500/50 bg-yellow-500/10' :
                    'border-blue-500/50 bg-blue-500/10'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-sm">{alert.message}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(index)}
                      className="h-6 w-6 p-0"
                    >
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Risk Status Overview */}
          <div className={`p-3 rounded-lg border ${getRiskColor(riskStatus.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getRiskIcon(riskStatus.status)}
                <div>
                  <div className="font-medium">{riskStatus.message}</div>
                  <div className="text-xs opacity-75">
                    Risk Score: {riskStatus.riskScore}/100
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-75">Can Trade</div>
                <div className="font-bold">
                  {riskStatus.canTrade ? '✅ YES' : '❌ NO'}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Metrics Badges */}
          <div className="grid grid-cols-3 gap-2">
            {riskBadges.map((badge, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div className={`p-2 rounded border text-center ${getBadgeColor(badge.color)}`}>
                    <div className="text-xs opacity-75">{badge.label}</div>
                    <div className="font-bold text-sm">{badge.value}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{badge.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Position Size Recommendations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Position Size for {selectedSymbol}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-300 font-medium" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{positionRec.reason}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300 font-medium">Recommended</span>
                <span className="text-green-400 font-bold">${positionRec.recommended.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300 font-medium">Maximum</span>
                <span className="text-yellow-400 font-bold">${positionRec.maximum.toFixed(2)}</span>
              </div>
              <Progress 
                value={(positionRec.recommended / positionRec.maximum) * 100}
                className="h-2"
              />
            </div>
          </div>

          <Separator className="bg-slate-700/50" />

          {/* Risk Level Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Risk Tolerance</span>
              <Badge variant="outline" className="text-xs">
                {riskLevel.toUpperCase()}
              </Badge>
            </div>
            <Select value={riskLevel} onValueChange={handleRiskLevelChange}>
              <SelectTrigger className="bg-slate-800/50 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🛡️ Conservative (Low Risk)</SelectItem>
                <SelectItem value="medium">⚖️ Balanced (Medium Risk)</SelectItem>
                <SelectItem value="high">🚀 Aggressive (High Risk)</SelectItem>
                <SelectItem value="extreme">⚡ Maximum (Extreme Risk)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-3 pt-3 border-t border-slate-700/50">
              <div className="text-sm font-medium text-gray-300 mb-2">Advanced Settings</div>
              
              {/* Daily Loss Limit */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">Daily Loss Limit</span>
                  <span className="text-gray-300">$1,000</span>
                </div>
                <Slider
                  value={[1000]}
                  max={5000}
                  min={100}
                  step={100}
                  className="h-2"
                />
              </div>

              {/* Max Position Size */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">Max Position Size</span>
                  <span className="text-gray-300">$2,000</span>
                </div>
                <Slider
                  value={[2000]}
                  max={10000}
                  min={500}
                  step={250}
                  className="h-2"
                />
              </div>

              {/* Emergency Controls */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300 font-medium">Emergency Controls</span>
                <Switch defaultChecked size="sm" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300 font-medium">Auto Stop Loss</span>
                <Switch defaultChecked size="sm" />
              </div>
            </div>
          )}

          {/* Emergency Actions */}
          {(riskStatus.status === 'danger' || emergencyAlerts.some(a => a.priority >= 8)) && (
            <div className="pt-3 border-t border-slate-700/50">
              <Button
                variant="destructive"
                size="sm"
                onClick={executeEmergencyStop}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <StopCircle className="w-4 h-4 mr-2" />
                )}
                Emergency Stop
              </Button>
            </div>
          )}

          {/* Last Update */}
          <div className="text-xs text-gray-300 font-medium text-center pt-2 border-t border-slate-700/50">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export { RiskManagerPanel };