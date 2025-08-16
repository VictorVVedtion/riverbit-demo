import React, { ReactNode, HTMLAttributes } from 'react';
import { cn } from './utils';

interface LiquidGlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'nano' | 'subtle' | 'medium' | 'intense' | 'ultra' | 'trading' | 'orderbook' | 'chart' | 'ai';
  interactive?: boolean;
  withRipple?: boolean;
  withGlow?: 'none' | 'river' | 'profit' | 'loss';
  bentoSize?: 'nano' | 'small' | 'medium' | 'large' | 'xlarge' | 'wide' | 'full' | 'hero' | 'compact' | 'sidebar' | 'chart' | 'trading' | 'data';
  glassLevel?: 'nano' | 'subtle' | 'medium' | 'intense' | 'ultra';
  riverTheme?: boolean;
}

const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  variant = 'medium',
  interactive = true,
  withRipple = false,
  withGlow = 'none',
  bentoSize,
  glassLevel,
  riverTheme = true,
  className,
  ...props
}) => {
  // 使用新的河流主题基础类
  const baseClasses = riverTheme ? 'river-glass-base' : 'liquid-glass';
  
  // 河流主题变体类
  const variantClasses = {
    nano: 'river-glass-nano',
    subtle: 'river-glass-subtle', 
    medium: 'river-glass-medium',
    intense: 'river-glass-intense',
    ultra: 'river-glass-ultra',
    trading: 'river-glass-trading',
    orderbook: 'river-glass-orderbook',
    chart: 'river-glass-chart',
    ai: 'river-glass-ai'
  };

  // Bento Grid尺寸类
  const bentoClasses = bentoSize ? {
    nano: 'bento-nano',
    small: 'bento-small',
    medium: 'bento-medium',
    large: 'bento-large',
    xlarge: 'bento-xlarge',
    wide: 'bento-wide',
    full: 'bento-full',
    hero: 'bento-hero',
    compact: 'bento-compact',
    sidebar: 'bento-sidebar',
    chart: 'bento-chart',
    trading: 'bento-trading',
    data: 'bento-data'
  }[bentoSize] : '';

  // 交互和特效类
  const interactiveClasses = interactive ? 'river-glass-interactive' : '';
  const rippleClasses = withRipple ? 'river-ripple' : '';
  
  const glowClasses = withGlow !== 'none' ? {
    river: 'river-glow',
    profit: 'river-glow-profit', 
    loss: 'river-glow-loss'
  }[withGlow] : '';

  // 如果指定了glassLevel，覆盖variant的玻璃效果
  const finalVariant = glassLevel || variant;

  const combinedClassName = cn(
    baseClasses,
    variantClasses[finalVariant],
    bentoClasses,
    interactiveClasses,
    rippleClasses,
    glowClasses,
    className
  );

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
};

export default LiquidGlassCard;