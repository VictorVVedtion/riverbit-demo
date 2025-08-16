const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 使用可用合约的MVP部署配置
const DEPLOYMENT_CONFIG = {
  // Test USDC on Arbitrum Sepolia
  USDC_ADDRESS: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  
  // Core parameters
  coreParams: {
    maxLeverage: 100,
    tradingFee: 30, // 0.3% = 30 basis points
    liquidationThreshold: 1000, // 10% = 1000 basis points
    marginRequirement: 500, // 5% = 500 basis points
  }
};

class RiverBitDeployer {
  constructor() {
    this.deployedContracts = {};
    this.deploymentResults = {
      network: "",
      chainId: 0,
      timestamp: Date.now(),
      contracts: {},
      gasUsed: 0
    };
  }

  async deploy() {
    console.log("🚀 RiverBit Contract Deployment (Available Contracts)");
    console.log("=====================================================");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    this.deploymentResults.network = network.name;
    this.deploymentResults.chainId = Number(network.chainId);
    
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
    console.log("");

    try {
      // Deploy available contracts
      await this.deployCore();
      await this.deployManagement();
      await this.deployGovernance();
      
      // Generate configuration files
      await this.generateConfigFiles();
      
      // Deployment summary
      this.generateDeploymentSummary();
      
      console.log("✅ RiverBit Deployment Completed Successfully!");
      
    } catch (error) {
      console.error("❌ Deployment Failed:", error.message);
      console.error(error);
      await this.saveDeploymentResults();
      throw error;
    }
  }

  async deployCore() {
    console.log("📋 Phase 1: Core Contracts");
    console.log("─".repeat(40));
    
    // Deploy RiverBitCoreV2 first (needed as coreContract parameter)
    console.log("  📦 Deploying RiverBitCoreV2...");
    const RiverBitCoreV2 = await ethers.getContractFactory("RiverBitCoreV2");
    const riverBitCore = await RiverBitCoreV2.deploy();
    await riverBitCore.waitForDeployment();
    this.deployedContracts.RiverBitCoreV2 = riverBitCore;
    console.log(`     ✅ RiverBitCoreV2 deployed at: ${await riverBitCore.getAddress()}`);
    
    // Get deployer address for admin role
    const [deployer] = await ethers.getSigners();
    
    // Deploy SAuthSettlement as upgradeable proxy
    console.log("  📦 Deploying SAuthSettlement (Upgradeable)...");
    const SAuthSettlement = await ethers.getContractFactory("SAuthSettlement");
    const sAuthSettlement = await upgrades.deployProxy(
      SAuthSettlement,
      [
        DEPLOYMENT_CONFIG.USDC_ADDRESS,     // _baseAsset
        await riverBitCore.getAddress(),     // _coreContract  
        deployer.address                     // _admin
      ],
      { initializer: 'initialize' }
    );
    await sAuthSettlement.waitForDeployment();
    this.deployedContracts.SAuthSettlement = sAuthSettlement;
    console.log(`     ✅ SAuthSettlement deployed at: ${await sAuthSettlement.getAddress()}`);
    
    console.log("  ✅ Phase 1 completed\n");
  }

  async deployManagement() {
    console.log("📋 Phase 2: Management Systems");
    console.log("─".repeat(40));
    
    // Get deployer and core contract for parameters
    const [deployer] = await ethers.getSigners();
    const coreContractAddress = await this.deployedContracts.RiverBitCoreV2.getAddress();
    
    // Deploy LPBucketManager as upgradeable proxy
    console.log("  📦 Deploying LPBucketManager (Upgradeable)...");
    const LPBucketManager = await ethers.getContractFactory("LPBucketManager");
    const lpManager = await upgrades.deployProxy(
      LPBucketManager,
      [
        DEPLOYMENT_CONFIG.USDC_ADDRESS,  // _baseAsset
        coreContractAddress,             // _coreContract
        deployer.address                 // _admin
      ],
      { initializer: 'initialize' }
    );
    await lpManager.waitForDeployment();
    this.deployedContracts.LPBucketManager = lpManager;
    console.log(`     ✅ LPBucketManager deployed at: ${await lpManager.getAddress()}`);
    
    // Deploy ThreeGatesRiskManager
    console.log("  📦 Deploying ThreeGatesRiskManager...");
    const ThreeGatesRiskManager = await ethers.getContractFactory("ThreeGatesRiskManager");
    const riskManager = await ThreeGatesRiskManager.deploy();
    await riskManager.waitForDeployment();
    this.deployedContracts.ThreeGatesRiskManager = riskManager;
    console.log(`     ✅ ThreeGatesRiskManager deployed at: ${await riskManager.getAddress()}`);
    
    console.log("  ✅ Phase 2 completed\n");
  }

