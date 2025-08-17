// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Errors.sol";

/**
 * @title Security
 * @dev Security utilities and validation functions for RiverPool system
 * @notice Provides common security checks, input validation, and safety mechanisms
 */
library Security {
    
    // ============ Constants ============
    
    uint256 internal constant BASIS_POINTS = 10000;
    uint256 internal constant MAX_PERCENTAGE = BASIS_POINTS;
    uint256 internal constant MAX_FEE = 1000; // 10% max fee
    uint256 internal constant MIN_AMOUNT_THRESHOLD = 1e6; // Minimum amount for operations (1 micro unit)
    uint256 internal constant MAX_ARRAY_LENGTH = 1000; // Maximum array length for batch operations
    
    // ============ Input Validation ============
    
    /**
     * @dev Validates that an address is not zero
     * @param addr Address to validate
     */
    function validateAddress(address addr) internal pure {
        if (addr == address(0)) revert Errors.InvalidAddress();
    }
    
    /**
     * @dev Validates that multiple addresses are not zero
     * @param addresses Array of addresses to validate
     */
    function validateAddresses(address[] memory addresses) internal pure {
        uint256 length = addresses.length;
        if (length == 0) revert Errors.InvalidInput();
        if (length > MAX_ARRAY_LENGTH) revert Errors.ExceedsMaxValue();
        
        for (uint256 i = 0; i < length;) {
            validateAddress(addresses[i]);
            unchecked { ++i; }
        }
    }
    
    /**
     * @dev Validates that an amount is greater than zero
     * @param amount Amount to validate
     */
    function validateAmount(uint256 amount) internal pure {
        if (amount == 0) revert Errors.InvalidAmount();
    }
    
    /**
     * @dev Validates that an amount is within acceptable range
     * @param amount Amount to validate
     * @param minAmount Minimum allowed amount
     * @param maxAmount Maximum allowed amount
     */
    function validateAmountRange(uint256 amount, uint256 minAmount, uint256 maxAmount) internal pure {
        if (amount < minAmount) revert Errors.BelowMinValue();
        if (amount > maxAmount) revert Errors.ExceedsMaxValue();
    }
    
    /**
     * @dev Validates that a percentage is within valid range (0-10000 basis points)
     * @param percentage Percentage in basis points to validate
     */
    function validatePercentage(uint256 percentage) internal pure {
        if (percentage > MAX_PERCENTAGE) revert Errors.InvalidPercentageParameter();
    }
    
    /**
     * @dev Validates that a fee is within maximum allowed range
     * @param fee Fee in basis points to validate
     */
    function validateFee(uint256 fee) internal pure {
        if (fee > MAX_FEE) revert Errors.FeeTooHigh();
    }
    
    /**
     * @dev Validates that array lengths match
     * @param array1Length Length of first array
     * @param array2Length Length of second array
     */
    function validateArrayLengths(uint256 array1Length, uint256 array2Length) internal pure {
        if (array1Length != array2Length) revert Errors.ArrayLengthMismatch();
        if (array1Length == 0) revert Errors.InvalidInput();
        if (array1Length > MAX_ARRAY_LENGTH) revert Errors.ExceedsMaxValue();
    }
    
    /**
     * @dev Validates that a timestamp is not in the future
     * @param timestamp Timestamp to validate
     */
    function validateTimestamp(uint256 timestamp) internal view {
        if (timestamp > block.timestamp) revert Errors.InvalidTimestamp();
    }
    
    /**
     * @dev Validates that a time range is valid
     * @param startTime Start timestamp
     * @param endTime End timestamp
     */
    function validateTimeRange(uint256 startTime, uint256 endTime) internal view {
        validateTimestamp(startTime);
        validateTimestamp(endTime);
        if (startTime >= endTime) revert Errors.InvalidTimeParameter();
    }
    
    // ============ Mathematical Validation ============
    
    /**
     * @dev Safe addition with overflow check
     * @param a First number
     * @param b Second number
     * @return Sum of a and b
     */
    function safeAdd(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        if (c < a) revert Errors.Overflow();
        return c;
    }
    
    /**
     * @dev Safe subtraction with underflow check
     * @param a First number
     * @param b Second number
     * @return Difference of a and b
     */
    function safeSub(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b > a) revert Errors.Underflow();
        return a - b;
    }
    
    /**
     * @dev Safe multiplication with overflow check
     * @param a First number
     * @param b Second number
     * @return Product of a and b
     */
    function safeMul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        if (c / a != b) revert Errors.Overflow();
        return c;
    }
    
    /**
     * @dev Safe division with zero check
     * @param a Dividend
     * @param b Divisor
     * @return Quotient of a and b
     */
    function safeDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b == 0) revert Errors.DivisionByZero();
        return a / b;
    }
    
    /**
     * @dev Calculate percentage with basis points
     * @param amount Base amount
     * @param percentage Percentage in basis points
     * @return Calculated percentage amount
     */
    function calculatePercentage(uint256 amount, uint256 percentage) internal pure returns (uint256) {
        validatePercentage(percentage);
        return safeMul(amount, percentage) / BASIS_POINTS;
    }
    
    /**
     * @dev Calculate shares with precision handling
     * @param amount Amount to convert
     * @param totalShares Total shares outstanding
     * @param totalAmount Total amount in pool
     * @return Number of shares
     */
    function calculateShares(
        uint256 amount,
        uint256 totalShares,
        uint256 totalAmount
    ) internal pure returns (uint256) {
        if (totalAmount == 0 || totalShares == 0) return amount;
        return safeMul(amount, totalShares) / totalAmount;
    }
    
    // ============ Security Checks ============
    
    /**
     * @dev Checks if an operation would cause excessive slippage
     * @param expectedAmount Expected amount
     * @param actualAmount Actual amount
     * @param maxSlippageBps Maximum allowed slippage in basis points
     */
    function checkSlippage(
        uint256 expectedAmount,
        uint256 actualAmount,
        uint256 maxSlippageBps
    ) internal pure {
        validatePercentage(maxSlippageBps);
        
        uint256 slippage;
        if (actualAmount < expectedAmount) {
            slippage = ((expectedAmount - actualAmount) * BASIS_POINTS) / expectedAmount;
        } else {
            slippage = ((actualAmount - expectedAmount) * BASIS_POINTS) / expectedAmount;
        }
        
        if (slippage > maxSlippageBps) revert Errors.SlippageTooHigh();
    }
    
    /**
     * @dev Checks if a value is within deviation limits
     * @param currentValue Current value
     * @param targetValue Target value
     * @param maxDeviationBps Maximum allowed deviation in basis points
     */
    function checkDeviation(
        uint256 currentValue,
        uint256 targetValue,
        uint256 maxDeviationBps
    ) internal pure returns (bool) {
        validatePercentage(maxDeviationBps);
        
        if (targetValue == 0) return currentValue == 0;
        
        uint256 deviation = currentValue > targetValue ?
            ((currentValue - targetValue) * BASIS_POINTS) / targetValue :
            ((targetValue - currentValue) * BASIS_POINTS) / targetValue;
        
        return deviation <= maxDeviationBps;
    }
    
    /**
     * @dev Validates that total weights don't exceed 100%
     * @param weights Array of weights in basis points
     */
    function validateTotalWeights(uint256[] memory weights) internal pure {
        uint256 totalWeight = 0;
        uint256 length = weights.length;
        
        for (uint256 i = 0; i < length;) {
            validatePercentage(weights[i]);
            totalWeight = safeAdd(totalWeight, weights[i]);
            unchecked { ++i; }
        }
        
        if (totalWeight > BASIS_POINTS) revert Errors.TotalWeightExceeds100Percent();
    }
    
    // ============ Time-based Security ============
    
    /**
     * @dev Checks if sufficient time has passed since last action
     * @param lastActionTime Timestamp of last action
     * @param cooldownPeriod Required cooldown period in seconds
     */
    function checkCooldown(uint256 lastActionTime, uint256 cooldownPeriod) internal view {
        if (block.timestamp < lastActionTime + cooldownPeriod) {
            revert Errors.CooldownPeriodActive();
        }
    }
    
    /**
     * @dev Checks if current time is within a valid time window
     * @param windowStart Start of the time window
     * @param windowEnd End of the time window
     */
    function checkTimeWindow(uint256 windowStart, uint256 windowEnd) internal view {
        if (block.timestamp < windowStart || block.timestamp > windowEnd) {
            revert Errors.TimeWindowNotOpen();
        }
    }
    
    /**
     * @dev Checks if a time window has expired
     * @param deadline Deadline timestamp
     */
    function checkDeadline(uint256 deadline) internal view {
        if (block.timestamp > deadline) revert Errors.TimeWindowExpired();
    }
    
    // ============ Rate Limiting ============
    
    /**
     * @dev Checks rate limit for operations
     * @param lastReset Last reset timestamp
     * @param resetPeriod Reset period in seconds
     * @param currentCount Current operation count
     * @param maxOperations Maximum operations per period
     */
    function checkRateLimit(
        uint256 lastReset,
        uint256 resetPeriod,
        uint256 currentCount,
        uint256 maxOperations
    ) internal view returns (bool shouldReset, bool allowed) {
        shouldReset = block.timestamp >= lastReset + resetPeriod;
        allowed = shouldReset || currentCount < maxOperations;
    }
    
    // ============ Data Integrity ============
    
    /**
     * @dev Validates data integrity using simple checksum
     * @param data Data to validate
     * @param expectedChecksum Expected checksum
     */
    function validateChecksum(bytes memory data, bytes32 expectedChecksum) internal pure {
        bytes32 actualChecksum = keccak256(data);
        if (actualChecksum != expectedChecksum) revert Errors.ChecksumInvalid();
    }
    
    /**
     * @dev Validates signature (simplified version)
     * @param hash Message hash
     * @param signature Signature bytes
     * @param signer Expected signer address
     */
    function validateSignature(
        bytes32 hash,
        bytes memory signature,
        address signer
    ) internal pure {
        if (signature.length != 65) revert Errors.InvalidSignature();
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        address recoveredSigner = ecrecover(hash, v, r, s);
        if (recoveredSigner != signer) revert Errors.InvalidSignature();
    }
    
    // ============ Emergency Checks ============
    
    /**
     * @dev Checks if system is in emergency state
     * @param emergencyFlags Bit flags indicating emergency states
     * @param checkFlag Specific flag to check
     */
    function checkEmergencyState(uint256 emergencyFlags, uint256 checkFlag) internal pure {
        if (emergencyFlags & checkFlag != 0) revert Errors.EmergencyShutdown();
    }
    
    /**
     * @dev Validates that operation is allowed in current system state
     * @param isPaused Whether system is paused
     * @param isEmergency Whether emergency mode is active
     * @param allowInEmergency Whether operation is allowed in emergency
     */
    function validateOperationState(
        bool isPaused,
        bool isEmergency,
        bool allowInEmergency
    ) internal pure {
        if (isPaused) revert Errors.Paused();
        if (isEmergency && !allowInEmergency) revert Errors.EmergencyModeActive();
    }
    
    // ============ Gas Optimization Utilities ============
    
    /**
     * @dev Optimized array iteration with bounds checking
     * @param arrayLength Length of array to iterate
     * @param maxIterations Maximum iterations allowed
     */
    function validateIterationBounds(uint256 arrayLength, uint256 maxIterations) internal pure {
        if (arrayLength > maxIterations) revert Errors.ExceedsMaxValue();
    }
    
    /**
     * @dev Batch operation validator
     * @param batchSize Size of the batch
     * @param maxBatchSize Maximum allowed batch size
     */
    function validateBatchSize(uint256 batchSize, uint256 maxBatchSize) internal pure {
        if (batchSize == 0) revert Errors.InvalidInput();
        if (batchSize > maxBatchSize) revert Errors.ExceedsMaxValue();
    }
}