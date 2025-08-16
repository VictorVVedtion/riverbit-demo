# RiverBit Smart Contract Architecture

## Overview

This document outlines the comprehensive smart contract architecture for RiverBit's non-custodial 24/7 perpetual contract trading platform. The system implements advanced DeFi trading features while maintaining the highest security standards and regulatory compliance.

## Core Architecture Components

### 1. Interface Layer (`IRiverBitCoreV3.sol`)

**Purpose**: Comprehensive interface defining the entire RiverBit system
**Key Features**:
- Complete type definitions for all trading operations
- Market types (CRYPTO, STOCK) with different leverage limits
- Position management (cross/isolated margin)
- Order types (market, limit, stop-loss, take-profit)
- LP bucket architecture definitions
- Oracle integration structures
- ETMA (Event-Triggered Market Auction) support

### 2. Three Iron Laws Enforcement (`ThreeIronLaws.sol`)

**Purpose**: Core guardian system enforcing RiverBit's fundamental principles
**The Three Iron Laws (三条铁律)**:
1. **不碰用户资金** - Never touch user funds except during authorized settlement
2. **不操纵市场** - Never manipulate market prices or positions  
3. **不出现负余额** - Never allow negative account balances

**Key Features**:
- Real-time compliance monitoring and violation detection
- Automated enforcement actions (logging, reverting, pausing, emergency shutdown)
- S-Auth ticket authorization for fund access
- Market manipulation detection with price deviation monitoring
- Negative balance prevention with timeout controls
- Comprehensive audit trail and violation reporting

### 3. Enhanced S-Auth Settlement System (`SAuthSettlementV2.sol`)

**Purpose**: Advanced signature-based settlement with batch processing
**Key Features**:
- EIP-712 typed signature validation
- Merkle tree validation for batch integrity
- Gas-optimized batch settlement (up to 100 orders per batch)
- MEV protection through commit-reveal mechanism
- Dynamic fee adjustment based on batch size
- Three Iron Laws compliance integration
- Emergency circuit breakers and risk controls

**Technical Highlights**:
- Signature validity: 30 minutes
- Batch settlement interval: 5-10 seconds
- Merkle proof validation for each ticket
- Gas optimization with up to 20% batch discounts

### 4. Multi-Source Price Oracle System (`PriceOracleAggregator.sol`)

**Purpose**: Robust price aggregation with health scoring and market-specific logic
**Key Features**:
- Multi-source price aggregation (Chainlink, Pyth, Binance, etc.)
- Health scoring system (0-100) for each oracle source
- FBL (First Bar Lock) protection for market open periods
- Confidence scoring (0-100) for aggregated prices
- Market session management (pre-market, regular, after-hours, ETMA)
- Outlier detection and filtering
- Circuit breakers and emergency controls

**Oracle Types Supported**:
- Crypto: Chainlink, Pyth, Binance, Coinbase
- Stocks: NASDAQ, Polygon, custom sources
- Health-based source selection and weighting

### 5. Four-Bucket LP Architecture (`FourBucketLPManager.sol`)

**Purpose**: Sophisticated liquidity provider system with automated rebalancing
**Bucket Configuration**:
- **A桶 (Passive Maker)**: 45% allocation - Three-price passive market making
- **B桶 (Active Rebalancer)**: 20% allocation - Active recentering operations
- **L1桶 (Primary Liquidator)**: 25% allocation - Liquidation handling and tail depth
- **L2桶 (Backstop)**: 10% allocation - Extreme liquidation coverage

**Key Features**:
- Automated rebalancing every 4 hours with ±10% weight tolerance
- JIT (Just-In-Time) auction system for liquidations
- Performance-based allocation adjustments
- Risk-managed inventory control
- Loss protection mechanism with insurance coverage
- Comprehensive performance tracking and analytics

## Security Framework

### Access Control
- Role-based permissions using OpenZeppelin AccessControl
- Multi-signature requirements for critical functions
- Time-locked upgrades for user protection
- Emergency pause mechanisms

### Risk Management
- Graduated margin requirements based on position size
- Multi-tier liquidation system with auction mechanisms
- Cross-margin and isolated margin modes
- Dynamic risk parameter adjustment
- Comprehensive health monitoring

