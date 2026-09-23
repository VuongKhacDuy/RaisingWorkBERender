const mongoose = require('mongoose');
const WritingPrompt = require('../models/Writing/WritingPromptModel');
const WritingRound = require('../models/Writing/WritingRoundModel');
const WritingSubmission = require('../models/Writing/WritingSubmissionModel');
const { userHasPremiumAccess } = require('../utils/premiumAccess');
const {
    countWords,
    findRankTier,
    validateRankRewards,
    participationAmounts,
    grantParticipationReward,
    getRankedSubmissions,
    publishRound,
} = require('../services/writingRewardService');

const MAX_CONTENT_LENGTH = 5000;
const isId = (id) => mongoose.isValidObjectId(id);
const isValidScore = (s) => typeof s === 'number' && s >= 0 && s <= 10 && Number.isInteger(s * 2);

const PROMPT_FIELDS = ['title', 'instruction', 'hint', 'level', 'minWords', 'maxWords', 'coverImage', 'isActive'];
const ROUND_EDITABLE_FIELDS = [
    'title', 'instruction', 'hint', 'level', 'minWords', 'maxWords', 'coverImage',
    'label', 'startAt', 'endAt', 'xpReward', 'coinReward', 'participationRate', 'rankRewards',
    'isPremium', 'isActive',
];
const ROUND_LOCKED_AFTER_PUBLISH = ['xpReward', 'coinReward', 'participationRate', 'rankRewards', 'startAt', 'endAt'];

const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]));

const validateWordLimits = ({ minWords, maxWords }) => {
    if (minWords !== undefined && maxWords !== undefined && minWords > maxWords) {
        return 'Số từ tối thiểu phải nhỏ hơn hoặc bằng số từ tối đa.';
    }
    return null;
};

const validateRoundBody = (body, existing) => {
    const startAt = body.startAt !== undefined ? new Date(body.startAt) : existing?.startAt;
    const endAt = body.endAt !== undefined ? new Date(body.endAt) : existing?.endAt;
    if (!startAt || isNaN(startAt)) return 'Thời gian bắt đầu không hợp lệ.';
    if (!endAt || isNaN(endAt)) return 'Thời gian kết thúc không hợp lệ.';
    if (endAt <= startAt) return 'Thời gian kết thúc phải sau thời gian bắt đầu.';
    if (body.rankRewards !== undefined) {
        const err = validateRankRewards(body.rankRewards);
        if (err) return err;
    }
    return validateWordLimits({
        minWords: body.minWords ?? existing?.minWords,
        maxWords: body.maxWords ?? existing?.maxWords,
    });
};

const validateCorrections = (corrections, content) => {
    if (!Array.isArray(corrections)) return 'corrections phải là mảng.';
    for (const c of corrections) {
        if (!Number.isInteger(c.startIndex) || !Number.isInteger(c.endIndex)
            || c.startIndex < 0 || c.endIndex <= c.startIndex || c.endIndex > content.length) {
            return 'Vị trí lỗi sửa không hợp lệ.';
        }
    }
    return null;
};

// ── Shapes returned to iOS ─────────────────────────────────────────────────

const roundForIOS = (r) => ({
    _id: r._id,
    promptId: r.promptId,
    title: r.title,
    instruction: r.instruction,
    hint: r.hint,
    level: r.level,
    minWords: r.minWords,
    maxWords: r.maxWords,
    coverImage: r.coverImage,
    label: r.label,
    startAt: r.startAt,
    endAt: r.endAt,
    xpReward: r.xpReward,
    coinReward: r.coinReward,
    participationReward: participationAmounts(r),
    rankRewards: r.rankRewards,
    isPremium: r.isPremium,
    isPublished: r.publishStatus === 'published',
    resultsPublishedAt: r.resultsPublishedAt,
});

const submissionForIOS = (s) => ({
    _id: s._id,
    roundId: s.roundId,
    promptId: s.promptId,
    content: s.content,
    wordCount: s.wordCount,
    attemptCount: s.attemptCount,
    firstSubmittedAt: s.firstSubmittedAt,
    lastSubmittedAt: s.lastSubmittedAt,
    status: s.status,
    canEdit: s.status === 'submitted',
    review: s.status === 'reviewed' ? s.review : null,
    participationReward: s.participationReward,
    finalRank: s.finalRank,
    rankReward: s.rankReward,
    resultAckAt: s.resultAckAt,
});

