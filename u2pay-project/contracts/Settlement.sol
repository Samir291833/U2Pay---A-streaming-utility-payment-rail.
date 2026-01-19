// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Settlement_Contract
 * @dev Handles payment settlement, reconciliation, and dispute resolution
 */

contract Settlement_Contract {
    
    // Events
    event SettlementInitiated(bytes32 indexed settlementId, address indexed user, uint256 amount);
    event SettlementConfirmed(bytes32 indexed settlementId, address indexed user, uint256 amount, bytes32 indexed txHash);
    event RefundProcessed(bytes32 indexed settlementId, address indexed user, uint256 refundAmount);
    event DisputeRaised(bytes32 indexed settlementId, address indexed user, string reason);
    event DisputeResolved(bytes32 indexed settlementId, address indexed resolver, string resolution);

    // Settlement states
    enum SettlementState { PENDING, CONFIRMED, REFUNDED, DISPUTED, RESOLVED }

    // Settlement record structure
    struct Settlement {
        bytes32 id;
        address user;
        bytes32 sessionId;
        uint256 amount;
        uint256 expectedAmount;
        uint256 actualAmount;
        SettlementState state;
        uint256 timestamp;
        bytes32 transactionHash;
        string notes;
    }

    // Dispute structure
    struct Dispute {
        bytes32 id;
        bytes32 settlementId;
        address initiator;
        string reason;
        bool resolved;
        string resolution;
        uint256 timestamp;
    }

    // State variables
    mapping(bytes32 => Settlement) public settlements;
    mapping(bytes32 => Dispute) public disputes;
    Settlement[] public settlementHistory;
    Dispute[] public disputeHistory;

    address public owner;
    address public arbitrator;
    uint256 public disputeResolutionDeadline = 7 days;
    uint256 public minimumSettlementAmount = 0.001 ether;

    constructor(address _arbitrator) {
        owner = msg.sender;
        arbitrator = _arbitrator;
    }

    // ============================================
    // SETTLEMENT MANAGEMENT
    // ============================================

    /**
     * @dev Initiate a settlement
     * @param _settlementId Unique settlement ID
     * @param _sessionId Associated session ID
     * @param _amount Amount to settle
     * @param _expectedAmount Expected usage amount
     * @param _actualAmount Actual usage amount
     */
    function initiateSettlement(
        bytes32 _settlementId,
        bytes32 _sessionId,
        uint256 _amount,
        uint256 _expectedAmount,
        uint256 _actualAmount
    ) external {
        require(settlements[_settlementId].user == address(0), "Settlement already exists");
        require(_amount > 0, "Invalid amount");
        require(_actualAmount <= _expectedAmount, "Actual amount exceeds expected");

        // Ensure no overpayment
        require(_amount <= _actualAmount, "Amount exceeds actual usage");

        Settlement memory settlement = Settlement({
            id: _settlementId,
            user: msg.sender,
            sessionId: _sessionId,
            amount: _amount,
            expectedAmount: _expectedAmount,
            actualAmount: _actualAmount,
            state: SettlementState.PENDING,
            timestamp: block.timestamp,
            transactionHash: bytes32(0),
            notes: ""
        });

        settlements[_settlementId] = settlement;
        settlementHistory.push(settlement);

        emit SettlementInitiated(_settlementId, msg.sender, _amount);
    }

    /**
     * @dev Confirm settlement (after payment verification)
     */
    function confirmSettlement(
        bytes32 _settlementId,
        bytes32 _txHash
    ) external {
        require(msg.sender == owner || msg.sender == arbitrator, "Not authorized");
        
        Settlement storage settlement = settlements[_settlementId];
        require(settlement.user != address(0), "Settlement not found");
        require(settlement.state == SettlementState.PENDING, "Invalid state");

        settlement.state = SettlementState.CONFIRMED;
        settlement.transactionHash = _txHash;

        emit SettlementConfirmed(_settlementId, settlement.user, settlement.amount, _txHash);
    }

    /**
     * @dev Process refund for overpayment
     */
    function processRefund(
        bytes32 _settlementId,
        uint256 _refundAmount
    ) external {
        require(msg.sender == owner || msg.sender == arbitrator, "Not authorized");
        
        Settlement storage settlement = settlements[_settlementId];
        require(settlement.user != address(0), "Settlement not found");
        require(settlement.state == SettlementState.CONFIRMED, "Invalid state");
        require(_refundAmount > 0, "Invalid refund amount");
        require(_refundAmount <= settlement.amount, "Refund exceeds settlement amount");

        settlement.state = SettlementState.REFUNDED;
        settlement.notes = "Refund processed";

        emit RefundProcessed(_settlementId, settlement.user, _refundAmount);
    }

    // ============================================
    // DISPUTE HANDLING
    // ============================================

    /**
     * @dev Raise a dispute on a settlement
     */
    function raiseDispute(
        bytes32 _settlementId,
        string memory _reason
    ) external {
        Settlement storage settlement = settlements[_settlementId];
        require(settlement.user == msg.sender, "Not authorized");
        require(settlement.state != SettlementState.DISPUTED, "Dispute already raised");
        require(bytes(_reason).length > 0, "Reason required");

        // Check if within dispute window (7 days)
        require(
            block.timestamp <= settlement.timestamp + disputeResolutionDeadline,
            "Dispute deadline passed"
        );

        bytes32 disputeId = keccak256(abi.encodePacked(_settlementId, block.timestamp));
        
        Dispute memory dispute = Dispute({
            id: disputeId,
            settlementId: _settlementId,
            initiator: msg.sender,
            reason: _reason,
            resolved: false,
            resolution: "",
            timestamp: block.timestamp
        });

        disputes[disputeId] = dispute;
        disputeHistory.push(dispute);

        settlement.state = SettlementState.DISPUTED;

        emit DisputeRaised(_settlementId, msg.sender, _reason);
    }

    /**
     * @dev Resolve a dispute
     */
    function resolveDispute(
        bytes32 _disputeId,
        string memory _resolution,
        uint256 _refundAmount
    ) external {
        require(msg.sender == arbitrator || msg.sender == owner, "Not authorized");
        
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.initiator != address(0), "Dispute not found");
        require(!dispute.resolved, "Dispute already resolved");

        dispute.resolved = true;
        dispute.resolution = _resolution;

        Settlement storage settlement = settlements[dispute.settlementId];
        settlement.state = SettlementState.RESOLVED;

        if (_refundAmount > 0) {
            settlement.state = SettlementState.REFUNDED;
        }

        emit DisputeResolved(_disputeId, msg.sender, _resolution);
    }

    // ============================================
    // RECONCILIATION
    // ============================================

    /**
     * @dev Reconcile settlement with actual charges
     */
    function reconcile(
        bytes32 _settlementId,
        uint256 _actualChargedAmount
    ) external {
        require(msg.sender == owner || msg.sender == arbitrator, "Not authorized");
        
        Settlement storage settlement = settlements[_settlementId];
        require(settlement.user != address(0), "Settlement not found");

        // Calculate difference
        if (_actualChargedAmount < settlement.amount) {
            uint256 refundAmount = settlement.amount - _actualChargedAmount;
            settlement.state = SettlementState.REFUNDED;
            settlement.notes = string(abi.encodePacked("Reconciled with refund: ", refundAmount));
        } else {
            settlement.state = SettlementState.CONFIRMED;
            settlement.notes = "Reconciliation completed";
        }
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @dev Get settlement details
     */
    function getSettlement(bytes32 _settlementId) 
        external 
        view 
        returns (Settlement memory) 
    {
        return settlements[_settlementId];
    }

    /**
     * @dev Get dispute details
     */
    function getDispute(bytes32 _disputeId) 
        external 
        view 
        returns (Dispute memory) 
    {
        return disputes[_disputeId];
    }

    /**
     * @dev Get settlement history
     */
    function getSettlementHistoryLength() 
        external 
        view 
        returns (uint256) 
    {
        return settlementHistory.length;
    }

    /**
     * @dev Get specific settlement from history
     */
    function getSettlementFromHistory(uint256 _index) 
        external 
        view 
        returns (Settlement memory) 
    {
        require(_index < settlementHistory.length, "Invalid index");
        return settlementHistory[_index];
    }

    /**
     * @dev Get settlement statistics
     */
    function getSettlementStats() 
        external 
        view 
        returns (
            uint256 totalSettlements,
            uint256 totalAmount,
            uint256 confirmedCount,
            uint256 disputedCount
        ) 
    {
        totalSettlements = settlementHistory.length;
        
        for (uint256 i = 0; i < settlementHistory.length; i++) {
            totalAmount += settlementHistory[i].amount;
            
            if (settlementHistory[i].state == SettlementState.CONFIRMED) {
                confirmedCount++;
            } else if (settlementHistory[i].state == SettlementState.DISPUTED) {
                disputedCount++;
            }
        }
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @dev Set arbitrator address
     */
    function setArbitrator(address _newArbitrator) 
        external 
    {
        require(msg.sender == owner, "Not authorized");
        require(_newArbitrator != address(0), "Invalid address");
        arbitrator = _newArbitrator;
    }

    /**
     * @dev Set dispute resolution deadline
     */
    function setDisputeDeadline(uint256 _days) 
        external 
    {
        require(msg.sender == owner, "Not authorized");
        require(_days > 0, "Invalid deadline");
        disputeResolutionDeadline = _days * 1 days;
    }

    /**
     * @dev Set minimum settlement amount
     */
    function setMinimumSettlementAmount(uint256 _amount) 
        external 
    {
        require(msg.sender == owner, "Not authorized");
        minimumSettlementAmount = _amount;
    }
}
