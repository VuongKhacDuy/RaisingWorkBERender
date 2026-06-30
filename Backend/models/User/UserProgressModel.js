const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentStreak: { type: Number, default: 0 },
    loginStreak: { type: Number, default: 0 },
    learnStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null }, // Kept for generic activity triggers
    lastLoginDate: { type: Date, default: null },
    lastLearnDate: { type: Date, default: null },
    totalXP: { type: Number, default: 0 },
    totalCoins: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    selectedMascot: { type: String, default: null },
    selectedMascotInstanceId: { type: String, default: null },
    selectedOutfit: { type: String, default: null },
    unlockedOutfits: { type: [String], default: [] },
    hasCaughtFirstPet: { type: Boolean, default: false },
    smallPotionCount: { type: Number, default: 0 },
    mediumPotionCount: { type: Number, default: 0 },
    largePotionCount: { type: Number, default: 0 },
    superPotionCount: { type: Number, default: 0 },
    fullPotionCount: { type: Number, default: 0 },
    smallManaPotionCount: { type: Number, default: 0 },
    mediumManaPotionCount: { type: Number, default: 0 },
    largeManaPotionCount: { type: Number, default: 0 },
    superManaPotionCount: { type: Number, default: 0 },
    fullManaPotionCount: { type: Number, default: 0 },
    reviewStreak: { type: Number, default: 0 },
    reviewLastReviewDate: { type: Date, default: null },
    reviewSessionRecords: {
        type: [{
            date: { type: Date, required: true },
            reviewedCount: { type: Number, default: 0 },
            correctCount: { type: Number, default: 0 },
            attemptCount: { type: Number, default: 0 }
        }],
        default: []
    },
    userCharacter: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('UserProgress', userProgressSchema);
