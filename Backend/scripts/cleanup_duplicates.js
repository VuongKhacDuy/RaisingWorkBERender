const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const RankMetric = require('../models/Ranking/RankMetric');

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/uumi');
        console.log('Connected to MongoDB');

        // Find duplicates based on userId and category
        const duplicates = await RankMetric.aggregate([
            {
                $group: {
                    _id: { userId: "$userId", category: "$category" },
                    count: { $sum: 1 },
                    ids: { $push: "$_id" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        console.log(`Found ${duplicates.length} sets of duplicates.`);

        for (const dup of duplicates) {
            const idsToDelete = dup.ids.slice(1); // Keep the first one
            await RankMetric.deleteMany({ _id: { $in: idsToDelete } });
            console.log(`Deleted ${idsToDelete.length} duplicates for User: ${dup._id.userId}, Category: ${dup._id.category}`);
        }

        console.log('Cleanup complete');
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanup();
