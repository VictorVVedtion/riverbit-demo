import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";
import { hapticFeedback } from "../../utils/animationUtils";

const enhancedButtonVariants = cva(
  [
    // Base styles with smooth transitions
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold",
    "transition-all duration-200 ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "transform-gpu", // Hardware acceleration
    "overflow-hidden", // For ripple effect
    
    // Interactive states
    "hover:transform hover:scale-[1.02] hover:shadow-lg",
    "active:transform active:scale-[0.98]",
    "disabled:hover:transform-none disabled:hover:shadow-none",
    
    // Accessibility
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  ],
  {
    variants: {
      variant: {
        // Trading-specific variants with enhanced effects
        primary: [
          "bg-gradient-to-r from-river-blue via-river-blue-main to-river-blue/90 text-white",
          "hover:from-river-blue-light hover:via-river-blue hover:to-river-blue-dark",
          "hover:shadow-[0_12px_40px_rgba(6,182,212,0.35),0_4px_16px_rgba(59,130,246,0.25)]",
          "hover:brightness-110 hover:saturate-110",
          "focus-visible:ring-2 focus-visible:ring-river-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1",
          "active:from-river-blue-dark active:to-river-blue/80 active:brightness-95",
          "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        ],
        
        secondary: [
          "bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2/90 text-foreground border border-border",
          "hover:from-surface-3 hover:via-surface-2 hover:to-surface-3 hover:border-border-accent",
          "hover:shadow-[0_8px_25px_rgba(0,0,0,0.15),0_2px_8px_rgba(59,130,246,0.1)]",
          "focus-visible:ring-2 focus-visible:ring-border-focus/60",
          "active:from-surface-1 active:to-surface-2/80",
          "transition-all duration-200 ease-out",
        ],
        
        buy: [
          "bg-gradient-to-r from-profit via-emerald-500 to-profit/90 text-white font-bold",
          "hover:from-emerald-400 hover:via-profit hover:to-emerald-600",
          "hover:shadow-[0_16px_48px_rgba(16,185,129,0.45),0_4px_16px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]",
          "hover:brightness-110 hover:scale-[1.02] hover:-translate-y-0.5",
          "focus-visible:ring-2 focus-visible:ring-profit/60 focus-visible:ring-offset-2",
          "active:from-profit/85 active:to-emerald-700 active:scale-[0.98] active:translate-y-0",
          "border border-profit/30 hover:border-profit/50",
          "transition-all duration-250 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          "relative overflow-hidden",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] before:transition-transform before:duration-700",
          "hover:before:translate-x-[200%]",
        ],
        
        sell: [
          "bg-gradient-to-r from-loss via-red-500 to-loss/90 text-white font-bold",
          "hover:from-red-400 hover:via-loss hover:to-red-600",
          "hover:shadow-[0_16px_48px_rgba(239,68,68,0.45),0_4px_16px_rgba(220,38,38,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]",
          "hover:brightness-110 hover:scale-[1.02] hover:-translate-y-0.5",
          "focus-visible:ring-2 focus-visible:ring-loss/60 focus-visible:ring-offset-2",
          "active:from-loss/85 active:to-red-700 active:scale-[0.98] active:translate-y-0",
          "border border-loss/30 hover:border-loss/50",
          "transition-all duration-250 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          "relative overflow-hidden",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] before:transition-transform before:duration-700",
          "hover:before:translate-x-[200%]",
        ],
        
        outline: [
          "border-2 bg-surface-1/60 backdrop-blur-md text-primary",
          "border-border/40 hover:border-river-blue/60",
          "hover:bg-surface-2/90 hover:shadow-[0_8px_25px_rgba(0,0,0,0.12),0_2px_8px_rgba(59,130,246,0.15)]",
          "hover:scale-[1.01] hover:-translate-y-0.5 hover:backdrop-blur-lg",
          "focus-visible:ring-2 focus-visible:ring-river-blue/50 focus-visible:ring-offset-2",
          "active:bg-surface-3/80 active:scale-[0.99] active:translate-y-0",
          "transition-all duration-200 ease-out",
        ],
        
        ghost: [
          "bg-transparent text-secondary backdrop-blur-sm",
          "hover:bg-surface-2/70 hover:text-foreground hover:backdrop-blur-md",
          "hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:scale-[1.01]",
          "focus-visible:ring-2 focus-visible:ring-surface-3/60 focus-visible:bg-surface-2/50",
          "active:bg-surface-3/50 active:scale-[0.99]",
          "transition-all duration-150 ease-out",
        ],
        
        danger: [
          "bg-gradient-to-r from-danger to-danger/90 text-white",
          "hover:from-danger/90 hover:to-danger/80",
          "hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)]",
          "focus-visible:ring-danger/50",
          "active:from-danger/80 active:to-danger/70",
        ],
      },
      
      size: {
        sm: "h-8 px-3 text-xs gap-1.5 rounded-lg min-w-[64px]",
        default: "h-10 px-4 py-2 has-[>svg]:px-3 rounded-lg min-w-[80px]",
        lg: "h-12 px-6 text-base has-[>svg]:px-5 rounded-xl min-w-[96px]",
        xl: "h-14 px-8 text-lg font-bold has-[>svg]:px-7 rounded-xl min-w-[112px]",
        icon: "size-10 rounded-lg p-0",
        trading: "h-16 px-8 text-lg font-black rounded-xl min-w-[140px]",
      },
      
      loading: {
        true: "cursor-not-allowed",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      loading: false,
    },
  },
);

interface RippleEffect {
  x: number;
  y: number;
  id: number;
}

interface EnhancedButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  haptic?: boolean;
  ripple?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      haptic = true,
      ripple = true,
      loadingText,
      icon,
      iconPosition = "left",
      asChild = false,
      children,
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = React.useState<RippleEffect[]>([]);
    const [isPressed, setIsPressed] = React.useState(false);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    
    React.useImperativeHandle(ref, () => buttonRef.current!);

    const createRipple = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (!ripple || disabled || loading) return;

      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newRipple: RippleEffect = {
        x,
        y,
        id: Date.now() + Math.random(),
      };

      setRipples(prev => [...prev, newRipple]);

      // Enhanced ripple timing for smoother effect
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 800);
    }, [ripple, disabled, loading]);

    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;

      // Haptic feedback
      if (haptic) {
        if (variant === 'buy' || variant === 'sell') {
          hapticFeedback.medium();
        } else {
          hapticFeedback.light();
        }
      }

      // Create ripple effect
      createRipple(event);

      // Call original onClick
      onClick?.(event);
    }, [disabled, loading, haptic, variant, createRipple, onClick]);

    const handleMouseDown = React.useCallback(() => {
      if (!disabled && !loading) {
        setIsPressed(true);
      }
    }, [disabled, loading]);

    const handleMouseUp = React.useCallback(() => {
      setIsPressed(false);
    }, []);

    const handleMouseLeave = React.useCallback(() => {
      setIsPressed(false);
    }, []);

    const Comp = asChild ? Slot : "button";
    
    const buttonContent = (
      <>
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
            <span className="block w-0 h-0 rounded-full bg-white/30 animate-[ripple_0.6s_ease-out_forwards] [animation-fill-mode:forwards]" />
          </span>
        ))}

        {/* Loading Spinner */}
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Icon - Left Position */}
        {icon && iconPosition === "left" && !loading && (
          <span className="inline-flex items-center justify-center">
            {icon}
          </span>
        )}

        {/* Button Text */}
        <span className={cn("inline-flex items-center justify-center", loading && "opacity-80")}>
          {loading && loadingText ? loadingText : children}
        </span>

        {/* Icon - Right Position */}
        {icon && iconPosition === "right" && !loading && (
          <span className="inline-flex items-center justify-center">
            {icon}
          </span>
        )}

        {/* Glow Effect for Trading Buttons */}
        {(variant === 'buy' || variant === 'sell') && (
          <div className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
            <div className={cn(
              "absolute inset-0 rounded-lg blur-md",
              variant === 'buy' && "bg-profit/20",
              variant === 'sell' && "bg-loss/20"
            )} />
          </div>
        )}
      </>
    );

    return (
      <Comp
        ref={buttonRef}
        className={cn(
          "group",
          enhancedButtonVariants({ variant, size, loading, className }),
          isPressed && "scale-[0.98] brightness-95",
          disabled && "cursor-not-allowed",
        )}
        aria-busy={loading || undefined}
        aria-disabled={disabled || loading || undefined}
        disabled={disabled || loading}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {buttonContent}
      </Comp>
    );
  }
);

EnhancedButton.displayName = "EnhancedButton";

export { EnhancedButton, enhancedButtonVariants, type EnhancedButtonProps };

// CSS for ripple animation - add to global styles
export const rippleStyles = `
  @keyframes ripple {
    0% {
      width: 0;
      height: 0;
      opacity: 0.5;
    }
    50% {
      opacity: 0.3;
    }
    100% {
      width: 300px;
      height: 300px;
      opacity: 0;
    }
  }
`;