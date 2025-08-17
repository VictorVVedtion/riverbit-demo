import React, { useState, useEffect } from 'react';
import PersonalPage from './components/pages/PersonalPage';
import TradingPage from './components/pages/TradingPage';
import EliteTradingPage from './components/pages/EliteTradingPage';
import RiverPoolPage from './components/pages/RiverPoolPage';
import ReferralPage from './components/pages/ReferralPage';
import TradingSubsidyPage from './components/pages/TradingSubsidyPage';
import DevPage from './components/pages/DevPage';
import CommunityLeaderPage from './components/pages/CommunityLeaderPage';
// Testnet components moved to archive
// import TestNetPage from './components/pages/TestNetPage';
// import USDCFaucetPage from './components/pages/USDCFaucetPage';
import ShortcutHelp from './components/ShortcutHelp';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { Button } from './components/ui/button';
import { connectWallet, disconnectWallet, toggleFavorite } from './utils/helpers';
import { HelpCircle, Wallet, Check, User, TrendingUp, Briefcase, Waves, Gift, DollarSign, Users, Settings as SettingsIcon, Sparkles, Menu, X } from 'lucide-react';
import RiverBitLogo from './components/RiverBitLogo';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

// 新增Web3组件 - 使用现有的组件
// import Web3Connection from './components/Web3Connection';
import LiquidBentoTradingInterface from './components/LiquidBentoTradingInterface';
// import TradingInterface from './components/TradingInterface';
// Web3 providers moved to archive for frontend-focused development
// import { web3Manager } from './utils/web3Utils';
// import RiverBitWeb3Provider, { useRiverBitWeb3 } from './providers/RiverBitWeb3Provider';

// 新用户体验组件 - 已禁用，用户不喜欢
// import NewUserOnboarding from './components/onboarding/NewUserOnboarding';
// import SmartTooltipSystem from './components/onboarding/SmartTooltipSystem';
// import { useNewUserExperience } from './hooks/useNewUserExperience';

// Trading Notifications temporarily disabled for frontend demo

