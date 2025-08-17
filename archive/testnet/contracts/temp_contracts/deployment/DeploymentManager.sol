// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../core/RiverBitCoreV2.sol";
import "../core/ModuleRegistry.sol";
import "../core/CrossChainManager.sol";
import "../core/RiskManager.sol";
import "../modules/TradingEngineV2.sol";
import "../modules/QueryEngine.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

/**
 * @title DeploymentManager
 * @notice Manages the deployment and initialization of RiverBit protocol contracts
 * @dev Implements secure deployment patterns with upgrade support
 */
contract DeploymentManager {
    
    // ============ EVENTS ============
    
    event ContractDeployed(string name, address implementation, address proxy);
    event ModuleRegistered(string name, bytes32 moduleId, address moduleAddress);
    event DeploymentCompleted(address coreProxy, uint256 timestamp);

    // ============ STATE VARIABLES ============
    
    ProxyAdmin public proxyAdmin;
    address public deployer;
    
    // Deployed contracts
    address public coreImplementation;
    address public coreProxy;
    address public moduleRegistryImplementation;
    address public moduleRegistryProxy;
    address public crossChainManagerImplementation;
    address public crossChainManagerProxy;
    address public riskManagerImplementation;
    address public riskManagerProxy;
    address public tradingEngineImplementation;
    address public queryEngineImplementation;
    
    // Module IDs
    bytes32 public constant TRADING_ENGINE_ID = keccak256("TRADING_ENGINE_V2");
    bytes32 public constant QUERY_ENGINE_ID = keccak256("QUERY_ENGINE");
    bytes32 public constant RISK_MANAGER_ID = keccak256("RISK_MANAGER");
    bytes32 public constant CROSS_CHAIN_MANAGER_ID = keccak256("CROSS_CHAIN_MANAGER");

    // ============ CONSTRUCTOR ============
    
    constructor() {
        deployer = msg.sender;
    }

    // ============ DEPLOYMENT FUNCTIONS ============
    
    /**
     * @notice Deploy all protocol contracts
     * @param admin Admin address for deployed contracts
     * @return coreAddress Address of deployed core contract
     */
    function deployProtocol(address admin) external returns (address coreAddress) {
        require(msg.sender == deployer, "Only deployer");
        require(admin != address(0), "Invalid admin address");
        
        // Deploy ProxyAdmin
        proxyAdmin = new ProxyAdmin();
        
        // Deploy core contracts with proxies
        _deployCoreContracts(admin);
        
        // Deploy modules
        _deployModules();
        
        // Initialize contracts
        _initializeContracts(admin);
        
        // Register modules
        _registerModules();
        
        emit DeploymentCompleted(coreProxy, block.timestamp);
        return coreProxy;
    }
    
    /**
     * @notice Deploy core contracts
     * @param admin Admin address
     */
    function _deployCoreContracts(address admin) internal {
        // Deploy RiverBitCore
        coreImplementation = address(new RiverBitCoreV2());
        coreProxy = address(new TransparentUpgradeableProxy(
            coreImplementation,
            address(proxyAdmin),
            ""
        ));
        emit ContractDeployed("RiverBitCore", coreImplementation, coreProxy);
        
        // Deploy ModuleRegistry
        moduleRegistryImplementation = address(new ModuleRegistry());
        moduleRegistryProxy = address(new TransparentUpgradeableProxy(
            moduleRegistryImplementation,
            address(proxyAdmin),
            ""
        ));
        emit ContractDeployed("ModuleRegistry", moduleRegistryImplementation, moduleRegistryProxy);
        
        // Deploy CrossChainManager
        crossChainManagerImplementation = address(new CrossChainManager());
        crossChainManagerProxy = address(new TransparentUpgradeableProxy(
            crossChainManagerImplementation,
            address(proxyAdmin),
            ""
        ));
        emit ContractDeployed("CrossChainManager", crossChainManagerImplementation, crossChainManagerProxy);
        
        // Deploy RiskManager
        riskManagerImplementation = address(new RiskManager());
        riskManagerProxy = address(new TransparentUpgradeableProxy(
            riskManagerImplementation,
            address(proxyAdmin),
            ""
        ));
        emit ContractDeployed("RiskManager", riskManagerImplementation, riskManagerProxy);
    }
    
    /**
     * @notice Deploy module contracts
     */
    function _deployModules() internal {
        // Deploy TradingEngine
        tradingEngineImplementation = address(new TradingEngineV2(coreProxy));
        emit ContractDeployed("TradingEngine", tradingEngineImplementation, address(0));
        
        // Deploy QueryEngine
        queryEngineImplementation = address(new QueryEngine(coreProxy));
        emit ContractDeployed("QueryEngine", queryEngineImplementation, address(0));
    }
    
    /**
     * @notice Initialize all contracts
     * @param admin Admin address
     */
    function _initializeContracts(address admin) internal {
        // Initialize RiverBitCore
        RiverBitCoreV2(coreProxy).initialize(
            moduleRegistryProxy,
            admin
        );
        
        // Initialize ModuleRegistry
        ModuleRegistry(moduleRegistryProxy).initialize(
            admin,
            address(0) // No governance contract initially
        );
        
        // Initialize CrossChainManager
        CrossChainManager(crossChainManagerProxy).initialize(
            coreProxy,
            admin
        );
        
        // Initialize RiskManager
        RiskManager(riskManagerProxy).initialize(
            coreProxy,
            admin
        );
    }
    
    /**
     * @notice Register modules with registry
     */
    function _registerModules() internal {
        ModuleRegistry registry = ModuleRegistry(moduleRegistryProxy);
        
        // Register TradingEngine
        registry.registerModule(
            TRADING_ENGINE_ID,
            tradingEngineImplementation,
            IModuleRegistry.ModuleType.TRADING,
            "Trading Engine V2",
            "Advanced trading engine with MEV protection and gas optimization",
            IModuleRegistry.Version({
                versionHash: keccak256("v2.0.0"),
                majorVersion: 2,
                minorVersion: 0,
                patchVersion: 0,
                implementation: tradingEngineImplementation,
                codeHash: _getCodeHash(tradingEngineImplementation),
                releaseNotes: "Initial V2 release with enhanced features",
                releaseTime: block.timestamp,
                isStable: true
            })
        );
        emit ModuleRegistered("TradingEngine", TRADING_ENGINE_ID, tradingEngineImplementation);
        
        // Register QueryEngine
        registry.registerModule(
            QUERY_ENGINE_ID,
            queryEngineImplementation,
            IModuleRegistry.ModuleType.ANALYTICS,
            "Query Engine",
            "High-performance data query and analytics engine",
            IModuleRegistry.Version({
                versionHash: keccak256("v1.0.0"),
                majorVersion: 1,
                minorVersion: 0,
                patchVersion: 0,
                implementation: queryEngineImplementation,
                codeHash: _getCodeHash(queryEngineImplementation),
                releaseNotes: "Initial release",
                releaseTime: block.timestamp,
                isStable: true
            })
        );
        emit ModuleRegistered("QueryEngine", QUERY_ENGINE_ID, queryEngineImplementation);
        
        // Register RiskManager
        registry.registerModule(
            RISK_MANAGER_ID,
            riskManagerProxy,
            IModuleRegistry.ModuleType.RISK,
            "Risk Manager",
            "Comprehensive risk management system",
            IModuleRegistry.Version({
                versionHash: keccak256("v1.0.0"),
                majorVersion: 1,
                minorVersion: 0,
                patchVersion: 0,
                implementation: riskManagerProxy,
                codeHash: _getCodeHash(riskManagerImplementation),
                releaseNotes: "Initial release",
                releaseTime: block.timestamp,
                isStable: true
            })
        );
        emit ModuleRegistered("RiskManager", RISK_MANAGER_ID, riskManagerProxy);
        
        // Register CrossChainManager
        registry.registerModule(
            CROSS_CHAIN_MANAGER_ID,
            crossChainManagerProxy,
            IModuleRegistry.ModuleType.BRIDGE,
            "Cross Chain Manager",
            "Cross-chain asset and message management",
            IModuleRegistry.Version({
                versionHash: keccak256("v1.0.0"),
                majorVersion: 1,
                minorVersion: 0,
                patchVersion: 0,
                implementation: crossChainManagerProxy,
                codeHash: _getCodeHash(crossChainManagerImplementation),
                releaseNotes: "Initial release",
                releaseTime: block.timestamp,
                isStable: true
            })
        );
        emit ModuleRegistered("CrossChainManager", CROSS_CHAIN_MANAGER_ID, crossChainManagerProxy);
    }

    // ============ UPGRADE FUNCTIONS ============
    
    /**
     * @notice Upgrade core contract
     * @param newImplementation New implementation address
     */
    function upgradeCoreContract(address newImplementation) external {
        require(msg.sender == deployer, "Only deployer");
        proxyAdmin.upgrade(
            ITransparentUpgradeableProxy(coreProxy),
            newImplementation
        );
    }
    
    /**
     * @notice Upgrade module registry
     * @param newImplementation New implementation address
     */
    function upgradeModuleRegistry(address newImplementation) external {
        require(msg.sender == deployer, "Only deployer");
        proxyAdmin.upgrade(
            ITransparentUpgradeableProxy(moduleRegistryProxy),
            newImplementation
        );
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get all deployed contract addresses
     * @return addresses Struct containing all contract addresses
     */
    function getDeployedContracts() external view returns (
        DeployedContracts memory addresses
    ) {
        addresses = DeployedContracts({
            coreProxy: coreProxy,
            coreImplementation: coreImplementation,
            moduleRegistryProxy: moduleRegistryProxy,
            moduleRegistryImplementation: moduleRegistryImplementation,
            crossChainManagerProxy: crossChainManagerProxy,
            crossChainManagerImplementation: crossChainManagerImplementation,
            riskManagerProxy: riskManagerProxy,
            riskManagerImplementation: riskManagerImplementation,
            tradingEngineImplementation: tradingEngineImplementation,
            queryEngineImplementation: queryEngineImplementation,
            proxyAdmin: address(proxyAdmin)
        });
    }
    
    /**
     * @notice Get deployment status
     * @return isDeployed Whether protocol is fully deployed
     */
    function getDeploymentStatus() external view returns (bool isDeployed) {
        return coreProxy != address(0) && 
               moduleRegistryProxy != address(0) &&
               tradingEngineImplementation != address(0);
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @notice Get contract code hash
     * @param contractAddress Contract address
     * @return codeHash Hash of contract code
     */
    function _getCodeHash(address contractAddress) internal view returns (bytes32 codeHash) {
        assembly {
            codeHash := extcodehash(contractAddress)
        }
    }

    // ============ STRUCTS ============
    
    struct DeployedContracts {
        address coreProxy;
        address coreImplementation;
        address moduleRegistryProxy;
        address moduleRegistryImplementation;
        address crossChainManagerProxy;
        address crossChainManagerImplementation;
        address riskManagerProxy;
        address riskManagerImplementation;
        address tradingEngineImplementation;
        address queryEngineImplementation;
        address proxyAdmin;
    }
}