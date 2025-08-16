// Advanced Slider Components
export { AdvancedSlider, type AdvancedSliderProps } from "../ui/advanced-slider";

// Trading-Specific Sliders
export {
  LeverageSlider,
  PriceRangeSlider,
  SlippageSlider,
  LiquidityRangeSlider
} from "./TradingSliders";

// Smart Assistant System
export { SmartFloatingAssistant } from "./SmartFloatingAssistant";

// Gesture Navigation System
export {
  useGestureDetection,
  useContextualGestures,
  GestureFeedback,
  GestureNavigation
} from "./GestureNavigationSystem";

// Progressive Information Display
export {
  ProgressiveTradingMetric,
  ProgressivePortfolioOverview,
  ProgressivePositionCard,
  InfoDisplayConfig
} from "./ProgressiveInfoDisplay";

// Performance and Accessibility
export {
  AccessibilityProvider,
  useAccessibility,
  useScreenReader,
  useFocusManagement,
  usePerformanceMonitoring,
  useGestureLatency,
  AccessibleButton,
  AccessibleInput,
  PerformanceOverlay,
  EnhancedInteractionWrapper,
  accessibilityStyles
} from "./PerformanceAccessibilitySystem";

// Main Demo Component
export { InteractionSystemDemo } from "./InteractionSystemDemo";

// Type definitions for external use
export interface InteractionConfig {
  enableGestures: boolean;
  enableHapticFeedback: boolean;
  showPerformanceMetrics: boolean;
  accessibilityMode: 'standard' | 'enhanced';
}

export interface UserExperienceProfile {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredComplexity: 'simple' | 'standard' | 'detailed';
  accessibilityNeeds: string[];
  deviceCapabilities: {
    hasTouch: boolean;
    hasVibration: boolean;
    hasSpeech: boolean;
  };
}

// Utility functions
export const InteractionUtils = {
  // Check if device supports haptic feedback
  supportsHapticFeedback: (): boolean => {
    return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  },

  // Check if device supports touch
  supportsTouchInput: (): boolean => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  // Get optimal gesture sensitivity based on device
  getGestureSensitivity: (): { swipeThreshold: number; longPressThreshold: number } => {
    const isMobile = window.innerWidth < 768;
    return {
      swipeThreshold: isMobile ? 30 : 50,
      longPressThreshold: isMobile ? 400 : 500
    };
  },

  // Determine user's accessibility preferences
  detectAccessibilityPreferences: () => {
    return {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      largeText: window.matchMedia('(prefers-font-size: large)').matches || false,
      forcedColors: window.matchMedia('(forced-colors: active)').matches
    };
  },

  // Calculate optimal slider step size
  calculateOptimalStep: (min: number, max: number, precision: number = 2): number => {
    const range = max - min;
    const baseStep = Math.pow(10, -precision);
    
    if (range > 1000) return Math.max(1, Math.floor(range / 1000));
    if (range > 100) return Math.max(0.1, Math.floor(range / 100) / 10);
    if (range > 10) return Math.max(0.01, Math.floor(range / 100) / 100);
    
    return baseStep;
  }
};

// Constants for consistent behavior
export const INTERACTION_CONSTANTS = {
  // Animation durations (ms)
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 200,
    SLOW: 300
  },

  // Gesture thresholds
  GESTURE_THRESHOLD: {
    SWIPE_DISTANCE: 50,
    LONG_PRESS_DURATION: 500,
    DOUBLE_TAP_INTERVAL: 300,
    PINCH_SENSITIVITY: 10
  },

  // Performance targets
  PERFORMANCE_TARGET: {
    FPS: 60,
    RESPONSE_TIME: 16, // ms
    GESTURE_LATENCY: 100, // ms
    MEMORY_LIMIT: 50 // MB
  },

  // Accessibility requirements
  ACCESSIBILITY: {
    MIN_TOUCH_TARGET: 44, // px
    MIN_CONTRAST_RATIO: 4.5,
    MAX_ANIMATION_DURATION: 5000, // ms
    FOCUS_OUTLINE_WIDTH: 2 // px
  },

  // Slider presets for different use cases
  SLIDER_PRESETS: {
    LEVERAGE: [1, 2, 5, 10, 20, 50, 100],
    SLIPPAGE: [0.1, 0.5, 1.0, 2.0, 5.0],
    PERCENTAGE: [0, 25, 50, 75, 100],
    RISK_LEVELS: [10, 30, 50, 70, 90]
  }
} as const;