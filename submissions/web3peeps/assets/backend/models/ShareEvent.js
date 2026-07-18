import mongoose from 'mongoose';

const shareEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['market_created', 'badge_viewed', 'bet_placed_from_reply'],
    required: true
  },
  tweetId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ShareEvent', shareEventSchema);
