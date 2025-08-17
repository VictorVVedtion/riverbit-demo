const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying Unlimited USDC Faucet...");
    
    // Get the contract factory
    const UnlimitedUSDCFaucet = await ethers.getContractFactory("UnlimitedUSDCFaucet");
    
    // Deploy the contract
    console.log("⏳ Deploying contract...");
    const faucet = await UnlimitedUSDCFaucet.deploy();
    await faucet.waitForDeployment();
    
    const faucetAddress = await faucet.getAddress();
    console.log("✅ UnlimitedUSDCFaucet deployed to:", faucetAddress);
    
    // Get deployment details
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const network = await ethers.provider.getNetwork();
    
    console.log("📊 Deployment Details:");
    console.log("  Network:", network.name);
    console.log("  Chain ID:", network.chainId.toString());
    console.log("  Deployer:", deployerAddress);
    console.log("  Contract:", faucetAddress);
    
    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    
    // Check initial supply
    const initialSupply = await faucet.totalSupply();
    console.log("  Initial Supply:", ethers.formatUnits(initialSupply, 6), "USDC");
    
    // Check decimals
    const decimals = await faucet.decimals();
    console.log("  Decimals:", decimals);
    
    // Check symbol and name
    const symbol = await faucet.symbol();
    const name = await faucet.name();
    console.log("  Token:", name, "(" + symbol + ")");
    
    // Test canMint function (should always return true)
    const [canMint, reason] = await faucet.canMint(deployerAddress, ethers.parseUnits("1000000", 6));
    console.log("  Can mint 1M USDC:", canMint, "-", reason);
    
    // Test a small mint
    console.log("\n💰 Testing faucet mint...");
    const mintAmount = ethers.parseUnits("10000", 6); // 10K USDC
    const tx = await faucet.faucetMint(mintAmount);
    await tx.wait();
    
    const balance = await faucet.balanceOf(deployerAddress);
    console.log("  Minted:", ethers.formatUnits(mintAmount, 6), "USDC");
    console.log("  New Balance:", ethers.formatUnits(balance, 6), "USDC");
    
    // Save deployment info
    const deploymentInfo = {
        network: network.name,
        chainId: network.chainId.toString(),
        deployer: deployerAddress,
        contractAddress: faucetAddress,
        contractName: "UnlimitedUSDCFaucet",
        deploymentTime: new Date().toISOString(),
        initialSupply: ethers.formatUnits(initialSupply, 6),
        testMint: ethers.formatUnits(mintAmount, 6),
        txHash: tx.hash
    };
    
    // Save to file
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `unlimited-usdc-faucet-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    // Update contract config
    const configPath = path.join(__dirname, "..", "config", "riverbit-deployed-addresses.json");
    let config = {};
    
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
    
    config.UnlimitedUSDCFaucet = {
        address: faucetAddress,
        deployer: deployerAddress,
        deploymentTime: deploymentInfo.deploymentTime,
        network: network.name,
        chainId: network.chainId.toString()
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log("\n📁 Files saved:");
    console.log("  Deployment details:", deploymentFile);
    console.log("  Config updated:", configPath);
    
    console.log("\n✅ Deployment completed successfully!");
    console.log("\n🎉 UNLIMITED USDC FAUCET IS READY!");
    console.log("   - No mint limits");
    console.log("   - No cooldown periods");
    console.log("   - No daily restrictions");
    console.log("   - Anyone can mint any amount anytime");
    console.log("\n📝 Available mint functions:");
    console.log("   - faucetMint(amount) - mint any amount");
    console.log("   - mintPreset(0-4) - mint 1K, 10K, 100K, 1M, 10M USDC");
    console.log("   - mintMillion() - mint 1M USDC");
    console.log("   - mintTenMillion() - mint 10M USDC");
    console.log("   - mintTo(address, amount) - mint to any address");
    
    return faucetAddress;
}

main()
    .then((address) => {
        console.log("\n🎯 Contract Address:", address);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });