const { ethers } = require("hardhat");

async function initializeContracts() {
  console.log("🚀 Initializing RiverBit Contracts with New USDC");
  console.log("===============================================");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("");

  // Contract addresses from latest deployment
  const addresses = {
    RiverBitCoreV2: "0xF307f083Ca4862C1093DA2283a3224822848581D",
    SAuthSettlement: "0x6CdB4745B98633a9f22E8F9De12b2178d806A8F0",
    LPBucketManager: "0xEc24A984247B24b75292182720359a265bDdAfd6",
    USDC: "0xa54cE3980863227b77308AA576589d5a8Be1cdB9"
  };

  try {
    // Initialize RiverBitCoreV2
    console.log("📋 1. Initializing RiverBitCoreV2...");
    await initializeRiverBitCoreV2(addresses);
    
    // Initialize SAuthSettlement
    console.log("\n📋 2. Initializing SAuthSettlement...");
    await initializeSAuthSettlement(addresses);
    
    // Initialize LPBucketManager
    console.log("\n📋 3. Initializing LPBucketManager...");
    await initializeLPBucketManager(addresses);
    
    // Verify initialization
    console.log("\n📋 4. Verifying Initialization...");
    await verifyInitialization(addresses);
    
    console.log("\n✅ All contracts initialized successfully!");
    
  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
    throw error;
  }
}

async function initializeRiverBitCoreV2(addresses) {
  try {
    const coreContract = await ethers.getContractAt("RiverBitCoreV2", addresses.RiverBitCoreV2);
    const [deployer] = await ethers.getSigners();
    
    console.log("   📦 Calling initialize...");
    const tx = await coreContract.initialize(
      addresses.USDC,    // baseAsset (USDC)
      deployer.address   // admin
    );
    
    console.log(`   📝 Transaction hash: ${tx.hash}`);
    console.log("   ⏳ Waiting for confirmation...");
    await tx.wait();
    console.log("   ✅ RiverBitCoreV2 initialized");
    
  } catch (error) {
    if (error.message.includes("Initializable: contract is already initialized")) {
      console.log("   ℹ️  Already initialized");
    } else {
      throw error;
    }
  }
}

async function initializeSAuthSettlement(addresses) {
  try {
    const sAuthContract = await ethers.getContractAt("SAuthSettlement", addresses.SAuthSettlement);
    const [deployer] = await ethers.getSigners();
    
    console.log("   📦 Calling initialize...");
    const tx = await sAuthContract.initialize(
      addresses.RiverBitCoreV2,  // coreContract
      deployer.address           // admin
    );
    
    console.log(`   📝 Transaction hash: ${tx.hash}`);
    console.log("   ⏳ Waiting for confirmation...");
    await tx.wait();
    console.log("   ✅ SAuthSettlement initialized");
    
  } catch (error) {
    if (error.message.includes("Initializable: contract is already initialized")) {
      console.log("   ℹ️  Already initialized");
    } else {
      throw error;
    }
  }
}

async function initializeLPBucketManager(addresses) {
  try {
    const lpContract = await ethers.getContractAt("LPBucketManager", addresses.LPBucketManager);
    const [deployer] = await ethers.getSigners();
    
    console.log("   📦 Calling initialize...");
    const tx = await lpContract.initialize(
      addresses.USDC,            // baseAsset (USDC)
      addresses.RiverBitCoreV2,  // coreContract
      deployer.address           // admin
    );
    
    console.log(`   📝 Transaction hash: ${tx.hash}`);
    console.log("   ⏳ Waiting for confirmation...");
    await tx.wait();
    console.log("   ✅ LPBucketManager initialized");
    
  } catch (error) {
    if (error.message.includes("Initializable: contract is already initialized")) {
      console.log("   ℹ️  Already initialized");
    } else {
      throw error;
    }
  }
}

async function verifyInitialization(addresses) {
  console.log("   🔍 Verifying RiverBitCoreV2...");
  const coreContract = await ethers.getContractAt("RiverBitCoreV2", addresses.RiverBitCoreV2);
  
  const baseAsset = await coreContract.baseAsset();
  console.log(`   🪙 Base Asset: ${baseAsset}`);
  
  if (baseAsset.toLowerCase() === addresses.USDC.toLowerCase()) {
    console.log("   ✅ USDC correctly configured");
  } else {
    console.log("   ❌ USDC configuration error");
  }
  
  const globalSequence = await coreContract.globalSequenceNumber();
  console.log(`   🔢 Global Sequence: ${globalSequence}`);
  
  console.log("\n   🔍 Verifying LPBucketManager...");
  const lpContract = await ethers.getContractAt("LPBucketManager", addresses.LPBucketManager);
  
  const lpBaseAsset = await lpContract.baseAsset();
  console.log(`   🪙 LP Base Asset: ${lpBaseAsset}`);
  
  if (lpBaseAsset.toLowerCase() === addresses.USDC.toLowerCase()) {
    console.log("   ✅ LP USDC correctly configured");
  } else {
    console.log("   ❌ LP USDC configuration error");
  }
  
  const totalManagedAssets = await lpContract.totalManagedAssets();
  console.log(`   💰 Total Managed Assets: ${totalManagedAssets}`);
}

// Run initialization
initializeContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Initialization failed:", error);
    process.exit(1);
  });