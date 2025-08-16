// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./SafeMath.sol";

/**
 * @title TradingMath
 * @notice Library for trading-specific mathematical calculations
 * @dev Handles PnL, margin, funding, and liquidation calculations
 */
library TradingMath {
    using SafeMath for uint256;

    // Constants
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_HOUR = 3600;
    uint256 private constant HOURS_PER_DAY = 24;

    /**
     * @dev Calculate unrealized PnL for a position
     * @param entryPrice Average entry price of the position
     * @param currentPrice Current market price
     * @param size Position size in USD
     * @param isLong Whether the position is long (true) or short (false)
     * @return pnl Unrealized PnL (positive for profit, negative for loss)
     */
    function calculatePnL(
        uint256 entryPrice,
        uint256 currentPrice,
        uint256 size,
        bool isLong
    ) internal pure returns (int256 pnl) {
        require(entryPrice > 0, "TradingMath: invalid entry price");
        require(currentPrice > 0, "TradingMath: invalid current price");
        require(size > 0, "TradingMath: invalid size");

        if (isLong) {
            // Long position: profit when price goes up
            if (currentPrice >= entryPrice) {
                uint256 profit = size.mul(currentPrice.sub(entryPrice)).div(entryPrice);
                pnl = SafeMath.toInt256(profit);
            } else {
                uint256 loss = size.mul(entryPrice.sub(currentPrice)).div(entryPrice);
                pnl = -SafeMath.toInt256(loss);
            }
        } else {
            // Short position: profit when price goes down
            if (entryPrice >= currentPrice) {
                uint256 profit = size.mul(entryPrice.sub(currentPrice)).div(entryPrice);
                pnl = SafeMath.toInt256(profit);
            } else {
                uint256 loss = size.mul(currentPrice.sub(entryPrice)).div(entryPrice);
                pnl = -SafeMath.toInt256(loss);
            }
        }
    }

    /**
     * @dev Calculate required initial margin for a position
     * @param size Position size in USD
     * @param leverage Leverage multiplier (e.g., 10 for 10x)
     * @param marginBuffer Additional margin buffer percentage (basis points)
     * @return margin Required margin amount
     */
    function calculateInitialMargin(
        uint256 size,
        uint256 leverage,
        uint256 marginBuffer
    ) internal pure returns (uint256 margin) {
        require(leverage > 0, "TradingMath: invalid leverage");
        require(size > 0, "TradingMath: invalid size");

        // Base margin = size / leverage
        uint256 baseMargin = size.div(leverage);
        
        // Add margin buffer
        uint256 buffer = baseMargin.percentage(marginBuffer);
        margin = baseMargin.add(buffer);
    }

    /**
     * @dev Calculate maintenance margin requirement
     * @param size Position size in USD
     * @param maintenanceRate Maintenance margin rate (basis points)
     * @return margin Maintenance margin amount
     */
    function calculateMaintenanceMargin(
        uint256 size,
        uint256 maintenanceRate
    ) internal pure returns (uint256 margin) {
        require(size > 0, "TradingMath: invalid size");
        margin = size.percentage(maintenanceRate);
    }

    /**
     * @dev Calculate funding payment for a position
     * @param size Position size in USD
     * @param fundingRate Funding rate (18 decimals, can be negative)
     * @param timeDelta Time since last funding payment (seconds)
     * @param isLong Whether the position is long
     * @return payment Funding payment (positive = pay, negative = receive)
     */
    function calculateFundingPayment(
        uint256 size,
        int256 fundingRate,
        uint256 timeDelta,
        bool isLong
    ) internal pure returns (int256 payment) {
        require(size > 0, "TradingMath: invalid size");

        // Convert time to hours for funding calculation
        uint256 hours = timeDelta.div(SECONDS_PER_HOUR);
        if (hours == 0) return 0; // No payment for less than 1 hour

        // Calculate base funding payment
        uint256 absPayment = size.mul(SafeMath.abs(fundingRate)).mul(hours).div(PRECISION).div(HOURS_PER_DAY);

        // Determine payment direction
        if (fundingRate > 0) {
            // Positive funding rate: longs pay shorts
            payment = isLong ? SafeMath.toInt256(absPayment) : -SafeMath.toInt256(absPayment);
        } else if (fundingRate < 0) {
            // Negative funding rate: shorts pay longs
            payment = isLong ? -SafeMath.toInt256(absPayment) : SafeMath.toInt256(absPayment);
        }
        // If fundingRate == 0, payment remains 0
    }

    /**
     * @dev Calculate liquidation price for a position
     * @param entryPrice Average entry price
     * @param margin Position margin
     * @param size Position size in USD
     * @param maintenanceRate Maintenance margin rate (basis points)
     * @param isLong Whether position is long
     * @return liquidationPrice Price at which position gets liquidated
     */
    function calculateLiquidationPrice(
        uint256 entryPrice,
        uint256 margin,
        uint256 size,
        uint256 maintenanceRate,
        bool isLong
    ) internal pure returns (uint256 liquidationPrice) {
        require(entryPrice > 0, "TradingMath: invalid entry price");
        require(margin > 0, "TradingMath: invalid margin");
        require(size > 0, "TradingMath: invalid size");

        uint256 maintenanceMargin = calculateMaintenanceMargin(size, maintenanceRate);
        uint256 maxLoss = margin > maintenanceMargin ? margin.sub(maintenanceMargin) : 0;

        if (maxLoss == 0) {
            // Position is already at liquidation threshold
            return entryPrice;
        }

        if (isLong) {
            // Long position: liquidated when price drops
            uint256 priceDropPercent = maxLoss.mul(entryPrice).div(size);
            liquidationPrice = entryPrice > priceDropPercent ? entryPrice.sub(priceDropPercent) : 0;
        } else {
            // Short position: liquidated when price rises
            uint256 priceRisePercent = maxLoss.mul(entryPrice).div(size);
            liquidationPrice = entryPrice.add(priceRisePercent);
        }
    }

    /**
     * @dev Calculate trading fee
     * @param size Trade size in USD
     * @param feeRate Fee rate (basis points)
     * @return fee Trading fee amount
     */
    function calculateTradingFee(
        uint256 size,
        uint256 feeRate
    ) internal pure returns (uint256 fee) {
        require(size > 0, "TradingMath: invalid size");
        fee = size.percentage(feeRate);
    }

    /**
     * @dev Calculate maximum position size based on available margin and leverage
     * @param availableMargin Available margin for new positions
     * @param leverage Desired leverage
     * @param marginBuffer Additional margin buffer (basis points)
     * @return maxSize Maximum position size
     */
    function calculateMaxPositionSize(
        uint256 availableMargin,
        uint256 leverage,
        uint256 marginBuffer
    ) internal pure returns (uint256 maxSize) {
        require(leverage > 0, "TradingMath: invalid leverage");
        
        if (availableMargin == 0) return 0;

        // Account for margin buffer
        uint256 bufferAdjustment = BASIS_POINTS.add(marginBuffer);
        uint256 effectiveMargin = availableMargin.mul(BASIS_POINTS).div(bufferAdjustment);
        
        maxSize = effectiveMargin.mul(leverage);
    }

    /**
     * @dev Check if a position should be liquidated
     * @param margin Current position margin
     * @param unrealizedPnL Current unrealized PnL
     * @param size Position size
     * @param maintenanceRate Maintenance margin rate (basis points)
     * @return shouldLiquidate Whether position should be liquidated
     */
    function shouldLiquidate(
        uint256 margin,
        int256 unrealizedPnL,
        uint256 size,
        uint256 maintenanceRate
    ) internal pure returns (bool shouldLiquidate) {
        uint256 maintenanceMargin = calculateMaintenanceMargin(size, maintenanceRate);
        
        // Calculate effective margin after PnL
        uint256 effectiveMargin;
        if (unrealizedPnL >= 0) {
            effectiveMargin = margin.add(SafeMath.toUint256(unrealizedPnL));
        } else {
            uint256 loss = SafeMath.toUint256(-unrealizedPnL);
            effectiveMargin = margin > loss ? margin.sub(loss) : 0;
        }

        shouldLiquidate = effectiveMargin < maintenanceMargin;
    }

    /**
     * @dev Calculate new average entry price when adding to position
     * @param currentSize Current position size
     * @param currentPrice Current average entry price
     * @param addSize Size being added
     * @param addPrice Price of the addition
     * @return newPrice New average entry price
     */
    function calculateNewAveragePrice(
        uint256 currentSize,
        uint256 currentPrice,
        uint256 addSize,
        uint256 addPrice
    ) internal pure returns (uint256 newPrice) {
        if (currentSize == 0) return addPrice;
        if (addSize == 0) return currentPrice;

        newPrice = SafeMath.weightedAverage(
            currentPrice,
            currentSize,
            addPrice,
            addSize
        );
    }
}