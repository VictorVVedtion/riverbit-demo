# RiverBit Core Trading Contracts

This repository contains the core smart contracts for RiverBit's comprehensive trading platform, including perpetual trading contracts and the RiverPool LP system. The platform supports cryptocurrency and xStock perpetual contracts with advanced features like cross/isolated margin modes, MEV protection, automated order execution, and a sophisticated four-bucket liquidity provision system.

## Architecture Overview

### RiverPool System Contracts

#### 1. RiverPool.sol
**Purpose**: Main liquidity pool contract managing LP shares (rLP), TVL/NAV calculations, and deposit/withdrawal operations.

**Key Features**:
- rLP token minting and burning
- Dynamic NAV calculation
- Progressive redemption fees (1-3% when daily redemption >5% TVL)
- Safe mode with escalating restrictions
- Insurance fund integration

**Key Functions**:
- `deposit()` - Deposit assets to receive rLP shares
- `withdraw()` - Redeem rLP shares for underlying assets
- `updateNAV()` - Update net asset value based on portfolio performance
- `executeRebalance()` - Trigger bucket rebalancing

#### 2. LPBucketManager.sol
**Purpose**: Manages the four-bucket LP architecture with automated rebalancing and risk management.

**Key Features**:
- **A桶 (Passive Maker)**: 45% allocation, near-term three-price passive market making
- **B桶 (Active Rebalancer)**: 20% allocation, small-amount active recentering
- **L1桶 (Primary Liquidator)**: 25% allocation, liquidation handling and tail depth
- **L2桶 (Backstop)**: 10% allocation, extreme liquidation and tail coverage
- Automated rebalancing every 4 hours with ±10% weight tolerance
- Loss protection mechanism with insurance coverage

**Key Functions**:
- `executeRebalance()` - Rebalance allocations across buckets
- `adjustBucketAllocation()` - Manually adjust bucket allocation
- `triggerLossProtection()` - Activate loss protection for buckets

#### 3. RevenueDistribution.sol
**Purpose**: Multi-source revenue aggregation and distribution to LP buckets.

**Key Features**:
- Revenue collection from trading fees, funding fees, liquidation fees, AMM spreads
- Performance-based distribution to buckets
- User revenue tracking and claiming
- Historical revenue analytics

**Key Functions**:
- `recordTradingFees()` - Record revenue from trading fees
- `distributeRevenue()` - Distribute accumulated revenue to buckets
- `claimRevenue()` - Claim user revenue earnings

#### 4. InsuranceFund.sol
**Purpose**: Insurance fund with three-gate protection mechanism and Safe-Mode activation.

**Key Features**:
- **Three-Gate Protection**:
  - B_event: 0.08% TVL single event limit
  - 15-minute: 0.20% TVL rolling window limit  
  - 24-hour: 2% TVL daily limit
- **Safe-Mode Escalation**: L1-L4 levels based on fund depletion
- Automated compensation processing
- Emergency controls and fund management

**Key Functions**:
- `depositFunds()` - Contribute to insurance fund
- `requestCompensation()` - Request insurance compensation
- `activateSafeMode()` - Manually activate safe mode

### Core Trading Contracts

#### 1. MarginManager.sol
**Purpose**: Manages user margin accounts, position margin requirements, and cross/isolated margin modes.

**Key Features**:
- USDC-only margin system
- Cross and isolated margin modes
- Dynamic margin calculations
- Liquidation threshold management
- Upgrade proxy support

**Key Functions**:
- `depositMargin()` - Deposit USDC as margin
- `withdrawMargin()` - Withdraw available margin
- `addMargin()` - Add margin to isolated positions
- `removeMargin()` - Remove margin from isolated positions
- `changeMarginMode()` - Switch between cross/isolated modes

#### 2. PerpetualTrading.sol
**Purpose**: Core trading engine for opening/closing positions, PnL calculations, and funding payments.

**Key Features**:
- Support for BTC/ETH/SOL (1-100x leverage)
- Support for xStock perpetuals (1.5-3x leverage)
- Automated funding rate calculations
- Position liquidation system
- Real-time PnL tracking

**Key Functions**:
- `openPosition()` - Open new or add to existing positions
- `closePosition()` - Close positions (full or partial)
- `liquidatePosition()` - Liquidate undercollateralized positions
- `updateFunding()` - Update funding rates based on open interest
- `claimFunding()` - Process funding payments

#### 3. OrderManager.sol
**Purpose**: Advanced order management with MEV protection and automated execution.

**Key Features**:
- Market, limit, stop-loss, and take-profit orders
- Commit-reveal MEV protection scheme
- Batch order execution
- Order lifecycle management
- Slippage protection

**Key Functions**:
- `createOrder()` - Create new orders
- `createOrderWithCommitment()` - MEV-protected order creation
- `revealAndExecuteOrder()` - Reveal and execute committed orders
- `executeOrder()` - Execute pending orders
- `batchExecuteOrders()` - Execute multiple orders efficiently

### Supporting Libraries

#### TradingMath.sol
Mathematical functions for trading calculations:
- PnL calculations
- Margin requirements
- Funding payments
- Liquidation prices
- Position sizing

#### SafeMath.sol
Enhanced safe math operations with trading-specific functions:
- Overflow/underflow protection
- Percentage calculations
- Type conversions
- Compound interest calculations

