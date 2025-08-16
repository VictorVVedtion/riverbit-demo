export const assetData = {
  total: {
    balance: 125420.50,
    pnl: 15847.92,
    pnlPercent: 14.5
  },
  isolated: {
    balance: 45680.25,
    availableBalance: 12340.50,
    marginUsed: 33339.75,
    positions: 8,
    totalPnL: 8945.60,
    assets: [
      { symbol: 'USDT', balance: 25680.25, locked: 15340.50, available: 10339.75 },
      { symbol: 'BTC', balance: 0.5234, locked: 0.3234, available: 0.2 },
      { symbol: 'ETH', balance: 5.2345, locked: 3.1234, available: 2.1111 }
    ]
  },
  cross: {
    balance: 79740.25,
    availableBalance: 56210.50,  
    marginUsed: 23529.75,
    positions: 5,
    totalPnL: 6902.32,
    assets: [
      { symbol: 'USDT', balance: 65740.25, locked: 20529.75, available: 45210.50 },
      { symbol: 'BTC', balance: 0.8765, locked: 0.2345, available: 0.642 },
      { symbol: 'ETH', balance: 3.4567, locked: 1.4567, available: 2.0 }
    ]
  }
};

export const positions = [
  { id: 1, pair: 'BTC/USDT', side: 'long', size: '0.25', entryPrice: 45250, currentPrice: 47850, pnl: 650, pnlPercent: 5.74, marginMode: 'isolated', leverage: '10x' },
  { id: 2, pair: 'ETH/USDT', side: 'short', size: '2.5', entryPrice: 2850, currentPrice: 2780, pnl: 175, pnlPercent: 2.46, marginMode: 'cross', leverage: '5x' },
  { id: 3, pair: 'xAAPL/USDT', side: 'long', size: '100', entryPrice: 185.5, currentPrice: 192.3, pnl: 680, pnlPercent: 3.67, marginMode: 'isolated', leverage: '20x' },
];

export const tradeHistory = [
  { id: 1, time: '2024-01-20 14:30:25', pair: 'BTC/USDT', side: 'buy', amount: '0.125', price: '47850', fee: '2.99', type: 'market' },
  { id: 2, time: '2024-01-20 13:45:18', pair: 'ETH/USDT', side: 'sell', amount: '1.25', price: '2780', fee: '1.74', type: 'limit' },
  { id: 3, time: '2024-01-20 12:15:44', pair: 'xAAPL/USDT', side: 'buy', amount: '50', price: '192.3', fee: '4.81', type: 'market' },
];

export const transferHistory = [
  { id: 1, time: '2024-01-20 16:20:35', type: 'deposit', asset: 'USDT', amount: '5000', status: 'completed', hash: '0x1234...5678' },
  { id: 2, time: '2024-01-19 22:15:20', type: 'withdraw', asset: 'BTC', amount: '0.1', status: 'completed', hash: '0x5678...9abc' },
  { id: 3, time: '2024-01-19 14:30:15', type: 'internal', asset: 'USDT', amount: '2500', status: 'completed', from: 'isolated', to: 'cross' },
];