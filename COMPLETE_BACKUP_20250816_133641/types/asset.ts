/**
 * RiverBit 资产分类系统 - 数据结构定义
 * Asset Classification System - Data Structure Definitions
 */

// 基础资产类型枚举
export enum AssetType {
  CRYPTO = 'crypto',
  STOCK = 'stock',
  COMMODITY = 'commodity',
  FOREX = 'forex',
  INDEX = 'index'
}

// 资产子分类
export enum AssetCategory {
  // Crypto分类
  LAYER_1 = 'layer1',
  LAYER_2 = 'layer2', 
  DEFI = 'defi',
  MEME = 'meme',
  AI = 'ai',
  GAMING = 'gaming',
  
  // Stock分类
  TECH = 'tech',
  FAANG = 'faang',
  MAGNIFICENT_7 = 'magnificent7',
  SP500 = 'sp500',
  
  // 其他分类
  MAJOR_PAIRS = 'major_pairs',
  PRECIOUS_METALS = 'precious_metals',
  ENERGY = 'energy'
}

// 价格变动数据
export interface PriceChange {
  change1h: number;
  change24h: number;
  change7d: number;
  changePercent1h: number;
  changePercent24h: number;
  changePercent7d: number;
}

// 市场数据
export interface MarketData {
  price: number;
  priceChange: PriceChange;
  volume24h: number;
  marketCap?: number;
  high24h: number;
  low24h: number;
  openInterest?: number;
  fundingRate?: number;
  lastUpdate: number;
}

// 技术指标数据
export interface TechnicalIndicators {
  rsi?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bb?: {
    upper: number;
    middle: number;
    lower: number;
  };
  ema?: {
    ema20: number;
    ema50: number;
    ema200: number;
  };
}

// 基础资产信息
export interface AssetBase {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  category: AssetCategory;
  logo?: string;
  description?: string;
  website?: string;
  isActive: boolean;
  tradingEnabled: boolean;
  precision: {
    price: number;
    amount: number;
  };
  limits: {
    minTradeAmount: number;
    maxTradeAmount: number;
    minLeverage: number;
    maxLeverage: number;
  };
  fees: {
    maker: number;
    taker: number;
    funding?: number;
  };
}

// 完整资产信息（包含市场数据）
export interface Asset extends AssetBase {
  marketData: MarketData;
  technicalIndicators?: TechnicalIndicators;
  isFavorite: boolean;
  isPopular: boolean;
  trending: boolean;
  tags: string[];
  metadata: {
    chainId?: number;
    contractAddress?: string;
    decimals?: number;
    totalSupply?: string;
    circulatingSupply?: string;
    coingeckoId?: string;
    cmc_id?: number;
  };
}

// 资产搜索过滤器
export interface AssetFilter {
  types?: AssetType[];
  categories?: AssetCategory[];
  search?: string;
  favorites?: boolean;
  trending?: boolean;
  popular?: boolean;
  priceRange?: {
    min: number;
    max: number;
  };
  volumeRange?: {
    min: number;
    max: number;
  };
  changeFilter?: {
    period: '1h' | '24h' | '7d';
    min: number;
    max: number;
  };
}

// 资产排序选项
export enum AssetSortBy {
  NAME = 'name',
  SYMBOL = 'symbol',
  PRICE = 'price',
  CHANGE_24H = 'change24h',
  VOLUME_24H = 'volume24h',
  MARKET_CAP = 'marketCap',
  TRENDING = 'trending'
}

export interface AssetSortOptions {
  sortBy: AssetSortBy;
  direction: 'asc' | 'desc';
}

// 资产分组
export interface AssetGroup {
  id: string;
  name: string;
  description?: string;
  type: AssetType;
  category?: AssetCategory;
  assets: Asset[];
  isCustom: boolean;
  order: number;
}

// 用户自定义分组
export interface CustomAssetGroup extends Omit<AssetGroup, 'assets'> {
  assetIds: string[];
  createdAt: number;
  updatedAt: number;
}

