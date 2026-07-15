const User = require('../models/Auth/user');
const UserProgress = require('../models/User/UserProgressModel');
const CoinTransaction = require('../models/User/CoinTransactionModel');
const RankMetric = require('../models/Ranking/RankMetric');
const LeagueParticipant = require('../models/Ranking/LeagueParticipant');

const allowedRoles = ['user', 'admin', 'tester'];
const allowedRankCategories = ['overall', 'academic', 'pet_battle', 'game_activity'];
const timeframeToMetricField = {
    daily: 'dailyXP',
    weekly: 'weeklyXP',
    quarterly: 'quarterlyXP',
    yearly: 'yearlyXP',
    total: 'totalXP'
};

const mapAccount = (user, progress) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    isPremium: user.isPremium,
    premiumExpiresAt: user.premiumExpiresAt,
    totalCoins: progress?.totalCoins || 0,
    totalXP: progress?.totalXP || 0,
    level: progress?.level || 1,
    smallPotionCount: progress?.smallPotionCount || 0,
    mediumPotionCount: progress?.mediumPotionCount || 0
});

const findAccountByEmail = async (email) => {
    const normalizedEmail = String(email || '').trim();
    if (!normalizedEmail) {
        return { error: { status: 400, message: 'Email is required.' } };
    }

    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: new RegExp(`^${escapedEmail}$`, 'i') });
    if (!user) {
        return { error: { status: 404, message: 'User not found.' } };
    }

    let progress = await UserProgress.findOne({ userId: user._id });
    if (!progress) {
        progress = new UserProgress({ userId: user._id });
        await progress.save();
    }

    return { user, progress };
};

exports.lookupAccount = async (req, res) => {
    try {
        const result = await findAccountByEmail(req.query.email);
        if (result.error) {
            return res.status(result.error.status).json({ message: result.error.message });
        }

        res.status(200).json({ data: mapAccount(result.user, result.progress) });
    } catch (error) {
        console.error('[CMS Account] lookup error:', error);
        res.status(500).json({ message: 'Failed to lookup account.' });
    }
};

exports.updateAccountRole = async (req, res) => {
    try {
        const { email, role } = req.body;
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: 'Role must be user, admin, or tester.' });
        }

        const result = await findAccountByEmail(email);
        if (result.error) {
            return res.status(result.error.status).json({ message: result.error.message });
        }

        result.user.role = role;
        await result.user.save();

        res.status(200).json({
            message: `Account role updated to ${role}.`,
            data: mapAccount(result.user, result.progress)
        });
    } catch (error) {
        console.error('[CMS Account] role update error:', error);
        res.status(500).json({ message: 'Failed to update account role.' });
    }
};

exports.adjustAccountCoins = async (req, res) => {
    try {
        const { email, mode = 'set', amount, reason } = req.body;
        const parsedAmount = Number.parseInt(amount, 10);
        if (!Number.isFinite(parsedAmount)) {
            return res.status(400).json({ message: 'Coin amount must be a number.' });
        }

        if (!['set', 'add'].includes(mode)) {
            return res.status(400).json({ message: 'Coin mode must be set or add.' });
        }

        const result = await findAccountByEmail(email);
        if (result.error) {
            return res.status(result.error.status).json({ message: result.error.message });
        }

        const role = result.user.role || 'user';
        if (!['admin', 'tester'].includes(role)) {
            return res.status(403).json({ message: 'Coins can only be adjusted for admin or tester accounts.' });
        }

        const previousCoins = result.progress.totalCoins || 0;
        const nextCoins = mode === 'set'
            ? Math.max(0, parsedAmount)
            : Math.max(0, previousCoins + parsedAmount);
        const delta = nextCoins - previousCoins;

        result.progress.totalCoins = nextCoins;
        await result.progress.save();

        if (delta !== 0) {
            await CoinTransaction.create({
                userId: result.user._id,
                amount: delta,
                type: delta > 0 ? 'RECOVERY' : 'SPEND',
                source: 'cms_account_settings',
                description: reason || `CMS ${mode} coin adjustment`,
                balanceAfter: nextCoins
            });
        }

        res.status(200).json({
            message: `Coins updated from ${previousCoins} to ${nextCoins}.`,
            data: mapAccount(result.user, result.progress)
        });
    } catch (error) {
        console.error('[CMS Account] coin adjust error:', error);
        res.status(500).json({ message: 'Failed to adjust account coins.' });
    }
};

