// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RateNormalizer_Contract
 * @dev Normalizes various rate formats (per hour, per minute, per second, etc.) to standard units
 * Ensures consistent internal calculations
 */

contract RateNormalizer_Contract {
    
    // Events
    event RateNormalized(bytes32 indexed rateId, uint256 originalRate, string originalUnit, uint256 normalizedRate, uint256 timestamp);

    // Rate normalization constants (all converted to per nanosecond)
    // 1 second = 1e9 nanoseconds
    // 1 minute = 60e9 nanoseconds
    // 1 hour = 3600e9 nanoseconds
    
    uint256 constant NANOSECONDS_PER_SECOND = 1e9;
    uint256 constant NANOSECONDS_PER_MINUTE = 60e9;
    uint256 constant NANOSECONDS_PER_HOUR = 3600e9;
    uint256 constant NANOSECONDS_PER_DAY = 86400e9;
    
    struct NormalizedRate {
        bytes32 id;
        uint256 originalRate;
        string originalUnit;
        uint256 normalizedRate;
        uint256 timestamp;
    }
    
    mapping(bytes32 => NormalizedRate) public normalizedRates;
    NormalizedRate[] public rateHistory;
    
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // ============================================
    // RATE NORMALIZATION FUNCTIONS
    // ============================================

    /**
     * @dev Normalize rate to per-nanosecond (internal standard)
     * @param _rate The rate value
     * @param _unit Unit of the rate (e.g., "hour", "minute", "second")
     * @return normalizedRate The rate converted to per-nanosecond
     */
    function normalizeRate(
        uint256 _rate,
        string memory _unit
    ) external view returns (uint256 normalizedRate) {
        require(_rate > 0, "Invalid rate");

        normalizedRate = _calculateNormalizedRate(_rate, _unit);
    }

    /**
     * @dev Internal function to calculate normalized rate
     */
    function _calculateNormalizedRate(
        uint256 _rate,
        string memory _unit
    ) internal pure returns (uint256) {
        bytes32 unitHash = keccak256(abi.encodePacked(_unit));

        if (unitHash == keccak256(abi.encodePacked("nanosecond"))) {
            return _rate;
        } else if (unitHash == keccak256(abi.encodePacked("microsecond"))) {
            return _rate / 1000;
        } else if (unitHash == keccak256(abi.encodePacked("millisecond"))) {
            return _rate / 1000000;
        } else if (unitHash == keccak256(abi.encodePacked("second"))) {
            return _rate / NANOSECONDS_PER_SECOND;
        } else if (unitHash == keccak256(abi.encodePacked("minute"))) {
            return _rate / NANOSECONDS_PER_MINUTE;
        } else if (unitHash == keccak256(abi.encodePacked("hour"))) {
            return _rate / NANOSECONDS_PER_HOUR;
        } else if (unitHash == keccak256(abi.encodePacked("day"))) {
            return _rate / NANOSECONDS_PER_DAY;
        } else {
            revert("Unsupported unit");
        }
    }

    /**
     * @dev Convert from normalized rate (per-nanosecond) to any unit
     * @param _normalizedRate Rate in per-nanosecond
     * @param _targetUnit Target unit to convert to
     * @return convertedRate Rate in target unit
     */
    function denormalizeRate(
        uint256 _normalizedRate,
        string memory _targetUnit
    ) external pure returns (uint256 convertedRate) {
        bytes32 unitHash = keccak256(abi.encodePacked(_targetUnit));

        if (unitHash == keccak256(abi.encodePacked("nanosecond"))) {
            convertedRate = _normalizedRate;
        } else if (unitHash == keccak256(abi.encodePacked("microsecond"))) {
            convertedRate = _normalizedRate * 1000;
        } else if (unitHash == keccak256(abi.encodePacked("millisecond"))) {
            convertedRate = _normalizedRate * 1000000;
        } else if (unitHash == keccak256(abi.encodePacked("second"))) {
            convertedRate = _normalizedRate * NANOSECONDS_PER_SECOND;
        } else if (unitHash == keccak256(abi.encodePacked("minute"))) {
            convertedRate = _normalizedRate * NANOSECONDS_PER_MINUTE;
        } else if (unitHash == keccak256(abi.encodePacked("hour"))) {
            convertedRate = _normalizedRate * NANOSECONDS_PER_HOUR;
        } else if (unitHash == keccak256(abi.encodePacked("day"))) {
            convertedRate = _normalizedRate * NANOSECONDS_PER_DAY;
        } else {
            revert("Unsupported unit");
        }
    }

    /**
     * @dev Convert between any two time units
     * @param _amount Amount in source unit
     * @param _sourceUnit Source unit
     * @param _targetUnit Target unit
     * @return convertedAmount Amount in target unit
     */
    function convertTimeUnit(
        uint256 _amount,
        string memory _sourceUnit,
        string memory _targetUnit
    ) external pure returns (uint256 convertedAmount) {
        // Normalize to nanoseconds first
        uint256 normalized = _calculateNormalizedRate(_amount, _sourceUnit);
        
        // Then convert to target unit
        bytes32 targetHash = keccak256(abi.encodePacked(_targetUnit));

        if (targetHash == keccak256(abi.encodePacked("second"))) {
            convertedAmount = normalized * NANOSECONDS_PER_SECOND;
        } else if (targetHash == keccak256(abi.encodePacked("minute"))) {
            convertedAmount = normalized * NANOSECONDS_PER_MINUTE;
        } else if (targetHash == keccak256(abi.encodePacked("hour"))) {
            convertedAmount = normalized * NANOSECONDS_PER_HOUR;
        } else if (targetHash == keccak256(abi.encodePacked("day"))) {
            convertedAmount = normalized * NANOSECONDS_PER_DAY;
        } else {
            revert("Unsupported target unit");
        }
    }

    /**
     * @dev Store normalized rate for audit trail
     */
    function storeNormalizedRate(
        bytes32 _rateId,
        uint256 _originalRate,
        string memory _originalUnit
    ) external {
        require(msg.sender == owner, "Not authorized");
        require(_originalRate > 0, "Invalid rate");

        uint256 normalized = _calculateNormalizedRate(_originalRate, _originalUnit);

        NormalizedRate memory record = NormalizedRate({
            id: _rateId,
            originalRate: _originalRate,
            originalUnit: _originalUnit,
            normalizedRate: normalized,
            timestamp: block.timestamp
        });

        normalizedRates[_rateId] = record;
        rateHistory.push(record);

        emit RateNormalized(_rateId, _originalRate, _originalUnit, normalized, block.timestamp);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @dev Get normalized rate by ID
     */
    function getNormalizedRate(bytes32 _rateId) 
        external 
        view 
        returns (NormalizedRate memory) 
    {
        return normalizedRates[_rateId];
    }

    /**
     * @dev Get rate history length
     */
    function getRateHistoryLength() 
        external 
        view 
        returns (uint256) 
    {
        return rateHistory.length;
    }

    /**
     * @dev Get specific rate history entry
     */
    function getRateHistoryEntry(uint256 _index) 
        external 
        view 
        returns (NormalizedRate memory) 
    {
        require(_index < rateHistory.length, "Invalid index");
        return rateHistory[_index];
    }

    /**
     * @dev Calculate elapsed time cost
     * @param _elapsedNanoseconds Time elapsed in nanoseconds
     * @param _ratePerUnit Rate per unit
     * @param _unit Unit of the rate
     * @return cost Total cost
     */
    function calculateElapsedTimeCost(
        uint256 _elapsedNanoseconds,
        uint256 _ratePerUnit,
        string memory _unit
    ) external pure returns (uint256 cost) {
        uint256 normalized = _calculateNormalizedRate(_ratePerUnit, _unit);
        cost = _elapsedNanoseconds * normalized;
    }
}
