const mongoose = require('mongoose');

// startIndex/endIndex are UTF-16 offsets into `content` (JS string / NSString units).
const CorrectionSchema = new mongoose.Schema({
    startIndex: { type: Number, required: true, min: 0 },
    endIndex: { type: Number, required: true, min: 0 },
    original: { type: String, default: '' },
    corrected: { type: String, default: '' },
    explanation: { type: String, default: '' },
}, { _id: false });

const ReviewSchema = new mongoose.Schema({
    score: { type: Number, min: 0, max: 10, default: null },
    comment: { type: String, default: '' },
    corrections: { type: [CorrectionSchema], default: [] },
    suggestions: { type: [String], default: [] },
    sentAt: { type: Date, default: null },
}, { _id: false });

const RewardSchema = new mongoose.Schema({
    xp: { type: Number, default: 0 },
    coin: { type: Number, default: 0 },
    rewardedAt: { type: Date, default: null },
}, { _id: false });

const WritingSubmissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roundId: { type: mongoose.Schema.Types.ObjectId, ref: 'WritingRound', required: true },
    promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'WritingPrompt', required: true },

    content: { type: String, required: true },
    wordCount: { type: Number, default: 0 },
    attemptCount: { type: Number, default: 1 },
    firstSubmittedAt: { type: Date, required: true },
    lastSubmittedAt: { type: Date, required: true },

    status: { type: String, enum: ['submitted', 'in_review', 'reviewed'], default: 'submitted' },
    review: { type: ReviewSchema, default: null },

    participationReward: { type: RewardSchema, default: null },
    finalRank: { type: Number, default: null },
    rankReward: { type: RewardSchema, default: null },
    // Set when the iOS client has seen the result and applied rankReward to its local progress.
    resultAckAt: { type: Date, default: null },
}, { timestamps: true });

WritingSubmissionSchema.index({ userId: 1, roundId: 1 }, { unique: true });
WritingSubmissionSchema.index({ roundId: 1, status: 1 });
WritingSubmissionSchema.index({ roundId: 1, 'review.score': -1, lastSubmittedAt: 1, _id: 1 });
WritingSubmissionSchema.index({ userId: 1, lastSubmittedAt: -1 });

module.exports = mongoose.model('WritingSubmission', WritingSubmissionSchema);
