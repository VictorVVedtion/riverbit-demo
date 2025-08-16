"use client";

import * as React from "react";
import { AdvancedSlider, AdvancedSliderProps } from "../ui/advanced-slider";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Separator } from "../ui/separator";
import { cn } from "../ui/utils";

// Leverage Slider Component
interface LeverageSliderProps {
  value: number;
  onChange: (value: number) => void;
  maxLeverage?: number;
  currentPrice?: number;
  positionSize?: number;
  accountBalance?: number;
  className?: string;
}

export function LeverageSlider({
  value,
  onChange,
  maxLeverage = 100,
  currentPrice = 50000,
  positionSize = 1000,
  accountBalance = 10000,
  className
}: LeverageSliderProps) {
  // Calculate liquidation price
  const liquidationPrice = React.useMemo(() => {
    if (value <= 1) return 0;
    const maintenanceMargin = 0.05; // 5%
    return currentPrice * (1 - (1 / value) + maintenanceMargin);
  }, [value, currentPrice]);

  // Calculate required margin
  const requiredMargin = React.useMemo(() => {
    return positionSize / value;
  }, [positionSize, value]);

  // Risk assessment
  const riskLevel = React.useMemo(() => {
    if (value <= 2) return { level: 'low', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' };
    if (value <= 5) return { level: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' };
    if (value <= 10) return { level: 'high', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' };
    return { level: 'extreme', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' };
  }, [value]);

  const leveragePresets = [
    { value: 1, label: '1x', color: 'hover:bg-green-100' },
    { value: 2, label: '2x', color: 'hover:bg-green-100' },
    { value: 5, label: '5x', color: 'hover:bg-yellow-100' },
    { value: 10, label: '10x', color: 'hover:bg-orange-100' },
    { value: 20, label: '20x', color: 'hover:bg-red-100' },
    { value: 50, label: '50x', color: 'hover:bg-red-100' },
    { value: maxLeverage, label: `${maxLeverage}x`, color: 'hover:bg-red-100' }
  ];

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">杠杆倍数</CardTitle>
          <Badge variant="outline" className={cn("font-mono", riskLevel.color)}>
            {value}x
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AdvancedSlider
          value={value}
          onValueChange={onChange}
          min={1}
          max={maxLeverage}
          step={0.1}
          presets={leveragePresets}
          formatValue={(v) => `${v.toFixed(1)}x`}
          riskWarning={true}
          liquidationPreview={true}
          hapticFeedback={true}
          trackGradient={true}
          variant="leverage"
          showMarkers={true}
          markers={[1, 2, 5, 10, 20, 50, maxLeverage]}
        />
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">所需保证金</span>
              <span className="font-mono">${requiredMargin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">账户余额</span>
              <span className="font-mono">${accountBalance.toFixed(2)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">清算价格</span>
              <span className="font-mono text-red-600">${liquidationPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">安全边际</span>
              <span className="font-mono">
                {((currentPrice - liquidationPrice) / currentPrice * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {riskLevel.level === 'extreme' && (
          <Alert className="border-red-200 dark:border-red-800">
            <AlertDescription className="text-red-600 dark:text-red-400">
              ⚠️ 极高杠杆风险！市场小幅波动可能导致清算
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Price Range Slider Component
interface PriceRangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  currentPrice: number;
  priceRange?: [number, number];
  liquidityData?: Array<{ price: number; volume: number }>;
  className?: string;
}

export function PriceRangeSlider({
  value,
  onChange,
  currentPrice,
  priceRange = [currentPrice * 0.8, currentPrice * 1.2],
  liquidityData = [],
  className
}: PriceRangeSliderProps) {
  const [minPrice, maxPrice] = value;
  const [minRange, maxRange] = priceRange;

  // Calculate spread and midpoint
  const spread = maxPrice - minPrice;
  const spreadPercentage = (spread / currentPrice) * 100;
  const midpoint = (minPrice + maxPrice) / 2;

  // Estimate available liquidity in range
  const availableLiquidity = React.useMemo(() => {
    return liquidityData
      .filter(item => item.price >= minPrice && item.price <= maxPrice)
      .reduce((sum, item) => sum + item.volume, 0);
  }, [liquidityData, minPrice, maxPrice]);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">价格区间设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Min Price Slider */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">最低价格</label>
          <AdvancedSlider
            value={minPrice}
            onValueChange={(v) => onChange([v, maxPrice])}
            min={minRange}
            max={Math.min(maxRange, maxPrice - 0.01)}
            step={0.01}
            formatValue={(v) => `$${v.toFixed(2)}`}
            parseValue={(v) => parseFloat(v.replace('$', '')) || minRange}
            hapticFeedback={true}
            size="sm"
            variant="price-range"
          />
        </div>

        {/* Max Price Slider */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">最高价格</label>
          <AdvancedSlider
            value={maxPrice}
            onValueChange={(v) => onChange([minPrice, v])}
            min={Math.max(minRange, minPrice + 0.01)}
            max={maxRange}
            step={0.01}
            formatValue={(v) => `$${v.toFixed(2)}`}
            parseValue={(v) => parseFloat(v.replace('$', '')) || maxRange}
            hapticFeedback={true}
            size="sm"
            variant="price-range"
          />
        </div>

        <Separator />

        {/* Range Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">当前价格</span>
              <span className="font-mono">${currentPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">中点价格</span>
              <span className="font-mono">${midpoint.toFixed(2)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">价差</span>
              <span className="font-mono">${spread.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">价差百分比</span>
              <span className="font-mono">{spreadPercentage.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Liquidity Preview */}
        {liquidityData.length > 0 && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">区间流动性</span>
              <span className="font-mono">${availableLiquidity.toFixed(0)}</span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (availableLiquidity / 1000000) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Warnings */}
        {currentPrice < minPrice || currentPrice > maxPrice ? (
          <Alert className="border-yellow-200 dark:border-yellow-800">
            <AlertDescription className="text-yellow-600 dark:text-yellow-400">
              ⚠️ 当前价格不在设置区间内，订单可能不会立即执行
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Slippage Tolerance Slider
interface SlippageSliderProps {
  value: number;
  onChange: (value: number) => void;
  tradeSize?: number;
  estimatedSlippage?: number;
  className?: string;
}

export function SlippageSlider({
  value,
  onChange,
  tradeSize = 10000,
  estimatedSlippage = 0.1,
  className
}: SlippageSliderProps) {
  const slippagePresets = [
    { value: 0.1, label: '0.1%' },
    { value: 0.5, label: '0.5%' },
    { value: 1.0, label: '1.0%' },
    { value: 2.0, label: '2.0%' },
    { value: 5.0, label: '5.0%' }
  ];

  const isSlippageTight = value < estimatedSlippage;
  const slippageCost = (tradeSize * value) / 100;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">滑点容忍度</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AdvancedSlider
          value={value}
          onValueChange={onChange}
          min={0.1}
          max={10}
          step={0.1}
          presets={slippagePresets}
          formatValue={(v) => `${v.toFixed(1)}%`}
          parseValue={(v) => parseFloat(v.replace('%', '')) || 0.1}
          hapticFeedback={true}
          trackGradient={true}
          variant="slippage"
        />
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">预估滑点</span>
              <span className="font-mono">{estimatedSlippage.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">交易规模</span>
              <span className="font-mono">${tradeSize.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">最大滑点成本</span>
              <span className="font-mono">${slippageCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">状态</span>
              <Badge 
                variant={isSlippageTight ? "destructive" : "secondary"}
                className="text-xs"
              >
                {isSlippageTight ? '可能失败' : '正常'}
              </Badge>
            </div>
          </div>
        </div>

        {isSlippageTight && (
          <Alert className="border-yellow-200 dark:border-yellow-800">
            <AlertDescription className="text-yellow-600 dark:text-yellow-400">
              ⚠️ 滑点设置过低，交易可能失败。建议设置为预估滑点的1.5-2倍
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Liquidity Provision Range Slider
interface LiquidityRangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  currentPrice: number;
  poolData?: {
    totalLiquidity: number;
    apr: number;
    volume24h: number;
  };
  className?: string;
}

export function LiquidityRangeSlider({
  value,
  onChange,
  currentPrice,
  poolData = { totalLiquidity: 1000000, apr: 15.5, volume24h: 500000 },
  className
}: LiquidityRangeSliderProps) {
  const [minPrice, maxPrice] = value;
  const range = maxPrice - minPrice;
  const rangePercentage = (range / currentPrice) * 100;

  // Calculate potential returns
  const concentrationRatio = (currentPrice * 2) / range; // Higher = more concentrated
  const estimatedAPR = poolData.apr * Math.min(concentrationRatio, 3); // Cap at 3x

  // Risk assessment based on range
  const riskLevel = React.useMemo(() => {
    if (rangePercentage > 50) return { level: 'low', color: 'text-green-600' };
    if (rangePercentage > 20) return { level: 'medium', color: 'text-yellow-600' };
    return { level: 'high', color: 'text-red-600' };
  }, [rangePercentage]);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">流动性价格区间</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              最低价格 (${minPrice.toFixed(2)})
            </label>
            <AdvancedSlider
              value={minPrice}
              onValueChange={(v) => onChange([v, maxPrice])}
              min={currentPrice * 0.5}
              max={Math.min(currentPrice * 0.99, maxPrice - 0.01)}
              step={currentPrice * 0.001}
              formatValue={(v) => `$${v.toFixed(2)}`}
              hapticFeedback={true}
              size="sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              最高价格 (${maxPrice.toFixed(2)})
            </label>
            <AdvancedSlider
              value={maxPrice}
              onValueChange={(v) => onChange([minPrice, v])}
              min={Math.max(currentPrice * 1.01, minPrice + 0.01)}
              max={currentPrice * 2}
              step={currentPrice * 0.001}
              formatValue={(v) => `$${v.toFixed(2)}`}
              hapticFeedback={true}
              size="sm"
            />
          </div>
        </div>

        <Separator />

        {/* Strategy Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">当前价格</span>
              <span className="font-mono">${currentPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">价格区间</span>
              <span className="font-mono">{rangePercentage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">集中度</span>
              <span className={cn("font-mono", riskLevel.color)}>
                {concentrationRatio.toFixed(1)}x
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">池子APR</span>
              <span className="font-mono">{poolData.apr.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">预估APR</span>
              <span className="font-mono text-green-600">
                {estimatedAPR.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">风险等级</span>
              <Badge 
                variant={riskLevel.level === 'low' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {riskLevel.level === 'low' ? '低' : riskLevel.level === 'medium' ? '中' : '高'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Visual range indicator */}
        <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
          {/* Price range visualization */}
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-2 bg-gradient-to-r from-blue-200 to-blue-400 rounded-full mx-4" />
          </div>
          
          {/* Current price marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ 
              left: `${((currentPrice - minPrice) / (maxPrice - minPrice)) * 100}%` 
            }}
          />
          
          {/* Range labels */}
          <div className="absolute inset-0 flex justify-between items-center px-2 text-xs text-muted-foreground">
            <span>${minPrice.toFixed(0)}</span>
            <span className="text-red-600 font-medium">NOW</span>
            <span>${maxPrice.toFixed(0)}</span>
          </div>
        </div>

        {/* Warnings and tips */}
        {rangePercentage < 10 && (
          <Alert className="border-yellow-200 dark:border-yellow-800">
            <AlertDescription className="text-yellow-600 dark:text-yellow-400">
              ⚠️ 价格区间较窄，收益更高但无常损失风险增加
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}