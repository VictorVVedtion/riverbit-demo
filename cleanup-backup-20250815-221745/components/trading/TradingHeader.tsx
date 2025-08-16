import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ChevronDown, Wallet } from 'lucide-react';
import { shortenAddress } from '../../utils/web3Utils';
import TradingViewIcon from '../TradingViewIcon';
import TradingViewPrice from '../TradingViewPrice';
import HyperPairSelector from '../HyperPairSelector';
import ModernWeb3Connection from '../ModernWeb3Connection';

interface TradingHeaderProps {
  selectedTradingPair: string;
  selectedPair: {
    baseAsset: string;
    quoteAsset: string;
  } | undefined;
  setSelectedTradingPair: (pair: string) => void;
  pairSelectorOpen: boolean;
  setPairSelectorOpen: (open: boolean) => void;
  favoriteAssets: string[];
  onToggleFavorite: (symbol: string) => void;
  accountData: {
    usdcBalance?: number;
  };
  isWalletConnected: boolean;
  walletAddress: string;
  currentChainId: number | null;
  onConnectionChange: (connected: boolean, address: string, chainId: number | null) => void;
}

const TradingHeader: React.FC<TradingHeaderProps> = ({
  selectedTradingPair,
  selectedPair,
  setSelectedTradingPair,
  pairSelectorOpen,
  setPairSelectorOpen,
  favoriteAssets,
  onToggleFavorite,
  accountData,
  isWalletConnected,
  walletAddress,
  currentChainId,
  onConnectionChange,
}) => {
  return (
    <div className="border-b border-default/50 bg-surface-1/95 backdrop-blur-md px-6 py-3 flex-shrink-0 h-14 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 lg:space-x-6">
          <div className="flex items-center space-x-2">
            <TradingViewIcon symbol={selectedTradingPair} size={20} />
            <Button
              variant="ghost"
              onClick={() => setPairSelectorOpen(true)}
              className="h-9 px-4 text-primary hover:bg-surface-2/80 hover:shadow-sm transition-all duration-200 rounded-lg border border-transparent hover:border-default/30"
            >
              <span className="font-bold text-lg">{selectedPair?.baseAsset}</span>
              <span className="text-secondary text-lg">/{selectedPair?.quoteAsset}</span>
              <ChevronDown className="w-4 h-4 ml-2 text-secondary" />
            </Button>
          </div>
          
          <HyperPairSelector
            selectedPair={selectedTradingPair}
            onPairSelect={setSelectedTradingPair}
            isOpen={pairSelectorOpen}
            onClose={() => setPairSelectorOpen(false)}
            favoriteAssets={favoriteAssets}
            onToggleFavorite={onToggleFavorite}
          />
          
          <div className="flex items-center space-x-3 lg:space-x-6">
            <TradingViewPrice symbol={selectedTradingPair} />
            
            {/* Market Stats */}
            <div className="hidden sm:flex items-center space-x-3 lg:space-x-6 text-sm">
              <div className="bg-surface-2/50 px-2 py-1 rounded-md border border-default/30">
                <span className="text-secondary">24h: </span>
                <span className="text-profit font-semibold">+2.43%</span>
              </div>
              <div className="bg-surface-2/50 px-2 py-1 rounded-md border border-default/30">
                <span className="text-secondary">Vol: </span>
                <span className="text-river-blue font-semibold">125.8K</span>
              </div>
              <div className="hidden lg:flex bg-surface-2/50 px-2 py-1 rounded-md border border-default/30">
                <span className="text-secondary">OI: </span>
                <span className="text-river-blue font-semibold">$2.1B</span>
              </div>
              <div className="hidden lg:flex bg-surface-2/50 px-2 py-1 rounded-md border border-default/30">
                <span className="text-secondary">Funding: </span>
                <span className="text-loss font-semibold">0.0125%</span>
              </div>
              
              {/* Wallet Section */}
              <div className="border-l border-default/50 pl-4 ml-4 flex items-center space-x-4">
                <div className="bg-surface-2/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-default/30 flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-river-blue" />
                  <span className="text-secondary font-medium">USDC: </span>
                  <span className="text-profit font-bold text-base">
                    ${accountData.usdcBalance?.toLocaleString() || '0'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isWalletConnected ? (
                    <div className="bg-surface-2/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-default/30 flex items-center space-x-2">
                      <div className="w-2 h-2 bg-profit rounded-full animate-pulse"></div>
                      <span className="text-sm text-primary font-medium">
                        {shortenAddress(walletAddress)}
                      </span>
                      {currentChainId !== 421614 && (
                        <Badge variant="destructive" className="text-xs h-5 px-2">
                          Wrong Network
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <ModernWeb3Connection onConnectionChange={onConnectionChange} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingHeader;