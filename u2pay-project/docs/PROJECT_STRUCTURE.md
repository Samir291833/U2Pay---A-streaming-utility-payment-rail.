# U2PAY Project Structure

## Overview
This document describes the reorganized project structure after consolidation. All files have been organized into logical functional directories at the root level.

## Root Level Files
```
u2pay-project/
├── package.json                 # NPM dependencies and project metadata
├── hardhat.config.js            # Hardhat blockchain configuration
├── README.md                    # Project README
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
```

## Main Directories

### `/frontend` - Frontend Application (HTML/CSS/JavaScript)
User-facing UI components and application logic.

```
frontend/
├── index.html                   # 🎯 Main application entry point (3-panel layout)
├── styles/
│   └── style.css               # Main stylesheet (dark/light themes)
├── auth/
│   └── wallet.js               # MetaMask wallet connection & account management
├── components/
│   ├── streaming.js            # StreamingEngine for real-time payment tracking
│   └── uiUpdater.js            # Live UI updates, notifications, animations
├── utils/
│   ├── app.js                  # U2PAYApp class (core application logic, billing, auth)
│   ├── websocketClient.js      # WebSocket client for backend communication
│   └── fiatConversion.js       # Fiat ↔ Crypto conversion manager
├── pages/
│   ├── docs.html               # Documentation & FAQ page
│   ├── scanner.html            # Blockchain address safety scanner
│   └── scanner.js              # Scanner address risk assessment logic
└── assets/
    ├── icons/                  # SVG/PNG icons
    ├── images/                 # Images
    └── sounds/                 # Audio files
```

**Key Frontend Features:**
- Wallet connection via MetaMask
- Real-time payment streaming with nanosecond precision
- Spending cap enforcement (universal + session)
- Fiat-to-crypto conversion
- Address safety scanning
- WebSocket live updates
- Gmail authentication support

---

### `/backend` - Backend Server (Node.js/Express)
REST API and real-time communication server.

```
backend/
├── server.js                    # 🎯 Main Express server (routes setup, WebSocket)
├── routes/
│   ├── auth.js                 # Authentication endpoints
│   ├── session.js              # Session management endpoints
│   └── usage.js                # Usage tracking endpoints
├── services/
│   ├── nanosecondEngine.js     # Nanosecond-precision billing calculations
│   ├── rateService.js          # Exchange rate management
│   └── settlementService.js    # Payment settlement logic
├── utils/
│   ├── iotBridge.js            # MQTT bridge for IoT device communication
│   ├── device.js               # Simulated device & fleet manager (for testing)
├── middleware/                 # Express middleware (auth, logging, etc.)
├── controllers/                # Route handlers (if separated from routes)
└── config/                     # Backend configuration files
```

**Key Backend Features:**
- REST API for authentication, sessions, and usage tracking
- WebSocket server for real-time updates
- MQTT bridge for IoT device integration
- Nanosecond-precision billing engine
- Rate and settlement services
- Device simulation and fleet management

---

### `/contracts` - Smart Contracts (Solidity)
Blockchain contracts for Web3 integration.

```
contracts/
├── U2Pay.sol                    # Main U2PAY contract
├── StreamingPayment.sol         # Streaming utility contract
├── Conversion.sol               # Fiat-to-crypto conversion contract
├── Settlement.sol               # Payment settlement contract
├── RateNormalizer.sol           # Exchange rate normalization
├── AccessControl.sol            # Role-based access control
└── interfaces/                  # Contract interfaces/ABIs
```

---

### `/scripts` - Build & Deployment Scripts
Automation scripts for deployment and setup.

```
scripts/
├── deploy.js                    # Hardhat contract deployment script
└── verify-setup.js             # Project setup verification
```

---

### `/config` - Configuration Files
Application configuration (environment-specific).

```
config/
├── env.js                       # Environment variables loader
├── network.js                   # Blockchain network configuration
└── constants.js                # Application constants
```

---

