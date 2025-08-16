import { arbitrum, arbitrumSepolia } from 'viem/chains'

// Network configurations
export const NETWORK_CONFIG = {
  [arbitrumSepolia.id]: {
    name: 'Arbitrum Sepolia',
    shortName: 'arbsep',
    chainId: arbitrumSepolia.id,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    contracts: {
      // New RiverBit MVP Deployment (2025-08-16)
      riverbitCoreV2: '0xA12BdBf28af28EC5C5A3d9DDA65F637d8B683a5a' as `0x${string}`,
      sAuthSettlement: '0x77CD1024a8deEA3F877aB116184b993eF4E25214' as `0x${string}`,
      lpBucketManager: '0x4240d7DE693BDAfEeE6E44F1C8d3811A38B36669' as `0x${string}`,
      threeGatesRiskManager: '0xeBE3998F71a6Fe36aAC43F88c406d884c74C93e3' as `0x${string}`,
      governanceRegistry: '0x9F4575071EB45704ff1e7B900497c097Fe35D4bA' as `0x${string}`,
      usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`,
      // Legacy (deprecated)
      riverbitCore: '0x43bf3e410fd22e4cD1081E60F31600BDdC15ea96' as `0x${string}`,
    }
  },
  [arbitrum.id]: {
    name: 'Arbitrum One',
    shortName: 'arb',
    chainId: arbitrum.id,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    contracts: {
      riverbitCore: '0x0000000000000000000000000000000000000000' as `0x${string}`, // To be deployed
      usdc: '0xA0b86a33E6417FA891A4F0A7fD9F6CdDFbC65Ea' as `0x${string}`,
    }
  }
} as const

// Default network for development
export const DEFAULT_CHAIN_ID = arbitrumSepolia.id

// Trading parameters
export const TRADING_CONFIG = {
  MAX_LEVERAGE: {
    CRYPTO: 100,
    STOCK: 20
  },
  MIN_POSITION_SIZE: {
    CRYPTO: 10, // $10 USDC
    STOCK: 10   // $10 USDC
  },
  MARGIN_MODES: ['cross', 'isolated'] as const,
  ORDER_TYPES: ['market', 'limit', 'stop', 'stop_limit'] as const,
  SETTLEMENT_INTERVAL: 5000, // 5 seconds
  MAX_BATCH_SIZE: 100,
  SIGNATURE_VALIDITY: 30 * 60 * 1000, // 30 minutes
} as const

// Market configurations
export const MARKET_CONFIG = {
  CRYPTO_MARKETS: [
    {
      symbol: 'BTC-PERP',
      baseAsset: 'BTC',
      quoteAsset: 'USDC',
      maxLeverage: 100,
      minOrderSize: 0.001,
      tickSize: 0.01,
      stepSize: 0.00001,
    },
    {
      symbol: 'ETH-PERP',
      baseAsset: 'ETH',
      quoteAsset: 'USDC',
      maxLeverage: 100,
      minOrderSize: 0.01,
      tickSize: 0.01,
      stepSize: 0.0001,
    },
    {
      symbol: 'SOL-PERP',
      baseAsset: 'SOL',
      quoteAsset: 'USDC',
      maxLeverage: 50,
      minOrderSize: 0.1,
      tickSize: 0.001,
      stepSize: 0.001,
    }
  ],
  STOCK_MARKETS: [
    {
      symbol: 'AAPL-PERP',
      baseAsset: 'AAPL',
      quoteAsset: 'USDC',
      maxLeverage: 20,
      minOrderSize: 1,
      tickSize: 0.01,
      stepSize: 0.01,
    },
    {
      symbol: 'TSLA-PERP',
      baseAsset: 'TSLA',
      quoteAsset: 'USDC',
      maxLeverage: 15,
      minOrderSize: 1,
      tickSize: 0.01,
      stepSize: 0.01,
    },
    {
      symbol: 'NVDA-PERP',
      baseAsset: 'NVDA',
      quoteAsset: 'USDC',
      maxLeverage: 10,
      minOrderSize: 1,
      tickSize: 0.01,
      stepSize: 0.01,
    }
  ]
} as const

// RiverBit Core Contract ABI (essential functions)
export const RIVERBIT_CORE_ABI = [
  // Position Management
  {
    "inputs": [
      {"name": "market", "type": "bytes32"},
      {"name": "side", "type": "uint8"},
      {"name": "size", "type": "uint256"},
      {"name": "price", "type": "uint256"},
      {"name": "orderType", "type": "uint8"},
      {"name": "marginMode", "type": "uint8"},
      {"name": "leverage", "type": "uint8"}
    ],
    "name": "placeOrder",
    "outputs": [{"name": "orderId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "orderId", "type": "uint256"}],
    "name": "cancelOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "positionId", "type": "uint256"},
      {"name": "size", "type": "uint256"},
      {"name": "price", "type": "uint256"}
    ],
    "name": "closePosition",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // S-Auth Settlement
  {
    "inputs": [
      {"name": "tickets", "type": "tuple[]", "components": [
        {"name": "user", "type": "address"},
        {"name": "market", "type": "bytes32"},
        {"name": "side", "type": "uint8"},
        {"name": "size", "type": "uint256"},
        {"name": "price", "type": "uint256"},
        {"name": "timestamp", "type": "uint256"},
        {"name": "nonce", "type": "uint256"}
      ]},
      {"name": "signatures", "type": "bytes[]"},
      {"name": "merkleRoot", "type": "bytes32"},
      {"name": "merkleProofs", "type": "bytes32[][]"}
    ],
    "name": "batchSettle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Position Queries
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserPositions",
    "outputs": [
      {
        "name": "positions",
        "type": "tuple[]",
        "components": [
          {"name": "market", "type": "bytes32"},
          {"name": "side", "type": "uint8"},
          {"name": "size", "type": "uint256"},
          {"name": "entryPrice", "type": "uint256"},
          {"name": "marginMode", "type": "uint8"},
          {"name": "leverage", "type": "uint8"},
          {"name": "unrealizedPnl", "type": "int256"},
          {"name": "timestamp", "type": "uint256"}
        ]
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserOrders",
    "outputs": [
      {
        "name": "orders",
        "type": "tuple[]",
        "components": [
          {"name": "orderId", "type": "uint256"},
          {"name": "market", "type": "bytes32"},
          {"name": "side", "type": "uint8"},
          {"name": "size", "type": "uint256"},
          {"name": "price", "type": "uint256"},
          {"name": "orderType", "type": "uint8"},
          {"name": "status", "type": "uint8"},
          {"name": "timestamp", "type": "uint256"}
        ]
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getAccountInfo",
    "outputs": [
      {
        "name": "info",
        "type": "tuple",
        "components": [
          {"name": "balance", "type": "uint256"},
          {"name": "equity", "type": "uint256"},
          {"name": "usedMargin", "type": "uint256"},
          {"name": "freeMargin", "type": "uint256"},
          {"name": "marginRatio", "type": "uint256"},
          {"name": "totalPnl", "type": "int256"}
        ]
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Market Data
  {
    "inputs": [{"name": "market", "type": "bytes32"}],
    "name": "getMarketPrice",
    "outputs": [
      {"name": "price", "type": "uint256"},
      {"name": "confidence", "type": "uint8"},
      {"name": "timestamp", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": true, "name": "orderId", "type": "uint256"},
      {"indexed": true, "name": "market", "type": "bytes32"},
      {"name": "side", "type": "uint8"},
      {"name": "size", "type": "uint256"},
      {"name": "price", "type": "uint256"}
    ],
    "name": "OrderPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": true, "name": "orderId", "type": "uint256"},
      {"indexed": true, "name": "market", "type": "bytes32"},
      {"name": "executedSize", "type": "uint256"},
      {"name": "executedPrice", "type": "uint256"}
    ],
    "name": "OrderExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": true, "name": "positionId", "type": "uint256"},
      {"indexed": true, "name": "market", "type": "bytes32"},
      {"name": "side", "type": "uint8"},
      {"name": "size", "type": "uint256"},
      {"name": "entryPrice", "type": "uint256"}
    ],
    "name": "PositionOpened",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": true, "name": "positionId", "type": "uint256"},
      {"indexed": true, "name": "market", "type": "bytes32"},
      {"name": "pnl", "type": "int256"}
    ],
    "name": "PositionClosed",
    "type": "event"
  }
] as const

// USDC ERC20 ABI (for balance and approval)
export const USDC_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// Type definitions
export type MarginMode = typeof TRADING_CONFIG.MARGIN_MODES[number]
export type OrderType = typeof TRADING_CONFIG.ORDER_TYPES[number]
export type MarketType = 'CRYPTO' | 'STOCK'
export type OrderSide = 'buy' | 'sell'

export interface Position {
  market: string
  side: OrderSide
  size: string
  entryPrice: string
  marginMode: MarginMode
  leverage: number
  unrealizedPnl: string
  timestamp: number
}

export interface Order {
  orderId: string
  market: string
  side: OrderSide
  size: string
  price: string
  orderType: OrderType
  status: 'pending' | 'filled' | 'cancelled' | 'rejected'
  timestamp: number
}

export interface AccountInfo {
  balance: string
  equity: string
  usedMargin: string
  freeMargin: string
  marginRatio: string
  totalPnl: string
}

export interface SAuthTicket {
  user: `0x${string}`
  market: string
  side: number
  size: string
  price: string
  timestamp: number
  nonce: number
}

// Gas estimation constants - Optimized for Arbitrum L2
export const GAS_LIMITS = {
  PLACE_ORDER: 150_000n,       // Reduced from 200k - Arbitrum is more efficient
  CANCEL_ORDER: 80_000n,       // Reduced from 100k
  CLOSE_POSITION: 120_000n,    // Reduced from 150k
  BATCH_SETTLE: 300_000n,      // Reduced from 500k - batch operations are more efficient on L2
  APPROVE_USDC: 50_000n,       // Reduced from 60k
} as const

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  WRONG_NETWORK: 'Please switch to Arbitrum network',
  INSUFFICIENT_BALANCE: 'Insufficient USDC balance',
  INSUFFICIENT_MARGIN: 'Insufficient margin for this trade',
  INVALID_LEVERAGE: 'Invalid leverage for this market',
  POSITION_TOO_SMALL: 'Position size too small. Minimum $10 USDT required',
  SIGNATURE_EXPIRED: 'Trading signature has expired',
  THREE_IRON_LAWS_VIOLATION: 'Trade violates Three Iron Laws',
} as const