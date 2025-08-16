/**
 * TradingSettings - 交易设置组件
 * 从 TradingPage 中拆分出来的交易设置面板
 */

import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Target, Shield, Settings, Plus, Minus } from 'lucide-react';
import { TRADING_CONFIG, NETWORK_CONFIG, TRADING_UTILS } from '../../constants/tradingConstants';

interface TradingSettingsProps {
  marginMode: string;
  setMarginMode: (mode: string) => void;
  leverage: number;
  setLeverage: (leverage: number) => void;
  isWalletConnected: boolean;
  currentChainId: number | null;
  walletAddress: string;
  onRefreshAccount: () => void;
}

export default function TradingSettings({
  marginMode,
  setMarginMode,
  leverage,
  setLeverage,
  isWalletConnected,
  currentChainId,
  walletAddress,
  onRefreshAccount
}: TradingSettingsProps) {
  
  return (
    <div className="border-b border-default/50 bg-gradient-to-r from-surface-1 to-surface-2/50 px-4 xl:px-5 py-2 xl:py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-secondary font-semibold flex items-center space-x-2">
          <Target className="w-4 h-4" />
          <span>Trading Settings</span>
        </span>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-6 w-6 p-0 text-secondary hover:text-primary hover:bg-surface-3 rounded-md border border-transparent hover:border-default/30 transition-all"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="flex flex-col space-y-2 xl:flex-row xl:items-center xl:justify-between xl:space-y-0 xl:space-x-3">
        {/* 保证金模式选择器 */}
        <div className="flex items-center space-x-2 flex-1 lg:flex-none">
          <div className="flex items-center space-x-1">
            <Shield className="w-3 h-3 text-muted" />
            <span className="text-xs text-muted whitespace-nowrap hidden sm:inline">Margin:</span>
            <span className="text-xs text-muted whitespace-nowrap sm:hidden">M:</span>
          </div>
          <div className="relative flex bg-surface-2 rounded-lg p-0.5 border border-default shadow-sm flex-1 lg:flex-none">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMarginMode(TRADING_CONFIG.MARGIN_MODES.CROSS)}
              className={`h-5 text-xs px-2 lg:px-3 rounded-md transition-all duration-200 font-medium relative flex-1 lg:flex-none ${
                marginMode === TRADING_CONFIG.MARGIN_MODES.CROSS
                  ? 'bg-river-blue text-primary shadow-md border border-river-blue'
                  : 'text-muted hover:text-river-blue hover:bg-river-blue/15'
              }`}
              title="Cross Margin: Share margin across all positions"
            >
              {marginMode === TRADING_CONFIG.MARGIN_MODES.CROSS && (
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-river-blue rounded-full animate-pulse" />
              )}
              <span className="hidden sm:inline">Cross</span>
              <span className="sm:hidden">C</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMarginMode(TRADING_CONFIG.MARGIN_MODES.ISOLATED)}
              className={`h-5 text-xs px-2 lg:px-3 rounded-md transition-all duration-200 font-medium relative flex-1 lg:flex-none ${
                marginMode === TRADING_CONFIG.MARGIN_MODES.ISOLATED
                  ? 'bg-loss text-primary shadow-md border border-loss'
                  : 'text-muted hover:text-loss hover:bg-loss/15'
              }`}
              title="Isolated Margin: Use fixed margin per position"
            >
              {marginMode === TRADING_CONFIG.MARGIN_MODES.ISOLATED && (
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-loss rounded-full animate-pulse" />
              )}
              <span className="hidden sm:inline">Isolated</span>
              <span className="sm:hidden">I</span>
            </Button>
          </div>
        </div>
        
        {/* 杠杆快捷控制 */}
        <div className="flex items-center space-x-2 flex-1 lg:flex-none">
          <div className="flex items-center space-x-1">
            <Target className="w-3 h-3 text-muted" />
            <span className="text-xs text-muted whitespace-nowrap hidden sm:inline">Leverage:</span>
            <span className="text-xs text-muted whitespace-nowrap sm:hidden">L:</span>
          </div>
          <div className="flex items-center bg-surface-2 rounded-lg px-2 py-1 border border-default shadow-sm flex-1 lg:flex-none justify-center lg:justify-start">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-4 w-4 p-0 text-muted hover:text-secondary hover:bg-surface-3 rounded transition-all"
              onClick={() => setLeverage(Math.max(TRADING_CONFIG.MIN_LEVERAGE, leverage - 1))}
              title="Decrease leverage"
            >
              <Minus className="w-3 h-3" />
            </Button>
            <div className="flex items-center mx-2">
              <span className={`text-xs font-bold min-w-[28px] text-center ${TRADING_UTILS.getRiskColor(leverage)}`}>
                {leverage}x
              </span>
              <div className={`w-1 h-1 rounded-full ml-1 ${
                leverage <= 10 ? 'bg-profit' :
                leverage <= 50 ? 'bg-loss' :
                'bg-danger'
              } animate-pulse`}></div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-4 w-4 p-0 text-muted hover:text-secondary hover:bg-surface-3 rounded transition-all"
              onClick={() => setLeverage(Math.min(TRADING_CONFIG.MAX_LEVERAGE, leverage + 1))}
              title="Increase leverage"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* 钱包状态显示 */}
        {isWalletConnected && (
          <div className="flex items-center space-x-2">
            <Badge 
              variant={currentChainId === NETWORK_CONFIG.ARBITRUM_SEPOLIA_CHAIN_ID ? "default" : "destructive"}
              className="text-xs h-5 px-2"
            >
              {currentChainId === NETWORK_CONFIG.ARBITRUM_SEPOLIA_CHAIN_ID ? 'Arbitrum Sepolia' : 'Wrong Network'}
            </Badge>
            <span className="text-xs text-muted">
              {TRADING_UTILS.formatAddress(walletAddress)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefreshAccount}
              className="h-5 w-5 p-0 text-muted hover:text-primary"
              title="Refresh account data"
            >
              <Shield className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}