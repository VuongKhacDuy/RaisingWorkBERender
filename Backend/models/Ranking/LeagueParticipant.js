const mongoose = require('mongoose');

const leagueParticipantSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeagueGroup', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    currTierId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeagueTier' },

    qualifierScore: { type: Number, default: 0 }, // T2 - T7 points
    isFinalist: { type: Boolean, default: false },
    sundayScore: { type: Number, default: 0 }, // Sun points (resets to 0 for finalists)

    isGrandFinalist: { type: Boolean, default: false },
    isEliminated: { type: Boolean, default: false },
    eliminatedAt: { type: Date },
    grandFinalScore: { type: Number, default: 0 },

    rankInGroup: { type: Number, default: 0 },
    lastAcknowledgeRank: { type: Number, default: 0 }
}, { timestamps: true });

// Compound index for fast leaderboard retrieval within a group
leagueParticipantSchema.index({ groupId: 1, isFinalist: 1, sundayScore: -1, qualifierScore: -1 });

module.exports = mongoose.model('LeagueParticipant', leagueParticipantSchema);
