const mongoose = require('mongoose');

const leagueTierSchema = new mongoose.Schema({
    level: { type: Number, required: true, unique: true }, // 1: Iron, 2: Bronze, etc.
    name: { type: String, required: true },
    icon: { type: String }, // URL or name of the icon asset
    promotionThreshold: { type: Number }, // e.g., Top 10
    demotionThreshold: { type: Number }, // e.g., Bottom 5
    rewards: {
        coins: { type: Number, default: 0 },
        items: [String]
    }
});

module.exports = mongoose.model('LeagueTier', leagueTierSchema);
