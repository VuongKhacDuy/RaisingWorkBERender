const UserProgress = require('../models/User/UserProgressModel');

// GET /api/user-progress — lấy tiến trình của user đang đăng nhập
const getUserProgress = async (req, res) => {
    try {
        const userId = req.userId;
        let progress = await UserProgress.findOne({ userId });

        if (!progress) {
            // Tạo mặc định nếu chưa có
            progress = new UserProgress({ userId });
            await progress.save();
        }

        res.status(200).json({ data: progress });
    } catch (error) {
        console.error('Error fetching user progress:', error);
        res.status(500).json({ message: 'Failed to fetch user progress.' });
    }
};

// POST /api/user-progress/sync — đồng bộ tiến trình từ app lên
const syncUserProgress = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            currentStreak, lastActivityDate, totalXP, totalCoins,
            level, selectedMascot, selectedOutfit, unlockedOutfits, unlockedMascots
        } = req.body;

        const updated = await UserProgress.findOneAndUpdate(
            { userId },
            {
                $set: {
                    ...(currentStreak !== undefined && { currentStreak }),
                    ...(lastActivityDate !== undefined && { lastActivityDate }),
                    ...(totalXP !== undefined && { totalXP }),
                    ...(totalCoins !== undefined && { totalCoins }),
                    ...(level !== undefined && { level }),
                    ...(selectedMascot !== undefined && { selectedMascot }),
                    ...(selectedOutfit !== undefined && { selectedOutfit }),
                    ...(unlockedOutfits !== undefined && { unlockedOutfits }),
                    ...(unlockedMascots !== undefined && { unlockedMascots }),
                }
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: 'User progress synced.', data: updated });
    } catch (error) {
        console.error('Error syncing user progress:', error);
        res.status(500).json({ message: 'Failed to sync user progress.' });
    }
};

module.exports = { getUserProgress, syncUserProgress };
