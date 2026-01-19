// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title StreamingUtilityContract
 * @dev Handles continuous flow payments with nanosecond precision billing
 * Users pay based on actual consumption - never overpay
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract StreamingUtilityContract {
    
    // Events
    event ServiceStarted(bytes32 indexed sessionId, address indexed user, uint256 ratePerHour);
    event ServiceStopped(bytes32 indexed sessionId, address indexed user, uint256 totalAmount);
    event PaymentProcessed(bytes32 indexed sessionId, address indexed user, uint256 amount);
    event RefundIssued(bytes32 indexed sessionId, address indexed user, uint256 refundAmount);
    event SpendingLimitSet(bytes32 indexed sessionId, uint256 maxAmount);

    // Data structures
    struct Session {
        bytes32 id;
        address user;
        uint256 startTime;
        uint256 ratePerHour;
        uint256 totalSpent;
        uint256 spendingLimit;
        bool active;
        uint256 nanosecondsPrecision;
    }

    struct Payment {
        bytes32 sessionId;
        address user;
        uint256 amount;
        uint256 timestamp;
        bool isRefund;
    }

    // State variables
    mapping(bytes32 => Session) public sessions;
    mapping(address => bytes32[]) public userSessions;
    Payment[] public paymentHistory;
    
    address public owner;
    IERC20 public paymentToken;
    uint256 public feePercentage = 1; // 1% platform fee

    constructor(address _paymentToken) {
        owner = msg.sender;
        paymentToken = IERC20(_paymentToken);
    }

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    /**
     * @dev Start a new streaming service session
     * @param _sessionId Unique session identifier
     * @param _ratePerHour Cost per hour in wei
     * @param _spendingLimit Maximum amount user can spend
     */
    function startService(
        bytes32 _sessionId,
        uint256 _ratePerHour,
        uint256 _spendingLimit
    ) external {
        require(sessions[_sessionId].user == address(0), "Session already exists");
        require(_ratePerHour > 0, "Invalid rate");
        require(_spendingLimit > 0, "Invalid spending limit");

        Session memory newSession = Session({
            id: _sessionId,
            user: msg.sender,
            startTime: block.timestamp,
            ratePerHour: _ratePerHour,
            totalSpent: 0,
            spendingLimit: _spendingLimit,
            active: true,
            nanosecondsPrecision: 0
        });

        sessions[_sessionId] = newSession;
        userSessions[msg.sender].push(_sessionId);

        emit ServiceStarted(_sessionId, msg.sender, _ratePerHour);
    }

    /**
     * @dev Stop service and process final payment
     * @param _sessionId Session to stop
     * @param _finalAmount Amount to pay (never exceeds actual usage)
     */
    function stopService(
        bytes32 _sessionId,
        uint256 _finalAmount
    ) external {
        Session storage session = sessions[_sessionId];
        require(session.user == msg.sender, "Not authorized");
        require(session.active, "Session already stopped");

        // Ensure no overpayment
        require(_finalAmount <= session.spendingLimit, "Amount exceeds spending limit");
        require(_finalAmount <= calculateMaxChargeable(session), "Amount exceeds actual usage");

        session.active = false;
        session.totalSpent = _finalAmount;

        // Process payment
        _processPayment(_sessionId, _finalAmount);

        emit ServiceStopped(_sessionId, msg.sender, _finalAmount);
    }

    /**
     * @dev Set spending limit (cannot increase, only reduce)
     * @param _sessionId Session ID
     * @param _newLimit New spending limit
     */
    function setSpendingLimit(
        bytes32 _sessionId,
        uint256 _newLimit
    ) external {
        Session storage session = sessions[_sessionId];
        require(session.user == msg.sender, "Not authorized");
        require(_newLimit < session.spendingLimit, "Can only reduce spending limit");

        session.spendingLimit = _newLimit;
        emit SpendingLimitSet(_sessionId, _newLimit);
    }

    // ============================================
    // PAYMENT PROCESSING
    // ============================================

    /**
     * @dev Process payment with fee deduction
     * @param _sessionId Session ID
     * @param _amount Amount to pay
     */
    function _processPayment(
        bytes32 _sessionId,
        uint256 _amount
    ) internal {
        require(_amount > 0, "Invalid amount");

        Session storage session = sessions[_sessionId];
        
        // Calculate platform fee
        uint256 fee = (_amount * feePercentage) / 100;
        uint256 platformAmount = _amount - fee;

        // Transfer payment from user
        require(
            paymentToken.transferFrom(msg.sender, address(this), _amount),
            "Payment transfer failed"
        );

        // Record payment
        Payment memory payment = Payment({
            sessionId: _sessionId,
            user: msg.sender,
            amount: _amount,
            timestamp: block.timestamp,
            isRefund: false
        });
        paymentHistory.push(payment);

        session.totalSpent = _amount;

        emit PaymentProcessed(_sessionId, msg.sender, _amount);
    }

    /**
     * @dev Issue refund if user paid more than actual usage
     * @param _sessionId Session ID
     * @param _refundAmount Amount to refund
     */
    function issueRefund(
        bytes32 _sessionId,
        uint256 _refundAmount
    ) external {
        Session storage session = sessions[_sessionId];
        require(session.user == msg.sender, "Not authorized");
        require(!session.active, "Session must be stopped");
        require(_refundAmount > 0, "Invalid refund amount");

        // Transfer refund
        require(
            paymentToken.transfer(msg.sender, _refundAmount),
            "Refund transfer failed"
        );

        // Record refund
        Payment memory refund = Payment({
            sessionId: _sessionId,
            user: msg.sender,
            amount: _refundAmount,
            timestamp: block.timestamp,
            isRefund: true
        });
        paymentHistory.push(refund);

        emit RefundIssued(_sessionId, msg.sender, _refundAmount);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @dev Calculate maximum chargeable amount based on elapsed time
     */
    function calculateMaxChargeable(Session memory session) 
        public 
        view 
        returns (uint256) 
    {
        require(session.user != address(0), "Invalid session");

        uint256 elapsedSeconds = block.timestamp - session.startTime;
        uint256 elapsedHours = (elapsedSeconds * 1e18) / 3600; // Use 1e18 for precision
        
        return (elapsedHours * session.ratePerHour) / 1e18;
    }

    /**
     * @dev Get session details
     */
    function getSession(bytes32 _sessionId) 
        external 
        view 
        returns (Session memory) 
    {
        return sessions[_sessionId];
    }

    /**
     * @dev Get user's sessions
     */
    function getUserSessions(address _user) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return userSessions[_user];
    }

    /**
     * @dev Get payment history length
     */
    function getPaymentHistoryLength() 
        external 
        view 
        returns (uint256) 
    {
        return paymentHistory.length;
    }

    /**
     * @dev Get specific payment record
     */
    function getPayment(uint256 _index) 
        external 
        view 
        returns (Payment memory) 
    {
        require(_index < paymentHistory.length, "Invalid index");
        return paymentHistory[_index];
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @dev Update fee percentage (only owner)
     */
    function updateFeePercentage(uint256 _newFee) 
        external 
    {
        require(msg.sender == owner, "Not authorized");
        require(_newFee <= 10, "Fee too high");
        feePercentage = _newFee;
    }

    /**
     * @dev Withdraw collected fees (only owner)
     */
    function withdrawFees(uint256 _amount) 
        external 
    {
        require(msg.sender == owner, "Not authorized");
        require(paymentToken.transfer(owner, _amount), "Withdrawal failed");
    }
}
