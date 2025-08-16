import React from 'react';
import { cn } from './utils';

/**
 * RiverBit Professional Brand System
 * Unified design language for world-class DEX experience
 * Consistent with top-tier financial platforms
 */

interface RiverBrandProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'river' | 'premium';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * RiverBit Logo Component with Brand Consistency
 */
export const RiverBitLogo: React.FC<{
  variant?: 'full' | 'icon' | 'text';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}> = ({ 
  variant = 'full', 
  size = 'md', 
  animated = false, 
  className 
}) => {
  const sizes = {
    xs: 'h-6 w-auto',
    sm: 'h-8 w-auto',
    md: 'h-10 w-auto',
    lg: 'h-12 w-auto',
    xl: 'h-16 w-auto'
  };

  const brandClasses = cn(
    'transition-all duration-300 ease-out',
    'filter drop-shadow-sm',
    animated && 'hover:drop-shadow-md hover:brightness-110 hover:scale-105',
    'transform-gpu',
    sizes[size],
    className
  );

  if (variant === 'icon') {
    return (
      <div className={brandClasses}>
        <div className={cn(
          'rounded-lg bg-gradient-to-br from-river-blue-main via-river-blue-light to-river-accent',
          'flex items-center justify-center text-white font-black',
          'shadow-lg border border-river-blue/30',
          size === 'xs' && 'w-6 h-6 text-xs',
          size === 'sm' && 'w-8 h-8 text-sm',
          size === 'md' && 'w-10 h-10 text-base',
          size === 'lg' && 'w-12 h-12 text-lg',
          size === 'xl' && 'w-16 h-16 text-xl'
        )}>
          R
        </div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn(brandClasses, 'flex items-center')}>
        <span className={cn(
          'font-black bg-gradient-to-r from-river-blue-main via-river-blue-light to-river-accent',
          'bg-clip-text text-transparent',
          size === 'xs' && 'text-base',
          size === 'sm' && 'text-lg',
          size === 'md' && 'text-xl',
          size === 'lg' && 'text-2xl',
          size === 'xl' && 'text-4xl'
        )}>
          RiverBit
        </span>
      </div>
    );
  }

  // Full logo
  return (
    <div className={cn(brandClasses, 'flex items-center gap-2')}>
      <div className={cn(
        'rounded-lg bg-gradient-to-br from-river-blue-main via-river-blue-light to-river-accent',
        'flex items-center justify-center text-white font-black',
        'shadow-lg border border-river-blue/30',
        size === 'xs' && 'w-6 h-6 text-xs',
        size === 'sm' && 'w-8 h-8 text-sm',
        size === 'md' && 'w-10 h-10 text-base',
        size === 'lg' && 'w-12 h-12 text-lg',
        size === 'xl' && 'w-16 h-16 text-xl'
      )}>
        R
      </div>
      <span className={cn(
        'font-black bg-gradient-to-r from-river-blue-main via-river-blue-light to-river-accent',
        'bg-clip-text text-transparent',
        size === 'xs' && 'text-sm',
        size === 'sm' && 'text-base',
        size === 'md' && 'text-lg',
        size === 'lg' && 'text-xl',
        size === 'xl' && 'text-3xl'
      )}>
        RiverBit
      </span>
    </div>
  );
};

/**
 * Branded Gradient Background
 */
export const RiverBrandGradient: React.FC<RiverBrandProps> = ({
  variant = 'primary',
  animated = false,
  className,
  children
}) => {
  const gradients = {
    primary: 'bg-gradient-to-br from-river-blue-dark via-river-blue-main to-river-blue-light',
    secondary: 'bg-gradient-to-br from-surface-2 via-surface-3 to-surface-2',
    accent: 'bg-gradient-to-br from-river-accent via-river-blue-light to-river-blue-main',
    river: 'bg-gradient-to-br from-river-blue-main via-river-accent to-river-blue-light',
    premium: 'bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500'
  };

  return (
    <div className={cn(
      gradients[variant],
      animated && 'animate-gradient bg-[length:400%_400%]',
      'relative overflow-hidden',
      className
    )}>
      {animated && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-river-flow" />
      )}
      {children}
    </div>
  );
};

/**
 * Branded Text Components
 */
export const RiverBrandText: React.FC<{
  variant?: 'heading' | 'subtitle' | 'body' | 'caption' | 'number';
  gradient?: boolean;
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  className?: string;
  children: React.ReactNode;
}> = ({ 
  variant = 'body', 
  gradient = false, 
  weight = 'normal',
  className, 
  children 
}) => {
  const variants = {
    heading: 'text-2xl lg:text-4xl leading-tight',
    subtitle: 'text-lg lg:text-xl leading-relaxed',
    body: 'text-base leading-relaxed',
    caption: 'text-sm leading-normal',
    number: 'text-base font-mono tabular-nums leading-tight'
  };

  const weights = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    black: 'font-black'
  };

  const gradientClass = gradient 
    ? 'bg-gradient-to-r from-river-blue-main via-river-blue-light to-river-accent bg-clip-text text-transparent'
    : '';

  return (
    <span className={cn(
      variants[variant],
      weights[weight],
      gradientClass,
      className
    )}>
      {children}
    </span>
  );
};

/**
 * Branded Button with RiverBit Identity
 */
export const RiverBrandButton: React.FC<{
  variant?: 'primary' | 'secondary' | 'river' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  variant = 'primary',
  size = 'md',
  glow = false,
  loading = false,
  children,
  className,
  ...props
}) => {
  const variants = {
    primary: cn(
      'bg-gradient-to-r from-river-blue-main via-river-blue-light to-river-accent text-white',
      'border border-river-blue/30 shadow-[0_8px_25px_rgba(6,182,212,0.25)]',
      'hover:shadow-[0_16px_48px_rgba(6,182,212,0.35)]',
      'hover:border-river-blue/50 hover:brightness-110'
    ),
    secondary: cn(
      'bg-gradient-to-r from-surface-2 to-surface-3 text-foreground',
      'border border-border shadow-[0_4px_16px_rgba(0,0,0,0.1)]',
      'hover:shadow-[0_8px_24px_rgba(59,130,246,0.15)]',
      'hover:border-border-accent'
    ),
    river: cn(
      'bg-gradient-to-r from-river-accent via-river-blue-light to-river-blue-main text-white',
      'border border-river-accent/30 shadow-[0_8px_25px_rgba(34,211,238,0.3)]',
      'hover:shadow-[0_16px_48px_rgba(34,211,238,0.4)]',
      'hover:brightness-110'
    ),
    success: cn(
      'bg-gradient-to-r from-success-600 to-success-500 text-white',
      'border border-success-500/30 shadow-[0_8px_25px_rgba(16,185,129,0.3)]',
      'hover:shadow-[0_16px_48px_rgba(16,185,129,0.4)]'
    ),
    danger: cn(
      'bg-gradient-to-r from-danger-600 to-danger-500 text-white',
      'border border-danger-500/30 shadow-[0_8px_25px_rgba(239,68,68,0.3)]',
      'hover:shadow-[0_16px_48px_rgba(239,68,68,0.4)]'
    ),
    ghost: cn(
      'bg-transparent text-secondary border border-transparent',
      'hover:bg-surface-2/60 hover:text-foreground hover:border-border/30'
    )
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs rounded-lg',
    md: 'h-10 px-4 text-sm rounded-xl',
    lg: 'h-12 px-6 text-base rounded-xl',
    xl: 'h-14 px-8 text-lg rounded-2xl'
  };

  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center gap-2',
        'font-semibold whitespace-nowrap',
        'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-river-blue/50',
        'disabled:opacity-50 disabled:pointer-events-none',
        'transform-gpu overflow-hidden',
        'hover:scale-[1.02] hover:-translate-y-0.5',
        'active:scale-[0.98] active:translate-y-0',
        glow && 'animate-pulse-glow-enhanced',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      )}
      
      <span className="relative z-10">
        {children}
      </span>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] transition-transform duration-700 hover:translate-x-[200%]" />
    </button>
  );
};

/**
 * Branded Card with RiverBit Design Language
 */
