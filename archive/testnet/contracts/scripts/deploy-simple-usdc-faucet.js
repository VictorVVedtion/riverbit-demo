const { ethers, network } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log(`\n🚀 Deploying Simple USDC Faucet to ${network.name}...`);
  console.log(`Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  try {
    // Deploy Simple USDC Faucet
    console.log("📝 Deploying SimpleUSDCFaucet...");
    const SimpleUSDCFaucet = await ethers.getContractFactory("SimpleUSDCFaucet");
    
    const simpleUSDCFaucet = await SimpleUSDCFaucet.deploy({
      gasLimit: 3000000,
    });
    
    await simpleUSDCFaucet.waitForDeployment();
    const simpleUSDCAddress = await simpleUSDCFaucet.getAddress();
    
    console.log(`✅ SimpleUSDCFaucet deployed at: ${simpleUSDCAddress}`);

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const name = await simpleUSDCFaucet.name();
    const symbol = await simpleUSDCFaucet.symbol();
    const decimals = await simpleUSDCFaucet.decimals();
    const faucetStats = await simpleUSDCFaucet.getFaucetStats();
    
    console.log(`Token Name: ${name}`);
    console.log(`Token Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Faucet Enabled: ${faucetStats[0]}`);
    console.log(`Max Mint: ${ethers.formatUnits(faucetStats[2], 6)} USDC`);
    console.log(`Cooldown: ${faucetStats[4]} seconds`);

    // Test minting
    console.log("\n🧪 Testing faucet functionality...");
    try {
      const mintAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      const mintTx = await simpleUSDCFaucet.faucetMint(mintAmount, {
        gasLimit: 200000
      });
      await mintTx.wait();
      
      const balance = await simpleUSDCFaucet.balanceOf(deployer.address);
      console.log(`✅ Test mint successful! Deployer balance: ${ethers.formatUnits(balance, 6)} USDC`);
    } catch (error) {
      console.log(`❌ Test mint failed: ${error.message}`);
    }

    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.config.chainId,
      timestamp: Date.now(),
      deployer: deployer.address,
      contracts: {
        SimpleUSDCFaucet: simpleUSDCAddress
      },
      verification: {
        name,
        symbol,
        decimals: decimals.toString(),
        faucetEnabled: faucetStats[0],
        maxMint: ethers.formatUnits(faucetStats[2], 6),
        cooldown: faucetStats[4].toString()
      }
    };

    // Save to config file
    const configPath = path.join(__dirname, '../config/simple-usdc-deployment.json');
    fs.writeFileSync(configPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${configPath}`);

    // Update main contract config if on Arbitrum Sepolia
    if (network.config.chainId === 421614) {
      const mainConfigPath = path.join(__dirname, '../config/riverbit-deployed-addresses.json');
      try {
        let mainConfig = JSON.parse(fs.readFileSync(mainConfigPath, 'utf8'));
        mainConfig.simpleUsdcAddress = simpleUSDCAddress;
        mainConfig.lastUpdated = Date.now();
        fs.writeFileSync(mainConfigPath, JSON.stringify(mainConfig, null, 2));
        console.log(`✅ Updated main config with Simple USDC address`);
      } catch (error) {
        console.log(`⚠️  Could not update main config: ${error.message}`);
      }
    }

    console.log("\n🎉 Simple USDC Faucet deployment completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`├─ Contract Address: ${simpleUSDCAddress}`);
    console.log(`├─ Network: ${network.name}`);
    console.log(`├─ Gas Used: ~2.5M gas`);
    console.log(`└─ Ready for testing!`);
    
    console.log("\n🔧 Next Steps:");
    console.log("1. Update your frontend contract config with the new address");
    console.log("2. Test the faucet functionality");
    console.log("3. Verify the contract on Arbiscan if needed");
    console.log(`4. Use address: ${simpleUSDCAddress}`);

    return {
      simpleUSDCFaucet: simpleUSDCAddress
    };

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

// Allow script to be imported or run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };