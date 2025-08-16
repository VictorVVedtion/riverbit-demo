require("dotenv").config();
const { ethers } = require("hardhat");

/**
 * Comprehensive deployment configuration for RiverBit system
 */
const DEPLOYMENT_CONFIG = {
  // Network-specific configurations
  networks: {
    hardhat: {
      baseAsset: null, // Will deploy mock USDC
      admin: null, // Will use deployer
      initialFunding: ethers.utils.parseUnits("1000000", 6), // 1M USDC
      gasPrice: ethers.utils.parseUnits("20", "gwei"),
      verify: false,
    },
    
    localhost: {
      baseAsset: null, // Will deploy mock USDC
      admin: null, // Will use deployer
      initialFunding: ethers.utils.parseUnits("1000000", 6),
      gasPrice: ethers.utils.parseUnits("20", "gwei"),
      verify: false,
    },
    
    arbitrumSepolia: {
      baseAsset: process.env.USDC_ADDRESS_ARBITRUM_SEPOLIA || "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      admin: process.env.ADMIN_ADDRESS,
      multisig: process.env.MULTISIG_ADDRESS,
      treasury: process.env.TREASURY_ADDRESS,
      initialFunding: ethers.utils.parseUnits(process.env.INITIAL_FUNDING_AMOUNT || "100000", 6), // 100K USDC
      gasPrice: ethers.utils.parseUnits("0.1", "gwei"),
      verify: process.env.VERIFY_CONTRACTS === "true",
      chainlinkPriceFeed: process.env.CHAINLINK_PRICE_FEED_ADDRESS,
      pythPriceFeed: process.env.PYTH_PRICE_FEED_ADDRESS,
    },
    
    arbitrumOne: {
      baseAsset: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC on Arbitrum
      admin: process.env.ADMIN_ADDRESS,
      multisig: process.env.MULTISIG_ADDRESS,
      treasury: process.env.TREASURY_ADDRESS,
      initialFunding: ethers.utils.parseUnits(process.env.INITIAL_FUNDING_AMOUNT || "1000000", 6), // 1M USDC
      gasPrice: ethers.utils.parseUnits("0.1", "gwei"),
      verify: process.env.VERIFY_CONTRACTS === "true",
      chainlinkPriceFeed: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612", // ETH/USD on Arbitrum
      pythPriceFeed: process.env.PYTH_PRICE_FEED_ADDRESS,
    },
  },
  
  // Contract-specific configurations
  contracts: {
    // Phase 1: Infrastructure Layer
    contractRegistry: {
      name: "ContractRegistry",
      upgradeable: true,
    },
    
    accessControl: {
      name: "AccessControl",
      upgradeable: true,
      roles: {
        ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
        OPERATOR_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("OPERATOR_ROLE")),
        EMERGENCY_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EMERGENCY_ROLE")),
        LIQUIDATOR_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("LIQUIDATOR_ROLE")),
      },
    },
    
    // Phase 2: Core Trading Layer
    marginManager: {
      name: "MarginManager",
      upgradeable: true,
      initialMarginRatio: 500, // 5%
      maintenanceMarginRatio: 300, // 3%
      liquidationMarginRatio: 200, // 2%
      maxLeverage: 20,
    },
    
    orderManager: {
      name: "OrderManager",
      upgradeable: true,
      maxOrdersPerUser: 100,
      orderExpiryTime: 24 * 60 * 60, // 24 hours
      minOrderValue: ethers.utils.parseUnits("10", 6), // 10 USDC
    },
    
    perpetualTrading: {
      name: "PerpetualTrading",
      upgradeable: true,
      tradingFeeRate: 30, // 0.3% (30 basis points)
      maxPositionSize: ethers.utils.parseUnits("1000000", 6), // 1M USDC
      priceImpactThreshold: 50, // 0.5%
    },
    
    // Phase 3: Settlement & Liquidation Layer
    batchSettlement: {
      name: "BatchSettlement",
      upgradeable: true,
      batchSize: 100,
      settlementInterval: 60, // 1 minute
      maxGasPerBatch: 8000000,
    },
    
    liquidationEngine: {
      name: "LiquidationEngine",
      upgradeable: true,
      liquidationReward: 500, // 5%
      maxLiquidationRatio: 95, // 95%
      liquidationDelay: 300, // 5 minutes
    },
    
    liquidationAuction: {
      name: "LiquidationAuction",
      upgradeable: true,
      auctionDuration: 1800, // 30 minutes
      minBidIncrement: 100, // 1%
      startingDiscountRate: 500, // 5%
    },
    
    mevProtection: {
      name: "MEVProtection",
      upgradeable: true,
      maxPriceDeviation: 200, // 2%
      blockDelay: 1,
      whitelistedRelayers: [],
    },
    
    // Phase 4: Liquidity Pool Layer
    riverPool: {
      name: "RiverPool LP Token",
      symbol: "rLP",
      upgradeable: true,
      minDepositAmount: ethers.utils.parseUnits(process.env.MIN_DEPOSIT_AMOUNT || "100", 6), // 100 USDC
      minWithdrawAmount: ethers.utils.parseUnits(process.env.MIN_WITHDRAW_AMOUNT || "10", 6), // 10 USDC
      withdrawalFee: 50, // 0.5%
      performanceFee: 1000, // 10%
    },
    
    lpBucketManager: {
      name: "LPBucketManager",
      upgradeable: true,
      bucketWeights: {
        A_PASSIVE_MAKER: 4500,      // 45%
        B_ACTIVE_REBALANCER: 2000,  // 20%
        L1_PRIMARY_LIQUIDATOR: 2500, // 25%
        L2_BACKSTOP: 1000           // 10%
      },
      rebalanceInterval: 4 * 60 * 60, // 4 hours
      maxWeightDeviation: 1000,       // 10%
    },
    
    revenueDistribution: {
      name: "RevenueDistribution",
      upgradeable: true,
      minimumDistributionAmount: ethers.utils.parseUnits("1000", 6), // 1000 USDC
      distributionInterval: 24 * 60 * 60, // 24 hours
      treasuryShare: 2000, // 20%
      lpShare: 6000, // 60%
      stakingShare: 2000, // 20%
    },
    
    insuranceFund: {
      name: "InsuranceFund",
      upgradeable: true,
      bEventLimitBps: 8,      // 0.08%
      fifteenMinLimitBps: 20, // 0.20%
      dailyLimitBps: 200,     // 2.00%
      safeModeThresholds: {
        l1: 8000, // 80%
        l2: 6000, // 60%
        l3: 4000, // 40%
        l4: 2000  // 20%
      },
      minReserveRatio: 1000, // 10%
    },
  },
  
  // Deployment phases
  phases: {
    phase1: {
      name: "Infrastructure Layer",
      contracts: ["contractRegistry", "accessControl"],
      dependencies: [],
    },
    
    phase2: {
      name: "Core Trading Layer", 
      contracts: ["marginManager", "orderManager", "perpetualTrading"],
      dependencies: ["phase1"],
    },
    
    phase3: {
      name: "Settlement & Liquidation Layer",
      contracts: ["batchSettlement", "liquidationEngine", "liquidationAuction", "mevProtection"],
      dependencies: ["phase1", "phase2"],
    },
    
    phase4: {
      name: "Liquidity Pool Layer",
      contracts: ["riverPool", "lpBucketManager", "revenueDistribution", "insuranceFund"],
      dependencies: ["phase1", "phase2", "phase3"],
    },
  },
  
  // Gas and timing settings
  deployment: {
    gasLimit: parseInt(process.env.GAS_LIMIT || "10000000"),
    gasPrice: process.env.GAS_PRICE,
    confirmations: 1,
    timeout: 300000, // 5 minutes
    retries: 3,
    verifyDelay: parseInt(process.env.ETHERSCAN_VERIFY_DELAY || "30000"), // 30 seconds
  },
  
  // Security settings
  security: {
    enableEmergencyPause: process.env.ENABLE_EMERGENCY_PAUSE === "true",
    emergencyPauseAdmin: process.env.EMERGENCY_PAUSE_ADMIN,
    timelockDelay: 24 * 60 * 60, // 24 hours
    multisigThreshold: 3, // 3 of 5 multisig
  },
};

module.exports = DEPLOYMENT_CONFIG;