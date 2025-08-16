import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Droplets, AlertTriangle, Crown, Shield,
  BarChart3, Plus, Minus, Clock, PieChart, Globe,
  Target
} from 'lucide-react';
import LiquidGlassCard from '../ui/LiquidGlassCard';
import { BentoGrid, BentoCard } from '../ui/BentoGrid';
import { poolData, userData, marketStatus, getRiskStatus } from '../../data/riverPoolData';
import { handleDeposit, handleWithdraw } from '../../utils/riverPoolHelpers';
import { OverviewTab } from '../riverpool/OverviewTab';
import { DepositTab } from '../riverpool/DepositTab';
import { WithdrawTab } from '../riverpool/WithdrawTab';
import { SystemPositionsTab } from '../riverpool/SystemPositionsTab';
import { HistoryTab } from '../riverpool/HistoryTab';
import { AnalyticsTab } from '../riverpool/AnalyticsTab';
import { XStockTab } from '../riverpool/XStockTab';
import { FoundationLPTab } from '../riverpool/FoundationLPTab';


interface RiverPoolPageProps {
  autoReinvest: boolean;
  setAutoReinvest: (value: boolean) => void;
  depositAmount: string;
  setDepositAmount: (value: string) => void;
  withdrawAmount: string;
  setWithdrawAmount: (value: string) => void;
  web3Connected?: boolean;
  web3Address?: string;
}

