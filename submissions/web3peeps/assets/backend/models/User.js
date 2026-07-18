import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  xHandle: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, required: true },

  bentoWalletAddress: { type: String, unique: true, sparse: true, index: true },
  bentoWalletEncryptedKey: { type: String, select: false },
  bentoManagedAccountAddress: { type: String, index: true, sparse: true },
  bentoJwt: { type: String },
  bentoJwtExpiresAt: { type: Date },
  bentoManagedAccountBalance: { type: String, default: '0' },
  bentoManagedAccountBalanceUpdatedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    totalBets: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 }
  }
});

userSchema.index({ 'stats.bestStreak': -1 });

export default mongoose.model('User', userSchema);
