const mongoose = require('mongoose');

const RankRewardSchema = new mongoose.Schema({
    fromRank: { type: Number, required: true, min: 1 },
    toRank: { type: Number, required: true, min: 1 },
    multiplier: { type: Number, required: true, min: 0 },
}, { _id: false });

const WritingRoundSchema = new mongoose.Schema({
    promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'WritingPrompt', required: true },
    // Snapshot of the prompt at open time, so later prompt edits don't rewrite past rounds.
    title: { type: String, required: true, trim: true },
    instruction: { type: String, required: true },
    hint: { type: String, default: '' },
    level: { type: String, default: 'A2' },
    minWords: { type: Number, default: 30 },
    maxWords: { type: Number, default: 150 },
    coverImage: { type: String, default: '' },

    label: { type: String, enum: ['daily', 'weekly', 'event'], default: 'event' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },

    xpReward: { type: Number, default: 0, min: 0 },
    coinReward: { type: Number, default: 0, min: 0 },
    participationRate: { type: Number, default: 0.5, min: 0, max: 1 },
    rankRewards: { type: [RankRewardSchema], default: [] },

    publishStatus: { type: String, enum: ['none', 'publishing', 'published'], default: 'none' },
    resultsPublishedAt: { type: Date, default: null },

    isPremium: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

WritingRoundSchema.index({ isActive: 1, startAt: 1, endAt: 1 });
WritingRoundSchema.index({ promptId: 1, startAt: -1 });

module.exports = mongoose.model('WritingRound', WritingRoundSchema);