  async deployGovernance() {
    console.log("📋 Phase 3: Governance & Registry");
    console.log("─".repeat(40));
    
    // Deploy GovernanceRegistry
    console.log("  📦 Deploying GovernanceRegistry...");
    const GovernanceRegistry = await ethers.getContractFactory("GovernanceRegistry");
    const governance = await GovernanceRegistry.deploy();
    await governance.waitForDeployment();
    this.deployedContracts.GovernanceRegistry = governance;
    console.log(`     ✅ GovernanceRegistry deployed at: ${await governance.getAddress()}`);
    
    console.log("  ✅ Phase 3 completed\n");
  }

  async generateConfigFiles() {
    console.log("📄 Generating Configuration Files");
    console.log("─".repeat(40));
    
    // Create contract addresses configuration
    const contractAddresses = {};
    for (const [name, contract] of Object.entries(this.deployedContracts)) {
      contractAddresses[name] = await contract.getAddress();
    }
    
    // Create config directory if it doesn't exist
    const configDir = path.join(__dirname, "..", "config");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Write contract addresses
    const addressesFile = path.join(configDir, "riverbit-deployed-addresses.json");
    fs.writeFileSync(addressesFile, JSON.stringify({
      network: this.deploymentResults.network,
      chainId: this.deploymentResults.chainId,
      timestamp: this.deploymentResults.timestamp,
      contracts: contractAddresses,
      usdcAddress: DEPLOYMENT_CONFIG.USDC_ADDRESS
    }, null, 2));
    
    // Generate ABI exports for frontend
    const abisDir = path.join(__dirname, "..", "abis");
    if (!fs.existsSync(abisDir)) {
      fs.mkdirSync(abisDir, { recursive: true });
    }
    
    // Copy ABIs to frontend-friendly location
    for (const [name, contract] of Object.entries(this.deployedContracts)) {
      const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`);
      
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        fs.writeFileSync(
          path.join(abisDir, `${name}.json`),
          JSON.stringify(artifact.abi, null, 2)
        );
      }
    }
    
    console.log("  ✅ Configuration files generated");
    console.log(`     📄 Addresses: ${addressesFile}`);
    console.log(`     📄 ABIs: ${abisDir}`);
    console.log("");
  }

  generateDeploymentSummary() {
    console.log("=".repeat(60));
    console.log("📋 RIVERBIT DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log(`Network: ${this.deploymentResults.network}`);
    console.log(`Chain ID: ${this.deploymentResults.chainId}`);
    console.log(`Timestamp: ${new Date(this.deploymentResults.timestamp).toISOString()}`);
    console.log("");
    
    console.log("📦 DEPLOYED CONTRACTS:");
    console.log("-".repeat(40));
    for (const [name, contract] of Object.entries(this.deployedContracts)) {
      console.log(`${name}:`);
      console.log(`  Address: ${contract.target || 'Unknown'}`);
      console.log("");
    }
    
    console.log("🎯 KEY FEATURES DEPLOYED:");
    console.log("-".repeat(40));
    console.log("✅ S-Auth Signature-based Settlement");
    console.log("✅ RiverBit Core Trading Engine V2");
    console.log("✅ LP Bucket Management System");
    console.log("✅ Three Gates Risk Management");
    console.log("✅ Governance Registry");
    console.log("");
    
    console.log("🚀 NEXT STEPS:");
    console.log("-".repeat(40));
    console.log("1. Initialize contract parameters");
    console.log("2. Set up market configurations");
    console.log("3. Test trading functionality");
    console.log("4. Verify contracts on Arbiscan");
    console.log("5. Update frontend with new addresses");
    console.log("");
    
    console.log("🎉 RiverBit Core Infrastructure is ready!");
  }

  async saveDeploymentResults() {
    // Add contracts to results
    for (const [name, contract] of Object.entries(this.deployedContracts)) {
      this.deploymentResults.contracts[name] = {
        address: await contract.getAddress(),
        txHash: contract.deploymentTransaction()?.hash || 'N/A'
      };
    }
    
    // Save to file
    const resultsFile = path.join(__dirname, "..", `riverbit-deployment-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(this.deploymentResults, null, 2));
    console.log(`📄 Deployment results saved: ${resultsFile}`);
  }
}

// Main deployment function
async function main() {
  console.log("Checking prerequisites...");
  
  // Check if we're on the right network
  const network = await ethers.provider.getNetwork();
  if (Number(network.chainId) !== 421614) {
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
  const deployer_instance = new RiverBitDeployer();
  await deployer_instance.deploy();
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  });

module.exports = { RiverBitDeployer, DEPLOYMENT_CONFIG };