// 资产列表配置
export interface AssetListConfig {
  itemsPerPage: number;
  virtualScrolling: boolean;
  lazyLoading: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

// 预定义资产数据
export const CRYPTO_ASSETS: AssetBase[] = [
  {
    id: 'btc-usdt',
    symbol: 'BTC/USDT',
    name: 'Bitcoin',
    type: AssetType.CRYPTO,
    category: AssetCategory.LAYER_1,
    logo: '/assets/crypto/btc.svg',
    isActive: true,
    tradingEnabled: true,
    precision: { price: 2, amount: 6 },
    limits: { minTradeAmount: 0.0001, maxTradeAmount: 1000, minLeverage: 1, maxLeverage: 100 },
    fees: { maker: 0.0002, taker: 0.0004, funding: 0.0001 }
  },
  {
    id: 'eth-usdt',
    symbol: 'ETH/USDT',
    name: 'Ethereum',
    type: AssetType.CRYPTO,
    category: AssetCategory.LAYER_1,
    logo: '/assets/crypto/eth.svg',
    isActive: true,
    tradingEnabled: true,
    precision: { price: 2, amount: 4 },
    limits: { minTradeAmount: 0.001, maxTradeAmount: 10000, minLeverage: 1, maxLeverage: 100 },
    fees: { maker: 0.0002, taker: 0.0004, funding: 0.0001 }
  },
  {
    id: 'sol-usdt',
    symbol: 'SOL/USDT',
    name: 'Solana',
    type: AssetType.CRYPTO,
    category: AssetCategory.LAYER_1,
    logo: '/assets/crypto/sol.svg',
    isActive: true,
    tradingEnabled: true,
    precision: { price: 2, amount: 2 },
    limits: { minTradeAmount: 0.01, maxTradeAmount: 100000, minLeverage: 1, maxLeverage: 75 },
    fees: { maker: 0.0002, taker: 0.0004, funding: 0.0001 }
  }
];

export const STOCK_ASSETS: AssetBase[] = [
  {
    id: 'aapl-usdt',
    symbol: 'xAAPL/USDT',
    name: 'Apple Inc.',
    type: AssetType.STOCK,
    category: AssetCategory.MAGNIFICENT_7,
    logo: '/assets/stocks/aapl.svg',
    isActive: true,
    tradingEnabled: true,
    precision: { price: 2, amount: 0 },
    limits: { minTradeAmount: 1, maxTradeAmount: 10000, minLeverage: 1, maxLeverage: 20 },
    fees: { maker: 0.0004, taker: 0.0006 }
  },
  {
    id: 'msft-usdt',
    symbol: 'xMSFT/USDT',
    name: 'Microsoft Corporation',
    type: AssetType.STOCK,
    category: AssetCategory.MAGNIFICENT_7,
    logo: '/assets/stocks/msft.svg',
    isActive: true,
    tradingEnabled: true,
    precision: { price: 2, amount: 0 },
    limits: { minTradeAmount: 1, maxTradeAmount: 10000, minLeverage: 1, maxLeverage: 20 },
    fees: { maker: 0.0004, taker: 0.0006 }
  },
  {
    id: 'googl-usdt',
    symbol: 'xGOOGL/USDT',
    name: 'Alphabet Inc.',
    type: AssetType.STOCK,
    category: AssetCategory.MAGNIFICENT_7,
    logo: '/assets/stocks/googl.svg',
    isActive: true,
    tradingEnabled: true,
    precision: { price: 2, amount: 0 },
    limits: { minTradeAmount: 1, maxTradeAmount: 10000, minLeverage: 1, maxLeverage: 20 },
    fees: { maker: 0.0004, taker: 0.0006 }
  },
  {
    id: 'amzn-usdt',
    symbol: 'xAMZN/USDT',
    name: 'Amazon.com Inc.',
    type: AssetType.STOCK,
    category: AssetCategory.MAGNIFICENT_7,
    logo: '/assets/stocks/amzn.svg',
    isActive: true,
    tradingEnabled: true,
    precision: { price: 2, amount: 0 },
    limits: { minTradeAmount: 1, maxTradeAmount: 10000, minLeverage: 1, maxLeverage: 20 },
    fees: { maker: 0.0004, taker: 0.0006 }
  },
  {
    id: 'tsla-usdt',
    symbol: 'xTSLA/USDT',
    name: 'Tesla Inc.',
    type: AssetType.STOCK,
    category: AssetCategory.MAGNIFICENT_7,
    logo: '/assets/stocks/tsla.svg',
    isActive: true,
    tradingEnabled: true,
    precision: { price: 2, amount: 0 },
    limits: { minTradeAmount: 1, maxTradeAmount: 10000, minLeverage: 1, maxLeverage: 20 },
    fees: { maker: 0.0004, taker: 0.0006 }
  },
  {
    id: 'meta-usdt',
    symbol: 'xMETA/USDT',
    name: 'Meta Platforms Inc.',
    type: AssetType.STOCK,
    category: AssetCategory.MAGNIFICENT_7,
    logo: '/assets/stocks/meta.svg',
    isActive: true,
    tradingEnabled: true,
    precision: { price: 2, amount: 0 },
    limits: { minTradeAmount: 1, maxTradeAmount: 10000, minLeverage: 1, maxLeverage: 20 },
    fees: { maker: 0.0004, taker: 0.0006 }
  },
  {
    id: 'nvda-usdt',
    symbol: 'xNVDA/USDT',
    name: 'NVIDIA Corporation',
    type: AssetType.STOCK,
    category: AssetCategory.MAGNIFICENT_7,
    logo: '/assets/stocks/nvda.svg',
    isActive: true,
    tradingEnabled: true,
    precision: { price: 2, amount: 0 },
    limits: { minTradeAmount: 1, maxTradeAmount: 10000, minLeverage: 1, maxLeverage: 20 },
    fees: { maker: 0.0004, taker: 0.0006 }
  }
];

// 分类映射
export const ASSET_CATEGORIES = {
  [AssetCategory.LAYER_1]: {
    name: 'Layer 1',
    description: 'Blockchain base layers',
    color: '#3B82F6'
  },
  [AssetCategory.LAYER_2]: {
    name: 'Layer 2',
    description: 'Scaling solutions',
    color: '#8B5CF6'
  },
  [AssetCategory.DEFI]: {
    name: 'DeFi',
    description: 'Decentralized Finance',
    color: '#10B981'
  },
  [AssetCategory.MEME]: {
    name: 'Meme',
    description: 'Meme coins',
    color: '#F59E0B'
  },
  [AssetCategory.AI]: {
    name: 'AI',
    description: 'Artificial Intelligence',
    color: '#EF4444'
  },
  [AssetCategory.GAMING]: {
    name: 'Gaming',
    description: 'Gaming & NFT',
    color: '#EC4899'
  },
  [AssetCategory.MAGNIFICENT_7]: {
    name: 'Magnificent 7',
    description: 'Top tech stocks',
    color: '#6366F1'
  },
  [AssetCategory.TECH]: {
    name: 'Technology',
    description: 'Technology stocks',
    color: '#0EA5E9'
  }
} as const;

// 默认分组配置
export const DEFAULT_ASSET_GROUPS: Omit<AssetGroup, 'assets'>[] = [
  {
    id: 'favorites',
    name: 'Favorites',
    description: 'Your favorite trading pairs',
    type: AssetType.CRYPTO,
    isCustom: false,
    order: 0
  },
  {
    id: 'crypto',
    name: 'Crypto',
    description: 'Cryptocurrency pairs',
    type: AssetType.CRYPTO,
    isCustom: false,
    order: 1
  },
  {
    id: 'magnificent7',
    name: 'Magnificent 7',
    description: 'Top US tech stocks',
    type: AssetType.STOCK,
    category: AssetCategory.MAGNIFICENT_7,
    isCustom: false,
    order: 2
  },
  {
    id: 'layer1',
    name: 'Layer 1',
    description: 'Layer 1 blockchain tokens',
    type: AssetType.CRYPTO,
    category: AssetCategory.LAYER_1,
    isCustom: false,
    order: 3
  },
  {
    id: 'defi',
    name: 'DeFi',
    description: 'Decentralized Finance tokens',
    type: AssetType.CRYPTO,
    category: AssetCategory.DEFI,
    isCustom: false,
    order: 4
  }
];

export default {
  AssetType,
  AssetCategory,
  AssetSortBy,
  CRYPTO_ASSETS,
  STOCK_ASSETS,
  ASSET_CATEGORIES,
  DEFAULT_ASSET_GROUPS
};