const submissionSummaryForIOS = (s) => ({
    _id: s._id,
    status: s.status,
    score: s.status === 'reviewed' ? s.review?.score ?? null : null,
    wordCount: s.wordCount,
    lastSubmittedAt: s.lastSubmittedAt,
    finalRank: s.finalRank,
    resultAckAt: s.resultAckAt,
});

// ── CMS: Prompts ───────────────────────────────────────────────────────────

exports.listPrompts = async (req, res) => {
    try {
        const prompts = await WritingPrompt.find().sort({ createdAt: -1 }).lean();
        const counts = await WritingRound.aggregate([{ $group: { _id: '$promptId', count: { $sum: 1 } } }]);
        const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
        res.json({ data: prompts.map(p => ({ ...p, roundCount: countMap[String(p._id)] || 0 })) });
    } catch (err) {
        console.error('[Writing.listPrompts]', err);
        res.status(500).json({ message: 'Failed to load prompts.' });
    }
};

exports.createPrompt = async (req, res) => {
    try {
        const body = pick(req.body, PROMPT_FIELDS);
        if (!body.title?.trim()) return res.status(400).json({ message: 'Tiêu đề là bắt buộc.' });
        if (!body.instruction?.trim()) return res.status(400).json({ message: 'Đề bài là bắt buộc.' });
        const limitErr = validateWordLimits(body);
        if (limitErr) return res.status(400).json({ message: limitErr });
        const prompt = await WritingPrompt.create(body);
        res.json({ data: prompt });
    } catch (err) {
        console.error('[Writing.createPrompt]', err);
        res.status(500).json({ message: 'Failed to create prompt.' });
    }
};

exports.updatePrompt = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const existing = await WritingPrompt.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Not found.' });
        const body = pick(req.body, PROMPT_FIELDS);
        const limitErr = validateWordLimits({
            minWords: body.minWords ?? existing.minWords,
            maxWords: body.maxWords ?? existing.maxWords,
        });
        if (limitErr) return res.status(400).json({ message: limitErr });
        Object.assign(existing, body);
        await existing.save();
        res.json({ data: existing });
    } catch (err) {
        console.error('[Writing.updatePrompt]', err);
        res.status(500).json({ message: 'Failed to update prompt.' });
    }
};

exports.deletePrompt = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const roundCount = await WritingRound.countDocuments({ promptId: req.params.id });
        if (roundCount > 0) {
            return res.status(400).json({ message: `Đề đã được mở ${roundCount} đợt, không thể xoá. Hãy tắt (isActive) thay vì xoá.` });
        }
        const deleted = await WritingPrompt.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found.' });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        console.error('[Writing.deletePrompt]', err);
        res.status(500).json({ message: 'Failed to delete prompt.' });
    }
};

// ── CMS: Rounds ────────────────────────────────────────────────────────────

exports.listRounds = async (req, res) => {
    try {
        const query = {};
        if (req.query.promptId && isId(req.query.promptId)) query.promptId = req.query.promptId;
        const rounds = await WritingRound.find(query).sort({ startAt: -1 }).lean();
        const stats = await WritingSubmission.aggregate([
            { $match: { roundId: { $in: rounds.map(r => r._id) } } },
            { $group: { _id: { roundId: '$roundId', status: '$status' }, count: { $sum: 1 } } },
        ]);
        const statMap = {};
        for (const s of stats) {
            const key = String(s._id.roundId);
            statMap[key] = statMap[key] || { total: 0, submitted: 0, in_review: 0, reviewed: 0 };
            statMap[key][s._id.status] = s.count;
            statMap[key].total += s.count;
        }
        res.json({
            data: rounds.map(r => ({
                ...r,
                stats: statMap[String(r._id)] || { total: 0, submitted: 0, in_review: 0, reviewed: 0 },
            })),
        });
    } catch (err) {
        console.error('[Writing.listRounds]', err);
        res.status(500).json({ message: 'Failed to load rounds.' });
    }
};

