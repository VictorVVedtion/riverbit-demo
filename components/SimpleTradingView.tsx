import React, { useEffect, useRef } from 'react';

interface SimpleTradingViewProps {
  symbol?: string;
  theme?: "light" | "dark";
  interval?: string;
  width?: string;
  height?: string;
}

const SimpleTradingView: React.FC<SimpleTradingViewProps> = ({
  symbol = "BINANCE:BTCUSDT",
  theme = "dark",
  interval = "1h",
  width = "100%",
  height = "100%"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 转换symbol格式为TradingView标准格式
  const formatSymbol = (inputSymbol: string): string => {
    // 优先检查美股 - 以x开头的是美股
    if (inputSymbol.startsWith("x")) {
      const stockSymbol = inputSymbol.slice(1).split("/")[0].toUpperCase();
      return `NASDAQ:${stockSymbol}`;
    }
    
    // 如果已经包含交易所前缀，直接使用
    if (inputSymbol.includes(":")) {
      return inputSymbol;
    }
    
    // 检查是否为加密货币
    if (inputSymbol.includes("BTC") || inputSymbol.includes("ETH") || inputSymbol.includes("SOL")) {
      return `BINANCE:${inputSymbol.replace("/", "")}`;
    }
    
    // 默认作为加密货币处理
    return `BINANCE:${inputSymbol.replace("/", "")}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 清空容器
    containerRef.current.innerHTML = '';

    // 创建脚本元素
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;

    // Widget配置 - 简化版本
    const config = {
      "autosize": true,
      "symbol": formatSymbol(symbol),
      "interval": interval,
      "timezone": "Etc/UTC",
      "theme": theme,
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#f1f3f6",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "details": true,
      "hotlist": true,
      "calendar": false,
      "hide_volume": false,
      "hide_legend": false,
      "show_popup_button": false,
      "popup_width": "1000",
      "popup_height": "650",
      "studies": [],
      "withdateranges": true,
      "range": "YTD",
      "save_image": false
    };

    script.innerHTML = JSON.stringify(config);

    // 添加到容器
    containerRef.current.appendChild(script);

    // 清理函数
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme, interval]);

  return (
    <div 
      className="tradingview-widget-container"
      style={{ 
        width: width, 
        height: height,
        minHeight: '400px',
        position: 'relative'
      }}
    >
      <div 
        ref={containerRef}
        className="tradingview-widget"
        style={{ 
          width: '100%', 
          height: '100%' 
        }}
      />
      <div className="tradingview-widget-copyright">
        <a 
          href="https://www.tradingview.com/" 
          rel="noopener nofollow" 
          target="_blank"
          style={{
            color: '#9598A1',
            textDecoration: 'none',
            fontSize: '13px'
          }}
        >
          <span className="blue-text">Track all markets on TradingView</span>
        </a>
      </div>
    </div>
  );
};

export default SimpleTradingView;