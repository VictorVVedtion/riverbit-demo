const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deployment utilities for RiverBit contracts
 */
class DeploymentUtils {
  constructor(networkName) {
    this.networkName = networkName;
    this.deploymentDir = path.join(__dirname, "../../deployments");
    this.deploymentFile = path.join(this.deploymentDir, `${networkName}-deployment.json`);
    this.deployment = this.loadDeployment();
    this.contractFactories = {};
  }
  
  /**
   * Load existing deployment data
   */
  loadDeployment() {
    try {
      if (fs.existsSync(this.deploymentFile)) {
        const data = fs.readFileSync(this.deploymentFile, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.log("No existing deployment file found, starting fresh");
    }
    
    return {
      network: this.networkName,
      chainId: network.config.chainId,
      timestamp: new Date().toISOString(),
      deployer: null,
      contracts: {},
      phases: {},
      transactions: [],
      status: "initializing",
    };
  }
  
  /**
   * Save deployment data
   */
  saveDeployment() {
    if (!fs.existsSync(this.deploymentDir)) {
      fs.mkdirSync(this.deploymentDir, { recursive: true });
    }
    
    this.deployment.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.deploymentFile, JSON.stringify(this.deployment, null, 2));
    console.log(`Deployment data saved to: ${this.deploymentFile}`);
  }
  
  /**
   * Get or create contract factory
   */
  async getContractFactory(contractName) {
    if (!this.contractFactories[contractName]) {
      this.contractFactories[contractName] = await ethers.getContractFactory(contractName);
    }
    return this.contractFactories[contractName];
  }
  
  /**
   * Deploy a regular contract
   */
  async deployContract(contractName, constructorArgs = [], options = {}) {
    console.log(`\\nDeploying ${contractName}...`);
    
    try {
      const factory = await this.getContractFactory(contractName);
      const contract = await factory.deploy(...constructorArgs, {
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
      });
      
      console.log(`${contractName} deployment transaction: ${contract.deployTransaction.hash}`);
      await contract.deployed();
      
      console.log(`${contractName} deployed to: ${contract.address}`);
      
      // Record deployment
      this.deployment.contracts[contractName] = {
        address: contract.address,
        transactionHash: contract.deployTransaction.hash,
        blockNumber: contract.deployTransaction.blockNumber,
        constructorArgs,
        upgradeable: false,
        timestamp: new Date().toISOString(),
      };
      
      this.deployment.transactions.push({
        type: "deploy",
        contract: contractName,
        hash: contract.deployTransaction.hash,
        timestamp: new Date().toISOString(),
      });
      
      this.saveDeployment();
      return contract;
      
    } catch (error) {
      console.error(`Failed to deploy ${contractName}:`, error);
      throw error;
    }
  }
  
  /**
   * Deploy an upgradeable contract
   */
  async deployUpgradeableContract(contractName, constructorArgs = [], options = {}) {
    console.log(`\\nDeploying upgradeable ${contractName}...`);
    
    try {
      const factory = await this.getContractFactory(contractName);
      const contract = await upgrades.deployProxy(
        factory,
        constructorArgs,
        {
          initializer: options.initializer || "initialize",
          gasLimit: options.gasLimit,
          gasPrice: options.gasPrice,
        }
      );
      
      await contract.deployed();
      
      const implementationAddress = await upgrades.erc1967.getImplementationAddress(contract.address);
      
      console.log(`${contractName} proxy deployed to: ${contract.address}`);
      console.log(`${contractName} implementation deployed to: ${implementationAddress}`);
      
      // Record deployment
      this.deployment.contracts[contractName] = {
        address: contract.address,
        implementationAddress,
        transactionHash: contract.deployTransaction.hash,
        blockNumber: contract.deployTransaction.blockNumber,
        constructorArgs,
        upgradeable: true,
        timestamp: new Date().toISOString(),
      };
      
      this.deployment.transactions.push({
        type: "deployUpgradeable",
        contract: contractName,
        hash: contract.deployTransaction.hash,
        timestamp: new Date().toISOString(),
      });
      
      this.saveDeployment();
      return contract;
      
    } catch (error) {
      console.error(`Failed to deploy upgradeable ${contractName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get deployed contract instance
   */
  async getContract(contractName) {
    const contractInfo = this.deployment.contracts[contractName];
    if (!contractInfo) {
      throw new Error(`Contract ${contractName} not found in deployment`);
    }
    
    const factory = await this.getContractFactory(contractName);
    return factory.attach(contractInfo.address);
  }
  
  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(tx, confirmations = 1) {
    console.log(`Waiting for ${confirmations} confirmations...`);
    const receipt = await tx.wait(confirmations);
    console.log(`Transaction confirmed at block: ${receipt.blockNumber}`);
    return receipt;
  }
  
  /**
   * Execute transaction with retry logic
   */
  async executeTransaction(contractName, methodName, args = [], retries = 3) {
    console.log(`\\nExecuting ${contractName}.${methodName}()...`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const contract = await this.getContract(contractName);
        const tx = await contract[methodName](...args);
        
        console.log(`Transaction hash: ${tx.hash}`);
        const receipt = await this.waitForConfirmation(tx);
        
        // Record transaction
        this.deployment.transactions.push({
          type: "transaction",
          contract: contractName,
          method: methodName,
          hash: tx.hash,
          blockNumber: receipt.blockNumber,
          timestamp: new Date().toISOString(),
        });
        
        this.saveDeployment();
        return receipt;
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          throw error;
        }
        
        console.log(`Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  /**
   * Mark phase as completed
   */
  markPhaseCompleted(phaseName, contracts) {
    this.deployment.phases[phaseName] = {
      status: "completed",
      timestamp: new Date().toISOString(),
      contracts: contracts.map(name => ({
        name,
        address: this.deployment.contracts[name]?.address,
      })),
    };
    
    this.saveDeployment();
  }
  
  /**
   * Verify contract on Etherscan
   */
  async verifyContract(contractName, constructorArgs = []) {
    const contractInfo = this.deployment.contracts[contractName];
    if (!contractInfo) {
      throw new Error(`Contract ${contractName} not found in deployment`);
    }
    
    console.log(`\\nVerifying ${contractName} on Etherscan...`);
    
    try {
      const address = contractInfo.upgradeable 
        ? contractInfo.implementationAddress 
        : contractInfo.address;
        
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: constructorArgs,
      });
      
      console.log(`${contractName} verified successfully`);
      
      // Update deployment record
      this.deployment.contracts[contractName].verified = true;
      this.deployment.contracts[contractName].verifiedAt = new Date().toISOString();
      this.saveDeployment();
      
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`${contractName} is already verified`);
        this.deployment.contracts[contractName].verified = true;
        this.saveDeployment();
      } else {
        console.error(`Failed to verify ${contractName}:`, error.message);
        throw error;
      }
    }
  }
  
