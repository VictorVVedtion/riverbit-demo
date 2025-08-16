import React, { useEffect, useRef, memo, useState } from 'react';

export interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  theme?: 'dark' | 'light';
  width?: string | number;
  height?: string | number;
  locale?: string;
  timezone?: string;
  style?: string;
  toolbar_bg?: string;
  enable_publishing?: boolean;
  allow_symbol_change?: boolean;
  hide_side_toolbar?: boolean;
  hide_top_toolbar?: boolean;
  hide_legend?: boolean;
  save_image?: boolean;
  container_id?: string;
  autosize?: boolean;
  studies?: string[];
  show_popup_button?: boolean;
  popup_width?: string;
  popup_height?: string;
  no_referral_id?: boolean;
  className?: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol = 'BINANCE:BTCUSDT',
  interval = '1h',
  theme = 'dark',
  width = '100%',
  height = '100%',
  locale = 'en',
  timezone = 'Etc/UTC',
  style = '1',
  toolbar_bg = theme === 'dark' ? '#1a1a1a' : '#ffffff',
  enable_publishing = false,
  allow_symbol_change = false,
  hide_side_toolbar = true,
  hide_top_toolbar = false,
  hide_legend = true,
  save_image = false,
  container_id,
  autosize = true,
  studies = [],
  show_popup_button = false,
  popup_width = '1000',
  popup_height = '650',
  no_referral_id = true,
  className = ''
}) => {
  const container = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!container.current) return;

    setIsLoading(true);
    setHasError(false);

    // Generate unique container ID
    const containerId = `tradingview_${Math.random().toString(36).substr(2, 9)}`;
    
    // Clear any existing content
    container.current.innerHTML = '';
    
    // Create the widget container div
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.id = containerId;
    container.current.appendChild(widgetDiv);

    // Create and configure the script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    
    // TradingView widget configuration - optimized for flex container sizing
    const widgetConfig = {
      autosize: true,
      width: "100%",
      height: "100%",
      symbol: symbol,
      interval: interval,
      timezone: timezone,
      theme: theme,
      style: style,
      locale: locale,
      toolbar_bg: toolbar_bg,
      enable_publishing: false,
      allow_symbol_change: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: true,
      save_image: false,
      studies: [],
      show_popup_button: false,
      popup_width: '1000',
      popup_height: '650',
      no_referral_id: true,
      container_id: containerId,
      range: "12M",
      hide_volume: false,
      details: true,
      hotlist: false,
      calendar: false,
      withdateranges: true
    };

    // Set the script content as JSON configuration
    script.innerHTML = JSON.stringify(widgetConfig);
    
    // Handle script loading
    script.onload = () => {
      setTimeout(() => setIsLoading(false), 2000); // Give TradingView time to render
    };
    
    script.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };
    
    // Append script to the widget div
    widgetDiv.appendChild(script);

    // Store reference for cleanup
    widgetRef.current = { container: widgetDiv, script };

    // Cleanup function
    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
      widgetRef.current = null;
    };
  }, [symbol, interval, theme, toolbar_bg]);

  return (
    <div 
      className={`tradingview-widget-container bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60 rounded-2xl overflow-hidden relative premium-chart-container ${className}`}
      style={{ 
        width: '100%',
        height: '100%',
        position: 'relative',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.25),
          0 4px 16px rgba(0, 212, 255, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 rgba(0, 0, 0, 0.1)
        `,
        border: '1px solid rgba(0, 212, 255, 0.15)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Enhanced Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-xl rounded-2xl z-10">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="w-12 h-12 border-3 border-[rgba(0,212,255,0.2)] border-t-[rgba(0,212,255,0.8)] rounded-full animate-spin shadow-[0_0_20px_rgba(0,212,255,0.3)]"></div>
              <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-t-[rgba(139,92,246,0.6)] rounded-full animate-spin animation-delay-150"></div>
            </div>
            <div className="text-base text-gray-300 font-medium tracking-wide drop-shadow-sm">
              Loading Professional Chart...
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-[rgba(0,212,255,0.6)] rounded-full animate-pulse animation-delay-0"></div>
              <div className="w-2 h-2 bg-[rgba(0,212,255,0.6)] rounded-full animate-pulse animation-delay-75"></div>
              <div className="w-2 h-2 bg-[rgba(0,212,255,0.6)] rounded-full animate-pulse animation-delay-150"></div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-xl rounded-2xl z-10">
          <div className="flex flex-col items-center space-y-6 text-center p-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/30 flex items-center justify-center shadow-[0_8px_24px_rgba(239,68,68,0.2)] border border-red-400/20">
                <svg className="w-8 h-8 text-red-400 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="absolute -inset-2 rounded-full border border-red-400/10 animate-ping opacity-75"></div>
            </div>
            <div className="space-y-2">
              <div className="text-base text-gray-300 font-medium tracking-wide drop-shadow-sm">
                Chart Loading Failed
              </div>
              <div className="text-sm text-gray-400 leading-relaxed">
                Please check your network connection
                <br />
                <span className="text-xs text-gray-500">and try again</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced TradingView Widget Container */}
      <div 
        ref={container}
        className="tradingview-widget-container__widget flex-1 relative z-0"
        style={{ 
          width: '100%', 
          height: '100%',
          flex: '1 1 auto',
          minHeight: '0',
          opacity: isLoading ? 0.2 : 1,
          transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s ease-out',
          transform: isLoading ? 'scale(0.98)' : 'scale(1)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      />

      {/* Minimal copyright notice */}
      {!isLoading && !hasError && (
        <div className="absolute bottom-2 right-2 text-xs text-slate-500 opacity-30 hover:opacity-70 transition-opacity">
          <a 
            href="https://www.tradingview.com/" 
            rel="noopener nofollow" 
            target="_blank"
            className="hover:text-river-surface transition-colors"
          >
            TradingView
          </a>
        </div>
      )}
    </div>
  );
};

export default memo(TradingViewChart);