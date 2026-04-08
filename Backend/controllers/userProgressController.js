const mongoose = require('mongoose');
const UserProgress = require('../models/User/UserProgressModel');
const UserPet = require('../models/Pet/UserPetModel');
const PetTemplate = require('../models/Pet/PetTemplateModel');

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

        console.log(`📡 [Backend] Syncing UserProgress for User: ${userId}`);
        
        // 1. Lấy dữ liệu cũ để so sánh
        const oldProgress = await UserProgress.findOne({ userId });
        const oldUnlocked = oldProgress ? oldProgress.unlockedMascots : [];

        // 2. Cập nhật UserProgress
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

        // 3. Tự động tạo bản ghi UserPet cho các Mascot mới mở khóa
        if (unlockedMascots && Array.isArray(unlockedMascots)) {
            const newlyUnlocked = unlockedMascots.filter(m => !oldUnlocked.includes(m));
            
            for (const mascotIdOrName of newlyUnlocked) {
                // Kiểm tra xem đã có bản ghi UserPet chưa (đề phòng)
                // Tìm PetTemplate theo ID hoặc Name (slug logic)
                const template = await PetTemplate.findOne({ 
                    $or: [
                        { _id: mongoose.isValidObjectId(mascotIdOrName) ? mascotIdOrName : new mongoose.Types.ObjectId() }, 
                        { name: new RegExp(`^${mascotIdOrName}$`, 'i') } 
                    ] 
                });

                if (template) {
                    const existingUserPet = await UserPet.findOne({ userId, petTemplateId: template._id });
                    if (!existingUserPet) {
                        const newUserPet = new UserPet({
                            userId,
                            petTemplateId: template._id,
                            hp: template.baseHp,
                            mana: template.baseMana,
                            power: template.basePower,
                            level: 1,
                            isActive: (selectedMascot === mascotIdOrName)
                        });
                        await newUserPet.save();
                        console.log(`✨ [Backend] Created UserPet profile for ${template.name} (User: ${userId})`);
                    }
                } else {
                    console.log(`⚠️ [Backend] PetTemplate not found for: ${mascotIdOrName}`);
                }
            }
        }

        res.status(200).json({ message: 'User progress synced.', data: updated });
    } catch (error) {
        console.error('Error syncing user progress:', error);
        res.status(500).json({ message: 'Failed to sync user progress.' });
    }
};

module.exports = { getUserProgress, syncUserProgress };
