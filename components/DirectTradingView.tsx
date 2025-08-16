import React from 'react';

interface DirectTradingViewProps {
  symbol?: string;
  theme?: "light" | "dark";
  interval?: string;
  width?: string;
  height?: string;
}

const DirectTradingView: React.FC<DirectTradingViewProps> = ({
  symbol = "BINANCE:BTCUSDT",
  theme = "dark", 
  interval = "1h",
  width = "100%",
  height = "100%"
}) => {
  // 转换symbol格式
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

  const formattedSymbol = formatSymbol(symbol);
  
  // 构建iframe URL - 直接使用TradingView的embed服务
  const iframeUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_${Date.now()}&symbol=${formattedSymbol}&interval=${interval}&hidesidetoolbar=1&hidetrading=1&theme=${theme}&style=1&timezone=Etc%2FUTC&locale=en&toolbar_bg=%23f1f3f6&enable_publishing=0&withdateranges=1&range=YTD&hide_volume=0&hide_legend=0&save_image=0&studies=[]&show_popup_button=0&popup_width=1000&popup_height=650&details=1&hotlist=1&calendar=0&allow_symbol_change=1`;

  return (
    <div 
      className="tradingview-container"
      style={{ 
        width: width, 
        height: height,
        minHeight: '400px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <iframe
        src={iframeUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff'
        }}
        title={`TradingView Chart - ${symbol}`}
        frameBorder="0"
        allowTransparency={true}
        scrolling="no"
        allowFullScreen={true}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
      
      {/* 版权信息 */}
      <div 
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          height: '32px',
          background: 'rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          color: '#9598A1'
        }}
      >
        <a 
          href={`https://www.tradingview.com/symbols/${formattedSymbol}/`}
          rel="noopener nofollow" 
          target="_blank"
          style={{ color: '#9598A1', textDecoration: 'none' }}
        >
          <span>{formattedSymbol} Chart</span> by TradingView
        </a>
      </div>
    </div>
  );
};

export default DirectTradingView;