exports.createRound = async (req, res) => {
    try {
        const { promptId } = req.body;
        if (!isId(promptId)) return res.status(400).json({ message: 'promptId không hợp lệ.' });
        const prompt = await WritingPrompt.findById(promptId).lean();
        if (!prompt) return res.status(404).json({ message: 'Không tìm thấy đề.' });

        const body = pick(req.body, ROUND_EDITABLE_FIELDS);
        const err = validateRoundBody(body);
        if (err) return res.status(400).json({ message: err });

        const round = await WritingRound.create({
            promptId,
            title: prompt.title,
            instruction: prompt.instruction,
            hint: prompt.hint,
            level: prompt.level,
            minWords: prompt.minWords,
            maxWords: prompt.maxWords,
            coverImage: prompt.coverImage,
            ...body,
        });
        res.json({ data: round });
    } catch (err) {
        console.error('[Writing.createRound]', err);
        res.status(500).json({ message: 'Failed to create round.' });
    }
};

exports.updateRound = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const round = await WritingRound.findById(req.params.id);
        if (!round) return res.status(404).json({ message: 'Not found.' });

        const body = pick(req.body, ROUND_EDITABLE_FIELDS);
        if (round.publishStatus !== 'none') {
            const locked = ROUND_LOCKED_AFTER_PUBLISH.filter(k => body[k] !== undefined);
            if (locked.length > 0) {
                return res.status(400).json({ message: `Đợt đã công bố, không thể sửa: ${locked.join(', ')}.` });
            }
        }
        const err = validateRoundBody(body, round);
        if (err) return res.status(400).json({ message: err });

        Object.assign(round, body);
        await round.save();
        res.json({ data: round });
    } catch (err) {
        console.error('[Writing.updateRound]', err);
        res.status(500).json({ message: 'Failed to update round.' });
    }
};

exports.deleteRound = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const subCount = await WritingSubmission.countDocuments({ roundId: req.params.id });
        if (subCount > 0) {
            return res.status(400).json({ message: `Đợt đã có ${subCount} bài nộp, không thể xoá. Hãy tắt (isActive) thay vì xoá.` });
        }
        const deleted = await WritingRound.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found.' });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        console.error('[Writing.deleteRound]', err);
        res.status(500).json({ message: 'Failed to delete round.' });
    }
};

exports.listRoundSubmissions = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const round = await WritingRound.findById(req.params.id).lean();
        if (!round) return res.status(404).json({ message: 'Not found.' });

        const subs = await WritingSubmission.find({ roundId: round._id })
            .populate('userId', 'name')
            .select('-content')
            .lean();

        const reviewed = subs
            .filter(s => s.status === 'reviewed')
            .sort((a, b) =>
                (b.review?.score ?? -1) - (a.review?.score ?? -1)
                || new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt)
                || String(a._id).localeCompare(String(b._id)));
        const provisionalRank = new Map(reviewed.map((s, i) => [String(s._id), i + 1]));

        const rows = subs.map(s => {
            const rank = provisionalRank.get(String(s._id)) ?? null;
            const tier = rank ? findRankTier(round.rankRewards, rank) : null;
            return {
                _id: s._id,
                user: { _id: s.userId?._id, name: s.userId?.name || '(đã xoá)' },
                status: s.status,
                score: s.review?.score ?? null,
                wordCount: s.wordCount,
                attemptCount: s.attemptCount,
                lastSubmittedAt: s.lastSubmittedAt,
                provisionalRank: rank,
                expectedRankReward: tier
                    ? { xp: Math.floor(round.xpReward * tier.multiplier), coin: Math.floor(round.coinReward * tier.multiplier) }
                    : null,
                finalRank: s.finalRank,
                rankReward: s.rankReward,
            };
        }).sort((a, b) => (a.provisionalRank ?? Infinity) - (b.provisionalRank ?? Infinity)
            || new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt));

        const stats = { total: subs.length, submitted: 0, in_review: 0, reviewed: 0 };
        for (const s of subs) stats[s.status]++;

        const now = new Date();
        const canPublish = round.publishStatus !== 'published'
            && now >= new Date(round.endAt)
            && stats.total > 0
            && stats.reviewed === stats.total;

        res.json({ data: { round, stats, canPublish, submissions: rows } });
    } catch (err) {
        console.error('[Writing.listRoundSubmissions]', err);
        res.status(500).json({ message: 'Failed to load submissions.' });
    }
};

