# Ben-Spread Backend Setup Guide

## 🎯 What's Been Built

### Backend Infrastructure Complete ✅
1. **Wallet Authentication** - WalletConnect integration with Bento SDK
2. **Vault Contract Interface** - Staking pool management
3. **REST API Server** - Express endpoints for frontend
4. **Smart Contract** - ERC4626-style vault (Solidity)

---

## 📁 New File Structure

```
benspread/
├── server/
│   ├── api.js                 ← Express REST API server
│   ├── auth.js                ← Wallet auth + Bento login
│   └── vault-contract.js      ← Vault contract interface
├── contracts/
│   └── BenSpreadVault.sol     ← Solidity vault contract
├── src/                       ← Existing strategy engine
└── package.json               ← Updated with new dependencies
```

---

## 🚀 Running the Backend

### 1. Start the API Server

```bash
npm run server
```

**Output:**
```
🚀 Ben-Spread API Server running on http://localhost:3001

📡 Endpoints:
   POST   /api/auth/login
   GET    /api/auth/session/:address
   GET    /api/portfolio/:address
   GET    /api/vault/stats
   GET    /api/vault/performance
   GET    /api/vault/position/:address
   POST   /api/vault/deposit/prepare
   POST   /api/vault/withdraw/prepare
   GET    /api/markets
   GET    /api/opportunities
   GET    /api/health

✅ Ready for frontend connections
```

### 2. Test Health Check

```bash
curl http://localhost:3001/api/health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": 1735968000000,
  "sessions": 0
}
```

---

## 🔐 Authentication Flow

### Frontend → Backend → Bento

```javascript
// 1. Frontend: User signs message with wallet
const timestamp = Date.now().toString();
const message = `Bento.fun Login\nTimestamp: ${timestamp}\nWallet: ${address}`;
const signature = await signer.signMessage(message);

// 2. Frontend: POST to backend
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address, signature, timestamp }),
});

const { token, isNewUser } = await response.json();
// ↑ JWT token for Bento API calls

// 3. Frontend: Store token, use for subsequent requests
localStorage.setItem('bentoToken', token);
localStorage.setItem('walletAddress', address);
```

---

## 📡 API Endpoints Reference

### Authentication

#### `POST /api/auth/login`
Login or register a wallet with Bento.

**Request:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x...",
  "timestamp": "1735968000000"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "isNewUser": false
}
```

#### `GET /api/auth/session/:address`
Check if user has active session.

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "address": "0x...",
  "loginTime": 1735968000000
}
```

---

### User Portfolio

#### `GET /api/portfolio/:address`
Get user's Bento portfolio (requires active session).

**Response:**
```json
{
  "success": true,
  "portfolio": {
    "usdcBalance": "1000.50",
    "creditsBalance": "500.25",
    "positions": [...],
    "pnl": "+150.75"
  }
}
```

---

### Vault Operations

#### `GET /api/vault/stats?address=0x...`
Get vault statistics, optionally with user position.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalAssets": "10000.0",
    "totalSupply": "10000.0",
    "userShares": "100.0",
    "userBalance": "105.5",
    "sharePrice": "1.055"
  }
}
```

#### `GET /api/vault/performance`
Get vault performance metrics.

**Response:**
```json
{
  "success": true,
  "performance": {
    "apy": "67.0",
    "tvl": "10000.0",
    "weeklyReturn": "1.2",
    "monthlyReturn": "5.4",
    "winRate": "94.1",
    "strategyBreakdown": {
      "convergence": { "allocation": 60, "apy": "58.0" },
      "arbitrage": { "allocation": 40, "apy": "82.0" }
    }
  }
}
```

#### `GET /api/vault/position/:address`
Get user's vault position details.

**Response:**
```json
{
  "success": true,
  "position": {
    "deposited": "100.0",
    "shares": "100.0",
    "currentValue": "105.5",
    "shareOfPool": "1.0000",
    "estimatedApy": "67.0"
  }
}
```

#### `POST /api/vault/deposit/prepare`
Prepare deposit transaction (returns tx data for frontend to sign).

**Request:**
```json
{
  "amount": "100.0"
}
```

**Response:**
```json
{
  "success": true,
  "txData": {
    "approvalTx": { "to": "0x...", "data": "0x..." },
    "depositTx": { "to": "0x...", "data": "0x..." },
    "amount": "100.0",
    "amountWei": "100000000000000000000"
  }
}
```

#### `POST /api/vault/withdraw/prepare`
Prepare withdrawal transaction.

**Request:**
```json
{
  "shares": "50.0"
}
```

**Response:**
```json
{
  "success": true,
  "txData": {
    "to": "0x...",
    "data": "0x...",
    "shares": "50.0",
    "sharesWei": "50000000000000000000"
  }
}
```

---

### Markets & Opportunities

#### `GET /api/markets?address=0x...`
Get all markets (Bento + Polymarket).

**Response:**
```json
{
  "success": true,
  "bento": [...],
  "polymarket": [...],
  "realPolyData": true,
  "total": 75
}
```

#### `GET /api/opportunities`
Get convergence and arbitrage opportunities.

**Response:**
```json
{
  "success": true,
  "convergence": [
    {
      "market": { "title": "...", "yesPrice": 0.997 },
      "estimatedYield": 0.30,
      "holdingTimeHours": 14.2
    }
  ],
  "arbitrage": [
    {
      "pair": { "poly": {...}, "bento": {...} },
      "profitPct": 3.09
    }
  ],
  "counts": { "convergence": 8, "arbitrage": 5 }
}
```

---

## 💰 Vault Contract

### Contract Address (After Deployment)
```
Testnet: 0x... (deploy first)
Mainnet: TBD
```

### Key Functions

**User Functions:**
```solidity
function deposit(uint256 assets) external returns (uint256 shares)
function withdraw(uint256 shares) external returns (uint256 assets)
function balanceOf(address user) external view returns (uint256)
```

**View Functions:**
```solidity
function totalAssets() public view returns (uint256)
function sharePrice() external view returns (uint256)
function getUserPosition(address user) external view returns (shares, assets, shareOfPool)
```

**Manager Functions:**
```solidity
function managerWithdraw(uint256 amount) external onlyManager
function managerDeposit(uint256 amount, uint256 profit) external onlyManager
function reportValue(uint256 currentValue) external onlyManager
```

---

## 🔧 Environment Variables

Add to `.env`:

```bash
# Existing
BENTO_BUILDER_API_KEY=bnt_live_8c06f172_d953f596b7d1ff1c98c0dcf9
BENTO_URL=https://internal-server.bento.fun

