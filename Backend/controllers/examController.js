const ExamCategory = require('../models/Exam/ExamCategoryModel');
const ExamSection  = require('../models/Exam/ExamSectionModel');
const ExamCollection = require('../models/Exam/ExamCollectionModel');
const ExamQuestion = require('../models/Exam/ExamQuestionModel');

// ── CMS: Categories ────────────────────────────────────────────────────────

exports.listCategories = async (req, res) => {
    try {
        const cats = await ExamCategory.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
        const counts = await ExamSection.aggregate([
            { $group: { _id: '$categoryId', count: { $sum: 1 } } }
        ]);
        const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
        res.json({ data: cats.map(c => ({ ...c, sectionCount: countMap[String(c._id)] || 0 })) });
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
        const secCount = await ExamSection.countDocuments({ categoryId: req.params.id });
        if (secCount > 0) return res.status(400).json({ message: `Còn ${secCount} section. Xóa section trước.` });
        const deleted = await ExamCategory.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found.' });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete category.' });
    }
};

// ── CMS: Sections ──────────────────────────────────────────────────────────

exports.listSections = async (req, res) => {
    try {
        const query = {};
        if (req.query.categoryId) query.categoryId = req.query.categoryId;
        const sections = await ExamSection.find(query).sort({ displayOrder: 1, createdAt: -1 }).lean();
        const counts = await ExamCollection.aggregate([
            { $group: { _id: '$sectionId', count: { $sum: 1 } } }
        ]);
        const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
        res.json({ data: sections.map(s => ({ ...s, collectionCount: countMap[String(s._id)] || 0 })) });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load sections.' });
    }
};

exports.createSection = async (req, res) => {
    try {
        const { categoryId, name, description, coverEmoji, isActive, displayOrder } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
        if (!categoryId) return res.status(400).json({ message: 'categoryId is required.' });
        const sec = await ExamSection.create({ categoryId, name: name.trim(), description, coverEmoji, isActive, displayOrder });
        res.json({ data: sec });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create section.' });
    }
};

exports.updateSection = async (req, res) => {
    try {
        const sec = await ExamSection.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!sec) return res.status(404).json({ message: 'Not found.' });
        res.json({ data: sec });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update section.' });
    }
};

exports.deleteSection = async (req, res) => {
    try {
        const colCount = await ExamCollection.countDocuments({ sectionId: req.params.id });
        if (colCount > 0) return res.status(400).json({ message: `Còn ${colCount} collection. Xóa collection trước.` });
        const deleted = await ExamSection.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found.' });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete section.' });
    }
};

// ── CMS: Collections ──────────────────────────────────────────────────────

