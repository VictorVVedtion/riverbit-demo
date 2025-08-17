// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title UnlimitedUSDCFaucet
 * @dev A completely unlimited test USDC token for testnet use
 * @notice This contract has NO RESTRICTIONS - anyone can mint any amount at any time
 * @notice WARNING: This is for TESTNET ONLY and should NEVER be deployed on mainnet
 */
contract UnlimitedUSDCFaucet is ERC20, Ownable, ReentrancyGuard {
    
    // ============ Constants ============
    
    uint8 private constant DECIMALS = 6; // USDC has 6 decimals
    
    // ============ State Variables ============
    
    /// @notice Total amount minted by the faucet (for statistics only)
    uint256 public totalMinted;
    
    /// @notice Whether the faucet is enabled (default: true)
    bool public faucetEnabled = true;
    
    // ============ Events ============
    
    event FaucetMint(address indexed to, uint256 amount, uint256 timestamp);
    event FaucetToggled(bool enabled);
    
    // ============ Errors ============
    
    error FaucetDisabled();
    error ZeroAddress();
    error ZeroAmount();
    
    // ============ Constructor ============
    
    constructor() ERC20("Unlimited Test USDC", "USDC") {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000000 * 10**DECIMALS); // 1B USDC initial supply
    }
    
    // ============ Public Functions ============
    
    /**
     * @notice Mint unlimited test USDC tokens to the caller
     * @param amount The amount of USDC to mint (in wei, 6 decimals)
     * @dev NO RESTRICTIONS - any amount, any time, anyone can call
     */
    function faucetMint(uint256 amount) external nonReentrant {
        if (!faucetEnabled) revert FaucetDisabled();
        if (amount == 0) revert ZeroAmount();
        
        address recipient = msg.sender;
        if (recipient == address(0)) revert ZeroAddress();
        
        // Update statistics
        totalMinted += amount;
        
        // Mint tokens - NO LIMITS!
        _mint(recipient, amount);
        
        emit FaucetMint(recipient, amount, block.timestamp);
    }
    
    /**
     * @notice Mint unlimited test USDC tokens to any address
     * @param to The address to mint tokens to
     * @param amount The amount of USDC to mint
     * @dev NO RESTRICTIONS - anyone can mint to anyone
     */
    function mintTo(address to, uint256 amount) external nonReentrant {
        if (!faucetEnabled) revert FaucetDisabled();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        // Update statistics
        totalMinted += amount;
        
        // Mint tokens - NO LIMITS!
        _mint(to, amount);
        
        emit FaucetMint(to, amount, block.timestamp);
    }
    
    /**
     * @notice Batch mint to multiple addresses
     * @param recipients Array of addresses to mint to
     * @param amounts Array of amounts to mint
     * @dev NO RESTRICTIONS - anyone can call
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external nonReentrant {
        if (!faucetEnabled) revert FaucetDisabled();
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
     * @notice Check if minting is available
     * @param amount The amount to check (ignored - always returns true if enabled)
     * @return canMint Always true if faucet is enabled
     * @return reason Empty string if can mint, reason if cannot
     */
    function canMint(address, uint256 amount) external view returns (bool canMint, string memory reason) {
        if (!faucetEnabled) return (false, "Faucet disabled");
        if (amount == 0) return (false, "Zero amount");
        
        return (true, "");
    }
    
    /**
     * @notice Get faucet statistics
     * @return enabled Whether faucet is enabled
     * @return minted Total amount minted
     */
    function getFaucetStats() external view returns (
        bool enabled,
        uint256 minted
    ) {
        return (
            faucetEnabled,
            totalMinted
        );
    }
    
    // ============ Convenience Functions ============
    
    /**
     * @notice Convenient function to mint standard amounts
     * @param preset The preset amount (0=1K, 1=10K, 2=100K, 3=1M, 4=10M)
     */
    function mintPreset(uint8 preset) external {
        uint256 amount;
        if (preset == 0) amount = 1000 * 10**DECIMALS;        // 1K
        else if (preset == 1) amount = 10000 * 10**DECIMALS;   // 10K
        else if (preset == 2) amount = 100000 * 10**DECIMALS;  // 100K
        else if (preset == 3) amount = 1000000 * 10**DECIMALS; // 1M
        else if (preset == 4) amount = 10000000 * 10**DECIMALS; // 10M
        else revert("Invalid preset");
        
        faucetMint(amount);
    }
    
    /**
     * @notice Mint 1 million USDC instantly (for quick testing)
     */
    function mintMillion() external {
        faucetMint(1000000 * 10**DECIMALS);
    }
    
    /**
     * @notice Mint 10 million USDC instantly (for large testing)
     */
    function mintTenMillion() external {
        faucetMint(10000000 * 10**DECIMALS);
    }
    
    // ============ Admin Functions (minimal) ============
    
    /**
     * @notice Toggle the faucet on/off (emergency only)
     * @param enabled Whether the faucet should be enabled
     */
    function setFaucetEnabled(bool enabled) external onlyOwner {
        faucetEnabled = enabled;
        emit FaucetToggled(enabled);
    }
    
    /**
     * @notice Emergency withdraw ETH (if any)
     */
    function emergencyWithdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}