/**
 * Phase 2 Deployment Script - Core Trading Layer
 * Deploys: MarginManager, OrderManager, PerpetualTrading
 * Dependencies: Phase 1 (ContractRegistry, AccessControl)
 */

const { ethers, network } = require("hardhat");
const DeploymentUtils = require("./utils/deployment-utils");
const DEPLOYMENT_CONFIG = require("../config/deployment-config");

async function deployPhase2() {
  console.log("\\n🚀 Starting Phase 2 Deployment - Core Trading Layer");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);
  
  // Initialize deployment utils
  const deploymentUtils = new DeploymentUtils(networkName);
  
  // Check Phase 1 completion
  if (!deploymentUtils.deployment.phases.phase1 || deploymentUtils.deployment.phases.phase1.status !== "completed") {
    throw new Error("Phase 1 must be completed before Phase 2. Run deploy-phase1.js first.");
  }
  
  deploymentUtils.deployment.status = "phase2-started";
  deploymentUtils.saveDeployment();
  
  // Get network configuration
  const networkConfig = DEPLOYMENT_CONFIG.networks[networkName] || DEPLOYMENT_CONFIG.networks.hardhat;
  const deploymentConfig = DEPLOYMENT_CONFIG.deployment;
  const contractsConfig = DEPLOYMENT_CONFIG.contracts;
  
  console.log("\\nPhase 2 Dependencies Check:");
  console.log(`- ContractRegistry: ${deploymentUtils.deployment.contracts.ContractRegistry?.address}`);
  console.log(`- AccessControl: ${deploymentUtils.deployment.contracts.AccessControl?.address}`);
  
  try {
    const deployedContracts = [];
    
    // Get Phase 1 contracts
    const contractRegistry = await deploymentUtils.getContract("ContractRegistry");
    const accessControl = await deploymentUtils.getContract("AccessControl");
    
    // Setup base asset (deploy mock USDC if needed)
    let baseAssetAddress = networkConfig.baseAsset;
    if (!baseAssetAddress || networkName === "hardhat" || networkName === "localhost") {
      console.log("\\n🪙 Phase 2.0: Deploying Mock USDC...");
      baseAssetAddress = await deploymentUtils.deployMockUSDC(deployer);
      deploymentUtils.deployment.baseAsset = baseAssetAddress;
      deploymentUtils.saveDeployment();
    }
    console.log(`Base Asset (USDC): ${baseAssetAddress}`);
    
    // 1. Deploy MarginManager (upgradeable)
    console.log("\\n💰 Phase 2.1: Deploying MarginManager...");
    const marginManager = await deploymentUtils.deployUpgradeableContract(
      "MarginManager",
      [
        baseAssetAddress,
        contractRegistry.address,
        contractsConfig.marginManager.initialMarginRatio,
        contractsConfig.marginManager.maintenanceMarginRatio,
        contractsConfig.marginManager.liquidationMarginRatio,
        contractsConfig.marginManager.maxLeverage
      ],
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: networkConfig.gasPrice,
      }
    );
    deployedContracts.push("MarginManager");
    
    // 2. Deploy OrderManager (upgradeable)
    console.log("\\n📝 Phase 2.2: Deploying OrderManager...");
    const orderManager = await deploymentUtils.deployUpgradeableContract(
      "OrderManager",
      [
        baseAssetAddress,
        contractRegistry.address,
        contractsConfig.orderManager.maxOrdersPerUser,
        contractsConfig.orderManager.orderExpiryTime,
        contractsConfig.orderManager.minOrderValue
      ],
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: networkConfig.gasPrice,
      }
    );
    deployedContracts.push("OrderManager");
    
    // 3. Deploy PerpetualTrading (upgradeable)
    console.log("\\n⚡ Phase 2.3: Deploying PerpetualTrading...");
    const perpetualTrading = await deploymentUtils.deployUpgradeableContract(
      "PerpetualTrading",
      [
        baseAssetAddress,
        contractRegistry.address,
        contractsConfig.perpetualTrading.tradingFeeRate,
        contractsConfig.perpetualTrading.maxPositionSize,
        contractsConfig.perpetualTrading.priceImpactThreshold
      ],
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: networkConfig.gasPrice,
      }
    );
    deployedContracts.push("PerpetualTrading");
    
    // 4. Register contracts in ContractRegistry
    console.log("\\n📋 Phase 2.4: Registering contracts in ContractRegistry...");
    
    const contractNames = [
      { name: "MarginManager", contract: marginManager },
      { name: "OrderManager", contract: orderManager }, 
      { name: "PerpetualTrading", contract: perpetualTrading }
    ];
    
    for (const { name, contract } of contractNames) {
      await deploymentUtils.executeTransaction(
        "ContractRegistry",
        "setContract",
        [ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)), contract.address]
      );
    }
    
    // 5. Configure contract dependencies
    console.log("\\n🔗 Phase 2.5: Configuring contract dependencies...");
    
    // Set MarginManager in OrderManager
    await deploymentUtils.executeTransaction(
      "OrderManager",
      "setMarginManager",
      [marginManager.address]
    );
    
    // Set OrderManager in PerpetualTrading
    await deploymentUtils.executeTransaction(
      "PerpetualTrading", 
      "setOrderManager",
      [orderManager.address]
    );
    
    // Set MarginManager in PerpetualTrading
    await deploymentUtils.executeTransaction(
      "PerpetualTrading",
      "setMarginManager", 
      [marginManager.address]
    );
    
    // Grant necessary roles
    console.log("\\n🔑 Phase 2.6: Setting up permissions...");
    const { roles } = DEPLOYMENT_CONFIG.contracts.accessControl;
    
    // Grant OPERATOR_ROLE to core contracts for inter-contract calls
    const operatorContracts = [marginManager.address, orderManager.address, perpetualTrading.address];
    
    for (const contractAddress of operatorContracts) {
      await deploymentUtils.executeTransaction(
        "AccessControl",
        "grantRole",
        [roles.OPERATOR_ROLE, contractAddress]
      );
    }
    
    // 6. Configure oracle if available
    if (networkConfig.chainlinkPriceFeed || networkConfig.pythPriceFeed) {
      console.log("\\n🔮 Phase 2.7: Setting up price oracles...");
      
      if (networkConfig.chainlinkPriceFeed) {
        await deploymentUtils.executeTransaction(
          "PerpetualTrading",
          "setChainlinkPriceFeed",
          [networkConfig.chainlinkPriceFeed]
        );
      }
      
      if (networkConfig.pythPriceFeed) {
        await deploymentUtils.executeTransaction(
          "PerpetualTrading", 
          "setPythPriceFeed",
          [networkConfig.pythPriceFeed]
        );
      }
    }
    
    // 7. Verify contracts if enabled
    if (networkConfig.verify) {
      console.log("\\n🔍 Phase 2.8: Verifying contracts...");
      
      console.log(`Waiting ${deploymentConfig.verifyDelay / 1000}s before verification...`);
      await new Promise(resolve => setTimeout(resolve, deploymentConfig.verifyDelay));
      
      try {
        const verificationArgs = [
          ["MarginManager", [baseAssetAddress, contractRegistry.address, ...Object.values(contractsConfig.marginManager).slice(0, 4)]],
          ["OrderManager", [baseAssetAddress, contractRegistry.address, ...Object.values(contractsConfig.orderManager).slice(0, 3)]],
          ["PerpetualTrading", [baseAssetAddress, contractRegistry.address, ...Object.values(contractsConfig.perpetualTrading).slice(0, 3)]]
        ];
        
        for (const [name, args] of verificationArgs) {
          await deploymentUtils.verifyContract(name, args);
        }
      } catch (error) {
        console.warn("Verification failed, continuing...", error.message);
      }
    }
    
    // 8. Mark phase as completed
    deploymentUtils.markPhaseCompleted("phase2", deployedContracts);
    deploymentUtils.deployment.status = "phase2-completed";
    deploymentUtils.saveDeployment();
    
    // 9. Print summary
    console.log("\\n✅ Phase 2 Deployment Completed Successfully!");
    deploymentUtils.printDeploymentSummary();
    
    // 10. Verify deployment integrity
    console.log("\\n🔬 Verifying deployment integrity...");
    await verifyPhase2Deployment(deploymentUtils);
    
    return {
      marginManager,
      orderManager,
      perpetualTrading,
      deploymentUtils,
    };
    
  } catch (error) {
    console.error("\\n❌ Phase 2 deployment failed:", error);
    deploymentUtils.deployment.status = "phase2-failed";
    deploymentUtils.deployment.error = error.message;
    deploymentUtils.saveDeployment();
    throw error;
  }
}

