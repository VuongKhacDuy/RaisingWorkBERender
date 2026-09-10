const mongoose = require('mongoose');

// Collections that are allowed to be managed (blacklist sensitive ones if needed)
const ALLOWED_COLLECTIONS = [
    'favoritewords', 'users', 'userprogresses', 'userpets', 'userachievements',
    'gamestatistics', 'dailymissions', 'cointransactions', 'rankinghistories',
    'shopproducts', 'pettemplates', 'mastervocabularies', 'missionpools',
    'leagueparticipants', 'leaguegroups', 'rankmetrics', 'news',
    'vocabularycollections', 'examquestions', 'examcollections', 'examsections',
    'examcategories', 'series', 'episodes', 'topics', 'achievements',
    'collectiongroups', 'contentpackages', 'posts'
];

const listCollections = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        const counts = await Promise.all(
            collections
                .filter(c => ALLOWED_COLLECTIONS.includes(c.name))
                .map(async (c) => {
                    const count = await db.collection(c.name).countDocuments();
                    return { name: c.name, count };
                })
        );

        counts.sort((a, b) => b.count - a.count);
        res.json({ collections: counts });
    } catch (error) {
        console.error('dbManager listCollections error:', error);
        res.status(500).json({ message: 'Failed to list collections' });
    }
};

const queryDocuments = async (req, res) => {
    try {
        const { collection } = req.params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return res.status(403).json({ message: 'Collection not allowed' });
        }

        const { filter = '{}', limit = 20, skip = 0 } = req.query;

        let parsedFilter;
        try {
            parsedFilter = JSON.parse(filter);
        } catch {
            return res.status(400).json({ message: 'Invalid filter JSON' });
        }

        const db = mongoose.connection.db;
        const total = await db.collection(collection).countDocuments(parsedFilter);
        const docs = await db.collection(collection)
            .find(parsedFilter)
            .skip(Number(skip))
            .limit(Math.min(Number(limit), 100))
            .toArray();

        res.json({ total, docs, skip: Number(skip), limit: Number(limit) });
    } catch (error) {
        console.error('dbManager queryDocuments error:', error);
        res.status(500).json({ message: 'Failed to query documents' });
    }
};

const deleteDocuments = async (req, res) => {
    try {
        const { collection } = req.params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return res.status(403).json({ message: 'Collection not allowed' });
        }

        const { filter } = req.body;
        if (!filter) {
            return res.status(400).json({ message: 'filter is required' });
        }

        // Safety: never allow empty filter {} (would delete everything) unless deleteAll=true
        const { deleteAll } = req.body;
        const isEmptyFilter = Object.keys(filter).length === 0;
        if (isEmptyFilter && !deleteAll) {
            return res.status(400).json({ message: 'Empty filter requires deleteAll=true to confirm' });
        }

        const db = mongoose.connection.db;
        const result = await db.collection(collection).deleteMany(filter);
        res.json({ deletedCount: result.deletedCount });
    } catch (error) {
        console.error('dbManager deleteDocuments error:', error);
        res.status(500).json({ message: 'Failed to delete documents' });
    }
};

module.exports = { listCollections, queryDocuments, deleteDocuments };