exports.publishRound = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const result = await publishRound(req.params.id);
        if (result.status !== 200) return res.status(result.status).json({ message: result.message });
        res.json({ data: result.data });
    } catch (err) {
        console.error('[Writing.publishRound]', err);
        res.status(500).json({ message: 'Failed to publish round.' });
    }
};

// ── CMS: Submissions / review ──────────────────────────────────────────────

exports.getSubmission = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const sub = await WritingSubmission.findById(req.params.id).populate('userId', 'name').lean();
        if (!sub) return res.status(404).json({ message: 'Not found.' });
        const round = await WritingRound.findById(sub.roundId)
            .select('title instruction minWords maxWords endAt publishStatus')
            .lean();
        res.json({
            data: {
                ...sub,
                userId: sub.userId?._id,
                user: { _id: sub.userId?._id, name: sub.userId?.name || '(đã xoá)' },
                round,
            },
        });
    } catch (err) {
        console.error('[Writing.getSubmission]', err);
        res.status(500).json({ message: 'Failed to get submission.' });
    }
};

const loadReviewable = async (id) => {
    if (!isId(id)) return { status: 404, message: 'Not found.' };
    const sub = await WritingSubmission.findById(id);
    if (!sub) return { status: 404, message: 'Not found.' };
    const round = await WritingRound.findById(sub.roundId).select('publishStatus').lean();
    if (round?.publishStatus !== 'none') {
        return { status: 400, message: 'Đợt đã công bố xếp hạng, không thể sửa bài chấm.' };
    }
    return { sub };
};

exports.saveReview = async (req, res) => {
    try {
        const { sub, status, message } = await loadReviewable(req.params.id);
        if (!sub) return res.status(status).json({ message });

        const { score, comment, corrections, suggestions } = req.body;
        if (score !== undefined && score !== null && !isValidScore(score)) {
            return res.status(400).json({ message: 'Điểm phải từ 0 đến 10, bước 0.5.' });
        }
        if (corrections !== undefined) {
            const err = validateCorrections(corrections, sub.content);
            if (err) return res.status(400).json({ message: err });
        }
        if (suggestions !== undefined && !Array.isArray(suggestions)) {
            return res.status(400).json({ message: 'suggestions phải là mảng.' });
        }

        const current = sub.review ? sub.review.toObject() : {};
        sub.review = {
            ...current,
            ...(score !== undefined && { score }),
            ...(comment !== undefined && { comment: String(comment) }),
            ...(corrections !== undefined && {
                corrections: [...corrections]
                    .sort((a, b) => a.startIndex - b.startIndex)
                    .map(c => ({
                        startIndex: c.startIndex,
                        endIndex: c.endIndex,
                        original: sub.content.slice(c.startIndex, c.endIndex),
                        corrected: String(c.corrected ?? ''),
                        explanation: String(c.explanation ?? ''),
                    })),
            }),
            ...(suggestions !== undefined && { suggestions: suggestions.map(String).filter(s => s.trim()) }),
        };
        // Saving a review locks the essay so correction offsets stay valid.
        if (sub.status === 'submitted') sub.status = 'in_review';
        await sub.save();
        res.json({ data: sub });
    } catch (err) {
        console.error('[Writing.saveReview]', err);
        res.status(500).json({ message: 'Failed to save review.' });
    }
};

exports.sendReview = async (req, res) => {
    try {
        const { sub, status, message } = await loadReviewable(req.params.id);
        if (!sub) return res.status(status).json({ message });
        if (!sub.review || !isValidScore(sub.review.score)) {
            return res.status(400).json({ message: 'Cần nhập điểm trước khi gửi cho user.' });
        }
        sub.status = 'reviewed';
        if (!sub.review.sentAt) sub.review.sentAt = new Date();
        await sub.save();
        res.json({ data: sub });
    } catch (err) {
        console.error('[Writing.sendReview]', err);
        res.status(500).json({ message: 'Failed to send review.' });
    }
};

// ── iOS ────────────────────────────────────────────────────────────────────

