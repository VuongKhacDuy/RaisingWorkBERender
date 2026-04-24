const mongoose = require('mongoose');
const UserProgress = require('../models/User/UserProgressModel');
const CoinTransaction = require('../models/User/CoinTransactionModel');
const UserPet = require('../models/Pet/UserPetModel');
const PetTemplate = require('../models/Pet/PetTemplateModel');

/**
 * Atomic helper to update user coins and record a transaction ledger entry.
 */
const addCoinsWithTransaction = async (userId, amount, type, source, description) => {
    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
    } catch (e) {
        console.warn('📡 [CoinLedger] Transactions not supported by this MongoDB environment. Falling back to non-atomic update.');
        session = null;
    }

    try {
        let progress = await UserProgress.findOne({ userId }).session(session);
        if (!progress) {
            progress = new UserProgress({ userId });
        }

        const oldBalance = progress.totalCoins || 0;
        progress.totalCoins = oldBalance + amount;
        await progress.save({ session });

        const transaction = new CoinTransaction({
            userId,
            amount,
            type,
            source,
            description,
            balanceAfter: progress.totalCoins
        });
        await transaction.save({ session });

        if (session) {
            await session.commitTransaction();
            session.endSession();
        }
        return { success: true, balance: progress.totalCoins };
    } catch (error) {
        if (session) {
            try {
                await session.abortTransaction();
            } catch (abortErr) {
                // Ignore abort errors if transaction already ended
            }
            session.endSession();
        }
        throw error;
    }
};

// GET /api/user-progress/coins/history
const getCoinHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const transactions = await CoinTransaction.find({ userId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await CoinTransaction.countDocuments({ userId });

        res.status(200).json({
            data: transactions,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[CoinHistory] fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch coin history.' });
    }
};

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
            currentStreak, loginStreak, learnStreak,
            lastActivityDate, lastLoginDate, lastLearnDate,
            totalXP, totalCoins,
            level, selectedMascot, selectedMascotInstanceId, selectedOutfit,
            unlockedOutfits, userCharacter
        } = req.body;

        console.log(`[UserProgress] Syncing for User: ${userId}`);

        const oldProgress = await UserProgress.findOne({ userId });
        const oldUnlocked = oldProgress ? (oldProgress.unlockedMascots || []) : [];

        const updated = await UserProgress.findOneAndUpdate(
            { userId },
            {
                $max: {
                    ...(currentStreak !== undefined && { currentStreak }),
                    ...(loginStreak !== undefined && { loginStreak }),
                    ...(learnStreak !== undefined && { learnStreak }),
                    ...(totalXP !== undefined && { totalXP }),
                    ...(totalCoins !== undefined && { totalCoins }),
                    ...(level !== undefined && { level }),
                },
                $set: {
                    ...(lastActivityDate !== undefined && { lastActivityDate }),
                    ...(lastLoginDate !== undefined && { lastLoginDate }),
                    ...(lastLearnDate !== undefined && { lastLearnDate }),
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

module.exports = { getUserProgress, syncUserProgress, getCoinHistory, addCoinsWithTransaction };