const App = () => {
  // New user experience hook - 已禁用
  // 新用户体验相关代码 - 用户不喜欢引导弹窗
  // const {
  //   shouldShowOnboarding,
  //   markOnboardingComplete,
  //   markWalletConnected,
  //   markFirstTrade,
  //   markRiverPoolUsed,
  //   markAIUsed
  // } = useNewUserExperience();

  // Global state
  const [currentPage, setCurrentPage] = useState('trading'); // 默认显示交易页面
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedTradingPair, setSelectedTradingPair] = useState('BTC/USDT');
  const [marginMode, setMarginMode] = useState('isolated');
  const [autoReinvest, setAutoReinvest] = useState(false);
  const [favoriteAssets, setFavoriteAssets] = useState(['BTC/USDT', 'ETH/USDT']);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  // 快捷键帮助状态
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  
  // Mobile navigation state
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Web3连接状态
  const [web3Connected, setWeb3Connected] = useState(false);
  const [web3Address, setWeb3Address] = useState('');

  // 新用户引导状态
  // const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);

  // Helper function bindings
  const handleConnectWallet = () => connectWallet(setIsWalletConnected, setWalletAddress);
  const handleDisconnectWallet = () => disconnectWallet(setIsWalletConnected, setWalletAddress);
  const handleToggleFavorite = (symbol: string) => toggleFavorite(symbol, favoriteAssets, setFavoriteAssets);

  // Web3连接处理
  const handleWeb3ConnectionChange = (connected: boolean, address?: string) => {
    setWeb3Connected(connected);
    setWeb3Address(address || '');
  };

  // 处理钱包连接
  const handleNavWalletConnect = async () => {
    try {
      const { address } = await web3Manager.connectWallet();
      setWeb3Connected(true);
      setWeb3Address(address);
      // 标记钱包已连接（新用户体验） - 已禁用
      // markWalletConnected();
    } catch (error) {
      // TODO: Implement proper error handling and user notification
      // Consider using a toast notification or error state
    }
  };

  // 处理钱包断开
  const handleNavWalletDisconnect = () => {
    setWeb3Connected(false);
    setWeb3Address('');
  };

  // 处理页面导航
  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    
    // 标记相关功能使用（新用户体验） - 已禁用
    // if (page === 'riverpool') {
    //   markRiverPoolUsed();
    // }
  };

  // 处理新用户引导完成 - 已禁用
  // const handleOnboardingComplete = () => {
  //   setShowOnboarding(false);
  //   markOnboardingComplete();
  // };

  // 检查是否显示引导 - 已禁用，用户不喜欢引导弹窗
  // useEffect(() => {
  //   if (shouldShowOnboarding) {
  //     setShowOnboarding(true);
  //   }
  // }, [shouldShowOnboarding]);

  // 全局快捷键处理
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+H 或 Cmd+Shift+H 打开快捷键帮助
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
        event.preventDefault();
        setShowShortcutHelp(true);
      }
      
      // ? 键显示帮助
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // 确保不在输入框中
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          return;
        }
        event.preventDefault();
        setShowShortcutHelp(true);
      }
      
      // ESC key closes mobile menu
      if (event.key === 'Escape' && showMobileMenu) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showMobileMenu]);

  // Close mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMobileMenu && event.target instanceof Element) {
        const nav = event.target.closest('nav');
        if (!nav) {
          setShowMobileMenu(false);
        }
      }
    };

    if (showMobileMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMobileMenu]);

  // Navigation component - Professional Exchange Navigation with River Theme
  const Navigation = () => {
    // Web3 integration temporarily disabled for frontend development
    const web3Connected = false;
    const web3Address = '';
    const accountInfo = null;
    const isValidNetwork = true;
    
    const connectWallet = () => {
      toast.info('Wallet connection temporarily disabled for frontend demo');
    };
    
    const disconnectWallet = () => {
      toast.info('Wallet already disconnected in frontend demo mode');
    };
    
    const switchToValidNetwork = () => {
      toast.info('Network switching temporarily disabled for frontend demo');
    };
    
    return (
    <nav className="h-20 flex-shrink-0 relative z-50 shadow-trading overflow-hidden liquid-glass-navigation">
      {/* Liquid Glass Morphism Layer - Matching Main Interface */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 via-slate-800/10 to-slate-900/20 backdrop-blur-xl"></div>
      
      {/* Professional River-themed Bottom Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-600/30 via-slate-500/20 to-transparent"></div>
      
      {/* Subtle Inner Reflection - Professional Glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none"></div>
      
      <div className="px-6 lg:px-8 h-full relative z-10">
        <div className="flex items-center justify-between h-full">
          {/* Left Section - Professional Logo and Navigation */}
          <div className="flex items-center space-x-8 lg:space-x-12">
            {/* RiverBit Logo - Professional Branding */}
            <div className="flex items-center space-x-3">
              <RiverBitLogo 
                size="large" 
                priority={true}
                className="h-12 w-auto riverbit-logo high-dpi-sharp filter drop-shadow-lg" 
              />
              <div className="hidden md:block h-6 w-px bg-gradient-to-b from-transparent via-slate-600/40 to-transparent"></div>
            </div>
            
            {/* Professional Navigation Menu - River Theme Integration */}
            <div className="hidden lg:flex items-center space-x-1">
              {[
                { id: 'trading', label: 'Trade', icon: TrendingUp },
                { id: 'personal', label: 'Portfolio', icon: User },
                { id: 'riverpool', label: 'RiverPool', icon: Waves },
                { id: 'referral', label: 'Earn', icon: Gift },
                { id: 'dev', label: 'More', icon: SettingsIcon },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group ${
                    currentPage === item.id
                      ? 'bg-slate-800/40 text-slate-200 border border-slate-600/30 shadow-lg backdrop-blur-md liquid-glass-active'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/25 hover:backdrop-blur-md hover:border hover:border-slate-700/20 liquid-glass-subtle'
                  }`}
                >
                  {/* Active State Glow Effect */}
                  {currentPage === item.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-700/20 via-slate-600/30 to-slate-700/20 rounded-xl"></div>
                  )}
                  
                  {/* Hover Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  
                  <span className="flex items-center space-x-2 relative z-10">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 p-2 backdrop-blur-md rounded-lg border border-transparent hover:border-slate-700/20 liquid-glass-subtle"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
          
          {/* Right Section - Professional Wallet & Account */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Enhanced Wallet Connection with Glassmorphism */}
            {web3Connected ? (
              <div className="flex items-center space-x-3">
                {accountInfo && (
                  <div className="hidden lg:block text-right px-3 py-2 rounded-lg bg-slate-800/20 backdrop-blur-md border border-slate-700/20">
                    <div className="text-xs text-slate-400">Balance</div>
                    <div className="text-sm font-mono font-semibold text-slate-200">
                      ${parseFloat(accountInfo.equity).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                <Button 
                  variant="outline"
                  onClick={disconnectWallet}
                  className={`bg-slate-800/30 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-400/50 px-4 py-2 backdrop-blur-md transition-all duration-300 liquid-glass-success ${
                    !isValidNetwork ? 'border-orange-400/30 text-orange-400 hover:bg-orange-500/10' : ''
                  }`}
                  data-wallet-button
                >
                  <div className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
                    isValidNetwork ? 'bg-green-400' : 'bg-orange-400'
                  }`}></div>
                  <span className="font-mono text-sm">
                    {web3Address?.slice(0, 6)}...{web3Address?.slice(-4)}
                  </span>
                </Button>
                {!isValidNetwork && (
                  <Button 
                    onClick={switchToValidNetwork}
                    size="sm"
                    className="bg-orange-600/80 hover:bg-orange-700/90 text-white backdrop-blur-md border border-orange-500/30"
                  >
                    Switch Network
                  </Button>
                )}
              </div>
            ) : (
              <Button 
                onClick={connectWallet}
                className="bg-slate-800/30 hover:bg-slate-700/40 text-slate-300 hover:text-slate-200 border border-slate-600/30 hover:border-slate-500/40 px-4 py-2 font-medium transition-all duration-300 backdrop-blur-md shadow-lg liquid-glass-button"
                data-wallet-button
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            )}
            
            {/* Help Button with Glassmorphism */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowShortcutHelp(true)}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 p-2 transition-all duration-300 backdrop-blur-md rounded-lg border border-transparent hover:border-slate-700/20 liquid-glass-subtle"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            
            {/* Enhanced Status Badge with Professional Glassmorphism */}
            <div className="hidden xl:flex items-center text-xs text-slate-300 bg-slate-800/25 px-3 py-2 rounded-lg border border-slate-700/20 shadow-lg backdrop-blur-md liquid-glass-status">
              <div className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
                web3Connected && isValidNetwork ? 'bg-green-400' : web3Connected ? 'bg-orange-400' : 'bg-slate-400'
              }`}></div>
              <span className="font-medium">
                {web3Connected && isValidNetwork ? 'Live Trading' : web3Connected ? 'Wrong Network' : 'Demo Mode'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation Menu - Professional Glassmorphism */}
      {showMobileMenu && (
        <div className="lg:hidden absolute top-full left-0 right-0 z-50 bg-gradient-to-br from-slate-950/98 via-slate-900/95 to-slate-950/98 backdrop-blur-xl border-b border-slate-800/30 liquid-glass-navigation">
          <div className="px-6 py-6 space-y-4">
            {/* Mobile Navigation Items */}
            <div className="space-y-2">
              {[
                { id: 'trading', label: 'Trade', icon: TrendingUp },
                { id: 'personal', label: 'Portfolio', icon: User },
                { id: 'riverpool', label: 'RiverPool', icon: Waves },
                { id: 'referral', label: 'Earn', icon: Gift },
                { id: 'dev', label: 'More', icon: SettingsIcon },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    handleNavigate(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-300 relative overflow-hidden group ${
                    currentPage === item.id
                      ? 'bg-slate-800/40 text-slate-200 border border-slate-600/30 shadow-lg backdrop-blur-md liquid-glass-active'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/25 hover:backdrop-blur-md hover:border hover:border-slate-700/20 liquid-glass-subtle'
                  }`}
                >
                  {/* Active State Glow Effect */}
                  {currentPage === item.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-700/20 via-slate-600/30 to-slate-700/20 rounded-xl"></div>
                  )}
                  
                  {/* Hover Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  
                  <span className="flex items-center space-x-3 relative z-10">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </span>
                </button>
              ))}
            </div>
            
            {/* Mobile Wallet Section */}
            <div className="pt-4 border-t border-slate-700/30">
              {web3Connected ? (
                <div className="space-y-3">
                  {accountInfo && (
                    <div className="px-4 py-3 rounded-lg bg-slate-800/20 backdrop-blur-md border border-slate-700/20">
                      <div className="text-xs text-slate-400">Balance</div>
                      <div className="text-sm font-mono font-semibold text-slate-200">
                        ${parseFloat(accountInfo.equity).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                  <Button 
                    variant="outline"
                    onClick={disconnectWallet}
                    className="w-full bg-slate-800/30 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-400/50 backdrop-blur-md transition-all duration-300 liquid-glass-success"
                  >
                    <div className="w-2 h-2 rounded-full mr-2 animate-pulse bg-green-400"></div>
                    <span className="font-mono text-sm">
                      {web3Address?.slice(0, 6)}...{web3Address?.slice(-4)}
                    </span>
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => {
                    connectWallet();
                    setShowMobileMenu(false);
                  }}
                  className="w-full bg-slate-800/30 hover:bg-slate-700/40 text-slate-300 hover:text-slate-200 border border-slate-600/30 hover:border-slate-500/40 font-medium transition-all duration-300 backdrop-blur-md shadow-lg liquid-glass-button"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
              
              {/* Mobile Help Button */}
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowShortcutHelp(true);
                  setShowMobileMenu(false);
                }}
                className="w-full mt-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-all duration-300 backdrop-blur-md liquid-glass-subtle"
              >
                <HelpCircle className="w-5 h-5 mr-2" />
                Help & Shortcuts
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
    );
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'personal':
        return (
          <PersonalPage
            isWalletConnected={isWalletConnected}
            walletAddress={walletAddress}
            onConnectWallet={handleConnectWallet}
            onDisconnectWallet={handleDisconnectWallet}
            onNavigate={setCurrentPage}
          />
        );
      case 'trading':
        return (
          <EliteTradingPage
            userAddress={web3Address}
            isConnected={web3Connected}
          />
        );
      case 'riverpool':
        return (
          <RiverPoolPage
            autoReinvest={autoReinvest}
            setAutoReinvest={setAutoReinvest}
            depositAmount={depositAmount}
            setDepositAmount={setDepositAmount}
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            web3Connected={web3Connected}
            web3Address={web3Address}
          />
        );
      case 'referral':
        return <ReferralPage />;
      case 'subsidy':
        return <TradingSubsidyPage />;
      case 'community':
        return <CommunityLeaderPage />;
      // Testnet routes moved to archive
      // case 'faucet':
      //   return <USDCFaucetPage />;
      // case 'testnet':
      //   return <TestNetPage />;
      case 'dev':
        return <DevPage />;
      default:
        return (
          <PersonalPage
            isWalletConnected={isWalletConnected}
            walletAddress={walletAddress}
            onConnectWallet={handleConnectWallet}
            onDisconnectWallet={handleDisconnectWallet}
            onNavigate={setCurrentPage}
          />
        );
    }
  };

  // 统一的全屏布局 - 专业交易所风格 (Frontend Demo Mode)
  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      <Navigation />
      <div className="flex-1 overflow-y-auto bg-slate-950" data-navigation>
        {renderCurrentPage()}
        
        {/* 新用户引导 - 已禁用，用户不喜欢 */}
        {/* <NewUserOnboarding
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
          userAddress={web3Address}
          isWalletConnected={web3Connected}
          onConnectWallet={handleNavWalletConnect}
          onNavigateTo={handleNavigate}
        /> */}

        {/* 智能提示系统 - 已禁用，用户不喜欢 */}
        {/* <SmartTooltipSystem
          currentPage={currentPage}
          isWalletConnected={web3Connected}
          onNavigate={handleNavigate}
        /> */}

        {/* 快捷键帮助弹窗 */}
        <ShortcutHelp 
          open={showShortcutHelp} 
          onOpenChange={setShowShortcutHelp} 
        />
        {/* <TradingNotifications /> */}
        <Toaster position="top-right" richColors />
      </div>
    </div>
  );
};

export default App;