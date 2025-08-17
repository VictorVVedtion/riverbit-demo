/**
 * Trading Plan Card - 可执行的交易计划卡
 * 根据用户AI产品逻辑设计的核心组件
 */

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Clock, Target, Shield, DollarSign, Zap, Play, Settings } from 'lucide-react';
import { toast } from 'sonner';

export interface TradingPlan {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  confidence: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string;
  reasoning: string;
  
  // 交易参数
  entryPrice: number;
  entryType: 'limit' | 'market' | 'breakout';
  stopLoss: number;
  takeProfit: number;
  positionSize: number; // 占账户百分比
  riskReward: number;
  validUntil: string; // 有效期
  
  // 解释逻辑
  whyReasons: string[];
  
  // 成本估算
  estimatedFees: number;
  estimatedSlippage: number;
  
  // 元数据
  timestamp: number;
  hash?: string; // 用于上链存证
}

interface TradingPlanCardProps {
  plan: TradingPlan;
  onExecute?: (plan: TradingPlan) => void;
  onSimulate?: (plan: TradingPlan) => void;
  onCustomize?: (plan: TradingPlan) => void;
  onUpdatePlan?: (updatedPlan: TradingPlan) => void;
  className?: string;
}

export const TradingPlanCard: React.FC<TradingPlanCardProps> = ({
  plan,
  onExecute,
  onSimulate,
  onCustomize,
  onUpdatePlan,
  className = ""
}) => {
  const [showReasons, setShowReasons] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);

  // 风险级别颜色映射
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // 方向颜色和图标
  const getDirectionInfo = (direction: string) => {
    if (direction === 'long') {
      return {
        color: 'text-green-400',
        bgColor: 'bg-green-500/20 border-green-500/30',
        icon: TrendingUp,
        label: '看多'
      };
    }
    return {
      color: 'text-red-400',
      bgColor: 'bg-red-500/20 border-red-500/30',
      icon: TrendingDown,
      label: '看空'
    };
  };

  const directionInfo = getDirectionInfo(localPlan.direction);
  const DirectionIcon = directionInfo.icon;

  // 更新计划参数
  const updatePlanValue = (key: keyof TradingPlan, value: any) => {
    const updated = { ...localPlan, [key]: value };
    setLocalPlan(updated);
    onUpdatePlan?.(updated);
  };

  // 计算R:R比例显示
  const calculateRR = () => {
    const risk = Math.abs(localPlan.entryPrice - localPlan.stopLoss);
    const reward = Math.abs(localPlan.takeProfit - localPlan.entryPrice);
    return risk > 0 ? (reward / risk).toFixed(2) : '0';
  };

  return (
    <Card className={`w-full bg-slate-900/80 border-slate-700/50 backdrop-blur-sm ${className}`}>
      <CardContent className="p-4 space-y-4">
        {/* 顶部状态芯片 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${directionInfo.bgColor} border px-2 py-1 font-medium`}>
              <DirectionIcon className="w-3 h-3 mr-1" />
              {directionInfo.label}
            </Badge>
            
            <Badge variant="outline" className="border-blue-500/30 text-blue-400">
              置信 {localPlan.confidence}%
            </Badge>
            
            <Badge className={getRiskColor(localPlan.riskLevel)}>
              风险 {localPlan.riskLevel === 'low' ? '低' : localPlan.riskLevel === 'medium' ? '中' : '高'}
            </Badge>
            
            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
              <Clock className="w-3 h-3 mr-1" />
              {localPlan.timeframe}
            </Badge>
          </div>
          
          <div className="text-xs text-gray-400">
            {localPlan.symbol}
          </div>
        </div>

        {/* 一句话策略说明 */}
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
          <p className="text-sm text-gray-200 leading-relaxed">
            {localPlan.reasoning}
          </p>
        </div>

        {/* 交易参数区域 */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* 入场价格 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400 flex items-center">
                  <Target className="w-3 h-3 mr-1" />
                  入场价格
                </label>
                <span className="text-xs text-blue-400">{localPlan.entryType}</span>
              </div>
              {isCustomizing ? (
                <input
                  type="number"
                  value={localPlan.entryPrice}
                  onChange={(e) => updatePlanValue('entryPrice', parseFloat(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                />
              ) : (
                <div className="text-sm font-mono text-white bg-slate-800/50 rounded px-2 py-1">
                  ${localPlan.entryPrice.toFixed(2)}
                </div>
              )}
            </div>

            {/* 止损价格 */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                止损价格
              </label>
              {isCustomizing ? (
                <input
                  type="number"
                  value={localPlan.stopLoss}
                  onChange={(e) => updatePlanValue('stopLoss', parseFloat(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                />
              ) : (
                <div className="text-sm font-mono text-red-400 bg-slate-800/50 rounded px-2 py-1">
                  ${localPlan.stopLoss.toFixed(2)}
                </div>
              )}
            </div>

            {/* 目标价格 */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                目标价格
              </label>
              {isCustomizing ? (
                <input
                  type="number"
                  value={localPlan.takeProfit}
                  onChange={(e) => updatePlanValue('takeProfit', parseFloat(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                />
              ) : (
                <div className="text-sm font-mono text-green-400 bg-slate-800/50 rounded px-2 py-1">
                  ${localPlan.takeProfit.toFixed(2)}
                </div>
              )}
            </div>

            {/* 仓位大小 */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 flex items-center">
                <DollarSign className="w-3 h-3 mr-1" />
                仓位占比
              </label>
              {isCustomizing ? (
                <div className="space-y-1">
                  <Slider
                    value={[localPlan.positionSize]}
                    onValueChange={([value]) => updatePlanValue('positionSize', value)}
                    max={10}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="text-xs text-center text-gray-400">{localPlan.positionSize}%</div>
                </div>
              ) : (
                <div className="text-sm font-mono text-yellow-400 bg-slate-800/50 rounded px-2 py-1">
                  {localPlan.positionSize}%
                </div>
              )}
            </div>
          </div>

          {/* R:R 比例和有效期 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              R:R比例: <span className="text-blue-400 font-mono">1:{calculateRR()}</span>
            </span>
            <span className="text-gray-400">
              有效期: <span className="text-purple-400">{localPlan.validUntil}</span>
            </span>
          </div>
        </div>

        {/* 折叠的"为什么"部分 */}
        <div className="border-t border-slate-700/30 pt-3">
          <button
            onClick={() => setShowReasons(!showReasons)}
            className="flex items-center text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            {showReasons ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
            为什么这样建议？
          </button>
          
          {showReasons && (
            <div className="mt-2 space-y-1">
              {localPlan.whyReasons.map((reason, index) => (
                <div key={index} className="text-xs text-gray-300 flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  {reason}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 成本提示 */}
        <div className="bg-slate-800/30 rounded p-2 text-xs text-gray-400">
          <div className="flex items-center justify-between">
            <span>预估费用: {localPlan.estimatedFees}%</span>
            <span>预估滑点: {localPlan.estimatedSlippage}%</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2 border-t border-slate-700/30">
          <Button
            onClick={() => onExecute?.(localPlan)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Play className="w-3 h-3 mr-1" />
            按计划下单
          </Button>
          
          <Button
            onClick={() => onSimulate?.(localPlan)}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-slate-800"
            size="sm"
          >
            先模拟
          </Button>
          
          <Button
            onClick={() => setIsCustomizing(!isCustomizing)}
            variant="ghost"
            className="text-gray-400 hover:bg-slate-800"
            size="sm"
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>

        {/* 自定义模式额外按钮 */}
        {isCustomizing && (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setIsCustomizing(false);
                onCustomize?.(localPlan);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              保存修改
            </Button>
            <Button
              onClick={() => {
                setLocalPlan(plan);
                setIsCustomizing(false);
              }}
              variant="outline"
              className="border-gray-600 text-gray-300"
              size="sm"
            >
              重置
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradingPlanCard;