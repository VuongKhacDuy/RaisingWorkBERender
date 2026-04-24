const mongoose = require('mongoose');

const rankMetricSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
        type: String,
        enum: ['academic', 'pet_battle', 'game_activity', 'overall'],
        required: true
    },
    dailyXP: { type: Number, default: 0 },
    weeklyXP: { type: Number, default: 0 }, // Mon - Sat
    sundayXP: { type: Number, default: 0 }, // Sun only
    quarterlyXP: { type: Number, default: 0 }, // Season (3 months)
    yearlyXP: { type: Number, default: 0 },
    totalXP: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Unique index per user + category to prevent duplicates and speed up updates
rankMetricSchema.index({ userId: 1, category: 1 }, { unique: true });

// Index for performance in global leaderboards
rankMetricSchema.index({ category: 1, weeklyXP: -1 });
rankMetricSchema.index({ category: 1, quarterlyXP: -1 });
rankMetricSchema.index({ category: 1, totalXP: -1 });

module.exports = mongoose.model('RankMetric', rankMetricSchema);
