const RankMetric = require('../models/Ranking/RankMetric');
const LeagueParticipant = require('../models/Ranking/LeagueParticipant');
const LeagueGroup = require('../models/Ranking/LeagueGroup');

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

        if (!participant) {
            // Even if not in a league, we should return overall score if they have one
            const overallMetric = await RankMetric.findOne({ userId });
            return res.status(200).json({
                status: 'success',
                data: {
                    overallScore: overallMetric?.overall?.totalXP || 0
                }
            });
        }

        const overallMetric = await RankMetric.findOne({ userId });

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
