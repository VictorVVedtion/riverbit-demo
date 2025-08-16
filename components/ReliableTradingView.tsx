import React, { useState, useEffect } from 'react';
import FallbackChart from './FallbackChart';

interface ReliableTradingViewProps {
  symbol: string;
  theme?: "light" | "dark";
  interval?: string;
  height?: number;
  width?: string;
}

const ReliableTradingView: React.FC<ReliableTradingViewProps> = ({
  symbol,
  theme = "light",
  interval = "1h",
  height,
  width = "100%",
}) => {
  const [chartType, setChartType] = useState<'tradingview' | 'iframe' | 'fallback'>('tradingview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 将交易对符号转换为TradingView格式
  const getTradingViewSymbol = (pair: string) => {
    if (pair.includes("BTC") || pair.includes("ETH") || pair.includes("SOL")) {
      return `BINANCE:${pair.replace("/", "")}`;
    }
    if (pair.startsWith("x")) {
      const stockSymbol = pair.slice(1).split("/")[0];
      return `NASDAQ:${stockSymbol}`;
    }
    return `BINANCE:${pair.replace("/", "")}`;
  };

  const tradingViewSymbol = getTradingViewSymbol(symbol);

  useEffect(() => {
    // 检测网络连接
    const checkNetwork = async () => {
      try {
        const response = await fetch('https://www.google.com/favicon.ico', { 
          mode: 'no-cors',
          cache: 'no-cache'
        });
        return true;
      } catch {
        return false;
      }
    };

    const initChart = async () => {
      setLoading(true);
      setError(null);

      // 检查网络连接
      const hasNetwork = await checkNetwork();
      if (!hasNetwork) {
        setError('网络连接不可用');
        setChartType('fallback');
        setLoading(false);
        return;
      }

      // 尝试加载TradingView
      try {
        // 等待一段时间让TradingView脚本加载
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (typeof window.TradingView !== 'undefined') {
          setChartType('tradingview');
        } else {
          // 尝试iframe方式
          setChartType('iframe');
        }
      } catch (err) {
        console.warn('TradingView加载失败，使用备用方案:', err);
        setChartType('fallback');
      } finally {
        setLoading(false);
      }
    };

    initChart();
  }, [symbol]);

  // 加载状态
  if (loading) {
    return (
      <div className="w-full h-full min-h-[400px] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">正在加载图表...</div>
          <div className="text-sm text-gray-500 mt-2">{symbol}</div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="w-full h-full min-h-[400px] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <div className="text-gray-600 mb-2">图表加载失败</div>
          <div className="text-sm text-gray-500 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // iframe 方式
  if (chartType === 'iframe') {
    const iframeSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_${Date.now()}&symbol=${tradingViewSymbol}&interval=${interval}&hidesidetoolbar=1&hidetrading=1&theme=${theme}&style=1&timezone=Asia%2FShanghai&locale=zh_CN&toolbar_bg=%23f1f3f6&enable_publishing=0&withdateranges=1&range=1D&showpopupbutton=0&popup_width=1000&popup_height=650&save_image=0&studies=[]&hide_volume=0&hide_legend=0&show_popup_button=0&popup_width=1000&popup_height=650&allow_symbol_change=0&details=0&hotlist=0&calendar=0&hide_side_toolbar=1`;

    return (
      <div className="w-full h-full min-h-[400px] bg-white">
        <iframe
          src={iframeSrc}
          style={{
            width: width,
            height: height ? `${height}px` : '100%',
            border: 'none',
          }}
          title={`TradingView Chart - ${symbol}`}
          onError={() => setChartType('fallback')}
        />
        <style>{`
          /* 隐藏TradingView版权信息 */
          iframe[title*="TradingView"] {
            position: relative;
          }
          iframe[title*="TradingView"]::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 30px;
            background: white;
            z-index: 10;
          }
        `}</style>
      </div>
    );
  }

  // 备用图表
  if (chartType === 'fallback') {
    return <FallbackChart symbol={symbol} interval={interval} />;
  }

  // 默认显示价格信息
  return (
    <div className="w-full h-full min-h-[400px] bg-white">
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 mb-4">
            {symbol} 价格图表
          </div>
          <div className="text-gray-600 mb-4">
            当前价格: $43,250.00
          </div>
          <div className="text-green-600 font-semibold mb-4">
            +2.45% (24h)
          </div>
          <div className="space-x-2">
            <button 
              onClick={() => setChartType('iframe')}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              尝试加载图表
            </button>
            <button 
              onClick={() => setChartType('fallback')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              查看备用图表
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReliableTradingView;
