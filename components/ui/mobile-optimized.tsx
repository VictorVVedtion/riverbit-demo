import React from 'react';
import { cn } from './utils';

/**
 * SOTA Mobile-First Trading Interface Components
 * Optimized for touch interactions and mobile UX
 * Matching standards of top mobile trading apps
 */

interface MobileTouchProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'compact' | 'default' | 'large';
  haptic?: boolean;
  ripple?: boolean;
  children: React.ReactNode;
}

export const MobileTouch = React.forwardRef<HTMLDivElement, MobileTouchProps>(
  ({ className, size = 'default', haptic = true, ripple = true, children, onClick, ...props }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false);
    const [ripples, setRipples] = React.useState<Array<{id: number, x: number, y: number}>>([]);
    const touchRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => touchRef.current!);

    const triggerHaptic = React.useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
      if (!haptic || !navigator.vibrate) return;
      
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      
      navigator.vibrate(patterns[intensity]);
    }, [haptic]);

    const createRipple = React.useCallback((event: React.TouchEvent | React.MouseEvent) => {
      if (!ripple) return;

      const element = touchRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY;
      
      if (!clientX || !clientY) return;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const newRipple = {
        id: Date.now() + Math.random(),
        x,
        y
      };

      setRipples(prev => [...prev, newRipple]);

      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }, [ripple]);

    const handleTouchStart = React.useCallback((event: React.TouchEvent) => {
      setIsPressed(true);
      triggerHaptic('light');
      createRipple(event);
    }, [triggerHaptic, createRipple]);

    const handleTouchEnd = React.useCallback(() => {
      setIsPressed(false);
    }, []);

    const handleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
      // For mouse events (testing on desktop)
      if (!('ontouchstart' in window)) {
        createRipple(event);
        triggerHaptic('light');
      }
      onClick?.(event);
    }, [createRipple, triggerHaptic, onClick]);

    const sizes = {
      compact: 'min-h-[44px] min-w-[44px] p-2 rounded-lg text-sm',
      default: 'min-h-[48px] min-w-[48px] p-3 rounded-xl text-base',
      large: 'min-h-[56px] min-w-[56px] p-4 rounded-2xl text-lg'
    };

    return (
      <div
        ref={touchRef}
        className={cn(
          'relative overflow-hidden select-none cursor-pointer',
          'transition-all duration-150 ease-out transform-gpu',
          'active:scale-95',
          isPressed && 'scale-95 brightness-95',
          sizes[size],
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleClick}
        style={{ touchAction: 'manipulation' }}
        {...props}
      >
        {/* Ripple Effects */}
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="absolute pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="w-0 h-0 rounded-full bg-white/30 animate-[rippleMobile_0.6s_ease-out_forwards]" />
          </div>
        ))}

        {children}
      </div>
    );
  }
);

MobileTouch.displayName = 'MobileTouch';

/**
 * Mobile-Optimized Button
 */
interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'trading-buy' | 'trading-sell' | 'ghost';
  size?: 'compact' | 'default' | 'large' | 'full';
  loading?: boolean;
  haptic?: boolean;
  children: React.ReactNode;
}

