/**
 * Phase 1 Deployment Script - Infrastructure Layer
 * Deploys: ContractRegistry, AccessControl
 */

const { ethers, network } = require("hardhat");
const DeploymentUtils = require("./utils/deployment-utils");
const DEPLOYMENT_CONFIG = require("../config/deployment-config");

async function deployPhase1() {
  console.log("\\n🚀 Starting Phase 1 Deployment - Infrastructure Layer");
  console.log("=" .repeat(60));
  
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  // Initialize deployment utils
  const deploymentUtils = new DeploymentUtils(networkName);
  deploymentUtils.deployment.deployer = deployer.address;
  deploymentUtils.deployment.status = "phase1-started";
  deploymentUtils.saveDeployment();
  
  // Get network configuration
  const networkConfig = DEPLOYMENT_CONFIG.networks[networkName] || DEPLOYMENT_CONFIG.networks.hardhat;
  const deploymentConfig = DEPLOYMENT_CONFIG.deployment;
  
  console.log("\\nNetwork Configuration:");
  console.log(`- Admin: ${networkConfig.admin || deployer.address}`);
  console.log(`- Gas Limit: ${deploymentConfig.gasLimit}`);
  console.log(`- Verify Contracts: ${networkConfig.verify}`);
  
  try {
    const deployedContracts = [];
    
    // 1. Deploy ContractRegistry (upgradeable)
    console.log("\\n📋 Phase 1.1: Deploying ContractRegistry...");
    const contractRegistry = await deploymentUtils.deployUpgradeableContract(
      "ContractRegistry",
      [], // Constructor args for initialize function
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: networkConfig.gasPrice,
      }
    );
    deployedContracts.push("ContractRegistry");
    
    // 2. Deploy AccessControl (upgradeable)
    console.log("\\n🔐 Phase 1.2: Deploying AccessControl...");
    const accessControl = await deploymentUtils.deployUpgradeableContract(
      "AccessControl",
      [networkConfig.admin || deployer.address], // Initialize with admin
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: networkConfig.gasPrice,
      }
    );
    deployedContracts.push("AccessControl");
    
    // 3. Configure ContractRegistry
    console.log("\\n⚙️  Phase 1.3: Configuring contracts...");
    
    // Set AccessControl in ContractRegistry
    await deploymentUtils.executeTransaction(
      "ContractRegistry",
      "setContract",
      [
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AccessControl")),
        accessControl.address
      ]
    );
    
    // Set ContractRegistry in AccessControl
    await deploymentUtils.executeTransaction(
      "AccessControl", 
      "setContractRegistry",
      [contractRegistry.address]
    );
    
    // Grant roles in AccessControl
    const { roles } = DEPLOYMENT_CONFIG.contracts.accessControl;
    
    // Grant OPERATOR_ROLE to deployer initially
    await deploymentUtils.executeTransaction(
      "AccessControl",
      "grantRole", 
      [roles.OPERATOR_ROLE, deployer.address]
    );
    
    // Grant EMERGENCY_ROLE to emergency admin if configured
    if (networkConfig.emergencyPauseAdmin) {
      await deploymentUtils.executeTransaction(
        "AccessControl",
        "grantRole",
        [roles.EMERGENCY_ROLE, networkConfig.emergencyPauseAdmin]
      );
    }
    
    // 4. Verify contracts if enabled
    if (networkConfig.verify) {
      console.log("\\n🔍 Phase 1.4: Verifying contracts...");
      
      // Wait before verification to ensure contracts are indexed
      console.log(`Waiting ${deploymentConfig.verifyDelay / 1000}s before verification...`);
      await new Promise(resolve => setTimeout(resolve, deploymentConfig.verifyDelay));
      
      try {
        await deploymentUtils.verifyContract("ContractRegistry", []);
        await deploymentUtils.verifyContract("AccessControl", [networkConfig.admin || deployer.address]);
      } catch (error) {
        console.warn("Verification failed, continuing...", error.message);
      }
    }
    
    // 5. Mark phase as completed
    deploymentUtils.markPhaseCompleted("phase1", deployedContracts);
    deploymentUtils.deployment.status = "phase1-completed";
    deploymentUtils.saveDeployment();
    
    // 6. Print summary
    console.log("\\n✅ Phase 1 Deployment Completed Successfully!");
    deploymentUtils.printDeploymentSummary();
    
    // 7. Verify deployment integrity
    console.log("\\n🔬 Verifying deployment integrity...");
    await verifyPhase1Deployment(deploymentUtils);
    
    return {
      contractRegistry,
      accessControl,
      deploymentUtils,
    };
    
  } catch (error) {
    console.error("\\n❌ Phase 1 deployment failed:", error);
    deploymentUtils.deployment.status = "phase1-failed";
    deploymentUtils.deployment.error = error.message;
    deploymentUtils.saveDeployment();
    throw error;
  }
}

/**
 * Verify Phase 1 deployment integrity
 */
async function verifyPhase1Deployment(deploymentUtils) {
  try {
    const contractRegistry = await deploymentUtils.getContract("ContractRegistry");
    const accessControl = await deploymentUtils.getContract("AccessControl");
    
    // Verify ContractRegistry setup
    const accessControlAddress = await contractRegistry.getContract(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AccessControl"))
    );
    console.log(`✓ ContractRegistry knows AccessControl: ${accessControlAddress}`);
    
    // Verify AccessControl setup
    const registryAddress = await accessControl.contractRegistry();
    console.log(`✓ AccessControl knows ContractRegistry: ${registryAddress}`);
    
    // Check admin roles
    const { roles } = DEPLOYMENT_CONFIG.contracts.accessControl;
    const [deployer] = await ethers.getSigners();
    
    const hasAdminRole = await accessControl.hasRole(roles.ADMIN_ROLE, deployer.address);
    const hasOperatorRole = await accessControl.hasRole(roles.OPERATOR_ROLE, deployer.address);
    
    console.log(`✓ Deployer has ADMIN_ROLE: ${hasAdminRole}`);
    console.log(`✓ Deployer has OPERATOR_ROLE: ${hasOperatorRole}`);
    
    console.log("\\n🎉 Phase 1 integrity verification completed!");
    
  } catch (error) {
    console.error("❌ Phase 1 verification failed:", error);
    throw error;
  }
}

// Export for testing and other scripts
module.exports = { deployPhase1 };

// Execute if called directly
if (require.main === module) {
  deployPhase1()
    .then(() => {
      console.log("\\n🎊 Phase 1 deployment script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\\n💥 Phase 1 deployment script failed:", error);
      process.exit(1);
    });
}