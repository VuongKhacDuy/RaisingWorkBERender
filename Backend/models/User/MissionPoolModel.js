const mongoose = require('mongoose');

const missionPoolSchema = new mongoose.Schema({
    title: { type: String, required: true },
    desc: { type: String, required: true },
    type: { type: String, required: true }, // e.g. learnWords, playGames, maintainStreak
    baseTarget: { type: Number, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
    xpReward: { type: Number, default: 0 },
    coinReward: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('MissionPool', missionPoolSchema);
