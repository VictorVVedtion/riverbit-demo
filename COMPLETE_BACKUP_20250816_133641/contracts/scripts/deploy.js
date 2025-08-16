// SPDX-License-Identifier: MIT
/**
 * @title RiverPool System Deployment Script
 * @dev Comprehensive deployment script for all RiverPool contracts
 * @notice Deploys and configures the complete RiverPool ecosystem
 */

const { ethers, upgrades } = require("hardhat");

// Deployment configuration
const DEPLOYMENT_CONFIG = {
    // Network-specific settings
    networks: {
        mainnet: {
            baseAsset: "0xA0b86a33E6417eFb5a4B2b68A0e4fD1E8c1D9F83", // USDC
            admin: "0x...", // Multi-sig address
            initialFunding: ethers.utils.parseEther("1000000"), // 1M USDC
        },
        goerli: {
            baseAsset: "0x...", // Test USDC
            admin: "0x...", // Test admin
            initialFunding: ethers.utils.parseEther("100000"), // 100K test USDC
        },
        hardhat: {
            baseAsset: null, // Will deploy mock USDC
            admin: null, // Will use deployer
            initialFunding: ethers.utils.parseEther("1000000"),
        }
    },
    
    // Contract settings
    riverPool: {
        name: "RiverPool LP Token",
        symbol: "rLP",
        minDepositAmount: ethers.utils.parseEther("100"), // 100 USDC
        minWithdrawAmount: ethers.utils.parseEther("10"),  // 10 USDC
    },
    
    bucketManager: {
        // Bucket weights in basis points (total = 10000)
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
        minimumDistributionAmount: ethers.utils.parseEther("1000"), // 1000 USDC
    },
    
    insuranceFund: {
        bEventLimitBps: 8,      // 0.08%
        fifteenMinLimitBps: 20, // 0.20%
        dailyLimitBps: 200,     // 2.00%
        safeModeThresholds: {
            l1: 8000, // 80%
            l2: 6000, // 60%
            l3: 4000, // 40%
            l4: 2000  // 20%
        }
    }
};

// Contract factory cache
let contractFactories = {};

/**
 * Get or create contract factory
 */
async function getContractFactory(contractName) {
    if (!contractFactories[contractName]) {
        contractFactories[contractName] = await ethers.getContractFactory(contractName);
    }
    return contractFactories[contractName];
}

/**
 * Deploy mock USDC for testing
 */
async function deployMockUSDC(deployer) {
    console.log("Deploying Mock USDC...");
    
    const MockUSDC = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockUSDC.deploy(
        "Mock USD Coin",
        "USDC",
        6, // 6 decimals like real USDC
        ethers.utils.parseUnits("100000000", 6) // 100M supply
    );
    await mockUSDC.deployed();
    
    console.log("Mock USDC deployed to:", mockUSDC.address);
    return mockUSDC.address;
}

/**
 * Deploy RiverPool contract
 */
async function deployRiverPool(baseAsset, admin, config) {
    console.log("Deploying RiverPool...");
    
    const RiverPool = await getContractFactory("RiverPool");
    const riverPool = await RiverPool.deploy(
        baseAsset,
        config.name,
        config.symbol,
        admin
    );
    await riverPool.deployed();
    
    console.log("RiverPool deployed to:", riverPool.address);
    
    // Set minimum amounts
    await riverPool.setMinimumAmounts(
        config.minDepositAmount,
        config.minWithdrawAmount
    );
    
    return riverPool;
}

/**
 * Deploy LP Bucket Manager
 */
async function deployLPBucketManager(baseAsset, admin) {
    console.log("Deploying LP Bucket Manager...");
    
    const LPBucketManager = await getContractFactory("LPBucketManager");
    const bucketManager = await LPBucketManager.deploy(baseAsset, admin);
    await bucketManager.deployed();
    
    console.log("LP Bucket Manager deployed to:", bucketManager.address);
    return bucketManager;
}

/**
 * Deploy Revenue Distribution
 */
async function deployRevenueDistribution(baseAsset, admin, config) {
    console.log("Deploying Revenue Distribution...");
    
    const RevenueDistribution = await getContractFactory("RevenueDistribution");
    const revenueDistribution = await RevenueDistribution.deploy(baseAsset, admin);
    await revenueDistribution.deployed();
    
    console.log("Revenue Distribution deployed to:", revenueDistribution.address);
    
    // Set minimum distribution amount
    await revenueDistribution.setMinimumDistributionAmount(
        config.minimumDistributionAmount
    );
    
    return revenueDistribution;
}

/**
 * Deploy Insurance Fund
 */
async function deployInsuranceFund(baseAsset, admin, tvlOracle, config) {
    console.log("Deploying Insurance Fund...");
    
    const InsuranceFund = await getContractFactory("InsuranceFund");
    const insuranceFund = await InsuranceFund.deploy(baseAsset, admin, tvlOracle);
    await insuranceFund.deployed();
    
    console.log("Insurance Fund deployed to:", insuranceFund.address);
    
    // Update safe mode thresholds
    await insuranceFund.updateSafeModeThresholds(
        config.safeModeThresholds.l1,
        config.safeModeThresholds.l2,
        config.safeModeThresholds.l3,
        config.safeModeThresholds.l4
    );
    
    return insuranceFund;
}

/**
 * Configure contract dependencies
 */