### Interfaces

All contracts implement comprehensive interfaces (`IMarginManager.sol`, `IPerpetualTrading.sol`, `IOrderManager.sol`) enabling modular architecture and easy integration.

## Technical Specifications

### Leverage Limits
- **Crypto Markets (BTC, ETH, SOL)**: 1x to 100x leverage
- **xStock Markets**: 1.5x to 3x leverage

### Margin System
- **Base Currency**: USDC (6 decimals)
- **Minimum Margin**: $1 USD
- **Margin Modes**: Cross (shared margin pool) and Isolated (position-specific margin)

### MEV Protection
- **Commit-Reveal Scheme**: 1-60 minute delay between commitment and reveal
- **Maximum Slippage**: Configurable (default 1%)
- **Commitment Lifetime**: 1 hour after minimum delay

### Funding System
- **Funding Interval**: 8 hours
- **Maximum Funding Rate**: 1% per funding period
- **Calculation Method**: Based on long/short open interest imbalance

### Security Features
- **Reentrancy Protection**: All external functions protected
- **Pausable Operations**: Emergency pause functionality
- **Access Control**: Role-based permissions
- **Upgrade Proxy**: OpenZeppelin upgradeable contracts
- **Integer Overflow Protection**: SafeMath library usage

## Gas Optimizations

1. **Batch Operations**: Support for batch order execution
2. **Efficient Storage**: Optimized struct packing
3. **Minimal External Calls**: Reduced cross-contract calls
4. **State Caching**: Local variable caching for repeated reads

## Error Handling

### Custom Errors
- Gas-efficient custom errors instead of require strings
- Descriptive error names for better debugging
- Proper error propagation across contract calls

### Event Logging
- Comprehensive event emission for all state changes
- Indexed parameters for efficient filtering
- Detailed trade execution information

## Deployment Requirements

### Dependencies
```bash
npm install @openzeppelin/contracts@^4.9.3
npm install @openzeppelin/contracts-upgradeable@^4.9.3
```

### Deployment Order
1. Deploy MarginManager (with USDC token address)
2. Deploy PerpetualTrading (with MarginManager address)
3. Deploy OrderManager (with PerpetualTrading and MarginManager addresses)
4. Configure authorized contracts and parameters

### Initial Configuration
```solidity
// MarginManager
marginManager.setAuthorizedContract(perpetualTradingAddress, true);
marginManager.setAuthorizedContract(orderManagerAddress, true);

// PerpetualTrading
perpetualTrading.addMarket("BTC-USD", MarketType.CRYPTO, 10, 50);
perpetualTrading.addMarket("AAPL-USD", MarketType.XSTOCK, 20, 100);

// OrderManager
orderManager.setExecutor(botAddress, true);
orderManager.updateMEVProtection(300, 100, true); // 5min delay, 1% slippage
```

## Usage Examples

### Opening a Position
```solidity
// Deposit margin
marginManager.depositMargin(1000 * 1e6); // $1000 USDC

// Open 10x leveraged BTC long position
perpetualTrading.openPosition(
    "BTC-USD",
    TradeDirection.LONG,
    10000 * 1e18, // $10,000 position size
    50000 * 1e18, // Max price $50,000
    MarginMode.CROSS
);
```

### Creating a Limit Order
```solidity
// Create limit order to buy BTC at $45,000
orderManager.createOrder(
    "BTC-USD",
    OrderType.LIMIT,
    TradeDirection.LONG,
    5000 * 1e18, // $5,000 position
    45000 * 1e18, // Trigger at $45,000
    45100 * 1e18, // Execute up to $45,100
    500 * 1e6, // $500 margin
    MarginMode.ISOLATED,
    0 // Good till cancelled
);
```

### MEV-Protected Order
```solidity
// Generate commitment
bytes32 commitment = orderManager.generateCommitment(
    "BTC-USD", OrderType.MARKET, TradeDirection.LONG,
    1000 * 1e18, 0, 50000 * 1e18, 100 * 1e6,
    MarginMode.CROSS, 0, nonce, msg.sender
);

// Commit order
orderManager.createOrderWithCommitment(commitment);

// Wait for delay period, then reveal
orderManager.revealAndExecuteOrder(
    orderId, "BTC-USD", OrderType.MARKET, TradeDirection.LONG,
    1000 * 1e18, 0, 50000 * 1e18, 100 * 1e6,
    MarginMode.CROSS, 0, nonce
);
```

## Testing

The contracts include comprehensive test coverage for:
- Position lifecycle management
- Margin calculations and modes
- Order execution and MEV protection
- Liquidation mechanisms
- Funding rate calculations
- Edge cases and error conditions

## Security Considerations

1. **Oracle Dependencies**: Price feeds must be properly secured (Chainlink recommended)
2. **Admin Controls**: Multi-sig recommended for admin functions
3. **Upgrade Safety**: Proper storage layout preservation for upgrades
4. **Economic Parameters**: Careful tuning of liquidation thresholds and funding rates
5. **MEV Protection**: Proper implementation of commit-reveal scheme

## License

MIT License - see LICENSE file for details.

## Support

For technical questions or integration support, please refer to the RiverBit documentation or contact the development team.