/**
 * Verify Phase 2 deployment integrity
 */
async function verifyPhase2Deployment(deploymentUtils) {
  try {
    const contractRegistry = await deploymentUtils.getContract("ContractRegistry");
    const marginManager = await deploymentUtils.getContract("MarginManager");
    const orderManager = await deploymentUtils.getContract("OrderManager");
    const perpetualTrading = await deploymentUtils.getContract("PerpetualTrading");
    
    // Verify contract registration
    const marginManagerAddr = await contractRegistry.getContract(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MarginManager"))
    );
    const orderManagerAddr = await contractRegistry.getContract(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("OrderManager"))
    );
    const perpetualTradingAddr = await contractRegistry.getContract(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PerpetualTrading"))
    );
    
    console.log(`✓ MarginManager registered: ${marginManagerAddr}`);
    console.log(`✓ OrderManager registered: ${orderManagerAddr}`);
    console.log(`✓ PerpetualTrading registered: ${perpetualTradingAddr}`);
    
    // Verify contract dependencies
    const marginManagerInOrder = await orderManager.marginManager();
    const orderManagerInPerpetual = await perpetualTrading.orderManager();
    const marginManagerInPerpetual = await perpetualTrading.marginManager();
    
    console.log(`✓ OrderManager knows MarginManager: ${marginManagerInOrder}`);
    console.log(`✓ PerpetualTrading knows OrderManager: ${orderManagerInPerpetual}`);
    console.log(`✓ PerpetualTrading knows MarginManager: ${marginManagerInPerpetual}`);
    
    // Verify contract parameters
    const maxLeverage = await marginManager.maxLeverage();
    const maxOrders = await orderManager.maxOrdersPerUser();
    const tradingFeeRate = await perpetualTrading.tradingFeeRate();
    
    console.log(`✓ MarginManager max leverage: ${maxLeverage}`);
    console.log(`✓ OrderManager max orders per user: ${maxOrders}`);
    console.log(`✓ PerpetualTrading fee rate: ${tradingFeeRate} bps`);
    
    console.log("\\n🎉 Phase 2 integrity verification completed!");
    
  } catch (error) {
    console.error("❌ Phase 2 verification failed:", error);
    throw error;
  }
}

// Export for testing and other scripts
module.exports = { deployPhase2 };

// Execute if called directly
if (require.main === module) {
  deployPhase2()
    .then(() => {
      console.log("\\n🎊 Phase 2 deployment script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\\n💥 Phase 2 deployment script failed:", error);
      process.exit(1);
    });
}