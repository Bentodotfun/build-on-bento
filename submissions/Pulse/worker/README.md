# pulse-worker

The generator + resolver loop for Pulse. See `../docs/` for the full design — this README is just "how to run it."

## Setup

```bash
npm install
cp .env.example .env   # fill in real values, see below
```

### What you need to fill in `.env`

| Var | Where to get it |
|---|---|
| `BENTO_URL` | Bento hackathon kickoff materials — testnet base URL |
| `BENTO_BUILDER_API_KEY` | Mint at https://docs.bento.fun/concepts/builder-api-key |
| `PULSE_BOT_PRIVATE_KEY` | Generate a **fresh** EVM key for this, testnet only — don't reuse a personal wallet. `viem`'s `generatePrivateKey()` in a throwaway script, or any wallet tool. |
| `ANAKIN_API_KEY` | Anakin dashboard / hackathon-provided key |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID` | Not needed for Hour 0 checks — fill in later when wiring the bot |

## Hour 0 checks (run these before writing any more product code)

```bash
npm run hour0          # Bento auth -> read -> create -> resolve round trip
npm run hour0:anakin   # Anakin search latency, 3 sample calls
```

`hour0` is the important one — it answers whether `sdk.user.duels.resolve()` actually
works for our own bot account on a duel it created, which is the single highest-risk
unknown in the whole design (see `../docs/BENTO_INTEGRATION.md`). Read the console
output carefully: a 401/403 on the resolve step means the self-resolving loop needs
the human-tap-to-approve fallback instead of full autonomy — decide that now, not
after the generator/resolver loops are built around the wrong assumption.

If `createParentMarket`/`addChildDuel` succeed but the script warns it can't find
an `id`/`duelId` field on the response, open the raw logged object, find the real
field name, and fix the two `(x as any).fieldName` lines in `hour0-check.ts` — the
request payloads are confirmed correct (verified against the pinned OpenAPI schema
and type-checked against the real SDK), but response field names weren't independently
confirmed since that requires a live call.
