import React from 'react';
import { cn } from './utils';

/**
 * SOTA Professional Micro-Interaction System
 * Designed for world-class trading interfaces
 * Matching standards of Hyperliquid, GMX, dYdX
 */

interface MicroInteractionProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'subtle' | 'hover' | 'press' | 'trading' | 'premium';
  intensity?: 'low' | 'medium' | 'high';
  disabled?: boolean;
  children: React.ReactNode;
}

export const MicroInteraction = React.forwardRef<HTMLDivElement, MicroInteractionProps>(
  ({ className, variant = 'hover', intensity = 'medium', disabled = false, children, ...props }, ref) => {
    const variants = {
      subtle: {
        base: 'transition-all duration-200 ease-out',
        states: {
          hover: 'hover:transform hover:scale-[1.01] hover:brightness-105',
          press: 'active:scale-[0.99] active:brightness-95'
        }
      },
      hover: {
        base: 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        states: {
          hover: 'hover:transform hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg hover:brightness-110',
          press: 'active:scale-[0.98] active:translate-y-0 active:brightness-95'
        }
      },
      press: {
        base: 'transition-all duration-150 ease-out transform-gpu',
        states: {
          hover: 'hover:brightness-105',
          press: 'active:scale-[0.95] active:brightness-90'
        }
      },
      trading: {
        base: 'transition-all duration-250 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform-gpu relative overflow-hidden',
        states: {
          hover: 'hover:transform hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(59,130,246,0.25)] hover:brightness-110 hover:saturate-110',
          press: 'active:scale-[0.98] active:translate-y-0 active:brightness-95',
          before: 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] before:transition-transform before:duration-700 hover:before:translate-x-[200%]'
        }
      },
      premium: {
        base: 'transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform-gpu relative overflow-hidden',
        states: {
          hover: 'hover:transform hover:scale-[1.03] hover:-translate-y-2 hover:shadow-[0_16px_48px_rgba(59,130,246,0.3),0_8px_24px_rgba(6,182,212,0.2)] hover:brightness-115 hover:saturate-120',
          press: 'active:scale-[0.97] active:translate-y-0 active:brightness-90',
          before: 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent before:translate-x-[-200%] before:transition-transform before:duration-800 hover:before:translate-x-[200%]',
          after: 'after:absolute after:inset-0 after:bg-gradient-to-r after:from-river-blue/10 after:via-river-accent/5 after:to-river-blue/10 after:opacity-0 after:transition-opacity after:duration-300 hover:after:opacity-100'
        }
      }
    };

    const intensityMultipliers = {
      low: { scale: 0.5, duration: 0.7 },
      medium: { scale: 1, duration: 1 },
      high: { scale: 1.5, duration: 1.3 }
    };

    const variantConfig = variants[variant];
    const multiplier = intensityMultipliers[intensity];

    return (
      <div
        ref={ref}
        className={cn(
          variantConfig.base,
          !disabled && variantConfig.states.hover,
          !disabled && variantConfig.states.press,
          !disabled && variantConfig.states.before,
          !disabled && variantConfig.states.after,
          disabled && 'opacity-50 cursor-not-allowed',
          'will-change-transform',
          className
        )}
        style={{
          transitionDuration: `${250 * multiplier.duration}ms`,
          '--scale-hover': `${1 + (0.02 * multiplier.scale)}`,
          '--scale-active': `${1 - (0.02 * multiplier.scale)}`,
        } as React.CSSProperties}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MicroInteraction.displayName = 'MicroInteraction';

/**
 * Enhanced Button with Professional Micro-Interactions
 */
interface InteractiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'trading-buy' | 'trading-sell' | 'ghost' | 'premium';
  size?: 'sm' | 'default' | 'lg' | 'trading';
  loading?: boolean;
  ripple?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

export const InteractiveButton = React.forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'default', 
    loading = false, 
    ripple = true, 
    glow = false,
    disabled,
    children, 
    onClick,
    ...props 
  }, ref) => {
    const [ripples, setRipples] = React.useState<Array<{id: number, x: number, y: number}>>([]);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    React.useImperativeHandle(ref, () => buttonRef.current!);

    const createRipple = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (!ripple || disabled || loading) return;

      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newRipple = {
        id: Date.now() + Math.random(),
        x,
        y
      };

      setRipples(prev => [...prev, newRipple]);

      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 800);
    }, [ripple, disabled, loading]);

    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      
      createRipple(event);
      onClick?.(event);
    }, [disabled, loading, createRipple, onClick]);

    const variants = {
      primary: cn(
        'bg-gradient-to-r from-river-blue via-river-blue-main to-river-blue/90 text-white',
        'border border-river-blue/30',
        'shadow-[0_8px_25px_rgba(6,182,212,0.25)]',
        'hover:from-river-blue-light hover:via-river-blue hover:to-river-blue-dark',
        'hover:shadow-[0_16px_48px_rgba(6,182,212,0.35),0_4px_16px_rgba(59,130,246,0.25)]',
        'hover:border-river-blue/50',
        'active:from-river-blue-dark active:to-river-blue/80'
      ),
      secondary: cn(
        'bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2/90 text-foreground',
        'border border-border/40',
        'shadow-[0_4px_16px_rgba(0,0,0,0.1)]',
        'hover:from-surface-3 hover:via-surface-2 hover:to-surface-3',
        'hover:shadow-[0_8px_25px_rgba(0,0,0,0.15),0_2px_8px_rgba(59,130,246,0.1)]',
        'hover:border-border-accent/60'
      ),
      'trading-buy': cn(
        'bg-gradient-to-r from-success-700 via-success-600 to-success-500 text-white font-bold',
        'border border-success-600/30',
        'shadow-[0_8px_25px_rgba(16,185,129,0.3)]',
        'hover:from-success-600 hover:via-success-500 hover:to-success-400',
        'hover:shadow-[0_16px_48px_rgba(16,185,129,0.45),0_4px_16px_rgba(34,197,94,0.3)]',
        'hover:border-success-500/50',
        'relative overflow-hidden',
        glow && 'animate-pulse-glow-success-enhanced'
      ),
      'trading-sell': cn(
        'bg-gradient-to-r from-danger-700 via-danger-600 to-danger-500 text-white font-bold',
        'border border-danger-600/30',
        'shadow-[0_8px_25px_rgba(239,68,68,0.3)]',
        'hover:from-danger-600 hover:via-danger-500 hover:to-danger-400',
        'hover:shadow-[0_16px_48px_rgba(239,68,68,0.45),0_4px_16px_rgba(220,38,38,0.3)]',
        'hover:border-danger-500/50',
        'relative overflow-hidden',
        glow && 'animate-pulse-glow-danger-enhanced'
      ),
      ghost: cn(
        'bg-transparent text-secondary backdrop-blur-sm',
        'border border-transparent',
        'hover:bg-surface-2/70 hover:text-foreground hover:backdrop-blur-md',
        'hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:border-border/30'
      ),
      premium: cn(
        'bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 text-white font-semibold',
        'border border-purple-500/30',
        'shadow-[0_12px_32px_rgba(124,58,237,0.3)]',
        'hover:shadow-[0_20px_48px_rgba(124,58,237,0.4),0_8px_24px_rgba(59,130,246,0.3)]',
        'relative overflow-hidden',
        glow && 'animate-pulse-glow-enhanced'
      )
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-lg min-w-[64px]',
      default: 'h-10 px-4 py-2 text-sm rounded-lg min-w-[80px]',
      lg: 'h-12 px-6 text-base rounded-xl min-w-[96px]',
      trading: 'h-16 px-8 text-lg font-black rounded-xl min-w-[140px]'
    };

    return (
      <MicroInteraction
        variant={variant.includes('trading') ? 'trading' : variant === 'premium' ? 'premium' : 'hover'}
        disabled={disabled || loading}
      >
        <button
          ref={buttonRef}
          className={cn(
            'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold',
            'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            'disabled:pointer-events-none disabled:opacity-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-river-blue/50',
            'transform-gpu overflow-hidden',
            variants[variant],
            sizes[size],
            disabled && 'cursor-not-allowed',
            className
          )}
          disabled={disabled || loading}
          onClick={handleClick}
          {...props}
        >
          {/* Ripple Effects */}
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="absolute pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="block w-0 h-0 rounded-full bg-white/30 animate-[rippleEnhanced_0.8s_ease-out_forwards]" />
            </span>
          ))}

          {/* Loading Spinner */}
          {loading && (
            <div className="spinner-enhanced mr-2" />
          )}

          {/* Shimmer Effect for Trading Buttons */}
          {(variant.includes('trading') || variant === 'premium') && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] transition-transform duration-700 group-hover:translate-x-[200%] pointer-events-none" />
          )}

          {/* Button Content */}
          <span className={cn(
            'relative z-10 flex items-center justify-center gap-2',
            loading && 'opacity-80'
          )}>
            {children}
          </span>

          {/* Glow Overlay for Premium Buttons */}
          {glow && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
          )}
        </button>
      </MicroInteraction>
    );
  }
);

