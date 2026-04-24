const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const LeagueTier = require('../models/Ranking/LeagueTier');

async function seedTiers() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/uumi');
        console.log('Connected to MongoDB');

        const tiers = [
            { name: 'Iron', promotionThreshold: 10, demotionThreshold: 0, order: 1 },
            { name: 'Bronze', promotionThreshold: 10, demotionThreshold: 20, order: 2 },
            { name: 'Silver', promotionThreshold: 10, demotionThreshold: 20, order: 3 },
            { name: 'Gold', promotionThreshold: 10, demotionThreshold: 20, order: 4 },
            { name: 'Platinum', promotionThreshold: 10, demotionThreshold: 20, order: 5 },
            { name: 'Diamond', promotionThreshold: 5, demotionThreshold: 15, order: 6 },
            { name: 'Master', promotionThreshold: 0, demotionThreshold: 10, order: 7 }
        ];

        for (const tierData of tiers) {
            await LeagueTier.findOneAndUpdate(
                { name: tierData.name },
                tierData,
                { upsert: true, new: true }
            );
            console.log(`Seeded tier: ${tierData.name}`);
        }

        console.log('All tiers seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding tiers:', error);
        process.exit(1);
    }
}

seedTiers();
