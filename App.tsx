import React, { useState, useEffect } from 'react';
import PersonalPage from './components/pages/PersonalPage';
import TradingPage from './components/pages/TradingPage';
import EliteTradingPage from './components/pages/EliteTradingPage';
import AssetsPage from './components/pages/AssetsPage';
import RiverPoolPage from './components/pages/RiverPoolPage';
import ReferralPage from './components/pages/ReferralPage';
import TradingSubsidyPage from './components/pages/TradingSubsidyPage';
import DevPage from './components/pages/DevPage';
import CommunityLeaderPage from './components/pages/CommunityLeaderPage';
import ShortcutHelp from './components/ShortcutHelp';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { Button } from './components/ui/button';
import { connectWallet, disconnectWallet, toggleFavorite } from './utils/helpers';
import { HelpCircle, Wallet, Check, User, TrendingUp, Briefcase, Waves, Gift, DollarSign, Users, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import RiverBitLogo from './components/RiverBitLogo';
import { Toaster } from './components/ui/sonner';

// 新增Web3组件
import Web3Connection from './components/Web3Connection';
import RiverPoolInterface from './components/RiverPoolInterface';
import TradingInterface from './components/TradingInterface';
import { web3Manager } from './utils/web3Utils';

// 新用户体验组件 - 已禁用，用户不喜欢
// import NewUserOnboarding from './components/onboarding/NewUserOnboarding';
// import SmartTooltipSystem from './components/onboarding/SmartTooltipSystem';
// import { useNewUserExperience } from './hooks/useNewUserExperience';

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
      // 标记钱包已连接（新用户体验）
      markWalletConnected();
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
    
    // 标记相关功能使用（新用户体验）
    if (page === 'riverpool') {
      markRiverPoolUsed();
    }
  };

  // 处理新用户引导完成
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    markOnboardingComplete();
  };

  // 检查是否显示引导
  useEffect(() => {
    if (shouldShowOnboarding) {
      setShowOnboarding(true);
    }
  }, [shouldShowOnboarding]);

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
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Navigation component - Professional Exchange Navigation with River Theme
  const Navigation = () => (
    <nav className="h-20 river-glass-base river-glass-medium border-b border-river-surface/30 flex-shrink-0 relative z-50 shadow-xl overflow-hidden">
      {/* 河流流动背景效果 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-river-surface via-river-glow to-river-surface opacity-60 animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-river-surface/5 to-transparent animate-pulse opacity-30"></div>
      
      <div className="px-6 lg:px-8 h-full relative z-10">
        <div className="flex items-center justify-between h-full">
          {/* Left Section - Professional Logo and Navigation */}
          <div className="flex items-center space-x-8 lg:space-x-12">
            {/* RiverBit Logo - Professional Branding */}
            <div className="flex items-center space-x-3">
              <RiverBitLogo 
                size="large" 
                priority={true}
                className="h-12 w-auto riverbit-logo high-dpi-sharp filter drop-shadow-xl" 
              />
              <div className="hidden md:block h-6 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>
            </div>
            
            {/* Professional Navigation Menu - 精简至5个核心选项 */}
            <div className="hidden lg:flex items-center space-x-2">
              {[
                { id: 'trading', label: 'Trade', icon: TrendingUp, primary: true },
                { id: 'personal', label: 'Portfolio', icon: User, primary: false },
                { id: 'riverpool', label: 'RiverPool', icon: Waves, featured: true },
                { id: 'referral', label: 'Earn', icon: Gift, primary: false, highVisibility: true },
                { id: 'dev', label: 'More', special: true, icon: SettingsIcon },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden river-ripple ${
                    item.id === 'riverpool' ? 'data-riverpool-nav' : ''
                  } ${
                    currentPage === item.id
                      ? item.primary 
                        ? 'river-button bg-gradient-to-r from-river-surface to-river-depth text-white shadow-lg river-glow'
                        : item.featured
                        ? 'river-button bg-gradient-to-r from-river-glow to-river-surface text-white shadow-lg river-glow'
                        : 'river-glass-subtle text-white shadow-lg'
                      : item.highVisibility
                      ? 'text-river-glow hover:text-white hover:river-glass-subtle font-bold'
                      : 'text-gray-300 hover:text-white hover:river-glass-subtle'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Right Section - Professional Wallet & Account */}
          <div className="flex items-center space-x-4">
            {/* Wallet Connection */}
            {web3Connected ? (
              <Button 
                variant="outline"
                onClick={handleNavWalletDisconnect}
                className="river-glass-subtle border-river-profit/40 text-river-profit hover:river-glow-profit px-4 py-2 river-ripple"
                data-wallet-button
              >
                <div className="w-2 h-2 bg-river-profit rounded-full mr-2 animate-pulse"></div>
                <span className="font-mono text-sm">
                  {web3Address.slice(0, 6)}...{web3Address.slice(-4)}
                </span>
              </Button>
            ) : (
              <Button 
                onClick={handleNavWalletConnect}
                className="river-button bg-gradient-to-r from-river-surface to-river-depth hover:from-river-glow hover:to-river-surface text-white px-6 py-2 font-semibold river-ripple"
                data-wallet-button
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            )}
            
            {/* Help Button */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowShortcutHelp(true)}
              className="text-gray-400 hover:text-white hover:bg-slate-800/50 p-2"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            
            {/* Status Badge */}
            <div className="hidden xl:flex items-center text-xs text-gray-400 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="font-medium">Live</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );

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
      case 'assets':
        return <AssetsPage />;
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

  // 统一的全屏布局 - 专业交易所风格
  return (
      <div className="h-screen bg-slate-950 flex flex-col">
        <Navigation />
        <div className="flex-1 overflow-y-auto bg-slate-950" data-navigation>
          {renderCurrentPage()}
        </div>

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
        <Toaster position="top-right" richColors />
      </div>
  );
};

export default App;