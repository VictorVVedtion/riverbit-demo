/**
 * Phase 3 Deployment Script - Settlement & Liquidation Layer
 * Deploys: BatchSettlement, LiquidationEngine, LiquidationAuction, MEVProtection
 * Dependencies: Phase 1 & 2
 */

const { ethers, network } = require("hardhat");
const DeploymentUtils = require("./utils/deployment-utils");
const DEPLOYMENT_CONFIG = require("../config/deployment-config");

async function deployPhase3() {
  console.log("\\n🚀 Starting Phase 3 Deployment - Settlement & Liquidation Layer");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);
  
  // Initialize deployment utils
  const deploymentUtils = new DeploymentUtils(networkName);
  
  // Check previous phases completion
  const requiredPhases = ["phase1", "phase2"];
  for (const phase of requiredPhases) {
    if (!deploymentUtils.deployment.phases[phase] || deploymentUtils.deployment.phases[phase].status !== "completed") {
      throw new Error(`${phase} must be completed before Phase 3. Run deploy-${phase}.js first.`);
    }
  }
  
  deploymentUtils.deployment.status = "phase3-started";
  deploymentUtils.saveDeployment();
  
  // Get network configuration
  const networkConfig = DEPLOYMENT_CONFIG.networks[networkName] || DEPLOYMENT_CONFIG.networks.hardhat;
  const deploymentConfig = DEPLOYMENT_CONFIG.deployment;
  const contractsConfig = DEPLOYMENT_CONFIG.contracts;
  
  console.log("\\nPhase 3 Dependencies Check:");
  console.log(`- ContractRegistry: ${deploymentUtils.deployment.contracts.ContractRegistry?.address}`);
  console.log(`- MarginManager: ${deploymentUtils.deployment.contracts.MarginManager?.address}`);
  console.log(`- OrderManager: ${deploymentUtils.deployment.contracts.OrderManager?.address}`);
  console.log(`- PerpetualTrading: ${deploymentUtils.deployment.contracts.PerpetualTrading?.address}`);
  
  try {
    const deployedContracts = [];
    
    // Get previous phase contracts
    const contractRegistry = await deploymentUtils.getContract("ContractRegistry");
    const marginManager = await deploymentUtils.getContract("MarginManager");
    const perpetualTrading = await deploymentUtils.getContract("PerpetualTrading");
    
    const baseAssetAddress = deploymentUtils.deployment.baseAsset;
    console.log(`Base Asset (USDC): ${baseAssetAddress}`);
    
    // 1. Deploy BatchSettlement (upgradeable)
    console.log("\\n⚖️ Phase 3.1: Deploying BatchSettlement...");
    const batchSettlement = await deploymentUtils.deployUpgradeableContract(
      "BatchSettlement",
      [
        baseAssetAddress,
        contractRegistry.address,
        contractsConfig.batchSettlement.batchSize,
        contractsConfig.batchSettlement.settlementInterval,
        contractsConfig.batchSettlement.maxGasPerBatch
      ],
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: networkConfig.gasPrice,
      }
    );
    deployedContracts.push("BatchSettlement");
    
    // 2. Deploy LiquidationEngine (upgradeable)
    console.log("\\n🔥 Phase 3.2: Deploying LiquidationEngine...");
    const liquidationEngine = await deploymentUtils.deployUpgradeableContract(
      "LiquidationEngine",
      [
        baseAssetAddress,
        contractRegistry.address,
        contractsConfig.liquidationEngine.liquidationReward,
        contractsConfig.liquidationEngine.maxLiquidationRatio,
        contractsConfig.liquidationEngine.liquidationDelay
      ],
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: networkConfig.gasPrice,
      }
    );
    deployedContracts.push("LiquidationEngine");
    
    // 3. Deploy LiquidationAuction (upgradeable)
    console.log("\\n🏛️ Phase 3.3: Deploying LiquidationAuction...");
    const liquidationAuction = await deploymentUtils.deployUpgradeableContract(
      "LiquidationAuction",
      [
        baseAssetAddress,
        contractRegistry.address,
        contractsConfig.liquidationAuction.auctionDuration,
        contractsConfig.liquidationAuction.minBidIncrement,
        contractsConfig.liquidationAuction.startingDiscountRate
      ],
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: networkConfig.gasPrice,
      }
    );
    deployedContracts.push("LiquidationAuction");
    
    // 4. Deploy MEVProtection (upgradeable)
    console.log("\\n🛡️ Phase 3.4: Deploying MEVProtection...");
    const mevProtection = await deploymentUtils.deployUpgradeableContract(
      "MEVProtection",
      [
        contractRegistry.address,
        contractsConfig.mevProtection.maxPriceDeviation,
        contractsConfig.mevProtection.blockDelay
      ],
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: networkConfig.gasPrice,
      }
    );
    deployedContracts.push("MEVProtection");
    
    // 5. Register contracts in ContractRegistry
    console.log("\\n📋 Phase 3.5: Registering contracts in ContractRegistry...");
    
    const contractNames = [
      { name: "BatchSettlement", contract: batchSettlement },
      { name: "LiquidationEngine", contract: liquidationEngine },
      { name: "LiquidationAuction", contract: liquidationAuction },
      { name: "MEVProtection", contract: mevProtection }
    ];
    
    for (const { name, contract } of contractNames) {
      await deploymentUtils.executeTransaction(
        "ContractRegistry",
        "setContract",
        [ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)), contract.address]
      );
    }
    
    // 6. Configure contract dependencies
    console.log("\\n🔗 Phase 3.6: Configuring contract dependencies...");
    
    // Set LiquidationEngine in MarginManager
    await deploymentUtils.executeTransaction(
      "MarginManager",
      "setLiquidationEngine",
      [liquidationEngine.address]
    );
    
    // Set LiquidationAuction in LiquidationEngine
    await deploymentUtils.executeTransaction(
      "LiquidationEngine",
      "setLiquidationAuction",
      [liquidationAuction.address]
    );
    
    // Set BatchSettlement in PerpetualTrading
    await deploymentUtils.executeTransaction(
      "PerpetualTrading",
      "setBatchSettlement",
      [batchSettlement.address]
    );
    
    // Set MEVProtection in PerpetualTrading
    await deploymentUtils.executeTransaction(
      "PerpetualTrading",
      "setMEVProtection",
      [mevProtection.address]
    );
    
    // Configure cross-dependencies
    await deploymentUtils.executeTransaction(
      "BatchSettlement",
      "setPerpetualTrading",
      [perpetualTrading.address]
    );
    
    await deploymentUtils.executeTransaction(
      "LiquidationEngine",
      "setMarginManager",
      [marginManager.address]
    );
    
    // 7. Set up permissions
    console.log("\\n🔑 Phase 3.7: Setting up permissions...");
    const { roles } = DEPLOYMENT_CONFIG.contracts.accessControl;
    const accessControl = await deploymentUtils.getContract("AccessControl");
    
    // Grant OPERATOR_ROLE to settlement/liquidation contracts
    const operatorContracts = [
      batchSettlement.address,
      liquidationEngine.address,
      liquidationAuction.address,
      mevProtection.address
    ];
    
    for (const contractAddress of operatorContracts) {
      await deploymentUtils.executeTransaction(
        "AccessControl",
        "grantRole",
        [roles.OPERATOR_ROLE, contractAddress]
      );
    }
    
    // Grant LIQUIDATOR_ROLE to LiquidationEngine
    await deploymentUtils.executeTransaction(
      "AccessControl",
      "grantRole",
      [roles.LIQUIDATOR_ROLE, liquidationEngine.address]
    );
    
    // 8. Configure whitelist for MEVProtection if provided
    if (contractsConfig.mevProtection.whitelistedRelayers.length > 0) {
      console.log("\\n📝 Phase 3.8: Setting up MEV protection whitelist...");
      
      for (const relayer of contractsConfig.mevProtection.whitelistedRelayers) {
        await deploymentUtils.executeTransaction(
          "MEVProtection",
          "addWhitelistedRelayer",
          [relayer]
        );
      }
    }
    
    // 9. Verify contracts if enabled
    if (networkConfig.verify) {
      console.log("\\n🔍 Phase 3.9: Verifying contracts...");
      
      console.log(`Waiting ${deploymentConfig.verifyDelay / 1000}s before verification...`);
      await new Promise(resolve => setTimeout(resolve, deploymentConfig.verifyDelay));
      
      try {
        const verificationArgs = [
          ["BatchSettlement", [baseAssetAddress, contractRegistry.address, ...Object.values(contractsConfig.batchSettlement)]],
          ["LiquidationEngine", [baseAssetAddress, contractRegistry.address, ...Object.values(contractsConfig.liquidationEngine)]],
          ["LiquidationAuction", [baseAssetAddress, contractRegistry.address, ...Object.values(contractsConfig.liquidationAuction)]],
          ["MEVProtection", [contractRegistry.address, contractsConfig.mevProtection.maxPriceDeviation, contractsConfig.mevProtection.blockDelay]]
        ];
        
        for (const [name, args] of verificationArgs) {
          await deploymentUtils.verifyContract(name, args);
        }
      } catch (error) {
        console.warn("Verification failed, continuing...", error.message);
      }
    }
    
    // 10. Mark phase as completed
    deploymentUtils.markPhaseCompleted("phase3", deployedContracts);
    deploymentUtils.deployment.status = "phase3-completed";
    deploymentUtils.saveDeployment();
    
    // 11. Print summary
    console.log("\\n✅ Phase 3 Deployment Completed Successfully!");
    deploymentUtils.printDeploymentSummary();
    
    // 12. Verify deployment integrity
    console.log("\\n🔬 Verifying deployment integrity...");
    await verifyPhase3Deployment(deploymentUtils);
    
    return {
      batchSettlement,
      liquidationEngine,
      liquidationAuction,
      mevProtection,
      deploymentUtils,
    };
    
  } catch (error) {
    console.error("\\n❌ Phase 3 deployment failed:", error);
    deploymentUtils.deployment.status = "phase3-failed";
    deploymentUtils.deployment.error = error.message;
    deploymentUtils.saveDeployment();
    throw error;
  }
}

