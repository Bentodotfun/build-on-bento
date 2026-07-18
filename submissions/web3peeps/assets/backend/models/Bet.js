import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  marketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Market', required: true },
  pick: { type: String, enum: ['true', 'false'], required: true },
  oddsAtBet: { type: Number, required: true },
  creditsStaked: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'won', 'lost'], default: 'pending', index: true },
  createdAt: { type: Date, default: Date.now },
  settledAt: { type: Date }
});

betSchema.index({ userId: 1, createdAt: -1 });
betSchema.index({ marketId: 1 });

export default mongoose.model('Bet', betSchema);
