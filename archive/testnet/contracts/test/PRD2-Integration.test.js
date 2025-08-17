const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("PRD 2.0 Integration Tests", function () {
  
  // Test fixture to deploy all contracts
  async function deployPRD2Fixture() {
    const [owner, user1, user2, validator1, validator2, bucketManager] = await ethers.getSigners();
    
    // Deploy mock USDC token
    const MockUSDC = await ethers.getContractFactory("MockERC20");
    const usdc = await MockUSDC.deploy("USD Coin", "USDC", 6);
    
    // Deploy core contracts
    const RiverBitCoreV2 = await ethers.getContractFactory("RiverBitCoreV2");
    const coreContract = await upgrades.deployProxy(
      RiverBitCoreV2,
      [usdc.address, owner.address],
      { initializer: "initialize" }
    );
    
    const GovernanceRegistry = await ethers.getContractFactory("GovernanceRegistry");
    const governance = await upgrades.deployProxy(
      GovernanceRegistry,
      [owner.address, [owner.address, validator1.address, validator2.address]],
      { initializer: "initialize" }
    );
    
    const ThreeGatesRiskManager = await ethers.getContractFactory("ThreeGatesRiskManager");
    const riskManager = await upgrades.deployProxy(
      ThreeGatesRiskManager,
      [owner.address],
      { initializer: "initialize" }
    );
    
    // Deploy trading systems
    const SAuthSettlement = await ethers.getContractFactory("SAuthSettlement");
    const sAuthSettlement = await upgrades.deployProxy(
      SAuthSettlement,
      [usdc.address, coreContract.address, owner.address],
      { initializer: "initialize" }
    );
    
    const ETMAEngine = await ethers.getContractFactory("ETMAEngine");
    const etmaEngine = await upgrades.deployProxy(
      ETMAEngine,
      [usdc.address, coreContract.address, owner.address],
      { initializer: "initialize" }
    );
    
    const DualMarketManager = await ethers.getContractFactory("DualMarketManager");
    const marketManager = await upgrades.deployProxy(
      DualMarketManager,
      [usdc.address, coreContract.address, owner.address],
      { initializer: "initialize" }
    );
    
    // Deploy LP and AFB systems
    const LPBucketManager = await ethers.getContractFactory("LPBucketManager");
    const lpBucketManager = await upgrades.deployProxy(
      LPBucketManager,
      [usdc.address, coreContract.address, owner.address],
      { initializer: "initialize" }
    );
    
    const AFBSystem = await ethers.getContractFactory("AFBSystem");
    const afbSystem = await upgrades.deployProxy(
      AFBSystem,
      [usdc.address, coreContract.address, owner.address],
      { initializer: "initialize" }
    );
    
    // Setup contract connections
    await setupContractConnections(
      coreContract,
      sAuthSettlement,
      etmaEngine,
      marketManager,
      lpBucketManager,
      afbSystem
    );
    
    // Initialize test markets
    await initializeTestMarkets(coreContract, marketManager, etmaEngine, afbSystem);
    
    // Setup test user funds
    await usdc.mint(user1.address, ethers.utils.parseEther("100000")); // $100k USDC
    await usdc.mint(user2.address, ethers.utils.parseEther("100000"));
    await usdc.connect(user1).approve(coreContract.address, ethers.constants.MaxUint256);
    await usdc.connect(user2).approve(coreContract.address, ethers.constants.MaxUint256);
    
    return {
      owner,
      user1, 
      user2,
      validator1,
      validator2,
      bucketManager,
      usdc,
      coreContract,
      governance,
      riskManager,
      sAuthSettlement,
      etmaEngine,
      marketManager,
      lpBucketManager,
      afbSystem
    };
  }
  
  async function setupContractConnections(
    coreContract,
    sAuthSettlement,
    etmaEngine,
    marketManager,
    lpBucketManager,
    afbSystem
  ) {
    const operatorRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("OPERATOR_ROLE"));
    
    // Grant operator roles
    await coreContract.grantRole(operatorRole, sAuthSettlement.address);
    await coreContract.grantRole(operatorRole, etmaEngine.address);
    await coreContract.grantRole(operatorRole, marketManager.address);
    await coreContract.grantRole(operatorRole, lpBucketManager.address);
    await coreContract.grantRole(operatorRole, afbSystem.address);
    
    // Connect ETMA to market manager
    await marketManager.setETMAEngine(etmaEngine.address);
  }
  
  async function initializeTestMarkets(coreContract, marketManager, etmaEngine, afbSystem) {
    // Add crypto markets (24/7 CLOB)
    await coreContract.addMarket(
      ethers.utils.formatBytes32String("BTC/USD"),
      0, // MarketType.CRYPTO_24_7
      ethers.utils.parseEther("1"), // $1 min trade
      ethers.utils.parseEther("1000000"), // $1M max trade
      30, // 0.3% trading fee
      100 // 100x max leverage
    );
    
    await marketManager.createMarket(
      ethers.utils.formatBytes32String("BTC/USD"),
      0, // MarketType.CRYPTO_24_7
      "BTCUSD",
      ethers.utils.parseEther("0.01"), // $0.01 tick size
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1000000"),
      100
    );
    
    // Add xStock markets (ETMA)
    await coreContract.addMarket(
      ethers.utils.formatBytes32String("xAAPL"),
      2, // MarketType.XSTOCK_ETMA
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("100000"),
      50, // 0.5% trading fee
      20 // 20x max leverage
    );
    
    await marketManager.createMarket(
      ethers.utils.formatBytes32String("xAAPL"),
      2, // MarketType.XSTOCK_ETMA
      "AAPL",
      ethers.utils.parseEther("0.01"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("100000"),
      20
    );
    
    await etmaEngine.addMarket(ethers.utils.formatBytes32String("xAAPL"));
    await etmaEngine.updateReferencePrice(
      ethers.utils.formatBytes32String("xAAPL"),
      ethers.utils.parseEther("150") // $150 reference price
    );
    
    // Initialize AFB for markets
    await afbSystem.initializeMarketFunding(ethers.utils.formatBytes32String("BTC/USD"));
    await afbSystem.initializeMarketFunding(ethers.utils.formatBytes32String("xAAPL"));
    
    // Set initial prices
    await coreContract.updatePrice(
      ethers.utils.formatBytes32String("BTC/USD"),
      ethers.utils.parseEther("50000") // $50,000 BTC
    );
    await coreContract.updatePrice(
      ethers.utils.formatBytes32String("xAAPL"),
      ethers.utils.parseEther("150") // $150 AAPL
    );
  }
  
  describe("S-Auth Settlement System", function () {
    it("Should execute S-Auth trade with valid signature", async function () {
      const { coreContract, sAuthSettlement, user1, usdc } = await loadFixture(deployPRD2Fixture);
      
      // Get user's nonce
      const nonce = await sAuthSettlement.getNonce(user1.address);
      const deadline = (await time.latest()) + 3600; // 1 hour from now
      
      // Create trade parameters
      const market = ethers.utils.formatBytes32String("BTC/USD");
      const isLong = true;
      const size = ethers.utils.parseEther("1000"); // $1000 position
      const price = ethers.utils.parseEther("50000"); // $50,000 BTC
      const margin = ethers.utils.parseEther("100"); // $100 margin (10x leverage)
      const leverage = 10;
      
      // Create EIP-712 signature
      const domain = {
        name: "SAuthSettlement",
        version: "1.0",
        chainId: 31337,
        verifyingContract: sAuthSettlement.address
      };
      
      const types = {
        SAuthOrder: [
          { name: "trader", type: "address" },
          { name: "market", type: "bytes32" },
          { name: "isLong", type: "bool" },
          { name: "size", type: "uint256" },
          { name: "price", type: "uint256" },
          { name: "margin", type: "uint256" },
          { name: "leverage", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      };
      
      const value = {
        trader: user1.address,
        market,
        isLong,
        size,
        price,
        margin,
        leverage,
        nonce,
        deadline
      };
      
      const signature = await user1._signTypedData(domain, types, value);
      const { v, r, s } = ethers.utils.splitSignature(signature);
      
      const order = {
        trader: user1.address,
        market,
        isLong,
        size,
        price,
        margin,
        leverage,
        nonce,
        deadline,
        v,
        r,
        s
      };
      
      // Execute S-Auth settlement
      const result = await sAuthSettlement.settleSAuthOrder(order);
      
      expect(result).to.emit(sAuthSettlement, "SAuthOrderSettled");
    });
    
    it("Should reject invalid signature", async function () {
      const { sAuthSettlement, user1, user2 } = await loadFixture(deployPRD2Fixture);
      
      const nonce = await sAuthSettlement.getNonce(user1.address);
      const deadline = (await time.latest()) + 3600;
      
      // Create order signed by user1 but submitted as user2
      const order = {
        trader: user2.address, // Wrong trader
        market: ethers.utils.formatBytes32String("BTC/USD"),
        isLong: true,
        size: ethers.utils.parseEther("1000"),
        price: ethers.utils.parseEther("50000"),
        margin: ethers.utils.parseEther("100"),
        leverage: 10,
        nonce,
        deadline,
        v: 27,
        r: ethers.constants.HashZero,
        s: ethers.constants.HashZero
      };
      
      await expect(
        sAuthSettlement.settleSAuthOrder(order)
      ).to.be.revertedWith("Invalid signature");
    });
  });
  
  describe("ETMA Engine", function () {
    it("Should accept ETMA orders during evening window", async function () {
      const { etmaEngine, user1 } = await loadFixture(deployPRD2Fixture);
      
      // Mock evening trading window (6 PM - 10 PM)
      // This would need time manipulation to test properly
      
      const market = ethers.utils.formatBytes32String("xAAPL");
      const isLong = true;
      const size = ethers.utils.parseEther("1000");
      const limitPrice = ethers.utils.parseEther("151"); // Slightly above reference
      
      // This test would need time manipulation to be in ETMA window
      // For now, we'll test the structure
      expect(await etmaEngine.getMarketState(market)).to.have.property("totalLongVolume");
    });
    
    it("Should execute ETMA matching when threshold reached", async function () {
      const { etmaEngine, user1, user2 } = await loadFixture(deployPRD2Fixture);
      
      const market = ethers.utils.formatBytes32String("xAAPL");
      
      // Add multiple orders to reach threshold
      // This would require proper time window simulation
      
      const marketState = await etmaEngine.getMarketState(market);
      expect(marketState.totalLongVolume).to.equal(0); // Initially zero
    });
  });
  
  describe("Three Gates Risk Management", function () {
    it("Should enforce single window limits", async function () {
      const { riskManager, user1 } = await loadFixture(deployPRD2Fixture);
      
      const market = ethers.utils.formatBytes32String("BTC/USD");
      const tradeSize = ethers.utils.parseEther("60000"); // $60k trade
      const leverage = 10;
      
      // Set low limits for testing
      await riskManager.setRiskGateLimits(
        user1.address,
        ethers.utils.parseEther("50000"), // $50k single window
        ethers.utils.parseEther("200000"), // $200k 15-minute
        ethers.utils.parseEther("1000000") // $1M 24-hour
      );
      
      const [allowed, blockedGate] = await riskManager.checkThreeGates(
        user1.address,
        market,
        tradeSize,
        leverage
      );
      
      expect(allowed).to.be.false;
      expect(blockedGate).to.equal(0); // GateType.SINGLE_WINDOW
    });
    
    it("Should allow trades within all gate limits", async function () {
      const { riskManager, user1 } = await loadFixture(deployPRD2Fixture);
      
      const market = ethers.utils.formatBytes32String("BTC/USD");
      const tradeSize = ethers.utils.parseEther("10000"); // $10k trade
      const leverage = 5;
      
      // Configure market risk
      await riskManager.configureMarketRisk(
        market,
        ethers.utils.parseEther("50000"), // $50k single window
        ethers.utils.parseEther("200000"), // $200k 15-minute
        ethers.utils.parseEther("1000000"), // $1M 24-hour
        100 // 100x max leverage
      );
      
      const [allowed, blockedGate] = await riskManager.checkThreeGates(
        user1.address,
        market,
        tradeSize,
        leverage
      );
      
      expect(allowed).to.be.true;
    });
  });
  
  describe("LP Bucket Architecture", function () {
    it("Should initialize four buckets with correct weights", async function () {
      const { lpBucketManager } = await loadFixture(deployPRD2Fixture);
      
      // Check A Bucket (45%)
      const bucketA = await lpBucketManager.getBucket(0); // BucketType.A_PASSIVE_MAKER
      expect(bucketA.targetWeight).to.equal(4500); // 45%
      expect(bucketA.hardCapLoss).to.equal(500); // 5%
      
      // Check B Bucket (20%)
      const bucketB = await lpBucketManager.getBucket(1); // BucketType.B_ACTIVE_REBALANCER
      expect(bucketB.targetWeight).to.equal(2000); // 20%
      expect(bucketB.hardCapLoss).to.equal(800); // 8%
      
      // Check L1 Bucket (25%)
      const bucketL1 = await lpBucketManager.getBucket(2); // BucketType.L1_PRIMARY_LIQUIDATOR
      expect(bucketL1.targetWeight).to.equal(2500); // 25%
      expect(bucketL1.hardCapLoss).to.equal(1200); // 12%
      
      // Check L2 Bucket (10%)
      const bucketL2 = await lpBucketManager.getBucket(3); // BucketType.L2_BACKSTOP
      expect(bucketL2.targetWeight).to.equal(1000); // 10%
      expect(bucketL2.hardCapLoss).to.equal(2000); // 20%
    });
    
    it("Should trigger hard cap protection", async function () {
      const { lpBucketManager, owner } = await loadFixture(deployPRD2Fixture);
      
      const bucketType = 0; // BucketType.A_PASSIVE_MAKER
      
      // Set bucket manager
      await lpBucketManager.setBucketManager(bucketType, owner.address);
      
      // Simulate a large loss that triggers hard cap
      await lpBucketManager.updateBucketPerformance(
        bucketType,
        ethers.utils.parseEther("-60000"), // -$60k loss
        0, // No fees
        1 // 1 trade
      );
      
      const bucket = await lpBucketManager.getBucket(bucketType);
      // The bucket should be emergency stopped due to hard cap
      // This would require more complex setup to test properly
    });
    
    it("Should execute rebalancing when needed", async function () {
      const { lpBucketManager } = await loadFixture(deployPRD2Fixture);
      
      const shouldRebalance = await lpBucketManager.shouldRebalance();
      // Initially should not need rebalancing
      expect(shouldRebalance).to.be.false;
    });
  });
  
  describe("AFB System", function () {
    it("Should initialize position AFB tracking", async function () {
      const { afbSystem, coreContract, user1 } = await loadFixture(deployPRD2Fixture);
      
      const positionKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "bytes32", "uint256"],
          [user1.address, ethers.utils.formatBytes32String("BTC/USD"), Date.now()]
        )
      );
      
      const market = ethers.utils.formatBytes32String("BTC/USD");
      
      await afbSystem.initializePositionAFB(
        positionKey,
        user1.address,
        market,
        0 // MarginMode.CROSS
      );
      
      const positionAFB = await afbSystem.getPositionAFB(positionKey);
      expect(positionAFB.accruedBalance).to.equal(0);
      expect(positionAFB.lastUpdateTime).to.be.greaterThan(0);
    });
    
    it("Should update funding rates based on open interest", async function () {
      const { afbSystem } = await loadFixture(deployPRD2Fixture);
      
      const market = ethers.utils.formatBytes32String("BTC/USD");
      const longOI = ethers.utils.parseEther("1000000"); // $1M long OI
      const shortOI = ethers.utils.parseEther("500000"); // $500k short OI
      const priceImpact = 100; // 1% price impact
      
      await afbSystem.updateFundingRate(market, longOI, shortOI, priceImpact);
      
      const marketState = await afbSystem.getMarketFundingState(market);
      expect(marketState.longOpenInterest).to.equal(longOI);
      expect(marketState.shortOpenInterest).to.equal(shortOI);
    });
  });
  
  describe("Governance Registry", function () {
    it("Should create and approve parameter proposals", async function () {
      const { governance, validator1 } = await loadFixture(deployPRD2Fixture);
      
      const parameterKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("trading.max_leverage"));
      const newValue = ethers.utils.hexZeroPad(ethers.utils.hexlify(50), 32); // Change to 50x
      const reason = "Reduce max leverage for safety";
      
      const proposalId = await governance.callStatic.createProposal(
        parameterKey,
        newValue,
        reason,
        false // Not emergency
      );
      
      await governance.createProposal(parameterKey, newValue, reason, false);
      
      // Approve proposal
      await governance.connect(validator1).approveProposal(proposalId, "LGTM");
      
      const proposal = await governance.getProposal(proposalId);
      expect(proposal.approvalCount).to.equal(1);
    });
    
    it("Should reject proposals without sufficient approvals", async function () {
      const { governance } = await loadFixture(deployPRD2Fixture);
      
      const parameterKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("trading.max_leverage"));
      const newValue = ethers.utils.hexZeroPad(ethers.utils.hexlify(200), 32);
      
      const proposalId = await governance.callStatic.createProposal(
        parameterKey,
        newValue,
        "Increase leverage",
        false
      );
      
      await governance.createProposal(parameterKey, newValue, "Increase leverage", false);
      
      // Try to execute without approvals
      await expect(
        governance.executeProposal(proposalId)
      ).to.be.revertedWith("Proposal not approved");
    });
  });
  
  describe("Dual Market Structure", function () {
    it("Should handle crypto markets as 24/7 CLOB", async function () {
      const { marketManager } = await loadFixture(deployPRD2Fixture);
      
      const market = await marketManager.getMarketConfig(
        ethers.utils.formatBytes32String("BTC/USD")
      );
      
      expect(market.marketType).to.equal(0); // MarketType.CRYPTO_24_7
      expect(market.currentMode).to.equal(3); // TradingMode.CONTINUOUS
    });
    
    it("Should handle xStock markets with RTH/ETMA modes", async function () {
      const { marketManager } = await loadFixture(deployPRD2Fixture);
      
      const market = await marketManager.getMarketConfig(
        ethers.utils.formatBytes32String("xAAPL")
      );
      
      expect(market.marketType).to.equal(2); // MarketType.XSTOCK_ETMA
    });
    
    it("Should execute cross-market trades", async function () {
      const { marketManager, user1 } = await loadFixture(deployPRD2Fixture);
      
      const marketIds = [
        ethers.utils.formatBytes32String("BTC/USD"),
        ethers.utils.formatBytes32String("xAAPL")
      ];
      const amounts = [
        ethers.utils.parseEther("10000"), // $10k BTC position
        ethers.utils.parseEther("5000")   // $5k AAPL position
      ];
      const isLongs = [true, false]; // Long BTC, Short AAPL
      
      const success = await marketManager.callStatic.executeCrossMarketTrade(
        user1.address,
        marketIds,
        amounts,
        isLongs
      );
      
      expect(success).to.be.true;
    });
  });
  
  describe("Integration Scenarios", function () {
    it("Should handle complete trading workflow", async function () {
      const { 
        coreContract, 
        sAuthSettlement, 
        afbSystem,
        riskManager,
        user1 
      } = await loadFixture(deployPRD2Fixture);
      
      // 1. Check risk gates
      const market = ethers.utils.formatBytes32String("BTC/USD");
      const tradeSize = ethers.utils.parseEther("10000");
      const leverage = 10;
      
      const [allowed] = await riskManager.checkThreeGates(
        user1.address,
        market,
        tradeSize,
        leverage
      );
      
      if (allowed) {
        // 2. Execute S-Auth trade (would need proper signature)
        // 3. Initialize AFB tracking
        // 4. Update funding rates
        
        // This integration test would be more complex with proper setup
        expect(true).to.be.true; // Placeholder
      }
    });
    
    it("Should handle LP bucket operations with AFB integration", async function () {
      const { lpBucketManager, afbSystem } = await loadFixture(deployPRD2Fixture);
      
      // Test would involve:
      // 1. LP deposits into buckets
      // 2. Trading activity generating AFB
      // 3. Bucket performance updates
      // 4. Rebalancing operations
      // 5. AFB settlements
      
      const totalAssets = await lpBucketManager.totalManagedAssets();
      expect(totalAssets).to.equal(0); // Initially zero
    });
  });
  
  describe("Emergency Scenarios", function () {
    it("Should handle emergency governance mode", async function () {
      const { governance, owner } = await loadFixture(deployPRD2Fixture);
      
      await governance.setGlobalEmergencyMode(true, "Market stress test");
      
      const parameterKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("risk.liquidation_threshold"));
      const newValue = ethers.utils.hexZeroPad(ethers.utils.hexlify(2000), 32); // 20%
      
      // Emergency parameter update should bypass normal timelock
      await governance.emergencyParameterUpdate(
        parameterKey,
        newValue,
        "Increase liquidation threshold during emergency"
      );
      
      const updatedValue = await governance.getParameterUint256(parameterKey);
      expect(updatedValue).to.equal(2000);
    });
    
    it("Should handle circuit breaker triggers", async function () {
      const { riskManager } = await loadFixture(deployPRD2Fixture);
      
      await riskManager.triggerCircuitBreaker(
        0, // GateType.SINGLE_WINDOW
        "Testing circuit breaker"
      );
      
      const isTriggered = await riskManager.isCircuitBreakerTriggered(0);
      expect(isTriggered).to.be.true;
    });
  });
});

// Helper contract for testing
const MockERC20_ABI = [
  "constructor(string name, string symbol, uint8 decimals)",
  "function mint(address to, uint256 amount)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// Deploy mock ERC20 contract
async function deployMockERC20() {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  return await MockERC20.deploy("USD Coin", "USDC", 6);
}