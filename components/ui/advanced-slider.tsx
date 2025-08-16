"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "./utils";
import { Button } from "./button";
import { Input } from "./input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { Badge } from "./badge";

interface PresetValue {
  value: number;
  label: string;
  color?: string;
}

interface AdvancedSliderProps extends Omit<React.ComponentProps<typeof SliderPrimitive.Root>, 'value' | 'defaultValue'> {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  presets?: PresetValue[];
  showInput?: boolean;
  showTooltip?: boolean;
  showPresets?: boolean;
  formatValue?: (value: number) => string;
  parseValue?: (value: string) => number;
  riskWarning?: boolean;
  liquidationPreview?: boolean;
  hapticFeedback?: boolean;
  keyboardStep?: number;
  wheelStep?: number;
  trackGradient?: boolean;
  showMarkers?: boolean;
  markers?: number[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'leverage' | 'price-range' | 'slippage';
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
  className?: string;
}

const RISK_LEVELS = {
  low: { threshold: 0.3, color: 'bg-green-500', label: '低风险' },
  medium: { threshold: 0.6, color: 'bg-yellow-500', label: '中等风险' },
  high: { threshold: 1.0, color: 'bg-red-500', label: '高风险' }
};

function AdvancedSlider({
  value,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  presets = [],
  showInput = true,
  showTooltip = true,
  showPresets = true,
  formatValue = (v) => v.toString(),
  parseValue = (v) => parseFloat(v) || 0,
  riskWarning = false,
  liquidationPreview = false,
  hapticFeedback = false,
  keyboardStep,
  wheelStep,
  trackGradient = false,
  showMarkers = false,
  markers = [],
  orientation = 'horizontal',
  size = 'md',
  variant = 'default',
  onValueChange,
  onValueCommit,
  className,
  ...props
}: AdvancedSliderProps) {
  const [internalValue, setInternalValue] = React.useState(value ?? defaultValue);
  const [inputValue, setInputValue] = React.useState(formatValue(value ?? defaultValue));
  const [isDragging, setIsDragging] = React.useState(false);
  const [showInputField, setShowInputField] = React.useState(false);
  const sliderRef = React.useRef<HTMLDivElement>(null);

  const currentValue = value ?? internalValue;
  const effectiveKeyboardStep = keyboardStep ?? step ?? 1;
  const effectiveWheelStep = wheelStep ?? step ?? 1;

  // Size variants
  const sizeClasses = {
    sm: {
      track: 'h-2',
      thumb: 'size-3',
      container: 'py-2'
    },
    md: {
      track: 'h-4',
      thumb: 'size-4',
      container: 'py-3'
    },
    lg: {
      track: 'h-6',
      thumb: 'size-6',
      container: 'py-4'
    }
  };

  const sizeClass = sizeClasses[size];

  // Haptic feedback (Web Vibration API)
  const triggerHapticFeedback = React.useCallback(() => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [hapticFeedback]);

  // Risk level calculation
  const getRiskLevel = React.useCallback((val: number) => {
    const normalizedValue = (val - min) / (max - min);
    if (normalizedValue <= RISK_LEVELS.low.threshold) return RISK_LEVELS.low;
    if (normalizedValue <= RISK_LEVELS.medium.threshold) return RISK_LEVELS.medium;
    return RISK_LEVELS.high;
  }, [min, max]);

  const currentRiskLevel = riskWarning ? getRiskLevel(currentValue) : null;

  // Handle value changes
  const handleValueChange = React.useCallback((newValues: number[]) => {
    const newValue = newValues[0];
    setInternalValue(newValue);
    setInputValue(formatValue(newValue));
    onValueChange?.(newValue);
    triggerHapticFeedback();
  }, [onValueChange, formatValue, triggerHapticFeedback]);

  const handleValueCommit = React.useCallback((newValues: number[]) => {
    const newValue = newValues[0];
    onValueCommit?.(newValue);
    setIsDragging(false);
  }, [onValueCommit]);

  // Keyboard handling
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (!sliderRef.current?.contains(event.target as Node)) return;

    let delta = 0;
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        delta = effectiveKeyboardStep;
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        delta = -effectiveKeyboardStep;
        break;
      case 'PageUp':
        delta = effectiveKeyboardStep * 10;
        break;
      case 'PageDown':
        delta = -effectiveKeyboardStep * 10;
        break;
      case 'Home':
        delta = min - currentValue;
        break;
      case 'End':
        delta = max - currentValue;
        break;
      default:
        return;
    }

