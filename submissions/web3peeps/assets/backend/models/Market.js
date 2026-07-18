import mongoose from 'mongoose';

const marketSchema = new mongoose.Schema({
  tweetId: { type: String, required: true, unique: true, index: true },
  tweetUrl: { type: String, required: true },
  tweetAuthorHandle: { type: String, required: true },
  tweetText: { type: String, required: true },
  claimSummary: { type: String, required: true },

  bentoMarketId: { type: String, required: true },
  question: { type: String, required: true },
  resolutionCriteria: { type: String },

  hookLine: { type: String },
  contextSnippets: [{ type: String }],
  sourceUrls: [{ type: String }],

  resolvesBy: { type: Date, index: true },

  /** Cached Bento odds for the list view — updated by the worker on each enrichment cycle. */
  oddsTrue: { type: Number, default: 0.50 },
  oddsFalse: { type: Number, default: 0.50 },
  /** Estimated total volume (sum of stakes) — updated by the worker. */
  volume: { type: Number, default: 0 },

  /** Pre-fetched resolution suggestion (cached by worker after deadline passes) */
  resolutionSuggestion: {
    verdict: { type: String, enum: ['true', 'false', 'unclear'] },
    confidence: { type: Number, min: 0, max: 1 },
    reasoning: { type: String },
    generatedAt: { type: Date },
  },

  status: {
    type: String,
    enum: ['open', 'resolved_true', 'resolved_false', 'resolved_unclear'],
    default: 'open',
    index: true,
  },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  lastEnrichedAt: { type: Date, index: true },
  resolvedAt: { type: Date },

  xReplyId: { type: String },
});

marketSchema.index({ status: 1, lastEnrichedAt: 1 });
marketSchema.index({ createdByUserId: 1, createdAt: -1 });

export default mongoose.model('Market', marketSchema);
