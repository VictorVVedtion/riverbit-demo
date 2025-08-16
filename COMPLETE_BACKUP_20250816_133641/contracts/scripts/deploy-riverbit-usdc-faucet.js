/**
 * @title RiverBit USDC Faucet Deployment Script
 * @dev Deploys the USDCFaucet contract to Arbitrum Sepolia for testing
 * @notice This script deploys a test USDC token with faucet functionality
 */

const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n🚀 Deploying RiverBit USDC Faucet Contract...");
    console.log("=====================================");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`📝 Deploying with account: ${deployer.address}`);
    
    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.01")) {
        console.error("❌ Error: Insufficient ETH balance for deployment!");
        console.log("💡 Please add ETH to your account from: https://faucet.quicknode.com/arbitrum/sepolia");
        process.exit(1);
    }

    try {
        // Deploy USDCFaucet contract
        console.log("\n🔨 Deploying USDCFaucet contract...");
        const USDCFaucet = await ethers.getContractFactory("USDCFaucet");
        
        // Deploy with estimated gas
        const usdcFaucet = await USDCFaucet.deploy();
        
        console.log(`📤 Transaction hash: ${usdcFaucet.deploymentTransaction().hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        await usdcFaucet.waitForDeployment();
        const address = await usdcFaucet.getAddress();
        
        console.log(`✅ USDCFaucet deployed to: ${address}`);
        
        // Get deployment details
        const deploymentBlock = await usdcFaucet.deploymentTransaction().wait();
        console.log(`📦 Deployed in block: ${deploymentBlock.blockNumber}`);
        console.log(`⛽ Gas used: ${deploymentBlock.gasUsed.toString()}`);
        
        // Verify contract properties
        console.log("\n🔍 Verifying contract properties...");
        const name = await usdcFaucet.name();
        const symbol = await usdcFaucet.symbol();
        const decimals = await usdcFaucet.decimals();
        const totalSupply = await usdcFaucet.totalSupply();
        const deployerBalance = await usdcFaucet.balanceOf(deployer.address);
        
        console.log(`📛 Token name: ${name}`);
        console.log(`🏷️  Token symbol: ${symbol}`);
        console.log(`🔢 Decimals: ${decimals}`);
        console.log(`📊 Total supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
        console.log(`💼 Deployer balance: ${ethers.formatUnits(deployerBalance, decimals)} ${symbol}`);
        
        // Test faucet functionality
        console.log("\n🧪 Testing faucet functionality...");
        const faucetStats = await usdcFaucet.getFaucetStats();
        console.log(`✅ Faucet enabled: ${faucetStats.enabled}`);
        console.log(`💧 Max mint amount: ${ethers.formatUnits(faucetStats.maxMint, decimals)} ${symbol}`);
        console.log(`📅 Daily limit: ${ethers.formatUnits(faucetStats.dailyLimit, decimals)} ${symbol}`);
        console.log(`⏰ Cooldown period: ${faucetStats.cooldown.toString()} seconds`);
        
        // Save deployment information
        const deploymentInfo = {
            network: "arbitrum-sepolia",
            chainId: 421614,
            contractName: "USDCFaucet",
            contractAddress: address,
            deployerAddress: deployer.address,
            transactionHash: usdcFaucet.deploymentTransaction().hash,
            blockNumber: deploymentBlock.blockNumber,
            gasUsed: deploymentBlock.gasUsed.toString(),
            timestamp: new Date().toISOString(),
            tokenDetails: {
                name: name,
                symbol: symbol,
                decimals: decimals,
                totalSupply: totalSupply.toString(),
                deployerBalance: deployerBalance.toString()
            },
            faucetConfig: {
                enabled: faucetStats.enabled,
                maxMintAmount: faucetStats.maxMint.toString(),
                dailyLimit: faucetStats.dailyLimit.toString(),
                cooldownPeriod: faucetStats.cooldown.toString()
            },
            abi: USDCFaucet.interface.formatJson()
        };
        
        // Create deployment file
        const deploymentFileName = `riverbit-usdc-faucet-${Date.now()}.json`;
        const deploymentPath = path.join(__dirname, '..', 'config', deploymentFileName);
        
        // Ensure config directory exists
        const configDir = path.dirname(deploymentPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);
        
        // Update main config file
        const mainConfigPath = path.join(__dirname, '..', 'config', 'riverbit-deployed-addresses.json');
        let mainConfig = {};
        
        if (fs.existsSync(mainConfigPath)) {
            mainConfig = JSON.parse(fs.readFileSync(mainConfigPath, 'utf8'));
        }
        
        if (!mainConfig['arbitrum-sepolia']) {
            mainConfig['arbitrum-sepolia'] = {};
        }
        
        mainConfig['arbitrum-sepolia'].USDCFaucet = {
            address: address,
            deployedAt: deploymentBlock.blockNumber,
            deployedHash: usdcFaucet.deploymentTransaction().hash,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(mainConfigPath, JSON.stringify(mainConfig, null, 2));
        console.log(`📝 Updated main config: ${mainConfigPath}`);
        
        // Display final summary
        console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
        console.log("================================");
        console.log(`🏷️  Contract: RiverBit Test USDC (USDC)`);
        console.log(`📍 Address: ${address}`);
        console.log(`🌐 Network: Arbitrum Sepolia`);
        console.log(`🔗 Explorer: https://sepolia.arbiscan.io/address/${address}`);
        console.log(`💧 Faucet enabled: ${faucetStats.enabled}`);
        console.log(`💰 Initial balance: ${ethers.formatUnits(deployerBalance, decimals)} USDC`);
        
        console.log("\n📋 NEXT STEPS:");
        console.log("1. Update contractConfig.ts with new USDC address");
        console.log("2. Verify contract on Arbiscan");
        console.log("3. Test faucet functionality in frontend");
        console.log("4. Distribute test tokens to users");
        
        console.log("\n🔧 FAUCET USAGE:");
        console.log("- Users can mint up to 100,000 USDC per transaction");
        console.log("- Daily limit: 500,000 USDC per address");
        console.log("- Cooldown: 1 hour between mints");
        console.log("- Use faucetMint(amount) or mintPreset(0-4) functions");
        
        return {
            address: address,
            contract: usdcFaucet,
            deploymentInfo: deploymentInfo
        };
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        
        if (error.message.includes("insufficient funds")) {
            console.log("\n💡 SOLUTION: Add ETH to your wallet");
            console.log("🚰 Arbitrum Sepolia Faucet: https://faucet.quicknode.com/arbitrum/sepolia");
        } else if (error.message.includes("network")) {
            console.log("\n💡 SOLUTION: Check network configuration");
            console.log("🔧 Ensure hardhat.config.js has correct Arbitrum Sepolia settings");
        }
        
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exit(1);
        });
}

module.exports = main;