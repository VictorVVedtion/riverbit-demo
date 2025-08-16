import React from 'react';
import LiquidBentoTradingInterface from '../LiquidBentoTradingInterface';

interface EliteTradingPageProps {
  userAddress?: string;
  isConnected: boolean;
}

const EliteTradingPage: React.FC<EliteTradingPageProps> = ({
  userAddress,
  isConnected
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <LiquidBentoTradingInterface 
        userAddress={userAddress} 
        isConnected={isConnected}
        isWalletConnected={isConnected}
        onConnectWallet={() => {}}
      />
    </div>
  );
};

export default EliteTradingPage;