InteractiveButton.displayName = 'InteractiveButton';

/**
 * Enhanced Card with Professional Micro-Interactions
 */
interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'trading' | 'premium' | 'glass';
  hover?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

export const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ className, variant = 'default', hover = true, glow = false, children, ...props }, ref) => {
    const variants = {
      default: cn(
        'bg-surface-1 border border-border',
        'shadow-[0_4px_12px_rgba(0,0,0,0.15),0_1px_3px_rgba(0,0,0,0.1)]',
        'rounded-xl',
        hover && 'hover:shadow-[0_12px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(59,130,246,0.08)]',
        hover && 'hover:border-border-accent/60'
      ),
      trading: cn(
        'bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1',
        'border border-border/50',
        'shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_8px_rgba(59,130,246,0.08)]',
        'rounded-xl',
        hover && 'hover:shadow-[0_16px_40px_rgba(0,0,0,0.15),0_8px_24px_rgba(59,130,246,0.15)]',
        hover && 'hover:border-river-blue/30'
      ),
      premium: cn(
        'bg-gradient-to-br from-surface-2/80 via-surface-3/60 to-surface-2/80',
        'backdrop-blur-md border border-border/40',
        'shadow-[0_12px_32px_rgba(0,0,0,0.15),0_4px_16px_rgba(124,58,237,0.1)]',
        'rounded-2xl',
        hover && 'hover:shadow-[0_24px_48px_rgba(124,58,237,0.2),0_8px_24px_rgba(59,130,246,0.15)]',
        hover && 'hover:border-purple-500/30',
        'relative overflow-hidden'
      ),
      glass: cn(
        'bg-surface-1/60 backdrop-blur-xl border border-white/10',
        'shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.15)]',
        'rounded-2xl',
        hover && 'hover:bg-surface-1/80 hover:backdrop-blur-2xl',
        hover && 'hover:shadow-[0_16px_48px_rgba(0,0,0,0.4),0_4px_16px_rgba(59,130,246,0.1)]'
      )
    };

    return (
      <MicroInteraction
        variant={variant === 'premium' ? 'premium' : hover ? 'hover' : 'subtle'}
        className={cn(
          variants[variant],
          glow && 'animate-pulse-glow-enhanced',
          className
        )}
        ref={ref}
        {...props}
      >
        {/* Premium glow overlay */}
        {variant === 'premium' && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-blue-600/5 to-cyan-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none rounded-2xl" />
        )}
        
        {children}
      </MicroInteraction>
    );
  }
);

