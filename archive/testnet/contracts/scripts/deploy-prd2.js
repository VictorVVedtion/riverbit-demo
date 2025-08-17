const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  // Network configurations
  networks: {
    arbitrumSepolia: {
      gasPrice: "100000000", // 0.1 gwei
      gasLimit: "10000000",
      confirmations: 1,
      timeout: 60000
    },
    arbitrumOne: {
      gasPrice: "100000000", // 0.1 gwei
      gasLimit: "10000000", 
      confirmations: 3,
      timeout: 120000
    }
  },
  
  // Contract deployment phases
  phases: {
    phase1: {
      name: "Core Infrastructure",
      contracts: [
        "RiverBitCoreV2",
        "GovernanceRegistry",
        "ThreeGatesRiskManager"
      ],
      dependencies: [],
      timelock: "2 days"
    },
    phase2: {
      name: "Trading Systems", 
      contracts: [
        "SAuthSettlement",
        "ETMAEngine",
        "DualMarketManager"
      ],
      dependencies: ["phase1"],
      timelock: "1 day"
    },
    phase3: {
      name: "LP and AFB Systems",
      contracts: [
        "LPBucketManager", 
        "AFBSystem"
      ],
      dependencies: ["phase1", "phase2"],
      timelock: "1 day"
    },
    phase4: {
      name: "Integration and Verification",
      contracts: [],
      dependencies: ["phase1", "phase2", "phase3"],
      timelock: "6 hours"
    }
  },

  // Initial parameters
  initialParams: {
    // Core parameters
    baseAsset: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC on Arbitrum Sepolia
    maxLeverage: 100,
    tradingFee: 30, // 0.3%
    
    // Risk parameters
    liquidationThreshold: 1000, // 10%
    marginRequirement: 500, // 5%
    
    // Governance parameters
    proposalDelay: 86400 * 2, // 2 days
    votingDuration: 86400 * 3, // 3 days
    executionDelay: 86400 * 1, // 1 day
    
    // LP Bucket weights
    bucketWeights: {
      A_PASSIVE_MAKER: 4500, // 45%
      B_ACTIVE_REBALANCER: 2000, // 20%
      L1_PRIMARY_LIQUIDATOR: 2500, // 25%
      L2_BACKSTOP: 1000 // 10%
    }
  }
};

class PRD2Deployer {
  constructor() {
    this.deployedContracts = {};
    this.deploymentResults = {
      network: "",
      timestamp: Date.now(),
      phases: {},
      gasUsed: 0,
      totalCost: "0",
      verification: {}
    };
    this.currentPhase = "";
  }

