const DailyMission = require('../models/User/DailyMissionModel');
const MissionPool = require('../models/User/MissionPoolModel');
const mongoose = require('mongoose');

const defaultPool = [
    // 🧠 Nhóm Học Sâu (Deep Learning)
    { title: "Meaning Master", desc: "Write meaning for 5 words", type: "writeMeaning", baseTarget: 5, difficulty: "Easy", xpReward: 60, coinReward: 25 },
    { title: "Example Builder", desc: "Create 3 example sentences", type: "writeExample", baseTarget: 3, difficulty: "Medium", xpReward: 90, coinReward: 40 },
    { title: "Context King", desc: "Learn 5 words with full context", type: "learnWithContext", baseTarget: 5, difficulty: "Medium", xpReward: 100, coinReward: 50 },
    { title: "Synonym Hunter", desc: "Find synonyms for 5 words", type: "findSynonyms", baseTarget: 5, difficulty: "Medium", xpReward: 80, coinReward: 35 },

    // 🔁 Nhóm Ghi Nhớ (Retention)
    { title: "Memory Keeper", desc: "Review old words (day-2)", type: "spacedReview", baseTarget: 10, difficulty: "Easy", xpReward: 70, coinReward: 30 },
    { title: "Long-term Brain", desc: "Review words after 7 days", type: "spacedReview7", baseTarget: 10, difficulty: "Medium", xpReward: 120, coinReward: 60 },
    { title: "No Forget Zone", desc: "Get 90% correct in review", type: "accuracyReview", baseTarget: 90, difficulty: "Hard", xpReward: 150, coinReward: 70 },

    // 🎯 Nhóm Kỹ Năng (Accuracy)
    { title: "Sharp Mind", desc: "Answer 10 questions correctly in a row", type: "correctStreak", baseTarget: 10, difficulty: "Medium", xpReward: 100, coinReward: 50 },
    { title: "Perfectionist", desc: "Finish a game with 100% accuracy", type: "perfectGame", baseTarget: 1, difficulty: "Hard", xpReward: 200, coinReward: 100 },
    { title: "Speed Runner", desc: "Finish a quiz under 60 seconds", type: "fastQuiz", baseTarget: 1, difficulty: "Medium", xpReward: 90, coinReward: 40 },

    // 🗣️ Nhóm AI / Speaking
    { title: "Talkative Learner", desc: "Speak 10 words", type: "aiSpeaking", baseTarget: 10, difficulty: "Easy", xpReward: 80, coinReward: 30 },
    { title: "Accent Master", desc: "Get 80+ pronunciation score", type: "pronunciationScore", baseTarget: 80, difficulty: "Medium", xpReward: 120, coinReward: 60 },
    { title: "Shadowing Pro", desc: "Repeat 5 sentences correctly", type: "shadowing", baseTarget: 5, difficulty: "Hard", xpReward: 150, coinReward: 70 },

    // 🧩 Nhóm Game Variety
    { title: "Puzzle Solver", desc: "Complete 3 word puzzles", type: "wordPuzzle", baseTarget: 3, difficulty: "Easy", xpReward: 60, coinReward: 25 },
    { title: "Match Master", desc: "Match 15 word pairs", type: "matchingGame", baseTarget: 15, difficulty: "Medium", xpReward: 90, coinReward: 40 },

    // 🔥 Nhóm Quản Lý Thói Quen (Habit)
    { title: "Early Bird", desc: "Open app before 9AM", type: "earlyLogin", baseTarget: 1, difficulty: "Easy", xpReward: 50, coinReward: 20 },
    { title: "Night Owl", desc: "Study after 9PM", type: "nightStudy", baseTarget: 1, difficulty: "Easy", xpReward: 50, coinReward: 20 },
    { title: "Consistency King", desc: "Complete 3 tasks today", type: "dailyTasks", baseTarget: 3, difficulty: "Medium", xpReward: 120, coinReward: 60 },
    { title: "All-rounder", desc: "Do learn + review + game", type: "mixedActivity", baseTarget: 1, difficulty: "Hard", xpReward: 200, coinReward: 100 },

    // 🎧 Nhóm Nghe (Listening)
    { title: "Echo Learner", desc: "Listen to 5 word pronunciations", type: "listenWords", baseTarget: 5, difficulty: "Easy", xpReward: 50, coinReward: 20 },
    { title: "Auditory pro", desc: "Listen and identify 10 words", type: "identifyFromAudio", baseTarget: 10, difficulty: "Medium", xpReward: 100, coinReward: 45 },

    // 🐾 Nhóm Tương tác Mascot (Mascot Interaction)
    { title: "Mascot's Friend", desc: "Tap on your mascot 5 times", type: "mascotInteract", baseTarget: 5, difficulty: "Easy", xpReward: 30, coinReward: 10 },
    { title: "Fashionista", desc: "Change mascot's outfit once", type: "changeOutfit", baseTarget: 1, difficulty: "Easy", xpReward: 40, coinReward: 15 },
    { title: "Happy Mascot", desc: "Keep mascot's emotion 'Happy' or 'Excited'", type: "keepHappy", baseTarget: 1, difficulty: "Medium", xpReward: 80, coinReward: 30 },

    // 🌐 Nhóm Cộng đồng (Social - Placeholder)
    { title: "Deep Sharer", desc: "Share a word's detail to friends", type: "shareWord", baseTarget: 1, difficulty: "Easy", xpReward: 60, coinReward: 30 },
    { title: "Social Learner", desc: "Invite a friend to study", type: "inviteFriend", baseTarget: 1, difficulty: "Hard", xpReward: 300, coinReward: 150 }
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

        // Shuffle and pick smart selection: 1 Easy, 1 Medium, 1 Hard
        const easy = pool.filter(m => m.difficulty === 'Easy').sort(() => 0.5 - Math.random());
        const medium = pool.filter(m => m.difficulty === 'Medium').sort(() => 0.5 - Math.random());
        const hard = pool.filter(m => m.difficulty === 'Hard').sort(() => 0.5 - Math.random());

        const selected = [];
        if (easy.length > 0) selected.push(easy[0]);
        if (medium.length > 0) selected.push(medium[0]);
        if (hard.length > 0) selected.push(hard[0]);

        // If something is missing (e.g. no hard missions in pool), pick randoms to make it 3
        if (selected.length < 3) {
            const remaining = pool.filter(m => !selected.includes(m)).sort(() => 0.5 - Math.random());
            selected.push(...remaining.slice(0, 3 - selected.length));
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
