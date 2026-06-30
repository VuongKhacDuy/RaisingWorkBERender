const mongoose = require('mongoose');

const dailyMissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    missionId: { type: String, required: true },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    type: { type: String, required: true },
    targetValue: { type: Number, required: true },
    currentProgress: { type: Number, default: 0 },
    xpReward: { type: Number, default: 0 },
    coinReward: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    resetDate: { type: Date, required: true }
}, { timestamps: true });

dailyMissionSchema.index({ userId: 1, missionId: 1 }, { unique: true });

module.exports = mongoose.model('DailyMission', dailyMissionSchema);
