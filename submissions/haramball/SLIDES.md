# haramball.xyz Slide Deck

## 1. Product

haramball.xyz is a mobile-first World Cup prediction-market client built on Bento.

It gives fans a fast matchday loop: browse a market, choose YES or NO, preview the position, place the bet, and check the resulting ticket and portfolio state.

Live demo: https://minutestriker.vercel.app

## 2. Problem

Prediction markets can feel like trading terminals, even when the underlying question is a simple sports outcome.

For World Cup fans, the interaction should feel closer to a match ticket: quick to understand, easy to repeat, and connected to identity and standings.

## 3. Bento Integration

haramball.xyz uses Bento for:

- public market discovery
- market detail reads by `duelId`
- wallet-signed authentication
- quote estimation before placing a bet
- bet placement with idempotency
- portfolio and position reconciliation after accepted writes

## 4. User Flow

1. Open the deployed app.
2. Create or update a fan profile.
3. Browse World Cup market cards.
4. Connect an EVM wallet.
5. Select YES or NO.
6. Preview stake, shares, and slippage.
7. Place the bet.
8. Review the ticket, account, and portfolio state.

## 5. Architecture

- React and Vite power the mobile-first frontend.
- API routes keep Bento credentials server-side.
- `@bento.fun/sdk` handles Bento market and user operations.
- Backend readiness checks confirm Builder API key and Bento host configuration.
- Tests cover Bento mapping, readiness, and client behavior.

## 6. Why It Fits Bento

haramball.xyz turns Bento markets into a repeatable sports fan product surface rather than a one-off transaction screen.

The app focuses on market discovery, confident bet preview, wallet-backed placement, and reconciliation, which are the pieces a real fan-facing Bento client needs for trust and repeated use.
