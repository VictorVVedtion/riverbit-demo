import React, { useState, useEffect, useRef } from 'react';
import { cn } from './utils';

interface NaturalPriceDisplayProps {
  price: number;
  change?: number;
  changePercent?: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRipple?: boolean;
  className?: string;
}

const NaturalPriceDisplay: React.FC<NaturalPriceDisplayProps> = ({
  price,
  change = 0,
  changePercent = 0,
  currency = 'USD',
  size = 'md',
  showRipple = true,
  className,
}) => {
  const [lastPrice, setLastPrice] = useState(price);
  const [isAnimating, setIsAnimating] = useState(false);
  const [rippleClass, setRippleClass] = useState('');
  const priceRef = useRef<HTMLDivElement>(null);

  // 价格变动自然反馈
  useEffect(() => {
    if (price !== lastPrice) {
      setIsAnimating(true);
      
      // 确定变动方向并应用相应的水波纹效果
      if (price > lastPrice) {
        setRippleClass('price-natural-up');
      } else if (price < lastPrice) {
        setRippleClass('price-natural-down');
      }
      
      // 重置动画状态
      setTimeout(() => {
        setIsAnimating(false);
        setRippleClass('');
      }, 650); // 匹配呼吸节奏时间
      
      setLastPrice(price);
    }
  }, [price, lastPrice]);

  // 根据尺寸获取样式
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-lg font-semibold';
      case 'md':
        return 'text-2xl font-bold';
      case 'lg':
        return 'text-3xl font-bold';
      case 'xl':
        return 'text-4xl font-black';
      default:
        return 'text-2xl font-bold';
    }
  };

  // 获取变动指示样式
  const getChangeClasses = () => {
    if (change > 0) return 'text-green-400 neon-green';
    if (change < 0) return 'text-red-400 neon-red';
    return 'text-gray-400';
  };

  // 格式化价格显示
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // 格式化变动百分比
  const formatChangePercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div 
      className={cn('relative inline-block', className)}
      ref={priceRef}
    >
      {/* 主价格显示 */}
      <div
        className={cn(
          'font-mono tracking-wider transition-all duration-300',
          getSizeClasses(),
          isAnimating && 'data-flow-update highlight',
          showRipple && rippleClass,
          'text-white drop-shadow-lg'
        )}
      >
        {formatPrice(price)}
      </div>
      
      {/* 变动信息 */}
      {(change !== 0 || changePercent !== 0) && (
        <div className={cn(
          'flex items-center space-x-2 mt-1',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base',
          size === 'xl' && 'text-lg'
        )}>
          {change !== 0 && (
            <span className={cn(
              'font-mono font-semibold transition-all duration-300',
              getChangeClasses(),
              isAnimating && 'data-flow-update'
            )}>
              {change >= 0 ? '+' : ''}{formatPrice(change)}
            </span>
          )}
          
          {changePercent !== 0 && (
            <span className={cn(
              'font-semibold transition-all duration-300',
              getChangeClasses(),
              isAnimating && 'data-flow-update'
            )}>
              ({formatChangePercent(changePercent)})
            </span>
          )}
        </div>
      )}
      
      {/* 实时数据指示器 */}
      <div className="absolute -top-1 -right-1">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
      </div>
      
      {/* 注意力引导光流 */}
      {isAnimating && (
        <div className="attention-flow absolute inset-0 pointer-events-none" />
      )}
    </div>
  );
};

export default NaturalPriceDisplay;