# New (for backend)
PORT=3001
VAULT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
USDC_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
RPC_URL=https://bsc-dataseed.binance.org
```

---

## 📦 Deploying the Vault Contract

### Option 1: Hardhat (Quick)

```bash
# Install Hardhat
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts

# Create hardhat config
npx hardhat init

# Deploy script
npx hardhat run scripts/deploy.js --network bscTestnet
```

### Option 2: Remix (Easiest for Hackathon)

1. Go to https://remix.ethereum.org
2. Create new file: `BenSpreadVault.sol`
3. Copy contract from `contracts/BenSpreadVault.sol`
4. Compile (Solidity 0.8.20+)
5. Deploy:
   - `_asset`: USDC token address (BSC testnet: `0x...`)
   - `_initialOwner`: Your wallet address
   - `_manager`: Backend wallet address
6. Copy deployed contract address → update `.env`

### Option 3: Foundry (Advanced)

```bash
forge create BenSpreadVault \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $USDC_ADDRESS $OWNER_ADDRESS $MANAGER_ADDRESS
```

---

## 🧪 Testing the Backend

### 1. Test Authentication

```bash
# Start server
npm run server

# In another terminal, test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "signature": "0x...",
    "timestamp": "1735968000000"
  }'
```

### 2. Test Markets

```bash
curl http://localhost:3001/api/markets
```

### 3. Test Opportunities

```bash
curl http://localhost:3001/api/opportunities
```

### 4. Test Vault Stats

```bash
curl http://localhost:3001/api/vault/stats
```

---

## 🎨 Frontend Integration Points

### 1. WalletConnect Button
```typescript
import { useAccount, useSignMessage } from 'wagmi';

const { address } = useAccount();
const { signMessageAsync } = useSignMessage();

async function login() {
  const timestamp = Date.now().toString();
  const message = `Bento.fun Login\nTimestamp: ${timestamp}\nWallet: ${address}`;
  const signature = await signMessageAsync({ message });
  
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, timestamp }),
  });
  
  const { token } = await res.json();
  localStorage.setItem('bentoToken', token);
}
```

### 2. Vault Deposit
```typescript
async function deposit(amount: string) {
  // 1. Prepare transaction
  const res = await fetch('http://localhost:3001/api/vault/deposit/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  
  const { txData } = await res.json();
  
  // 2. Send approval tx
  const approvalHash = await writeContract({
    ...txData.approvalTx,
  });
  await waitForTransaction({ hash: approvalHash });
  
  // 3. Send deposit tx
  const depositHash = await writeContract({
    ...txData.depositTx,
  });
  await waitForTransaction({ hash: depositHash });
  
  // 4. Refresh UI
  refreshVaultStats();
}
```

### 3. Display Markets
```typescript
const { data: markets } = useSWR(
  address ? `http://localhost:3001/api/markets?address=${address}` : null,
  fetcher,
  { refreshInterval: 30000 } // 30s
);

return (
  <div>
    <h2>Bento Markets ({markets.bento.length})</h2>
    {markets.bento.map(m => <MarketCard key={m.id} market={m} />)}
    
    <h2>Polymarket ({markets.polymarket.length})</h2>
    {markets.polymarket.map(m => <MarketCard key={m.id} market={m} />)}
  </div>
);
```

---

## 🚀 Next Steps

### For Hackathon Demo (Today):
1. ✅ Backend API running
2. ⏳ Deploy vault contract to testnet
3. ⏳ Build minimal frontend (Next.js + wagmi)
4. ⏳ Connect wallet + display markets
5. ⏳ Show vault deposit/withdraw UI

### Post-Hackathon (Production):
1. Add database (PostgreSQL) for session persistence
2. Implement Redis for caching
3. Add WebSocket for real-time updates
4. Deploy API to cloud (Railway, Render, etc.)
5. Audit vault contract
6. Deploy to mainnet

---

## 📝 Quick Command Reference

```bash
# Start CLI demo (existing)
npm start

# Start backend API
npm run server

# Test backend health
curl http://localhost:3001/api/health

# Deploy contract (after hardhat setup)
npx hardhat run scripts/deploy.js --network bscTestnet
```

---

**Backend is complete! Ready for frontend scaffolding.** 🚀
