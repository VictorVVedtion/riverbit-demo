/**
 * GasOptimizationPanel - Gas费优化面板
 * 提供智能Gas费估算、优化建议和网络状态监控
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Fuel, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Clock, 
  DollarSign,
  BarChart3,
  Settings,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react';
import { useGasPrice, gasOptimizationService, type GasPriceTier } from '../../utils/gasOptimization';
import { formatNumber, formatPrice } from '../../utils/formatUtils';
import { toast } from 'sonner';

interface GasOptimizationPanelProps {
  onGasSettingChange?: (gasSettings: {
    gasLimit: bigint;
    gasPrice: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }) => void;
  transactionType?: 'place_order' | 'cancel_order' | 'close_position' | 'batch_settle' | 'approve';
  className?: string;
}

const GasOptimizationPanel: React.FC<GasOptimizationPanelProps> = ({
  onGasSettingChange,
  transactionType = 'place_order',
  className = ''
}) => {
  const { gasPrices, isLoading, error } = useGasPrice();
  const [selectedTier, setSelectedTier] = useState<'slow' | 'standard' | 'fast' | 'instant'>('standard');
  const [customGasPrice, setCustomGasPrice] = useState<string>('');
  const [useCustomGas, setUseCustomGas] = useState(false);
  const [gasTrends, setGasTrends] = useState<any>(null);

  // 获取Gas价格趋势
  const fetchGasTrends = useCallback(async () => {
    try {
      const trends = await gasOptimizationService.getGasPriceTrends();
      setGasTrends(trends);
    } catch (error) {
      console.error('Failed to fetch gas trends:', error);
    }
  }, []);

  // 初始化获取趋势数据
  useEffect(() => {
    fetchGasTrends();
    const interval = setInterval(fetchGasTrends, 60000); // 每分钟更新
    return () => clearInterval(interval);
  }, [fetchGasTrends]);

  // 获取优化建议
  const getOptimalSettings = useCallback(() => {
    return gasOptimizationService.getOptimalGasSettings(transactionType);
  }, [transactionType]);

  // 处理Gas设置变更
  const handleGasSettingChange = useCallback((tier: GasPriceTier) => {
    const optimalSettings = getOptimalSettings();
    
    const gasSettings = {
      gasLimit: optimalSettings.gasLimit,
      gasPrice: tier.gasPrice,
      maxFeePerGas: tier.maxFeePerGas,
      maxPriorityFeePerGas: tier.maxPriorityFeePerGas
    };

    onGasSettingChange?.(gasSettings);
  }, [onGasSettingChange, getOptimalSettings]);

  // 选择Gas档位
  const handleTierSelect = useCallback((tierName: 'slow' | 'standard' | 'fast' | 'instant') => {
    setSelectedTier(tierName);
    setUseCustomGas(false);
    
    const tier = gasPrices.find(t => t.name === tierName);
    if (tier) {
      handleGasSettingChange(tier);
      toast.success(`Gas setting updated to ${tierName}`);
    }
  }, [gasPrices, handleGasSettingChange]);

  // 计算总成本
  const calculateTotalCost = useCallback((tier: GasPriceTier) => {
    const optimalSettings = getOptimalSettings();
    const totalGas = optimalSettings.gasLimit * tier.gasPrice;
    return totalGas;
  }, [getOptimalSettings]);

  // 获取档位图标
  const getTierIcon = (tierName: string) => {
    switch (tierName) {
      case 'slow': return '🐌';
      case 'standard': return '⚡';
      case 'fast': return '🚀';
      case 'instant': return '⚡⚡';
      default: return '⚡';
    }
  };

  // 获取档位颜色
  const getTierColor = (tierName: string, isSelected: boolean) => {
    if (isSelected) return 'bg-river-blue text-white border-river-blue';
    
    switch (tierName) {
      case 'slow': return 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20';
      case 'standard': return 'bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20';
      case 'fast': return 'bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20';
      case 'instant': return 'bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/30 hover:bg-gray-500/20';
    }
  };

  // 获取趋势颜色
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'rising': return 'text-red-500';
      case 'falling': return 'text-green-500';
      default: return 'text-blue-500';
    }
  };

  const optimalSettings = getOptimalSettings();

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load gas prices: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Fuel className="w-5 h-5" />
              <span>Gas Optimization</span>
            </span>
            <Button
              onClick={fetchGasTrends}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="presets">Gas Presets</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Gas预设页面 */}
            <TabsContent value="presets" className="space-y-4">
              {/* 当前操作信息 */}
              <div className="bg-surface-2/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-secondary">Transaction Type</span>
                  <Badge 
                    variant="outline" 
                    className={`${
                      optimalSettings.priority === 'high' ? 'bg-red-500/10 text-red-600 border-red-500/30' :
                      optimalSettings.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' :
                      'bg-green-500/10 text-green-600 border-green-500/30'
                    }`}
                  >
                    {transactionType.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted">{optimalSettings.description}</p>
              </div>

              {/* Gas档位选择 */}
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 bg-surface-3/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {gasPrices.map((tier) => {
                    const isSelected = selectedTier === tier.name && !useCustomGas;
                    const totalCost = calculateTotalCost(tier);
                    
                    return (
                      <Card
                        key={tier.name}
                        className={`cursor-pointer transition-all duration-200 border-2 ${getTierColor(tier.name, isSelected)}`}
                        onClick={() => handleTierSelect(tier.name)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getTierIcon(tier.name)}</span>
                              <span className="font-semibold text-sm capitalize">{tier.name}</span>
                            </div>
                            {isSelected && <CheckCircle className="w-4 h-4" />}
                          </div>
                          
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted">Gas Price:</span>
                              <span className="font-medium">{Number(tier.gasPrice).toFixed(4)} gwei</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted">Time:</span>
                              <span className="font-medium">{tier.estimatedTime}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted">Cost:</span>
                              <span className="font-medium">
                                {formatPrice(Number(totalCost) / 1e18, { decimals: 6 })} ETH
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* 自定义Gas设置 */}
              <Card className="border-dashed">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Custom Gas Price</span>
                    <Button
                      onClick={() => setUseCustomGas(!useCustomGas)}
                      variant={useCustomGas ? 'default' : 'outline'}
                      size="sm"
                    >
                      {useCustomGas ? 'Enabled' : 'Enable'}
                    </Button>
                  </div>
                  
                  {useCustomGas && (
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={customGasPrice}
                        onChange={(e) => setCustomGasPrice(e.target.value)}
                        placeholder="Enter gas price in gwei"
                        className="w-full p-2 text-sm bg-surface-3 border border-default/50 rounded-md"
                      />
                      <div className="text-xs text-muted">
                        Custom gas prices allow fine-tuned control but require careful consideration
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 分析页面 */}
            <TabsContent value="analytics" className="space-y-4">
              {/* Gas价格趋势 */}
              {gasTrends && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Gas Price Trends</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Current Price:</span>
                      <span className="font-bold">{gasTrends.current} gwei</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Trend:</span>
                      <div className="flex items-center space-x-1">
                        {gasTrends.trend === 'rising' ? (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : gasTrends.trend === 'falling' ? (
                          <TrendingDown className="w-4 h-4 text-green-500" />
                        ) : (
                          <BarChart3 className="w-4 h-4 text-blue-500" />
                        )}
                        <span className={`font-medium capitalize ${getTrendColor(gasTrends.trend)}`}>
                          {gasTrends.trend}
                        </span>
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {gasTrends.recommendation}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {/* 网络状态 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Network Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Network:</span>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                      Arbitrum Sepolia
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Congestion:</span>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      Low
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Avg Block Time:</span>
                    <span className="font-medium">~0.25s</span>
                  </div>
                </CardContent>
              </Card>

              {/* Gas费建议 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Optimization Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start space-x-2">
                      <Zap className="w-4 h-4 mt-0.5 text-blue-500" />
                      <span>Use batch transactions to save up to 20% on gas fees</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Clock className="w-4 h-4 mt-0.5 text-green-500" />
                      <span>Non-urgent transactions benefit from slower presets</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <DollarSign className="w-4 h-4 mt-0.5 text-yellow-500" />
                      <span>Monitor trends to time your transactions optimally</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default GasOptimizationPanel;