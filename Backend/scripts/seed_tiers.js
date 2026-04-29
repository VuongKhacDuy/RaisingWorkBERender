const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const LeagueTier = require('../models/Ranking/LeagueTier');

async function seedTiers() {
    try {
        const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://khongduocdau456:khongduocdau456@wordsrise.kvelvt0.mongodb.net/WordsRise';
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB');

        const tiers = [
            { level: 1, name: 'Initiator', promotionThreshold: 10, demotionThreshold: 0 },
            { level: 2, name: 'Apprentice', promotionThreshold: 10, demotionThreshold: 20 },
            { level: 3, name: 'Explorer', promotionThreshold: 10, demotionThreshold: 20 },
            { level: 4, name: 'Adept', promotionThreshold: 10, demotionThreshold: 20 },
            { level: 5, name: 'Seeker', promotionThreshold: 10, demotionThreshold: 20 },
            { level: 6, name: 'Controller', promotionThreshold: 10, demotionThreshold: 20 },
            { level: 7, name: 'Breaker', promotionThreshold: 10, demotionThreshold: 20 },
            { level: 8, name: 'Conqueror', promotionThreshold: 10, demotionThreshold: 15 },
            { level: 9, name: 'Ascendant', promotionThreshold: 10, demotionThreshold: 15 },
            { level: 10, name: 'Transcendent', promotionThreshold: 5, demotionThreshold: 15 },
            { level: 11, name: 'Dominator', promotionThreshold: 5, demotionThreshold: 10 },
            { level: 12, name: 'Supreme', promotionThreshold: 0, demotionThreshold: 10 }
        ];

        for (const tierData of tiers) {
            await LeagueTier.findOneAndUpdate(
                { level: tierData.level },
                tierData,
                { upsert: true, new: true }
            );
            console.log(`Seeded tier [${tierData.level}]: ${tierData.name}`);
        }

        console.log('All tiers seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding tiers:', error);
        process.exit(1);
    }
}

seedTiers();