    event.preventDefault();
    const newValue = Math.max(min, Math.min(max, currentValue + delta));
    handleValueChange([newValue]);
  }, [currentValue, min, max, effectiveKeyboardStep, handleValueChange]);

  // Wheel handling
  const handleWheel = React.useCallback((event: React.WheelEvent) => {
    if (!sliderRef.current?.contains(event.target as Node)) return;
    
    event.preventDefault();
    const delta = event.deltaY > 0 ? -effectiveWheelStep : effectiveWheelStep;
    const newValue = Math.max(min, Math.min(max, currentValue + delta));
    handleValueChange([newValue]);
  }, [currentValue, min, max, effectiveWheelStep, handleValueChange]);

  // Input field handling
  const handleInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  }, []);

  const handleInputBlur = React.useCallback(() => {
    const parsedValue = parseValue(inputValue);
    const clampedValue = Math.max(min, Math.min(max, parsedValue));
    handleValueChange([clampedValue]);
    setShowInputField(false);
  }, [inputValue, parseValue, min, max, handleValueChange]);

  const handleInputKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleInputBlur();
    } else if (event.key === 'Escape') {
      setInputValue(formatValue(currentValue));
      setShowInputField(false);
    }
  }, [handleInputBlur, formatValue, currentValue]);

  // Preset handling
  const handlePresetClick = React.useCallback((presetValue: number) => {
    handleValueChange([presetValue]);
    triggerHapticFeedback();
  }, [handleValueChange, triggerHapticFeedback]);

  // Track gradient style
  const trackStyle = React.useMemo(() => {
    if (!trackGradient) return {};
    
    const percentage = ((currentValue - min) / (max - min)) * 100;
    
    switch (variant) {
      case 'leverage':
        return {
          background: `linear-gradient(90deg, 
            rgb(34, 197, 94) 0%, 
            rgb(234, 179, 8) ${percentage * 0.6}%, 
            rgb(239, 68, 68) ${percentage}%, 
            rgb(107, 114, 128) ${percentage}%, 
            rgb(107, 114, 128) 100%)`
        };
      case 'slippage':
        return {
          background: `linear-gradient(90deg, 
            rgb(34, 197, 94) 0%, 
            rgb(234, 179, 8) ${percentage * 0.8}%, 
            rgb(239, 68, 68) ${percentage}%, 
            rgb(107, 114, 128) ${percentage}%, 
            rgb(107, 114, 128) 100%)`
        };
      default:
        return {
          background: `linear-gradient(90deg, 
            rgb(59, 130, 246) 0%, 
            rgb(59, 130, 246) ${percentage}%, 
            rgb(107, 114, 128) ${percentage}%, 
            rgb(107, 114, 128) 100%)`
        };
    }
  }, [trackGradient, currentValue, min, max, variant]);

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
      setInputValue(formatValue(value));
    }
  }, [value, formatValue]);

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", sizeClass.container, className)}>
        {/* Header with value display and input */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showInput && !showInputField && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInputField(true)}
                    className="text-lg font-mono font-semibold h-auto p-1"
                  >
                    {formatValue(currentValue)}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>点击编辑数值</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {showInput && showInputField && (
              <Input
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className="w-20 h-8 text-sm font-mono"
                autoFocus
              />
            )}
            
            {currentRiskLevel && riskWarning && (
              <Badge 
                variant="secondary" 
                className={cn("text-xs", currentRiskLevel.color, "text-white")}
              >
                {currentRiskLevel.label}
              </Badge>
            )}
          </div>
          
          {liquidationPreview && variant === 'leverage' && (
            <div className="text-xs text-muted-foreground">
              清算价格: ${(1000 - (currentValue * 10)).toFixed(2)}
            </div>
          )}
        </div>

        {/* Main slider */}
        <div 
          ref={sliderRef}
          className="relative"
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
          tabIndex={0}
        >
          <SliderPrimitive.Root
            value={[currentValue]}
            onValueChange={handleValueChange}
            onValueCommit={handleValueCommit}
            min={min}
            max={max}
            step={step}
            orientation={orientation}
            className={cn(
              "relative flex w-full touch-none items-center select-none",
              "data-[disabled]:opacity-50 focus:outline-none",
              orientation === 'vertical' && "h-full min-h-44 w-auto flex-col"
            )}
            onPointerDown={() => setIsDragging(true)}
            {...props}
          >
            <SliderPrimitive.Track
              className={cn(
                "relative grow overflow-hidden rounded-full",
                orientation === 'horizontal' ? `${sizeClass.track} w-full` : `h-full w-1.5`,
                "bg-muted"
              )}
              style={trackGradient ? trackStyle : undefined}
            >
              <SliderPrimitive.Range
                className={cn(
                  "absolute",
                  orientation === 'horizontal' ? "h-full" : "w-full",
                  !trackGradient && "bg-primary"
                )}
              />
            </SliderPrimitive.Track>
            
            {/* Markers */}
            {showMarkers && markers.map((marker) => {
              const position = ((marker - min) / (max - min)) * 100;
              return (
                <div
                  key={marker}
                  className="absolute w-0.5 h-2 bg-muted-foreground/50 -translate-x-0.5"
                  style={{ 
                    left: orientation === 'horizontal' ? `${position}%` : undefined,
                    bottom: orientation === 'vertical' ? `${position}%` : undefined 
                  }}
                />
              );
            })}
            
            <SliderPrimitive.Thumb
              className={cn(
                "block shrink-0 rounded-full border-2 border-primary bg-background",
                "ring-ring/30 transition-all duration-200",
                "hover:ring-4 focus-visible:ring-4 focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-50",
                "cursor-grab active:cursor-grabbing",
                sizeClass.thumb,
                isDragging && "ring-4 scale-110"
              )}
            >
              {showTooltip && isDragging && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg border">
                  {formatValue(currentValue)}
                </div>
              )}
            </SliderPrimitive.Thumb>
          </SliderPrimitive.Root>
        </div>

        {/* Presets */}
        {showPresets && presets.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {presets.map((preset, index) => (
              <Button
                key={index}
                variant={currentValue === preset.value ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetClick(preset.value)}
                className={cn(
                  "text-xs h-6 px-2",
                  preset.color && `hover:${preset.color}`
                )}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}

        {/* Risk warning */}
        {riskWarning && currentRiskLevel === RISK_LEVELS.high && (
          <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-800">
            ⚠️ 高风险操作，请谨慎设置参数
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export { AdvancedSlider, type AdvancedSliderProps };