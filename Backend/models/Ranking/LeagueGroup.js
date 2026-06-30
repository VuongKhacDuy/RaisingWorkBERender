const mongoose = require('mongoose');

const leagueGroupSchema = new mongoose.Schema({
    tierId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeagueTier', required: true },
    type: {
        type: String,
        enum: ['qualifier', 'finals', 'grand_final'],
        default: 'qualifier'
    },
    weekNumber: { type: Number, required: true },
    year: { type: Number, required: true },
    seasonId: { type: String }, // e.g., "2026_Q1"
    status: {
        type: String,
        enum: ['active', 'locked', 'completed'],
        default: 'active'
    }
}, { timestamps: true });

module.exports = mongoose.model('LeagueGroup', leagueGroupSchema);
