const mongoose = require('mongoose');

const rankingHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timeframe: {
        type: String,
        enum: ['weekly', 'quarterly', 'yearly'],
        required: true
    },
    seasonId: { type: String }, // e.g., "2026_Q1"
    weekNumber: { type: Number },
    tierId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeagueTier' },

    finalRank: { type: Number, required: true },
    finalScore: { type: Number, required: true },
    isPromoted: { type: Boolean, default: false },
    isSeasonChampion: { type: Boolean, default: false },
    rewardAcknowledge: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('RankingHistory', rankingHistorySchema);
