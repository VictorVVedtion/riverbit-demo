import * as React from "react";
import { cn } from "./utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "rectangular" | "text" | "price" | "chart";
  animation?: "pulse" | "wave" | "shimmer" | "none";
  width?: string | number;
  height?: string | number;
  lines?: number;
  rounded?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    variant = "default", 
    animation = "shimmer",
    width,
    height,
    lines = 1,
    rounded = true,
    ...props 
  }, ref) => {
    const baseClasses = cn(
      "bg-gradient-to-r from-surface-2/60 via-surface-3/80 to-surface-2/60",
      "bg-[length:200%_100%]",
      rounded && "rounded-md",
      
      // Animation variants
      animation === "pulse" && "animate-pulse",
      animation === "wave" && "animate-[wave_2s_ease-in-out_infinite]",
      animation === "shimmer" && "animate-[shimmer_2s_linear_infinite]",
      animation === "none" && "",
      
      // Variant-specific styles
      variant === "circular" && "rounded-full aspect-square",
      variant === "text" && "h-4 rounded-sm",
      variant === "price" && "h-8 w-24 rounded-lg",
      variant === "chart" && "h-32 w-full rounded-lg",
      variant === "rectangular" && "rounded-lg",
    );

    // For multi-line text skeletons
    if (variant === "text" && lines > 1) {
      return (
        <div className="space-y-2" {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              ref={index === 0 ? ref : undefined}
              className={cn(
                baseClasses,
                index === lines - 1 && "w-3/4", // Last line shorter
                className
              )}
              style={{
                width: index === lines - 1 ? "75%" : width,
                height: height || "16px",
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(baseClasses, className)}
        style={{
          width: width,
          height: height,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

// Trading-specific skeleton components
export const TradingSkeleton = {
  // Price display skeleton
  Price: () => (
    <div className="space-y-2">
      <Skeleton variant="price" className="w-32 h-8" />
      <Skeleton variant="text" className="w-20 h-4" />
    </div>
  ),

  // Order book skeleton
  OrderBook: () => (
    <div className="space-y-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-1">
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
      ))}
    </div>
  ),

  // Position card skeleton
  Position: () => (
    <div className="p-4 bg-surface-1/60 rounded-lg border border-default/30 space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Skeleton className="w-12 h-6 rounded-full" />
          <Skeleton className="w-16 h-6" />
        </div>
        <Skeleton className="w-20 h-6" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-full h-8" />
      </div>
    </div>
  ),

  // Chart skeleton
  Chart: () => (
    <div className="w-full h-64 bg-surface-1/60 rounded-lg border border-default/30 relative overflow-hidden">
      <Skeleton animation="shimmer" className="absolute inset-0" />
      <div className="absolute inset-4 flex items-end justify-between">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-3 bg-surface-3/60"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  ),

  // Trading form skeleton
  TradingForm: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-full h-12" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-full h-12" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
      </div>
    </div>
  ),

  // Account summary skeleton
  Account: () => (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-surface-2/60 rounded-lg p-3 space-y-2">
        <Skeleton className="w-16 h-3" />
        <Skeleton className="w-20 h-6" />
      </div>
      <div className="bg-surface-2/60 rounded-lg p-3 space-y-2">
        <Skeleton className="w-16 h-3" />
        <Skeleton className="w-20 h-6" />
      </div>
      <div className="bg-surface-2/60 rounded-lg p-3 space-y-2">
        <Skeleton className="w-16 h-3" />
        <Skeleton className="w-20 h-6" />
      </div>
    </div>
  ),
};

// Enhanced Loading Component
interface LoadingProps {
  variant?: "spinner" | "dots" | "pulse" | "skeleton";
  size?: "sm" | "md" | "lg";
  message?: string;
  overlay?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  variant = "spinner",
  size = "md",
  message,
  overlay = false
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const overlayContent = (
    <div className="flex flex-col items-center justify-center space-y-3">
      {variant === "spinner" && (
        <svg
          className={cn(
            "animate-spin text-river-blue",
            sizeClasses[size]
          )}
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

      {variant === "dots" && (
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "bg-river-blue rounded-full animate-bounce",
                size === "sm" && "w-2 h-2",
                size === "md" && "w-3 h-3",
                size === "lg" && "w-4 h-4"
              )}
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: "0.6s",
              }}
            />
          ))}
        </div>
      )}

      {variant === "pulse" && (
        <div
          className={cn(
            "bg-river-blue rounded-full animate-pulse",
            sizeClasses[size]
          )}
        />
      )}

      {message && (
        <p className="text-sm text-secondary font-medium mt-2">{message}</p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-surface-1 rounded-lg p-6 shadow-2xl border border-default/30">
          {overlayContent}
        </div>
      </div>
    );
  }

  return overlayContent;
};

export { Skeleton };

// CSS animations for skeletons
export const skeletonStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @keyframes wave {
    0%, 100% {
      transform: translateX(-100%);
    }
    50% {
      transform: translateX(100%);
    }
  }

  .animate-shimmer {
    animation: shimmer 2s linear infinite;
  }

  .animate-wave {
    animation: wave 2s ease-in-out infinite;
  }
`;