export const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'default', 
    loading = false,
    haptic = true,
    disabled,
    children, 
    onClick,
    ...props 
  }, ref) => {
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      
      // Haptic feedback
      if (haptic && navigator.vibrate) {
        const intensity = variant.includes('trading') ? [20] : [10];
        navigator.vibrate(intensity);
      }
      
      onClick?.(event);
    }, [disabled, loading, haptic, variant, onClick]);

    const variants = {
      primary: cn(
        'bg-gradient-to-r from-river-blue-main to-river-blue-light text-white font-bold',
        'shadow-[0_4px_16px_rgba(6,182,212,0.3)]',
        'active:shadow-[0_2px_8px_rgba(6,182,212,0.4)]',
        'border border-river-blue/30'
      ),
      secondary: cn(
        'bg-surface-2 text-foreground border border-border',
        'shadow-[0_2px_8px_rgba(0,0,0,0.1)]',
        'active:bg-surface-3 active:shadow-[0_1px_4px_rgba(0,0,0,0.2)]'
      ),
      'trading-buy': cn(
        'bg-gradient-to-r from-success-600 to-success-500 text-white font-black',
        'shadow-[0_4px_16px_rgba(16,185,129,0.4)]',
        'active:shadow-[0_2px_8px_rgba(16,185,129,0.5)]',
        'border border-success-500/30'
      ),
      'trading-sell': cn(
        'bg-gradient-to-r from-danger-600 to-danger-500 text-white font-black',
        'shadow-[0_4px_16px_rgba(239,68,68,0.4)]',
        'active:shadow-[0_2px_8px_rgba(239,68,68,0.5)]',
        'border border-danger-500/30'
      ),
      ghost: cn(
        'bg-transparent text-secondary',
        'active:bg-surface-2/60'
      )
    };

    const sizes = {
      compact: 'h-10 px-3 text-sm rounded-lg min-w-[80px]',
      default: 'h-12 px-4 text-base rounded-xl min-w-[100px]',
      large: 'h-14 px-6 text-lg rounded-2xl min-w-[120px]',
      full: 'h-12 w-full text-base rounded-xl'
    };

    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 whitespace-nowrap',
          'transition-all duration-150 ease-out transform-gpu',
          'disabled:pointer-events-none disabled:opacity-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'active:scale-95',
          'overflow-hidden select-none',
          variants[variant],
          sizes[size],
          disabled && 'cursor-not-allowed',
          className
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        style={{ touchAction: 'manipulation' }}
        {...props}
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        )}
        
        <span className="relative z-10">
          {children}
        </span>
      </button>
    );
  }
);

MobileButton.displayName = 'MobileButton';

/**
 * Mobile-Optimized Card
 */
interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'trading' | 'glass' | 'elevated';
  padding?: 'compact' | 'default' | 'large';
  interactive?: boolean;
  children: React.ReactNode;
}

export const MobileCard = React.forwardRef<HTMLDivElement, MobileCardProps>(
  ({ 
    className, 
    variant = 'default', 
    padding = 'default', 
    interactive = false,
    children, 
    ...props 
  }, ref) => {
    const variants = {
      default: cn(
        'bg-surface-1 border border-border',
        'shadow-[0_2px_8px_rgba(0,0,0,0.1)]',
        'rounded-xl'
      ),
      trading: cn(
        'bg-gradient-to-br from-surface-1 to-surface-2',
        'border border-border/50',
        'shadow-[0_4px_12px_rgba(0,0,0,0.15)]',
        'rounded-xl'
      ),
      glass: cn(
        'bg-surface-1/80 backdrop-blur-xl',
        'border border-white/10',
        'shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
        'rounded-2xl'
      ),
      elevated: cn(
        'bg-surface-1',
        'shadow-[0_8px_24px_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.1)]',
        'border border-border/30',
        'rounded-2xl'
      )
    };

    const paddings = {
      compact: 'p-3',
      default: 'p-4',
      large: 'p-6'
    };

    const InteractiveWrapper = interactive ? MobileTouch : 'div';
    const interactiveProps = interactive ? {
      size: 'default' as const,
      className: cn(
        'transition-transform duration-150',
        'active:scale-[0.98]'
      )
    } : {};

    return (
      <InteractiveWrapper {...interactiveProps}>
        <div
          ref={ref}
          className={cn(
            variants[variant],
            paddings[padding],
            className
          )}
          {...props}
        >
          {children}
        </div>
      </InteractiveWrapper>
    );
  }
);

MobileCard.displayName = 'MobileCard';

/**
 * Mobile-Optimized Input
 */
interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'trading' | 'outlined';
  size?: 'default' | 'large';
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: boolean;
}

