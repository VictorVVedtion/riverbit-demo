// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleUSDCFaucet
 * @dev A simplified test USDC token with public minting for testing
 * @notice This contract is only for testnet use - optimized for easy testing
 */
contract SimpleUSDCFaucet is ERC20, Ownable, ReentrancyGuard {
    
    // ============ Constants ============
    
    uint8 private constant DECIMALS = 6; // USDC has 6 decimals
    uint256 public constant MAX_MINT_AMOUNT = 100000 * 10**DECIMALS; // 100K USDC max per mint
    uint256 public constant SIMPLE_COOLDOWN = 5 minutes; // 5 minute cooldown for easy testing
    
    // ============ State Variables ============
    
    /// @notice Tracks the last mint time for each address
    mapping(address => uint256) public lastMintTime;
    
    /// @notice Total amount minted by the faucet
    uint256 public totalMinted;
    
    /// @notice Whether the faucet is enabled
    bool public faucetEnabled = true;
    
    // ============ Events ============
    
    event FaucetMint(address indexed to, uint256 amount, uint256 timestamp);
    event FaucetToggled(bool enabled);
    
    // ============ Errors ============
    
    error FaucetDisabled();
    error CooldownActive(uint256 remainingTime);
    error InvalidMintAmount(uint256 amount, uint256 maxAmount);
    error ZeroAddress();
    error ZeroAmount();
    
    // ============ Constructor ============
    
    constructor() ERC20("Simple Test USDC", "USDC") Ownable(msg.sender) {
        // Mint large initial supply to deployer
        _mint(msg.sender, 1000000000 * 10**DECIMALS); // 1B USDC initial supply
    }
    
    // ============ Public Functions ============
    
    /**
     * @notice Mint test USDC tokens to the caller - SIMPLIFIED VERSION
     * @param amount The amount of USDC to mint (in wei, 6 decimals)
     */
    function faucetMint(uint256 amount) external nonReentrant {
        if (!faucetEnabled) revert FaucetDisabled();
        if (amount == 0) revert ZeroAmount();
        if (amount > MAX_MINT_AMOUNT) revert InvalidMintAmount(amount, MAX_MINT_AMOUNT);
        
        address recipient = msg.sender;
        if (recipient == address(0)) revert ZeroAddress();
        
        // Simple cooldown check - only 5 minutes for testing
        uint256 timeSinceLastMint = block.timestamp - lastMintTime[recipient];
        if (timeSinceLastMint < SIMPLE_COOLDOWN) {
            revert CooldownActive(SIMPLE_COOLDOWN - timeSinceLastMint);
        }
        
        // Update state
        lastMintTime[recipient] = block.timestamp;
        totalMinted += amount;
        
        // Mint tokens
        _mint(recipient, amount);
        
        emit FaucetMint(recipient, amount, block.timestamp);
    }
    
    /**
     * @notice Public mint without restrictions for emergency testing
     * @param amount The amount to mint
     */
    function emergencyMint(uint256 amount) external {
        require(amount <= 50000 * 10**DECIMALS, "Max 50K per emergency mint");
        _mint(msg.sender, amount);
        totalMinted += amount;
        emit FaucetMint(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @notice Admin mint to any address
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
    
    // ============ View Functions ============
    
    /**
     * @notice Get the number of decimals for the token
     * @return The number of decimals (6 for USDC)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @notice Check the remaining cooldown time for a user
     * @param user The user address to check
     * @return The remaining cooldown time in seconds
     */
    function getRemainingCooldown(address user) external view returns (uint256) {
        uint256 timeSinceLastMint = block.timestamp - lastMintTime[user];
        return timeSinceLastMint >= SIMPLE_COOLDOWN ? 0 : SIMPLE_COOLDOWN - timeSinceLastMint;
    }
    
    /**
     * @notice Get remaining daily limit (simplified - returns max amount)
     * @param user The user address to check  
     * @return The remaining mint amount
     */
    function getRemainingDailyLimit(address user) external pure returns (uint256) {
        user; // Silence unused parameter warning
        return MAX_MINT_AMOUNT; // Simplified - always return max
    }
    
    /**
     * @notice Check if a user can mint a specific amount
     * @param user The user address to check
     * @param amount The amount to check
     * @return canMintResult Whether the user can mint
     * @return reason The reason if they can't mint
     */
    function canMint(address user, uint256 amount) external view returns (bool canMintResult, string memory reason) {
        if (!faucetEnabled) return (false, "Faucet disabled");
        if (amount == 0) return (false, "Zero amount");
        if (amount > MAX_MINT_AMOUNT) return (false, "Amount exceeds max");
        
        uint256 timeSinceLastMint = block.timestamp - lastMintTime[user];
        if (timeSinceLastMint < SIMPLE_COOLDOWN) {
            return (false, "Cooldown active");
        }
        
        return (true, "");
    }
    
    /**
     * @notice Get faucet statistics
     * @return enabled Whether faucet is enabled
     * @return minted Total amount minted
     * @return maxMint Max mint per transaction
     * @return dailyLimit Daily limit per address (simplified to max amount)
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
            MAX_MINT_AMOUNT, // Simplified daily limit
            SIMPLE_COOLDOWN
        );
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
        
        this.faucetMint(amount);
    }
}