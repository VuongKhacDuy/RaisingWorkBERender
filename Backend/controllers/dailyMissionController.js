const DailyMission = require('../models/User/DailyMissionModel');
const MissionPool = require('../models/User/MissionPoolModel');
const mongoose = require('mongoose');

const defaultPool = [
    { title: "Word Collector I", desc: "Add 5 words to favorites", type: "learnWords", baseTarget: 5, difficulty: "Easy", xpReward: 50, coinReward: 20 },
    { title: "Word Master II", desc: "Add 10 words to favorites", type: "learnWords", baseTarget: 10, difficulty: "Medium", xpReward: 100, coinReward: 50 },
    { title: "Vocabulary Guru", desc: "Add 20 words to favorites", type: "learnWords", baseTarget: 20, difficulty: "Hard", xpReward: 250, coinReward: 100 },
    { title: "Quick Learner", desc: "Complete 2 mini-games", type: "playGames", baseTarget: 2, difficulty: "Easy", xpReward: 30, coinReward: 10 },
    { title: "Gamer Spirit", desc: "Complete 5 mini-games", type: "playGames", baseTarget: 5, difficulty: "Medium", xpReward: 70, coinReward: 30 },
    { title: "Game Enthusiast", desc: "Complete 10 mini-games", type: "playGames", baseTarget: 10, difficulty: "Hard", xpReward: 150, coinReward: 70 },
    { title: "Morning Habit", desc: "Learn something before noon", type: "maintainStreak", baseTarget: 1, difficulty: "Easy", xpReward: 60, coinReward: 25 },
    { title: "Dedicating Student", desc: "Maintain streak for today", type: "maintainStreak", baseTarget: 1, difficulty: "Easy", xpReward: 100, coinReward: 50 },
    { title: "Flashcard Ninja", desc: "Review 15 flashcards", type: "reviewWords", baseTarget: 15, difficulty: "Medium", xpReward: 80, coinReward: 40 },
    { title: "Pronunciation Pro", desc: "Speak 5 words correctly", type: "aiPronunciation", baseTarget: 5, difficulty: "Medium", xpReward: 120, coinReward: 60 }
];

// GET /api/daily-missions — lấy nhiệm vụ hôm nay của user
const getDailyMissions = async (req, res) => {
    try {
        const userId = req.userId;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Find missions for today
        const missions = await DailyMission.find({
            userId,
            resetDate: { $gte: startOfToday }
        });

        if (missions.length > 0) {
            return res.status(200).json({ data: missions });
        }

        // No missions for today yet? Randomly pick 3 from the pool
        let pool = await MissionPool.find({ isActive: true });

        if (pool.length === 0) {
            console.log('Backend: Mission Pool is empty. Auto-seeding default missions...');
            pool = await MissionPool.insertMany(defaultPool);
        }

        // Shuffle and pick 3
        const shuffled = pool.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(3, pool.length));

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
