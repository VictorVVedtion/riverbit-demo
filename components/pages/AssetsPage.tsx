import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Wallet, Eye, EyeOff, Download, RefreshCw } from 'lucide-react';
import { assetData, positions, tradeHistory, transferHistory } from '../../data/assetsData';
import { AssetOverviewCards } from '../assets/AssetOverviewCards';
import { AssetDetailCards } from '../assets/AssetDetailCards';
import { OverviewTabContent } from '../assets/OverviewTabContent';
import { PositionsTabContent } from '../assets/PositionsTabContent';
import { HistoryTabContent } from '../assets/HistoryTabContent';
import { TransfersTabContent } from '../assets/TransfersTabContent';
import LiquidGlassCard from '../ui/LiquidGlassCard';
import { BentoGrid, BentoCard } from '../ui/BentoGrid';

const AssetsPage = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showValues, setShowValues] = useState(true);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-surface-0 via-surface-1 to-surface-0 overflow-hidden">
      {/* 顶部资产概览 - Liquid Glass Design */}
      <LiquidGlassCard variant="intense" className="border-b px-6 py-6 flex-shrink-0 rounded-none border-x-0 border-t-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="flex items-center space-x-2 text-white">
              <Wallet className="w-6 h-6 text-[#92318D]" />
              <span>資產總覽</span>
            </h1>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowValues(!showValues)}
            >
              {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" disabled className="opacity-50">
              <Download className="w-4 h-4 mr-2" />
              導出報表 (即將推出)
            </Button>
            <Button variant="outline" size="sm" disabled className="opacity-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新 (即將推出)
            </Button>
          </div>
        </div>

        {/* 总资产卡片 */}
        <AssetOverviewCards assetData={assetData} showValues={showValues} />

        {/* 分仓全仓详细资产 */}
        <AssetDetailCards assetData={assetData} showValues={showValues} />
      </LiquidGlassCard>

      {/* 主内容标签页 - Liquid Glass Design */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <div className="bottom-panel border-b px-6 py-3 flex-shrink-0 rounded-none border-x-0">
            <TabsList className="bottom-bg-card">
              <TabsTrigger value="overview" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">資產概覽</TabsTrigger>
              <TabsTrigger value="positions" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">持倉管理</TabsTrigger>
              <TabsTrigger value="history" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">交易歷史</TabsTrigger>
              <TabsTrigger value="transfers" className="bottom-text-secondary data-[state=active]:bottom-text-emphasis">轉賬記錄</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="flex-1 overflow-hidden">
            <div className="p-6 h-full optimized-container">
              <OverviewTabContent assetData={assetData} showValues={showValues} />
            </div>
          </TabsContent>

          <TabsContent value="positions" className="flex-1 overflow-hidden">
            <div className="p-6 h-full optimized-container">
              <PositionsTabContent positions={positions} showValues={showValues} />
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-hidden">
            <div className="p-6 h-full optimized-container">
              <HistoryTabContent tradeHistory={tradeHistory} showValues={showValues} />
            </div>
          </TabsContent>

          <TabsContent value="transfers" className="flex-1 overflow-hidden">
            <div className="p-6 h-full optimized-container">
              <TransfersTabContent transferHistory={transferHistory} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssetsPage;