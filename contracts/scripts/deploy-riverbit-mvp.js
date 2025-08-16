const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

// MVP Deployment Configuration
const MVP_CONFIG = {
  // Test USDC on Arbitrum Sepolia
  USDC_ADDRESS: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  
  // Network configurations
  networks: {
    arbitrumSepolia: {
      chainId: 421614,
      gasPrice: "100000000", // 0.1 gwei
      gasLimit: "10000000",
      confirmations: 1
    }
  },
  
  // Core parameters for RiverBit MVP
  coreParams: {
    maxLeverage: 100,
    tradingFee: 30, // 0.3% = 30 basis points
    liquidationThreshold: 1000, // 10% = 1000 basis points
    marginRequirement: 500, // 5% = 500 basis points
    
    // Bucket weights (in basis points, total = 10000)
    bucketWeights: {
      A_PASSIVE_MAKER: 4500,     // 45%
      B_ACTIVE_REBALANCER: 2000, // 20%
      L1_PRIMARY_LIQUIDATOR: 2500, // 25%
      L2_BACKSTOP: 1000          // 10%
    }
  }
};

class RiverBitMVPDeployer {
  constructor() {
    this.deployedContracts = {};
    this.deploymentResults = {
      network: "",
      chainId: 0,
      timestamp: Date.now(),
      contracts: {},
      gasUsed: 0,
      verification: {}
    };
  }

  async deploy() {
    console.log("🚀 RiverBit MVP Smart Contract Deployment");
    console.log("==========================================");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    this.deploymentResults.network = network.name;
    this.deploymentResults.chainId = network.chainId;
    
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
    console.log("");

    try {
      // Phase 1: Deploy Core Infrastructure
      await this.deployPhase1();
      
      // Phase 2: Deploy Oracle System
      await this.deployPhase2();
      
      // Phase 3: Deploy LP Management
      await this.deployPhase3();
      
      // Phase 4: Initialize and Connect
      await this.deployPhase4();
      
      // Generate configuration files
      await this.generateConfigFiles();
      
      // Deployment summary
      this.generateDeploymentSummary();
      
      console.log("✅ RiverBit MVP Deployment Completed Successfully!");
      
    } catch (error) {
      console.error("❌ Deployment Failed:", error.message);
      console.error(error);
      await this.saveDeploymentResults();
      throw error;
    }
  }

  async deployPhase1() {
    console.log("📋 Phase 1: Core Infrastructure");
    console.log("─".repeat(40));
    
    // Deploy ThreeIronLaws enforcement system
    console.log("  📦 Deploying ThreeIronLaws...");
    const ThreeIronLaws = await ethers.getContractFactory("contracts/core/ThreeIronLaws.sol:ThreeIronLaws");
    const threeIronLaws = await ThreeIronLaws.deploy();
    await threeIronLaws.deployed();
    this.deployedContracts.ThreeIronLaws = threeIronLaws;
    console.log(`     ✅ ThreeIronLaws deployed at: ${threeIronLaws.address}`);
    
    // Deploy S-Auth Settlement V2
    console.log("  📦 Deploying SAuthSettlementV2...");
    const SAuthSettlementV2 = await ethers.getContractFactory("contracts/core/SAuthSettlementV2.sol:SAuthSettlementV2");
    const sAuthSettlement = await SAuthSettlementV2.deploy(
      MVP_CONFIG.USDC_ADDRESS,
      threeIronLaws.address
    );
    await sAuthSettlement.deployed();
    this.deployedContracts.SAuthSettlementV2 = sAuthSettlement;
    console.log(`     ✅ SAuthSettlementV2 deployed at: ${sAuthSettlement.address}`);
    
    console.log("  ✅ Phase 1 completed\n");
  }

  async deployPhase2() {
    console.log("📋 Phase 2: Oracle System");
    console.log("─".repeat(40));
    
    // Deploy Price Oracle Aggregator
    console.log("  📦 Deploying PriceOracleAggregator...");
    const PriceOracleAggregator = await ethers.getContractFactory("contracts/oracles/PriceOracleAggregator.sol:PriceOracleAggregator");
    const priceOracle = await PriceOracleAggregator.deploy();
    await priceOracle.deployed();
    this.deployedContracts.PriceOracleAggregator = priceOracle;
    console.log(`     ✅ PriceOracleAggregator deployed at: ${priceOracle.address}`);
    
    // Initialize oracle with test markets
    console.log("  🔧 Initializing oracle markets...");
    const markets = [
      ethers.encodeBytes32String("BTC/USD"),
      ethers.encodeBytes32String("ETH/USD"),
      ethers.encodeBytes32String("SOL/USD"),
      ethers.encodeBytes32String("AAPL"),
      ethers.encodeBytes32String("TSLA")
    ];
    
    for (const market of markets) {
      await priceOracle.initializeMarket(
        market,
        ethers.parseEther("50000"), // Default price: $50,000 (for BTC reference)
        80 // Default health score: 80
      );
    }
    
    console.log("  ✅ Phase 2 completed\n");
  }

  async deployPhase3() {
    console.log("📋 Phase 3: LP Management");
    console.log("─".repeat(40));
    
    // Deploy Four Bucket LP Manager
    console.log("  📦 Deploying FourBucketLPManager...");
    const FourBucketLPManager = await ethers.getContractFactory("contracts/lp/FourBucketLPManager.sol:FourBucketLPManager");
    const lpManager = await FourBucketLPManager.deploy(
      MVP_CONFIG.USDC_ADDRESS,
      Object.values(MVP_CONFIG.coreParams.bucketWeights)
    );
    await lpManager.deployed();
    this.deployedContracts.FourBucketLPManager = lpManager;
    console.log(`     ✅ FourBucketLPManager deployed at: ${lpManager.address}`);
    
    console.log("  ✅ Phase 3 completed\n");
  }

  async deployPhase4() {
    console.log("📋 Phase 4: Initialize and Connect");
    console.log("─".repeat(40));
    
    const [deployer] = await ethers.getSigners();
    
    // Connect S-Auth with other contracts
    console.log("  🔗 Connecting contract integrations...");
    const sAuthSettlement = this.deployedContracts.SAuthSettlementV2;
    const priceOracle = this.deployedContracts.PriceOracleAggregator;
    const lpManager = this.deployedContracts.FourBucketLPManager;
    
    // Set oracle in S-Auth settlement
    await sAuthSettlement.setOracle(priceOracle.address);
    console.log("     ✅ Oracle connected to settlement system");
    
    // Set LP manager in S-Auth settlement
    await sAuthSettlement.setLPManager(lpManager.address);
    console.log("     ✅ LP manager connected to settlement system");
    
    // Grant operator roles
    const operatorRole = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
    await sAuthSettlement.grantRole(operatorRole, deployer.address);
    console.log("     ✅ Operator roles configured");
    
    // Set trading parameters
    console.log("  🔧 Setting trading parameters...");
    await sAuthSettlement.setTradingParameters(
      MVP_CONFIG.coreParams.maxLeverage,
      MVP_CONFIG.coreParams.tradingFee,
      MVP_CONFIG.coreParams.liquidationThreshold,
      MVP_CONFIG.coreParams.marginRequirement
    );
    console.log("     ✅ Trading parameters configured");
    
    // Initialize test markets in settlement system
    console.log("  📊 Initializing trading markets...");
    const tradingMarkets = [
      { symbol: "BTC/USD", leverage: 100, fee: 30 },
      { symbol: "ETH/USD", leverage: 100, fee: 30 },
      { symbol: "SOL/USD", leverage: 100, fee: 35 },
      { symbol: "AAPL", leverage: 20, fee: 40 },
      { symbol: "TSLA", leverage: 20, fee: 40 }
    ];
    
    for (const market of tradingMarkets) {
      await sAuthSettlement.initializeMarket(
        ethers.encodeBytes32String(market.symbol),
        market.leverage,
        market.fee,
        ethers.parseEther("10") // Min order size: $10
      );
    }
    console.log("     ✅ Trading markets initialized");
    
    console.log("  ✅ Phase 4 completed\n");
  }

  async generateConfigFiles() {
    console.log("📄 Generating Configuration Files");
    console.log("─".repeat(40));
    
    // Create contract addresses configuration
    const contractAddresses = {};
    for (const [name, contract] of Object.entries(this.deployedContracts)) {
      contractAddresses[name] = contract.address;
    }
    
    // Create config directory if it doesn't exist
    const configDir = path.join(__dirname, "..", "config");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Write contract addresses
    const addressesFile = path.join(configDir, "riverbit-mvp-addresses.json");
    fs.writeFileSync(addressesFile, JSON.stringify({
      network: this.deploymentResults.network,
      chainId: this.deploymentResults.chainId,
      timestamp: this.deploymentResults.timestamp,
      contracts: contractAddresses
    }, null, 2));
    
    // Generate ABI exports for frontend
    const abisDir = path.join(__dirname, "..", "abis");
    if (!fs.existsSync(abisDir)) {
      fs.mkdirSync(abisDir, { recursive: true });
    }
    
    // Copy ABIs to frontend-friendly location
    for (const [name, contract] of Object.entries(this.deployedContracts)) {
      const artifactPath = path.join(__dirname, "..", "artifacts", "contracts");
      let abiPath;
      
      // Find the correct artifact path
      if (name === "ThreeIronLaws") {
        abiPath = path.join(artifactPath, "core", "ThreeIronLaws.sol", "ThreeIronLaws.json");
      } else if (name === "SAuthSettlementV2") {
        abiPath = path.join(artifactPath, "core", "SAuthSettlementV2.sol", "SAuthSettlementV2.json");
      } else if (name === "PriceOracleAggregator") {
        abiPath = path.join(artifactPath, "oracles", "PriceOracleAggregator.sol", "PriceOracleAggregator.json");
      } else if (name === "FourBucketLPManager") {
        abiPath = path.join(artifactPath, "lp", "FourBucketLPManager.sol", "FourBucketLPManager.json");
      }
      
      if (abiPath && fs.existsSync(abiPath)) {
        const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        fs.writeFileSync(
          path.join(abisDir, `${name}.json`),
          JSON.stringify(artifact.abi, null, 2)
        );
      }
    }
    
    // Update frontend contract constants
    const frontendConstantsPath = path.join(__dirname, "..", "..", "constants", "contractConstants.ts");
    if (fs.existsSync(frontendConstantsPath)) {
      console.log("  🔄 Updating frontend contract constants...");
      
      const newAddresses = `
// RiverBit MVP Contract Addresses (Auto-generated)
export const RIVERBIT_MVP_ADDRESSES = {
  arbitrumSepolia: {
    ThreeIronLaws: "${contractAddresses.ThreeIronLaws}",
    SAuthSettlementV2: "${contractAddresses.SAuthSettlementV2}",
    PriceOracleAggregator: "${contractAddresses.PriceOracleAggregator}",
    FourBucketLPManager: "${contractAddresses.FourBucketLPManager}",
    USDC: "${MVP_CONFIG.USDC_ADDRESS}"
  }
};

// Updated: ${new Date().toISOString()}
`;
      
      fs.appendFileSync(frontendConstantsPath, newAddresses);
    }
    
    console.log("  ✅ Configuration files generated");
    console.log(`     📄 Addresses: ${addressesFile}`);
    console.log(`     📄 ABIs: ${abisDir}`);
    console.log("");
  }

