// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BenSpreadVault
 * @notice Staking vault for Ben-Spread prediction market strategy
 * 
 * Users deposit USDC and receive vault shares representing their portion of the pool.
 * The vault manager (backend) uses deposited funds to execute convergence and arbitrage strategies.
 * Profits are reflected in the increasing value of vault shares.
 */
contract BenSpreadVault is ERC20, Ownable, ReentrancyGuard {
    IERC20 public immutable asset; // USDC token
    address public manager; // Strategy executor address
    
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    uint256 public totalProfit;
    
    // Fee configuration (in basis points, 100 = 1%)
    uint256 public performanceFee = 2000; // 20% performance fee
    uint256 public constant MAX_PERFORMANCE_FEE = 3000; // 30% max
    
    uint256 public lastReportedValue;
    uint256 public lastReportTime;
    
    // Events
    event Deposited(address indexed user, uint256 assets, uint256 shares);
    event Withdrawn(address indexed user, uint256 assets, uint256 shares);
    event ManagerUpdated(address indexed oldManager, address indexed newManager);
    event PerformanceFeeUpdated(uint256 oldFee, uint256 newFee);
    event ProfitReported(uint256 profit, uint256 fee);
    
    constructor(
        address _asset,
        address _initialOwner,
        address _manager
    ) ERC20("Ben-Spread Vault Share", "bsUSDC") Ownable(_initialOwner) {
        require(_asset != address(0), "Invalid asset");
        require(_manager != address(0), "Invalid manager");
        
        asset = IERC20(_asset);
        manager = _manager;
        lastReportTime = block.timestamp;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // USER FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Deposit USDC and receive vault shares
     * @param assets Amount of USDC to deposit
     * @return shares Number of shares minted
     */
    function deposit(uint256 assets) external nonReentrant returns (uint256 shares) {
        require(assets > 0, "Cannot deposit 0");
        
        // Calculate shares to mint
        shares = previewDeposit(assets);
        require(shares > 0, "Invalid share amount");
        
        // Transfer USDC from user
        require(asset.transferFrom(msg.sender, address(this), assets), "Transfer failed");
        
        // Mint shares
        _mint(msg.sender, shares);
        
        totalDeposited += assets;
        
        emit Deposited(msg.sender, assets, shares);
    }
    
    /**
     * @notice Withdraw USDC by burning vault shares
     * @param shares Number of shares to burn
     * @return assets Amount of USDC withdrawn
     */
    function withdraw(uint256 shares) external nonReentrant returns (uint256 assets) {
        require(shares > 0, "Cannot withdraw 0");
        require(balanceOf(msg.sender) >= shares, "Insufficient balance");
        
        // Calculate assets to return
        assets = previewWithdraw(shares);
        require(assets > 0, "Invalid asset amount");
        require(assets <= asset.balanceOf(address(this)), "Insufficient liquidity");
        
        // Burn shares
        _burn(msg.sender, shares);
        
        // Transfer USDC to user
        require(asset.transfer(msg.sender, assets), "Transfer failed");
        
        totalWithdrawn += assets;
        
        emit Withdrawn(msg.sender, assets, shares);
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Total assets under management (includes deployed + idle)
     */
    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this)) + lastReportedValue;
    }
    
    /**
     * @notice Preview how many shares would be minted for an asset deposit
     */
    function previewDeposit(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? assets : (assets * supply) / totalAssets();
    }
    
    /**
     * @notice Preview how many assets would be returned for burning shares
     */
    function previewWithdraw(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? 0 : (shares * totalAssets()) / supply;
    }
    
    /**
     * @notice Current share price (assets per share)
     */
    function sharePrice() external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 1e18; // 1:1 initially
        return (totalAssets() * 1e18) / supply;
    }
    
    /**
     * @notice Get user's position details
     */
    function getUserPosition(address user) external view returns (
        uint256 shares,
        uint256 assets,
        uint256 shareOfPool
    ) {
        shares = balanceOf(user);
        assets = previewWithdraw(shares);
        uint256 supply = totalSupply();
        shareOfPool = supply > 0 ? (shares * 10000) / supply : 0; // basis points
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // MANAGER FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Manager withdraws funds for strategy execution
     * @param amount Amount of USDC to withdraw
     */
    function managerWithdraw(uint256 amount) external onlyManager {
        require(amount <= asset.balanceOf(address(this)), "Insufficient idle funds");
        require(asset.transfer(manager, amount), "Transfer failed");
        lastReportedValue += amount;
    }
    
    /**
     * @notice Manager returns funds after strategy execution
     * @param amount Amount of USDC to return
     * @param profit Profit generated (if any)
     */
    function managerDeposit(uint256 amount, uint256 profit) external onlyManager {
        require(asset.transferFrom(manager, address(this), amount), "Transfer failed");
        
        lastReportedValue = lastReportedValue > amount ? lastReportedValue - amount : 0;
        
        if (profit > 0) {
            totalProfit += profit;
            
            // Charge performance fee
            uint256 fee = (profit * performanceFee) / 10000;
            if (fee > 0) {
                require(asset.transferFrom(manager, owner(), fee), "Fee transfer failed");
            }
            
            emit ProfitReported(profit, fee);
        }
        
        lastReportTime = block.timestamp;
    }
    
    /**
     * @notice Report current value of deployed funds (without depositing)
     * @param currentValue Current value of funds under management
     */
    function reportValue(uint256 currentValue) external onlyManager {
        lastReportedValue = currentValue;
        lastReportTime = block.timestamp;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Update strategy manager address
     */
    function setManager(address _newManager) external onlyOwner {
        require(_newManager != address(0), "Invalid manager");
        address oldManager = manager;
        manager = _newManager;
        emit ManagerUpdated(oldManager, _newManager);
    }
    
    /**
     * @notice Update performance fee
     */
    function setPerformanceFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_PERFORMANCE_FEE, "Fee too high");
        uint256 oldFee = performanceFee;
        performanceFee = _newFee;
        emit PerformanceFeeUpdated(oldFee, _newFee);
    }
    
    /**
     * @notice Emergency withdrawal by owner (only if no user funds)
     */
    function emergencyWithdraw() external onlyOwner {
        require(totalSupply() == 0, "Users still have shares");
        uint256 balance = asset.balanceOf(address(this));
        require(asset.transfer(owner(), balance), "Transfer failed");
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────
    
    modifier onlyManager() {
        require(msg.sender == manager, "Only manager");
        _;
    }
}
