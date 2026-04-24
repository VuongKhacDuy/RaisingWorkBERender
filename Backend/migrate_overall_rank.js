const mongoose = require('mongoose');
const RankMetric = require('./models/Ranking/RankMetric');
require('dotenv').config();

async function migrate() {
    try {
        const mongoURI = process.env.MONGO_URL || 'mongodb+srv://khongduocdau456:khongduocdau456@wordsrise.kvelvt0.mongodb.net/WordsRise';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        // 1. Get all unique userIds
        const userIds = await RankMetric.distinct('userId');
        console.log(`Found ${userIds.length} users with ranking metrics.`);

        for (const userId of userIds) {
            // 2. Aggregate XP for this user across all categories EXCEPT 'overall'
            const metrics = await RankMetric.find({ userId, category: { $ne: 'overall' } });

            let aggregated = {
                dailyXP: 0,
                weeklyXP: 0,
                sundayXP: 0,
                quarterlyXP: 0,
                yearlyXP: 0,
                totalXP: 0
            };

            for (const m of metrics) {
                aggregated.dailyXP += m.dailyXP || 0;
                aggregated.weeklyXP += m.weeklyXP || 0;
                aggregated.sundayXP += m.sundayXP || 0;
                aggregated.quarterlyXP += m.quarterlyXP || 0;
                aggregated.yearlyXP += m.yearlyXP || 0;
                aggregated.totalXP += m.totalXP || 0;
            }

            // 3. Upsert the 'overall' metric
            await RankMetric.findOneAndUpdate(
                { userId, category: 'overall' },
                {
                    $set: {
                        ...aggregated,
                        lastUpdated: new Date()
                    }
                },
                { upsert: true, new: true }
            );

            console.log(`✅ Migrated Overall Rank for User ID: ${userId}`);
        }

        console.log('🚀 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
