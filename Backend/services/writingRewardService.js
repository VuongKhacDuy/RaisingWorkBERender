const WritingRound = require('../models/Writing/WritingRoundModel');
const WritingSubmission = require('../models/Writing/WritingSubmissionModel');
const UserProgress = require('../models/User/UserProgressModel');
const { addCoinsWithTransaction } = require('../controllers/userProgressController');

const RANKING_SORT = { 'review.score': -1, lastSubmittedAt: 1, _id: 1 };

const countWords = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;

const findRankTier = (rankRewards, rank) =>
    (rankRewards || []).find(t => rank >= t.fromRank && rank <= t.toRank) || null;

// Returns an error message, or null when valid.
const validateRankRewards = (rankRewards) => {
    if (!Array.isArray(rankRewards)) return 'rankRewards phải là mảng.';
    const sorted = [...rankRewards].sort((a, b) => a.fromRank - b.fromRank);
    for (let i = 0; i < sorted.length; i++) {
        const { fromRank, toRank, multiplier } = sorted[i];
        if (!Number.isInteger(fromRank) || !Number.isInteger(toRank) || fromRank < 1 || toRank < fromRank) {
            return `Mốc hạng ${fromRank}–${toRank} không hợp lệ.`;
        }
        if (typeof multiplier !== 'number' || multiplier < 0) {
            return `Hệ số của mốc ${fromRank}–${toRank} không hợp lệ.`;
        }
        if (i > 0 && fromRank <= sorted[i - 1].toRank) {
            return `Mốc ${sorted[i - 1].fromRank}–${sorted[i - 1].toRank} và ${fromRank}–${toRank} bị chồng nhau.`;
        }
    }
    return null;
};

const grantReward = async (userId, xp, coin, source, description) => {
    if (xp > 0) {
        await UserProgress.findOneAndUpdate({ userId }, { $inc: { totalXP: xp } }, { upsert: true });
    }
    if (coin > 0) {
        await addCoinsWithTransaction(userId, coin, 'EARN', source, description);
    }
};

const participationAmounts = (round) => ({
    xp: Math.floor((round.xpReward || 0) * (round.participationRate ?? 0.5)),
    coin: Math.floor((round.coinReward || 0) * (round.participationRate ?? 0.5)),
});

// Called once, right after the submission document was inserted (unique index guarantees one insert per user/round).
const grantParticipationReward = async (submission, round) => {
    const { xp, coin } = participationAmounts(round);
    if (xp <= 0 && coin <= 0) return { xp: 0, coin: 0 };
    try {
        await grantReward(submission.userId, xp, coin, `writing_participation:${round._id}`, `Luyện viết: ${round.title}`);
        await WritingSubmission.updateOne(
            { _id: submission._id },
            { $set: { participationReward: { xp, coin, rewardedAt: new Date() } } }
        );
        return { xp, coin };
    } catch (error) {
        console.error('[WritingReward.participation] grant failed for submission', String(submission._id), error);
        return { xp: 0, coin: 0 };
    }
};

// Reviewed submissions ordered by score desc, then earlier last submission, then _id.
const getRankedSubmissions = (roundId, select) =>
    WritingSubmission.find({ roundId, status: 'reviewed' }).sort(RANKING_SORT).select(select).lean();

// Safe to call again after a partial failure: each payout is claimed atomically per submission.
const publishRound = async (roundId) => {
    const round = await WritingRound.findById(roundId);
    if (!round) return { status: 404, message: 'Không tìm thấy đợt.' };
    if (round.publishStatus === 'published') return { status: 400, message: 'Đợt này đã công bố.' };
    if (new Date() < round.endAt) return { status: 400, message: 'Chưa hết hạn nộp bài.' };

    const pending = await WritingSubmission.countDocuments({ roundId, status: { $ne: 'reviewed' } });
    if (pending > 0) return { status: 400, message: `Còn ${pending} bài chưa chấm xong.` };

    const locked = await WritingRound.findOneAndUpdate(
        { _id: roundId, publishStatus: { $ne: 'published' } },
        { $set: { publishStatus: 'publishing' } },
        { new: true }
    );
    if (!locked) return { status: 400, message: 'Đợt này đã công bố.' };

    const ranked = await getRankedSubmissions(roundId, '_id userId');
    const now = new Date();
    let paidCount = 0;
    let totalXP = 0;
    let totalCoin = 0;

    for (let i = 0; i < ranked.length; i++) {
        const sub = ranked[i];
        const rank = i + 1;
        const tier = findRankTier(locked.rankRewards, rank);
        const xp = tier ? Math.floor(locked.xpReward * tier.multiplier) : 0;
        const coin = tier ? Math.floor(locked.coinReward * tier.multiplier) : 0;

        if (xp <= 0 && coin <= 0) {
            await WritingSubmission.updateOne({ _id: sub._id }, { $set: { finalRank: rank } });
            continue;
        }

        const claimed = await WritingSubmission.findOneAndUpdate(
            { _id: sub._id, rankReward: null },
            { $set: { finalRank: rank, rankReward: { xp, coin, rewardedAt: now } } }
        );
        if (!claimed) continue;

        try {
            await grantReward(sub.userId, xp, coin, `writing_rank:${roundId}`, `Luyện viết: ${locked.title} — hạng ${rank}`);
            paidCount++;
            totalXP += xp;
            totalCoin += coin;
        } catch (error) {
            console.error('[WritingReward.publish] grant failed for submission', String(sub._id), error);
        }
    }

    locked.publishStatus = 'published';
    locked.resultsPublishedAt = now;
    await locked.save();

    return {
        status: 200,
        data: { rankedCount: ranked.length, paidCount, totalXP, totalCoin, resultsPublishedAt: now },
    };
};

module.exports = {
    countWords,
    findRankTier,
    validateRankRewards,
    participationAmounts,
    grantParticipationReward,
    getRankedSubmissions,
    publishRound,
};