  async deploy() {
    console.log("🚀 Starting PRD 2.0 Smart Contract Deployment");
    console.log("================================================");
    
    const network = await ethers.provider.getNetwork();
    this.deploymentResults.network = network.name;
    
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${(await ethers.getSigners())[0].address}`);
    console.log("");

    try {
      // Execute deployment phases sequentially
      for (const [phaseKey, phaseConfig] of Object.entries(DEPLOYMENT_CONFIG.phases)) {
        this.currentPhase = phaseKey;
        console.log(`📋 ${phaseConfig.name} (${phaseKey.toUpperCase()})`);
        console.log("─".repeat(50));
        
        if (phaseConfig.contracts.length > 0) {
          await this.deployPhase(phaseKey, phaseConfig);
        } else {
          await this.executeIntegrationPhase(phaseKey, phaseConfig);
        }
        
        console.log("");
      }

      // Save deployment results
      await this.saveDeploymentResults();
      
      // Generate deployment summary
      this.generateDeploymentSummary();
      
      console.log("✅ PRD 2.0 Deployment Completed Successfully!");
      
    } catch (error) {
      console.error("❌ Deployment Failed:", error.message);
      console.error(error);
      await this.saveDeploymentResults();
      throw error;
    }
  }

  async deployPhase(phaseKey, phaseConfig) {
    const phaseResults = {
      contracts: {},
      gasUsed: 0,
      startTime: Date.now(),
      status: "in_progress"
    };

    try {
      // Check dependencies
      await this.checkPhaseDependencies(phaseConfig.dependencies);

      // Deploy contracts in this phase
      for (const contractName of phaseConfig.contracts) {
        console.log(`  📦 Deploying ${contractName}...`);
        
        const result = await this.deployContract(contractName, phaseKey);
        phaseResults.contracts[contractName] = result;
        phaseResults.gasUsed += result.gasUsed;
        
        console.log(`     ✅ ${contractName} deployed at: ${result.address}`);
        console.log(`     ⛽ Gas used: ${result.gasUsed.toLocaleString()}`);
      }

      // Initialize contracts
      await this.initializePhaseContracts(phaseKey, phaseConfig);

      phaseResults.status = "completed";
      phaseResults.endTime = Date.now();
      phaseResults.duration = phaseResults.endTime - phaseResults.startTime;

      this.deploymentResults.phases[phaseKey] = phaseResults;
      this.deploymentResults.gasUsed += phaseResults.gasUsed;

      console.log(`  ✅ ${phaseConfig.name} completed in ${(phaseResults.duration / 1000).toFixed(2)}s`);
      
    } catch (error) {
      phaseResults.status = "failed";
      phaseResults.error = error.message;
      phaseResults.endTime = Date.now();
      
      this.deploymentResults.phases[phaseKey] = phaseResults;
      throw error;
    }
  }

  async deployContract(contractName, phase) {
    const ContractFactory = await ethers.getContractFactory(contractName);
    
    // Get deployment parameters for this contract
    const deployParams = this.getDeploymentParams(contractName);
    
    let contract;
    let deployTx;

    // Deploy with upgrades proxy for upgradeable contracts
    if (this.isUpgradeableContract(contractName)) {
      contract = await upgrades.deployProxy(
        ContractFactory, 
        deployParams.initParams || [],
        {
          initializer: deployParams.initializer || "initialize",
          kind: "uups"
        }
      );
      deployTx = contract.deployTransaction;
    } else {
      contract = await ContractFactory.deploy(...(deployParams.constructorParams || []));
      deployTx = contract.deployTransaction;
    }

    // Wait for deployment
    await contract.deployed();
    const receipt = await deployTx.wait();

    // Store contract reference
    this.deployedContracts[contractName] = {
      contract,
      address: contract.address,
      phase
    };

    return {
      address: contract.address,
      txHash: deployTx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toNumber(),
      contract: contract
    };
  }

  async initializePhaseContracts(phaseKey, phaseConfig) {
    console.log(`  🔧 Initializing ${phaseConfig.name} contracts...`);

    switch (phaseKey) {
      case "phase1":
        await this.initializePhase1();
        break;
      case "phase2":
        await this.initializePhase2();
        break;
      case "phase3":
        await this.initializePhase3();
        break;
    }

    console.log(`  ✅ ${phaseConfig.name} contracts initialized`);
  }

  async initializePhase1() {
    const [admin] = await ethers.getSigners();
    const { baseAsset } = DEPLOYMENT_CONFIG.initialParams;

    // Initialize Governance Registry with validators
    const governanceRegistry = this.deployedContracts.GovernanceRegistry.contract;
    console.log("    📋 Setting up governance validators...");
    
    // Add initial validators (in production, use multisig addresses)
    const initialValidators = [
      admin.address,
      // Add more validator addresses here
    ];

    // Initialize Three Gates Risk Manager
    const riskManager = this.deployedContracts.ThreeGatesRiskManager.contract;
    console.log("    🛡️ Configuring risk management...");
    
    // Set default risk parameters for markets
    const defaultMarkets = [
      ethers.utils.formatBytes32String("BTC/USD"),
      ethers.utils.formatBytes32String("ETH/USD"),
      ethers.utils.formatBytes32String("xAAPL"),
      ethers.utils.formatBytes32String("xTSLA")
    ];

    for (const market of defaultMarkets) {
      await riskManager.configureMarketRisk(
        market,
        ethers.utils.parseEther("50000"), // $50k single window
        ethers.utils.parseEther("200000"), // $200k 15-minute
        ethers.utils.parseEther("1000000"), // $1M 24-hour
        DEPLOYMENT_CONFIG.initialParams.maxLeverage
      );
    }
  }

  async initializePhase2() {
    const [admin] = await ethers.getSigners();
    const coreContract = this.deployedContracts.RiverBitCoreV2.address;

    // Initialize S-Auth Settlement
    const sAuthSettlement = this.deployedContracts.SAuthSettlement.contract;
    console.log("    🔐 Configuring S-Auth settlement...");

    // Initialize ETMA Engine
    const etmaEngine = this.deployedContracts.ETMAEngine.contract;
    console.log("    🌙 Setting up ETMA engine...");
    
    // Add xStock markets to ETMA
    const xStockMarkets = [
      ethers.utils.formatBytes32String("xAAPL"),
      ethers.utils.formatBytes32String("xTSLA"),
      ethers.utils.formatBytes32String("xGOOGL"),
      ethers.utils.formatBytes32String("xAMZN")
    ];

    for (const market of xStockMarkets) {
      await etmaEngine.addMarket(market);
      
      // Set reference prices (would come from oracles in production)
      await etmaEngine.updateReferencePrice(
        market,
        ethers.utils.parseEther("150") // Default $150 reference price
      );
    }

    // Initialize Dual Market Manager
    const dualMarketManager = this.deployedContracts.DualMarketManager.contract;
    console.log("    📊 Setting up dual market structure...");

    // Create crypto markets (24/7 CLOB)
    const cryptoMarkets = [
      { id: "BTC/USD", symbol: "BTCUSD", tickSize: ethers.utils.parseEther("0.01") },
      { id: "ETH/USD", symbol: "ETHUSD", tickSize: ethers.utils.parseEther("0.01") },
      { id: "SOL/USD", symbol: "SOLUSD", tickSize: ethers.utils.parseEther("0.001") }
    ];

    for (const market of cryptoMarkets) {
      await dualMarketManager.createMarket(
        ethers.utils.formatBytes32String(market.id),
        0, // MarketType.CRYPTO_24_7
        market.symbol,
        market.tickSize,
        ethers.utils.parseEther("10"), // $10 min order
        ethers.utils.parseEther("1000000"), // $1M max order
        DEPLOYMENT_CONFIG.initialParams.maxLeverage
      );
    }

    // Create xStock markets (RTH/ETMA)
    const xStockMarketsConfig = [
      { id: "xAAPL", symbol: "AAPL", tickSize: ethers.utils.parseEther("0.01") },
      { id: "xTSLA", symbol: "TSLA", tickSize: ethers.utils.parseEther("0.01") },
      { id: "xGOOGL", symbol: "GOOGL", tickSize: ethers.utils.parseEther("0.01") },
      { id: "xAMZN", symbol: "AMZN", tickSize: ethers.utils.parseEther("0.01") }
    ];

    for (const market of xStockMarketsConfig) {
      await dualMarketManager.createMarket(
        ethers.utils.formatBytes32String(market.id),
        2, // MarketType.XSTOCK_ETMA
        market.symbol,
        market.tickSize,
        ethers.utils.parseEther("1"), // $1 min order
        ethers.utils.parseEther("100000"), // $100k max order
        20 // Lower leverage for stocks
      );
    }
  }

  async initializePhase3() {
    const [admin] = await ethers.getSigners();
    const { baseAsset } = DEPLOYMENT_CONFIG.initialParams;
    const coreContract = this.deployedContracts.RiverBitCoreV2.address;

    // Initialize LP Bucket Manager
    const lpBucketManager = this.deployedContracts.LPBucketManager.contract;
    console.log("    🪣 Setting up LP bucket architecture...");

    // Set bucket managers (in production, use dedicated manager addresses)
    const bucketTypes = [0, 1, 2, 3]; // A, B, L1, L2
    for (const bucketType of bucketTypes) {
      await lpBucketManager.setBucketManager(bucketType, admin.address);
    }

    // Initialize AFB System
    const afbSystem = this.deployedContracts.AFBSystem.contract;
    console.log("    📊 Configuring AFB system...");

    // Initialize funding for major markets
    const fundingMarkets = [
      ethers.utils.formatBytes32String("BTC/USD"),
      ethers.utils.formatBytes32String("ETH/USD"),
      ethers.utils.formatBytes32String("xAAPL"),
      ethers.utils.formatBytes32String("xTSLA")
    ];

    for (const market of fundingMarkets) {
      await afbSystem.initializeMarketFunding(market);
    }
  }

  async executeIntegrationPhase(phaseKey, phaseConfig) {
    console.log(`  🔗 Executing integration and verification...`);

    // Set up contract interconnections
    await this.setupContractIntegrations();

    // Run post-deployment verification
    await this.runVerificationChecks();

    // Generate configuration files
    await this.generateConfigFiles();

    console.log(`  ✅ Integration phase completed`);
  }

  async setupContractIntegrations() {
    console.log("    🔗 Setting up contract integrations...");

    const coreContract = this.deployedContracts.RiverBitCoreV2.contract;
    const sAuthSettlement = this.deployedContracts.SAuthSettlement.contract;
    const etmaEngine = this.deployedContracts.ETMAEngine.contract;
    const lpBucketManager = this.deployedContracts.LPBucketManager.contract;
    const afbSystem = this.deployedContracts.AFBSystem.contract;
    const dualMarketManager = this.deployedContracts.DualMarketManager.contract;

    // Connect S-Auth to core contract
    await sAuthSettlement.updateCoreContract(coreContract.address);

    // Connect ETMA to dual market manager
    await dualMarketManager.setETMAEngine(etmaEngine.address);

    // Connect AFB system to core contract
    await afbSystem.setLiquidationEngine(coreContract.address);

    // Set up cross-contract permissions
    const operatorRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("OPERATOR_ROLE"));
    await coreContract.grantRole(operatorRole, sAuthSettlement.address);
    await coreContract.grantRole(operatorRole, etmaEngine.address);
    await coreContract.grantRole(operatorRole, lpBucketManager.address);
    await coreContract.grantRole(operatorRole, afbSystem.address);

    console.log("    ✅ Contract integrations completed");
  }

  async runVerificationChecks() {
    console.log("    🔍 Running verification checks...");

    const checks = [
      this.verifyContractDeployments(),
      this.verifyContractInitialization(),
      this.verifyContractIntegrations(),
      this.verifyRolePermissions()
    ];

    const results = await Promise.all(checks);
    const allPassed = results.every(result => result);

    if (allPassed) {
      console.log("    ✅ All verification checks passed");
      this.deploymentResults.verification.status = "passed";
    } else {
      console.log("    ⚠️ Some verification checks failed");
      this.deploymentResults.verification.status = "failed";
    }

    this.deploymentResults.verification.checks = results;
  }

  async verifyContractDeployments() {
    console.log("      🔍 Verifying contract deployments...");
    
    for (const [contractName, deployment] of Object.entries(this.deployedContracts)) {
      const code = await ethers.provider.getCode(deployment.address);
      if (code === "0x") {
        console.log(`      ❌ ${contractName} not properly deployed`);
        return false;
      }
    }
    
    console.log("      ✅ All contracts properly deployed");
    return true;
  }

  async verifyContractInitialization() {
    console.log("      🔍 Verifying contract initialization...");
    
    // Check core contract initialization
    const coreContract = this.deployedContracts.RiverBitCoreV2.contract;
    const baseAsset = await coreContract.baseAsset();
    
    if (baseAsset === ethers.constants.AddressZero) {
      console.log("      ❌ Core contract not properly initialized");
      return false;
    }
    
    console.log("      ✅ Contracts properly initialized");
    return true;
  }

  async verifyContractIntegrations() {
    console.log("      🔍 Verifying contract integrations...");
    
    // Check if S-Auth is connected to core
    const sAuthSettlement = this.deployedContracts.SAuthSettlement.contract;
    const connectedCore = await sAuthSettlement.coreContract();
    
    if (connectedCore !== this.deployedContracts.RiverBitCoreV2.address) {
      console.log("      ❌ S-Auth not properly connected to core");
      return false;
    }
    
    console.log("      ✅ Contract integrations verified");
    return true;
  }

  async verifyRolePermissions() {
    console.log("      🔍 Verifying role permissions...");
    
    const [admin] = await ethers.getSigners();
    const coreContract = this.deployedContracts.RiverBitCoreV2.contract;
    const adminRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE"));
    
    const hasAdminRole = await coreContract.hasRole(adminRole, admin.address);
    
    if (!hasAdminRole) {
      console.log("      ❌ Admin role not properly assigned");
      return false;
    }
    
    console.log("      ✅ Role permissions verified");
    return true;
  }

  async generateConfigFiles() {
    console.log("    📄 Generating configuration files...");

    // Generate contract addresses file
    const contractAddresses = {};
    for (const [contractName, deployment] of Object.entries(this.deployedContracts)) {
      contractAddresses[contractName] = deployment.address;
    }

    const configDir = path.join(__dirname, "..", "config");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write addresses file
    fs.writeFileSync(
      path.join(configDir, "contract-addresses.json"),
      JSON.stringify(contractAddresses, null, 2)
    );

    // Generate deployment config for frontend
    const frontendConfig = {
      network: this.deploymentResults.network,
      contracts: contractAddresses,
      timestamp: this.deploymentResults.timestamp,
      version: "2.0.0"
    };

    fs.writeFileSync(
      path.join(configDir, "deployment-config.json"),
      JSON.stringify(frontendConfig, null, 2)
    );

    console.log("    ✅ Configuration files generated");
  }

  getDeploymentParams(contractName) {
    const [admin] = ethers.provider.getSigner();
    const { baseAsset } = DEPLOYMENT_CONFIG.initialParams;

    const params = {
      RiverBitCoreV2: {
        initParams: [baseAsset, admin.address],
        initializer: "initialize"
      },
      SAuthSettlement: {
        initParams: [baseAsset, ethers.constants.AddressZero, admin.address], // Core contract set later
        initializer: "initialize"
      },
      ETMAEngine: {
        initParams: [baseAsset, ethers.constants.AddressZero, admin.address], // Core contract set later
        initializer: "initialize"
      },
      LPBucketManager: {
        initParams: [baseAsset, ethers.constants.AddressZero, admin.address], // Core contract set later
        initializer: "initialize"
      },
      AFBSystem: {
        initParams: [baseAsset, ethers.constants.AddressZero, admin.address], // Core contract set later
        initializer: "initialize"
      },
      ThreeGatesRiskManager: {
        initParams: [admin.address],
        initializer: "initialize"
      },
      GovernanceRegistry: {
        initParams: [admin.address, [admin.address]], // Admin as initial validator
        initializer: "initialize"
      },
      DualMarketManager: {
        initParams: [baseAsset, ethers.constants.AddressZero, admin.address], // Core contract set later
        initializer: "initialize"
      }
    };

    return params[contractName] || {};
  }

  isUpgradeableContract(contractName) {
    const upgradeableContracts = [
      "RiverBitCoreV2",
      "SAuthSettlement", 
      "ETMAEngine",
      "LPBucketManager",
      "AFBSystem",
      "ThreeGatesRiskManager",
      "GovernanceRegistry",
      "DualMarketManager"
    ];
    
    return upgradeableContracts.includes(contractName);
  }

  async checkPhaseDependencies(dependencies) {
    for (const dep of dependencies) {
      if (!this.deploymentResults.phases[dep] || 
          this.deploymentResults.phases[dep].status !== "completed") {
        throw new Error(`Dependency ${dep} not completed`);
      }
    }
  }

  async saveDeploymentResults() {
    const resultsDir = path.join(__dirname, "..", "deployment-results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filename = `prd2-deployment-${this.deploymentResults.network}-${Date.now()}.json`;
    const filepath = path.join(resultsDir, filename);

    // Add contract addresses to results
    this.deploymentResults.contracts = {};
    for (const [contractName, deployment] of Object.entries(this.deployedContracts)) {
      this.deploymentResults.contracts[contractName] = {
        address: deployment.address,
        phase: deployment.phase
      };
    }

    fs.writeFileSync(filepath, JSON.stringify(this.deploymentResults, null, 2));
    console.log(`📄 Deployment results saved to: ${filepath}`);
  }

  generateDeploymentSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log(`Network: ${this.deploymentResults.network}`);
    console.log(`Total Gas Used: ${this.deploymentResults.gasUsed.toLocaleString()}`);
    console.log(`Verification Status: ${this.deploymentResults.verification?.status || 'pending'}`);
    console.log("");

    console.log("📦 DEPLOYED CONTRACTS:");
    console.log("-".repeat(40));
    for (const [contractName, deployment] of Object.entries(this.deployedContracts)) {
      console.log(`${contractName}:`);
      console.log(`  Address: ${deployment.address}`);
      console.log(`  Phase: ${deployment.phase}`);
      console.log("");
    }

    console.log("⏱️ PHASE TIMINGS:");
    console.log("-".repeat(40));
    for (const [phaseKey, phaseResult] of Object.entries(this.deploymentResults.phases)) {
      if (phaseResult.duration) {
        console.log(`${phaseKey}: ${(phaseResult.duration / 1000).toFixed(2)}s`);
      }
    }

    console.log("\n🎉 PRD 2.0 deployment completed successfully!");
    console.log("Ready for testnet integration testing.");
  }
}

// Main deployment function
async function main() {
  const deployer = new PRD2Deployer();
  await deployer.deploy();
}

// Handle deployment errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  });

module.exports = { PRD2Deployer, DEPLOYMENT_CONFIG };