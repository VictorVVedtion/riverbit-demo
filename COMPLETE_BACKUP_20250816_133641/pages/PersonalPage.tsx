import React from 'react';
import LiquidGlassCard from '../ui/LiquidGlassCard';
import RiverBentoGrid from '../ui/RiverBentoGrid';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  User, Wallet, TrendingUp, Shield, Award, 
  Settings, ExternalLink, Copy, CheckCircle,
  Zap, Target, BarChart3
} from 'lucide-react';

interface PersonalPageProps {
  isWalletConnected: boolean;
  walletAddress: string;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onNavigate: (page: string) => void;
}

const PersonalPage: React.FC<PersonalPageProps> = ({
  isWalletConnected,
  walletAddress,
  onConnectWallet,
  onDisconnectWallet,
  onNavigate
}) => {
  const userStats = {
    totalTradingVolume: 2580000,
    totalPnL: 15847.92,
    winRate: 78.5,
    totalTrades: 247,
    avgHoldTime: '4.2 Hours',
    riskScore: 75,
    level: 'Gold',
    experience: 8250,
    nextLevelExp: 10000,
    joinDate: '2024-01-15',
    activeDays: 85
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 overflow-hidden">
      <RiverBentoGrid columns={12} className="h-full">
        <LiquidGlassCard 
          bentoSize="full" 
          variant="medium"
          withGlow="river"
          className="p-6"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-6">
              <Avatar className="w-20 h-20 ring-2 ring-river-surface/30">
                <AvatarFallback className="bg-river-surface/20 text-river-glow text-2xl font-bold">
                  {isWalletConnected ? walletAddress.slice(2, 4).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-white">Portfolio Dashboard</h1>
                  <Badge variant="outline" className="bg-gradient-to-r from-river-surface/20 to-river-glow/20 text-river-glow border-river-surface/40">
                    <Award className="w-3 h-3 mr-1" />
                    {userStats.level} Trader
                  </Badge>
                </div>
                
                {isWalletConnected ? (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Wallet className="w-4 h-4 text-river-surface" />
                      <span className="font-mono text-sm text-gray-300">{walletAddress}</span>
                      <Button size="sm" variant="ghost" onClick={copyAddress} className="h-6 w-6 p-0 hover:bg-river-surface/20">
                        <Copy className="w-3 h-3 text-river-glow" />
                      </Button>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>Join Date: {userStats.joinDate}</span>
                      <span>Active Days: {userStats.activeDays}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400">Connect wallet to view portfolio</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => onNavigate('trading')} 
                className="river-button bg-gradient-to-r from-river-surface to-river-depth text-white px-6 py-2"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Start Trading
              </Button>
              <Button variant="outline" size="sm" className="border-river-surface/40 text-river-surface hover:bg-river-surface/20">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </LiquidGlassCard>

        {isWalletConnected ? (
          <>
            <LiquidGlassCard 
              bentoSize="medium" 
              variant="subtle"
              withGlow="profit"
              className="p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Trading Volume</p>
                  <h3 className="text-2xl font-bold text-white">${userStats.totalTradingVolume.toLocaleString()}</h3>
                  <p className="text-river-profit text-sm">This Month +15.2%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-river-surface" />
              </div>
            </LiquidGlassCard>

            <LiquidGlassCard 
              bentoSize="medium" 
              variant="subtle"
              withGlow="profit"
              className="p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total PnL</p>
                  <h3 className="text-2xl font-bold text-river-profit">+${userStats.totalPnL.toLocaleString()}</h3>
                  <p className="text-river-profit text-sm">Win Rate {userStats.winRate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-river-profit" />
              </div>
            </LiquidGlassCard>

            <LiquidGlassCard 
              bentoSize="medium" 
              variant="subtle"
              withGlow="river"
              className="p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Trades</p>
                  <h3 className="text-2xl font-bold text-white">{userStats.totalTrades}</h3>
                  <p className="text-gray-400 text-sm">Avg Hold: {userStats.avgHoldTime}</p>
                </div>
                <Target className="w-8 h-8 text-river-surface" />
              </div>
            </LiquidGlassCard>

            <LiquidGlassCard 
              bentoSize="medium" 
              variant="subtle"
              withGlow="river"
              className="p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Risk Score</p>
                  <h3 className="text-2xl font-bold text-white">{userStats.riskScore}/100</h3>
                  <p className="text-river-glow text-sm">Moderate Risk</p>
                </div>
                <Shield className="w-8 h-8 text-orange-400" />
              </div>
            </LiquidGlassCard>

            <LiquidGlassCard 
              bentoSize="wide" 
              variant="medium"
              className="p-6 col-span-6"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                <div className="grid grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => onNavigate('trading')} 
                    className="h-16 flex-col hover:bg-river-surface/10 hover:border-river-surface/40 border-river-surface/20 text-river-surface"
                  >
                    <BarChart3 className="w-6 h-6 mb-2" />
                    Trade
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onNavigate('assets')} 
                    className="h-16 flex-col hover:bg-river-surface/10 hover:border-river-surface/40 border-river-surface/20 text-river-surface"
                  >
                    <Wallet className="w-6 h-6 mb-2" />
                    Assets
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onNavigate('riverpool')} 
                    className="h-16 flex-col hover:bg-river-surface/10 hover:border-river-surface/40 border-river-surface/20 text-river-surface"
                  >
                    <Zap className="w-6 h-6 mb-2" />
                    RiverPool
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onNavigate('referral')} 
                    className="h-16 flex-col hover:bg-river-surface/10 hover:border-river-surface/40 border-river-surface/20 text-river-surface"
                  >
                    <Award className="w-6 h-6 mb-2" />
                    Referrals
                  </Button>
                </div>
              </div>
            </LiquidGlassCard>
          </>
        ) : (
          <LiquidGlassCard 
            bentoSize="large" 
            variant="medium"
            className="p-8 text-center col-span-6"
          >
            <div className="space-y-4">
              <User className="w-16 h-16 text-river-surface mx-auto" />
              <h3 className="text-xl font-semibold text-white">Connect Wallet to View Portfolio</h3>
              <p className="text-gray-400">Connect your wallet to access your trading dashboard and portfolio analytics.</p>
              <Button 
                onClick={onConnectWallet} 
                className="river-button bg-gradient-to-r from-river-surface to-river-depth text-white px-8 py-3"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            </div>
          </LiquidGlassCard>
        )}
      </RiverBentoGrid>
    </div>
  );
};

export default PersonalPage;