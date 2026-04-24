const mongoose = require('mongoose');

const coinTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true }, // Positive for earn, negative for spend
    type: {
        type: String,
        enum: ['EARN', 'SPEND', 'REFUND', 'RECOVERY'],
        required: true
    },
    source: {
        type: String,
        required: true,
        index: true
    }, // e.g., 'daily_login', 'mission_id', 'oUTFIT_KING'
    description: { type: String },
    balanceAfter: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for efficient history fetching
coinTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CoinTransaction', coinTransactionSchema);
