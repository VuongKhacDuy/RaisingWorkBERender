const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null },
    totalXP: { type: Number, default: 0 },
    totalCoins: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    selectedMascot: { type: String, default: 'robot' },
    selectedOutfit: { type: String, default: 'basic' },
    unlockedOutfits: { type: [String], default: ['basic'] },
    unlockedMascots: { type: [String], default: ['robot', 'cat', 'boy'] }
}, { timestamps: true });

module.exports = mongoose.model('UserProgress', userProgressSchema);
