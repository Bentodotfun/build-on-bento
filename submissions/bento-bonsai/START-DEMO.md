# 🚀 Start Bento Bonsai Demo

## Quick Start (2 Commands)

### 1. Backend (Terminal 1)
```bash
npm run server
```
**URL:** http://localhost:3001

---

### 2. Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
**URL:** http://localhost:3000

---

## ✅ What's Working Now

### Frontend Features:
- ✅ **Welcome screen** - Clean Apple-inspired design
- ✅ **Forest page** - Animated Bonsai tree with growth
- ✅ **Play page** - Quiz interface
- ✅ **Bottom navigation** - 4 tabs (Forest, Play, Clubs, Profile)
- ✅ **Wallet connect** - Simple MetaMask integration (no wagmi issues)
- ✅ **Animations** - Framer Motion tree growth

### Backend Features:
- ✅ **11 API endpoints** working
- ✅ **Real Bento market data** via SDK
- ✅ **Strategy engine** (convergence + arbitrage)
- ✅ **Vault contract** (Solidity, ready to deploy)

---

## 🎮 Demo Flow

1. **Open http://localhost:3000**
   - See welcome screen with 🌸 logo

2. **Click "Start Growing"**
   - Navigate to Forest page
   - See animated Bonsai tree (SVG)
   - Click "Connect Wallet" in top right

3. **Connect MetaMask**
   - Signs message for Bento auth
   - Backend verifies + logs in
   - Shows wallet address

4. **Click "Play"**
   - See quiz question
   - Select YES or NO
   - Confirm answer
   - (Will add growth animation next)

---

## 🔧 What to Add Next (If Time)

### High Priority:
1. **Growth animation** after correct answer
2. **Real questions** from backend `/api/markets`
3. **Profile page** with stats
4. **Clubs page** placeholder

### Contract Deployment:
```bash
# Deploy to Base Sepolia (or any EVM testnet)
# Needs: Hardhat/Foundry setup
# Contract: contracts/BenSpreadVault.sol
```

---

## 🎨 Design Check

✅ No trading jargon  
✅ Clean Apple aesthetic  
✅ One CTA per screen  
✅ Generous spacing  
✅ Soft animations  
✅ Forest color palette  

---

## 📝 Judge Demo Script (90 seconds)

**Show Welcome (10s)**
> "This is Bento Bonsai. Users grow a tree by answering historical prediction questions."

**Show Forest (15s)**
> "Clean interface. Animated Bonsai. Level 1 now, grows as they play. No charts, no trading terms."

**Connect Wallet (10s)**
> "Simple MetaMask auth. Signs message, backend verifies."

**Show Quiz (15s)**
> "One question. Clean. YES/NO. That's it. User doesn't know they're interacting with prediction markets."

**Show Backend (20s)**
> Terminal: `npm run server`  
> "Behind the scenes: scanning 200+ markets on Bento and Polymarket. Finding 99%+ probability bets. Arbitrage across platforms."

**Show Code (15s)**
> Open `server/api.js`  
> "Real Bento SDK integration. 11 API endpoints. Vault contract ready to deploy."

**Closing (5s)**
> "Users play a game. We extract value from prediction markets. That's Bento Bonsai."

---

## 🐛 Known Issues

- Tailwind colors work via CSS variables (not direct classes yet)
- No dark mode support
- Clubs and Profile pages are placeholders
- Growth animation not implemented yet
- Questions are still hardcoded (easy fix)

---

## 🎯 Hackathon Status

**Built in 4 hours:**
- Full backend with real data
- Beautiful frontend
- Wallet integration
- Strategy engine
- Vault contract

**Still needs (~2 hours):**
- Deploy contract to testnet
- Connect real questions
- Growth animation
- Polish profile/clubs

**Demo-ready?** ✅ YES

Show the flow, explain the backend, judges will understand the vision.

---

## 🚨 Emergency Commands

**Kill processes:**
```bash
# Find process on port
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill by PID
taskkill /PID <PID> /F
```

**Restart everything:**
```bash
# Backend
npm run server

# Frontend
cd frontend
npm run dev
```

---

**Ready to demo! 🌸**
