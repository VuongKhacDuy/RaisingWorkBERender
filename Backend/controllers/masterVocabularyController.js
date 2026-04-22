const MasterVocabulary = require('../models/Vocabulary/MasterVocabularyModel');

// @desc    Get all master vocabulary
// @route   GET /api/master-vocabulary
// @access  Public (or Protected if needed)
exports.getAllMasterVocabulary = async (req, res) => {
    try {
        const { level, topic, search } = req.query;
        let query = {};

        if (level) query.level = level;
        if (topic) query.topic = topic;
        if (search) {
            query.word = { $regex: search, $options: 'i' };
        }
        if (req.query.since) {
            query.updatedAt = { $gt: new Date(req.query.since) };
        }

        const vocabulary = await MasterVocabulary.find(query).sort({ word: 1 });
        res.status(200).json({ success: true, count: vocabulary.length, data: vocabulary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get single master vocabulary
// @route   GET /api/master-vocabulary/:id
// @access  Public
exports.getMasterVocabularyById = async (req, res) => {
    try {
        const vocabulary = await MasterVocabulary.findById(req.params.id);
        if (!vocabulary) {
            return res.status(404).json({ success: false, error: 'Vocabulary not found' });
        }
        res.status(200).json({ success: true, data: vocabulary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Create master vocabulary
// @route   POST /api/master-vocabulary
// @access  Private/Admin
exports.createMasterVocabulary = async (req, res) => {
    try {
        const vocabulary = await MasterVocabulary.create(req.body);
        res.status(201).json({ success: true, data: vocabulary });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update master vocabulary
// @route   PUT /api/master-vocabulary/:id
// @access  Private/Admin
exports.updateMasterVocabulary = async (req, res) => {
    try {
        const vocabulary = await MasterVocabulary.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!vocabulary) {
            return res.status(404).json({ success: false, error: 'Vocabulary not found' });
        }
        res.status(200).json({ success: true, data: vocabulary });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Delete master vocabulary
// @route   DELETE /api/master-vocabulary/:id
// @access  Private/Admin
exports.deleteMasterVocabulary = async (req, res) => {
    try {
        const vocabulary = await MasterVocabulary.findByIdAndDelete(req.params.id);
        if (!vocabulary) {
            return res.status(404).json({ success: false, error: 'Vocabulary not found' });
        }
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Bulk create vocabulary (for seeding)
// @route   POST /api/master-vocabulary/bulk
// @access  Private/Admin
exports.bulkCreateMasterVocabulary = async (req, res) => {
    try {
        const vocabulary = await MasterVocabulary.insertMany(req.body);
        res.status(201).json({ success: true, count: vocabulary.length, data: vocabulary });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Sync (Upsert) multiple vocabulary items
// @route   POST /api/master-vocabulary/sync
// @access  Private/Admin
exports.syncMasterVocabulary = async (req, res) => {
    try {
        const vocabularyList = req.body;
        if (!Array.isArray(vocabularyList)) {
            return res.status(400).json({ success: false, error: 'Data must be an array' });
        }

        const operations = vocabularyList.map(item => ({
            updateOne: {
                filter: { word: item.word },
                update: { $set: item },
                upsert: true
            }
        }));

        const result = await MasterVocabulary.bulkWrite(operations);
        res.status(200).json({
            success: true,
            message: 'Synchronization complete',
            upsertedCount: result.upsertedCount,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