const RiverPoolPage: React.FC<RiverPoolPageProps> = ({
  autoReinvest,
  setAutoReinvest,
  depositAmount,
  setDepositAmount,
  withdrawAmount,
  setWithdrawAmount,
  web3Connected = false,
  web3Address = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const riskStatus = getRiskStatus(poolData);

  const handleDepositClick = () => handleDeposit(depositAmount, setIsDepositing, setDepositAmount);
  const handleWithdrawClick = () => handleWithdraw(withdrawAmount, setIsWithdrawing, setWithdrawAmount, riskStatus);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-river-depth via-surface-0 to-river-depth overflow-hidden">
      {/* River-Themed Header - Professional Portfolio Standard */}
      <LiquidGlassCard 
        variant="intense" 
        className="text-white px-6 py-6 flex-shrink-0 rounded-none border-x-0 border-t-0 bg-gradient-to-r from-river-depth/90 to-river-flow/20 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-r from-river-surface to-river-glow rounded-xl flex items-center justify-center shadow-lg shadow-river-surface/25">
              <Droplets className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                RiverPool Portfolio
              </h1>
              <p className="text-river-surface/80 mt-1 font-medium">智能做市金庫 • AMM 自動做市 • 完全透明交易</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-xl border transition-all duration-300 ${
              marketStatus.isMarketOpen 
                ? 'bg-river-profit/20 text-river-profit border-river-profit/30 shadow-lg shadow-river-profit/10' 
                : 'bg-river-warning/20 text-river-warning border-river-warning/30 shadow-lg shadow-river-warning/10'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  marketStatus.isMarketOpen ? 'bg-river-profit animate-pulse' : 'bg-river-warning animate-pulse'
                }`}></div>
                <span className="font-semibold text-sm">
                  {marketStatus.isMarketOpen ? 'Market Open' : 'Market Closed'}
                </span>
              </div>
            </div>
            
            <div className={`px-4 py-2 rounded-xl border transition-all duration-300 ${
              riskStatus.drawdown === 'safe' ? 'bg-river-profit/20 text-river-profit border-river-profit/30 shadow-lg shadow-river-profit/10' :
              riskStatus.drawdown === 'warning' ? 'bg-river-warning/20 text-river-warning border-river-warning/30 shadow-lg shadow-river-warning/10' :
              'bg-river-loss/20 text-river-loss border-river-loss/30 shadow-lg shadow-river-loss/10'
            }`}>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span className="font-semibold text-sm">
                  Risk: {
                    riskStatus.drawdown === 'safe' ? 'Normal' :
                    riskStatus.drawdown === 'warning' ? 'Warning' : 'Critical'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Professional Risk Alert - River Design */}
      {riskStatus.drawdown !== 'safe' && (
        <div className="m-6">
          <LiquidGlassCard 
            variant="subtle" 
            className={`p-4 border transition-all duration-300 ${
              riskStatus.drawdown === 'warning' 
                ? 'border-river-warning/50 bg-river-warning/10 shadow-lg shadow-river-warning/20' 
                : 'border-river-loss/50 bg-river-loss/10 shadow-lg shadow-river-loss/20'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                riskStatus.drawdown === 'warning' 
                  ? 'bg-river-warning/20 text-river-warning' 
                  : 'bg-river-loss/20 text-river-loss'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold mb-1 ${
                  riskStatus.drawdown === 'warning' ? 'text-river-warning' : 'text-river-loss'
                }`}>
                  {riskStatus.drawdown === 'warning' ? 'Risk Warning' : 'Critical Risk Alert'}
                </h4>
                <p className="text-gray-300 text-sm">
                  {riskStatus.drawdown === 'warning' 
                    ? `24h drawdown reached ${poolData.drawdown24h}%. Enhanced risk monitoring active.`
                    : `24h drawdown reached ${poolData.drawdown24h}%. New deposits suspended, 1% exit fee applied.`
                  }
                </p>
              </div>
            </div>
          </LiquidGlassCard>
        </div>
      )}

      {/* Professional Portfolio Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Professional Tab Navigation - River Design */}
            <LiquidGlassCard variant="subtle" className="p-1">
              <TabsList className="grid w-full grid-cols-8 bg-transparent gap-1">
                <TabsTrigger 
                  value="overview" 
                  className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-river-surface data-[state=active]:bg-river-surface/20 data-[state=active]:text-river-surface data-[state=active]:shadow-lg data-[state=active]:shadow-river-surface/25"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="font-medium">Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="foundationlp" 
                  className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-river-surface data-[state=active]:bg-river-surface/20 data-[state=active]:text-river-surface data-[state=active]:shadow-lg data-[state=active]:shadow-river-surface/25"
                >
                  <Crown className="w-4 h-4" />
                  <span className="font-medium">Foundation</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="positions" 
                  className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-river-surface data-[state=active]:bg-river-surface/20 data-[state=active]:text-river-surface data-[state=active]:shadow-lg data-[state=active]:shadow-river-surface/25"
                >
                  <Target className="w-4 h-4" />
                  <span className="font-medium">Positions</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="deposit" 
                  className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-river-profit data-[state=active]:bg-river-profit/20 data-[state=active]:text-river-profit data-[state=active]:shadow-lg data-[state=active]:shadow-river-profit/25"
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">Deposit</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="withdraw" 
                  className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-river-warning data-[state=active]:bg-river-warning/20 data-[state=active]:text-river-warning data-[state=active]:shadow-lg data-[state=active]:shadow-river-warning/25"
                >
                  <Minus className="w-4 h-4" />
                  <span className="font-medium">Withdraw</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-river-surface data-[state=active]:bg-river-surface/20 data-[state=active]:text-river-surface data-[state=active]:shadow-lg data-[state=active]:shadow-river-surface/25"
                >
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">History</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-river-glow data-[state=active]:bg-river-glow/20 data-[state=active]:text-river-glow data-[state=active]:shadow-lg data-[state=active]:shadow-river-glow/25"
                >
                  <PieChart className="w-4 h-4" />
                  <span className="font-medium">Analytics</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="xstock" 
                  className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-river-flow data-[state=active]:bg-river-flow/20 data-[state=active]:text-river-flow data-[state=active]:shadow-lg data-[state=active]:shadow-river-flow/25"
                >
                  <Globe className="w-4 h-4" />
                  <span className="font-medium">Pool Details</span>
                </TabsTrigger>
              </TabsList>
            </LiquidGlassCard>

            <TabsContent value="overview" className="space-y-6" data-riverpool-overview>
              <OverviewTab />
            </TabsContent>


            <TabsContent value="foundationlp" className="space-y-6">
              <FoundationLPTab />
            </TabsContent>

            <TabsContent value="positions" className="space-y-6">
              <SystemPositionsTab />
            </TabsContent>

            <TabsContent value="deposit" className="space-y-6" data-deposit-tab>
              <DepositTab
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                isDepositing={isDepositing}
                onDeposit={handleDepositClick}
                riskStatus={riskStatus}
                marketStatus={marketStatus}
              />
            </TabsContent>

            <TabsContent value="withdraw" className="space-y-6">
              <WithdrawTab
                withdrawAmount={withdrawAmount}
                setWithdrawAmount={setWithdrawAmount}
                isWithdrawing={isWithdrawing}
                onWithdraw={handleWithdrawClick}
                riskStatus={riskStatus}
              />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <HistoryTab />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsTab />
            </TabsContent>

            <TabsContent value="xstock" className="space-y-6">
              <XStockTab />
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default RiverPoolPage;