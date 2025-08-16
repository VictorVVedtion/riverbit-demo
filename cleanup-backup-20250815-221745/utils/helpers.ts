import { mockWalletAddress, mockPositions, mockTradingPairs } from '../data/mockData';

// Wallet functions
export const connectWallet = (setIsWalletConnected: (connected: boolean) => void, setWalletAddress: (address: string) => void) => {
  setIsWalletConnected(true);
  setWalletAddress(mockWalletAddress);
};

export const disconnectWallet = (setIsWalletConnected: (connected: boolean) => void, setWalletAddress: (address: string) => void) => {
  setIsWalletConnected(false);
  setWalletAddress('');
};

// Favorites functions
export const toggleFavorite = (symbol: string, favoriteAssets: string[], setFavoriteAssets: (assets: string[]) => void) => {
  setFavoriteAssets(
    favoriteAssets.includes(symbol) 
      ? favoriteAssets.filter(fav => fav !== symbol)
      : [...favoriteAssets, symbol]
  );
};

// Trading pairs filtering
export const filterTradingPairs = (searchQuery: string, selectedCategory: string, favoriteAssets: string[]) => {
  return mockTradingPairs.filter(pair => {
    const matchesSearch = pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pair.baseAsset.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           (selectedCategory === 'favorites' && favoriteAssets.includes(pair.symbol)) ||
                           (selectedCategory === 'crypto' && pair.type === 'crypto') ||
                           (selectedCategory === 'xstock' && pair.type === 'xstock');
    return matchesSearch && matchesCategory;
  });
};

// Position functions
export const closeAllPositions = () => {
  // TODO: Implement actual position closing logic
  // This should integrate with the trading engine
  return Promise.resolve(true);
};

export const closePosition = (positionId: number) => {
  // TODO: Implement actual position closing logic
  // This should integrate with the trading engine
  return Promise.resolve(positionId);
};

// Calculate totals
export const calculateTotals = () => {
  const totalPnL = mockPositions.reduce((sum, pos) => sum + pos.pnl, 0);
  const totalMargin = mockPositions.reduce((sum, pos) => sum + pos.margin, 0);
  return { totalPnL, totalMargin };
};

// Get selected pair info
export const getSelectedPair = (selectedTradingPair: string) => {
  return mockTradingPairs.find(p => p.symbol === selectedTradingPair);
};