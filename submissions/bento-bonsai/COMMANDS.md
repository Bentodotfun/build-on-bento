# Ben-Spread - Quick Command Reference

## 🚀 Running the System

### Backend API Server
```bash
npm run server
```
Starts Express API on `http://localhost:3001`

**Includes:**
- Wallet authentication (WalletConnect + Bento SDK)
- Vault contract interface
- Markets & opportunities endpoints
- Real Polymarket data (when authenticated)

---

### CLI Strategy Engine (Demo)
```bash
npm start
```
Runs the original paper-trading dashboard in terminal

---

### Development Mode (Auto-reload)
```bash
npm run server:dev
```
API server with hot-reload on file changes

---

## 🧪 Testing

### Test Backend API
```bash
# Start server first
npm run server

# In another terminal
node test-backend.js
```

### Test Components
```bash
npm test
```

### Test Scanner
```bash
node src/scanner-test.js
```

### Test Connectivity
```bash
npm run test:connect
```

---

## 📡 API Endpoints

Base URL: `http://localhost:3001`

### Authentication
```bash
# Login (POST)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","signature":"0x...","timestamp":"..."}'

# Check session (GET)
curl http://localhost:3001/api/auth/session/0x...
```

### Markets & Opportunities
```bash
# Get all markets
curl http://localhost:3001/api/markets

# Get opportunities
curl http://localhost:3001/api/opportunities
```

### Vault
```bash
# Get vault stats
curl http://localhost:3001/api/vault/stats

# Get performance
curl http://localhost:3001/api/vault/performance

# Get user position
curl http://localhost:3001/api/vault/position/0x...

# Prepare deposit
curl -X POST http://localhost:3001/api/vault/deposit/prepare \
  -H "Content-Type: application/json" \
  -d '{"amount":"100.0"}'
```

### Health Check
```bash
curl http://localhost:3001/api/health
```

---

## 📦 Installing Dependencies

### First Time Setup
```bash
npm install
```

### Add New Dependency
```bash
npm install <package-name>
```

---

## 🔧 Environment Variables

Located in `.env`:

```bash
# Bento SDK
BENTO_BUILDER_API_KEY=bnt_live_8c06f172_d953f596b7d1ff1c98c0dcf9
BENTO_URL=https://internal-server.bento.fun

# Backend API
PORT=3001

# Vault Contract (after deployment)
VAULT_CONTRACT_ADDRESS=0x...
USDC_TOKEN_ADDRESS=0x...
RPC_URL=https://bsc-dataseed.binance.org
```

---

## 🏗️ Project Structure

```
benspread/
├── src/                      # Strategy engine (CLI demo)
│   ├── index.js             # Main orchestration loop
│   ├── scanner.js           # Market scanning
│   ├── vault.js             # Capital management
│   ├── settlement.js        # Settlement monitor
│   ├── dashboard.js         # CLI rendering
│   └── strategies/
│       ├── convergence.js   # Strategy A
│       └── arbitrage.js     # Strategy B
├── server/                   # Backend API (NEW)
│   ├── api.js               # Express server
│   ├── auth.js              # Wallet auth
│   └── vault-contract.js    # Vault interface
├── contracts/                # Smart contracts (NEW)
│   └── BenSpreadVault.sol   # Staking vault
├── test-*.js                # Test scripts
├── .env                     # Environment config
└── package.json             # Dependencies & scripts
```

---

## 🎯 Common Workflows

### 1. Demo the CLI (Existing)
```bash
npm start
```
Shows paper-trading dashboard with simulated strategies

### 2. Run Backend for Frontend
```bash
# Terminal 1: Start API
npm run server

# Terminal 2: Test it works
node test-backend.js

# Terminal 3: Build frontend (Next.js)
cd frontend && npm run dev
```

### 3. Deploy Vault Contract
```bash
# Option 1: Remix (easiest)
# Go to https://remix.ethereum.org
# Copy contracts/BenSpreadVault.sol
# Deploy to BSC testnet

# Option 2: Hardhat
npx hardhat run scripts/deploy.js --network bscTestnet

# Update .env with deployed address
VAULT_CONTRACT_ADDRESS=0x...
```

### 4. Test Authentication Flow
```bash
# 1. Start server
npm run server

# 2. Frontend connects wallet & signs message
# (WalletConnect or wagmi in React)

# 3. Frontend sends to POST /api/auth/login
# 4. Backend verifies signature & calls Bento SDK
# 5. Returns JWT token for authenticated calls
```

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3001 is in use
lsof -ti:3001 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :3001   # Windows

# Or change port in .env
PORT=3002
```

### "Module not found" errors
```bash
npm install
```

### API returns errors
```bash
# Check .env file exists with correct keys
cat .env

# Verify Bento API key works
npm run test:connect
```

### No Polymarket data
```bash
# Polymarket requires wallet auth
# Pass ?address=0x... to /api/markets
# Backend will fetch real data if authenticated
```

---

## 📚 Documentation

- **SPEC.md** - Full technical specification
- **README.md** - Project overview & quick start
- **BACKEND-SETUP.md** - Backend API guide
- **DEMO.md** - Hackathon presentation guide
- **DATA-SOURCE-REPORT.md** - What's real vs hardcoded
- **COMPLETION-SUMMARY.md** - Build status report

---

## 🚀 Next Steps

### For Hackathon (Today):
1. ✅ Backend API complete
2. ⏳ Deploy vault contract
3. ⏳ Build frontend (Next.js + wagmi)
4. ⏳ Connect WalletConnect
5. ⏳ Test deposit/withdraw flow

### Frontend Tech Stack Recommendation:
```bash
# Initialize Next.js app
npx create-next-app@latest frontend

# Install Web3 libs
cd frontend
npm install wagmi viem @rainbow-me/rainbowkit
npm install swr axios

# Connect to backend
# Set API URL: http://localhost:3001
```

---

## 💡 Pro Tips

1. **Keep CLI demo running** for visual reference while building frontend
2. **Test backend endpoints** with curl before frontend integration
3. **Use mock vault data** (no contract needed) for initial frontend dev
4. **Deploy contract last** - frontend can work without it initially
5. **SWR for data fetching** - auto-refreshes markets/opportunities

---

**Everything is ready! Just need to scaffold the frontend now.** 🎨🚀