export const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'default',
    icon,
    suffix,
    error = false,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const variants = {
      default: cn(
        'bg-surface-2 border border-border/50',
        'focus:bg-surface-1 focus:border-river-blue',
        'transition-all duration-200'
      ),
      trading: cn(
        'bg-surface-2 border border-river-blue/30',
        'focus:bg-surface-1 focus:border-river-accent',
        'focus:shadow-[0_0_0_2px_rgba(34,211,238,0.15)]',
        'font-mono transition-all duration-200'
      ),
      outlined: cn(
        'bg-transparent border-2 border-border',
        'focus:border-river-blue focus:bg-surface-1/50',
        'transition-all duration-200'
      )
    };

    const sizes = {
      default: 'h-12 text-base',
      large: 'h-14 text-lg'
    };

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10">
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl px-4 py-3',
            'text-foreground placeholder:text-muted-foreground',
            'focus:outline-none',
            variants[variant],
            sizes[size],
            icon && 'pl-11',
            suffix && 'pr-11',
            error && 'border-danger-500 focus:border-danger-400',
            isFocused && 'transform scale-[1.01]',
            className
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ touchAction: 'manipulation' }}
          {...props}
        />
        
        {suffix && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10">
            {suffix}
          </div>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';

/**
 * Mobile-Optimized Tab System
 */
interface MobileTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    badge?: string;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const MobileTabs: React.FC<MobileTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className
}) => {
  return (
    <div className={cn(
      'flex bg-surface-2 rounded-xl p-1 overflow-x-auto',
      'scrollbar-none',
      className
    )}>
      {tabs.map((tab) => (
        <MobileTouch
          key={tab.id}
          size="compact"
          className={cn(
            'flex-1 min-w-fit px-4 py-2 rounded-lg',
            'flex items-center justify-center gap-2',
            'text-sm font-medium whitespace-nowrap',
            'transition-all duration-200',
            activeTab === tab.id
              ? 'bg-river-blue text-white shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge && (
            <span className={cn(
              'ml-1 px-2 py-0.5 rounded-full text-xs font-bold',
              activeTab === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-muted text-muted-foreground'
            )}>
              {tab.badge}
            </span>
          )}
        </MobileTouch>
      ))}
    </div>
  );
};

/**
 * Mobile-Optimized Bottom Sheet
 */
interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className
}) => {
  const [dragY, setDragY] = React.useState(0);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef(0);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = Math.max(0, currentY - startY.current);
    setDragY(deltaY);
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  }, [dragY, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute bottom-0 left-0 right-0',
          'bg-surface-1 rounded-t-3xl',
          'shadow-[0_-4px_24px_rgba(0,0,0,0.3)]',
          'transform transition-transform duration-300 ease-out',
          'max-h-[85vh] overflow-hidden',
          className
        )}
        style={{
          transform: `translateY(${dragY}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="px-6 pb-4">
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
          </div>
        )}
        
        {/* Content */}
        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Mobile-Optimized Price Ticker
 */
interface MobilePriceTickerProps {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: string;
  className?: string;
}

export const MobilePriceTicker: React.FC<MobilePriceTickerProps> = ({
  symbol,
  price,
  change,
  changePercent,
  volume,
  className
}) => {
  const isPositive = change >= 0;

  return (
    <MobileCard variant="trading" padding="compact" className={cn('mb-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">{symbol}</h3>
          {volume && (
            <p className="text-xs text-muted-foreground">Vol: {volume}</p>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-xl font-black font-mono tabular-nums text-foreground">
            ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          
          <div className={cn(
            'text-sm font-bold font-mono flex items-center gap-1',
            isPositive ? 'text-success-500' : 'text-danger-500'
          )}>
            <span>{isPositive ? '▲' : '▼'}</span>
            <span>{isPositive ? '+' : ''}${Math.abs(change).toFixed(2)}</span>
            <span>({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>
    </MobileCard>
  );
};

// CSS animations for mobile components
export const mobileAnimations = `
  @keyframes rippleMobile {
    0% {
      width: 0;
      height: 0;
      opacity: 0.5;
    }
    50% {
      opacity: 0.3;
    }
    100% {
      width: 200px;
      height: 200px;
      opacity: 0;
    }
  }

  @media (max-width: 768px) {
    .scrollbar-none {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    
    .scrollbar-none::-webkit-scrollbar {
      display: none;
    }
  }
`;

export {
  MobileTouch,
  MobileButton,
  MobileCard,
  MobileInput,
  MobileTabs,
  MobileBottomSheet,
  MobilePriceTicker
};