/**
 * Verify Phase 3 deployment integrity
 */
async function verifyPhase3Deployment(deploymentUtils) {
  try {
    const contractRegistry = await deploymentUtils.getContract("ContractRegistry");
    const marginManager = await deploymentUtils.getContract("MarginManager");
    const perpetualTrading = await deploymentUtils.getContract("PerpetualTrading");
    const batchSettlement = await deploymentUtils.getContract("BatchSettlement");
    const liquidationEngine = await deploymentUtils.getContract("LiquidationEngine");
    const liquidationAuction = await deploymentUtils.getContract("LiquidationAuction");
    const mevProtection = await deploymentUtils.getContract("MEVProtection");
    
    // Verify contract registration
    console.log("\\nChecking contract registration...");
    const contracts = ["BatchSettlement", "LiquidationEngine", "LiquidationAuction", "MEVProtection"];
    
    for (const contractName of contracts) {
      const address = await contractRegistry.getContract(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(contractName))
      );
      console.log(`✓ ${contractName} registered: ${address}`);
    }
    
    // Verify key dependencies
    console.log("\\nChecking contract dependencies...");
    const liquidationEngineInMargin = await marginManager.liquidationEngine();
    const liquidationAuctionInEngine = await liquidationEngine.liquidationAuction();
    const batchSettlementInPerpetual = await perpetualTrading.batchSettlement();
    const mevProtectionInPerpetual = await perpetualTrading.mevProtection();
    
    console.log(`✓ MarginManager knows LiquidationEngine: ${liquidationEngineInMargin}`);
    console.log(`✓ LiquidationEngine knows LiquidationAuction: ${liquidationAuctionInEngine}`);
    console.log(`✓ PerpetualTrading knows BatchSettlement: ${batchSettlementInPerpetual}`);
    console.log(`✓ PerpetualTrading knows MEVProtection: ${mevProtectionInPerpetual}`);
    
    // Verify contract parameters
    console.log("\\nChecking contract parameters...");
    const batchSize = await batchSettlement.batchSize();
    const liquidationReward = await liquidationEngine.liquidationReward();
    const auctionDuration = await liquidationAuction.auctionDuration();
    const maxPriceDeviation = await mevProtection.maxPriceDeviation();
    
    console.log(`✓ BatchSettlement batch size: ${batchSize}`);
    console.log(`✓ LiquidationEngine reward: ${liquidationReward} bps`);
    console.log(`✓ LiquidationAuction duration: ${auctionDuration}s`);
    console.log(`✓ MEVProtection max deviation: ${maxPriceDeviation} bps`);
    
    console.log("\\n🎉 Phase 3 integrity verification completed!");
    
  } catch (error) {
    console.error("❌ Phase 3 verification failed:", error);
    throw error;
  }
}

// Export for testing and other scripts
module.exports = { deployPhase3 };

// Execute if called directly
if (require.main === module) {
  deployPhase3()
    .then(() => {
      console.log("\\n🎊 Phase 3 deployment script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\\n💥 Phase 3 deployment script failed:", error);
      process.exit(1);
    });
}