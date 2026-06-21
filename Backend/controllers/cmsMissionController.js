const MissionPool = require('../models/User/MissionPoolModel');

const allowedMissionTypes = [
    'learnWords',
    'playGames',
    'maintainStreak',
    'spacedReview',
    'spacedReview7',
    'accuracyReview',
    'correctStreak',
    'perfectGame',
    'fastQuiz',
    'wordPuzzle',
    'matchingGame',
    'dailyTasks',
    'mixedActivity',
    'listenWords',
    'mascotInteract'
];

const allowedDifficulties = ['Easy', 'Medium', 'Hard'];

const normalizeMissionPayload = (body) => {
    const title = String(body.title || '').trim();
    const desc = String(body.desc || '').trim();
    const type = String(body.type || '').trim();
    const difficulty = allowedDifficulties.includes(body.difficulty) ? body.difficulty : 'Easy';
    const baseTarget = Number.parseInt(body.baseTarget, 10);
    const xpReward = Number.parseInt(body.xpReward || 0, 10);
    const coinReward = Number.parseInt(body.coinReward || 0, 10);

    if (!title || !desc || !type) {
        return { error: 'title, desc and type are required.' };
    }

    if (!allowedMissionTypes.includes(type)) {
        return { error: `Unsupported mission type: ${type}.` };
    }

    if (!Number.isFinite(baseTarget) || baseTarget < 1 || baseTarget > 100) {
        return { error: 'baseTarget must be between 1 and 100.' };
    }

    return {
        data: {
            title,
            desc,
            type,
            baseTarget,
            difficulty,
            xpReward: Number.isFinite(xpReward) ? Math.max(0, xpReward) : 0,
            coinReward: Number.isFinite(coinReward) ? Math.max(0, coinReward) : 0,
            isActive: body.isActive !== false
        }
    };
};

exports.listMissionPool = async (_req, res) => {
    try {
        const missions = await MissionPool.find().sort({ isActive: -1, type: 1, createdAt: -1 });
        res.status(200).json({ data: missions });
    } catch (error) {
        console.error('[CMS Mission] list error:', error);
        res.status(500).json({ message: 'Failed to list mission pool.' });
    }
};

exports.createMissionPoolItem = async (req, res) => {
    try {
        const normalized = normalizeMissionPayload(req.body);
        if (normalized.error) {
            return res.status(400).json({ message: normalized.error });
        }

        const mission = await MissionPool.create(normalized.data);
        res.status(201).json({ data: mission });
    } catch (error) {
        console.error('[CMS Mission] create error:', error);
        res.status(500).json({ message: 'Failed to create mission.' });
    }
};

exports.updateMissionPoolItem = async (req, res) => {
    try {
        const normalized = normalizeMissionPayload(req.body);
        if (normalized.error) {
            return res.status(400).json({ message: normalized.error });
        }

        const mission = await MissionPool.findByIdAndUpdate(req.params.id, normalized.data, {
            new: true,
            runValidators: true
        });

        if (!mission) {
            return res.status(404).json({ message: 'Mission not found.' });
        }

        res.status(200).json({ data: mission });
    } catch (error) {
        console.error('[CMS Mission] update error:', error);
        res.status(500).json({ message: 'Failed to update mission.' });
    }
};

exports.deleteMissionPoolItem = async (req, res) => {
    try {
        const mission = await MissionPool.findByIdAndDelete(req.params.id);
        if (!mission) {
            return res.status(404).json({ message: 'Mission not found.' });
        }

        res.status(200).json({ message: 'Mission deleted.' });
    } catch (error) {
        console.error('[CMS Mission] delete error:', error);
        res.status(500).json({ message: 'Failed to delete mission.' });
    }
};
