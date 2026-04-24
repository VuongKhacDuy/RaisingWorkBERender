const RankMetric = require('../models/Ranking/RankMetric');
const LeagueGroup = require('../models/Ranking/LeagueGroup');
const LeagueParticipant = require('../models/Ranking/LeagueParticipant');
const LeagueTier = require('../models/Ranking/LeagueTier');
const RankingHistory = require('../models/Ranking/RankingHistory');
const mongoose = require('mongoose');

class RankingService {
    /**
     * Update user XP across all relevant timeframes
     */
    async updateXP(userId, category, amount) {
        let metric = await RankMetric.findOne({ userId, category });
        if (!metric) {
            metric = new RankMetric({ userId, category });
        }

        const isSunday = new Date().getDay() === 0;

        metric.dailyXP += amount;
        if (isSunday) {
            metric.sundayXP += amount;
        } else {
            metric.weeklyXP += amount;
        }
        metric.quarterlyXP += amount;
        metric.yearlyXP += amount;
        metric.totalXP += amount;
        metric.lastUpdated = new Date();

        await metric.save();

        // Also update active league participant score if exists
        await this.updateParticipantScore(userId, category, amount, isSunday);

        return metric;
    }

    async updateParticipantScore(userId, category, amount, isSunday) {
        // For now, we assume 'academic' is the main league category
        if (category !== 'academic') return;

        const currentWeek = this.getWeekNumber(new Date());
        const currentYear = new Date().getFullYear();

        // Find active group for the user
        const participant = await LeagueParticipant.findOne({ userId })
            .populate('groupId');

        if (participant && participant.groupId.weekNumber === currentWeek && participant.groupId.year === currentYear) {
            if (participant.groupId.type === 'finals' && isSunday) {
                participant.sundayScore += amount;
            } else if (participant.groupId.type === 'grand_final') {
                if (!participant.isEliminated) {
                    participant.grandFinalScore += amount;
                }
            } else {
                participant.qualifierScore += amount;
            }
            await participant.save();
        }
    }

    /**
     * Saturday Night: Close qualifiers and pick finalists
     */
    async processSaturdayCloser() {
        console.log("Processing Saturday Closer - Picking Finalists...");
        const groups = await LeagueGroup.find({ type: 'qualifier', status: 'active' });

        for (const group of groups) {
            const participants = await LeagueParticipant.find({ groupId: group._id })
                .sort({ qualifierScore: -1 });

            const tier = await LeagueTier.findById(group.tierId);
            const finalistCount = tier.promotionThreshold || 12;

            // Mark finalists
            for (let i = 0; i < participants.length; i++) {
                if (i < finalistCount) {
                    participants[i].isFinalist = true;
                    // Note: sundayScore starts at 0 as per spec
                }
                await participants[i].save();
            }

            group.status = 'locked';
            await group.save();

            // Create a Finals group for Sunday
            const finalsGroup = new LeagueGroup({
                tierId: group.tierId,
                type: 'finals',
                weekNumber: group.weekNumber,
                year: group.year,
                status: 'active'
            });
            await finalsGroup.save();

            // Logic to move finalists to the new group could go here, 
            // or we just query participants with isFinalist = true and finalsGroup type
        }
    }

    /**
     * Daily elimination for Grand Final (T2-T6 of Week 13)
     */
    async processDailyElimination() {
        console.log("Processing Grand Final Daily Elimination...");
        const grandFinalGroup = await LeagueGroup.findOne({ type: 'grand_final', status: 'active' });
        if (!grandFinalGroup) return;

        const participants = await LeagueParticipant.find({
            groupId: grandFinalGroup._id,
            isEliminated: false
        }).sort({ grandFinalScore: -1 });

        // Eliminate bottom 10%
        const eliminateCount = Math.max(1, Math.floor(participants.length * 0.1));
        const toEliminate = participants.slice(-eliminateCount);

        for (const p of toEliminate) {
            p.isEliminated = true;
            p.eliminatedAt = new Date();
            await p.save();
        }

        console.log(`Eliminated ${eliminateCount} participants.`);
    }

    /**
     * Sunday Night: Process promotions/demotions and reset
     */
    async processSundayReset() {
        console.log("Processing Sunday Reset...");
        const finalsGroups = await LeagueGroup.find({ type: 'finals', status: 'active' });

        for (const group of finalsGroups) {
            const participants = await LeagueParticipant.find({ groupId: group._id })
                .sort({ sundayScore: -1 });

            const tier = await LeagueTier.findById(group.tierId);
            const promotionCount = tier.promotionThreshold || 5;

            for (let i = 0; i < participants.length; i++) {
                const isPromoted = i < promotionCount;

                // Save to history
                await RankingHistory.create({
                    userId: participants[i].userId,
                    timeframe: 'weekly',
                    weekNumber: group.weekNumber,
                    tierId: group.tierId,
                    finalRank: i + 1,
                    finalScore: participants[i].sundayScore,
                    isPromoted: isPromoted
                });

                // Update user logic for promotion could happen here
            }

            group.status = 'completed';
            await group.save();
        }

        // Reset metrics for new week
        await RankMetric.updateMany({}, { dailyXP: 0, weeklyXP: 0, sundayXP: 0 });
    }

    /**
     * Helper to get week number
     */
    getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    }
}

module.exports = new RankingService();