### Compliance & Auditing
- Real-time Three Iron Laws monitoring
- Comprehensive event logging for transparency
- Violation detection and automated response
- Audit trail for all critical operations

## Gas Optimization

### Batch Operations
- Merkle tree validation for batch integrity
- Optimized storage patterns with struct packing
- Dynamic gas estimation and adjustment
- Batch discounts for settlement fees

### Storage Efficiency
- Efficient struct packing (uint256/uint128/uint64 optimization)
- Mapping optimization for frequent reads
- State caching for repeated operations
- Minimal external contract calls

## Economic Model

### Fee Structure
- Base trading fee: 0.3% (with batch discounts)
- Management fee: 2% annually for LP buckets
- Performance fee: 20% of profits for LP buckets
- Rebalancing fee: 0.1% per rebalance operation

### Liquidity Incentives
- Performance-based LP rewards
- JIT auction participation incentives
- Risk-adjusted returns for different bucket strategies
- Insurance fund contributions and coverage

## Deployment Strategy

### Phase 1: Core Infrastructure
1. Deploy Three Iron Laws enforcement system
2. Deploy enhanced S-Auth settlement system
3. Deploy price oracle aggregator
4. Configure basic market parameters

### Phase 2: Trading Engine
1. Deploy four-bucket LP manager
2. Deploy risk management system
3. Deploy ETMA engine
4. Configure liquidation mechanisms

### Phase 3: Advanced Features
1. Deploy insurance fund system
2. Deploy governance framework
3. Configure cross-chain integration
4. Implement advanced analytics

## Market Support

### Cryptocurrency Markets
- **BTC-PERP**: 1-100x leverage, 24/7 trading
- **ETH-PERP**: 1-100x leverage, 24/7 trading  
- **SOL-PERP**: 1-100x leverage, 24/7 trading

### Stock Markets (xStock)
- **US Stocks**: AAPL, MSFT, AMZN, META, GOOGL, NVDA, TSLA
- **Leverage**: 1.5-20x depending on volatility
- **ETMA Support**: After-hours trading via event-triggered auctions
- **FBL Protection**: First Bar Lock during market open periods

## Integration Points

### External Dependencies
- **Chainlink Oracles**: Primary price feeds for crypto
- **Pyth Network**: High-frequency price updates
- **Traditional Market Data**: NASDAQ, Bloomberg feeds for stocks
- **Arbitrum Network**: L2 deployment for low fees and fast finality

### Internal Integrations
- **Core Trading Engine**: Position management and execution
- **Insurance Fund**: Multi-tier protection and compensation
- **Governance System**: Parameter updates and emergency controls
- **Analytics Engine**: Performance tracking and risk assessment

## Emergency Controls

### Circuit Breakers
- Individual market pause capabilities
- Oracle source blacklisting
- Bucket emergency stops
- Global system shutdown

### Recovery Mechanisms
- Emergency price updates
- Manual rebalancing override
- Insurance fund activation
- Three Iron Laws compliance restoration

## Future Enhancements

### Advanced Features (Roadmap)
1. **Cross-Chain Integration**: Support for multiple L2s and sidechains
2. **Options Trading**: European and American style options
3. **Synthetic Assets**: Basket derivatives and custom instruments
4. **AI-Powered Risk Management**: Machine learning for dynamic parameter adjustment
5. **Social Trading**: Copy trading and strategy sharing
6. **Institutional Tools**: Prime brokerage and custody solutions

### Scalability Improvements
1. **Layer 3 Integration**: Ultra-low latency trading
2. **Batch Optimization**: Advanced batching algorithms
3. **State Channels**: Off-chain settlement for high-frequency trading
4. **Zero-Knowledge Proofs**: Enhanced privacy and efficiency

## Conclusion

This smart contract architecture provides a robust, secure, and scalable foundation for RiverBit's perpetual trading platform. The system maintains strict adherence to the Three Iron Laws while providing advanced trading features and sophisticated liquidity management. The modular design allows for progressive deployment and future enhancements while ensuring user funds are always protected.

The architecture is designed to handle the complexities of both cryptocurrency and traditional stock market trading, providing a unified platform for 24/7 global perpetual contract trading with institutional-grade security and compliance.