  generateDeploymentSummary() {
    console.log("=".repeat(60));
    console.log("📋 RIVERBIT MVP DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log(`Network: ${this.deploymentResults.network}`);
    console.log(`Chain ID: ${this.deploymentResults.chainId}`);
    console.log(`Timestamp: ${new Date(this.deploymentResults.timestamp).toISOString()}`);
    console.log("");
    
    console.log("📦 DEPLOYED CONTRACTS:");
    console.log("-".repeat(40));
    for (const [name, contract] of Object.entries(this.deployedContracts)) {
      console.log(`${name}:`);
      console.log(`  Address: ${contract.address}`);
      console.log(`  Tx Hash: ${contract.deployTransaction?.hash || 'N/A'}`);
      console.log("");
    }
    
    console.log("🎯 KEY FEATURES DEPLOYED:");
    console.log("-".repeat(40));
    console.log("✅ Three Iron Laws Enforcement");
    console.log("✅ S-Auth Signature-based Trading");
    console.log("✅ Multi-source Price Oracles");
    console.log("✅ Four-bucket LP Architecture");
    console.log("✅ Cross-margin & Isolated margin");
    console.log("✅ Graduated liquidation system");
    console.log("✅ Support for crypto & stock perpetuals");
    console.log("");
    
    console.log("📊 TRADING MARKETS INITIALIZED:");
    console.log("-".repeat(40));
    console.log("Crypto (24/7, up to 100x leverage):");
    console.log("  - BTC/USD, ETH/USD, SOL/USD");
    console.log("");
    console.log("Stocks (RTH + ETMA, up to 20x leverage):");
    console.log("  - AAPL, TSLA");
    console.log("");
    
    console.log("🚀 NEXT STEPS:");
    console.log("-".repeat(40));
    console.log("1. Test trading functionality on Arbitrum Sepolia");
    console.log("2. Verify contracts on Arbiscan");
    console.log("3. Update frontend with new contract addresses");
    console.log("4. Run integration tests");
    console.log("5. Prepare for mainnet deployment");
    console.log("");
    
    console.log("🎉 RiverBit MVP is ready for testing!");
  }

  async saveDeploymentResults() {
    // Add contracts to results
    for (const [name, contract] of Object.entries(this.deployedContracts)) {
      this.deploymentResults.contracts[name] = {
        address: contract.address,
        txHash: contract.deployTransaction?.hash
      };
    }
    
    // Save to file
    const resultsFile = path.join(__dirname, "..", `riverbit-mvp-deployment-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(this.deploymentResults, null, 2));
    console.log(`📄 Deployment results saved: ${resultsFile}`);
  }
}

// Main deployment function
async function main() {
  console.log("Checking prerequisites...");
  
  // Check if we're on the right network
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 421614) {
    console.log("⚠️  Warning: Not on Arbitrum Sepolia (421614)");
    console.log(`Current network: ${network.name} (${network.chainId})`);
  }
  
  // Check deployer balance
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const minBalance = ethers.parseEther("0.01"); // 0.01 ETH minimum for Arbitrum
  
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.01 ETH, have ${ethers.formatEther(balance)} ETH`);
  }
  
  console.log("✅ Prerequisites checked\n");
  
  // Start deployment
  const deployer_instance = new RiverBitMVPDeployer();
  await deployer_instance.deploy();
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  });

module.exports = { RiverBitMVPDeployer, MVP_CONFIG };