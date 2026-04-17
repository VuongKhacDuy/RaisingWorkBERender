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
    userCharacter: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('UserProgress', userProgressSchema);
