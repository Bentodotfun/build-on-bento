// Shared data models for Ben-Spread

/**
 * @typedef {Object} Market
 * @property {string} id
 * @property {'polymarket'|'bento'} platform
 * @property {string} title
 * @property {string} category
 * @property {number} yesPrice
 * @property {number} noPrice
 * @property {Date} expiryTime
 * @property {number} liquidity
 * @property {number} volume
 * @property {'active'|'resolved'|'suspended'} status
 */

/**
 * @typedef {Object} Position
 * @property {string} id
 * @property {'convergence'|'arbitrage'} strategy
 * @property {Market} [market]
 * @property {number} [entryPrice]
 * @property {Object} [pair]
 * @property {number} [totalCost]
 * @property {number} capital
 * @property {number} enteredAt
 * @property {Date} [expectedSettlement]
 * @property {'open'|'settled'|'failed'} status
 * @property {number} [settledAt]
 * @property {'win'|'loss'} [outcome]
 * @property {number} [realizedPnl]
 */

/**
 * @typedef {Object} MatchedPair
 * @property {Market} poly
 * @property {Market} bento
 */

/**
 * @typedef {Object} ArbOpportunity
 * @property {MatchedPair} pair
 * @property {number} totalCost
 * @property {number} profit
 * @property {number} profitPct
 * @property {'poly'|'bento'} buyYesOn
 * @property {'poly'|'bento'} buyNoOn
 */

/**
 * @typedef {Object} ConvergenceOpportunity
 * @property {Market} market
 * @property {number} estimatedYield
 * @property {number} holdingTimeHours
 * @property {number} riskScore
 */

export {};