InteractiveCard.displayName = 'InteractiveCard';

/**
 * Enhanced Input with Professional Micro-Interactions
 */
interface InteractiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'trading' | 'premium';
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const InteractiveInput = React.forwardRef<HTMLInputElement, InteractiveInputProps>(
  ({ className, variant = 'default', icon, suffix, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const variants = {
      default: cn(
        'h-10 w-full rounded-lg border border-border/50 bg-surface-2/80',
        'px-3 py-2 text-sm',
        'placeholder:text-muted-foreground',
        'focus:border-river-blue focus:ring-2 focus:ring-river-blue/20',
        'transition-all duration-200 ease-out',
        isFocused && 'shadow-[0_8px_20px_rgba(59,130,246,0.15)]'
      ),
      trading: cn(
        'h-10 w-full rounded-lg border border-river-blue/20 bg-surface-2',
        'px-3 py-2 text-sm font-mono',
        'placeholder:text-muted-foreground',
        'focus:border-river-accent focus:bg-surface-2/95',
        'focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15),0_8px_24px_rgba(59,130,246,0.2)]',
        'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        isFocused && 'transform scale-[1.01] -translate-y-0.5'
      ),
      premium: cn(
        'h-12 w-full rounded-xl border border-purple-500/20 bg-gradient-to-r from-surface-2/90 to-surface-3/90',
        'backdrop-blur-md px-4 py-3 text-sm',
        'placeholder:text-muted-foreground',
        'focus:border-purple-400 focus:bg-surface-2/95',
        'focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15),0_12px_32px_rgba(124,58,237,0.25)]',
        'transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        isFocused && 'transform scale-[1.02] -translate-y-1'
      )
    };

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          className={cn(
            variants[variant],
            icon && 'pl-10',
            suffix && 'pr-10',
            className
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {suffix && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {suffix}
          </div>
        )}
      </div>
    );
  }
);

InteractiveInput.displayName = 'InteractiveInput';

/**
 * Professional Price Display with Animation
 */
interface PriceDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  previousValue?: number;
  symbol?: string;
  precision?: number;
  size?: 'sm' | 'default' | 'lg' | 'xl';
  showChange?: boolean;
}

