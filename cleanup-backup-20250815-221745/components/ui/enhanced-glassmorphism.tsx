import React, { ReactNode, HTMLAttributes } from 'react';
import { cn } from './utils';

interface EnhancedGlassmorphismProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'trading' | 'account' | 'positions' | 'market-data' | 'ai' | 'performance';
  intensity?: 'subtle' | 'medium' | 'intense' | 'ultra';
  interactive?: boolean;
  withGlow?: boolean;
  withRipple?: boolean;
  withParticles?: boolean;
  size?: 'small' | 'medium' | 'large' | 'full';
}

const EnhancedGlassmorphism: React.FC<EnhancedGlassmorphismProps> = ({
  children,
  variant = 'trading',
  intensity = 'medium',
  interactive = true,
  withGlow = false,
  withRipple = false,
  withParticles = false,
  size = 'medium',
  className,
  ...props
}) => {
  // Base glassmorphism styles
  const baseClasses = 'relative overflow-hidden backdrop-blur-xl gpu-accelerated';

  // Variant-specific background and border styles
  const variantClasses = {
    trading: 'bg-gradient-to-br from-river-blue-500/15 to-digital-green-500/10 border border-river-blue-400/20',
    account: 'bg-gradient-to-br from-surface-2/40 to-surface-3/20 border border-default/15',
    positions: 'bg-gradient-to-bl from-digital-green-500/12 to-precision-orange-500/8 border border-digital-green-400/15',
    'market-data': 'bg-gradient-to-r from-river-blue-500/10 to-precision-orange-500/10 border border-river-blue-400/20',
    ai: 'bg-gradient-to-br from-river-blue-500/20 to-digital-green-500/15 border border-river-blue-400/30',
    performance: 'bg-gradient-to-tr from-digital-green-500/15 to-river-blue-500/10 border border-digital-green-400/20'
  };

  // Intensity levels for blur and opacity
  const intensityClasses = {
    subtle: 'backdrop-blur-sm',
    medium: 'backdrop-blur-md',
    intense: 'backdrop-blur-lg',
    ultra: 'backdrop-blur-xl'
  };

  // Size variants
  const sizeClasses = {
    small: 'min-h-[100px]',
    medium: 'min-h-[200px]',
    large: 'min-h-[300px]',
    full: 'min-h-full'
  };

  // Interactive enhancements
  const interactiveClasses = interactive 
    ? 'transition-all duration-300 hover:scale-[1.01] hover:shadow-glow-river card-hover-lift-enhanced' 
    : '';

  // Glow effects
  const glowClasses = withGlow 
    ? variant === 'trading' 
      ? 'shadow-glow-river animate-pulse-glow-enhanced'
      : variant === 'positions'
      ? 'shadow-glow-profit'
      : 'shadow-professional'
    : '';

  const combinedClassName = cn(
    baseClasses,
    variantClasses[variant],
    intensityClasses[intensity],
    sizeClasses[size],
    interactiveClasses,
    glowClasses,
    className
  );

  return (
    <div className={combinedClassName} {...props}>
      {/* Enhanced Background Effects */}
      {variant === 'trading' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-river-blue-500/8 via-transparent to-digital-green-500/8 animate-river-flow opacity-60"></div>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-river-blue-400/50 to-transparent"></div>
        </>
      )}

      {variant === 'ai' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-river-blue-500/12 via-transparent to-digital-green-500/12 animate-pulse-subtle-enhanced"></div>
          <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-river-blue-500/5 to-transparent animate-liquid-flow"></div>
        </>
      )}

      {variant === 'positions' && (
        <>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digital-green-500 via-river-blue-500 to-precision-orange-500 animate-liquid-flow"></div>
          <div className="absolute inset-0 bg-gradient-to-bl from-digital-green-500/8 via-transparent to-precision-orange-500/5 opacity-70"></div>
        </>
      )}

      {/* Ripple Effect */}
      {withRipple && (
        <div className="absolute inset-0 overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
        </div>
      )}

      {/* Floating Particles Effect */}
      {withParticles && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-river-blue-400/30 rounded-full animate-pulse"></div>
          <div className="absolute top-3/4 right-1/3 w-0.5 h-0.5 bg-digital-green-400/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/3 left-2/3 w-0.5 h-0.5 bg-precision-orange-400/30 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>

      {/* Interactive Glow Overlay */}
      {interactive && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      )}
    </div>
  );
};

export default EnhancedGlassmorphism;