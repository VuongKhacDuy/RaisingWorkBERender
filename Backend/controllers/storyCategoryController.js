const mongoose = require('mongoose');
const StoryCategory = require('../models/StoryCategoryModel');
const Topic = require('../models/TopicModel');

const withStoryCounts = async (cats) => {
    const counts = await Topic.aggregate([
        { $unwind: '$categoryIds' },
        { $group: { _id: '$categoryIds', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
    return cats.map(c => ({ ...c, storyCount: countMap[String(c._id)] || 0 }));
};

// GET /api/story-categories            → active only (iOS filter chips)
// GET /api/story-categories?all=true   → include inactive (CMS)
exports.listCategories = async (req, res) => {
    try {
        const filter = req.query.all === 'true' ? {} : { isActive: true };
        const cats = await StoryCategory.find(filter).sort({ displayOrder: 1, name: 1 }).lean();
        res.json({ data: await withStoryCounts(cats) });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load story categories.' });
    }
};

const pickFields = (body) => {
    const out = {};
    if (typeof body.name === 'string') out.name = body.name.trim();
    if (typeof body.isActive === 'boolean') out.isActive = body.isActive;
    if (body.displayOrder !== undefined && !isNaN(Number(body.displayOrder))) out.displayOrder = Number(body.displayOrder);
    return out;
};

exports.createCategory = async (req, res) => {
    try {
        const fields = pickFields(req.body);
        if (!fields.name) return res.status(400).json({ message: 'Tên danh mục là bắt buộc.' });
        const cat = await StoryCategory.create(fields);
        res.status(201).json({ data: cat });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create story category.' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const fields = pickFields(req.body);
        if (fields.name === '') return res.status(400).json({ message: 'Tên danh mục là bắt buộc.' });
        const cat = await StoryCategory.findByIdAndUpdate(req.params.id, fields, { new: true });
        if (!cat) return res.status(404).json({ message: 'Not found.' });
        res.json({ data: cat });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update story category.' });
    }
};

// Categories are tags on topics — deleting one just removes it from every topic.
exports.deleteCategory = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
        const deleted = await StoryCategory.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found.' });
        await Topic.updateMany({ categoryIds: deleted._id }, { $pull: { categoryIds: deleted._id } });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete story category.' });
    }
};