exports.listLeaderboardAccounts = async (req, res) => {
    try {
        const category = allowedRankCategories.includes(req.query.category)
            ? req.query.category
            : 'overall';
        const timeframe = timeframeToMetricField[req.query.timeframe]
            ? req.query.timeframe
            : 'weekly';
        const metricField = timeframeToMetricField[timeframe];
        const search = String(req.query.search || '').trim();
        const includeInactive = String(req.query.includeInactive || 'false') === 'true';
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);

        const userQuery = {};
        if (!includeInactive) {
            userQuery.isLeaderboardActive = { $ne: false };
        }
        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            userQuery.$or = [
                { name: new RegExp(escapedSearch, 'i') },
                { email: new RegExp(escapedSearch, 'i') }
            ];
        }

        const users = await User.find(userQuery)
            .select('name email role profileImage isPremium isLeaderboardActive createdAt')
            .lean();
        const userIds = users.map((user) => user._id);

        const [progressRecords, rankMetrics, participants] = await Promise.all([
            UserProgress.find({ userId: { $in: userIds } }).lean(),
            RankMetric.find({ userId: { $in: userIds } }).lean(),
            LeagueParticipant.find({ userId: { $in: userIds } })
                .populate({
                    path: 'groupId',
                    select: 'type status weekNumber year seasonId tierId',
                    populate: { path: 'tierId', select: 'name level' }
                })
                .sort({ updatedAt: -1 })
                .lean()
        ]);

        const progressByUserId = new Map(progressRecords.map((progress) => [String(progress.userId), progress]));
        const metricByUserId = new Map(rankMetrics.map((metric) => [String(metric.userId), metric]));
        const participantByUserId = new Map();
        participants.forEach((participant) => {
            const key = String(participant.userId);
            if (!participantByUserId.has(key)) {
                participantByUserId.set(key, participant);
            }
        });

        const rankedItems = users
            .map((user) => {
                const userId = String(user._id);
                const progress = progressByUserId.get(userId);
                const metric = metricByUserId.get(userId);
                const categoryMetric = metric?.[category] || {};
                const score = Number(categoryMetric[metricField] || 0);
                const participant = participantByUserId.get(userId);
                const group = participant?.groupId;
                const tier = group?.tierId || participant?.currTierId;

                return {
                    userId,
                    name: user.name || 'Unnamed user',
                    email: user.email || '',
                    role: user.role || 'user',
                    profileImage: user.profileImage || null,
                    isPremium: Boolean(user.isPremium),
                    isLeaderboardActive: user.isLeaderboardActive !== false,
                    level: progress?.level || 1,
                    totalXP: progress?.totalXP || 0,
                    totalCoins: progress?.totalCoins || 0,
                    currentStreak: progress?.currentStreak || 0,
                    reviewStreak: progress?.reviewStreak || 0,
                    score,
                    dailyXP: categoryMetric.dailyXP || 0,
                    weeklyXP: categoryMetric.weeklyXP || 0,
                    quarterlyXP: categoryMetric.quarterlyXP || 0,
                    yearlyXP: categoryMetric.yearlyXP || 0,
                    totalRankXP: categoryMetric.totalXP || 0,
                    league: participant ? {
                        type: group?.type || null,
                        status: group?.status || null,
                        seasonId: group?.seasonId || null,
                        weekNumber: group?.weekNumber || null,
                        year: group?.year || null,
                        tierName: tier?.name || null,
                        tierLevel: tier?.level || null,
                        qualifierScore: participant.qualifierScore || 0,
                        sundayScore: participant.sundayScore || 0,
                        grandFinalScore: participant.grandFinalScore || 0,
                        rankInGroup: participant.rankInGroup || 0,
                        isFinalist: Boolean(participant.isFinalist),
                        isGrandFinalist: Boolean(participant.isGrandFinalist),
                        isEliminated: Boolean(participant.isEliminated)
                    } : null
                };
            })
            .sort((left, right) => {
                if (right.score !== left.score) return right.score - left.score;
                return (right.totalXP || 0) - (left.totalXP || 0);
            })
            .slice(0, limit)
            .map((item, index) => ({
                rank: index + 1,
                ...item
            }));

        res.status(200).json({
            data: {
                category,
                timeframe,
                metricField,
                total: users.length,
                items: rankedItems
            }
        });
    } catch (error) {
        console.error('[CMS Account] leaderboard list error:', error);
        res.status(500).json({ message: 'Failed to load leaderboard accounts.' });
    }
};