async function configureContracts(contracts, deployer) {
    console.log("Configuring contract dependencies...");
    
    const { riverPool, bucketManager, revenueDistribution, insuranceFund } = contracts;
    
    // Set RiverPool dependencies
    await riverPool.setBucketManager(bucketManager.address);
    await riverPool.setRevenueDistribution(revenueDistribution.address);
    await riverPool.setInsuranceFund(insuranceFund.address);
    
    // Set Bucket Manager dependencies
    await bucketManager.setRevenueDistribution(revenueDistribution.address);
    await bucketManager.setInsuranceFund(insuranceFund.address);
    
    // Set Revenue Distribution dependencies
    await revenueDistribution.setBucketManager(bucketManager.address);
    
    // Set Insurance Fund TVL oracle (using deployer for now)
    await insuranceFund.setTVLOracle(deployer.address);
    
    console.log("Contract dependencies configured");
}

/**
 * Setup initial funding and grants roles
 */
async function setupInitialState(contracts, deployer, config, networkConfig) {
    console.log("Setting up initial state...");
    
    const { riverPool, insuranceFund } = contracts;
    
    // Get base asset contract
    const baseAsset = await ethers.getContractAt("IERC20", networkConfig.baseAsset);
    
    // Mint tokens to deployer if it's a mock contract
    if (networkConfig.baseAsset.includes("Mock") || hre.network.name === "hardhat") {
        const mockUSDC = await ethers.getContractAt("MockERC20", networkConfig.baseAsset);
        await mockUSDC.mint(deployer.address, networkConfig.initialFunding);
    }
    
    // Fund insurance fund
    const insuranceFunding = networkConfig.initialFunding.div(10); // 10% to insurance
    await baseAsset.approve(insuranceFund.address, insuranceFunding);
    await insuranceFund.depositFunds(insuranceFunding, "Initial funding");
    
    // Make initial deposit to RiverPool
    const poolFunding = networkConfig.initialFunding.div(2); // 50% to pool
    await baseAsset.approve(riverPool.address, poolFunding);
    await riverPool.deposit(poolFunding, 0); // No minimum shares for initial deposit
    
    console.log("Initial state setup completed");
}

/**
 * Verify deployment
 */
async function verifyDeployment(contracts, networkConfig) {
    console.log("Verifying deployment...");
    
    const { riverPool, bucketManager, revenueDistribution, insuranceFund } = contracts;
    
    // Verify RiverPool
    const poolState = await riverPool.getPoolState();
    console.log("RiverPool TVL:", ethers.utils.formatEther(poolState.totalLiquidity));
    console.log("RiverPool NAV:", ethers.utils.formatEther(poolState.nav));
    
    // Verify Bucket Manager
    const buckets = await bucketManager.getAllBuckets();
    console.log("Number of buckets:", buckets.length);
    
    // Verify Revenue Distribution
    const totalRevenue = await revenueDistribution.getTotalRevenue();
    console.log("Total revenue tracked:", ethers.utils.formatEther(totalRevenue));
    
    // Verify Insurance Fund
    const fundInfo = await insuranceFund.getInsuranceFundInfo();
    console.log("Insurance fund balance:", ethers.utils.formatEther(fundInfo.totalFund));
    
    console.log("Deployment verification completed");
}

/**
 * Main deployment function
 */
async function main() {
    console.log("Starting RiverPool system deployment...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));
    
    // Get network configuration
    const networkName = hre.network.name;
    let networkConfig = DEPLOYMENT_CONFIG.networks[networkName];
    
    if (!networkConfig) {
        console.log("Unknown network, using hardhat config");
        networkConfig = DEPLOYMENT_CONFIG.networks.hardhat;
    }
    
    // Set defaults for hardhat network
    if (networkName === "hardhat") {
        networkConfig.baseAsset = await deployMockUSDC(deployer);
        networkConfig.admin = deployer.address;
    }
    
    console.log("Network configuration:", networkConfig);
    
    try {
        // Deploy contracts
        const riverPool = await deployRiverPool(
            networkConfig.baseAsset,
            networkConfig.admin,
            DEPLOYMENT_CONFIG.riverPool
        );
        
        const bucketManager = await deployLPBucketManager(
            networkConfig.baseAsset,
            networkConfig.admin
        );
        
        const revenueDistribution = await deployRevenueDistribution(
            networkConfig.baseAsset,
            networkConfig.admin,
            DEPLOYMENT_CONFIG.revenueDistribution
        );
        
        const insuranceFund = await deployInsuranceFund(
            networkConfig.baseAsset,
            networkConfig.admin,
            deployer.address, // TVL oracle
            DEPLOYMENT_CONFIG.insuranceFund
        );
        
        const contracts = {
            riverPool,
            bucketManager,
            revenueDistribution,
            insuranceFund
        };
        
        // Configure dependencies
        await configureContracts(contracts, deployer);
        
        // Setup initial state
        await setupInitialState(contracts, deployer, DEPLOYMENT_CONFIG, networkConfig);
        
        // Verify deployment
        await verifyDeployment(contracts, networkConfig);
        
        // Save deployment info
        const deploymentInfo = {
            network: networkName,
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: {
                baseAsset: networkConfig.baseAsset,
                riverPool: riverPool.address,
                bucketManager: bucketManager.address,
                revenueDistribution: revenueDistribution.address,
                insuranceFund: insuranceFund.address
            }
        };
        
        console.log("\\n=== DEPLOYMENT SUMMARY ===");
        console.log(JSON.stringify(deploymentInfo, null, 2));
        
        // Save to file
        const fs = require("fs");
        const deploymentPath = `./deployments/${networkName}-${Date.now()}.json`;
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`Deployment info saved to: ${deploymentPath}`);
        
        return deploymentInfo;
        
    } catch (error) {
        console.error("Deployment failed:", error);
        throw error;
    }
}

// Export for testing
module.exports = {
    main,
    deployRiverPool,
    deployLPBucketManager,
    deployRevenueDistribution,
    deployInsuranceFund,
    DEPLOYMENT_CONFIG
};

// Run deployment if called directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}