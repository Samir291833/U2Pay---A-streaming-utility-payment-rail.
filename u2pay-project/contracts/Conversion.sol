// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Conversion_Contract
 * @dev Handles fiat ↔ crypto conversions with configurable rates
 * Users never see crypto math - everything is in familiar currency
 */

contract Conversion_Contract {
    
    // Events
    event RateUpdated(string indexed currency, uint256 newRate, uint256 timestamp);
    event ConversionLogged(address indexed user, uint256 fiatAmount, string fiatCurrency, uint256 cryptoAmount, string cryptoType);

    // Exchange rates (fiat to USD, 1 USD = 1e8 units for precision)
    mapping(string => uint256) public exchangeRates;
    
    // Crypto prices in USD (1 ETH = X USD, stored with 1e8 precision)
    mapping(string => uint256) public cryptoPrices;
    
    // Conversion history
    struct ConversionRecord {
        address user;
        uint256 fiatAmount;
        string fiatCurrency;
        uint256 cryptoAmount;
        string cryptoType;
        uint256 rate;
        uint256 timestamp;
    }
    
    ConversionRecord[] public conversionHistory;
    
    address public owner;
    uint256 public slippageTolerance = 100; // 1% default

    constructor() {
        owner = msg.sender;
        
        // Initialize rates
        exchangeRates["USD"] = 1e8;
        exchangeRates["EUR"] = 92e6;  // 0.92 EUR = 1 USD
        exchangeRates["INR"] = 8350e6; // 83.50 INR = 1 USD
        
        cryptoPrices["ETH"] = 2500e8;
        cryptoPrices["USDC"] = 1e8;
        cryptoPrices["MATIC"] = 1e7;
    }

    // ============================================
    // CONVERSION FUNCTIONS
    // ============================================

    /**
     * @dev Convert fiat to crypto (user perspective)
     * User inputs fiat, gets crypto amount
     */
    function getFiatToCryptoAmount(
        uint256 _fiatAmount,
        string memory _fiatCurrency,
        string memory _cryptoType
    ) external view returns (uint256 cryptoAmount) {
        require(_fiatAmount > 0, "Invalid fiat amount");
        require(exchangeRates[_fiatCurrency] > 0, "Unsupported fiat currency");
        require(cryptoPrices[_cryptoType] > 0, "Unsupported crypto type");

        // Convert fiat to USD
        uint256 amountInUSD = (_fiatAmount * 1e8) / exchangeRates[_fiatCurrency];

        // Convert USD to crypto
        cryptoAmount = (amountInUSD * 1e8) / cryptoPrices[_cryptoType];
    }

    /**
     * @dev Convert crypto to fiat (for display)
     */
    function getCryptoToFiatAmount(
        uint256 _cryptoAmount,
        string memory _cryptoType,
        string memory _fiatCurrency
    ) external view returns (uint256 fiatAmount) {
        require(_cryptoAmount > 0, "Invalid crypto amount");
        require(cryptoPrices[_cryptoType] > 0, "Unsupported crypto type");
        require(exchangeRates[_fiatCurrency] > 0, "Unsupported fiat currency");

        // Convert crypto to USD
        uint256 amountInUSD = (_cryptoAmount * cryptoPrices[_cryptoType]) / 1e8;

        // Convert USD to fiat
        fiatAmount = (amountInUSD * exchangeRates[_fiatCurrency]) / 1e8;
    }

    /**
     * @dev Get exchange rate between two fiat currencies
     */
    function getExchangeRate(
        string memory _fromFiat,
        string memory _toFiat
    ) external view returns (uint256 rate) {
        require(exchangeRates[_fromFiat] > 0, "Unsupported currency");
        require(exchangeRates[_toFiat] > 0, "Unsupported currency");

        rate = (exchangeRates[_fromFiat] * 1e8) / exchangeRates[_toFiat];
    }

    /**
     * @dev Get crypto price in specific fiat
     */
    function getCryptoPriceInFiat(
        string memory _cryptoType,
        string memory _fiatCurrency
    ) external view returns (uint256 price) {
        require(cryptoPrices[_cryptoType] > 0, "Unsupported crypto");
        require(exchangeRates[_fiatCurrency] > 0, "Unsupported currency");

        uint256 priceInUSD = cryptoPrices[_cryptoType];
        price = (priceInUSD * exchangeRates[_fiatCurrency]) / 1e8;
    }

    /**
     * @dev Calculate slippage between expected and actual amounts
     */
    function calculateSlippage(
        uint256 _expectedAmount,
        uint256 _actualAmount
    ) external pure returns (uint256 slippage) {
        require(_expectedAmount > 0, "Invalid expected amount");
        
        if (_actualAmount >= _expectedAmount) return 0;
        
        uint256 difference = _expectedAmount - _actualAmount;
        slippage = (difference * 10000) / _expectedAmount; // In basis points
    }

    // ============================================
    // RATE MANAGEMENT
    // ============================================

    /**
     * @dev Update exchange rate (only owner)
     */
    function updateExchangeRate(
        string memory _currency,
        uint256 _rate
    ) external {
        require(msg.sender == owner, "Not authorized");
        require(_rate > 0, "Invalid rate");

        exchangeRates[_currency] = _rate;
        emit RateUpdated(_currency, _rate, block.timestamp);
    }

    /**
     * @dev Update crypto price (only owner)
     */
    function updateCryptoPrice(
        string memory _cryptoType,
        uint256 _price
    ) external {
        require(msg.sender == owner, "Not authorized");
        require(_price > 0, "Invalid price");

        cryptoPrices[_cryptoType] = _price;
        emit RateUpdated(_cryptoType, _price, block.timestamp);
    }

    /**
     * @dev Log conversion for audit trail
     */
    function logConversion(
        address _user,
        uint256 _fiatAmount,
        string memory _fiatCurrency,
        uint256 _cryptoAmount,
        string memory _cryptoType,
        uint256 _rate
    ) external {
        require(msg.sender == owner, "Not authorized");

        ConversionRecord memory record = ConversionRecord({
            user: _user,
            fiatAmount: _fiatAmount,
            fiatCurrency: _fiatCurrency,
            cryptoAmount: _cryptoAmount,
            cryptoType: _cryptoType,
            rate: _rate,
            timestamp: block.timestamp
        });

        conversionHistory.push(record);
        emit ConversionLogged(_user, _fiatAmount, _fiatCurrency, _cryptoAmount, _cryptoType);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @dev Get conversion history length
     */
    function getConversionHistoryLength() 
        external 
        view 
        returns (uint256) 
    {
        return conversionHistory.length;
    }

    /**
     * @dev Get specific conversion record
     */
    function getConversionRecord(uint256 _index) 
        external 
        view 
        returns (ConversionRecord memory) 
    {
        require(_index < conversionHistory.length, "Invalid index");
        return conversionHistory[_index];
    }

    /**
     * @dev Update slippage tolerance
     */
    function setSlippageTolerance(uint256 _tolerance) 
        external 
    {
        require(msg.sender == owner, "Not authorized");
        require(_tolerance <= 1000, "Tolerance too high"); // Max 10%
        slippageTolerance = _tolerance;
    }
}
