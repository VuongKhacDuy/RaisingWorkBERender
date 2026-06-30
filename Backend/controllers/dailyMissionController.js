const DailyMission = require('../models/User/DailyMissionModel');
const MissionPool = require('../models/User/MissionPoolModel');
const mongoose = require('mongoose');

const defaultPool = [
    { title: "Open UUMI Today", desc: "Open the app once today.", type: "maintainStreak", baseTarget: 1, difficulty: "Easy", xpReward: 25, coinReward: 10 },
    { title: "Save 3 Words", desc: "Save useful words from lessons, search, or manual entry.", type: "learnWords", baseTarget: 3, difficulty: "Easy", xpReward: 40, coinReward: 15 },
    { title: "Practice Once", desc: "Complete one short practice game.", type: "playGames", baseTarget: 1, difficulty: "Easy", xpReward: 35, coinReward: 15 },
    { title: "Review Due Words", desc: "Review a small batch of due words.", type: "spacedReview", baseTarget: 5, difficulty: "Easy", xpReward: 45, coinReward: 20 },
    { title: "Save 1 Word", desc: "Save one useful word today.", type: "learnWords", baseTarget: 1, difficulty: "Easy", xpReward: 20, coinReward: 8 },
    { title: "Review 3 Words", desc: "Review three due words.", type: "spacedReview", baseTarget: 3, difficulty: "Easy", xpReward: 30, coinReward: 12 }
];

// GET /api/daily-missions — lấy nhiệm vụ hôm nay của user
const getDailyMissions = async (req, res) => {
    try {
        const userId = req.userId;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Find missions for today
        let missions = await DailyMission.find({
            userId,
            resetDate: { $gte: startOfToday }
        });

        if (missions.length >= 3) {
            return res.status(200).json({ data: missions });
        }

        // If user has fewer than 3 (maybe from old logic), clear them and regenerate a fresh set of 3
        if (missions.length > 0) {
            console.log(`Backend: User has only ${missions.length} missions. Resetting for today...`);
            await DailyMission.deleteMany({
                userId,
                resetDate: { $gte: startOfToday }
            });
        }

        // No missions for today yet? Pick short, trackable missions from the pool.
        let pool = await MissionPool.find({ isActive: true });

        if (pool.length < 4) {
            console.log(`Backend: Mission Pool is incomplete (${pool.length}). Re-seeding default missions...`);
            await MissionPool.deleteMany({});
            pool = await MissionPool.insertMany(defaultPool);
        }

        const selected = [];
        const fixedTypes = ['maintainStreak', 'learnWords'];
        fixedTypes.forEach((type) => {
            const candidates = pool.filter(m => m.type === type).sort(() => 0.5 - Math.random());
            if (candidates.length > 0) selected.push(candidates[0]);
        });

        if (selected.length < 4) {
            const remaining = pool.filter(m => !selected.includes(m)).sort(() => 0.5 - Math.random());
            selected.push(...remaining.slice(0, 4 - selected.length));
        }

        const newMissions = selected.map(template => ({
            userId,
            missionId: new mongoose.Types.ObjectId().toString(),
            title: template.title,
            desc: template.desc,
            type: template.type,
            targetValue: template.baseTarget,
            currentProgress: 0,
            xpReward: template.xpReward,
            coinReward: template.coinReward,
            isCompleted: false,
            resetDate: new Date()
        }));

        await DailyMission.insertMany(newMissions);

        res.status(200).json({ data: newMissions });
    } catch (error) {
        console.error('Error fetching/randomizing daily missions:', error);
        res.status(500).json({ message: 'Failed to fetch daily missions.' });
    }
};

// POST /api/daily-missions/sync — đồng bộ nhiệm vụ ngày từ app lên
const syncDailyMissions = async (req, res) => {
    try {
        const { missions } = req.body;

        if (!Array.isArray(missions)) {
            return res.status(400).json({ message: 'Invalid payload. Expected an array of missions.' });
        }

        const userId = req.userId;

        const bulkOps = missions.map((m) => ({
            updateOne: {
                filter: { userId, missionId: m.id },
                update: {
                    $set: {
                        title: m.title,
                        desc: m.desc,
                        type: m.type,
                        targetValue: m.targetValue,
                        currentProgress: m.currentProgress,
                        xpReward: m.xpReward,
                        coinReward: m.coinReward,
                        isCompleted: m.isCompleted,
                        resetDate: m.resetDate || new Date(),
                    }
                },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await DailyMission.bulkWrite(bulkOps);
        }

        res.status(200).json({
            message: 'Daily missions synced.',
            syncedCount: bulkOps.length
        });
    } catch (error) {
        console.error('Error syncing daily missions:', error);
        res.status(500).json({ message: 'Failed to sync daily missions.' });
    }
};

module.exports = { getDailyMissions, syncDailyMissions };
