# 🚀 Test Bento Bonsai NOW

## ✅ Both Servers Running

- **Backend:** http://localhost:3001 ✅
- **Frontend:** http://localhost:3000 ✅

---

## 🎮 Quick Test Flow (2 minutes)

### 1. Open Frontend
```
http://localhost:3000
```

### 2. Click "Start Growing"
- Goes to `/forest` page
- See animated Bonsai tree
- Shows Level 1, $0.00 gains, 0 tries left

### 3. Add Stake
- Click "Add More Tries" button
- Enter 100 (USDC)
- Click "Stake"
- Should see: "100 tries remaining"

### 4. Play Quiz
- Click "Play" button (or "Stake to Play" if needed)
- Goes to `/play` page
- See real question from backend
- Select YES or NO
- Click "Confirm"
- See result (🎉 Correct or 🍂 Not quite)
- Auto-advances to next question after 2 seconds

### 5. Answer 5+ Questions
- Just keep answering
- Questions loop infinitely
- Watch score change
- Check "Question X of 20" counter

### 6. Check Tree Growth
- Click "Forest" tab (bottom nav)
- See updated score (e.g., $12.50)
- See tree at higher level if profitable
- More branches/flowers

### 7. View Logs
- Click "Logs" tab (bottom nav)
- See all your trades
- Check profit/loss per trade
- See total P&L, win rate, total trades

### 8. Check Profile
- Click "Profile" tab (bottom nav)
- See your level
- Check win rate
- View achievements (some unlocked)

---

## 🎯 What to Verify

### Staking System:
- [ ] Can deposit USDC
- [ ] Tries = staked amount
- [ ] "Tries remaining" decreases with each question
- [ ] Can't play with 0 tries
- [ ] Deposit logged in Logs page

### Quiz Flow:
- [ ] Real questions load from backend
- [ ] Can select YES/NO
- [ ] Result shows immediately
- [ ] Score updates correctly
- [ ] Auto-advances to next question
- [ ] Stays on /play page (no redirect)
- [ ] Questions loop after 20

### Tree Growth:
- [ ] Level increases with profit
- [ ] More branches at higher levels
- [ ] More flowers appear
- [ ] Stats update on Forest page

### Logs Page:
- [ ] All trades visible
- [ ] Shows market name, side, profit
- [ ] Timestamp for each trade
- [ ] Stats cards show totals
- [ ] Win rate calculated correctly

### Profile:
- [ ] Shows level, tries, score
- [ ] Win rate matches Logs
- [ ] Achievements unlock progressively

---

## 🐛 Known Behaviors (Not Bugs)

1. **First load slow:** Backend fetches real Bento markets (~3-5 seconds)
2. **No real wallet:** MetaMask connect won't work yet (just shows button)
3. **Resolved markets:** Backend marks expired markets as resolved
4. **Simulated outcomes:** YES if price > 0.5, NO otherwise
5. **Paper trading:** All money is virtual, stored in localStorage

---

## 🔥 Quick Reset (If Needed)

### Clear all data:
```javascript
// In browser console (F12)
localStorage.clear()
location.reload()
```

### Restart servers:
```bash
# Kill and restart backend
npm run server

# Kill and restart frontend
cd frontend
npm run dev
```

---

## 📊 Expected Results

After playing 10 questions with random answers:
- **Score:** ~$0-$50 (depends on wins/losses)
- **Level:** 1-3
- **Win Rate:** ~40-60%
- **Tries Used:** 10
- **Logs:** 10 trades + 1 deposit = 11 entries

If you get 100% correct (unlikely):
- **Score:** ~$150-200
- **Level:** 8-10
- **Branches:** 16-20
- **Flowers:** 6-8

---

## 🎨 UI Check

- Clean Apple aesthetic ✅
- No trading jargon ✅
- One CTA per screen ✅
- Smooth animations ✅
- Bottom nav works ✅
- Generous spacing ✅
- Forest color palette ✅

---

## 🚨 If Something Breaks

### Backend errors?
```bash
# Check backend logs
http://localhost:3001/api/health
```

### Frontend errors?
```bash
# Check browser console (F12)
# Look for network errors
```

### Markets not loading?
- Backend takes ~5 seconds to fetch Bento markets
- Check network tab: GET http://localhost:3001/api/markets
- Should return ~200 markets

### Questions not showing?
- Backend needs to return markets with `resolved: true`
- Check response has `outcome` field
- Frontend filters for resolved markets only

---

## ✨ Demo-Ready Features

1. **Beautiful UI** - Apple × Duolingo aesthetic
2. **Real data** - Fetches from Bento API
3. **Working game loop** - Stake → Play → Win → Grow
4. **Trading logs** - Full history with P&L
5. **Paper trading** - Safe simulation mode
6. **Infinite questions** - Never ends
7. **Tree growth** - Visual rewards

---

## 🎤 Judge Demo Script

**Show welcome (5s)**
> "Clean. Minimal. This is Bento Bonsai."

**Stake 100 USDC (10s)**
> "User stakes USDC, gets tries. 1 USDC = 1 question."

**Play 3 questions (30s)**
> "Historical prediction questions. Clean interface. No trading terminology."

**Show tree growth (10s)**
> "Tree grows with profit. Visual reward. Level up system."

**Show logs (15s)**
> "Behind the scenes: paper trading on real markets. Each answer is a simulated trade."

**Explain backend (15s)**
> "Backend scanning 200+ Bento markets. Finding opportunities. Simulating outcomes."

**Closing (5s)**
> "Users grow a tree. We extract value from prediction markets."

**Total: 90 seconds** ✅

---

## 🎯 Current Status

- ✅ All 6 issues fixed
- ✅ Staking system working
- ✅ Real questions from backend
- ✅ Infinite quiz loop
- ✅ Tree grows with gains
- ✅ Trading history page
- ✅ Profile with stats
- ✅ Paper trading mode
- ✅ Beautiful UI

**Ready to test and demo! 🌸**

---

Open http://localhost:3000 and start testing!
