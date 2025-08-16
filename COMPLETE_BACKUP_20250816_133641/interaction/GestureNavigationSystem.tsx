"use client";

import * as React from "react";
import { cn } from "../ui/utils";

// Types
interface GestureEvent {
  type: 'swipe' | 'longpress' | 'doubletap' | 'pinch' | 'tap';
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
  scale?: number;
  target: HTMLElement;
  originalEvent: TouchEvent | MouseEvent;
}

interface GestureConfig {
  swipeThreshold: number;
  longPressThreshold: number;
  doubleTapThreshold: number;
  pinchThreshold: number;
  preventDefaults: boolean;
  enableMouse: boolean;
  enableTouch: boolean;
  enableKeyboard: boolean;
}

interface GestureHandlers {
  onSwipeLeft?: (event: GestureEvent) => void;
  onSwipeRight?: (event: GestureEvent) => void;
  onSwipeUp?: (event: GestureEvent) => void;
  onSwipeDown?: (event: GestureEvent) => void;
  onLongPress?: (event: GestureEvent) => void;
  onDoubleTap?: (event: GestureEvent) => void;
  onPinchIn?: (event: GestureEvent) => void;
  onPinchOut?: (event: GestureEvent) => void;
  onTap?: (event: GestureEvent) => void;
}

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

// Default configuration
const DEFAULT_CONFIG: GestureConfig = {
  swipeThreshold: 50,
  longPressThreshold: 500,
  doubleTapThreshold: 300,
  pinchThreshold: 10,
  preventDefaults: true,
  enableMouse: true,
  enableTouch: true,
  enableKeyboard: true
};

