// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title USDCFaucet
 * @dev A test USDC token with faucet functionality for testing purposes
 * @notice This contract is only for testnet use and should never be deployed on mainnet
 */
contract USDCFaucet is ERC20, Ownable, ReentrancyGuard, Pausable {
    
    // ============ Constants ============
    
    uint8 private constant DECIMALS = 6; // USDC has 6 decimals
    uint256 public constant MAX_MINT_AMOUNT = 100000 * 10**DECIMALS; // 100K USDC max per mint
    uint256 public constant DAILY_LIMIT = 500000 * 10**DECIMALS; // 500K USDC per day per address
    uint256 public constant COOLDOWN_PERIOD = 1 hours; // 1 hour cooldown between mints
    
    // ============ State Variables ============
    
    /// @notice Tracks the last mint time for each address
    mapping(address => uint256) public lastMintTime;
    
    /// @notice Tracks daily mint amounts for each address
    mapping(address => mapping(uint256 => uint256)) public dailyMintAmounts;
    
    /// @notice Total amount minted by the faucet
    uint256 public totalMinted;
    
    /// @notice Whether the faucet is enabled
    bool public faucetEnabled = true;
    
    // ============ Events ============
    
    event FaucetMint(address indexed to, uint256 amount, uint256 timestamp);
    event FaucetConfigured(uint256 maxMintAmount, uint256 dailyLimit, uint256 cooldownPeriod);
    event FaucetToggled(bool enabled);
    
    // ============ Errors ============
    
    error FaucetDisabled();
    error CooldownActive(uint256 remainingTime);
    error DailyLimitExceeded(uint256 requested, uint256 available);
    error InvalidMintAmount(uint256 amount, uint256 maxAmount);
    error ZeroAddress();
    error ZeroAmount();
    
    // ============ Constructor ============
    
    constructor() ERC20("Test USDC", "USDC") {
        // Mint initial supply to deployer for liquidity
        _mint(msg.sender, 10000000 * 10**DECIMALS); // 10M USDC initial supply
    }
    
    // ============ Public Functions ============
    
    /**
     * @notice Mint test USDC tokens to the caller
     * @param amount The amount of USDC to mint (in wei, 6 decimals)
     */
    function faucetMint(uint256 amount) external nonReentrant whenNotPaused {
        if (!faucetEnabled) revert FaucetDisabled();
        if (amount == 0) revert ZeroAmount();
        if (amount > MAX_MINT_AMOUNT) revert InvalidMintAmount(amount, MAX_MINT_AMOUNT);
        
        address recipient = msg.sender;
        if (recipient == address(0)) revert ZeroAddress();
        
        // Check cooldown
        uint256 timeSinceLastMint = block.timestamp - lastMintTime[recipient];
        if (timeSinceLastMint < COOLDOWN_PERIOD) {
            revert CooldownActive(COOLDOWN_PERIOD - timeSinceLastMint);
        }
        
        // Check daily limit
        uint256 today = block.timestamp / 1 days;
        uint256 dailyMinted = dailyMintAmounts[recipient][today];
        if (dailyMinted + amount > DAILY_LIMIT) {
            revert DailyLimitExceeded(amount, DAILY_LIMIT - dailyMinted);
        }
        
        // Update state
        lastMintTime[recipient] = block.timestamp;
        dailyMintAmounts[recipient][today] += amount;
        totalMinted += amount;
        
        // Mint tokens
        _mint(recipient, amount);
        
        emit FaucetMint(recipient, amount, block.timestamp);
    }
    
    /**
     * @notice Mint test USDC tokens to a specific address (owner only)
     * @param to The address to mint tokens to
     * @param amount The amount of USDC to mint
     */
    function adminMint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        _mint(to, amount);
        totalMinted += amount;
        
        emit FaucetMint(to, amount, block.timestamp);
    }
    
    /**
     * @notice Batch mint to multiple addresses (owner only)
     * @param recipients Array of addresses to mint to
     * @param amounts Array of amounts to mint
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] != address(0) && amounts[i] > 0) {
                _mint(recipients[i], amounts[i]);
                totalMinted += amounts[i];
                emit FaucetMint(recipients[i], amounts[i], block.timestamp);
            }
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get the number of decimals for the token
     * @return The number of decimals (6 for USDC)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @notice Check how much a user can still mint today
     * @param user The user address to check
     * @return The remaining mint amount for today
     */
    function getRemainingDailyLimit(address user) external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        uint256 dailyMinted = dailyMintAmounts[user][today];
        return dailyMinted >= DAILY_LIMIT ? 0 : DAILY_LIMIT - dailyMinted;
    }
    
    /**
     * @notice Check the remaining cooldown time for a user
     * @param user The user address to check
     * @return The remaining cooldown time in seconds
     */
    function getRemainingCooldown(address user) external view returns (uint256) {
        uint256 timeSinceLastMint = block.timestamp - lastMintTime[user];
        return timeSinceLastMint >= COOLDOWN_PERIOD ? 0 : COOLDOWN_PERIOD - timeSinceLastMint;
    }
    
    /**
     * @notice Check if a user can mint a specific amount
     * @param user The user address to check
     * @param amount The amount to check
     * @return canMint Whether the user can mint
     * @return reason The reason if they can't mint
     */
    function canMint(address user, uint256 amount) external view returns (bool canMint, string memory reason) {
        if (!faucetEnabled) return (false, "Faucet disabled");
        if (amount == 0) return (false, "Zero amount");
        if (amount > MAX_MINT_AMOUNT) return (false, "Amount exceeds max");
        
        uint256 timeSinceLastMint = block.timestamp - lastMintTime[user];
        if (timeSinceLastMint < COOLDOWN_PERIOD) {
            return (false, "Cooldown active");
        }
        
        uint256 today = block.timestamp / 1 days;
        uint256 dailyMinted = dailyMintAmounts[user][today];
        if (dailyMinted + amount > DAILY_LIMIT) {
            return (false, "Daily limit exceeded");
        }
        
        return (true, "");
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Toggle the faucet on/off
     * @param enabled Whether the faucet should be enabled
     */
    function setFaucetEnabled(bool enabled) external onlyOwner {
        faucetEnabled = enabled;
        emit FaucetToggled(enabled);
    }
    
    /**
     * @notice Emergency pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency withdraw ETH (if any)
     */
    function emergencyWithdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @notice Emergency withdraw any ERC20 tokens sent to this contract
     * @param token The token address to withdraw
     * @param amount The amount to withdraw
     */
    function emergencyWithdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    // ============ Utility Functions ============
    
    /**
     * @notice Convenient function to mint standard amounts
     * @param preset The preset amount (0=100, 1=500, 2=1000, 3=5000, 4=10000)
     */
    function mintPreset(uint8 preset) external {
        uint256 amount;
        if (preset == 0) amount = 100 * 10**DECIMALS;
        else if (preset == 1) amount = 500 * 10**DECIMALS;
        else if (preset == 2) amount = 1000 * 10**DECIMALS;
        else if (preset == 3) amount = 5000 * 10**DECIMALS;
        else if (preset == 4) amount = 10000 * 10**DECIMALS;
        else revert("Invalid preset");
        
        faucetMint(amount);
    }
    
    /**
     * @notice Get faucet statistics
     * @return enabled Whether faucet is enabled
     * @return minted Total amount minted
     * @return maxMint Max mint per transaction
     * @return dailyLimit Daily limit per address
     * @return cooldown Cooldown period between mints
     */
    function getFaucetStats() external view returns (
        bool enabled,
        uint256 minted,
        uint256 maxMint,
        uint256 dailyLimit,
        uint256 cooldown
    ) {
        return (
            faucetEnabled,
            totalMinted,
            MAX_MINT_AMOUNT,
            DAILY_LIMIT,
            COOLDOWN_PERIOD
        );
    }
}