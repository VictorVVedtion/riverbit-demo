// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title GasOptimizer
 * @notice Library for gas optimization techniques and batch operations
 * @dev Implements various gas saving strategies for DeFi protocols
 */
library GasOptimizer {
    
    // ============ STRUCTS ============
    
    struct BatchState {
        uint256 batchId;                // Current batch ID
        uint256 operationCount;         // Operations in current batch
        uint256 gasStart;               // Gas at batch start
        uint256 totalGasSaved;          // Total gas saved across batches
        mapping(uint256 => BatchInfo) batches; // Batch information
    }
    
    struct BatchInfo {
        uint256 operations;             // Number of operations
        uint256 gasUsed;                // Total gas used
        uint256 gasSaved;               // Gas saved vs individual operations
        uint256 timestamp;              // Batch timestamp
    }
    
    struct PackedPosition {
        uint128 size;                   // Position size (18 decimals)
        uint64 entryPrice;              // Entry price (8 decimals, max 18M)
        uint32 openTime;                // Open timestamp (relative to contract deployment)
        uint16 leverage;                // Leverage (1-1000x)
        uint8 marketId;                 // Market ID (0-255)
        bool isLong;                    // Position direction
    }
    
    struct PackedMarketData {
        uint128 totalOI;                // Total open interest
        uint64 lastUpdate;              // Last update timestamp
        uint32 volume24h;               // 24h volume
        uint16 fundingRate;             // Funding rate (basis points)
        uint8 volatility;               // Volatility index
        bool isActive;                  // Market status
    }

    // ============ CONSTANTS ============
    
    uint256 private constant BATCH_GAS_OVERHEAD = 21000;
    uint256 private constant OPERATION_BASE_GAS = 5000;
    uint256 private constant STORAGE_WRITE_GAS = 20000;
    uint256 private constant STORAGE_UPDATE_GAS = 5000;
    
    // ============ EVENTS ============
    
    event BatchStarted(uint256 indexed batchId, uint256 timestamp);
    event BatchCompleted(uint256 indexed batchId, uint256 operations, uint256 gasSaved);
    
    // ============ BATCH OPERATIONS ============
    
    /**
     * @notice Start a new batch operation
     * @param self BatchState storage reference
     * @return batchId The new batch ID
     */
    function startBatch(BatchState storage self) internal returns (uint256 batchId) {
        self.batchId++;
        batchId = self.batchId;
        self.gasStart = gasleft();
        self.operationCount = 0;
        
        emit BatchStarted(batchId, block.timestamp);
        return batchId;
    }
    
    /**
     * @notice Finalize batch and calculate gas savings
     * @param self BatchState storage reference
     * @param operations Number of operations executed
     * @param gasUsed Total gas used for the batch
     * @return gasSaved Amount of gas saved compared to individual operations
     */
    function finalizeBatch(
        BatchState storage self,
        uint256 operations,
        uint256 gasUsed
    ) internal returns (uint256 gasSaved) {
        // Calculate theoretical gas cost for individual operations
        uint256 individualGasCost = operations * (BATCH_GAS_OVERHEAD + OPERATION_BASE_GAS);
        
        // Calculate actual savings
        gasSaved = individualGasCost > gasUsed ? individualGasCost - gasUsed : 0;
        
        // Store batch information
        self.batches[self.batchId] = BatchInfo({
            operations: operations,
            gasUsed: gasUsed,
            gasSaved: gasSaved,
            timestamp: block.timestamp
        });
        
        self.totalGasSaved += gasSaved;
        
        emit BatchCompleted(self.batchId, operations, gasSaved);
        return gasSaved;
    }

    // ============ STORAGE OPTIMIZATION ============
    
    /**
     * @notice Pack position data for storage optimization
     * @param size Position size
     * @param entryPrice Entry price
     * @param openTime Open timestamp
     * @param leverage Leverage amount
     * @param marketId Market identifier
     * @param isLong Position direction
     * @return packed Packed position data
     */
    function packPosition(
        uint256 size,
        uint256 entryPrice,
        uint256 openTime,
        uint256 leverage,
        uint8 marketId,
        bool isLong
    ) internal pure returns (PackedPosition memory packed) {
        require(size <= type(uint128).max, "GasOptimizer: Size overflow");
        require(entryPrice <= type(uint64).max, "GasOptimizer: Price overflow");
        require(leverage <= type(uint16).max, "GasOptimizer: Leverage overflow");
        
        packed = PackedPosition({
            size: uint128(size),
            entryPrice: uint64(entryPrice),
            openTime: uint32(openTime),
            leverage: uint16(leverage),
            marketId: marketId,
            isLong: isLong
        });
    }
    
    /**
     * @notice Unpack position data
     * @param packed Packed position data
     * @return size Position size
     * @return entryPrice Entry price
     * @return openTime Open timestamp
     * @return leverage Leverage amount
     * @return marketId Market identifier
     * @return isLong Position direction
     */
    function unpackPosition(PackedPosition memory packed)
        internal
        pure
        returns (
            uint256 size,
            uint256 entryPrice,
            uint256 openTime,
            uint256 leverage,
            uint8 marketId,
            bool isLong
        )
    {
        return (
            uint256(packed.size),
            uint256(packed.entryPrice),
            uint256(packed.openTime),
            uint256(packed.leverage),
            packed.marketId,
            packed.isLong
        );
    }
    
    /**
     * @notice Pack market data for storage optimization
     * @param totalOI Total open interest
     * @param lastUpdate Last update timestamp
     * @param volume24h 24h volume
     * @param fundingRate Funding rate
     * @param volatility Volatility index
     * @param isActive Market status
     * @return packed Packed market data
     */
    function packMarketData(
        uint256 totalOI,
        uint256 lastUpdate,
        uint256 volume24h,
        uint256 fundingRate,
        uint8 volatility,
        bool isActive
    ) internal pure returns (PackedMarketData memory packed) {
        require(totalOI <= type(uint128).max, "GasOptimizer: OI overflow");
        require(lastUpdate <= type(uint64).max, "GasOptimizer: Timestamp overflow");
        require(volume24h <= type(uint32).max, "GasOptimizer: Volume overflow");
        require(fundingRate <= type(uint16).max, "GasOptimizer: Funding rate overflow");
        
        packed = PackedMarketData({
            totalOI: uint128(totalOI),
            lastUpdate: uint64(lastUpdate),
            volume24h: uint32(volume24h),
            fundingRate: uint16(fundingRate),
            volatility: volatility,
            isActive: isActive
        });
    }

    // ============ ASSEMBLY OPTIMIZATIONS ============
    
    /**
     * @notice Efficient array length check using assembly
     * @param arr Dynamic array
     * @return length Array length
     */
    function efficientLength(uint256[] memory arr) internal pure returns (uint256 length) {
        assembly {
            length := mload(arr)
        }
    }
    
    /**
     * @notice Efficient memory copy using assembly
     * @param dest Destination pointer
     * @param src Source pointer
     * @param len Length to copy
     */
    function efficientMemCopy(uint256 dest, uint256 src, uint256 len) internal pure {
        assembly {
            let words := div(add(len, 31), 32)
            let srcPtr := src
            let destPtr := dest
            
            for { let i := 0 } lt(i, words) { i := add(i, 1) } {
                mstore(destPtr, mload(srcPtr))
                srcPtr := add(srcPtr, 32)
                destPtr := add(destPtr, 32)
            }
        }
    }
    
    /**
     * @notice Gas-efficient keccak256 for small data
     * @param a First uint256
     * @param b Second uint256
     * @return hash Keccak256 hash
     */
    function efficientKeccak(uint256 a, uint256 b) internal pure returns (bytes32 hash) {
        assembly {
            mstore(0x00, a)
            mstore(0x20, b)
            hash := keccak256(0x00, 0x40)
        }
    }

    // ============ LOOP OPTIMIZATIONS ============
    
    /**
     * @notice Optimized loop for array processing
     * @param arr Array to process
     * @param processor Function to apply to each element
     */
    function optimizedLoop(
        uint256[] memory arr,
        function(uint256) pure returns (uint256) processor
    ) internal pure returns (uint256[] memory result) {
        uint256 length = arr.length;
        result = new uint256[](length);
        
        // Unroll loop for better gas efficiency
        uint256 i = 0;
        uint256 remainder = length % 4;
        uint256 loopEnd = length - remainder;
        
        // Process 4 elements at a time
        for (; i < loopEnd; i += 4) {
            result[i] = processor(arr[i]);
            result[i + 1] = processor(arr[i + 1]);
            result[i + 2] = processor(arr[i + 2]);
            result[i + 3] = processor(arr[i + 3]);
        }
        
        // Process remaining elements
        for (; i < length; i++) {
            result[i] = processor(arr[i]);
        }
    }

    // ============ CONDITIONAL OPTIMIZATIONS ============
    
    /**
     * @notice Gas-efficient conditional execution
     * @param condition Boolean condition
     * @param trueValue Value to return if true
     * @param falseValue Value to return if false
     * @return result Selected value
     */
    function conditionalSelect(
        bool condition,
        uint256 trueValue,
        uint256 falseValue
    ) internal pure returns (uint256 result) {
        assembly {
            result := add(
                mul(condition, trueValue),
                mul(iszero(condition), falseValue)
            )
        }
    }
    
    /**
     * @notice Branchless maximum calculation
     * @param a First value
     * @param b Second value
     * @return max Maximum value
     */
    function branchlessMax(uint256 a, uint256 b) internal pure returns (uint256 max) {
        assembly {
            max := add(
                mul(gt(a, b), a),
                mul(iszero(gt(a, b)), b)
            )
        }
    }
    
    /**
     * @notice Branchless minimum calculation
     * @param a First value
     * @param b Second value
     * @return min Minimum value
     */
    function branchlessMin(uint256 a, uint256 b) internal pure returns (uint256 min) {
        assembly {
            min := add(
                mul(lt(a, b), a),
                mul(iszero(lt(a, b)), b)
            )
        }
    }

    // ============ BIT MANIPULATION ============
    
    /**
     * @notice Check if number is power of 2
     * @param n Number to check
     * @return isPowerOf2 Whether number is power of 2
     */
    function isPowerOfTwo(uint256 n) internal pure returns (bool isPowerOf2) {
        assembly {
            isPowerOf2 := and(gt(n, 0), iszero(and(n, sub(n, 1))))
        }
    }
    
    /**
     * @notice Count number of set bits
     * @param n Number to count bits for
     * @return count Number of set bits
     */
    function popCount(uint256 n) internal pure returns (uint256 count) {
        assembly {
            for { } gt(n, 0) { } {
                count := add(count, 1)
                n := and(n, sub(n, 1))
            }
        }
    }
    
    /**
     * @notice Find position of least significant bit
     * @param n Number to analyze
     * @return position Position of LSB (0-indexed)
     */
    function findLSB(uint256 n) internal pure returns (uint256 position) {
        require(n > 0, "GasOptimizer: Zero input");
        
        assembly {
            position := 0
            if iszero(and(n, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)) {
                position := add(position, 128)
                n := shr(128, n)
            }
            if iszero(and(n, 0xFFFFFFFFFFFFFFFF)) {
                position := add(position, 64)
                n := shr(64, n)
            }
            if iszero(and(n, 0xFFFFFFFF)) {
                position := add(position, 32)
                n := shr(32, n)
            }
            if iszero(and(n, 0xFFFF)) {
                position := add(position, 16)
                n := shr(16, n)
            }
            if iszero(and(n, 0xFF)) {
                position := add(position, 8)
                n := shr(8, n)
            }
            if iszero(and(n, 0xF)) {
                position := add(position, 4)
                n := shr(4, n)
            }
            if iszero(and(n, 0x3)) {
                position := add(position, 2)
                n := shr(2, n)
            }
            if iszero(and(n, 0x1)) {
                position := add(position, 1)
            }
        }
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get batch information
     * @param self BatchState storage reference
     * @param batchId Batch ID to query
     * @return batchInfo Batch information
     */
    function getBatchInfo(
        BatchState storage self,
        uint256 batchId
    ) internal view returns (BatchInfo memory) {
        return self.batches[batchId];
    }
    
    /**
     * @notice Get total gas saved across all batches
     * @param self BatchState storage reference
     * @return totalSaved Total gas saved
     */
    function getTotalGasSaved(BatchState storage self) internal view returns (uint256) {
        return self.totalGasSaved;
    }
    
    /**
     * @notice Get current batch ID
     * @param self BatchState storage reference
     * @return batchId Current batch ID
     */
    function getCurrentBatchId(BatchState storage self) internal view returns (uint256) {
        return self.batchId;
    }
}