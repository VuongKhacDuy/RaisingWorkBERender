const ExamCategory = require('../models/Exam/ExamCategoryModel');
const ExamCollection = require('../models/Exam/ExamCollectionModel');
const ExamQuestion = require('../models/Exam/ExamQuestionModel');

// ── CMS: Categories ────────────────────────────────────────────────────────

exports.listCategories = async (req, res) => {
    try {
        const cats = await ExamCategory.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
        const counts = await ExamCollection.aggregate([
            { $group: { _id: '$categoryId', count: { $sum: 1 } } }
        ]);
        const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
        res.json({ data: cats.map(c => ({ ...c, collectionCount: countMap[String(c._id)] || 0 })) });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load categories.' });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description, coverEmoji, coverImage, isActive, displayOrder } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
        const cat = await ExamCategory.create({ name: name.trim(), description, coverEmoji, coverImage, isActive, displayOrder });
        res.json({ data: cat });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create category.' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const cat = await ExamCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!cat) return res.status(404).json({ message: 'Not found.' });
        res.json({ data: cat });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update category.' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const colCount = await ExamCollection.countDocuments({ categoryId: req.params.id });
        if (colCount > 0) return res.status(400).json({ message: `Còn ${colCount} collection. Xóa collection trước.` });
        const deleted = await ExamCategory.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found.' });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete category.' });
    }
};

// ── CMS: Collections ──────────────────────────────────────────────────────

exports.listCollections = async (req, res) => {
    try {
        const query = {};
        if (req.query.categoryId) query.categoryId = req.query.categoryId;
        const cols = await ExamCollection.find(query).sort({ displayOrder: 1, createdAt: -1 }).lean();
        const counts = await ExamQuestion.aggregate([
            { $group: { _id: '$collectionId', count: { $sum: 1 } } }
        ]);
        const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
        res.json({ data: cols.map(c => ({ ...c, questionCount: countMap[String(c._id)] || 0 })) });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load collections.' });
    }
};

exports.createCollection = async (req, res) => {
    try {
        const { categoryId, name, description, coverEmoji, coverImage, isActive, displayOrder } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
        if (!categoryId) return res.status(400).json({ message: 'categoryId is required.' });
        const col = await ExamCollection.create({ categoryId, name: name.trim(), description, coverEmoji, coverImage, isActive, displayOrder });
        res.json({ data: col });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create collection.' });
    }
};

exports.updateCollection = async (req, res) => {
    try {
        const col = await ExamCollection.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!col) return res.status(404).json({ message: 'Not found.' });
        res.json({ data: col });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update collection.' });
    }
};

exports.deleteCollection = async (req, res) => {
    try {
        const qCount = await ExamQuestion.countDocuments({ collectionId: req.params.id });
        if (qCount > 0) return res.status(400).json({ message: `Còn ${qCount} câu hỏi. Xóa câu hỏi trước.` });
        const deleted = await ExamCollection.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found.' });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete collection.' });
    }
};

// ── CMS: Questions ────────────────────────────────────────────────────────

exports.listQuestions = async (req, res) => {
    try {
        const query = {};
        if (req.query.collectionId) query.collectionId = req.query.collectionId;
        const questions = await ExamQuestion.find(query).sort({ displayOrder: 1, createdAt: -1 }).lean();
        res.json({ data: questions });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load questions.' });
    }
};

exports.getQuestion = async (req, res) => {
    try {
        const q = await ExamQuestion.findById(req.params.id).lean();
        if (!q) return res.status(404).json({ message: 'Not found.' });
        res.json({ data: q });
    } catch (err) {
        res.status(500).json({ message: 'Failed to get question.' });
    }
};

exports.createQuestion = async (req, res) => {
    try {
        const { collectionId, title, taskType, imageUrl, questionText, sampleAnswer, keyPoints, band, level, displayOrder, isActive } = req.body;
        if (!title?.trim()) return res.status(400).json({ message: 'Title is required.' });
        if (!collectionId) return res.status(400).json({ message: 'collectionId is required.' });
        const q = await ExamQuestion.create({ collectionId, title: title.trim(), taskType, imageUrl, questionText, sampleAnswer, keyPoints, band, level, displayOrder, isActive });
        res.json({ data: q });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create question.' });
    }
};

exports.updateQuestion = async (req, res) => {
    try {
        const q = await ExamQuestion.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!q) return res.status(404).json({ message: 'Not found.' });
        res.json({ data: q });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update question.' });
    }
};

exports.deleteQuestion = async (req, res) => {
    try {
        const deleted = await ExamQuestion.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found.' });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete question.' });
    }
};

// ── iOS: public endpoints (auth required) ─────────────────────────────────

exports.listCategoriesForIOS = async (req, res) => {
    try {
        const cats = await ExamCategory.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
        res.json({ data: cats });
    } catch (err) {
        res.status(500).json({ message: 'Failed.' });
    }
};

exports.listCollectionsByCategory = async (req, res) => {
    try {
        const cols = await ExamCollection.find({ categoryId: req.params.categoryId, isActive: true }).sort({ displayOrder: 1 }).lean();
        const counts = await ExamQuestion.aggregate([
            { $match: { collectionId: { $in: cols.map(c => c._id) }, isActive: true } },
            { $group: { _id: '$collectionId', count: { $sum: 1 } } }
        ]);
        const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
        res.json({ data: cols.map(c => ({ ...c, questionCount: countMap[String(c._id)] || 0 })) });
    } catch (err) {
        res.status(500).json({ message: 'Failed.' });
    }
};

exports.listQuestionsByCollection = async (req, res) => {
    try {
        const questions = await ExamQuestion.find({ collectionId: req.params.collectionId, isActive: true })
            .sort({ displayOrder: 1 })
            .select('-sampleAnswer -keyPoints') // list view không cần full content
            .lean();
        res.json({ data: questions });
    } catch (err) {
        res.status(500).json({ message: 'Failed.' });
    }
};

exports.getQuestionDetailForIOS = async (req, res) => {
    try {
        const q = await ExamQuestion.findOne({ _id: req.params.id, isActive: true }).lean();
        if (!q) return res.status(404).json({ message: 'Not found.' });
        res.json({ data: q });
    } catch (err) {
        res.status(500).json({ message: 'Failed.' });
    }
};
