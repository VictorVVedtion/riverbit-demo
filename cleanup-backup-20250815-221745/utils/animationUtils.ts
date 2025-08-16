/**
 * Professional Animation System for RiverBit DEX
 * World-class micro-interactions and motion design
 */

// Animation Presets - inspired by Apple's HIG and Material Design
export const animations = {
  // Easing curves for natural motion
  easing: {
    ease: [0.25, 0.1, 0.25, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
    spring: [0.6, -0.28, 0.735, 0.045],
    bouncy: [0.68, -0.55, 0.265, 1.55],
    snappy: [0.25, 0.46, 0.45, 0.94],
  },

  // Duration tokens
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
    extra: 750,
  },

  // Button interaction states
  button: {
    hover: {
      scale: 1.02,
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
      transition: 'all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
    press: {
      scale: 0.98,
      transition: 'all 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
    disabled: {
      opacity: 0.5,
      scale: 1,
      transition: 'all 0.2s ease-out',
    },
  },

  // Trading-specific animations
  trading: {
    priceUpdate: {
      profit: {
        background: 'linear-gradient(45deg, #10b981, #16a34a)',
        boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
        animation: 'pulse 0.6s ease-out',
      },
      loss: {
        background: 'linear-gradient(45deg, #ef4444, #dc2626)',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
        animation: 'pulse 0.6s ease-out',
      },
    },
    orderFill: {
      success: {
        transform: 'scale(1.05)',
        background: 'linear-gradient(135deg, #10b981, #16a34a)',
        animation: 'orderFillSuccess 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },

  // Mobile gestures
  mobile: {
    swipe: {
      threshold: 50,
      velocity: 0.3,
      resistance: 0.8,
    },
    haptic: {
      light: { duration: 10, intensity: 0.5 },
      medium: { duration: 20, intensity: 0.7 },
      heavy: { duration: 30, intensity: 1.0 },
    },
  },

  // Loading states
  loading: {
    skeleton: {
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
      animation: 'shimmer 1.5s infinite',
    },
    spinner: {
      animation: 'spin 1s linear infinite',
    },
    dots: {
      animation: 'bounce 1.4s ease-in-out infinite both',
    },
  },

  // Page transitions
  page: {
    fadeIn: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
    },
    slideIn: {
      initial: { x: '100%' },
      animate: { x: '0%' },
      exit: { x: '-100%' },
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  },
};

// Haptic feedback simulation for web
export const hapticFeedback = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 10, 30]);
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 25, 50]);
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
  },
};

// CSS-in-JS animation helpers
export const cssAnimations = {
  fadeIn: `
    animation: fadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
  
  slideUp: `
    animation: slideUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  
  scaleIn: `
    animation: scaleIn 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    @keyframes scaleIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `,
  
  shimmer: `
    background: linear-gradient(90deg, transparent 25%, rgba(255, 255, 255, 0.1) 50%, transparent 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
  
  pulse: `
    animation: pulse 0.6s ease-out;
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  `,
  
  bounce: `
    animation: bounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    @keyframes bounce {
      0% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0); }
    }
  `,
};

// Animation state manager
export class AnimationManager {
  private activeAnimations = new Set<string>();
  private prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  shouldAnimate(): boolean {
    return !this.prefersReducedMotion;
  }

  registerAnimation(id: string): void {
    this.activeAnimations.add(id);
  }

  unregisterAnimation(id: string): void {
    this.activeAnimations.delete(id);
  }

  cancelAllAnimations(): void {
    this.activeAnimations.clear();
  }

  getActiveCount(): number {
    return this.activeAnimations.size;
  }
}

// Performance-optimized animation utilities
export const performanceUtils = {
  // Use transform and opacity for 60fps animations
  optimizedProps: ['transform', 'opacity', 'filter'],
  
  // Trigger hardware acceleration
  willChange: (properties: string[]) => {
    return properties.join(', ');
  },
  
  // Debounce animation triggers
  debounceAnimation: (fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(null, args), delay);
    };
  },
  
  // RAF-based smooth updates
  smoothUpdate: (callback: (timestamp: number) => void) => {
    let rafId: number;
    const update = (timestamp: number) => {
      callback(timestamp);
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  },
};

// Gesture recognition for mobile
export const gestureUtils = {
  detectSwipe: (
    element: HTMLElement,
    onSwipe: (direction: 'left' | 'right' | 'up' | 'down', velocity: number) => void
  ) => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const endTime = Date.now();
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;
      
      const velocity = Math.sqrt(deltaX ** 2 + deltaY ** 2) / deltaTime;
      
      if (velocity < animations.mobile.swipe.velocity) return;
      
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      if (absDeltaX > absDeltaY && absDeltaX > animations.mobile.swipe.threshold) {
        onSwipe(deltaX > 0 ? 'right' : 'left', velocity);
      } else if (absDeltaY > animations.mobile.swipe.threshold) {
        onSwipe(deltaY > 0 ? 'down' : 'up', velocity);
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  },
};

export default animations;