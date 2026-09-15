const GrammarCategory = require('../models/Grammar/GrammarCategoryModel');
const GrammarTopic = require('../models/Grammar/GrammarTopicModel');

// ── CMS: Categories ────────────────────────────────────────────────────────

exports.listCategories = async (req, res) => {
    try {
        const cats = await GrammarCategory.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
        const counts = await GrammarTopic.aggregate([
            { $group: { _id: '$categoryId', count: { $sum: 1 } } }
        ]);
        const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
        res.json({ data: cats.map(c => ({ ...c, topicCount: countMap[String(c._id)] || 0 })) });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load categories.' });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description, coverEmoji, coverImage, isActive, displayOrder } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
        const cat = await GrammarCategory.create({ name: name.trim(), description, coverEmoji, coverImage, isActive, displayOrder });
        res.json({ data: cat });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create category.' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const cat = await GrammarCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!cat) return res.status(404).json({ message: 'Not found.' });
        res.json({ data: cat });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update category.' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const topicCount = await GrammarTopic.countDocuments({ categoryId: req.params.id });
        if (topicCount > 0) return res.status(400).json({ message: `Còn ${topicCount} topic. Xóa topic trước.` });
        const deleted = await GrammarCategory.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found.' });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete category.' });
    }
};

// ── CMS: Topics ────────────────────────────────────────────────────────────

exports.listTopics = async (req, res) => {
    try {
        const query = {};
        if (req.query.categoryId) query.categoryId = req.query.categoryId;
        const topics = await GrammarTopic.find(query)
            .sort({ displayOrder: 1, createdAt: -1 })
            .select('-contentBlocks -exercises')
            .lean();
        res.json({ data: topics });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load topics.' });
    }
};

exports.getTopic = async (req, res) => {
    try {
        const topic = await GrammarTopic.findById(req.params.id).lean();
        if (!topic) return res.status(404).json({ message: 'Not found.' });
        res.json({ data: topic });
    } catch (err) {
        res.status(500).json({ message: 'Failed to get topic.' });
    }
};

exports.createTopic = async (req, res) => {
    try {
        const { categoryId, name, description, coverEmoji, isActive, displayOrder, contentBlocks, exercises } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
        if (!categoryId) return res.status(400).json({ message: 'categoryId is required.' });
        const topic = await GrammarTopic.create({
            categoryId, name: name.trim(), description, coverEmoji, isActive, displayOrder,
            contentBlocks, exercises,
        });
        res.json({ data: topic });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create topic.' });
    }
};

exports.updateTopic = async (req, res) => {
    try {
        const topic = await GrammarTopic.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!topic) return res.status(404).json({ message: 'Not found.' });
        res.json({ data: topic });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update topic.' });
    }
};

exports.deleteTopic = async (req, res) => {
    try {
        const deleted = await GrammarTopic.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found.' });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete topic.' });
    }
};

// ── iOS endpoints ─────────────────────────────────────────────────────────

exports.listCategoriesForIOS = async (req, res) => {
    try {
        const cats = await GrammarCategory.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
        const counts = await GrammarTopic.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$categoryId', count: { $sum: 1 } } }
        ]);
        const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
        res.json({ data: cats.map(c => ({ ...c, topicCount: countMap[String(c._id)] || 0 })) });
    } catch (err) {
        res.status(500).json({ message: 'Failed.' });
    }
};

exports.listTopicsForCategoryForIOS = async (req, res) => {
    try {
        const topics = await GrammarTopic.find({ categoryId: req.params.categoryId, isActive: true })
            .sort({ displayOrder: 1 })
            .select('-contentBlocks -exercises')
            .lean();
        res.json({ data: topics });
    } catch (err) {
        res.status(500).json({ message: 'Failed.' });
    }
};

exports.getTopicDetailForIOS = async (req, res) => {
    try {
        const topic = await GrammarTopic.findOne({ _id: req.params.id, isActive: true }).lean();
        if (!topic) return res.status(404).json({ message: 'Not found.' });
        res.json({ data: topic });
    } catch (err) {
        res.status(500).json({ message: 'Failed.' });
    }
};
