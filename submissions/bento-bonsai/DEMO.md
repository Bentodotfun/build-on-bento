# Ben-Spread Demo Guide

## Pre-Demo Checklist

- [ ] `.env` file configured with API key
- [ ] Dependencies installed (`npm install`)
- [ ] Test run completed (`npm test`)
- [ ] Terminal window maximized for dashboard visibility

---

## Running the Demo

### Step 1: Start Ben-Spread
```bash
npm start
```

### Step 2: What Happens

**Cycle 1 (First 30 seconds):**
1. Seeds 5 historical settlements (shows realistic past performance)
2. Scans ~60 Bento markets + 13 demo Polymarket markets
3. Finds 5 convergence opportunities (YES ≥ 0.99)
4. Finds 5 arbitrage pairs (Poly/Bento mispricings)
5. Allocates $6000 to best convergence bet
6. Allocates $4000 to best arbitrage pair
7. Renders dashboard

**Cycle 2 (30 seconds later):**
1. Checks settlements (none yet, too soon)
2. Re-scans markets
3. Finds more opportunities
4. Allocates remaining capital
5. Updates dashboard

**Cycle 3+ (every 30 seconds):**
- Positions start settling (paper trading simulation)
- Capital is freed and reallocated
- Metrics update (win rate, returns, APY)

---

## Dashboard Walkthrough

### Top Section: Vault Metrics
```
Total Value:     $10,450.23  ← Growing from initial $10,000
Total Return:    +4.50%      ← Overall performance
Available Cash:  $2,100.00   ← Unallocated capital
Allocated:       $8,350.23   ← Capital in active positions
Open Positions:  12          ← Currently active
Win Rate:        94.1%       ← High win rate (near-certainty bets)
Estimated APY:   ~67%        ← Annualized yield
```

### Strategy Breakdown
```
Convergence (60%): $6,300 allocated | 8 positions | +3.2% avg
Arbitrage (40%):   $2,050 allocated | 4 positions | +2.1% avg
```

### Convergence Opportunities
Shows top 5 high-probability bets:
```
Will the sun rise tomorrow?       | Poly | 0.997 | 14.0h | 0.30% yield
Will Bitcoin be above $0 at EOD?  | Poly | 0.993 | 8.0h  | 0.71% yield
Will 2026 end this year?          | Poly | 0.991 | 20.0h | 0.91% yield
```

### Arbitrage Opportunities
Shows top 5 mispriced pairs:
```
BTC $100k by Dec 2026  | Cost: $0.9700 | Profit: 3.09% | YES on bento / NO on poly
ETH $5k in 2026        | Cost: $0.9700 | Profit: 3.09% | YES on bento / NO on poly
Trump wins 2028        | Cost: $0.9500 | Profit: 5.26% | YES on bento / NO on poly
```

### Open Positions
Shows currently active positions:
```
[CONV] C-abc123       | Will sun rise tomorrow?              | $  800 | 14.0h left
[ARB ] A-xyz456       | BTC $100k by Dec 2026                | $1,000 | 180.5h left
```

### Recent Settlements
Shows last 5 completed positions:
```
[CONV] Water is wet?              | WIN  | +$4.02    | 8.0h
[ARB ] ETH price pair             | WIN  | +$31.50   | 2.0h
[CONV] BTC > $0 today?            | WIN  | +$5.61    | 6.0h
```

---

## Demo Talking Points

### Opening (30 seconds)
> "Ben-Spread is an automated yield terminal for prediction markets. Instead of manually hunting for opportunities 24/7, we systematically execute two proven strategies: convergence bets on near-certain outcomes, and cross-platform arbitrage."

### Strategy A: Convergence (30 seconds)
> "Strategy A targets Polymarket bets with 99%+ probability and less than 24 hours to resolution. Think 'Will the sun rise tomorrow?' priced at 99.7 cents. We buy at 99.7, it settles at $1.00, we capture 0.3% in 14 hours. Scale this across dozens of markets continuously, and you get consistent low-risk yield."

### Strategy B: Arbitrage (30 seconds)
> "Strategy B finds the same event priced differently across Polymarket and Bento. For example: 'Will Bitcoin hit $100k?' — Polymarket has YES at 68 cents, NO at 32. Bento has the same market with YES at 65 cents, NO at 34. We buy Bento YES (cheaper) plus Polymarket NO (cheaper). Total cost: 97 cents. At settlement, one pays $1.00. Guaranteed 3% profit, market-neutral."

### Capital Allocation (20 seconds)
> "Users deposit capital and choose their risk profile with a slider. Conservative users go 80% convergence. Aggressive traders split 50/50. The vault continuously rebalances as positions settle, recycling capital into new opportunities."

### Dashboard Walkthrough (40 seconds)
> "Here's the live dashboard. We started with $10,000 an hour ago. Total value is now $10,450 — that's 4.5% return. We have 12 open positions, 34 settled with a 94% win rate. Our estimated APY is 67%. Notice the strategy breakdown: Convergence has 8 positions averaging 3.2% return, Arbitrage has 4 averaging 2.1%. Below you see the top opportunities we're targeting right now, our current positions, and recent wins."

### Closing (20 seconds)
> "This isn't speculation — it's disciplined portfolio management. Every trade is backed by math. Every position has measurable risk. Built entirely on Bento's SDK, combining their native markets with Polymarket integration for true cross-platform alpha."

**Total: ~3 minutes**

---

## Common Questions

**Q: Is this real money?**  
A: No, this is paper trading for demo purposes. Real execution mode would connect a wallet and call the Bento SDK's trade endpoints.

**Q: Where does Polymarket data come from?**  
A: We use hardcoded demo markets that mirror real Polymarket pricing patterns. Production would use `sdk.user.polymarket.publicSearch()`.

**Q: How do you handle settlement?**  
A: Currently simulated — we poll for expired positions and calculate outcomes based on probability. Production would listen to on-chain settlement events.

**Q: What's the actual APY?**  
A: The 67% is extrapolated from our paper trading simulation. Real-world would depend on opportunity frequency, execution costs, and slippage.

**Q: Why both strategies?**  
A: Convergence is lower risk but requires more capital per unit return. Arbitrage is capital efficient but requires liquidity on both platforms. Combining them maximizes risk-adjusted returns.

---

## Stopping the Demo

Press `Ctrl+C` to gracefully shut down.

The terminal will display:
```
👋 Shutting down Ben-Spread...
```

---

## Troubleshooting

**Dashboard not rendering?**
- Maximize terminal window
- Check `npm start` ran without errors

**No opportunities found?**
- Adjust filters in `src/strategies/convergence.js`
- Check Bento API is reachable (`npm run test:connect`)

**Positions not settling?**
- They settle when `expiryTime` is reached
- Demo positions expire in 6-20 hours from creation
- Historical positions settle immediately on startup

---

## Next Steps After Demo

1. **Real Execution**: Connect wallet, replace paper trades with `sdk.user.polymarket.placeOrder()`
2. **Web UI**: Build Next.js dashboard with live WebSocket updates
3. **Advanced Matching**: Implement embedding-based fuzzy matching for arb pairs
4. **Multi-Platform**: Add Kalshi, Manifold, Augur
5. **Backtesting**: Historical performance analysis
6. **Strategy Marketplace**: Multiple vaults with different approaches

---

Good luck! 🚀