### `/docs` - Documentation
Comprehensive documentation and guides.

```
docs/
├── INDEX.md                     # Documentation index
├── START_HERE.md                # Quick start guide
├── QUICKSTART.md                # Setup and deployment guide
├── ARCHITECTURE.md              # System architecture overview
├── SERVICE_COST_IMPLEMENTATION.md # Billing system documentation
├── SYSTEM_REQUIREMENTS.md       # Environment requirements
├── PROJECT_STRUCTURE.md         # This file
├── VERIFICATION.md              # Setup verification checklist
├── FINAL_SUMMARY.md             # Project completion summary
├── DEBUG_AND_TEST.md            # Testing and debugging guide
└── [20+ other documentation files]
```

---

### `/public` - Static Assets
Static files served by the backend.

```
public/
└── iot-config.json             # IoT device configuration
```

---

### `/test` - Test Suite
Test files for backend and contracts.

```
test/
└── [test files]
```

---

## Technology Stack

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling (dark/light themes)
- **Vanilla JavaScript** - No frameworks
- **MetaMask** - Wallet integration
- **WebSocket** - Real-time updates

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **MQTT** - IoT communication
- **WebSocket (ws)** - Real-time messaging

### Blockchain
- **Solidity** - Smart contracts
- **Hardhat** - Contract deployment and testing
- **Ethereum** - Blockchain network

### Database
- **localStorage** (browser) - Client-side session data
- **JSON** - Configuration files

---

## Import Path Summary

### Frontend Scripts (from index.html)
```html
<link rel="stylesheet" href="styles/style.css">
<script src="auth/wallet.js"></script>
<script src="components/streaming.js"></script>
<script src="utils/fiatConversion.js"></script>
<script src="components/uiUpdater.js"></script>
<script src="utils/websocketClient.js"></script>
<script src="utils/app.js"></script>
```

### Backend Services (from server.js)
```javascript
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const usageRoutes = require('./routes/usage');
const rateService = require('./services/rateService');
const nanosecondEngine = require('./services/nanosecondEngine');
const settlementService = require('./services/settlementService');
const iotBridge = require('./utils/iotBridge');
```

---

## Directory Creation & File Organization

**Date Completed:** January 19, 2026

**Files Moved:** 110+ files
- HTML files → `/frontend/` (with subdirectories)
- CSS files → `/frontend/styles/`
- JavaScript files → `/frontend/` (organized by function: auth/, components/, utils/)
- Backend services → `/backend/` (consolidated from mqtt/ and services/)
- Smart contracts → `/contracts/` (renamed to standard naming)
- Documentation → `/docs/` (all .md files)
- Configuration → `/public/iot-config.json`
- Scripts → `/scripts/`

**Duplicates Removed:** u2pay.html (kept index.html as canonical)

**Import Paths Updated:**
- ✅ frontend/index.html - CSS and script references
- ✅ frontend/pages/scanner.html - CSS and script references
- ✅ frontend/pages/docs.html - Navigation links
- ✅ backend/server.js - iotBridge import path

---

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Set Environment Variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Backend Server:**
   ```bash
   node backend/server.js
   ```

4. **Open Frontend:**
   - Point browser to `http://localhost:3000` (or configured port)
   - Or open `frontend/index.html` directly

5. **Deploy Smart Contracts:**
   ```bash
   npx hardhat run scripts/deploy.js --network [network-name]
   ```

See `/docs/START_HERE.md` for detailed setup instructions.

---

## File Organization Principles

1. **Functional Grouping** - Files organized by purpose (auth, components, utils)
2. **Clear Hierarchy** - Root level contains only main directories
3. **No Duplicates** - Single source of truth for each file
4. **Relative Paths** - All imports use relative paths for portability
5. **Standard Naming** - Consistent file naming conventions (camelCase for JS, kebab-case for HTML)

---

## Next Steps

- Update build tools if necessary
- Add automated testing
- Configure CI/CD pipeline
- Add pre-commit hooks for code quality