  /**
   * Deploy mock USDC for testing
   */
  async deployMockUSDC(deployer) {
    console.log("\\nDeploying Mock USDC...");
    
    const MockUSDC = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockUSDC.deploy(
      "Mock USD Coin",
      "USDC",
      6, // 6 decimals like real USDC
      ethers.utils.parseUnits("100000000", 6) // 100M supply
    );
    await mockUSDC.deployed();
    
    console.log("Mock USDC deployed to:", mockUSDC.address);
    
    // Mint tokens to deployer
    await mockUSDC.mint(deployer.address, ethers.utils.parseUnits("10000000", 6)); // 10M to deployer
    
    return mockUSDC.address;
  }
  
  /**
   * Get deployment summary
   */
  getDeploymentSummary() {
    const contractCount = Object.keys(this.deployment.contracts).length;
    const phasesCompleted = Object.values(this.deployment.phases).filter(p => p.status === "completed").length;
    const totalTransactions = this.deployment.transactions.length;
    
    return {
      network: this.deployment.network,
      chainId: this.deployment.chainId,
      deployer: this.deployment.deployer,
      contractsDeployed: contractCount,
      phasesCompleted,
      totalTransactions,
      lastUpdated: this.deployment.lastUpdated,
      contracts: Object.keys(this.deployment.contracts).reduce((acc, name) => {
        acc[name] = this.deployment.contracts[name].address;
        return acc;
      }, {}),
    };
  }
  
  /**
   * Print deployment summary
   */
  printDeploymentSummary() {
    const summary = this.getDeploymentSummary();
    
    console.log("\\n" + "=".repeat(60));
    console.log("              DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log(`Network: ${summary.network}`);
    console.log(`Chain ID: ${summary.chainId}`);
    console.log(`Deployer: ${summary.deployer}`);
    console.log(`Contracts Deployed: ${summary.contractsDeployed}`);
    console.log(`Phases Completed: ${summary.phasesCompleted}`);
    console.log(`Total Transactions: ${summary.totalTransactions}`);
    console.log(`Last Updated: ${summary.lastUpdated}`);
    console.log("\\nContract Addresses:");
    console.log("-".repeat(40));
    
    for (const [name, address] of Object.entries(summary.contracts)) {
      console.log(`${name.padEnd(25)}: ${address}`);
    }
    
    console.log("=".repeat(60) + "\\n");
  }
}

module.exports = DeploymentUtils;