const mongoose = require("mongoose");

const userAchievementSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true, // Mỗi user chỉ có 1 tấm bảng vàng duy nhất
    },
    progress: [
        {
            achievementId: String,
            currentProgress: Number,
            isUnlocked: Boolean,
            unlockedDate: Date,
            updatedAt: { type: Date, default: Date.now }
        }
    ],
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

userAchievementSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model("UserAchievement", userAchievementSchema);
