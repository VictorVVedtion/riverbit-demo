"use client";

import * as React from "react";
import { cn } from "../ui/utils";

// Performance monitoring hook
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = React.useState({
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
    gestureLatency: 0,
    animationFrames: 0
  });

  const frameTimeRef = React.useRef<number[]>([]);
  const lastFrameTime = React.useRef(performance.now());
  const memoryInterval = React.useRef<NodeJS.Timeout>();
  const animationFrameId = React.useRef<number>();

  // FPS monitoring
  const measureFPS = React.useCallback(() => {
    const now = performance.now();
    const delta = now - lastFrameTime.current;
    
    frameTimeRef.current.push(delta);
    if (frameTimeRef.current.length > 60) {
      frameTimeRef.current.shift();
    }
    
    const avgFrameTime = frameTimeRef.current.reduce((sum, time) => sum + time, 0) / frameTimeRef.current.length;
    const fps = Math.round(1000 / avgFrameTime);
    
    setMetrics(prev => ({ ...prev, fps, renderTime: avgFrameTime }));
    lastFrameTime.current = now;
    
    animationFrameId.current = requestAnimationFrame(measureFPS);
  }, []);

  // Memory monitoring
  const measureMemory = React.useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedJSMemory = memory.usedJSMemory / (1024 * 1024); // Convert to MB
      setMetrics(prev => ({ ...prev, memoryUsage: usedJSMemory }));
    }
  }, []);

  React.useEffect(() => {
    // Start FPS monitoring
    animationFrameId.current = requestAnimationFrame(measureFPS);
    
    // Start memory monitoring
    memoryInterval.current = setInterval(measureMemory, 5000);
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (memoryInterval.current) {
        clearInterval(memoryInterval.current);
      }
    };
  }, [measureFPS, measureMemory]);

  return metrics;
}

// Accessibility context
interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  focusVisible: boolean;
  keyboardNavigation: boolean;
  announceChanges: boolean;
}

const AccessibilityContext = React.createContext<{
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
}>({
  settings: {
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    focusVisible: true,
    keyboardNavigation: true,
    announceChanges: true
  },
  updateSettings: () => {}
});

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AccessibilitySettings>(() => {
    if (typeof window === 'undefined') {
      return {
        reducedMotion: false,
        highContrast: false,
        largeText: false,
        focusVisible: true,
        keyboardNavigation: true,
        announceChanges: true
      };
    }

    // Detect system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    return {
      reducedMotion: prefersReducedMotion,
      highContrast: prefersHighContrast,
      largeText: false,
      focusVisible: true,
      keyboardNavigation: true,
      announceChanges: true
    };
  });

  const updateSettings = React.useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Apply CSS custom properties for accessibility
  React.useEffect(() => {
    const root = document.documentElement;
    
    root.style.setProperty('--animation-duration', settings.reducedMotion ? '0s' : '0.2s');
    root.style.setProperty('--transition-duration', settings.reducedMotion ? '0s' : '0.15s');
    root.style.setProperty('--base-font-size', settings.largeText ? '18px' : '16px');
    
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  }, [settings]);

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useAccessibility = () => React.useContext(AccessibilityContext);

// Screen reader announcements
export function useScreenReader() {
  const liveRegionRef = React.useRef<HTMLDivElement>(null);
  const { settings } = useAccessibility();

  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!settings.announceChanges || !liveRegionRef.current) return;
    
    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;
    
    // Clear after a delay
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
  }, [settings.announceChanges]);

  const LiveRegion = React.useCallback(() => (
    <div
      ref={liveRegionRef}
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
    />
  ), []);

  return { announce, LiveRegion };
}

// Keyboard focus management
export function useFocusManagement() {
  const { settings } = useAccessibility();
  const trapRef = React.useRef<HTMLDivElement>(null);
  const [focusedElement, setFocusedElement] = React.useState<HTMLElement | null>(null);

  // Focus trap for modals/dialogs
  const trapFocus = React.useCallback((enable: boolean) => {
    if (!settings.keyboardNavigation || !trapRef.current) return;

    const focusableElements = trapRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (enable && focusableElements.length > 0) {
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);
      firstElement.focus();

      return () => {
        document.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [settings.keyboardNavigation]);

  // Skip to main content
  const skipToMain = React.useCallback(() => {
    const mainElement = document.querySelector('main') || document.querySelector('[role="main"]');
    if (mainElement instanceof HTMLElement) {
      mainElement.focus();
      mainElement.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return { trapRef, trapFocus, skipToMain, focusedElement, setFocusedElement };
}

// Enhanced button with accessibility features
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function AccessibleButton({
  loading = false,
  loadingText = "Loading...",
  children,
  disabled,
  className,
  ...props
}: AccessibleButtonProps) {
  const { settings } = useAccessibility();
  const { announce } = useScreenReader();
  
  const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    
    if (settings.announceChanges) {
      announce("Button activated");
    }
    
    props.onClick?.(e);
  }, [loading, disabled, settings.announceChanges, announce, props.onClick]);

  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        settings.reducedMotion ? "" : "transition-all duration-200",
        settings.highContrast && "border-2 border-current",
        className
      )}
      onClick={handleClick}
    >
      {loading ? (
        <>
          <span className="sr-only">{loadingText}</span>
          <span aria-hidden="true">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Enhanced input with accessibility features
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  description?: string;
}

export function AccessibleInput({
  label,
  error,
  description,
  id,
  className,
  ...props
}: AccessibleInputProps) {
  const { settings } = useAccessibility();
  const inputId = id || React.useId();
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-2">
      <label 
        htmlFor={inputId}
        className={cn(
          "block text-sm font-medium",
          settings.largeText && "text-base"
        )}
      >
        {label}
        {props.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      <input
        {...props}
        id={inputId}
        aria-describedby={
          [
            description && descriptionId,
            error && errorId
          ].filter(Boolean).join(' ') || undefined
        }
        aria-invalid={!!error}
        className={cn(
          "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          settings.highContrast && "border-2 border-current",
          settings.largeText && "text-base py-3",
          error && "border-red-500 focus:ring-red-500 focus:border-red-500",
          className
        )}
      />
      
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Performance monitoring overlay (dev mode)
interface PerformanceOverlayProps {
  show: boolean;
  className?: string;
}

export function PerformanceOverlay({ show, className }: PerformanceOverlayProps) {
  const metrics = usePerformanceMonitoring();
  const [expanded, setExpanded] = React.useState(false);

  if (!show) return null;

  return (
    <div className={cn(
      "fixed top-4 left-4 z-50 bg-black/80 text-white text-xs p-3 rounded-lg",
      "font-mono backdrop-blur-sm border border-white/20",
      expanded ? "min-w-64" : "min-w-32",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">Performance</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-white/70 hover:text-white"
        >
          {expanded ? '−' : '+'}
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>FPS:</span>
          <span className={cn(
            metrics.fps >= 50 ? "text-green-400" :
            metrics.fps >= 30 ? "text-yellow-400" : "text-red-400"
          )}>
            {metrics.fps}
          </span>
        </div>
        
        {expanded && (
          <>
            <div className="flex justify-between">
              <span>Render:</span>
              <span>{metrics.renderTime.toFixed(1)}ms</span>
            </div>
            
            <div className="flex justify-between">
              <span>Memory:</span>
              <span>{metrics.memoryUsage.toFixed(1)}MB</span>
            </div>
            
            <div className="flex justify-between">
              <span>Gesture:</span>
              <span>{metrics.gestureLatency}ms</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Main accessibility and performance wrapper
interface EnhancedInteractionWrapperProps {
  children: React.ReactNode;
  showPerformanceOverlay?: boolean;
  className?: string;
}

export function EnhancedInteractionWrapper({
  children,
  showPerformanceOverlay = false,
  className
}: EnhancedInteractionWrapperProps) {
  const { settings } = useAccessibility();
  const { LiveRegion } = useScreenReader();
  const { trapRef } = useFocusManagement();

  return (
    <div 
      ref={trapRef}
      className={cn(
        "interaction-wrapper",
        settings.reducedMotion && "reduced-motion",
        settings.highContrast && "high-contrast",
        settings.largeText && "large-text",
        className
      )}
    >
      {/* Skip to main content link */}
      <a
        href="#main"
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4",
          "bg-blue-600 text-white px-4 py-2 rounded-md z-50",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        )}
      >
        Skip to main content
      </a>
      
      {children}
      
      <LiveRegion />
      <PerformanceOverlay show={showPerformanceOverlay} />
    </div>
  );
}

// CSS styles for accessibility (to be added to globals.css)
export const accessibilityStyles = `
  /* Reduced motion support */
  .reduced-motion * {
    animation-duration: 0.01s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01s !important;
  }

  /* High contrast support */
  .high-contrast {
    --background: #ffffff;
    --foreground: #000000;
    --muted: #f5f5f5;
    --muted-foreground: #666666;
    --border: #000000;
  }

  @media (prefers-color-scheme: dark) {
    .high-contrast {
      --background: #000000;
      --foreground: #ffffff;
      --muted: #1a1a1a;
      --muted-foreground: #cccccc;
      --border: #ffffff;
    }
  }

  /* Large text support */
  .large-text {
    font-size: 1.125rem;
  }

  .large-text .text-sm {
    font-size: 1rem;
  }

  .large-text .text-xs {
    font-size: 0.875rem;
  }

  /* Focus visible improvements */
  .focus-visible:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  /* Screen reader only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .focus\\:not-sr-only:focus {
    position: static;
    width: auto;
    height: auto;
    padding: inherit;
    margin: inherit;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }

  /* Touch target improvements */
  @media (pointer: coarse) {
    button, [role="button"], a, input, select, textarea {
      min-height: 44px;
      min-width: 44px;
    }
  }
`;

// Hook for measuring gesture latency
export function useGestureLatency() {
  const [latency, setLatency] = React.useState(0);
  const startTimeRef = React.useRef<number>(0);

  const startMeasurement = React.useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const endMeasurement = React.useCallback(() => {
    if (startTimeRef.current > 0) {
      const endTime = performance.now();
      const gestureLatency = endTime - startTimeRef.current;
      setLatency(gestureLatency);
      startTimeRef.current = 0;
    }
  }, []);

  return { latency, startMeasurement, endMeasurement };
}