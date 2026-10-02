const mongoose = require('mongoose');
const User = require('../models/Auth/user');
const AppleSubscription = require('../models/Premium/AppleSubscriptionModel');
const appleIap = require('../services/appleIapService');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// active | grace | expired | revoked — derived, never stored (dates move on their own)
function subscriptionStatus(sub, now = new Date()) {
    if (sub.revocationDate) return 'revoked';
    if (sub.expiresDate && sub.expiresDate > now) return 'active';
    if (sub.gracePeriodExpiresDate && sub.gracePeriodExpiresDate > now) return 'grace';
    return 'expired';
}

const mapSubscription = (sub, now) => ({
    _id: sub._id,
    user: sub.userId && sub.userId._id
        ? { _id: sub.userId._id, name: sub.userId.name, email: sub.userId.email }
        : null,
    originalTransactionId: sub.originalTransactionId,
    latestTransactionId: sub.latestTransactionId,
    productId: sub.productId,
    environment: sub.environment,
    status: subscriptionStatus(sub, now),
    autoRenewStatus: sub.autoRenewStatus,
    originalPurchaseDate: sub.originalPurchaseDate,
    purchaseDate: sub.purchaseDate,
    expiresDate: sub.expiresDate,
    gracePeriodExpiresDate: sub.gracePeriodExpiresDate,
    revocationDate: sub.revocationDate,
    price: sub.priceMilliunits != null ? sub.priceMilliunits / 1000 : null,
    currency: sub.currency,
    lastEventType: sub.lastEventType,
    lastEventSubtype: sub.lastEventSubtype,
    lastEventAt: sub.lastEventAt,
    updatedAt: sub.updatedAt,
});

function statusFilter(status, now) {
    switch (status) {
        case 'active': return { revocationDate: null, expiresDate: { $gt: now } };
        case 'grace': return { revocationDate: null, expiresDate: { $lte: now }, gracePeriodExpiresDate: { $gt: now } };
        case 'revoked': return { revocationDate: { $ne: null } };
        case 'expired': return {
            revocationDate: null,
            expiresDate: { $lte: now },
            $or: [{ gracePeriodExpiresDate: null }, { gracePeriodExpiresDate: { $lte: now } }],
        };
        default: return {};
    }
}

// GET /api/cms/premium/summary
exports.getSummary = async (req, res) => {
    try {
        const now = new Date();
        const active = statusFilter('active', now);
        const [activeByEnv, activeByProduct, revoked, total, manualPremium] = await Promise.all([
            AppleSubscription.aggregate([{ $match: active }, { $group: { _id: '$environment', count: { $sum: 1 } } }]),
            AppleSubscription.aggregate([
                { $match: { ...active, environment: 'Production' } },
                { $group: { _id: '$productId', count: { $sum: 1 } } },
            ]),
            AppleSubscription.countDocuments(statusFilter('revoked', now)),
            AppleSubscription.countDocuments({}),
            User.countDocuments({
                isPremium: true,
                appleOriginalTransactionId: null,
                role: { $ne: 'admin' },
                $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: now } }],
            }),
        ]);
        const envCount = (env) => activeByEnv.find((e) => e._id === env)?.count || 0;
        res.json({
            success: true,
            data: {
                activeProduction: envCount('Production'),
                activeSandbox: envCount('Sandbox'),
                activeByProduct: Object.fromEntries(activeByProduct.map((p) => [p._id, p.count])),
                revoked,
                totalSubscriptions: total,
                manualPremium,
            },
        });
    } catch (error) {
        console.error('[cmsPremium.getSummary]', error);
        res.status(500).json({ success: false, message: 'Không tải được thống kê Premium.' });
    }
};

