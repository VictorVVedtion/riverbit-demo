import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Droplets, AlertTriangle, Crown,
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

// 导入Web3组件
import Web3Connection from '../Web3Connection';
import RiverPoolInterface from '../RiverPoolInterface';

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
  const [web3TabActive, setWeb3TabActive] = useState(false);

  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const riskStatus = getRiskStatus(poolData);

  const handleDepositClick = () => handleDeposit(depositAmount, setIsDepositing, setDepositAmount);
  const handleWithdrawClick = () => handleWithdraw(withdrawAmount, setIsWithdrawing, setWithdrawAmount, riskStatus);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-surface-0 via-surface-1 to-surface-0 overflow-hidden">
      {/* 顶部标题栏 - Liquid Glass Design */}
      <LiquidGlassCard variant="intense" withGradient className="text-white px-6 py-6 flex-shrink-0 rounded-none border-x-0 border-t-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Droplets className="w-6 h-6 mr-3" />
              RiverPool 智能做市金庫
            </h1>
            <p className="text-gray-300 mt-1">xStock 永續合約主池 • AMM 自動做市 • 完全透明交易</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className={`${
              marketStatus.isMarketOpen 
                ? 'bg-green-900/60 text-green-100 border-green-700/50' 
                : 'bg-orange-900/60 text-orange-100 border-orange-700/50'
            }`}>
              {marketStatus.isMarketOpen 
                ? '🟢 美股開市中' 
                : '🟡 美股休市'
              }
            </Badge>
            <Badge variant="secondary" className="bg-[#92318D]/60 text-white border-[#92318D]/50">
              風險等級: {
                riskStatus.drawdown === 'safe' ? '正常' :
                riskStatus.drawdown === 'warning' ? '⚠️ 黃燈' : '🚨 紅燈'
              }
            </Badge>

          </div>
        </div>
      </LiquidGlassCard>

      {/* 风险警告 */}
      {riskStatus.drawdown !== 'safe' && (
        <Alert className={`m-6 ${
          riskStatus.drawdown === 'warning' 
            ? 'border-yellow-200 bg-yellow-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <AlertTriangle className={`w-4 h-4 ${
            riskStatus.drawdown === 'warning' ? 'text-yellow-600' : 'text-red-600'
          }`} />
          <AlertDescription className={
            riskStatus.drawdown === 'warning' ? 'text-yellow-800' : 'text-red-800'
          }>
            {riskStatus.drawdown === 'warning' 
              ? `⚠️ 黃燈警告：24小時回撤達 ${poolData.drawdown24h}%，請注意風險管控`
              : `🚨 紅燈警告：24小時回撤達 ${poolData.drawdown24h}%，已停止新存入並收取 1% 退出費`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-9 bottom-bg-card bottom-divider border rounded-lg">
              <TabsTrigger value="overview" className="flex items-center space-x-2 bottom-text-secondary data-[state=active]:bottom-text-emphasis">
                <BarChart3 className="w-4 h-4" />
                <span>總覽</span>
              </TabsTrigger>
              <TabsTrigger value="web3pool" className="flex items-center space-x-2 bottom-text-secondary data-[state=active]:bottom-text-emphasis">
                <Droplets className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 font-semibold">Web3 Pool</span>
              </TabsTrigger>
              <TabsTrigger value="foundationlp" className="flex items-center space-x-2 bottom-text-secondary data-[state=active]:bottom-text-emphasis">
                <Crown className="w-4 h-4" />
                <span>Foundation LP</span>
              </TabsTrigger>
              <TabsTrigger value="positions" className="flex items-center space-x-2 bottom-text-secondary data-[state=active]:bottom-text-emphasis">
                <Target className="w-4 h-4" />
                <span>系統持倉</span>
              </TabsTrigger>
              <TabsTrigger value="deposit" className="flex items-center space-x-2 bottom-text-secondary data-[state=active]:bottom-text-emphasis">
                <Plus className="w-4 h-4" />
                <span>存入</span>
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="flex items-center space-x-2 bottom-text-secondary data-[state=active]:bottom-text-emphasis">
                <Minus className="w-4 h-4" />
                <span>提取</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2 bottom-text-secondary data-[state=active]:bottom-text-emphasis">
                <Clock className="w-4 h-4" />
                <span>歷史記錄</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2 bottom-text-secondary data-[state=active]:bottom-text-emphasis">
                <PieChart className="w-4 h-4" />
                <span>數據分析</span>
              </TabsTrigger>
              <TabsTrigger value="xstock" className="flex items-center space-x-2 bottom-text-secondary data-[state=active]:bottom-text-emphasis">
                <Globe className="w-4 h-4" />
                <span>主池詳情</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6" data-riverpool-overview>
              <OverviewTab />
            </TabsContent>

            <TabsContent value="web3pool" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <Web3Connection onConnectionChange={(connected, address) => {
                    // 可以在这里处理连接状态变化
                  }} />
                </div>
                <div className="lg:col-span-2">
                  <RiverPoolInterface 
                    userAddress={web3Address}
                    isConnected={web3Connected}
                  />
                </div>
              </div>
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