export const RiverBrandCard: React.FC<{
  variant?: 'default' | 'trading' | 'premium' | 'glass' | 'elevated';
  glow?: boolean;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({
  variant = 'default',
  glow = false,
  interactive = false,
  className,
  children
}) => {
  const variants = {
    default: cn(
      'bg-surface-1 border border-border',
      'shadow-[0_4px_16px_rgba(0,0,0,0.1)]',
      'rounded-xl'
    ),
    trading: cn(
      'bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1',
      'border border-river-blue/20',
      'shadow-[0_8px_24px_rgba(6,182,212,0.1)]',
      'rounded-xl'
    ),
    premium: cn(
      'bg-gradient-to-br from-surface-2/90 via-surface-3/80 to-surface-2/90',
      'backdrop-blur-xl border border-river-blue/30',
      'shadow-[0_12px_32px_rgba(6,182,212,0.15)]',
      'rounded-2xl'
    ),
    glass: cn(
      'bg-surface-1/60 backdrop-blur-2xl',
      'border border-white/10',
      'shadow-[0_16px_48px_rgba(0,0,0,0.3)]',
      'rounded-2xl'
    ),
    elevated: cn(
      'bg-surface-1',
      'shadow-[0_20px_40px_rgba(0,0,0,0.15),0_8px_16px_rgba(6,182,212,0.1)]',
      'border border-river-blue/20',
      'rounded-2xl'
    )
  };

  return (
    <div className={cn(
      variants[variant],
      interactive && 'transition-all duration-300 hover:scale-[1.02] hover:-translate-y-2',
      interactive && 'hover:shadow-[0_24px_48px_rgba(6,182,212,0.2)]',
      glow && 'animate-pulse-glow-enhanced',
      'transform-gpu',
      className
    )}>
      {children}
    </div>
  );
};

/**
 * Professional Status Indicators with Brand Colors
 */
export const RiverStatusIndicator: React.FC<{
  status: 'online' | 'offline' | 'warning' | 'error' | 'loading';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  animated?: boolean;
  className?: string;
}> = ({ 
  status, 
  size = 'md', 
  label, 
  animated = true,
  className 
}) => {
  const statusConfig = {
    online: {
      color: 'bg-success-500',
      glow: 'shadow-[0_0_8px_rgba(16,185,129,0.6)]',
      animation: animated ? 'animate-pulse-glow-success-enhanced' : ''
    },
    offline: {
      color: 'bg-muted',
      glow: 'shadow-[0_0_4px_rgba(100,116,139,0.4)]',
      animation: ''
    },
    warning: {
      color: 'bg-warning-500',
      glow: 'shadow-[0_0_8px_rgba(245,158,11,0.6)]',
      animation: animated ? 'animate-pulse-subtle-enhanced' : ''
    },
    error: {
      color: 'bg-danger-500',
      glow: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]',
      animation: animated ? 'animate-pulse-glow-danger-enhanced' : ''
    },
    loading: {
      color: 'bg-river-blue-main',
      glow: 'shadow-[0_0_8px_rgba(6,182,212,0.6)]',
      animation: 'animate-pulse'
    }
  };

  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const config = statusConfig[status];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div className={cn(
        'rounded-full',
        sizes[size],
        config.color,
        config.glow,
        config.animation
      )} />
      {label && (
        <RiverBrandText variant="caption" className="text-muted-foreground">
          {label}
        </RiverBrandText>
      )}
    </div>
  );
};

/**
 * Professional Price Display with Brand Styling
 */
export const RiverPriceDisplay: React.FC<{
  value: number;
  symbol?: string;
  change?: number;
  changePercent?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}> = ({
  value,
  symbol = '$',
  change,
  changePercent,
  size = 'md',
  animated = true,
  className
}) => {
  const [displayChange, setDisplayChange] = React.useState<'up' | 'down' | null>(null);

  React.useEffect(() => {
    if (change !== undefined && change !== 0) {
      setDisplayChange(change > 0 ? 'up' : 'down');
      if (animated) {
        const timer = setTimeout(() => setDisplayChange(null), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [change, animated]);

  const sizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  const changeColor = change && change > 0 ? 'text-success-500' : 'text-danger-500';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <RiverBrandText
        variant="number"
        weight="black"
        className={cn(
          sizes[size],
          displayChange === 'up' && animated && 'animate-price-up-enhanced',
          displayChange === 'down' && animated && 'animate-price-down-enhanced'
        )}
      >
        {symbol}{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </RiverBrandText>
      
      {change !== undefined && changePercent !== undefined && (
        <div className={cn(
          'flex items-center gap-1 text-sm font-bold',
          changeColor
        )}>
          <span>{change > 0 ? '▲' : '▼'}</span>
          <span>
            {change > 0 ? '+' : ''}${Math.abs(change).toFixed(2)} ({change > 0 ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Brand Consistency Hook
 */
export const useRiverBrand = () => {
  const brandColors = {
    primary: 'var(--river-blue-main)',
    secondary: 'var(--river-blue-light)',
    accent: 'var(--river-accent)',
    success: 'var(--success-500)',
    danger: 'var(--danger-500)',
    warning: 'var(--warning-500)',
    muted: 'var(--muted-foreground)'
  };

  const brandGradients = {
    primary: 'linear-gradient(135deg, var(--river-blue-main) 0%, var(--river-blue-light) 50%, var(--river-accent) 100%)',
    river: 'linear-gradient(135deg, var(--river-accent) 0%, var(--river-blue-light) 100%)',
    success: 'linear-gradient(135deg, var(--success-600) 0%, var(--success-500) 100%)',
    danger: 'linear-gradient(135deg, var(--danger-600) 0%, var(--danger-500) 100%)'
  };

  const brandShadows = {
    subtle: '0 4px 16px rgba(6, 182, 212, 0.1)',
    medium: '0 8px 24px rgba(6, 182, 212, 0.15)',
    strong: '0 16px 48px rgba(6, 182, 212, 0.25)',
    glow: '0 0 32px rgba(6, 182, 212, 0.3)'
  };

  return {
    colors: brandColors,
    gradients: brandGradients,
    shadows: brandShadows
  };
};


