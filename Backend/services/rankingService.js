const RankMetric = require('../models/Ranking/RankMetric');
const LeagueGroup = require('../models/Ranking/LeagueGroup');
const LeagueParticipant = require('../models/Ranking/LeagueParticipant');
const LeagueTier = require('../models/Ranking/LeagueTier');
const RankingHistory = require('../models/Ranking/RankingHistory');
const mongoose = require('mongoose');

const MAX_GROUP_SIZE = 30;

class RankingService {
    /**
     * Update user XP across all relevant timeframes
     */
    async updateXP(userId, category, amount) {
        // 1. Update the specific category
        const metric = await this._updateMetric(userId, category, amount);

        // 2. Automatically update the 'overall' category (unless this is already the overall update)
        if (category !== 'overall') {
            await this._updateMetric(userId, 'overall', amount);
        }

        // 3. Also update active league participant score if exists
        const isSunday = new Date().getDay() === 0;
        await this.updateParticipantScore(userId, category, amount, isSunday);

        return metric;
    }

    /**
     * Internal helper to update a single metric entry
     */
    async _updateMetric(userId, category, amount) {
        const isSunday = new Date().getDay() === 0;

        // Use path notation for nested update
        const update = {
            $inc: {
                [`${category}.dailyXP`]: amount,
                [`${category}.quarterlyXP`]: amount,
                [`${category}.yearlyXP`]: amount,
                [`${category}.totalXP`]: amount
            },
            $set: {
                lastUpdated: new Date()
            }
        };

        if (isSunday) {
            update.$inc[`${category}.sundayXP`] = amount;
        } else {
            update.$inc[`${category}.weeklyXP`] = amount;
        }

        const metric = await RankMetric.findOneAndUpdate(
            { userId }, // Now one record per userId
            update,
            { upsert: true, new: true }
        );

        return metric;
    }

    async updateParticipantScore(userId, category, amount, isSunday) {
        // For now, we assume 'academic' is the main league category for weekly leagues
        if (category !== 'academic') return;

        const currentWeek = this.getWeekNumber(new Date());
        const currentYear = new Date().getFullYear();

        // Find active group for the user
        let participant = await LeagueParticipant.findOne({ userId })
            .populate('groupId')
            .sort({ updatedAt: -1 });

        // Check if participant exists and is for current week
        if (participant && participant.groupId && participant.groupId.weekNumber === currentWeek && participant.groupId.year === currentYear && participant.groupId.status !== 'completed') {
            this._incrementParticipantScore(participant, amount, isSunday);
            await participant.save();
        } else {
            // AUTO-MATCHMAKING: Join user's current tier for this week
            console.log(`[Ranking] Auto-matchmaking for User: ${userId}`);

            const tier = await this.resolveTierForUser(userId);

            // Find an active qualifier group for the tier that is not full.
            const candidateGroups = await LeagueGroup.find({
                tierId: tier._id,
                type: 'qualifier',
                status: 'active',
                weekNumber: currentWeek,
                year: currentYear
            });
            let group = null;

            for (const candidate of candidateGroups) {
                const count = await LeagueParticipant.countDocuments({ groupId: candidate._id });
                if (count < MAX_GROUP_SIZE) {
                    group = candidate;
                    break;
                }
            }

            // If no group exists or is full, create a new one
            if (!group) {
                group = await LeagueGroup.create({
                    tierId: tier._id,
                    type: 'qualifier',
                    weekNumber: currentWeek,
                    year: currentYear,
                    status: 'active'
                });
            }

            // 3. Create participation
            participant = new LeagueParticipant({
                userId,
                groupId: group._id,
                currTierId: tier._id,
                qualifierScore: amount,
                sundayScore: 0
            });
            await participant.save();
        }
    }

    _incrementParticipantScore(participant, amount, isSunday) {
        if (participant.groupId.type === 'finals' && isSunday) {
            participant.sundayScore += amount;
        } else if (participant.groupId.type === 'grand_final') {
            if (!participant.isEliminated) {
                participant.grandFinalScore += amount;
            }
        } else {
            participant.qualifierScore += amount;
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

            // Create a Finals group for Sunday before moving finalists.
            const finalsGroup = new LeagueGroup({
                tierId: group.tierId,
                type: 'finals',
                weekNumber: group.weekNumber,
                year: group.year,
                status: 'active'
            });
            await finalsGroup.save();

            // Mark finalists
            for (let i = 0; i < participants.length; i++) {
                if (i < finalistCount) {
                    await LeagueParticipant.create({
                        userId: participants[i].userId,
                        groupId: finalsGroup._id,
                        currTierId: group.tierId,
                        qualifierScore: participants[i].qualifierScore,
                        sundayScore: 0,
                        isFinalist: true
                    });
                } else {
                    participants[i].isFinalist = false;
                    await participants[i].save();
                }
            }

            group.status = 'locked';
            await group.save();
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
            const nextTier = await LeagueTier.findOne({ level: tier.level + 1 });

            for (let i = 0; i < participants.length; i++) {
                const isPromoted = i < promotionCount;
                const finalTierId = isPromoted && nextTier ? nextTier._id : group.tierId;

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

                participants[i].currTierId = finalTierId;
                await participants[i].save();
            }

            group.status = 'completed';
            await group.save();
        }

        // Reset metrics for new week
        await RankMetric.updateMany({}, { dailyXP: 0, weeklyXP: 0, sundayXP: 0 });
    }

    async resolveTierForUser(userId) {
        const latestParticipant = await LeagueParticipant.findOne({ userId })
            .populate('currTierId')
            .populate({
                path: 'groupId',
                populate: { path: 'tierId' }
            })
            .sort({ updatedAt: -1 });

        if (latestParticipant?.currTierId) {
            return latestParticipant.currTierId;
        }

        if (latestParticipant?.groupId?.tierId) {
            return latestParticipant.groupId.tierId;
        }

        const latestHistory = await RankingHistory.findOne({ userId })
            .populate('tierId')
            .sort({ createdAt: -1 });

        if (latestHistory?.tierId) {
            if (latestHistory.isPromoted) {
                const nextTier = await LeagueTier.findOne({ level: latestHistory.tierId.level + 1 });
                if (nextTier) return nextTier;
            }
            return latestHistory.tierId;
        }

        let initiatorTier = await LeagueTier.findOne({ name: /Initiator/i }) || await LeagueTier.findOne({ level: 1 });
        if (!initiatorTier) {
            initiatorTier = await LeagueTier.create({ name: 'Initiator', level: 1, promotionThreshold: 10, demotionThreshold: 0 });
        }
        return initiatorTier;
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