export const PriceDisplay = React.forwardRef<HTMLDivElement, PriceDisplayProps>(
  ({ 
    className, 
    value, 
    previousValue, 
    symbol = '$', 
    precision = 2, 
    size = 'default', 
    showChange = false,
    ...props 
  }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(value);
    const [changeDirection, setChangeDirection] = React.useState<'up' | 'down' | null>(null);

    React.useEffect(() => {
      if (previousValue !== undefined && previousValue !== value) {
        setChangeDirection(value > previousValue ? 'up' : 'down');
        
        // Animate value change
        const duration = 500;
        const steps = 30;
        const stepValue = (value - previousValue) / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
          currentStep++;
          setDisplayValue(previousValue + (stepValue * currentStep));
          
          if (currentStep >= steps) {
            clearInterval(timer);
            setDisplayValue(value);
            setTimeout(() => setChangeDirection(null), 1000);
          }
        }, duration / steps);

        return () => clearInterval(timer);
      }
    }, [value, previousValue]);

    const sizes = {
      sm: 'text-sm',
      default: 'text-base',
      lg: 'text-xl font-bold',
      xl: 'text-3xl font-black'
    };

    const changeColors = {
      up: 'text-success-500 animate-price-up-enhanced',
      down: 'text-danger-500 animate-price-down-enhanced',
      null: ''
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 font-mono tabular-nums',
          sizes[size],
          changeDirection ? changeColors[changeDirection] : '',
          'transition-colors duration-300',
          className
        )}
        {...props}
      >
        <span className="opacity-80">{symbol}</span>
        <span className="font-bold">
          {displayValue.toLocaleString(undefined, {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
          })}
        </span>
        
        {showChange && previousValue !== undefined && (
          <span className={cn(
            'ml-2 text-xs px-2 py-1 rounded-full',
            value >= previousValue 
              ? 'bg-success-500/20 text-success-400' 
              : 'bg-danger-500/20 text-danger-400'
          )}>
            {value >= previousValue ? '+' : ''}
            {((value - previousValue) / previousValue * 100).toFixed(2)}%
          </span>
        )}
      </div>
    );
  }
);

PriceDisplay.displayName = 'PriceDisplay';

export {
  MicroInteraction,
  InteractiveButton,
  InteractiveCard,
  InteractiveInput,
  PriceDisplay
};