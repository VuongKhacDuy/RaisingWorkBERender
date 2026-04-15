const Achievement = require("../models/Achievement/AchievementModel");

// POST /api/achievements/sync — Sync multiple achievements from the app
const syncAchievements = async (req, res) => {
    try {
        const { achievements } = req.body; // Array of achievements

        if (!Array.isArray(achievements)) {
            return res.status(400).json({ message: "Invalid payload formatting. Expected an array of achievements." });
        }

        const userId = req.userId;
        const bulkOps = achievements.map((ach) => ({
            updateOne: {
                filter: { userId, achievementId: ach.id },
                update: {
                    $set: {
                        title: ach.title,
                        desc: ach.desc,
                        iconName: ach.iconName,
                        category: ach.category,
                        requirement: ach.requirement,
                        currentProgress: ach.currentProgress,
                        isUnlocked: ach.isUnlocked,
                        unlockedDate: ach.unlockedDate || null,
                        updatedAt: new Date(),
                    }
                },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await Achievement.bulkWrite(bulkOps);
        }

        res.status(200).json({
            message: "Achievements synced successfully.",
            syncedCount: bulkOps.length,
            deletedCount: deleteResult.deletedCount,
        });
    } catch (error) {
        console.error("Error syncing achievements:", error);
        res.status(500).json({ message: "Failed to sync achievements." });
    }
};

// GET /api/achievements — Get all achievements of the logged-in user
const getAchievements = async (req, res) => {
    try {
        const userId = req.userId;
        let achievements = await Achievement.find({ userId });

        // 🔑 Smart Sync (Dynamic Seed): Tự động đắp thêm các thành tựu mới nếu Developer thêm bản cập nhật mới
        const defaultAchievements = require("../utils/defaultAchievements");
        if (achievements.length < defaultAchievements.length) {
            const userAchievementIds = achievements.map(a => a.achievementId);
            const missingAchievements = defaultAchievements.filter(
                (defAch) => !userAchievementIds.includes(defAch.achievementId)
            );

            if (missingAchievements.length > 0) {
                const newAchievementsToInsert = missingAchievements.map(ach => ({
                    ...ach,
                    userId: userId
                }));
                await Achievement.insertMany(newAchievementsToInsert);
                console.log(`Smart Sync: Đã tự động thêm ${missingAchievements.length} thành tựu mới cho user ${userId}`);
                
                // Lấy lại bộ danh sách hoàn chỉnh
                achievements = await Achievement.find({ userId });
            }
        }

        res.status(200).json({
            data: achievements,
        });
    } catch (error) {
        console.error("Error fetching achievements:", error);
        res.status(500).json({ message: "Failed to fetch achievements." });
    }
};

module.exports = { syncAchievements, getAchievements };
