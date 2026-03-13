const DailyMission = require('../models/User/DailyMissionModel');

// GET /api/daily-missions — lấy nhiệm vụ hôm nay của user
const getDailyMissions = async (req, res) => {
    try {
        const userId = req.userId;
        const missions = await DailyMission.find({ userId });
        res.status(200).json({ data: missions });
    } catch (error) {
        console.error('Error fetching daily missions:', error);
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
            syncedCount: bulkOps.length,
            deletedCount: deleteResult.deletedCount
        });
    } catch (error) {
        console.error('Error syncing daily missions:', error);
        res.status(500).json({ message: 'Failed to sync daily missions.' });
    }
};

module.exports = { getDailyMissions, syncDailyMissions };