exports.getHomeForIOS = async (req, res) => {
    try {
        const userId = req.userId;
        const now = new Date();

        const activeRounds = await WritingRound.find({
            isActive: true, startAt: { $lte: now }, endAt: { $gt: now },
        }).sort({ endAt: 1 }).lean();

        const mySubs = await WritingSubmission.find({
            userId,
            $or: [
                { roundId: { $in: activeRounds.map(r => r._id) } },
                { finalRank: null },
                { finalRank: { $ne: null }, resultAckAt: null },
            ],
        }).lean();
        const subByRound = new Map(mySubs.map(s => [String(s.roundId), s]));

        const activeIds = new Set(activeRounds.map(r => String(r._id)));
        const otherRoundIds = mySubs.map(s => s.roundId).filter(id => !activeIds.has(String(id)));
        const otherRounds = await WritingRound.find({ _id: { $in: otherRoundIds } }).lean();

        const withMine = (r) => {
            const s = subByRound.get(String(r._id));
            return { round: roundForIOS(r), mySubmission: s ? submissionSummaryForIOS(s) : null };
        };

        res.json({
            data: {
                active: activeRounds.map(withMine),
                // Rounds that ended but whose ranking isn't published yet, where I submitted.
                awaitingResults: otherRounds.filter(r => r.publishStatus !== 'published').map(withMine),
                // Published rounds whose result I haven't acknowledged yet.
                newResults: otherRounds
                    .filter(r => r.publishStatus === 'published' && subByRound.get(String(r._id))?.resultAckAt == null)
                    .map(withMine),
            },
        });
    } catch (err) {
        console.error('[Writing.getHomeForIOS]', err);
        res.status(500).json({ message: 'Failed to load writing home.' });
    }
};

exports.getRoundForIOS = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const round = await WritingRound.findById(req.params.id).lean();
        if (!round) return res.status(404).json({ message: 'Not found.' });

        const sub = await WritingSubmission.findOne({ userId: req.userId, roundId: round._id }).lean();
        const visible = round.isActive && new Date(round.startAt) <= new Date();
        if (!visible && !sub) return res.status(404).json({ message: 'Not found.' });

        res.json({ data: { round: roundForIOS(round), mySubmission: sub ? submissionForIOS(sub) : null } });
    } catch (err) {
        console.error('[Writing.getRoundForIOS]', err);
        res.status(500).json({ message: 'Failed to load round.' });
    }
};

exports.submitForIOS = async (req, res) => {
    try {
        const userId = req.userId;
        if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const round = await WritingRound.findById(req.params.id).lean();
        if (!round || !round.isActive) return res.status(404).json({ message: 'Không tìm thấy đề.' });

        const now = new Date();
        if (now < new Date(round.startAt)) return res.status(400).json({ message: 'Đề chưa mở.' });
        if (now >= new Date(round.endAt)) return res.status(400).json({ message: 'Đã hết hạn nộp bài.' });
        if (round.isPremium && !(await userHasPremiumAccess(req))) {
            return res.status(403).json({ message: 'Đề này dành cho tài khoản Premium.' });
        }

        const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
        if (!content) return res.status(400).json({ message: 'Bài viết không được để trống.' });
        if (content.length > MAX_CONTENT_LENGTH) {
            return res.status(400).json({ message: `Bài viết tối đa ${MAX_CONTENT_LENGTH} ký tự.` });
        }
        const wordCount = countWords(content);
        if (wordCount < round.minWords || wordCount > round.maxWords) {
            return res.status(400).json({ message: `Bài viết cần từ ${round.minWords} đến ${round.maxWords} từ (hiện có ${wordCount}).` });
        }

        const existing = await WritingSubmission.findOne({ userId, roundId: round._id }).select('_id').lean();
        if (!existing) {
            try {
                const created = await WritingSubmission.create({
                    userId,
                    roundId: round._id,
                    promptId: round.promptId,
                    content,
                    wordCount,
                    firstSubmittedAt: now,
                    lastSubmittedAt: now,
                });
                const rewardGranted = await grantParticipationReward(created, round);
                const fresh = await WritingSubmission.findById(created._id).lean();
                return res.status(201).json({ data: { submission: submissionForIOS(fresh), rewardGranted } });
            } catch (err) {
                if (err.code !== 11000) throw err;
                // Concurrent first submit from the same user: fall through to the update path.
            }
        }

        const updated = await WritingSubmission.findOneAndUpdate(
            { userId, roundId: round._id, status: 'submitted' },
            { $set: { content, wordCount, lastSubmittedAt: now }, $inc: { attemptCount: 1 } },
            { new: true }
        ).lean();
        if (!updated) {
            return res.status(409).json({ message: 'Bài đang được chấm, không thể sửa nữa.' });
        }
        res.json({ data: { submission: submissionForIOS(updated), rewardGranted: { xp: 0, coin: 0 } } });
    } catch (err) {
        console.error('[Writing.submitForIOS]', err);
        res.status(500).json({ message: 'Failed to submit.' });
    }
};

