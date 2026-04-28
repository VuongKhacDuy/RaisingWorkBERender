const RankMetric = require('../models/Ranking/RankMetric');
const LeagueParticipant = require('../models/Ranking/LeagueParticipant');
const LeagueGroup = require('../models/Ranking/LeagueGroup');
const LeagueTier = require('../models/Ranking/LeagueTier');
const RankingHistory = require('../models/Ranking/RankingHistory');

exports.getLeaderboard = async (req, res) => {
    try {
        const { category = 'academic', timeframe = 'weekly' } = req.query;
        const userId = req.userId;

        let leaderboard = [];
        let userPosition = null;

        if (timeframe === 'weekly') {
            // Find user's current group
            const participant = await LeagueParticipant.findOne({ userId })
                .populate('groupId')
                .populate('userId', 'name avatar');

            if (participant) {
                const groupMembers = await LeagueParticipant.find({ groupId: participant.groupId._id })
                    .populate('userId', 'name avatar')
                    .sort({ sundayScore: -1, qualifierScore: -1 });

                leaderboard = groupMembers.map((m, idx) => ({
                    rank: idx + 1,
                    name: m.userId.name,
                    score: m.groupId.type === 'finals' ? m.sundayScore : m.qualifierScore,
                    isUser: m.userId._id.toString() === userId?.toString()
                }));

                userPosition = leaderboard.find(l => l.isUser);
            }
        } else {
            // Global leaderboards (Quarterly, Total)
            const scoreField = timeframe === 'quarterly' ? 'quarterlyXP' : 'totalXP';
            const nestedPath = `${category}.${scoreField}`;

            const metrics = await RankMetric.find({ [nestedPath]: { $gt: 0 } })
                .populate('userId', 'name avatar')
                .sort({ [nestedPath]: -1 })
                .limit(100);

            leaderboard = metrics.map((m, idx) => ({
                rank: idx + 1,
                name: m.userId?.name || 'Unknown',
                score: m[category] ? m[category][scoreField] : 0,
                isUser: m.userId?._id.toString() === userId?.toString()
            }));

            if (userId) {
                const userMetric = await RankMetric.findOne({ userId });
                if (userMetric && userMetric[category]) {
                    userPosition = {
                        score: userMetric[category][scoreField],
                        rank: null // Actual rank requires a separate count query
                    };
                }
            }
        }

        res.status(200).json({
            status: 'success',
            data: {
                category,
                timeframe,
                userPosition,
                leaderboard
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getRankStatus = async (req, res) => {
    try {
        const userId = req.userId;
        const participant = await LeagueParticipant.findOne({ userId }).populate('groupId');
        const overallMetric = await RankMetric.findOne({ userId });

        if (!participant) {
            // App requires a tier object to decode. Provide Iron (Level 1) by default.
            const ironTier = await LeagueTier.findOne({ level: 1 }) || { _id: "default_iron", name: "Iron", level: 1 };
            return res.status(200).json({
                status: 'success',
                data: {
                    tier: ironTier,
                    groupType: 'qualifier',
                    isFinalist: false,
                    isEliminated: false,
                    overallScore: overallMetric?.overall?.totalXP || 0
                }
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                tier: participant.groupId.tierId,
                groupType: participant.groupId.type,
                isFinalist: participant.isFinalist,
                isEliminated: participant.isEliminated,
                overallScore: overallMetric?.overall?.totalXP || 0
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getTiers = async (req, res) => {
    try {
        const tiers = await LeagueTier.find().sort({ level: 1 });
        const mapped = tiers.map(t => ({
            _id: t._id,
            name: t.name,
            level: t.level,
            promotionThreshold: t.promotionThreshold,
            demotionThreshold: t.demotionThreshold,
            rewardsXP: 0,
            rewardsCoins: t.rewards?.coins || 0
        }));
        res.status(200).json({ status: 'success', data: mapped });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getMyHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const history = await RankingHistory.find({ userId })
            .populate('tierId')
            .sort({ createdAt: -1 });

        const mapped = history.map(h => ({
            _id: h._id,
            userId: h.userId,
            season: h.weekNumber,
            year: new Date(h.createdAt).getFullYear(),
            finalTier: h.tierId?.name || "Unknown",
            finalRank: h.finalRank,
            category: "academic",
            dateArchived: h.createdAt
        }));

        res.status(200).json({ status: 'success', data: mapped });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const rankingService = require('../services/rankingService');

exports.updateXP = async (req, res) => {
    try {
        const userId = req.userId;
        const { category = 'academic', amount = 0 } = req.body;

        if (amount <= 0) {
            return res.status(400).json({ status: 'error', message: 'Amount must be positive' });
        }

        const metric = await rankingService.updateXP(userId, category, parseInt(amount));

        res.status(200).json({
            status: 'success',
            data: metric
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
