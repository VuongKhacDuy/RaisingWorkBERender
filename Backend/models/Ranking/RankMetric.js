const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
    dailyXP: { type: Number, default: 0 },
    weeklyXP: { type: Number, default: 0 },
    sundayXP: { type: Number, default: 0 },
    quarterlyXP: { type: Number, default: 0 },
    yearlyXP: { type: Number, default: 0 },
    totalXP: { type: Number, default: 0 },
}, { _id: false });

const rankMetricSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    academic: { type: metricSchema, default: () => ({}) },
    pet_battle: { type: metricSchema, default: () => ({}) },
    game_activity: { type: metricSchema, default: () => ({}) },
    overall: { type: metricSchema, default: () => ({}) },
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Individual indexes for each category's leaderboard performance
rankMetricSchema.index({ 'academic.weeklyXP': -1 });
rankMetricSchema.index({ 'academic.totalXP': -1 });
rankMetricSchema.index({ 'pet_battle.totalXP': -1 });
rankMetricSchema.index({ 'overall.totalXP': -1 });

module.exports = mongoose.model('RankMetric', rankMetricSchema);
