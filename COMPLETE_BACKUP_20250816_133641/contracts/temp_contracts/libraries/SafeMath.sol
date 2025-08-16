// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title SafeMath
 * @notice Library for safe mathematical operations with overflow protection
 * @dev Enhanced version with additional functions for trading calculations
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on overflow
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on underflow
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction underflow");
        return a - b;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on overflow
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting on division by zero
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: division by zero");
        return a / b;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: modulo by zero");
        return a % b;
    }

    /**
     * @dev Calculates percentage with basis points precision (10000 = 100%)
     */
    function percentage(uint256 amount, uint256 bps) internal pure returns (uint256) {
        return mul(amount, bps) / 10000;
    }

    /**
     * @dev Safe conversion from int256 to uint256
     */
    function toUint256(int256 value) internal pure returns (uint256) {
        require(value >= 0, "SafeMath: negative value");
        return uint256(value);
    }

    /**
     * @dev Safe conversion from uint256 to int256
     */
    function toInt256(uint256 value) internal pure returns (int256) {
        require(value <= uint256(type(int256).max), "SafeMath: value too large");
        return int256(value);
    }

    /**
     * @dev Absolute value of int256
     */
    function abs(int256 value) internal pure returns (uint256) {
        return value >= 0 ? uint256(value) : uint256(-value);
    }

    /**
     * @dev Calculate weighted average price
     */
    function weightedAverage(
        uint256 price1,
        uint256 weight1,
        uint256 price2,
        uint256 weight2
    ) internal pure returns (uint256) {
        uint256 totalWeight = add(weight1, weight2);
        require(totalWeight > 0, "SafeMath: zero total weight");
        
        return div(
            add(mul(price1, weight1), mul(price2, weight2)),
            totalWeight
        );
    }

    /**
     * @dev Calculate compound interest for funding rates
     */
    function compound(
        uint256 principal,
        int256 rate,
        uint256 periods
    ) internal pure returns (uint256) {
        if (rate == 0 || periods == 0) return principal;
        
        // For negative rates, we need to handle differently
        if (rate < 0) {
            uint256 absRate = abs(rate);
            // Simplified compound calculation for negative rates
            uint256 reduction = mul(mul(principal, absRate), periods) / 1e18;
            return sub(principal, reduction);
        } else {
            // Simplified compound calculation for positive rates
            uint256 increase = mul(mul(principal, uint256(rate)), periods) / 1e18;
            return add(principal, increase);
        }
    }

    /**
     * @dev Calculate minimum of two values
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @dev Calculate maximum of two values
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}