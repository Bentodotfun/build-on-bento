# TODO — Agent Arena Live (Simple)

- [ ] Install Bento SDK, set up auth for 3 agent accounts + 1 house account
- [ ] Fund agent accounts with free-play credits
- [ ] Fetch live topic markets, confirm odds are readable
- [ ] Place one test bet on a topic market (spike, confirm it works)
- [ ] Create one test spectator market (3-way outcome), place a test bet, resolve it manually (spike, confirm it works)
- [ ] Write 3 agent personas (Optimist, Bear, Chaos) as prompt templates
- [ ] Build LLM call: persona + topic + odds → JSON decision (side, risk %, thesis)
- [ ] Wire decisions into real bet placement for each agent
- [ ] Store each agent's reasoning text for the frontend feed
- [ ] Build round loop: pick topic → create spectator market → trigger agent bets → start timer
- [ ] Build frontend: countdown, 3 agent cards (P&L + reasoning), spectator bet panel
- [ ] Calculate ROI per agent (current position value vs starting capital)
- [ ] At timer end: determine winner, resolve spectator market, confirm payout
- [ ] Run one full round end-to-end, fix anything broken
- [ ] Polish visuals + reasoning feed
- [ ] Start a fresh round ~10 min before demo so it resolves live on stage

## Don't build
- More than 3 agents
- Historical leaderboard across rounds
- Custom wallet/auth UI beyond what's needed
- Real money anything (credits only)