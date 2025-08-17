/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './main.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './utils/**/*.{js,ts,jsx,tsx}',
    './styles/**/*.{css,scss}'
  ],
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    screens: {
      'xs': '375px',      // 小屏手机优化
      'sm': '480px',      // 大屏手机 (从640px优化为480px)
      'md': '768px',      // 平板竖屏
      'lg': '1024px',     // 平板横屏/小型笔记本
      'xl': '1280px',     // 标准桌面
      '2xl': '1440px',    // 大屏显示器 (从1536px优化为1440px)
      'xxl': '1920px',    // 超大屏幕优化
      'mobile-landscape': { 'raw': '(orientation: landscape) and (max-height: 568px)' },  // 手机横屏
      'tablet-portrait': { 'raw': '(orientation: portrait) and (min-width: 768px) and (max-width: 1024px)' },  // 平板竖屏
      'touch': { 'raw': '(hover: none) and (pointer: coarse)' },  // 触摸设备
      'no-touch': { 'raw': '(hover: hover) and (pointer: fine)' },  // 非触摸设备
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        trading: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Ultra-Compact Typography System
        'micro': ['0.625rem', { lineHeight: '0.75rem' }],     // 10px
        'tiny': ['0.6875rem', { lineHeight: '0.8125rem' }],   // 11px
        'xs': ['0.75rem', { lineHeight: '1rem' }],            // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],        // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],           // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],        // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],         // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],            // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],       // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],         // 36px
        '5xl': ['3rem', { lineHeight: '1' }],                 // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }],              // 60px
        
        // Trading Interface Specific Typography
        'trading-label': ['0.625rem', { lineHeight: '0.875rem', fontWeight: '500' }],      // Labels
        'trading-data': ['0.75rem', { lineHeight: '1rem', fontWeight: '600' }],            // Data display
        'trading-price': ['1.25rem', { lineHeight: '1.5rem', fontWeight: '800' }],         // Price display
        'trading-button': ['0.75rem', { lineHeight: '1rem', fontWeight: '600' }],          // Button text
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#eff6ff',
          100: '#dbeafe', 
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        
        // SOTA Professional Trading Colors - Enhanced
        'surface-0': 'var(--surface-0)',
        'surface-1': 'var(--surface-1)', 
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        'surface-4': 'var(--surface-4)',
        
        // Aurora 2024 RiverBit Brand Colors
        'river-aurora': {
          'primary': 'var(--river-aurora-primary)',     /* 极光青 */
          'secondary': 'var(--river-aurora-secondary)', /* 激光紫 */
          'tertiary': 'var(--river-aurora-tertiary)',   /* 电光蓝 */
          'accent': 'var(--river-aurora-accent)',       /* 霓虹粉 */
          DEFAULT: 'var(--river-aurora-primary)',
        },
        
        // 兼容性映射 - 保持现有代码正常工作
        'river-blue': {
          'light': 'var(--river-blue-light)',    /* 现在是极光青 */
          'main': 'var(--river-blue-main)',      /* 现在是激光紫 */
          'dark': 'var(--river-blue-dark)',      /* 现在是电光蓝 */
          DEFAULT: 'var(--river-blue-main)',
        },
        'river-accent': {
          DEFAULT: 'var(--river-accent)',        /* 现在是霓虹粉 */
        },
        
        // Enhanced Status Colors
        'success': {
          50: 'var(--success-50)',
          100: 'var(--success-100)',
          200: 'var(--success-200)',
          300: 'var(--success-300)',
          400: 'var(--success-400)',
          500: 'var(--success-500)',
          600: 'var(--success-600)',
          700: 'var(--success-700)',
          800: 'var(--success-800)',
          900: 'var(--success-900)',
          DEFAULT: 'var(--success-500)',
        },
        'danger': {
          50: 'var(--danger-50)',
          100: 'var(--danger-100)',
          200: 'var(--danger-200)',
          300: 'var(--danger-300)',
          400: 'var(--danger-400)',
          500: 'var(--danger-500)',
          600: 'var(--danger-600)',
          700: 'var(--danger-700)',
          800: 'var(--danger-800)',
          900: 'var(--danger-900)',
          DEFAULT: 'var(--danger-500)',
        },
        'warning': {
          50: 'var(--warning-50)',
          100: 'var(--warning-100)',
          200: 'var(--warning-200)',
          300: 'var(--warning-300)',
          400: 'var(--warning-400)',
          500: 'var(--warning-500)',
          600: 'var(--warning-600)',
          700: 'var(--warning-700)',
          800: 'var(--warning-800)',
          900: 'var(--warning-900)',
          DEFAULT: 'var(--warning-500)',
        },
        
        // Trading Semantic Colors
        'profit': 'var(--success-500)',
        'loss': 'var(--danger-500)',
        'info': '#0ea5e9',
        'neutral': '#64748b',
        'default': '#334155',

        // SOTA Professional Trading Colors
        'trading-green': {
          50: 'var(--trading-green-50)',
          100: 'var(--trading-green-100)',
          200: 'var(--trading-green-200)',
          300: 'var(--trading-green-300)',
          400: 'var(--trading-green-400)',
          500: 'var(--trading-green-500)',
          600: 'var(--trading-green-600)',
          700: 'var(--trading-green-700)',
          800: 'var(--trading-green-800)',
          900: 'var(--trading-green-900)',
          DEFAULT: 'var(--trading-green-500)',
        },
        'trading-red': {
          50: 'var(--trading-red-50)',
          100: 'var(--trading-red-100)',
          200: 'var(--trading-red-200)',
          300: 'var(--trading-red-300)',
          400: 'var(--trading-red-400)',
          500: 'var(--trading-red-500)',
          600: 'var(--trading-red-600)',
          700: 'var(--trading-red-700)',
          800: 'var(--trading-red-800)',
          900: 'var(--trading-red-900)',
          DEFAULT: 'var(--trading-red-500)',
        },
        'trading-gray': {
          50: 'var(--trading-gray-50)',
          100: 'var(--trading-gray-100)',
          200: 'var(--trading-gray-200)',
          300: 'var(--trading-gray-300)',
          400: 'var(--trading-gray-400)',
          500: 'var(--trading-gray-500)',
          600: 'var(--trading-gray-600)',
          700: 'var(--trading-gray-700)',
          800: 'var(--trading-gray-800)',
          900: 'var(--trading-gray-900)',
          DEFAULT: 'var(--trading-gray-500)',
        },
        
        // Trading Interface Colors
        'trading-text': {
          primary: 'var(--trading-text-primary)',
          secondary: 'var(--trading-text-secondary)',
          muted: 'var(--trading-text-muted)',
          disabled: 'var(--trading-text-disabled)',
        },
        'trading-bg': {
          primary: 'var(--trading-bg-primary)',
          secondary: 'var(--trading-bg-secondary)',
          tertiary: 'var(--trading-bg-tertiary)',
          elevated: 'var(--trading-bg-elevated)',
        },
        
        // Interactive States
        'border-default': 'var(--border)',
        'border-light': 'var(--border-light)',
        'border-accent': 'var(--border-accent)',
        'border-subtle': 'var(--border-subtle)',
        'border-interactive': 'var(--border-interactive)',
        'border-focus': 'var(--border-focus)',
        'border-error': 'var(--border-error)',
        'border-success': 'var(--border-success)',
      },
      
      // Enhanced Border Radius
      borderRadius: {
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        'full': 'var(--radius-full)',
      },
      
      // Professional Spacing Scale + Ultra-Compact Extensions
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
        // Golden Ratio Spacing
        'golden-xs': 'var(--space-golden-xs)',
        'golden-sm': 'var(--space-golden-sm)',
        'golden-md': 'var(--space-golden-md)',
        'golden-lg': 'var(--space-golden-lg)',
        
        // Ultra-Compact Spacing System
        'ultra-0': 'var(--ultra-space-0)',    // 0px
        'ultra-1': 'var(--ultra-space-1)',    // 2px
        'ultra-2': 'var(--ultra-space-2)',    // 4px
        'ultra-3': 'var(--ultra-space-3)',    // 6px
        'ultra-4': 'var(--ultra-space-4)',    // 8px
        'ultra-5': 'var(--ultra-space-5)',    // 10px
        'ultra-6': 'var(--ultra-space-6)',    // 12px
        'ultra-8': 'var(--ultra-space-8)',    // 16px
        'ultra-10': 'var(--ultra-space-10)',  // 20px
        'ultra-12': 'var(--ultra-space-12)',  // 24px
        
        // Trading Interface Specific
        'trading-xs': '0.125rem',   // 2px
        'trading-sm': '0.25rem',    // 4px
        'trading-md': '0.375rem',   // 6px
        'trading-lg': '0.5rem',     // 8px
        'trading-xl': '0.75rem',    // 12px
      },
      
      height: {
        '18': '4.5rem',
        '88': '22rem', 
        '128': '32rem',
        'screen-1/2': '50vh',
        'screen-1/3': '33vh',
        'screen-2/3': '66vh',
        'screen-3/4': '75vh',
      },
      minHeight: {
        '18': '4.5rem',
        '24': '6rem',
        '32': '8rem',
        'screen-1/2': '50vh',
        'screen-1/3': '33vh',
        'screen-2/3': '66vh',
      },
      maxHeight: {
        'screen-1/2': '50vh',
        'screen-2/3': '66vh',
        'screen-3/4': '75vh',
      },
      
      backdropBlur: {
        xs: '2px',
        '3xl': '32px',
        '4xl': '40px',
      },
      
      boxShadow: {
        // Aurora 2024 Neon Glow Effects
        'glow-aurora': 'var(--glow-aurora)',
        'glow-neon': 'var(--glow-neon)',
        'glow-success': 'var(--glow-success)',
        'glow-danger': 'var(--glow-danger)',
        'glow-accent': 'var(--glow-accent)',
        
        // Legacy Enhanced Glow Effects
        'glow': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-intense': '0 0 32px rgba(0, 212, 255, 0.4), 0 0 64px rgba(123, 63, 242, 0.2)',
        'glow-river': '0 0 24px rgba(0, 212, 255, 0.4), 0 0 48px rgba(47, 180, 255, 0.2)',
        'glow-success-intense': '0 0 32px rgba(0, 255, 136, 0.5), 0 0 64px rgba(0, 212, 170, 0.2)',
        'glow-danger-intense': '0 0 32px rgba(255, 0, 85, 0.5), 0 0 64px rgba(204, 0, 68, 0.2)',
        'glow-warning': '0 0 20px rgba(255, 184, 0, 0.4)',
        
        // Professional Elevation System
        'elevation-1': 'var(--elevation-1)',
        'elevation-2': 'var(--elevation-2)',
        'elevation-3': 'var(--elevation-3)',
        'elevation-4': 'var(--elevation-4)',
        'elevation-5': 'var(--elevation-5)',
        'elevation-6': 'var(--elevation-6)',
        
        // Trading-specific Shadows
        'elevation-trading': 'var(--elevation-trading)',
        'elevation-trading-buy': 'var(--elevation-trading-buy)',
        'elevation-trading-sell': 'var(--elevation-trading-sell)',
        
        // Legacy Support
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'professional': '0 8px 32px rgba(0, 0, 0, 0.12), 0 1px 0 rgba(255, 255, 255, 0.05) inset',
        'trading': '0 4px 12px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
        
        // Interactive States
        'button-hover': 'var(--button-shadow-hover)',
        'button-focus': 'var(--button-shadow-focus)',
        'button-active': 'var(--button-shadow-active)',
        'card-hover': 'var(--card-shadow-hover)',
        'card-focus': 'var(--card-shadow-focus)',
        'trading-glow': 'var(--trading-active-glow)',
      },
      
      animation: {
        // Enhanced Base Animations
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-enhanced': 'fadeInEnhanced var(--animation-duration-normal) var(--easing-sharp) forwards',
        'fade-in-up-enhanced': 'fadeInUpEnhanced var(--animation-duration-slow) var(--easing-smooth) forwards',
        'fade-in-scale-enhanced': 'fadeInScaleEnhanced var(--animation-duration-slow) var(--easing-bounce) forwards',
        
        // Professional Slide Animations
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-in-right-enhanced': 'slide-in-right-enhanced 0.4s var(--easing-smooth) forwards',
        'slide-in-left-enhanced': 'slide-in-left-enhanced 0.4s var(--easing-smooth) forwards',
        'slide-in-up-enhanced': 'slide-in-up-enhanced 0.4s var(--easing-smooth) forwards',
        'slide-in-down-enhanced': 'slide-in-down-enhanced 0.4s var(--easing-smooth) forwards',
        'slide-up': 'slideUp 0.3s ease-out',
        
        // Scale and Transform
        'scale-in': 'scaleIn 0.2s ease-out',
        
        // Enhanced Pulse and Glow
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow-enhanced': 'pulseGlowEnhanced 2.5s ease-in-out infinite',
        'pulse-glow-success-enhanced': 'pulseGlowSuccess 2s ease-in-out infinite',
        'pulse-glow-danger-enhanced': 'pulseGlowDanger 2s ease-in-out infinite',
        'pulse-subtle-enhanced': 'pulseSubtle 3s ease-in-out infinite',
        
        // Movement Animations
        'float': 'float 3s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        
        // Professional Trading Animations
        'price-up-enhanced': 'priceUpEnhanced 0.8s var(--easing-smooth) forwards',
        'price-down-enhanced': 'priceDownEnhanced 0.8s var(--easing-smooth) forwards',
        'order-success-enhanced': 'orderFillSuccessEnhanced 1.2s var(--easing-bounce) forwards',
        'celebration-enhanced': 'celebrationBurst 1s var(--easing-bounce) forwards',
        
        // Advanced Gradient Effects
        'gradient': 'liquidFlow 4s ease-in-out infinite',
        'gradient-fast': 'liquidFlow 2s ease-in-out infinite',
        'river-flow': 'riverFlow 12s ease-in-out infinite',
        'liquid-flow': 'liquidFlow 8s ease-in-out infinite',
        
        // Loading States
        'shimmer': 'shimmer 2s linear infinite',
        'skeleton': 'skeletonShimmerEnhanced 2s ease-in-out infinite',
        'spin-enhanced': 'spinEnhanced 1s linear infinite',
        
        // Legacy Support
        'glow': 'glow 2s ease-in-out infinite alternate',
        
        // Stagger Delays
        'stagger-1': 'fadeInEnhanced var(--animation-duration-normal) var(--easing-sharp) 0.1s forwards',
        'stagger-2': 'fadeInEnhanced var(--animation-duration-normal) var(--easing-sharp) 0.2s forwards',
        'stagger-3': 'fadeInEnhanced var(--animation-duration-normal) var(--easing-sharp) 0.3s forwards',
        'stagger-4': 'fadeInEnhanced var(--animation-duration-normal) var(--easing-sharp) 0.4s forwards',
        'stagger-5': 'fadeInEnhanced var(--animation-duration-normal) var(--easing-sharp) 0.5s forwards',
      },
      
      keyframes: {
        // Enhanced Base Keyframes
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInEnhanced: {
          '0%': { opacity: '0', transform: 'translateY(-10px) translateZ(0) scale(0.98)', filter: 'blur(2px)' },
          '100%': { opacity: '1', transform: 'translateY(0) translateZ(0) scale(1)', filter: 'blur(0)' },
        },
        fadeInUpEnhanced: {
          '0%': { opacity: '0', transform: 'translateY(20px) translateZ(0) scale(0.95)', filter: 'blur(3px) saturate(0.8)' },
          '50%': { opacity: '0.7', filter: 'blur(1px) saturate(0.9)' },
          '100%': { opacity: '1', transform: 'translateY(0) translateZ(0) scale(1)', filter: 'blur(0) saturate(1)' },
        },
        fadeInScaleEnhanced: {
          '0%': { opacity: '0', transform: 'scale(0.9) translateZ(0)', filter: 'blur(4px) brightness(0.8)' },
          '50%': { opacity: '0.6', filter: 'blur(2px) brightness(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1) translateZ(0)', filter: 'blur(0) brightness(1)' },
        },
        
        // Professional Slide Keyframes
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        
        // Enhanced Glow and Pulse
        pulseGlowEnhanced: {
          '0%, 100%': {
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.4), 0 0 16px rgba(6, 182, 212, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            filter: 'brightness(1) saturate(1)'
          },
          '50%': {
            boxShadow: '0 0 24px rgba(59, 130, 246, 0.7), 0 0 48px rgba(6, 182, 212, 0.4), 0 0 64px rgba(34, 211, 238, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            filter: 'brightness(1.1) saturate(1.2)'
          },
        },
        pulseGlowSuccess: {
          '0%, 100%': {
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.4), 0 0 16px rgba(34, 197, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            filter: 'brightness(1) saturate(1)'
          },
          '50%': {
            boxShadow: '0 0 24px rgba(16, 185, 129, 0.7), 0 0 48px rgba(34, 197, 94, 0.4), 0 0 64px rgba(52, 211, 153, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            filter: 'brightness(1.1) saturate(1.2)'
          },
        },
        pulseGlowDanger: {
          '0%, 100%': {
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.4), 0 0 16px rgba(220, 38, 38, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            filter: 'brightness(1) saturate(1)'
          },
          '50%': {
            boxShadow: '0 0 24px rgba(239, 68, 68, 0.7), 0 0 48px rgba(220, 38, 38, 0.4), 0 0 64px rgba(248, 113, 113, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            filter: 'brightness(1.1) saturate(1.2)'
          },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1) translateZ(0)' },
          '50%': { opacity: '0.8', transform: 'scale(1.02) translateZ(0)' },
        },
        
        // Trading-specific Animations
        priceUpEnhanced: {
          '0%': { backgroundColor: 'transparent', transform: 'scale(1) translateZ(0)', boxShadow: 'none', filter: 'brightness(1) saturate(1)' },
          '25%': { backgroundColor: 'rgba(16, 185, 129, 0.1)', transform: 'scale(1.01) translateZ(0)', boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)', filter: 'brightness(1.05) saturate(1.1)' },
          '50%': { backgroundColor: 'rgba(16, 185, 129, 0.25)', transform: 'scale(1.03) translateZ(0)', boxShadow: '0 0 16px rgba(16, 185, 129, 0.4), 0 0 32px rgba(34, 197, 94, 0.2)', filter: 'brightness(1.1) saturate(1.2)' },
          '75%': { backgroundColor: 'rgba(16, 185, 129, 0.15)', transform: 'scale(1.01) translateZ(0)', boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)', filter: 'brightness(1.05) saturate(1.1)' },
          '100%': { backgroundColor: 'transparent', transform: 'scale(1) translateZ(0)', boxShadow: 'none', filter: 'brightness(1) saturate(1)' },
        },
        priceDownEnhanced: {
          '0%': { backgroundColor: 'transparent', transform: 'scale(1) translateZ(0)', boxShadow: 'none', filter: 'brightness(1) saturate(1)' },
          '25%': { backgroundColor: 'rgba(239, 68, 68, 0.1)', transform: 'scale(1.01) translateZ(0)', boxShadow: '0 0 8px rgba(239, 68, 68, 0.3)', filter: 'brightness(1.05) saturate(1.1)' },
          '50%': { backgroundColor: 'rgba(239, 68, 68, 0.25)', transform: 'scale(1.03) translateZ(0)', boxShadow: '0 0 16px rgba(239, 68, 68, 0.4), 0 0 32px rgba(220, 38, 38, 0.2)', filter: 'brightness(1.1) saturate(1.2)' },
          '75%': { backgroundColor: 'rgba(239, 68, 68, 0.15)', transform: 'scale(1.01) translateZ(0)', boxShadow: '0 0 8px rgba(239, 68, 68, 0.3)', filter: 'brightness(1.05) saturate(1.1)' },
          '100%': { backgroundColor: 'transparent', transform: 'scale(1) translateZ(0)', boxShadow: 'none', filter: 'brightness(1) saturate(1)' },
        },
        orderFillSuccessEnhanced: {
          '0%': { transform: 'scale(1) rotate(0deg) translateZ(0)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.8), 0 4px 12px rgba(0, 0, 0, 0.15)', filter: 'brightness(1) saturate(1)' },
          '30%': { transform: 'scale(1.08) rotate(-1deg) translateZ(0)', boxShadow: '0 0 0 8px rgba(16, 185, 129, 0.4), 0 8px 24px rgba(16, 185, 129, 0.3), 0 16px 32px rgba(0, 0, 0, 0.2)', filter: 'brightness(1.15) saturate(1.3)' },
          '50%': { transform: 'scale(1.12) rotate(0.5deg) translateZ(0)', boxShadow: '0 0 0 16px rgba(16, 185, 129, 0.2), 0 12px 32px rgba(16, 185, 129, 0.4), 0 20px 40px rgba(0, 0, 0, 0.25)', filter: 'brightness(1.2) saturate(1.4)' },
          '100%': { transform: 'scale(1) rotate(0deg) translateZ(0)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0), 0 4px 12px rgba(0, 0, 0, 0.15)', filter: 'brightness(1) saturate(1)' },
        },
        celebrationBurst: {
          '0%': { transform: 'scale(1) translateZ(0)', opacity: '1', filter: 'brightness(1) hue-rotate(0deg)' },
          '25%': { transform: 'scale(1.1) translateZ(0)', filter: 'brightness(1.2) hue-rotate(90deg)' },
          '50%': { transform: 'scale(1.2) translateZ(0)', opacity: '0.8', filter: 'brightness(1.4) hue-rotate(180deg)' },
          '75%': { transform: 'scale(1.1) translateZ(0)', filter: 'brightness(1.2) hue-rotate(270deg)' },
          '100%': { transform: 'scale(1) translateZ(0)', opacity: '1', filter: 'brightness(1) hue-rotate(360deg)' },
        },
        
        // Advanced Gradient Flows
        liquidFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%', filter: 'hue-rotate(0deg) brightness(1)' },
          '25%': { backgroundPosition: '25% 75%', filter: 'hue-rotate(15deg) brightness(1.05)' },
          '50%': { backgroundPosition: '100% 50%', filter: 'hue-rotate(30deg) brightness(1.1)' },
          '75%': { backgroundPosition: '75% 25%', filter: 'hue-rotate(15deg) brightness(1.05)' },
        },
        riverFlow: {
          '0%': { backgroundPosition: '0% 0%', transform: 'translateX(0%) rotate(0deg)' },
          '25%': { backgroundPosition: '50% 100%', transform: 'translateX(1%) rotate(1deg)' },
          '50%': { backgroundPosition: '100% 0%', transform: 'translateX(0%) rotate(0deg)' },
          '75%': { backgroundPosition: '50% 100%', transform: 'translateX(-1%) rotate(-1deg)' },
          '100%': { backgroundPosition: '0% 0%', transform: 'translateX(0%) rotate(0deg)' },
        },
        
        // Enhanced Loading
        skeletonShimmerEnhanced: {
          '0%': { backgroundPosition: '200% 0', filter: 'brightness(0.9)' },
          '25%': { filter: 'brightness(1)' },
          '50%': { backgroundPosition: '-200% 0', filter: 'brightness(1.1)' },
          '75%': { filter: 'brightness(1)' },
          '100%': { backgroundPosition: '200% 0', filter: 'brightness(0.9)' },
        },
        spinEnhanced: {
          '0%': { transform: 'rotate(0deg)', filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))' },
          '50%': { filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.5))' },
          '100%': { transform: 'rotate(360deg)', filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))' },
        },
        
        // Movement Animations
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        
        // Legacy Support
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.6)' },
        },
        
        // Mobile-specific
        rippleMobile: {
          '0%': { width: '0', height: '0', opacity: '0.5' },
          '50%': { opacity: '0.3' },
          '100%': { width: '200px', height: '200px', opacity: '0' },
        },
        rippleEnhanced: {
          '0%': { width: '0', height: '0', opacity: '0.6', transform: 'translate(-50%, -50%) scale(0)' },
          '30%': { opacity: '0.4', transform: 'translate(-50%, -50%) scale(0.5)' },
          '100%': { width: '400px', height: '400px', opacity: '0', transform: 'translate(-50%, -50%) scale(1)' },
        },
      },
      
      transitionTimingFunction: {
        // Professional Easing Functions
        'sharp': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'elastic': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        
        // Legacy Support
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ease-out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        
        // Additional Professional Curves
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-in-out-circ': 'cubic-bezier(0.85, 0, 0.15, 1)',
      },
      
      // Enhanced Gradients Support
      backgroundImage: {
        'gradient-river': 'var(--river-gradient-primary)',
        'gradient-success': 'var(--river-gradient-success)',
        'gradient-danger': 'var(--river-gradient-danger)',
        'gradient-surface': 'var(--river-gradient-surface)',
        'gradient-brand': 'linear-gradient(135deg, var(--river-blue-dark) 0%, var(--river-blue-main) 35%, var(--river-blue-light) 65%, var(--river-accent) 100%)',
        'gradient-premium': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 25%, #2563eb 50%, #0891b2 75%, #06b6d4 100%)',
        'gradient-trading-active': 'linear-gradient(45deg, var(--river-blue-main), var(--river-accent), var(--river-blue-light), var(--river-blue-main))',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Add support for CSS custom properties
    function({ addUtilities, addComponents }) {
      const newUtilities = {
        '.transform-gpu': {
          transform: 'translateZ(0)',
        },
        '.backface-hidden': {
          'backface-visibility': 'hidden',
        },
        '.perspective-1000': {
          perspective: '1000px',
        },
        '.will-change-transform': {
          'will-change': 'transform',
        },
        '.will-change-auto': {
          'will-change': 'auto',
        },
        '.font-variant-numeric-tabular': {
          'font-variant-numeric': 'tabular-nums',
        },
        '.text-shadow-glow': {
          'text-shadow': '0 0 12px currentColor',
        },
        // 触摸友好的工具类
        '.touch-target': {
          'min-height': '44px',
          'min-width': '44px',
          'padding': '8px',
        },
        '.touch-target-sm': {
          'min-height': '36px',
          'min-width': '36px',
          'padding': '6px',
        },
        '.mobile-touch-friendly': {
          'min-height': '44px',
          'touch-action': 'manipulation',
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.touch-safe-area': {
          'margin': '8px',
        },
        // 单手操作优化
        '.thumb-zone': {
          'position': 'fixed',
          'bottom': '20px',
          'right': '20px',
          'z-index': '50',
        },
        // 响应式触摸目标
        '.responsive-touch': {
          '@media (hover: none) and (pointer: coarse)': {
            'min-height': '44px',
            'min-width': '44px',
            'padding': '8px',
          },
        },
      };
      
      const newComponents = {
        '.btn-river': {
          '@apply bg-gradient-to-r from-river-blue-main to-river-blue-light text-white font-semibold px-6 py-2 rounded-xl shadow-elevation-2 hover:shadow-elevation-4 transition-all duration-300 transform hover:scale-105': {},
        },
        '.card-river': {
          '@apply bg-surface-1 border border-border-default rounded-xl shadow-elevation-2 hover:shadow-elevation-3 transition-all duration-300': {},
        },
        '.text-river-gradient': {
          '@apply bg-gradient-to-r from-river-blue-main via-river-blue-light to-river-accent bg-clip-text text-transparent': {},
        },
      };
      
      addUtilities(newUtilities);
      addComponents(newComponents);
    }
  ],
}



