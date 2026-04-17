const Achievement = require("../models/Achievement/AchievementModel");
const UserAchievement = require("../models/Achievement/UserAchievementModel");

// POST /api/achievements/sync — Sync multiple achievements from the app
const syncAchievements = async (req, res) => {
    try {
        const { achievements } = req.body; // Array of achievements from App
        const userId = req.userId;

        if (!Array.isArray(achievements)) {
            return res.status(400).json({ message: "Invalid payload formatting." });
        }

        // Chỉ lưu những thành tựu có tiến độ thực tế (tiết kiệm DB)
        const progressToSave = achievements
            .filter(ach => ach.currentProgress > 0 || ach.isUnlocked)
            .map((ach) => ({
                achievementId: ach.id,
                currentProgress: ach.currentProgress,
                isUnlocked: ach.isUnlocked,
                unlockedDate: ach.unlockedDate || null,
                updatedAt: new Date(),
            }));

        // Luôn sử dụng đúng một bản ghi duy nhất cho mỗi user (Tối ưu hóa bản ghi)
        await UserAchievement.findOneAndUpdate(
            { userId },
            {
                $set: { progress: progressToSave, updatedAt: new Date() }
            },
            { upsert: true, new: true }
        );

        res.status(200).json({
            message: "Achievements synced successfully.",
            syncedCount: progressToSave.length
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

        // 1. Lấy toàn bộ template từ bảng Master
        let masterAchievements = await Achievement.find();

        // 2. Lấy "Tấm bảng vàng" duy nhất của User
        const userProgressDoc = await UserAchievement.findOne({ userId });
        const userProgressArray = userProgressDoc ? userProgressDoc.progress : [];

        // 3. Trộn dữ liệu (Virtual Merge)
        const combinedData = masterAchievements.map(master => {
            const progress = userProgressArray.find(p => p.achievementId === master.achievementId);

            return {
                achievementId: master.achievementId,
                title: master.title,
                desc: master.desc,
                iconName: master.iconName,
                category: master.category,
                requirement: master.requirement,
                xpReward: master.xpReward || 0,
                coinReward: master.coinReward || 0,
                isHidden: master.isHidden || 0,
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

// ─── TEMPLATE CRUD ─────────────────────────────────────────────────────────

// GET /api/achievements/templates — List all master achievement templates
const listTemplates = async (req, res) => {
    try {
        const templates = await Achievement.find().sort({ category: 1, requirement: 1 });
        res.status(200).json({ data: templates });
    } catch (error) {
        console.error("Error listing achievement templates:", error);
        res.status(500).json({ message: "Failed to fetch achievement templates." });
    }
};

// POST /api/achievements/templates — Create one or many achievement templates
// Body: single object OR array of objects
// Required fields: achievementId, title, desc, iconName, category, requirement
const createTemplate = async (req, res) => {
    try {
        const payload = req.body;
        const items = Array.isArray(payload) ? payload : [payload];

        // Validate required fields
        const REQUIRED = ["achievementId", "title", "desc", "iconName", "category", "requirement"];
        for (const item of items) {
            const missing = REQUIRED.filter(f => !item[f] && item[f] !== 0);
            if (missing.length > 0) {
                return res.status(400).json({
                    message: `Missing required fields: ${missing.join(", ")}`,
                    item
                });
            }
        }

        // Upsert each item by achievementId (idempotent — safe to re-run)
        const ops = items.map(item => ({
            updateOne: {
                filter: { achievementId: item.achievementId },
                update: { $set: item },
                upsert: true
            }
        }));
        const result = await Achievement.bulkWrite(ops);

        res.status(201).json({
            message: `${items.length} achievement template(s) created/updated.`,
            upsertedCount: result.upsertedCount,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("Error creating achievement template:", error);
        res.status(500).json({ message: "Failed to create achievement template." });
    }
};

// PUT /api/achievements/templates/:achievementId — Update a template
const updateTemplate = async (req, res) => {
    try {
        const { achievementId } = req.params;
        const updates = req.body;

        // Prevent overwriting the achievementId itself
        delete updates.achievementId;

        const updated = await Achievement.findOneAndUpdate(
            { achievementId },
            { $set: updates },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: `Achievement '${achievementId}' not found.` });
        }

        res.status(200).json({ message: "Achievement template updated.", data: updated });
    } catch (error) {
        console.error("Error updating achievement template:", error);
        res.status(500).json({ message: "Failed to update achievement template." });
    }
};

// DELETE /api/achievements/templates/:achievementId — Delete a template
const deleteTemplate = async (req, res) => {
    try {
        const { achievementId } = req.params;

        const deleted = await Achievement.findOneAndDelete({ achievementId });

        if (!deleted) {
            return res.status(404).json({ message: `Achievement '${achievementId}' not found.` });
        }

        res.status(200).json({ message: `Achievement '${achievementId}' deleted successfully.` });
    } catch (error) {
        console.error("Error deleting achievement template:", error);
        res.status(500).json({ message: "Failed to delete achievement template." });
    }
};

module.exports = { syncAchievements, getAchievements, listTemplates, createTemplate, updateTemplate, deleteTemplate };

