const User = require('../models/Auth/user');
const UserProgress = require('../models/User/UserProgressModel');
const CoinTransaction = require('../models/User/CoinTransactionModel');

const allowedRoles = ['user', 'admin', 'tester'];

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
    smallPotionCount: progress?.smallPotionCount || 0
});

const findAccountByEmail = async (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
        return { error: { status: 400, message: 'Email is required.' } };
    }

    const user = await User.findOne({ email: normalizedEmail });
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
