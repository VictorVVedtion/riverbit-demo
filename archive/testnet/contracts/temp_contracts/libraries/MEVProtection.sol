// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title MEVProtection
 * @notice Library implementing MEV protection mechanisms for DeFi protocols
 * @dev Provides commit-reveal schemes, time-based protection, and anti-sandwich attack measures
 */
library MEVProtection {
    
    // ============ STRUCTS ============
    
    struct CommitRevealState {
        mapping(address => Commitment) userCommitments;
        mapping(bytes32 => bool) usedCommitments;
        uint256 commitDelay;                    // Minimum delay between commit and reveal
        uint256 revealWindow;                   // Window to reveal after delay
        uint256 maxCommitAge;                   // Maximum age of commitment
    }
    
    struct Commitment {
        bytes32 commitHash;                     // Hash of commitment
        uint256 commitTime;                     // When commitment was made
        uint256 revealTime;                     // When commitment was revealed
        bool isRevealed;                        // Whether commitment was revealed
        uint256 nonce;                          // Random nonce for uniqueness
    }
    
    struct TradeProtection {
        uint256 minBlockDelay;                  // Minimum blocks between trades
        uint256 maxSlippage;                    // Maximum allowed slippage
        uint256 priceValidityWindow;            // Price validity window
        mapping(address => uint256) lastTradeBlock;
        mapping(address => uint256) consecutiveTrades;
    }
    
    struct FlashLoanProtection {
        mapping(address => bool) activeFlashLoans;
        mapping(bytes32 => uint256) flashLoanTimestamps;
        uint256 flashLoanCooldown;              // Cooldown after flash loan
        bool flashLoansEnabled;                 // Global flash loan toggle
    }

    // ============ EVENTS ============
    
    event CommitmentMade(address indexed user, bytes32 indexed commitHash, uint256 timestamp);
    event CommitmentRevealed(address indexed user, bytes32 indexed commitHash, uint256 timestamp);
    event MEVAttemptDetected(address indexed user, uint256 blockNumber, string reason);
    event FlashLoanDetected(address indexed user, uint256 timestamp);
    event TradeBlocked(address indexed user, string reason, uint256 timestamp);

    // ============ ERRORS ============
    
    error CommitmentTooEarly();
    error CommitmentTooLate();
    error CommitmentExpired();
    error CommitmentAlreadyUsed();
    error InvalidReveal();
    error FlashLoanActive();
    error TradeFrequencyExceeded();
    error SlippageExceeded();
    error PriceStale();
    
    // ============ CONSTANTS ============
    
    uint256 private constant DEFAULT_COMMIT_DELAY = 12; // 12 seconds (1 block)
    uint256 private constant DEFAULT_REVEAL_WINDOW = 300; // 5 minutes
    uint256 private constant DEFAULT_MAX_COMMIT_AGE = 3600; // 1 hour
    uint256 private constant DEFAULT_FLASH_LOAN_COOLDOWN = 60; // 1 minute
    uint256 private constant MAX_CONSECUTIVE_TRADES = 5;
    
    // ============ INITIALIZATION ============
    
    /**
     * @notice Initialize commit-reveal state
     * @param self CommitRevealState storage reference
     * @param commitDelay Minimum delay between commit and reveal
     */
    function initialize(
        CommitRevealState storage self,
        uint256 commitDelay
    ) internal {
        self.commitDelay = commitDelay > 0 ? commitDelay : DEFAULT_COMMIT_DELAY;
        self.revealWindow = DEFAULT_REVEAL_WINDOW;
        self.maxCommitAge = DEFAULT_MAX_COMMIT_AGE;
    }
    
    /**
     * @notice Initialize trade protection
     * @param self TradeProtection storage reference
     * @param minBlockDelay Minimum blocks between trades
     * @param maxSlippage Maximum allowed slippage (basis points)
     */
    function initializeTradeProtection(
        TradeProtection storage self,
        uint256 minBlockDelay,
        uint256 maxSlippage
    ) internal {
        self.minBlockDelay = minBlockDelay;
        self.maxSlippage = maxSlippage;
        self.priceValidityWindow = 300; // 5 minutes
    }
    
    /**
     * @notice Initialize flash loan protection
     * @param self FlashLoanProtection storage reference
     */
    function initializeFlashLoanProtection(
        FlashLoanProtection storage self
    ) internal {
        self.flashLoanCooldown = DEFAULT_FLASH_LOAN_COOLDOWN;
        self.flashLoansEnabled = true;
    }

    // ============ COMMIT-REVEAL FUNCTIONS ============
    
    /**
     * @notice Make a commitment for future trade
     * @param self CommitRevealState storage reference
     * @param user User making the commitment
     * @param commitHash Hash of the commitment
     */
    function commit(
        CommitRevealState storage self,
        address user,
        bytes32 commitHash
    ) internal {
        require(commitHash != bytes32(0), "Invalid commit hash");
        require(!self.usedCommitments[commitHash], "Commitment already used");
        
        // Check if user has existing unrevealed commitment
        Commitment storage existingCommit = self.userCommitments[user];
        if (existingCommit.commitTime > 0 && !existingCommit.isRevealed) {
            require(
                block.timestamp > existingCommit.commitTime + self.maxCommitAge,
                "Previous commitment still active"
            );
        }
        
        // Store new commitment
        self.userCommitments[user] = Commitment({
            commitHash: commitHash,
            commitTime: block.timestamp,
            revealTime: 0,
            isRevealed: false,
            nonce: 0
        });
        
        emit CommitmentMade(user, commitHash, block.timestamp);
    }
    
    /**
     * @notice Reveal a previously made commitment
     * @param self CommitRevealState storage reference
     * @param user User revealing the commitment
     * @param revealHash Hash to verify against commitment
     * @return success Whether reveal was successful
     */
    function reveal(
        CommitRevealState storage self,
        address user,
        bytes32 revealHash
    ) internal returns (bool success) {
        Commitment storage commitment = self.userCommitments[user];
        
        // Validate commitment exists
        require(commitment.commitTime > 0, "No commitment found");
        require(!commitment.isRevealed, "Already revealed");
        require(commitment.commitHash == revealHash, "Invalid reveal");
        
        // Check timing constraints
        uint256 timeSinceCommit = block.timestamp - commitment.commitTime;
        if (timeSinceCommit < self.commitDelay) revert CommitmentTooEarly();
        if (timeSinceCommit > self.commitDelay + self.revealWindow) revert CommitmentTooLate();
        if (timeSinceCommit > self.maxCommitAge) revert CommitmentExpired();
        
        // Mark as revealed
        commitment.isRevealed = true;
        commitment.revealTime = block.timestamp;
        self.usedCommitments[revealHash] = true;
        
        emit CommitmentRevealed(user, revealHash, block.timestamp);
        return true;
    }
    
    /**
     * @notice Check if user has valid reveal
     * @param self CommitRevealState storage reference
     * @param user User to check
     * @return isValid Whether user has valid reveal
     */
    function isValidReveal(
        CommitRevealState storage self,
        address user
    ) internal view returns (bool isValid) {
        Commitment storage commitment = self.userCommitments[user];
        
        if (!commitment.isRevealed || commitment.revealTime == 0) {
            return false;
        }
        
        // Check if reveal is still valid (within window)
        return block.timestamp <= commitment.revealTime + self.revealWindow;
    }

    // ============ TRADE PROTECTION FUNCTIONS ============
    
    /**
     * @notice Check if trade is allowed based on frequency limits
     * @param self TradeProtection storage reference
     * @param user User attempting to trade
     * @return allowed Whether trade is allowed
     */
    function checkTradeFrequency(
        TradeProtection storage self,
        address user
    ) internal returns (bool allowed) {
        uint256 lastBlock = self.lastTradeBlock[user];
        uint256 currentBlock = block.number;
        
        // Check minimum block delay
        if (lastBlock > 0 && currentBlock - lastBlock < self.minBlockDelay) {
            emit TradeBlocked(user, "Minimum block delay not met", block.timestamp);
            return false;
        }
        
        // Check consecutive trades
        if (lastBlock > 0 && currentBlock == lastBlock) {
            self.consecutiveTrades[user]++;
            if (self.consecutiveTrades[user] > MAX_CONSECUTIVE_TRADES) {
                emit TradeBlocked(user, "Too many consecutive trades", block.timestamp);
                return false;
            }
        } else {
            self.consecutiveTrades[user] = 1;
        }
        
        // Update last trade block
        self.lastTradeBlock[user] = currentBlock;
        return true;
    }
    
    /**
     * @notice Validate slippage protection
     * @param self TradeProtection storage reference
     * @param expectedPrice Expected price
     * @param actualPrice Actual execution price
     * @param isLong Whether position is long
     * @return valid Whether slippage is within limits
     */
    function validateSlippage(
        TradeProtection storage self,
        uint256 expectedPrice,
        uint256 actualPrice,
        bool isLong
    ) internal view returns (bool valid) {
        if (expectedPrice == 0 || actualPrice == 0) return false;
        
        uint256 slippage;
        if (isLong) {
            // For longs, slippage occurs when actual > expected
            if (actualPrice > expectedPrice) {
                slippage = ((actualPrice - expectedPrice) * 10000) / expectedPrice;
            }
        } else {
            // For shorts, slippage occurs when actual < expected
            if (expectedPrice > actualPrice) {
                slippage = ((expectedPrice - actualPrice) * 10000) / expectedPrice;
            }
        }
        
        return slippage <= self.maxSlippage;
    }
    
    /**
     * @notice Check price validity window
     * @param self TradeProtection storage reference
     * @param priceTimestamp Timestamp of price update
     * @return valid Whether price is within validity window
     */
    function isPriceValid(
        TradeProtection storage self,
        uint256 priceTimestamp
    ) internal view returns (bool valid) {
        return block.timestamp <= priceTimestamp + self.priceValidityWindow;
    }

    // ============ FLASH LOAN PROTECTION ============
    
    /**
     * @notice Mark flash loan as active for user
     * @param self FlashLoanProtection storage reference
     * @param user User taking flash loan
     */
    function markFlashLoanActive(
        FlashLoanProtection storage self,
        address user
    ) internal {
        require(self.flashLoansEnabled, "Flash loans disabled");
        
        self.activeFlashLoans[user] = true;
        bytes32 loanKey = keccak256(abi.encodePacked(user, block.timestamp));
        self.flashLoanTimestamps[loanKey] = block.timestamp;
        
        emit FlashLoanDetected(user, block.timestamp);
    }
    
    /**
     * @notice Mark flash loan as completed for user
     * @param self FlashLoanProtection storage reference
     * @param user User completing flash loan
     */
    function markFlashLoanComplete(
        FlashLoanProtection storage self,
        address user
    ) internal {
        self.activeFlashLoans[user] = false;
    }
    
    /**
     * @notice Check if user has active flash loan
     * @param self FlashLoanProtection storage reference
     * @param user User to check
     * @return hasActiveFlashLoan Whether user has active flash loan
     */
    function hasActiveFlashLoan(
        FlashLoanProtection storage self,
        address user
    ) internal view returns (bool) {
        return self.activeFlashLoans[user];
    }
    
    /**
     * @notice Check if user is in flash loan cooldown
     * @param self FlashLoanProtection storage reference
     * @param user User to check
     * @return inCooldown Whether user is in cooldown
     */
    function isInFlashLoanCooldown(
        FlashLoanProtection storage self,
        address user
    ) internal view returns (bool inCooldown) {
        bytes32 loanKey = keccak256(abi.encodePacked(user, block.timestamp));
        uint256 lastLoanTime = self.flashLoanTimestamps[loanKey];
        
        if (lastLoanTime == 0) return false;
        
        return block.timestamp < lastLoanTime + self.flashLoanCooldown;
    }

    // ============ ANTI-SANDWICH PROTECTION ============
    
    /**
     * @notice Detect potential sandwich attack patterns
     * @param userTx Current user transaction
     * @param blockTxs Transactions in current block
     * @return isSandwich Whether sandwich attack is detected
     */
    function detectSandwichAttack(
        bytes memory userTx,
        bytes[] memory blockTxs
    ) internal pure returns (bool isSandwich) {
        if (blockTxs.length < 3) return false;
        
        // Check for sandwich pattern: large buy -> user tx -> large sell
        // This is a simplified detection mechanism
        for (uint256 i = 1; i < blockTxs.length - 1; i++) {
            if (keccak256(blockTxs[i]) == keccak256(userTx)) {
                // Found user transaction, check surrounding transactions
                bytes memory prevTx = blockTxs[i - 1];
                bytes memory nextTx = blockTxs[i + 1];
                
                // Simple heuristic: check if prev and next transactions are large
                if (_isLargeTransaction(prevTx) && _isLargeTransaction(nextTx)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * @notice Generate secure commitment hash
     * @param user User address
     * @param nonce Random nonce
     * @param data Transaction data
     * @return commitHash Secure commitment hash
     */
    function generateCommitmentHash(
        address user,
        uint256 nonce,
        bytes memory data
    ) internal view returns (bytes32 commitHash) {
        return keccak256(abi.encodePacked(
            user,
            nonce,
            block.timestamp,
            block.difficulty,
            data
        ));
    }
    
    /**
     * @notice Calculate time-weighted average price impact
     * @param prices Array of recent prices
     * @param volumes Array of corresponding volumes
     * @param timeWeights Array of time weights
     * @return twap Time-weighted average price
     */
    function calculateTWAP(
        uint256[] memory prices,
        uint256[] memory volumes,
        uint256[] memory timeWeights
    ) internal pure returns (uint256 twap) {
        require(
            prices.length == volumes.length && 
            volumes.length == timeWeights.length,
            "Array length mismatch"
        );
        
        uint256 totalWeightedPrice = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < prices.length; i++) {
            uint256 weight = volumes[i] * timeWeights[i];
            totalWeightedPrice += prices[i] * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? totalWeightedPrice / totalWeight : 0;
    }

    // ============ INTERNAL HELPERS ============
    
    /**
     * @notice Check if transaction is considered large
     * @param txData Transaction data
     * @return isLarge Whether transaction is large
     */
    function _isLargeTransaction(bytes memory txData) private pure returns (bool isLarge) {
        // Simplified check based on transaction data length
        // In practice, this would analyze the actual transaction content
        return txData.length > 1000;
    }
    
    /**
     * @notice Generate random nonce
     * @param user User address
     * @param timestamp Current timestamp
     * @return nonce Random nonce
     */
    function _generateNonce(
        address user,
        uint256 timestamp
    ) private view returns (uint256 nonce) {
        return uint256(keccak256(abi.encodePacked(
            user,
            timestamp,
            block.difficulty,
            block.coinbase,
            gasleft()
        )));
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get user's current commitment
     * @param self CommitRevealState storage reference
     * @param user User address
     * @return commitment User's commitment data
     */
    function getUserCommitment(
        CommitRevealState storage self,
        address user
    ) internal view returns (Commitment memory) {
        return self.userCommitments[user];
    }
    
    /**
     * @notice Get trade protection parameters
     * @param self TradeProtection storage reference
     * @return minBlockDelay Minimum block delay
     * @return maxSlippage Maximum slippage
     * @return priceValidityWindow Price validity window
     */
    function getTradeProtectionParams(
        TradeProtection storage self
    ) internal view returns (
        uint256 minBlockDelay,
        uint256 maxSlippage,
        uint256 priceValidityWindow
    ) {
        return (
            self.minBlockDelay,
            self.maxSlippage,
            self.priceValidityWindow
        );
    }
    
    /**
     * @notice Check if commitment hash was used
     * @param self CommitRevealState storage reference
     * @param commitHash Commitment hash to check
     * @return used Whether commitment was used
     */
    function isCommitmentUsed(
        CommitRevealState storage self,
        bytes32 commitHash
    ) internal view returns (bool) {
        return self.usedCommitments[commitHash];
    }
}