exports.listCollections = async (req, res) => {
    try {
        const query = {};
        if (req.query.categoryId) query.categoryId = req.query.categoryId;
        if (req.query.sectionId) query.sectionId = req.query.sectionId;
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
        const { categoryId, sectionId, name, description, coverEmoji, coverImage, isActive, displayOrder } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
        if (!categoryId) return res.status(400).json({ message: 'categoryId is required.' });
        const col = await ExamCollection.create({ categoryId, sectionId: sectionId || null, name: name.trim(), description, coverEmoji, coverImage, isActive, displayOrder });
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
        const {
            collectionId, title, taskType, imageUrl, questionText,
            requirements, noticePoints, keyVocabInPrompt, structureSteps, sampleAnswers,
            sampleAnswer, keyPoints,
            band, level, examDate, displayOrder, isActive,
        } = req.body;
        if (!title?.trim()) return res.status(400).json({ message: 'Title is required.' });
        if (!collectionId) return res.status(400).json({ message: 'collectionId is required.' });
        const q = await ExamQuestion.create({
            collectionId, title: title.trim(), taskType, imageUrl, questionText,
            requirements, noticePoints, keyVocabInPrompt, structureSteps, sampleAnswers,
            sampleAnswer, keyPoints,
            band, level, examDate, displayOrder, isActive,
        });
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

// ── CMS: Migration ────────────────────────────────────────────────────────
// POST /api/exam/cms/migrate-sections
// Tự động tạo sections từ taskType của questions trong mỗi category

exports.migrateSections = async (req, res) => {
    try {
        const taskTypeToSection = {
            'task1-table':   { name: 'Writing Task 1', emoji: '📊' },
            'task1-chart':   { name: 'Writing Task 1', emoji: '📊' },
            'task1-map':     { name: 'Writing Task 1', emoji: '📊' },
            'task1-process': { name: 'Writing Task 1', emoji: '📊' },
            'task2-essay':   { name: 'Writing Task 2', emoji: '✍️' },
            'reading':       { name: 'Reading',        emoji: '📖' },
            'listening':     { name: 'Listening',      emoji: '🎧' },
            'speaking':      { name: 'Speaking',       emoji: '🗣️' },
            'grammar':       { name: 'Grammar',        emoji: '📐' },
            'vocabulary':    { name: 'Vocabulary',     emoji: '📚' },
            'other':         { name: 'Other',          emoji: '📝' },
        };

        const categories = await ExamCategory.find().lean();
        let created = 0, updated = 0;

        for (const cat of categories) {
            // Lấy tất cả collections của category này
            const collections = await ExamCollection.find({ categoryId: cat._id }).lean();

            // Lấy tất cả questions của các collections
            const colIds = collections.map(c => c._id);
            const questions = await ExamQuestion.find({ collectionId: { $in: colIds } }).select('collectionId taskType').lean();

            // Map collectionId -> taskType phổ biến nhất
            const colTaskMap = {};
            for (const q of questions) {
                const cid = String(q.collectionId);
                if (!colTaskMap[cid]) colTaskMap[cid] = {};
                colTaskMap[cid][q.taskType] = (colTaskMap[cid][q.taskType] || 0) + 1;
            }

            // Cache sections đã tạo cho category này
            const sectionCache = {}; // name -> section doc

            for (const col of collections) {
                if (col.sectionId) continue; // đã có section rồi, skip

                const taskCounts = colTaskMap[String(col._id)] || {};
                const dominantTask = Object.entries(taskCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';
                const sectionInfo = taskTypeToSection[dominantTask] || taskTypeToSection['other'];

                // Tạo hoặc tái dùng section
                if (!sectionCache[sectionInfo.name]) {
                    let existing = await ExamSection.findOne({ categoryId: cat._id, name: sectionInfo.name });
                    if (!existing) {
                        existing = await ExamSection.create({
                            categoryId: cat._id,
                            name: sectionInfo.name,
                            coverEmoji: sectionInfo.emoji,
                            displayOrder: Object.keys(sectionCache).length,
                        });
                        created++;
                    }
                    sectionCache[sectionInfo.name] = existing;
                }

                await ExamCollection.findByIdAndUpdate(col._id, { sectionId: sectionCache[sectionInfo.name]._id });
                updated++;
            }
        }

        res.json({ message: `Migration done. Sections created: ${created}, collections updated: ${updated}.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Migration failed.', error: err.message });
    }
};

// ── iOS endpoints ─────────────────────────────────────────────────────────

exports.listCategoriesForIOS = async (req, res) => {
    try {
        const cats = await ExamCategory.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
        res.json({ data: cats });
    } catch (err) {
        res.status(500).json({ message: 'Failed.' });
    }
};

exports.listSectionsByCategory = async (req, res) => {
    try {
        const sections = await ExamSection.find({ categoryId: req.params.categoryId, isActive: true })
            .sort({ displayOrder: 1 }).lean();
        const counts = await ExamCollection.aggregate([
            { $match: { sectionId: { $in: sections.map(s => s._id) }, isActive: true } },
            { $group: { _id: '$sectionId', count: { $sum: 1 } } }
        ]);
        const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
        res.json({ data: sections.map(s => ({ ...s, collectionCount: countMap[String(s._id)] || 0 })) });
    } catch (err) {
        res.status(500).json({ message: 'Failed.' });
    }
};

exports.listCollectionsBySection = async (req, res) => {
    try {
        const cols = await ExamCollection.find({ sectionId: req.params.sectionId, isActive: true })
            .sort({ displayOrder: 1 }).lean();
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
            .select('-sampleAnswer -keyPoints')
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
