# 🚀 U2PAY - Quick Start Guide

## 📋 Prerequisites

- Node.js 16+ installed
- npm or yarn
- Git

## ⚡ 5-Minute Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your settings (optional for local testing)
```

### 3. Start Backend
```bash
npm run dev
```

Backend will start on `http://localhost:3000`

### 4. Open Frontend
```
Open u2pay.html in your browser
```

That's it! The app should now be running.

---

## 🎮 First-Time Usage

### Balance-Based Mode (Recommended for Testing)
1. Click "Connect MetaMask" (use testnet)
2. Select "💰 Balance-Based Streaming"
3. Enter max amount: **₹500**
4. Click "Set Limit"
5. Click "▶ Start Service"
6. Watch live balance tracking
7. Click "⏹ Stop Service"
8. Click "💸 Settle & Pay"

### Time-Based Mode
1. Connect wallet
2. Select "⏱️ Time-Based Precision Billing"
3. Enter rate: **₹50/hour**
4. Click "Set Rate"
5. Start service
6. Watch time tick (H:M:S)
7. Stop and settle

---

## 🔧 Commands Reference

### Development
```bash
npm run dev              # Start backend (with auto-reload)
npm run start            # Start backend (production)
npm test                 # Run tests
```

### Smart Contracts
```bash
npm run compile          # Compile contracts
npm run deploy           # Deploy to testnet
npx hardhat test         # Run contract tests
```

### IoT Simulator
```bash
npm run iot-simulator    # Start simulated devices
```

---

## 🌐 Network Configuration

### For Sepolia Testnet
1. Get testnet ETH: https://sepolia-faucet.pk910.de/
2. Update `.env`:
   ```
   SEPOLIA_RPC_URL=your_url
   PRIVATE_KEY=your_key
   ```
3. Deploy: `npm run deploy`

### For Local Hardhat Network
```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Deploy to local
npx hardhat run scripts/deploy.js --network localhost

# Terminal 3: Start backend
npm run dev
```

---

## 📱 MetaMask Setup

1. Install MetaMask browser extension
2. Create wallet or import existing
3. Add Sepolia testnet:
   - Network: Sepolia
   - RPC: https://sepolia.infura.io/v3/YOUR_KEY
   - Chain ID: 11155111
4. Get testnet ETH from faucet

---

## 🐛 Troubleshooting

### "MetaMask not installed"
→ Install MetaMask extension

### "Cannot find module 'mqtt'"
→ Run `npm install`

### "ECONNREFUSED on localhost:3000"
→ Start backend with `npm run dev`

### "Spending limit not working"
→ Refresh browser (hard refresh: Ctrl+Shift+R)

### "Dark mode not saving"
→ Check browser localStorage is enabled

---

## 📊 Testing the System

### Test Balance-Based Streaming
```bash
# In browser console
app.setMaxAmount();  // Set to ₹500
app.startService();  // Start billing
// Wait 5 seconds
app.stopService();   // Stop and check amount spent
```

### Test Time-Based Streaming
```bash
app.setTimeRate();   // Set ₹50/hour
app.startService();  // Start billing
// Wait 10 seconds
app.stopService();   // Check elapsed time = 0h 0m 10s
```

### Test IoT Simulator
```bash
npm run iot-simulator
# In another terminal
curl http://localhost:3000/api/health
# Should show status: ok
```

---

## 📚 Documentation

- **Full README**: [README.md](README.md)
- **API Docs**: See backend/routes/
- **Smart Contracts**: See contracts/
- **IoT Setup**: See iot-simulator/

---

## 💡 Key Concepts

### Nanosecond Precision
- All calculations done in nanoseconds (1 second = 1 billion ns)
- No rounding errors in billing
- Accurate to billionths of a second

### No Overpayment Guarantee
- Smart contracts reject any payment > usage
- User can only pay what they actually consumed

### Fiat-First UX
- Users input ₹, $, €
- System converts to crypto internally
- User never sees crypto amounts

---

## 🔐 Security Notes

⚠️ **For Local Testing Only**
- Do NOT use real private keys in .env
- Do NOT commit .env to git
- Use testnet only (Sepolia)

---

## 🤝 Need Help?

1. Check [README.md](README.md) for detailed docs
2. Review smart contracts in `/contracts/`
3. Check backend logs in terminal
4. Open browser dev tools (F12) for frontend logs

---

**Happy streaming! 🎉**