// GET /api/cms/premium/subscriptions?status=&environment=&productId=&q=&page=&limit=
exports.listSubscriptions = async (req, res) => {
    try {
        const now = new Date();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const filter = statusFilter(req.query.status, now);
        if (['Production', 'Sandbox'].includes(req.query.environment)) filter.environment = req.query.environment;
        if (req.query.productId) filter.productId = req.query.productId;

        const q = String(req.query.q || '').trim();
        if (q) {
            const users = await User.find({
                $or: [{ email: new RegExp(escapeRegex(q), 'i') }, { name: new RegExp(escapeRegex(q), 'i') }],
            }).select('_id').limit(200).lean();
            const or = [{ originalTransactionId: q }, { latestTransactionId: q }, { userId: { $in: users.map((u) => u._id) } }];
            filter.$and = [...(filter.$and || []), { $or: or }];
        }

        const [items, total] = await Promise.all([
            AppleSubscription.find(filter)
                .sort({ updatedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('userId', 'name email')
                .select('-events'),
            AppleSubscription.countDocuments(filter),
        ]);
        res.json({ success: true, data: { items: items.map((s) => mapSubscription(s, now)), total, page, limit } });
    } catch (error) {
        console.error('[cmsPremium.listSubscriptions]', error);
        res.status(500).json({ success: false, message: 'Không tải được danh sách giao dịch.' });
    }
};

// GET /api/cms/premium/subscriptions/:id   — includes event history
exports.getSubscription = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
        }
        const sub = await AppleSubscription.findById(req.params.id).populate('userId', 'name email');
        if (!sub) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch.' });
        res.json({
            success: true,
            data: { ...mapSubscription(sub, new Date()), appAccountToken: sub.appAccountToken, events: [...sub.events].reverse() },
        });
    } catch (error) {
        console.error('[cmsPremium.getSubscription]', error);
        res.status(500).json({ success: false, message: 'Không tải được chi tiết giao dịch.' });
    }
};

// POST /api/cms/premium/subscriptions/:id/sync   — recompute the owner's premium from Apple data
exports.syncSubscription = async (req, res) => {
    try {
        const sub = mongoose.isValidObjectId(req.params.id) ? await AppleSubscription.findById(req.params.id) : null;
        if (!sub) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch.' });
        if (!sub.userId) {
            return res.status(400).json({ success: false, message: 'Giao dịch chưa gắn với tài khoản UUMI nào (app chưa gửi lên).' });
        }
        const state = await appleIap.syncUserPremium(sub.userId);
        res.json({ success: true, message: 'Đã đồng bộ trạng thái Premium.', data: state });
    } catch (error) {
        console.error('[cmsPremium.syncSubscription]', error);
        res.status(500).json({ success: false, message: 'Đồng bộ thất bại.' });
    }
};

// GET /api/cms/premium/users?email=   — premium state of one account + its Apple subscriptions
exports.lookupUser = async (req, res) => {
    try {
        const email = String(req.query.email || '').trim().toLowerCase();
        if (!email) return res.status(400).json({ success: false, message: 'Vui lòng nhập email.' });
        const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') })
            .select('name email role isPremium premiumExpiresAt appleOriginalTransactionId premiumProductId premiumEnvironment');
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
        const now = new Date();
        const subs = await AppleSubscription.find({ userId: user._id }).sort({ updatedAt: -1 }).select('-events');
        res.json({ success: true, data: { user, subscriptions: subs.map((s) => mapSubscription(s, now)) } });
    } catch (error) {
        console.error('[cmsPremium.lookupUser]', error);
        res.status(500).json({ success: false, message: 'Không tra cứu được tài khoản.' });
    }
};

// POST /api/cms/premium/users/manual   Body: { email, action: 'grant' | 'revoke', expiresAt?: ISO | null }
// Manual premium (gift, support, tester). Never touches an active Apple subscription.
exports.setManualPremium = async (req, res) => {
    try {
        const { email, action, expiresAt } = req.body || {};
        const user = email
            ? await User.findOne({ email: new RegExp(`^${escapeRegex(String(email).trim())}$`, 'i') })
            : null;
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });

        if (user.appleOriginalTransactionId) {
            return res.status(409).json({
                success: false,
                message: 'Tài khoản đang có Premium từ gói Apple. Premium Apple tự cập nhật theo giao dịch, không sửa tay.',
            });
        }

        if (action === 'grant') {
            const until = expiresAt ? new Date(expiresAt) : null;
            if (until && (isNaN(until) || until <= new Date())) {
                return res.status(400).json({ success: false, message: 'Ngày hết hạn phải ở tương lai.' });
            }
            user.isPremium = true;
            user.premiumExpiresAt = until;
        } else if (action === 'revoke') {
            user.isPremium = false;
            user.premiumExpiresAt = null;
        } else {
            return res.status(400).json({ success: false, message: 'action phải là grant hoặc revoke.' });
        }
        user.premiumProductId = null;
        user.premiumEnvironment = null;
        await user.save();

        res.json({
            success: true,
            message: action === 'grant' ? 'Đã cấp Premium thủ công.' : 'Đã thu hồi Premium thủ công.',
            data: { isPremium: user.isPremium, premiumExpiresAt: user.premiumExpiresAt },
        });
    } catch (error) {
        console.error('[cmsPremium.setManualPremium]', error);
        res.status(500).json({ success: false, message: 'Cập nhật Premium thất bại.' });
    }
};
