/**
 * TradingSettings - 交易设置组件
 * 从 TradingPage 中拆分出来的交易设置面板
 * 使用 RiverBit Liquid Glass 设计系统升级
 */

import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Target, Shield, Settings, Plus, Minus, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import LiquidGlassCard from '../ui/LiquidGlassCard';
import { TRADING_CONFIG, NETWORK_CONFIG, TRADING_UTILS } from '../../constants/tradingConstants';
import { useRiverBitWeb3 } from '../../providers/RiverBitWeb3Provider';

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
  
  // Web3 integration for real account data
  const {
    isConnected: web3Connected,
    accountInfo,
    usdcBalance,
    ethBalance,
    isValidNetwork,
    allowance,
    hasInfiniteAllowance,
    approveUSDC,
    isLoadingAccount
  } = useRiverBitWeb3();
  
  // Format balance display
  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };
  
  // Handle USDC approval
  const handleApproveUSDC = async () => {
    try {
      await approveUSDC('1000000'); // Approve 1M USDC
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };
  
  return (
    <LiquidGlassCard 
      variant="trading" 
      className="border-b border-default/30 px-4 xl:px-6 py-3 xl:py-4 rounded-none border-x-0 border-t-0"
      interactive={false}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-primary font-semibold flex items-center space-x-2">
          <div className="relative">
            <Target className="w-4 h-4 text-river-blue-400" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-river-blue-400 rounded-full animate-pulse" />
          </div>
          <span className="bg-gradient-to-r from-river-blue-400 to-river-blue-300 bg-clip-text text-transparent">
            {web3Connected ? 'Live Trading Settings' : 'Trading Settings'}
          </span>
          {web3Connected && (
            <Badge variant="outline" className={`text-xs ml-2 ${
              isValidNetwork ? 'border-green-400/50 text-green-400' : 'border-orange-400/50 text-orange-400'
            }`}>
              {isValidNetwork ? 'Live' : 'Wrong Network'}
            </Badge>
          )}
        </span>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 w-7 p-0 text-secondary hover:text-river-blue-400 hover:bg-river-blue-500/10 rounded-lg border border-transparent hover:border-river-blue-500/20 transition-all duration-200 group"
        >
          <Settings className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
        </Button>
      </div>
      
      <div className="flex flex-col space-y-3 xl:flex-row xl:items-center xl:justify-between xl:space-y-0 xl:space-x-4">
        {/* 保证金模式选择器 */}
        <LiquidGlassCard variant="subtle" className="flex items-center space-x-3 px-3 py-2.5 flex-1 lg:flex-none">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-river-blue-400" />
            <span className="text-xs text-secondary font-medium whitespace-nowrap hidden sm:inline">Margin Mode:</span>
            <span className="text-xs text-secondary font-medium whitespace-nowrap sm:hidden">Mode:</span>
          </div>
          <div className="relative flex bg-surface-3/50 rounded-lg p-1 border border-default/40 shadow-inner flex-1 lg:flex-none backdrop-blur-sm">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMarginMode(TRADING_CONFIG.MARGIN_MODES.CROSS)}
              className={`h-6 text-xs px-3 lg:px-4 rounded-md transition-all duration-300 font-semibold relative flex-1 lg:flex-none group ${
                marginMode === TRADING_CONFIG.MARGIN_MODES.CROSS
                  ? 'bg-gradient-to-r from-river-blue-500 to-river-blue-400 text-white shadow-lg border border-river-blue-400/50 shadow-river-blue-500/20'
                  : 'text-muted hover:text-river-blue-400 hover:bg-river-blue-500/10 hover:border-river-blue-500/20'
              }`}
              title="Cross Margin: Share margin across all positions"
            >
              {marginMode === TRADING_CONFIG.MARGIN_MODES.CROSS && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-river-blue-300 rounded-full animate-pulse shadow-lg" />
              )}
              <span className="hidden sm:inline">Cross</span>
              <span className="sm:hidden">C</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMarginMode(TRADING_CONFIG.MARGIN_MODES.ISOLATED)}
              className={`h-6 text-xs px-3 lg:px-4 rounded-md transition-all duration-300 font-semibold relative flex-1 lg:flex-none group ${
                marginMode === TRADING_CONFIG.MARGIN_MODES.ISOLATED
                  ? 'bg-gradient-to-r from-precision-orange-500 to-precision-orange-400 text-white shadow-lg border border-precision-orange-400/50 shadow-precision-orange-500/20'
                  : 'text-muted hover:text-precision-orange-400 hover:bg-precision-orange-500/10 hover:border-precision-orange-500/20'
              }`}
              title="Isolated Margin: Use fixed margin per position"
            >
              {marginMode === TRADING_CONFIG.MARGIN_MODES.ISOLATED && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-precision-orange-300 rounded-full animate-pulse shadow-lg" />
              )}
              <span className="hidden sm:inline">Isolated</span>
              <span className="sm:hidden">I</span>
            </Button>
          </div>
        </LiquidGlassCard>
        
        {/* 杠杆快捷控制 */}
        <LiquidGlassCard variant="subtle" className="flex items-center space-x-3 px-3 py-2.5 flex-1 lg:flex-none">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Zap className="w-4 h-4 text-river-blue-400" />
              <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-river-blue-400 rounded-full animate-pulse" />
            </div>
            <span className="text-xs text-secondary font-medium whitespace-nowrap hidden sm:inline">Leverage:</span>
            <span className="text-xs text-secondary font-medium whitespace-nowrap sm:hidden">Lev:</span>
          </div>
          <div className="flex items-center bg-surface-3/50 rounded-lg px-3 py-1.5 border border-default/40 shadow-inner flex-1 lg:flex-none justify-center lg:justify-start backdrop-blur-sm">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-5 w-5 p-0 text-muted hover:text-secondary hover:bg-surface-3/80 rounded-md transition-all duration-200 group border border-transparent hover:border-default/30"
              onClick={() => setLeverage(Math.max(TRADING_CONFIG.MIN_LEVERAGE, leverage - 1))}
              title="Decrease leverage"
            >
              <Minus className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" />
            </Button>
            <div className="flex items-center mx-3">
              <span className={`text-sm font-bold min-w-[32px] text-center transition-all duration-200 ${TRADING_UTILS.getRiskColor(leverage)}`}>
                {leverage}x
              </span>
              <div className={`w-1.5 h-1.5 rounded-full ml-2 transition-all duration-200 ${
                leverage <= 10 ? 'bg-digital-green-400 shadow-lg shadow-digital-green-400/50' :
                leverage <= 50 ? 'bg-precision-orange-400 shadow-lg shadow-precision-orange-400/50' :
                'bg-critical-red-400 shadow-lg shadow-critical-red-400/50'
              } animate-pulse`}></div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-5 w-5 p-0 text-muted hover:text-secondary hover:bg-surface-3/80 rounded-md transition-all duration-200 group border border-transparent hover:border-default/30"
              onClick={() => setLeverage(Math.min(TRADING_CONFIG.MAX_LEVERAGE, leverage + 1))}
              title="Increase leverage"
            >
              <Plus className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" />
            </Button>
          </div>
        </LiquidGlassCard>
        
        {/* 钱包状态显示 */}
        {isWalletConnected && (
          <LiquidGlassCard variant="nano" className="flex items-center space-x-3 px-3 py-2.5">
            <Badge 
              variant={currentChainId === NETWORK_CONFIG.ARBITRUM_SEPOLIA_CHAIN_ID ? "default" : "destructive"}
              className={`text-xs h-6 px-3 font-medium transition-all duration-200 border ${
                currentChainId === NETWORK_CONFIG.ARBITRUM_SEPOLIA_CHAIN_ID 
                  ? 'bg-digital-green-500/20 text-digital-green-400 border-digital-green-500/30 shadow-sm shadow-digital-green-500/20' 
                  : 'bg-critical-red-500/20 text-critical-red-400 border-critical-red-500/30 shadow-sm shadow-critical-red-500/20'
              }`}
            >
              {currentChainId === NETWORK_CONFIG.ARBITRUM_SEPOLIA_CHAIN_ID ? 'Arbitrum Sepolia' : 'Wrong Network'}
            </Badge>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-secondary font-mono bg-surface-3/50 px-2 py-1 rounded border border-default/40">
                {web3Connected ? TRADING_UTILS.formatAddress(walletAddress) : TRADING_UTILS.formatAddress(walletAddress)}
              </span>
              {web3Connected && accountInfo && (
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-green-400 font-mono bg-green-400/10 px-2 py-1 rounded border border-green-400/20">
                    {formatBalance(accountInfo.equity)} USD
                  </div>
                  {!hasInfiniteAllowance && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleApproveUSDC}
                      className="h-6 px-2 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 rounded-md transition-all duration-200 border border-orange-400/20"
                      title="Approve USDC for trading"
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                  )}
                  {hasInfiniteAllowance && (
                    <div className="text-xs text-green-400 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approved
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefreshAccount}
              className="h-6 w-6 p-0 text-muted hover:text-river-blue-400 hover:bg-river-blue-500/10 rounded-md transition-all duration-200 group border border-transparent hover:border-river-blue-500/20"
              title="Refresh account data"
            >
              <Shield className="w-3 h-3 transition-transform duration-200 group-hover:rotate-12" />
            </Button>
          </LiquidGlassCard>
        )}
      </div>
    </LiquidGlassCard>
  );
}