const mongoose = require('mongoose');
const UserProgress = require('../models/User/UserProgressModel');
const UserPet = require('../models/Pet/UserPetModel');
const PetTemplate = require('../models/Pet/PetTemplateModel');

// GET /api/user-progress
const getUserProgress = async (req, res) => {
    try {
        const userId = req.userId;
        let progress = await UserProgress.findOne({ userId });

        if (!progress) {
            progress = new UserProgress({ userId });
            await progress.save();
        }

        res.status(200).json({ data: progress });
    } catch (error) {
        console.error('[UserProgress] fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch user progress.' });
    }
};

// POST /api/user-progress/sync
const syncUserProgress = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            currentStreak, lastActivityDate, totalXP, totalCoins,
            level, selectedMascot, selectedMascotInstanceId, selectedOutfit,
            unlockedOutfits, userCharacter
        } = req.body;

        console.log(`[UserProgress] Syncing for User: ${userId}`);
        
        const oldProgress = await UserProgress.findOne({ userId });
        const oldUnlocked = oldProgress ? (oldProgress.unlockedMascots || []) : [];

        const updated = await UserProgress.findOneAndUpdate(
            { userId },
            {
                $set: {
                    ...(currentStreak !== undefined && { currentStreak }),
                    ...(lastActivityDate !== undefined && { lastActivityDate }),
                    ...(totalXP !== undefined && { totalXP }),
                    ...(totalCoins !== undefined && { totalCoins }),
                    ...(level !== undefined && { level }),
                    ...(selectedMascot !== undefined && selectedMascot !== '' && { selectedMascot }),
                    ...(selectedMascotInstanceId !== undefined && selectedMascotInstanceId !== '' && { selectedMascotInstanceId }),
                    ...(selectedOutfit !== undefined && selectedOutfit !== '' && { selectedOutfit }),
                    ...(unlockedOutfits !== undefined && { unlockedOutfits }),
                    ...(userCharacter !== undefined && userCharacter !== '' && { userCharacter }),
                }
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: 'User progress synced.', data: updated });
    } catch (error) {
        console.error('[UserProgress] sync error:', error);
        res.status(500).json({ message: 'Failed to sync user progress.' });
    }
};

async function processNewMascots(userId, newlyUnlocked, selectedMascot) {
    for (const mascotIdOrName of newlyUnlocked) {
        if (!mascotIdOrName) continue;
        try {
            const query = {
                $or: [
                    { name: mascotIdOrName }
                ]
            };
            
            if (mongoose && mongoose.isValidObjectId && mongoose.isValidObjectId(mascotIdOrName)) {
                query.$or.push({ _id: mascotIdOrName });
            }

            const template = await PetTemplate.findOne(query);

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
                        isActive: (selectedMascot === mascotIdOrName || selectedMascot === template.name)
                    });
                    await newUserPet.save();
                    console.log(`[UserProgress] Created UserPet for ${template.name}`);
                }
            }
        } catch (e) {
            console.error(`[UserProgress] Create pet error for ${mascotIdOrName}:`, e);
        }
    }
}

module.exports = { getUserProgress, syncUserProgress };
