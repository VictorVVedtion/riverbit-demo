// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UnlimitedUSDCFaucet
 * @dev A completely unrestricted test USDC token for testing purposes
 * @notice This contract has NO LIMITS - anyone can mint any amount anytime
 * @notice TESTNET ONLY - Never deploy on mainnet
 */
contract UnlimitedUSDCFaucet is ERC20, Ownable {
    
    // ============ Constants ============
    
    uint8 private constant DECIMALS = 6; // USDC has 6 decimals
    
    // ============ State Variables ============
    
    /// @notice Total amount minted by the faucet (for statistics only)
    uint256 public totalMinted;
    
    // ============ Events ============
    
    event FaucetMint(address indexed to, uint256 amount, uint256 timestamp);
    
    // ============ Constructor ============
    
    constructor() ERC20("Unlimited Test USDC", "USDC") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 100000000 * 10**DECIMALS); // 100M USDC initial supply
    }
    
    // ============ Public Functions ============
    
    /**
     * @notice Mint unlimited test USDC tokens to the caller
     * @param amount The amount of USDC to mint (in wei, 6 decimals)
     * @dev NO RESTRICTIONS - mint any amount anytime
     */
    function faucetMint(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        address recipient = msg.sender;
        
        // Update statistics
        totalMinted += amount;
        
        // Mint tokens - NO LIMITS!
        _mint(recipient, amount);
        
        emit FaucetMint(recipient, amount, block.timestamp);
    }
    
    /**
     * @notice Mint test USDC tokens to a specific address
     * @param to The address to mint tokens to
     * @param amount The amount of USDC to mint
     * @dev Anyone can mint to any address - NO RESTRICTIONS
     */
    function mintTo(address to, uint256 amount) external {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalMinted += amount;
        _mint(to, amount);
        
        emit FaucetMint(to, amount, block.timestamp);
    }
    
    /**
     * @notice Batch mint to multiple addresses
     * @param recipients Array of addresses to mint to
     * @param amounts Array of amounts to mint
     * @dev Anyone can call this - NO RESTRICTIONS
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] != address(0) && amounts[i] > 0) {
                totalMinted += amounts[i];
                _mint(recipients[i], amounts[i]);
                emit FaucetMint(recipients[i], amounts[i], block.timestamp);
            }
        }
    }
    
    // ============ Convenience Functions ============
    
    /**
     * @notice Quick mint common amounts
     * @param preset The preset amount (0=1K, 1=10K, 2=100K, 3=1M, 4=10M)
     */
    function mintPreset(uint8 preset) external {
        uint256 amount;
        if (preset == 0) amount = 1000 * 10**DECIMALS;          // 1K USDC
        else if (preset == 1) amount = 10000 * 10**DECIMALS;    // 10K USDC  
        else if (preset == 2) amount = 100000 * 10**DECIMALS;   // 100K USDC
        else if (preset == 3) amount = 1000000 * 10**DECIMALS;  // 1M USDC
        else if (preset == 4) amount = 10000000 * 10**DECIMALS; // 10M USDC
        else revert("Invalid preset");
        
        this.faucetMint(amount);
    }
    
    /**
     * @notice Mint 1 million USDC (common test amount)
     */
    function mintMillion() external {
        this.faucetMint(1000000 * 10**DECIMALS);
    }
    
    /**
     * @notice Mint 10 million USDC (large test amount)
     */
    function mintTenMillion() external {
        this.faucetMint(10000000 * 10**DECIMALS);
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
     * @notice Always returns true - no restrictions
     * @param user The user address (ignored)
     * @param amount The amount (ignored) 
     * @return canMintResult Always true
     * @return reason Always empty string
     */
    function canMint(address user, uint256 amount) external pure returns (bool canMintResult, string memory reason) {
        // Silence unused variable warnings
        user;
        amount;
        return (true, "No restrictions - mint freely!");
    }
    
    /**
     * @notice Get faucet statistics
     * @return minted Total amount minted
     * @return supply Current total supply
     */
    function getFaucetStats() external view returns (uint256 minted, uint256 supply) {
        return (totalMinted, totalSupply());
    }
    
    // ============ Admin Functions (Optional) ============
    
    /**
     * @notice Admin mint function (same as public mint, just for consistency)
     * @param to The address to mint tokens to
     * @param amount The amount of USDC to mint
     */
    function adminMint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalMinted += amount;
        _mint(to, amount);
        
        emit FaucetMint(to, amount, block.timestamp);
    }
    
    /**
     * @notice Emergency withdraw ETH (if any accidentally sent)
     */
    function emergencyWithdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}