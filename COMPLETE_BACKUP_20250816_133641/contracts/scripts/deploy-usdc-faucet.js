const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying USDC Faucet Contract...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Get account balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
  
  // Deploy USDCFaucet
  console.log("\n🏗️  Deploying USDCFaucet...");
  const USDCFaucet = await hre.ethers.getContractFactory("USDCFaucet");
  
  // Estimate gas for deployment
  const deploymentData = USDCFaucet.getDeployTransaction();
  const estimatedGas = await deployer.estimateGas(deploymentData);
  console.log("⛽ Estimated gas for deployment:", estimatedGas.toString());
  
  // Deploy with explicit gas settings for Arbitrum Sepolia
  const usdcFaucet = await USDCFaucet.deploy({
    gasLimit: 3000000, // 3M gas limit
    gasPrice: hre.ethers.utils.parseUnits("0.1", "gwei") // 0.1 gwei
  });
  
  console.log("⏳ Waiting for deployment transaction...");
  await usdcFaucet.deployed();
  
  console.log("✅ USDCFaucet deployed to:", usdcFaucet.address);
  console.log("🔗 Transaction hash:", usdcFaucet.deployTransaction.hash);
  
  // Wait for a few confirmations
  console.log("⏳ Waiting for confirmations...");
  await usdcFaucet.deployTransaction.wait(3);
  
  // Verify contract details
  console.log("\n📊 Contract Information:");
  const name = await usdcFaucet.name();
  const symbol = await usdcFaucet.symbol();
  const decimals = await usdcFaucet.decimals();
  const totalSupply = await usdcFaucet.totalSupply();
  const owner = await usdcFaucet.owner();
  
  console.log("📛 Name:", name);
  console.log("🏷️  Symbol:", symbol);
  console.log("🔢 Decimals:", decimals);
  console.log("💎 Total Supply:", hre.ethers.utils.formatUnits(totalSupply, decimals), symbol);
  console.log("👑 Owner:", owner);
  
  // Get faucet stats
  const stats = await usdcFaucet.getFaucetStats();
  console.log("\n🚰 Faucet Configuration:");
  console.log("✅ Enabled:", stats.enabled);
  console.log("🏭 Total Minted:", hre.ethers.utils.formatUnits(stats.minted, decimals), symbol);
  console.log("📏 Max Mint per Transaction:", hre.ethers.utils.formatUnits(stats.maxMint, decimals), symbol);
  console.log("📅 Daily Limit per Address:", hre.ethers.utils.formatUnits(stats.dailyLimit, decimals), symbol);
  console.log("⏰ Cooldown Period:", stats.cooldown.toString(), "seconds");
  
  // Test faucet functionality
  console.log("\n🧪 Testing faucet functionality...");
  try {
    // Test minting 1000 USDC
    const mintAmount = hre.ethers.utils.parseUnits("1000", decimals);
    console.log("🚰 Testing faucet mint of 1000 USDC...");
    
    const mintTx = await usdcFaucet.faucetMint(mintAmount, {
      gasLimit: 500000,
      gasPrice: hre.ethers.utils.parseUnits("0.1", "gwei")
    });
    
    console.log("⏳ Waiting for mint transaction...");
    await mintTx.wait();
    
    const newBalance = await usdcFaucet.balanceOf(deployer.address);
    console.log("✅ Mint successful! New balance:", hre.ethers.utils.formatUnits(newBalance, decimals), symbol);
    
    // Test preset minting
    console.log("🎛️  Testing preset mint (preset 2 = 1000 USDC)...");
    const presetTx = await usdcFaucet.mintPreset(2, {
      gasLimit: 500000,
      gasPrice: hre.ethers.utils.parseUnits("0.1", "gwei")
    });
    await presetTx.wait();
    
    const finalBalance = await usdcFaucet.balanceOf(deployer.address);
    console.log("✅ Preset mint successful! Final balance:", hre.ethers.utils.formatUnits(finalBalance, decimals), symbol);
    
  } catch (error) {
    console.log("⚠️  Faucet test failed:", error.message);
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contractName: "USDCFaucet",
    contractAddress: usdcFaucet.address,
    deployerAddress: deployer.address,
    transactionHash: usdcFaucet.deployTransaction.hash,
    blockNumber: usdcFaucet.deployTransaction.blockNumber,
    gasUsed: usdcFaucet.deployTransaction.gasLimit?.toString(),
    gasPrice: usdcFaucet.deployTransaction.gasPrice?.toString(),
    deploymentTime: new Date().toISOString(),
    contractDetails: {
      name,
      symbol,
      decimals,
      totalSupply: totalSupply.toString(),
      owner
    },
    faucetConfig: {
      enabled: stats.enabled,
      totalMinted: stats.minted.toString(),
      maxMintAmount: stats.maxMint.toString(),
      dailyLimit: stats.dailyLimit.toString(),
      cooldownPeriod: stats.cooldown.toString()
    }
  };
  
  // Save to file
  const deploymentDir = path.join(__dirname, '..', 'config');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentDir, `usdc-faucet-deployment-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n💾 Deployment info saved to:", deploymentFile);
  
  // Update contract config file
  const configFile = path.join(__dirname, '..', '..', 'utils', 'contractConfig.ts');
  console.log("\n📝 Please update contractConfig.ts with the new USDC Faucet address:");
  console.log(`USDC: '${usdcFaucet.address}',`);
  
  // Verification instructions
  console.log("\n🔍 To verify the contract on Arbiscan, run:");
  console.log(`npx hardhat verify --network arbitrumSepolia ${usdcFaucet.address}`);
  
  console.log("\n🎉 USDC Faucet deployment completed successfully!");
  
  // Generate ABI file for frontend
  const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'core', 'USDCFaucet.sol', 'USDCFaucet.json');
  if (fs.existsSync(artifactsPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
    const abiPath = path.join(__dirname, '..', 'abis', 'USDCFaucet.json');
    
    if (!fs.existsSync(path.dirname(abiPath))) {
      fs.mkdirSync(path.dirname(abiPath), { recursive: true });
    }
    
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log("📄 ABI saved to:", abiPath);
  }
  
  return {
    usdcFaucet: usdcFaucet.address,
    deploymentInfo
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = main;