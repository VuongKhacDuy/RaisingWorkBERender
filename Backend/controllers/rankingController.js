const RankMetric = require('../models/Ranking/RankMetric');
const LeagueParticipant = require('../models/Ranking/LeagueParticipant');
const LeagueGroup = require('../models/Ranking/LeagueGroup');

exports.getLeaderboard = async (req, res) => {
    try {
        const { category = 'academic', timeframe = 'weekly' } = req.query;
        const userId = req.user ? req.user.id : null; // Assuming auth middleware provides req.user

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
            const metrics = await RankMetric.find({ category })
                .populate('userId', 'name avatar')
                .sort({ [scoreField]: -1 })
                .limit(100);

            leaderboard = metrics.map((m, idx) => ({
                rank: idx + 1,
                name: m.userId.name,
                score: m[scoreField],
                isUser: m.userId._id.toString() === userId?.toString()
            }));

            if (userId) {
                const userMetric = await RankMetric.findOne({ userId, category });
                if (userMetric) {
                    // Logic to find actual global rank if not in top 100
                    userPosition = { score: userMetric[scoreField] };
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
        const userId = req.user.id;
        const participant = await LeagueParticipant.findOne({ userId }).populate('groupId');

        if (!participant) {
            return res.status(200).json({ status: 'success', data: null });
        }

        res.status(200).json({
            status: 'success',
            data: {
                tier: participant.groupId.tierId,
                groupType: participant.groupId.type,
                isFinalist: participant.isFinalist,
                isEliminated: participant.isEliminated
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
