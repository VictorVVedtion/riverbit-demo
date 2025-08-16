import React, { useState, useEffect, useRef } from 'react';
import { Brain, MessageCircle, Sparkles, Zap } from 'lucide-react';
import { cn } from './utils';

interface NaturalAIInterfaceProps {
  isActive?: boolean;
  isThinking?: boolean;
  responseTime?: number;
  confidence?: number;
  onToggle?: () => void;
  className?: string;
  variant?: 'button' | 'panel' | 'chat';
  size?: 'sm' | 'md' | 'lg';
}

const NaturalAIInterface: React.FC<NaturalAIInterfaceProps> = ({
  isActive = false,
  isThinking = false,
  responseTime = 1.2,
  confidence = 0.85,
  onToggle,
  className,
  variant = 'button',
  size = 'md',
}) => {
  const [pulseIntensity, setPulseIntensity] = useState(0.5);
  const [neuralActivity, setNeuralActivity] = useState(false);
  const interfaceRef = useRef<HTMLDivElement>(null);

  // 智能呼吸节奏调节
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setPulseIntensity(prev => {
          // 基于confidence调节呼吸强度
          const baseIntensity = confidence * 0.8 + 0.2;
          const variation = Math.sin(Date.now() / 2000) * 0.2;
          return Math.max(0.3, Math.min(1, baseIntensity + variation));
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [isActive, confidence]);

  // 神经网络活动模拟
  useEffect(() => {
    if (isThinking) {
      setNeuralActivity(true);
      const timeout = setTimeout(() => {
        setNeuralActivity(false);
      }, responseTime * 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [isThinking, responseTime]);

  // 获取尺寸相关样式
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8 text-xs';
      case 'md':
        return 'w-12 h-12 text-sm';
      case 'lg':
        return 'w-16 h-16 text-base';
      default:
        return 'w-12 h-12 text-sm';
    }
  };

  // 智能状态指示器
  const getStatusColor = () => {
    if (isThinking) return 'rgb(255, 200, 100)'; // 思考中 - 温暖黄色
    if (isActive && confidence > 0.8) return 'rgb(0, 255, 136)'; // 高信心 - 绿色
    if (isActive && confidence > 0.6) return 'rgb(0, 212, 255)'; // 中等信心 - 蓝色
    if (isActive) return 'rgb(255, 165, 0)'; // 低信心 - 橙色
    return 'rgb(148, 163, 184)'; // 待机 - 灰色
  };

  // 信心水平动画
  const getConfidenceAnimation = () => {
    if (confidence > 0.9) return 'animate-pulse';
    if (confidence > 0.7) return 'breathing-card';
    return 'element-breath';
  };

  if (variant === 'button') {
    return (
      <button
        ref={interfaceRef}
        onClick={onToggle}
        className={cn(
          'relative rounded-xl border-2 transition-all duration-300 natural-interactive',
          getSizeClasses(),
          isActive ? 'border-blue-400/50 bg-blue-900/20' : 'border-gray-600/30 bg-gray-800/20',
          'hover:scale-105 active:scale-95',
          getConfidenceAnimation(),
          className
        )}
        style={{
          boxShadow: isActive 
            ? `0 0 ${20 * pulseIntensity}px ${getStatusColor()}`
            : 'none',
        }}
      >
        {/* AI 大脑图标 */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Brain 
            className={cn(
              'transition-all duration-300',
              isActive ? 'text-blue-300' : 'text-gray-400',
              isThinking && 'animate-spin'
            )}
            style={{
              filter: isActive ? `drop-shadow(0 0 8px ${getStatusColor()})` : 'none',
            }}
          />
          
          {/* 神经网络活动指示 */}
          {neuralActivity && (
            <div className="absolute inset-0 ai-thinking">
              <div className="absolute top-1 right-1 w-1 h-1 bg-yellow-400 rounded-full animate-ping" />
              <div className="absolute bottom-1 left-1 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="absolute top-1 left-1 w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
            </div>
          )}
        </div>
        
        {/* 状态指示环 */}
        <div
          className="absolute inset-0 rounded-xl border-2 opacity-50 transition-all duration-300"
          style={{
            borderColor: getStatusColor(),
            animation: isActive ? 'breathe 3s ease-in-out infinite' : 'none',
          }}
        />
        
        {/* 信心水平指示器 */}
        {isActive && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="w-6 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${confidence * 100}%`,
                  backgroundColor: getStatusColor(),
                }}
              />
            </div>
          </div>
        )}
      </button>
    );
  }

  if (variant === 'panel') {
    return (
      <div
        ref={interfaceRef}
        className={cn(
          'p-4 rounded-2xl border-2 transition-all duration-300',
          'bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-lg',
          isActive ? 'border-blue-400/50' : 'border-gray-600/30',
          'breathing-card natural-interactive',
          className
        )}
        style={{
          boxShadow: isActive 
            ? `0 8px 32px rgba(0, 212, 255, ${pulseIntensity * 0.3})` 
            : '0 4px 16px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* AI 状态头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300"
              style={{
                borderColor: getStatusColor(),
                backgroundColor: `${getStatusColor()}15`,
              }}
            >
              <Brain 
                className="w-5 h-5 transition-all duration-300"
                style={{ color: getStatusColor() }}
              />
            </div>
            <div>
              <h3 className="text-white font-semibold">AI Assistant</h3>
              <p className="text-xs text-gray-400">
                {isThinking ? 'Analyzing...' : 
                 isActive ? `Confidence: ${(confidence * 100).toFixed(0)}%` : 
                 'Standby'}
              </p>
            </div>
          </div>
          
          {/* 活动指示器 */}
          <div className="flex space-x-1">
            {[0.3, 0.6, 0.9].map((delay, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-6 rounded-full transition-all duration-300',
                  isActive ? 'bg-blue-400' : 'bg-gray-600'
                )}
                style={{
                  animation: isActive 
                    ? `pulse 2s ease-in-out infinite ${delay}s` 
                    : 'none',
                  opacity: isActive ? pulseIntensity : 0.3,
                }}
              />
            ))}
          </div>
        </div>
        
        {/* AI 思考可视化 */}
        {isThinking && (
          <div className="ai-natural-response mb-4">
            <div className="flex items-center space-x-2 text-yellow-400">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing market data...</span>
            </div>
            <div className="mt-2 flex space-x-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 bg-yellow-400 rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.random() * 20 + 10}px`,
                    animation: `pulse 1s ease-in-out infinite ${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* 响应时间和性能指标 */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="text-center p-2 bg-gray-800/50 rounded-lg">
            <div className="text-gray-400">Response Time</div>
            <div className="text-white font-mono">{responseTime.toFixed(1)}s</div>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded-lg">
            <div className="text-gray-400">Accuracy</div>
            <div 
              className="font-mono font-semibold"
              style={{ color: getStatusColor() }}
            >
              {(confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat variant
  return (
    <div
      ref={interfaceRef}
      className={cn(
        'flex items-center space-x-2 p-2 rounded-lg transition-all duration-300',
        'natural-interactive warm-glow',
        className
      )}
    >
      <MessageCircle 
        className={cn(
          'w-5 h-5 transition-all duration-300',
          isActive ? 'text-blue-400' : 'text-gray-400'
        )}
      />
      <span className={cn(
        'text-sm font-medium transition-all duration-300',
        isActive ? 'text-white' : 'text-gray-400'
      )}>
        AI Chat
      </span>
      {isActive && (
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: getStatusColor() }}
        />
      )}
    </div>
  );
};

export default NaturalAIInterface;