exports.listMySubmissionsForIOS = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
        const subs = await WritingSubmission.find({ userId: req.userId })
            .sort({ lastSubmittedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('roundId', 'title label level startAt endAt publishStatus')
            .lean();
        const total = await WritingSubmission.countDocuments({ userId: req.userId });

        res.json({
            data: subs.map(s => ({
                ...submissionSummaryForIOS(s),
                round: s.roundId ? {
                    _id: s.roundId._id,
                    title: s.roundId.title,
                    label: s.roundId.label,
                    level: s.roundId.level,
                    startAt: s.roundId.startAt,
                    endAt: s.roundId.endAt,
                    isPublished: s.roundId.publishStatus === 'published',
                } : null,
            })),
            pagination: { total, page, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error('[Writing.listMySubmissionsForIOS]', err);
        res.status(500).json({ message: 'Failed to load submissions.' });
    }
};

exports.getRankingForIOS = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const round = await WritingRound.findById(req.params.id).lean();
        if (!round) return res.status(404).json({ message: 'Not found.' });
        if (round.publishStatus !== 'published') {
            return res.status(400).json({ message: 'Chưa công bố xếp hạng.' });
        }

        const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 200);
        const top = await WritingSubmission.find({ roundId: round._id, finalRank: { $ne: null } })
            .sort({ finalRank: 1 })
            .limit(limit)
            .populate('userId', 'name profileImage')
            .select('userId finalRank review.score rankReward lastSubmittedAt')
            .lean();
        const mine = await WritingSubmission.findOne({ roundId: round._id, userId: req.userId })
            .select('finalRank review.score rankReward status')
            .lean();
        const total = await WritingSubmission.countDocuments({ roundId: round._id, finalRank: { $ne: null } });

        res.json({
            data: {
                round: roundForIOS(round),
                total,
                entries: top.map(s => ({
                    rank: s.finalRank,
                    userId: s.userId?._id,
                    name: s.userId?.name || 'User',
                    avatar: s.userId?.profileImage || null,
                    score: s.review?.score ?? null,
                    reward: s.rankReward ? { xp: s.rankReward.xp, coin: s.rankReward.coin } : null,
                    isMe: String(s.userId?._id) === String(req.userId),
                })),
                me: mine ? {
                    rank: mine.finalRank,
                    score: mine.review?.score ?? null,
                    reward: mine.rankReward ? { xp: mine.rankReward.xp, coin: mine.rankReward.coin } : null,
                } : null,
            },
        });
    } catch (err) {
        console.error('[Writing.getRankingForIOS]', err);
        res.status(500).json({ message: 'Failed to load ranking.' });
    }
};

// Returns the rank reward exactly once so the client can add it to its local progress.
exports.ackResultForIOS = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const acked = await WritingSubmission.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId, finalRank: { $ne: null }, resultAckAt: null },
            { $set: { resultAckAt: new Date() } },
            { new: true }
        ).lean();

        if (!acked) {
            const exists = await WritingSubmission.exists({ _id: req.params.id, userId: req.userId });
            if (!exists) return res.status(404).json({ message: 'Not found.' });
            return res.json({ data: { alreadyAcked: true, rank: null, reward: { xp: 0, coin: 0 } } });
        }

        res.json({
            data: {
                alreadyAcked: false,
                rank: acked.finalRank,
                reward: { xp: acked.rankReward?.xp || 0, coin: acked.rankReward?.coin || 0 },
            },
        });
    } catch (err) {
        console.error('[Writing.ackResultForIOS]', err);
        res.status(500).json({ message: 'Failed to acknowledge result.' });
    }
};
