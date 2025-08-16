import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';
import { Loader } from 'lucide-react';

interface ProfessionalTradingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'long' | 'short' | 'neutral' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large' | 'xl';
  isLoading?: boolean;
  withGlow?: boolean;
  withRipple?: boolean;
  withPulse?: boolean;
  intensity?: 'subtle' | 'medium' | 'intense';
}

const ProfessionalTradingButton: React.FC<ProfessionalTradingButtonProps> = ({
  children,
  variant = 'neutral',
  size = 'medium',
  isLoading = false,
  withGlow = true,
  withRipple = true,
  withPulse = false,
  intensity = 'medium',
  className,
  disabled,
  ...props
}) => {
  // Base button styles
  const baseClasses = 'group relative font-bold rounded-xl transition-all duration-300 overflow-hidden btn-hover-lift-enhanced gpu-accelerated focus:outline-none focus:ring-2 focus:ring-offset-2';

  // Size variants
  const sizeClasses = {
    small: 'h-10 px-4 text-sm',
    medium: 'h-12 px-6 text-base',
    large: 'h-14 px-8 text-lg',
    xl: 'h-16 px-10 text-xl'
  };

  // Variant-specific styles
  const variantClasses = {
    long: {
      subtle: 'bg-gradient-to-r from-digital-green-500/80 to-digital-green-600/80 hover:from-digital-green-400/90 hover:to-digital-green-500/90 text-white border border-digital-green-400/50 shadow-glow-profit focus:ring-digital-green-500/50',
      medium: 'bg-gradient-to-r from-digital-green-500 to-digital-green-600 hover:from-digital-green-400 hover:to-digital-green-500 text-white border border-digital-green-400/50 shadow-glow-profit focus:ring-digital-green-500/50',
      intense: 'bg-gradient-to-r from-digital-green-400 to-digital-green-500 hover:from-digital-green-300 hover:to-digital-green-400 text-white border border-digital-green-300/70 shadow-glow-profit animate-pulse-glow-success-enhanced focus:ring-digital-green-400/70'
    },
    short: {
      subtle: 'bg-gradient-to-r from-precision-orange-500/80 to-precision-orange-600/80 hover:from-precision-orange-400/90 hover:to-precision-orange-500/90 text-white border border-precision-orange-400/50 shadow-glow-loss focus:ring-precision-orange-500/50',
      medium: 'bg-gradient-to-r from-precision-orange-500 to-precision-orange-600 hover:from-precision-orange-400 hover:to-precision-orange-500 text-white border border-precision-orange-400/50 shadow-glow-loss focus:ring-precision-orange-500/50',
      intense: 'bg-gradient-to-r from-precision-orange-400 to-precision-orange-500 hover:from-precision-orange-300 hover:to-precision-orange-400 text-white border border-precision-orange-300/70 shadow-glow-loss animate-pulse-glow-danger-enhanced focus:ring-precision-orange-400/70'
    },
    neutral: {
      subtle: 'bg-gradient-to-r from-river-blue-500/80 to-river-blue-600/80 hover:from-river-blue-400/90 hover:to-river-blue-500/90 text-white border border-river-blue-400/50 shadow-glow-river focus:ring-river-blue-500/50',
      medium: 'bg-gradient-to-r from-river-blue-500 to-river-blue-600 hover:from-river-blue-400 hover:to-river-blue-500 text-white border border-river-blue-400/50 shadow-glow-river focus:ring-river-blue-500/50',
      intense: 'bg-gradient-to-r from-river-blue-400 to-river-blue-500 hover:from-river-blue-300 hover:to-river-blue-400 text-white border border-river-blue-300/70 shadow-glow-river animate-pulse-glow-enhanced focus:ring-river-blue-400/70'
    },
    danger: {
      subtle: 'bg-gradient-to-r from-critical-red-500/80 to-critical-red-600/80 hover:from-critical-red-400/90 hover:to-critical-red-500/90 text-white border border-critical-red-400/50 focus:ring-critical-red-500/50',
      medium: 'bg-gradient-to-r from-critical-red-500 to-critical-red-600 hover:from-critical-red-400 hover:to-critical-red-500 text-white border border-critical-red-400/50 focus:ring-critical-red-500/50',
      intense: 'bg-gradient-to-r from-critical-red-400 to-critical-red-500 hover:from-critical-red-300 hover:to-critical-red-400 text-white border border-critical-red-300/70 animate-pulse-glow-danger-enhanced focus:ring-critical-red-400/70'
    },
    success: {
      subtle: 'bg-gradient-to-r from-digital-green-500/80 to-digital-green-600/80 hover:from-digital-green-400/90 hover:to-digital-green-500/90 text-white border border-digital-green-400/50 focus:ring-digital-green-500/50',
      medium: 'bg-gradient-to-r from-digital-green-500 to-digital-green-600 hover:from-digital-green-400 hover:to-digital-green-500 text-white border border-digital-green-400/50 focus:ring-digital-green-500/50',
      intense: 'bg-gradient-to-r from-digital-green-400 to-digital-green-500 hover:from-digital-green-300 hover:to-digital-green-400 text-white border border-digital-green-300/70 animate-pulse-glow-success-enhanced focus:ring-digital-green-400/70'
    }
  };

  // Disabled styles
  const disabledClasses = 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none';

  // Pulse animation
  const pulseClasses = withPulse ? 'animate-pulse-subtle-enhanced' : '';

  const combinedClassName = cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant][intensity],
    disabled || isLoading ? disabledClasses : '',
    pulseClasses,
    className
  );

  return (
    <button
      className={combinedClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Professional Glassmorphism Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Hyperliquid/OKX-Style Ripple Effect */}
      {withRipple && !disabled && !isLoading && (
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
        </div>
      )}

      {/* Performance Optimization: GPU-accelerated content */}
      <div className="relative z-10 flex items-center justify-center gpu-accelerated">
        {isLoading ? (
          <Loader className="h-5 w-5 animate-spin mr-2" />
        ) : null}
        <span className="font-extrabold tracking-wide group-hover:scale-105 transition-transform duration-200">
          {children}
        </span>
      </div>

      {/* Success Animation Burst */}
      {variant === 'success' && withGlow && (
        <div className="absolute inset-0 bg-gradient-to-br from-digital-green-300/20 to-transparent opacity-0 group-active:opacity-100 transition-opacity duration-150 animate-celebration-enhanced pointer-events-none"></div>
      )}
    </button>
  );
};

export default ProfessionalTradingButton;