const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema({
    achievementId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true,
    },
    desc: {
        type: String,
        required: true,
    },
    iconName: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    requirement: {
        type: Number,
        required: true,
    },
    xpReward: {
        type: Number,
        default: 0
    },
    coinReward: {
        type: Number,
        default: 0
    }
});

// Compound index to ensure one achievement entry per user per achievement type
achievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

// Pre-save hook to update the updatedAt field
achievementSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model("Achievement", achievementSchema);