// Custom hook for gesture detection
export function useGestureDetection(
  handlers: GestureHandlers,
  config: Partial<GestureConfig> = {}
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const gestureRef = React.useRef<HTMLDivElement>(null);
  
  // Touch tracking state
  const touchesRef = React.useRef<Map<number, TouchPoint>>(new Map());
  const lastTapRef = React.useRef<{ timestamp: number; x: number; y: number } | null>(null);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistanceRef = React.useRef<number>(0);

  // Helper functions
  const getTouchPoint = (touch: Touch): TouchPoint => ({
    id: touch.identifier,
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now()
  });

  const getDistance = (touch1: TouchPoint, touch2: TouchPoint): number => {
    const dx = touch1.x - touch2.x;
    const dy = touch1.y - touch2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getSwipeDirection = (start: TouchPoint, end: TouchPoint): 'up' | 'down' | 'left' | 'right' => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const createGestureEvent = (
    type: GestureEvent['type'],
    originalEvent: TouchEvent | MouseEvent,
    additional: Partial<GestureEvent> = {}
  ): GestureEvent => ({
    type,
    target: originalEvent.target as HTMLElement,
    originalEvent,
    ...additional
  });

  // Touch event handlers
  const handleTouchStart = React.useCallback((event: TouchEvent) => {
    if (!fullConfig.enableTouch) return;
    
    const touches = Array.from(event.touches).map(getTouchPoint);
    
    // Clear previous touches and add new ones
    touchesRef.current.clear();
    touches.forEach(touch => touchesRef.current.set(touch.id, touch));

    // Single touch - potential tap or long press
    if (touches.length === 1) {
      const touch = touches[0];
      
      // Start long press timer
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        if (handlers.onLongPress) {
          handlers.onLongPress(createGestureEvent('longpress', event, {
            duration: fullConfig.longPressThreshold
          }));
        }
      }, fullConfig.longPressThreshold);
    }

    // Two touches - potential pinch
    if (touches.length === 2) {
      clearLongPressTimer();
      const [touch1, touch2] = touches;
      initialPinchDistanceRef.current = getDistance(touch1, touch2);
    }

    if (fullConfig.preventDefaults) {
      event.preventDefault();
    }
  }, [handlers, fullConfig]);

  const handleTouchMove = React.useCallback((event: TouchEvent) => {
    if (!fullConfig.enableTouch) return;
    
    const touches = Array.from(event.touches).map(getTouchPoint);
    
    // Cancel long press on movement
    if (touches.length === 1) {
      clearLongPressTimer();
    }

    // Handle pinch gesture
    if (touches.length === 2) {
      const [touch1, touch2] = touches;
      const currentDistance = getDistance(touch1, touch2);
      const deltaDistance = currentDistance - initialPinchDistanceRef.current;
      
      if (Math.abs(deltaDistance) > fullConfig.pinchThreshold) {
        const scale = currentDistance / initialPinchDistanceRef.current;
        
        if (deltaDistance > 0 && handlers.onPinchOut) {
          handlers.onPinchOut(createGestureEvent('pinch', event, {
            scale,
            distance: currentDistance
          }));
        } else if (deltaDistance < 0 && handlers.onPinchIn) {
          handlers.onPinchIn(createGestureEvent('pinch', event, {
            scale,
            distance: currentDistance
          }));
        }
        
        initialPinchDistanceRef.current = currentDistance;
      }
    }

    if (fullConfig.preventDefaults) {
      event.preventDefault();
    }
  }, [handlers, fullConfig]);

  const handleTouchEnd = React.useCallback((event: TouchEvent) => {
    if (!fullConfig.enableTouch) return;
    
    clearLongPressTimer();
    
    const changedTouches = Array.from(event.changedTouches).map(getTouchPoint);
    const remainingTouches = touchesRef.current;

    // Handle swipe gesture
    if (changedTouches.length === 1 && remainingTouches.size === 1) {
      const endTouch = changedTouches[0];
      const startTouch = remainingTouches.get(endTouch.id);
      
      if (startTouch) {
        const distance = getDistance(startTouch, endTouch);
        
        if (distance > fullConfig.swipeThreshold) {
          const direction = getSwipeDirection(startTouch, endTouch);
          const handler = {
            up: handlers.onSwipeUp,
            down: handlers.onSwipeDown,
            left: handlers.onSwipeLeft,
            right: handlers.onSwipeRight
          }[direction];
          
          if (handler) {
            handler(createGestureEvent('swipe', event, {
              direction,
              distance,
              duration: endTouch.timestamp - startTouch.timestamp
            }));
          }
        } else {
          // Handle tap/double tap
          const now = Date.now();
          const lastTap = lastTapRef.current;
          
          if (lastTap && 
              now - lastTap.timestamp < fullConfig.doubleTapThreshold &&
              getDistance(endTouch, { ...lastTap, id: 0, timestamp: 0 }) < 30) {
            // Double tap
            if (handlers.onDoubleTap) {
              handlers.onDoubleTap(createGestureEvent('doubletap', event));
            }
            lastTapRef.current = null;
          } else {
            // Single tap (with delay to check for double tap)
            lastTapRef.current = { timestamp: now, x: endTouch.x, y: endTouch.y };
            setTimeout(() => {
              if (lastTapRef.current && lastTapRef.current.timestamp === now) {
                if (handlers.onTap) {
                  handlers.onTap(createGestureEvent('tap', event));
                }
                lastTapRef.current = null;
              }
            }, fullConfig.doubleTapThreshold);
          }
        }
      }
    }

    // Remove ended touches
    changedTouches.forEach(touch => touchesRef.current.delete(touch.id));

    if (fullConfig.preventDefaults) {
      event.preventDefault();
    }
  }, [handlers, fullConfig]);

  // Mouse event handlers (for desktop testing)
  const [mouseStart, setMouseStart] = React.useState<{ x: number; y: number; timestamp: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = React.useState(false);

  const handleMouseDown = React.useCallback((event: MouseEvent) => {
    if (!fullConfig.enableMouse) return;
    
    setIsMouseDown(true);
    setMouseStart({
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    });

    // Start long press timer
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      if (handlers.onLongPress) {
        handlers.onLongPress(createGestureEvent('longpress', event, {
          duration: fullConfig.longPressThreshold
        }));
      }
    }, fullConfig.longPressThreshold);
  }, [handlers, fullConfig]);

  const handleMouseMove = React.useCallback((event: MouseEvent) => {
    if (!fullConfig.enableMouse || !isMouseDown) return;
    
    // Cancel long press on movement
    clearLongPressTimer();
  }, [fullConfig, isMouseDown]);

  const handleMouseUp = React.useCallback((event: MouseEvent) => {
    if (!fullConfig.enableMouse || !isMouseDown || !mouseStart) return;
    
    setIsMouseDown(false);
    clearLongPressTimer();
    
    const endX = event.clientX;
    const endY = event.clientY;
    const distance = Math.sqrt(
      Math.pow(endX - mouseStart.x, 2) + Math.pow(endY - mouseStart.y, 2)
    );
    
    if (distance > fullConfig.swipeThreshold) {
      // Handle swipe
      const direction = getSwipeDirection(
        { id: 0, x: mouseStart.x, y: mouseStart.y, timestamp: mouseStart.timestamp },
        { id: 0, x: endX, y: endY, timestamp: Date.now() }
      );
      
      const handler = {
        up: handlers.onSwipeUp,
        down: handlers.onSwipeDown,
        left: handlers.onSwipeLeft,
        right: handlers.onSwipeRight
      }[direction];
      
      if (handler) {
        handler(createGestureEvent('swipe', event, {
          direction,
          distance,
          duration: Date.now() - mouseStart.timestamp
        }));
      }
    } else {
      // Handle tap/double tap
      const now = Date.now();
      const lastTap = lastTapRef.current;
      
      if (lastTap && 
          now - lastTap.timestamp < fullConfig.doubleTapThreshold &&
          Math.sqrt(Math.pow(endX - lastTap.x, 2) + Math.pow(endY - lastTap.y, 2)) < 30) {
        // Double tap
        if (handlers.onDoubleTap) {
          handlers.onDoubleTap(createGestureEvent('doubletap', event));
        }
        lastTapRef.current = null;
      } else {
        // Single tap (with delay)
        lastTapRef.current = { timestamp: now, x: endX, y: endY };
        setTimeout(() => {
          if (lastTapRef.current && lastTapRef.current.timestamp === now) {
            if (handlers.onTap) {
              handlers.onTap(createGestureEvent('tap', event));
            }
            lastTapRef.current = null;
          }
        }, fullConfig.doubleTapThreshold);
      }
    }
    
    setMouseStart(null);
  }, [handlers, fullConfig, isMouseDown, mouseStart]);

  // Keyboard handlers
  const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (!fullConfig.enableKeyboard) return;
    
    // Map keyboard shortcuts to gestures
    const keyGestureMap: Record<string, () => void> = {
      'ArrowLeft': () => handlers.onSwipeLeft?.(createGestureEvent('swipe', event as any, { direction: 'left' })),
      'ArrowRight': () => handlers.onSwipeRight?.(createGestureEvent('swipe', event as any, { direction: 'right' })),
      'ArrowUp': () => handlers.onSwipeUp?.(createGestureEvent('swipe', event as any, { direction: 'up' })),
      'ArrowDown': () => handlers.onSwipeDown?.(createGestureEvent('swipe', event as any, { direction: 'down' })),
      'Enter': () => handlers.onDoubleTap?.(createGestureEvent('doubletap', event as any)),
      ' ': () => handlers.onTap?.(createGestureEvent('tap', event as any))
    };

    const handler = keyGestureMap[event.key];
    if (handler && gestureRef.current?.contains(event.target as Node)) {
      event.preventDefault();
      handler();
    }
  }, [handlers, fullConfig]);

  // Setup event listeners
  React.useEffect(() => {
    const element = gestureRef.current;
    if (!element) return;

    // Touch events
    if (fullConfig.enableTouch) {
      element.addEventListener('touchstart', handleTouchStart, { passive: !fullConfig.preventDefaults });
      element.addEventListener('touchmove', handleTouchMove, { passive: !fullConfig.preventDefaults });
      element.addEventListener('touchend', handleTouchEnd, { passive: !fullConfig.preventDefaults });
    }

    // Mouse events
    if (fullConfig.enableMouse) {
      element.addEventListener('mousedown', handleMouseDown);
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseup', handleMouseUp);
    }

    // Keyboard events (global)
    if (fullConfig.enableKeyboard) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      clearLongPressTimer();
      
      if (fullConfig.enableTouch) {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      }
      
      if (fullConfig.enableMouse) {
        element.removeEventListener('mousedown', handleMouseDown);
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseup', handleMouseUp);
      }
      
      if (fullConfig.enableKeyboard) {
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [
    handleTouchStart, handleTouchMove, handleTouchEnd,
    handleMouseDown, handleMouseMove, handleMouseUp,
    handleKeyDown,
    fullConfig
  ]);

  return gestureRef;
}

// Context-aware gesture system
interface GestureContextConfig {
  pageType: 'trading' | 'assets' | 'pool' | 'community';
  isModal: boolean;
  isMobile: boolean;
}

export function useContextualGestures(context: GestureContextConfig) {
  const [feedbackVisible, setFeedbackVisible] = React.useState(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState('');

  const showFeedback = React.useCallback((message: string) => {
    setFeedbackMessage(message);
    setFeedbackVisible(true);
    setTimeout(() => setFeedbackVisible(false), 1500);
  }, []);

  // Context-specific gesture handlers
  const handlers: GestureHandlers = React.useMemo(() => {
    const base: GestureHandlers = {};

    switch (context.pageType) {
      case 'trading':
        base.onSwipeLeft = () => {
          showFeedback('切换到下一个交易对');
          // Navigate to next trading pair
        };
        base.onSwipeRight = () => {
          showFeedback('切换到上一个交易对');
          // Navigate to previous trading pair  
        };
        base.onDoubleTap = () => {
          showFeedback('快速交易');
          // Trigger quick trade
        };
        base.onLongPress = () => {
          showFeedback('快捷操作菜单');
          // Show quick actions
        };
        break;
        
      case 'assets':
        base.onSwipeLeft = () => {
          showFeedback('下一页');
          // Navigate to next page
        };
        base.onSwipeRight = () => {
          showFeedback('上一页'); 
          // Navigate to previous page
        };
        base.onPinchOut = () => {
          showFeedback('展开视图');
          // Expand view
        };
        base.onPinchIn = () => {
          showFeedback('紧凑视图');
          // Compact view
        };
        break;
        
      default:
        base.onSwipeLeft = () => showFeedback('左滑');
        base.onSwipeRight = () => showFeedback('右滑');
    }

    return base;
  }, [context, showFeedback]);

  const gestureRef = useGestureDetection(handlers, {
    enableMouse: !context.isMobile,
    enableTouch: context.isMobile,
    preventDefaults: context.isModal
  });

  return { gestureRef, feedbackVisible, feedbackMessage };
}

// Visual feedback component
interface GestureFeedbackProps {
  visible: boolean;
  message: string;
  className?: string;
}

export function GestureFeedback({ visible, message, className }: GestureFeedbackProps) {
  return (
    <div className={cn(
      "fixed top-4 left-1/2 -translate-x-1/2 z-50",
      "px-4 py-2 bg-black/80 text-white text-sm rounded-lg",
      "transition-all duration-300 pointer-events-none",
      visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
      className
    )}>
      {message}
    </div>
  );
}

// Main gesture navigation component
interface GestureNavigationProps {
  children: React.ReactNode;
  pageType: GestureContextConfig['pageType'];
  className?: string;
}

export function GestureNavigation({ children, pageType, className }: GestureNavigationProps) {
  const context: GestureContextConfig = {
    pageType,
    isModal: false,
    isMobile: typeof window !== 'undefined' && window.innerWidth < 768
  };

  const { gestureRef, feedbackVisible, feedbackMessage } = useContextualGestures(context);

  return (
    <>
      <div 
        ref={gestureRef}
        className={cn("gesture-navigation-container", className)}
        tabIndex={0}
      >
        {children}
      </div>
      
      <GestureFeedback 
        visible={feedbackVisible} 
        message={feedbackMessage}
      />
    </>
  );
}