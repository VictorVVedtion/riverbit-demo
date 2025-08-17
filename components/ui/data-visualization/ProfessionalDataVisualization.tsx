/**
 * 专业级数据可视化组件集合
 * 实现 SOTA 交易平台标准的数据展示和动画效果
 * 参考 TradingView、Bloomberg Terminal、Robinhood 等平台设计
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';

// ====== 核心数据类型定义 ======
export interface DataPoint {
  timestamp: number;
  value: number;
  volume?: number;
  change?: number;
  changePercent?: number;
}

export interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  colorMode?: 'profit-loss' | 'trend' | 'neutral';
  enableFlash?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export interface TrendIndicatorProps {
  value: number;
  previousValue?: number;
  className?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  sensitivity?: number; // 触发变化的最小阈值
}

export interface MiniChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  lineColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  showDots?: boolean;
  animated?: boolean;
  className?: string;
}

export interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdate?: number;
  latency?: number;
  dataQuality?: 'excellent' | 'good' | 'poor' | 'critical';
  className?: string;
}

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

// ====== 智能数值动画组件 ======
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 2,
  duration = 800,
  prefix = '',
  suffix = '',
  className = '',
  colorMode = 'neutral',
  enableFlash = true,
  minimumFractionDigits,
  maximumFractionDigits
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [flashDirection, setFlashDirection] = useState<'up' | 'down' | null>(null);
  const animationRef = useRef<number>();
  const previousValueRef = useRef(value);

  // 智能数值插值动画
  useEffect(() => {
    if (value === displayValue) return;

    const startValue = displayValue;
    const endValue = value;
    const startTime = Date.now();

    // 设置闪烁方向
    if (enableFlash && endValue !== previousValueRef.current) {
      setFlashDirection(endValue > previousValueRef.current ? 'up' : 'down');
      setTimeout(() => setFlashDirection(null), 600);
    }

    setIsAnimating(true);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用 easeOutCubic 缓动函数实现平滑过渡
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        previousValueRef.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, displayValue, enableFlash]);

  // 智能颜色计算
  const getColorClass = () => {
    if (colorMode === 'profit-loss') {
      if (displayValue > 0) return 'text-green-400';
      if (displayValue < 0) return 'text-red-400';
      return 'text-gray-400';
    }
    
    if (colorMode === 'trend') {
      const change = displayValue - previousValueRef.current;
      if (change > 0) return 'text-green-400';
      if (change < 0) return 'text-red-400';
      return 'text-gray-300';
    }
    
    return 'text-gray-300';
  };

  // 闪烁动画类
  const getFlashClass = () => {
    if (!flashDirection) return '';
    return flashDirection === 'up' 
      ? 'animate-flash-green' 
      : 'animate-flash-red';
  };

  // 格式化数值
  const formatValue = (val: number) => {
    const options: Intl.NumberFormatOptions = {
      minimumFractionDigits: minimumFractionDigits ?? decimals,
      maximumFractionDigits: maximumFractionDigits ?? decimals,
    };
    return val.toLocaleString('en-US', options);
  };

  return (
    <span 
      className={`
        font-mono font-bold transition-all duration-300
        ${getColorClass()}
        ${getFlashClass()}
        ${isAnimating ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {prefix}{formatValue(displayValue)}{suffix}
    </span>
  );
};

// ====== 趋势指示器组件 ======
export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  value,
  previousValue,
  className = '',
  showValue = false,
  size = 'md',
  sensitivity = 0.001
}) => {
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (previousValue !== undefined) {
      const change = value - previousValue;
      const changePercent = Math.abs(change / previousValue);
      
      if (changePercent >= sensitivity) {
        const newTrend = change > 0 ? 'up' : 'down';
        setTrend(newTrend);
        setIsFlashing(true);
        
        setTimeout(() => setIsFlashing(false), 500);
      }
    }
  }, [value, previousValue, sensitivity]);

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getTrendIcon = () => {
    if (trend === 'up') {
      return <TrendingUp className={`${sizeClasses[size]} text-green-400`} />;
    }
    if (trend === 'down') {
      return <TrendingDown className={`${sizeClasses[size]} text-red-400`} />;
    }
    return <Activity className={`${sizeClasses[size]} text-gray-400`} />;
  };

  return (
    <div className={`
      flex items-center space-x-1 
      ${isFlashing ? 'animate-pulse' : ''} 
      ${className}
    `}>
      {getTrendIcon()}
      {showValue && (
        <span className={`
          text-sm font-mono 
          ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}
        `}>
          {value.toFixed(2)}
        </span>
      )}
    </div>
  );
};

// ====== 迷你图表组件 ======
export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  width = 100,
  height = 40,
  lineColor = '#10b981',
  fillColor = 'rgba(16, 185, 129, 0.1)',
  strokeWidth = 2,
  showDots = false,
  animated = true,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  // 计算路径数据
  const pathData = useMemo(() => {
    if (!data.length) return '';

    const minValue = Math.min(...data.map(d => d.value));
    const maxValue = Math.max(...data.map(d => d.value));
    const valueRange = maxValue - minValue || 1;

    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point.value - minValue) / valueRange) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [data, width, height]);

  // 计算填充区域路径
  const fillPath = useMemo(() => {
    if (!pathData) return '';
    return `${pathData} L ${width},${height} L 0,${height} Z`;
  }, [pathData, width, height]);

  // 动画效果
  useEffect(() => {
    if (!animated || !pathRef.current) return;

    const path = pathRef.current;
    const length = path.getTotalLength();
    
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    
    // 触发动画
    requestAnimationFrame(() => {
      path.style.transition = 'stroke-dashoffset 1s ease-in-out';
      path.style.strokeDashoffset = '0';
    });
  }, [pathData, animated]);

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* 填充区域 */}
        <path
          d={fillPath}
          fill={fillColor}
          className="transition-all duration-300"
        />
        
        {/* 主线条 */}
        <path
          ref={pathRef}
          d={pathData}
          fill="none"
          stroke={lineColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
        
        {/* 数据点 */}
        {showDots && data.map((point, index) => {
          const minValue = Math.min(...data.map(d => d.value));
          const maxValue = Math.max(...data.map(d => d.value));
          const valueRange = maxValue - minValue || 1;
          
          const x = (index / (data.length - 1)) * width;
          const y = height - ((point.value - minValue) / valueRange) * height;
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill={lineColor}
              className="animate-pulse"
            />
          );
        })}
      </svg>
    </div>
  );
};

