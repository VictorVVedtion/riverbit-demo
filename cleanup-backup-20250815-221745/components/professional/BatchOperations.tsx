import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Slider } from '../ui/slider';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import {
  LayersIcon,
  Target,
  X,
  CheckCircle,
  AlertTriangle,
  Settings,
  Zap,
  TrendingUp,
  TrendingDown,
  Shield,
  DollarSign,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  liquidationPrice: number;
  margin: number;
  leverage: number;
  selected?: boolean;
}

interface BatchOperationsProps {
  positions: Position[];
  isWalletConnected: boolean;
  onClosePositions: (positionIds: string[]) => Promise<void>;
  onAdjustLeverage: (positionIds: string[], leverage: number) => Promise<void>;
  onSetStopLoss: (positionIds: string[], stopLoss: number) => Promise<void>;
  onSetTakeProfit: (positionIds: string[], takeProfit: number) => Promise<void>;
  onAddMargin: (positionIds: string[], amount: number) => Promise<void>;
}

interface BatchAction {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'risk' | 'position' | 'profit';
  requiresInput?: boolean;
  dangerous?: boolean;
}

const BatchOperations: React.FC<BatchOperationsProps> = ({
  positions,
  isWalletConnected,
  onClosePositions,
  onAdjustLeverage,
  onSetStopLoss,
  onSetTakeProfit,
  onAddMargin
}) => {
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [currentAction, setCurrentAction] = useState<BatchAction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Batch operation states
  const [newLeverage, setNewLeverage] = useState(10);
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [marginAmount, setMarginAmount] = useState('');
  const [closePercentage, setClosePercentage] = useState(100);

  // Filter criteria states
  const [filterCriteria, setFilterCriteria] = useState({
    minPnl: '',
    maxPnl: '',
    symbols: [] as string[],
    sides: [] as ('long' | 'short')[],
    minLeverage: '',
    maxLeverage: ''
  });

  // Available batch actions
  const batchActions: BatchAction[] = [
    {
      id: 'close-positions',
      name: '批量平仓',
      description: '关闭选中的所有持仓',
      icon: <X className="w-4 h-4" />,
      category: 'position',
      dangerous: true
    },
    {
      id: 'set-stop-loss',
      name: '设置止损',
      description: '为选中持仓设置统一止损价格',
      icon: <Shield className="w-4 h-4" />,
      category: 'risk',
      requiresInput: true
    },
    {
      id: 'set-take-profit',
      name: '设置止盈',
      description: '为选中持仓设置统一止盈价格',
      icon: <Target className="w-4 h-4" />,
      category: 'profit',
      requiresInput: true
    },
    {
      id: 'adjust-leverage',
      name: '调整杠杆',
      description: '批量调整选中持仓的杠杆倍数',
      icon: <TrendingUp className="w-4 h-4" />,
      category: 'risk',
      requiresInput: true
    },
    {
      id: 'add-margin',
      name: '追加保证金',
      description: '为选中持仓批量追加保证金',
      icon: <DollarSign className="w-4 h-4" />,
      category: 'risk',
      requiresInput: true
    }
  ];

  // Handle position selection
  const togglePositionSelection = useCallback((positionId: string) => {
    setSelectedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(positionId)) {
        newSet.delete(positionId);
      } else {
        newSet.add(positionId);
      }
      return newSet;
    });
  }, []);

  const selectAllPositions = useCallback(() => {
    setSelectedPositions(new Set(positions.map(p => p.id)));
  }, [positions]);

  const clearSelection = useCallback(() => {
    setSelectedPositions(new Set());
  }, []);

  // Smart selection based on criteria
  const smartSelect = useCallback((criteria: 'profitable' | 'losing' | 'high-risk' | 'low-leverage') => {
    let filteredPositions: Position[] = [];

    switch (criteria) {
      case 'profitable':
        filteredPositions = positions.filter(p => p.pnl > 0);
        break;
      case 'losing':
        filteredPositions = positions.filter(p => p.pnl < 0);
        break;
      case 'high-risk':
        filteredPositions = positions.filter(p => p.leverage >= 50 || 
          Math.abs(p.currentPrice - p.liquidationPrice) / p.currentPrice < 0.1);
        break;
      case 'low-leverage':
        filteredPositions = positions.filter(p => p.leverage <= 10);
        break;
    }

    setSelectedPositions(new Set(filteredPositions.map(p => p.id)));
    toast.success(`已选择 ${filteredPositions.length} 个持仓`);
  }, [positions]);

  // Execute batch operation
  const executeBatchOperation = useCallback(async (action: BatchAction) => {
    if (selectedPositions.size === 0) {
      toast.error('请先选择要操作的持仓');
      return;
    }

    setIsExecuting(true);
    const positionIds = Array.from(selectedPositions);

    try {
      switch (action.id) {
        case 'close-positions':
          await onClosePositions(positionIds);
          toast.success(`已平仓 ${positionIds.length} 个持仓`);
          break;
        
        case 'adjust-leverage':
          await onAdjustLeverage(positionIds, newLeverage);
          toast.success(`已调整 ${positionIds.length} 个持仓的杠杆为 ${newLeverage}x`);
          break;
        
        case 'set-stop-loss':
          if (!stopLossPrice) {
            toast.error('请输入止损价格');
            return;
          }
          await onSetStopLoss(positionIds, parseFloat(stopLossPrice));
          toast.success(`已为 ${positionIds.length} 个持仓设置止损`);
          break;
        
        case 'set-take-profit':
          if (!takeProfitPrice) {
            toast.error('请输入止盈价格');
            return;
          }
          await onSetTakeProfit(positionIds, parseFloat(takeProfitPrice));
          toast.success(`已为 ${positionIds.length} 个持仓设置止盈`);
          break;
        
        case 'add-margin':
          if (!marginAmount) {
            toast.error('请输入保证金数量');
            return;
          }
          await onAddMargin(positionIds, parseFloat(marginAmount));
          toast.success(`已为 ${positionIds.length} 个持仓追加保证金`);
          break;
      }

      // Clear selection and close dialog
      clearSelection();
      setShowBatchDialog(false);
      setCurrentAction(null);
    } catch (error) {
      toast.error('批量操作失败，请重试');
      console.error('Batch operation failed:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [selectedPositions, newLeverage, stopLossPrice, takeProfitPrice, marginAmount, onClosePositions, onAdjustLeverage, onSetStopLoss, onSetTakeProfit, onAddMargin, clearSelection]);

  // Get selected positions data
  const selectedPositionsData = positions.filter(p => selectedPositions.has(p.id));
  const totalSelectedValue = selectedPositionsData.reduce((sum, p) => sum + p.size * p.currentPrice, 0);
  const totalSelectedPnL = selectedPositionsData.reduce((sum, p) => sum + p.pnl, 0);

  // Group actions by category
  const actionsByCategory = batchActions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, BatchAction[]>);

  const categoryNames = {
    risk: '风险管理',
    position: '持仓操作',
    profit: '盈利管理'
  };

  if (!isWalletConnected || positions.length === 0) {
    return null;
  }

  return (
    <Card className="bg-surface-1 border border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <LayersIcon className="w-5 h-5" />
            <span>批量操作</span>
            {selectedPositions.size > 0 && (
              <Badge variant="default" className="bg-river-blue">
                {selectedPositions.size} 已选择
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              disabled={selectedPositions.size === 0}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            
            <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  disabled={selectedPositions.size === 0}
                  className="bg-river-blue hover:bg-river-blue/90"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  批量操作
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>批量操作</DialogTitle>
                  <DialogDescription>
                    已选择 {selectedPositions.size} 个持仓，总价值 ${totalSelectedValue.toLocaleString()}
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="actions" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="actions">操作类型</TabsTrigger>
                    <TabsTrigger value="settings">参数设置</TabsTrigger>
                  </TabsList>

                  <TabsContent value="actions" className="space-y-4">
                    {Object.entries(actionsByCategory).map(([category, actions]) => (
                      <div key={category}>
                        <h4 className="font-semibold mb-3">{categoryNames[category as keyof typeof categoryNames]}</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {actions.map(action => (
                            <Button
                              key={action.id}
                              variant={currentAction?.id === action.id ? "default" : "outline"}
                              className={`justify-start h-auto p-4 ${
                                action.dangerous ? 'border-danger/50 hover:bg-danger/10' : ''
                              }`}
                              onClick={() => setCurrentAction(action)}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-lg ${
                                  action.dangerous ? 'bg-danger/10 text-danger' : 'bg-river-blue/10 text-river-blue'
                                }`}>
                                  {action.icon}
                                </div>
                                <div className="text-left">
                                  <div className="font-medium">{action.name}</div>
                                  <div className="text-sm text-secondary">{action.description}</div>
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-4">
                    {currentAction?.requiresInput && (
                      <div className="space-y-4">
                        {currentAction.id === 'adjust-leverage' && (
                          <div>
                            <Label>新杠杆倍数: {newLeverage}x</Label>
                            <Slider
                              value={[newLeverage]}
                              onValueChange={(value) => setNewLeverage(value[0])}
                              max={100}
                              min={1}
                              step={1}
                              className="mt-2"
                            />
                            <div className="flex justify-between text-xs text-secondary mt-1">
                              <span>1x</span>
                              <span>50x</span>
                              <span>100x</span>
                            </div>
                          </div>
                        )}

                        {currentAction.id === 'set-stop-loss' && (
                          <div>
                            <Label htmlFor="stop-loss">止损价格 (USDT)</Label>
                            <Input
                              id="stop-loss"
                              type="number"
                              value={stopLossPrice}
                              onChange={(e) => setStopLossPrice(e.target.value)}
                              placeholder="输入统一止损价格"
                            />
                          </div>
                        )}

                        {currentAction.id === 'set-take-profit' && (
                          <div>
                            <Label htmlFor="take-profit">止盈价格 (USDT)</Label>
                            <Input
                              id="take-profit"
                              type="number"
                              value={takeProfitPrice}
                              onChange={(e) => setTakeProfitPrice(e.target.value)}
                              placeholder="输入统一止盈价格"
                            />
                          </div>
                        )}

                        {currentAction.id === 'add-margin' && (
                          <div>
                            <Label htmlFor="margin-amount">追加保证金 (USDT)</Label>
                            <Input
                              id="margin-amount"
                              type="number"
                              value={marginAmount}
                              onChange={(e) => setMarginAmount(e.target.value)}
                              placeholder="输入要追加的保证金数量"
                            />
                          </div>
                        )}

                        {currentAction.id === 'close-positions' && (
                          <div>
                            <Label>平仓比例: {closePercentage}%</Label>
                            <Slider
                              value={[closePercentage]}
                              onValueChange={(value) => setClosePercentage(value[0])}
                              max={100}
                              min={10}
                              step={10}
                              className="mt-2"
                            />
                            <div className="flex justify-between text-xs text-secondary mt-1">
                              <span>10%</span>
                              <span>50%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected positions summary */}
                    <div className="bg-surface-2 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">选中持仓摘要</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-secondary">总数量:</span>
                          <span className="ml-2 font-medium">{selectedPositions.size}</span>
                        </div>
                        <div>
                          <span className="text-secondary">总价值:</span>
                          <span className="ml-2 font-medium">${totalSelectedValue.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-secondary">总盈亏:</span>
                          <span className={`ml-2 font-medium ${totalSelectedPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                            {totalSelectedPnL >= 0 ? '+' : ''}${totalSelectedPnL.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-secondary">平均杠杆:</span>
                          <span className="ml-2 font-medium">
                            {(selectedPositionsData.reduce((sum, p) => sum + p.leverage, 0) / selectedPositionsData.length).toFixed(1)}x
                          </span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
                    取消
                  </Button>
                  <Button
                    onClick={() => currentAction && executeBatchOperation(currentAction)}
                    disabled={!currentAction || isExecuting}
                    variant={currentAction?.dangerous ? "destructive" : "default"}
                  >
                    {isExecuting ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      currentAction?.icon && React.cloneElement(currentAction.icon as React.ReactElement, { className: "w-4 h-4 mr-2" })
                    )}
                    {isExecuting ? '执行中...' : '确认执行'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick selection buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllPositions}
            disabled={positions.length === 0}
          >
            全选
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => smartSelect('profitable')}
            disabled={positions.length === 0}
          >
            盈利持仓
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => smartSelect('losing')}
            disabled={positions.length === 0}
          >
            亏损持仓
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => smartSelect('high-risk')}
            disabled={positions.length === 0}
          >
            高风险
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => smartSelect('low-leverage')}
            disabled={positions.length === 0}
          >
            低杠杆
          </Button>
        </div>

        {/* Position list with checkboxes */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {positions.map(position => (
            <div
              key={position.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                selectedPositions.has(position.id)
                  ? 'bg-river-blue/10 border-river-blue/30'
                  : 'bg-surface-2 border-border hover:bg-surface-3'
              }`}
              onClick={() => togglePositionSelection(position.id)}
            >
              <Checkbox
                checked={selectedPositions.has(position.id)}
                onCheckedChange={() => togglePositionSelection(position.id)}
              />
              
              <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium">{position.symbol}</div>
                  <Badge
                    variant={position.side === 'long' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {position.side.toUpperCase()} {position.leverage}x
                  </Badge>
                </div>
                
                <div>
                  <div className="text-secondary">持仓</div>
                  <div className="font-medium">${position.size.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-secondary">盈亏</div>
                  <div className={`font-medium ${position.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {position.pnl >= 0 ? '+' : ''}${position.pnl.toLocaleString()}
                  </div>
                </div>
                
                <div>
                  <div className="text-secondary">当前价格</div>
                  <div className="font-medium">${position.currentPrice.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchOperations;