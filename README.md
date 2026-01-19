# U2PAY - Web3 Continuous Flow Payment Rail

**Pay Only What You Use**

U2PAY is a revolutionary payment rail that enables nanosecond-precision billing for services. Users never overpay - they only pay for exactly what they consume. Built on Web3 and integrated with IoT devices.

---

## 🎯 Core Concept

U2PAY is **NOT a payment app** - it's a **payment rail**: a sophisticated infrastructure layer that sits between service providers and users, handling:

- **Continuous flow payments** (streaming, not batch)
- **Nanosecond-precision billing** (true pay-as-you-go)
- **Fiat-first UX** (users see their familiar currency)
- **Crypto backend** (blockchain for settlement)
- **IoT integration** (real-world device consumption tracking)

---

## 🚀 Key Features

### Two Payment Modes

#### Mode A: Balance-Based Streaming
- User sets a maximum fiat amount (₹, $, €, etc.)
- Service draws from balance as consumed
- **User can NEVER overpay** - stops if limit reached
- Example: Set ₹500 max → Use ₹100 → Pay only ₹100

#### Mode B: Time-Based Precision Billing
- Service priced per hour or minute
- System converts to **cost per nanosecond** internally
- UI displays time only as: Hours, Minutes, Seconds
- Example: ₹50/hour → Use for 30 mins → Pay ₹25

### Nanosecond Precision

All internal calculations use **BigInt nanosecond precision**:
- 1 second = 1,000,000,000 nanoseconds
- Eliminates floating-point errors
- Accurate to billionths of a second

### Fiat-First UX

**Users never do crypto math:**
- Input amounts in familiar currency (₹, $, €)
- System automatically converts fiat → crypto
- Display always in fiat
- Conversion rates updated in real-time

### Smart Wallet Integration

- **MetaMask** (preferred)
- **WalletConnect** (multichain)
- **Gmail login** (with manual wallet linking)

### Safety Features

- ✓ Spending cap with auto-stop
- ✓ Sound notification on limit reached
- ✓ Real-time balance tracking
- ✓ No overpayment guarantee
- ✓ Refund if service stops early

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    U2PAY Frontend                        │
│  (u2pay.html - Single entry point, opens entire app)    │
│                                                           │
│  • Mode selector (Balance / Time-based)                  │
│  • Live balance & time tracking                          │
│  • Wallet connection (MetaMask, WalletConnect, Gmail)    │
│  • Payment settlement                                    │
└─────────────┬───────────────────────────────────────────┘
              │
              │ WebSocket & REST API
              ▼
┌─────────────────────────────────────────────────────────┐
│              U2PAY Backend (Node.js)                     │
│                                                           │
│  • Session management                                    │
│  • Nanosecond billing engine                             │
│  • Real-time rate updates                                │
│  • Settlement service                                    │
│  • IoT bridge (MQTT)                                     │
└─────────────┬───────────────────────────────────────────┘
              │
              ├─────────────────────┬──────────────────┐
              ▼                     ▼                  ▼
    ┌──────────────────┐ ┌────────────────┐ ┌──────────────┐
    │   Blockchain     │ │  Rate Service  │ │  IoT Devices │
    │  (Smart Contracts)  │ (Exchange API) │ │   (MQTT)     │
    │                  │ │                │ │              │
    │ • Streaming      │ │ • Fiat ↔ Crypto│ │ • Chargers   │
    │ • Settlement     │ │ • Conversions  │ │ • WiFi APs   │
    │ • Access Control │ │ • Slippage     │ │ • Toll gates │
    │ • Disputes       │ │ • History      │ │ • Generic    │
    └──────────────────┘ └────────────────┘ └──────────────┘
```

---

## 📁 Project Structure

```
u2pay-project/
│
├── u2pay.html                      # MAIN ENTRY FILE
│
├── frontend/
│   ├── css/style.css               # Dark/light mode UI
│   └── js/
│       ├── app.js                  # Main logic
│       ├── wallet.js               # MetaMask & WalletConnect
│       ├── streaming.js            # Nanosecond engine
│       ├── fiatConversion.js       # Fiat ↔ crypto abstraction
│       ├── uiUpdater.js            # Live UI updates
│       └── websocketClient.js      # Real-time updates
│
├── backend/
│   ├── server.js                   # Express + WebSocket server
│   │
│   ├── services/
│   │   ├── rateService.js          # Exchange rates & crypto prices
│   │   ├── nanosecondEngine.js     # Time precision billing
│   │   └── settlementService.js    # Payment settlement
│   │
│   ├── routes/
│   │   ├── auth.js                 # Wallet & login
│   │   ├── session.js              # Session lifecycle
│   │   └── usage.js                # Metering & settlement
│   │
│   ├── mqtt/
│   │   └── iotBridge.js            # IoT device integration
│   │
│   └── config/
│       └── env.js                  # Environment config
│
├── contracts/
│   ├── StreamingUtilityContract.sol     # Core billing
│   ├── Conversion_Contract.sol          # Fiat ↔ Crypto
│   ├── RateNormalizer_Contract.sol      # Rate normalization
│   ├── AccessControl_Contract.sol       # Permissions
│   └── Settlement_Contract.sol          # Payment settlement
│
├── iot-simulator/
│   ├── device.js                   # Simulated devices
│   └── config.json                 # Device configuration
│
├── scripts/
│   ├── deploy.js                   # Contract deployment
│   └── testStream.js               # Test scenarios
│
├── package.json
├── hardhat.config.js
├── .env                            # Secrets (create this)
└── README.md                       # This file
```

---

## 🔧 Smart Contracts

### 1. **StreamingUtilityContract.sol**
   - Core billing engine
   - Handles service start/stop
   - Prevents overpayment
   - Manages refunds
   
### 2. **Conversion_Contract.sol**
   - Fiat → Crypto conversions
   - Exchange rate management
   - Slippage calculation
   - Conversion audit trail

### 3. **RateNormalizer_Contract.sol**
   - Normalizes rates to per-nanosecond
   - Converts between time units
   - Ensures calculation consistency

### 4. **AccessControl_Contract.sol**
   - Role-based permissions
   - User whitelisting
   - Device authorization

### 5. **Settlement_Contract.sol**
   - Payment settlement
   - Dispute handling
   - Reconciliation
   - Refund processing

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 16+
- Hardhat
- MetaMask (optional, for Web3 testing)
- MQTT Broker (for IoT testing)

### Step 1: Install Dependencies
```bash
cd u2pay-project
npm install
```

### Step 2: Configure Environment
Create `.env` file:
```
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
ETHERSCAN_API_KEY=your_etherscan_key
MQTT_URL=mqtt://localhost:1883
PORT=3000
NODE_ENV=development
```

### Step 3: Deploy Smart Contracts
```bash
npm run compile
npm run deploy
```

### Step 4: Start Backend Server
```bash
npm run dev
```

### Step 5: Launch Frontend
Open `u2pay.html` in your browser

### Step 6: Start IoT Simulator (Optional)
```bash
npm run iot-simulator
```

---

## 🎮 Usage Guide

### Starting a Session (Balance-Based)
1. Connect wallet (MetaMask/WalletConnect/Gmail)
2. Select "Balance-Based Streaming" mode
3. Set maximum amount (₹500)
4. Click "Start Service"
5. Service draws from balance as consumed
6. Stop when done → Only pay what was used

### Starting a Session (Time-Based)
1. Connect wallet
2. Select "Time-Based Precision Billing" mode
3. Set rate (₹50/hour)
4. Click "Start Service"
5. Service bills per nanosecond
6. Display shows Hours:Minutes:Seconds
7. Stop to settle payment

---

## 🔐 Security Features

- ✓ MetaMask wallet integration
- ✓ No overpayment (hard-coded in contracts)
- ✓ Spending cap with auto-stop
- ✓ Real-time balance validation
- ✓ Dispute resolution mechanism
- ✓ Audit trail for all transactions

---

## 📡 IoT Integration (Production-Ready, Simulated for Hackathon)

### IoT Deployment Mode (Hackathon)

For this hackathon submission, U2PAY operates in **IoT Simulation Mode**.

- Real-world IoT devices are emulated using a simulator
- Consumption events are generated programmatically
- The billing, nanosecond engine, caps, and settlement logic are identical to real deployment
- This ensures the system remains realistic, testable, and verifiable without physical hardware

The architecture is designed to plug directly into real MQTT-enabled devices without code changes.

### What the IoT Layer Controls

IoT devices in U2PAY are responsible for:
- Reporting real-time usage metrics
- Sending start/stop signals
- Enforcing auto-stop when spending caps are reached

IoT devices do NOT:
- Handle payments
- Store user balances
- Perform currency conversion
- Interact directly with blockchain

All financial logic is handled securely by the backend and smart contracts.

### Spending Caps & Device Auto-Shutdown

When a spending cap (global or session-based) is reached:
1. Backend emits a STOP command via MQTT
2. IoT device immediately halts service
3. Final usage is settled on-chain
4. User is charged only for consumed service

This guarantees:
- No overuse
- No overpayment
- Deterministic device behavior

### Device Topics
```
u2pay/devices/{deviceId}/status      → Device sends status updates
u2pay/devices/{deviceId}/usage       → Device reports consumption
u2pay/devices/{deviceId}/commands    → Backend sends commands
```

### Supported Device Types
- **Charger**: EV charging stations (consumption in kWh)
- **WiFi**: Internet access points (consumption in GB)
- **Gate**: Toll gates, parking systems (consumption in transactions)
- **Generic**: Any metered service

### Device Example
```json
{
  "deviceId": "charger-001",
  "deviceType": "charger",
  "status": "active",
  "consumption": 2.5,
  "spent": 125.50,
  "spendingLimit": 200.00
}
```

### Running the IoT Simulator

```bash
node backend/utils/device.js
```

The simulator:
- Emits usage events at configurable intervals
- Mimics real device consumption patterns
- Triggers auto-stop on cap breach
- Enables full end-to-end testing without hardware

---

## 💳 Fiat ↔ Crypto Conversion

U2PAY handles all fiat-crypto conversion internally:

```javascript
// User perspective (what they see)
Input: ₹500 maximum
↓
Fiat Conversion: ₹500 → $6 USD (exchange rate)
↓
Crypto Conversion: $6 USD → 0.0024 ETH (at 2500 USD/ETH)
↓
Settlement: User's wallet transfers 0.0024 ETH
↓
User only pays ₹X (amount actually used, ≤ ₹500)
```

---

## 🧪 Testing

### Run Unit Tests
```bash
npm test
```

### Test Smart Contracts
```bash
npx hardhat test
```

### Test Streaming Scenario
```bash
npx hardhat run scripts/testStream.js
```

---

## 📊 Nanosecond Precision Logic

### Why Nanoseconds?

Traditional billing (seconds/milliseconds) introduces rounding errors:
- 1 second billing: ₹50/hour → 50 * 1/3600 = 0.0138888...
- Rounds to ₹0.014 → Lost precision

**Nanosecond solution:**
```
1 second = 1,000,000,000 nanoseconds
Rate: ₹50/hour = 50 / 3,600,000,000,000 per nanosecond
Usage: 1000 nanoseconds = 50 / 3,600,000,000 = ₹0.0000000139 (precise!)
```

### Internal Representation
```javascript
// User input
ratePerHour = 50 // ₹

// Convert to per-nanosecond
const NANOSECONDS_PER_HOUR = 3600000000000n; // BigInt
ratePerNanosecond = BigInt(50e18) / BigInt(NANOSECONDS_PER_HOUR);

// Calculate cost for elapsed time
elapsedNanoseconds = 1000n;
cost = (elapsedNanoseconds * ratePerNanosecond) / 1e18n;
```

---

## 🌙 Dark/Light Mode

Click the theme toggle (☀️ / 🌙) in header to switch themes. Preference saved to localStorage.

---

## 🚨 Error Handling

### Common Issues

**"MetaMask not installed"**
→ Install MetaMask browser extension

**"MQTT connection refused"**
→ Start MQTT broker: `mosquitto` or use Docker

**"Insufficient balance"**
→ Add funds to your wallet via testnet faucet

**"Rate update failed"**
→ Backend may be offline. Check `npm run dev`

---

## 🤝 API Reference

### REST Endpoints

#### Session Management
```bash
POST   /api/session/create          # Create new session
GET    /api/session/:sessionId      # Get session details
PUT    /api/session/:sessionId/update   # Keep session alive
POST   /api/session/:sessionId/end  # End session
```

#### Usage & Settlement
```bash
POST   /api/usage/log               # Log consumption event
GET    /api/usage/:sessionId/stats  # Get usage statistics
POST   /api/usage/:sessionId/settle # Request settlement
GET    /api/usage/:sessionId/settlement-status/:id  # Check status
```

#### Authentication
```bash
POST   /api/auth/connect-wallet     # MetaMask connection
POST   /api/auth/verify-signature   # Verify signature
POST   /api/auth/gmail-login        # Gmail login
```

---

## 📝 Environment Variables

```
# Node.js
NODE_ENV=development
PORT=3000
HOST=localhost

# Blockchain
PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...
ETHERSCAN_API_KEY=...

# MQTT
MQTT_URL=mqtt://localhost:1883

# Web3
INFURA_API_KEY=...
ALCHEMY_API_KEY=...
```

---

## 🔮 Roadmap

- [ ] Mainnet deployment
- [ ] Multiple blockchain support
- [ ] Advanced analytics dashboard
- [ ] Mobile app
- [ ] Recurring payments
- [ ] SLA-based discounts
- [ ] AI pricing optimization
- [ ] Zero-knowledge proof settlement

---

## 📄 License

MIT License - See LICENSE file

---

## 🙋 Support

Issues? Questions? Open a GitHub issue or contact the team.

---

## 📚 Technical References

- **Solidity**: https://docs.soliditylang.org/
- **Hardhat**: https://hardhat.org/
- **Web3.js**: https://web3js.readthedocs.io/
- **Ethers.js**: https://docs.ethers.org/
- **MQTT**: https://mqtt.org/

---

**Built with ❤️ for true pay-as-you-go Web3 payments**

Last Updated: January 2026