// ====== 连接状态指示器 ======
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  lastUpdate,
  latency,
  dataQuality = 'good',
  className = ''
}) => {
  const [blinkState, setBlinkState] = useState(false);

  // 连接状态闪烁效果
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(() => {
        setBlinkState(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const getStatusColor = () => {
    if (!isConnected) return 'text-red-400';
    
    switch (dataQuality) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'poor': return 'text-yellow-400';
      case 'critical': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    if (!isConnected) {
      return <WifiOff className={`w-4 h-4 ${blinkState ? 'opacity-100' : 'opacity-50'}`} />;
    }
    
    switch (dataQuality) {
      case 'excellent': return <CheckCircle className="w-4 h-4" />;
      case 'good': return <Wifi className="w-4 h-4" />;
      case 'poor': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 animate-pulse" />;
      default: return <Wifi className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    
    switch (dataQuality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Connected';
      case 'poor': return 'Poor Signal';
      case 'critical': return 'Critical';
      default: return 'Connected';
    }
  };

  const formatLatency = () => {
    if (!latency) return '';
    return latency < 100 ? `${latency}ms` : `${latency}ms (High)`;
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    const secondsAgo = Math.floor((Date.now() - lastUpdate) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    return `${Math.floor(secondsAgo / 60)}m ago`;
  };

  return (
    <div className={`
      flex items-center space-x-2 text-xs
      ${getStatusColor()}
      ${className}
    `}>
      {getStatusIcon()}
      <span className="font-medium">{getStatusText()}</span>
      
      {isConnected && (
        <div className="flex items-center space-x-2 text-gray-400">
          {latency && <span>• {formatLatency()}</span>}
          {lastUpdate && <span>• {formatLastUpdate()}</span>}
        </div>
      )}
    </div>
  );
};

// ====== 进度环组件 ======
export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max = 100,
  size = 60,
  strokeWidth = 6,
  color = '#10b981',
  backgroundColor = '#374151',
  showValue = true,
  animated = true,
  className = ''
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    if (!animated) {
      setAnimatedValue(value);
      return;
    }

    const duration = 1000;
    const startTime = Date.now();
    const startValue = animatedValue;
    const endValue = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setAnimatedValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, animated]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedValue / max) * circumference;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={animated ? 'transition-all duration-1000 ease-out' : ''}
        />
      </svg>
      
      {/* 数值显示 */}
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">
            {Math.round((animatedValue / max) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

// ====== 样式定义 ======
export const DataVisualizationStyles = () => (
  <style>{`
    @keyframes flash-green {
      0% { background-color: rgba(16, 185, 129, 0.2); box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); }
      50% { background-color: rgba(16, 185, 129, 0.4); box-shadow: 0 0 15px rgba(16, 185, 129, 0.5); }
      100% { background-color: transparent; box-shadow: none; }
    }
    
    @keyframes flash-red {
      0% { background-color: rgba(239, 68, 68, 0.2); box-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
      50% { background-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); }
      100% { background-color: transparent; box-shadow: none; }
    }
    
    .animate-flash-green {
      animation: flash-green 600ms cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 4px;
    }
    
    .animate-flash-red {
      animation: flash-red 600ms cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 4px;
    }
    
    .data-viz-container {
      backface-visibility: hidden;
      transform: translateZ(0);
      will-change: transform;
    }
    
    .smooth-transition {
      transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  `}</style>
);