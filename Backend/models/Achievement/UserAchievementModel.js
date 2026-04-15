const mongoose = require("mongoose");

const userAchievementSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    achievementId: {
        type: String, // Linking by String ID for flexibility (matches Master Achievement ID)
        required: true,
    },
    currentProgress: {
        type: Number,
        default: 0,
    },
    isUnlocked: {
        type: Boolean,
        default: false,
    },
    unlockedDate: {
        type: Date,
        default: null,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

// Đảm bảo mỗi user chỉ có 1 bản ghi cho mỗi loại thành tựu
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

userAchievementSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model("UserAchievement", userAchievementSchema);
