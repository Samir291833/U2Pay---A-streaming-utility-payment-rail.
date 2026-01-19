// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title AccessControl_Contract
 * @dev Manages access control, permissions, and user roles
 */

contract AccessControl_Contract {
    
    // Events
    event RoleGranted(bytes32 indexed role, address indexed user, address indexed granter);
    event RoleRevoked(bytes32 indexed role, address indexed user, address indexed revoker);
    event AccessDenied(address indexed user, bytes32 indexed action);

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");
    bytes32 public constant DEVICE_ROLE = keccak256("DEVICE_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Role mappings
    mapping(address => mapping(bytes32 => bool)) public roles;
    mapping(bytes32 => address[]) public roleMembers;

    // User whitelist for testing
    mapping(address => bool) public whitelisted;
    bool public whitelistEnabled = false;

    address public owner;

    constructor() {
        owner = msg.sender;
        
        // Grant admin role to owner
        roles[owner][ADMIN_ROLE] = true;
        roleMembers[ADMIN_ROLE].push(owner);
    }

    // ============================================
    // ROLE MANAGEMENT
    // ============================================

    /**
     * @dev Grant a role to a user
     */
    function grantRole(
        bytes32 _role,
        address _user
    ) external {
        require(hasRole(msg.sender, ADMIN_ROLE), "Insufficient permissions");
        require(_user != address(0), "Invalid user address");

        if (!roles[_user][_role]) {
            roles[_user][_role] = true;
            roleMembers[_role].push(_user);
            emit RoleGranted(_role, _user, msg.sender);
        }
    }

    /**
     * @dev Revoke a role from a user
     */
    function revokeRole(
        bytes32 _role,
        address _user
    ) external {
        require(hasRole(msg.sender, ADMIN_ROLE), "Insufficient permissions");
        require(_user != address(0), "Invalid user address");
        require(!(_role == ADMIN_ROLE && _user == owner), "Cannot revoke owner admin role");

        if (roles[_user][_role]) {
            roles[_user][_role] = false;
            emit RoleRevoked(_role, _user, msg.sender);
        }
    }

    /**
     * @dev Check if user has a specific role
     */
    function hasRole(
        address _user,
        bytes32 _role
    ) public view returns (bool) {
        return roles[_user][_role];
    }

    // ============================================
    // PERMISSION CHECKING
    // ============================================

    /**
     * @dev Check if user can start a service session
     */
    function canStartService(address _user) 
        external 
        view 
        returns (bool) 
    {
        if (whitelistEnabled && !whitelisted[_user]) {
            return false;
        }
        return hasRole(_user, USER_ROLE) || hasRole(_user, ADMIN_ROLE);
    }

    /**
     * @dev Check if user can settle payment
     */
    function canSettlePayment(address _user) 
        external 
        view 
        returns (bool) 
    {
        return hasRole(_user, USER_ROLE) || hasRole(_user, ADMIN_ROLE);
    }

    /**
     * @dev Check if device is authorized
     */
    function isDeviceAuthorized(address _device) 
        external 
        view 
        returns (bool) 
    {
        return hasRole(_device, DEVICE_ROLE) || hasRole(_device, ADMIN_ROLE);
    }

    /**
     * @dev Check if operator is authorized
     */
    function isOperatorAuthorized(address _operator) 
        external 
        view 
        returns (bool) 
    {
        return hasRole(_operator, OPERATOR_ROLE) || hasRole(_operator, ADMIN_ROLE);
    }

    // ============================================
    // WHITELIST MANAGEMENT
    // ============================================

    /**
     * @dev Add user to whitelist
     */
    function addToWhitelist(address _user) 
        external 
    {
        require(hasRole(msg.sender, ADMIN_ROLE), "Insufficient permissions");
        require(_user != address(0), "Invalid user address");
        
        whitelisted[_user] = true;
    }

    /**
     * @dev Remove user from whitelist
     */
    function removeFromWhitelist(address _user) 
        external 
    {
        require(hasRole(msg.sender, ADMIN_ROLE), "Insufficient permissions");
        require(_user != address(0), "Invalid user address");
        
        whitelisted[_user] = false;
    }

    /**
     * @dev Check if user is whitelisted
     */
    function isWhitelisted(address _user) 
        external 
        view 
        returns (bool) 
    {
        if (!whitelistEnabled) return true;
        return whitelisted[_user];
    }

    /**
     * @dev Toggle whitelist requirement
     */
    function toggleWhitelist() 
        external 
    {
        require(hasRole(msg.sender, ADMIN_ROLE), "Insufficient permissions");
        whitelistEnabled = !whitelistEnabled;
    }

    // ============================================
    // QUERY FUNCTIONS
    // ============================================

    /**
     * @dev Get role members
     */
    function getRoleMembers(bytes32 _role) 
        external 
        view 
        returns (address[] memory) 
    {
        return roleMembers[_role];
    }

    /**
     * @dev Get number of users with a role
     */
    function getRoleMemberCount(bytes32 _role) 
        external 
        view 
        returns (uint256) 
    {
        return roleMembers[_role].length;
    }

    /**
     * @dev Check if address is contract owner
     */
    function isOwner(address _user) 
        external 
        view 
        returns (bool) 
    {
        return _user == owner;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @dev Transfer owner role (only current owner)
     */
    function transferOwner(address _newOwner) 
        external 
    {
        require(msg.sender == owner, "Not authorized");
        require(_newOwner != address(0), "Invalid new owner");

        roles[owner][ADMIN_ROLE] = false;
        roles[_newOwner][ADMIN_ROLE] = true;
        owner = _newOwner;

        emit RoleRevoked(ADMIN_ROLE, msg.sender, msg.sender);
        emit RoleGranted(ADMIN_ROLE, _newOwner, msg.sender);
    }
}
