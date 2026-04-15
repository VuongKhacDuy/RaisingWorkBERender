const Achievement = require("../models/Achievement/AchievementModel");
const UserAchievement = require("../models/Achievement/UserAchievementModel");
const defaultAchievements = require("../utils/defaultAchievements");

// POST /api/achievements/sync — Sync multiple achievements from the app
const syncAchievements = async (req, res) => {
    try {
        const { achievements } = req.body; // Array of achievements from App
        const userId = req.userId;

        if (!Array.isArray(achievements)) {
            return res.status(400).json({ message: "Invalid payload formatting." });
        }

        // Chỉ lưu những thành tựu có tiến độ thực tế (tiết kiệm DB)
        const bulkOps = achievements
            .filter(ach => ach.currentProgress > 0 || ach.isUnlocked)
            .map((ach) => ({
                updateOne: {
                    filter: { userId, achievementId: ach.id },
                    update: {
                        $set: {
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
            await UserAchievement.bulkWrite(bulkOps);
        }

        res.status(200).json({
            message: "Achievements synced successfully.",
            syncedCount: bulkOps.length
        });
    } catch (error) {
        console.error("Error syncing achievements:", error);
        res.status(500).json({ message: "Failed to sync achievements." });
    }
};

// GET /api/achievements — Get all achievements with merged user progress
const getAchievements = async (req, res) => {
    try {
        const userId = req.userId;

        // 1. Đảm bảo bảng Master (Achievement) luôn có đủ data từ defaultAchievements.js
        let masterAchievements = await Achievement.find();
        if (masterAchievements.length < defaultAchievements.length) {
            console.log("Master Sync: Cập nhật danh sách thành tựu gốc...");
            const masterOps = defaultAchievements.map(ach => ({
                updateOne: {
                    filter: { achievementId: ach.achievementId },
                    update: { $set: ach },
                    upsert: true
                }
            }));
            await Achievement.bulkWrite(masterOps);
            masterAchievements = await Achievement.find();
        }

        // 2. Lấy quá trình thực tế của User
        const userProgress = await UserAchievement.find({ userId });

        // 3. Trộn dữ liệu (Virtual Merge)
        const combinedData = masterAchievements.map(master => {
            const progress = userProgress.find(p => p.achievementId === master.achievementId);
            
            return {
                achievementId: master.achievementId,
                title: master.title,
                desc: master.desc,
                iconName: master.iconName,
                category: master.category,
                requirement: master.requirement,
                currentProgress: progress ? progress.currentProgress : 0,
                isUnlocked: progress ? progress.isUnlocked : false,
                unlockedDate: progress ? progress.unlockedDate : null
            };
        });

        res.status(200).json({
            data: combinedData,
        });
    } catch (error) {
        console.error("Error fetching achievements:", error);
        res.status(500).json({ message: "Failed to fetch achievements." });
    }
};

module.exports = { syncAchievements, getAchievements };
