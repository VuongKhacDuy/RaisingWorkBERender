const VocabularyCollection = require('../models/Vocabulary/VocabularyCollectionModel');
const CollectionGroup = require('../models/Vocabulary/CollectionGroupModel');
const MasterVocabulary = require('../models/Vocabulary/MasterVocabularyModel');

// ── CMS: Groups CRUD ───────────────────────────────────────────────────────
exports.listGroups = async (req, res) => {
    try {
        const groups = await CollectionGroup.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
        // Attach collection count to each group
        const counts = await VocabularyCollection.aggregate([
            { $group: { _id: '$groupId', count: { $sum: 1 } } }
        ]);
        const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
        const result = groups.map((g) => ({ ...g, collectionCount: countMap[String(g._id)] || 0 }));
        res.json({ data: result });
    } catch (err) {
        console.error('[CMS Group] list error:', err);
        res.status(500).json({ message: 'Failed to load groups.' });
    }
};

exports.createGroup = async (req, res) => {
    try {
        const { name, description, coverEmoji, isActive, displayOrder } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
        const group = await CollectionGroup.create({
            name: name.trim(),
            description: description?.trim() || '',
            coverEmoji: coverEmoji || '📂',
            isActive: isActive !== false,
            displayOrder: Number(displayOrder) || 0,
        });
        res.status(201).json({ data: group });
    } catch (err) {
        console.error('[CMS Group] create error:', err);
        res.status(500).json({ message: 'Failed to create group.' });
    }
};

exports.updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, coverEmoji, isActive, displayOrder } = req.body;
        const group = await CollectionGroup.findById(id);
        if (!group) return res.status(404).json({ message: 'Group not found.' });
        if (name !== undefined) group.name = name.trim();
        if (description !== undefined) group.description = description.trim();
        if (coverEmoji !== undefined) group.coverEmoji = coverEmoji;
        if (isActive !== undefined) group.isActive = Boolean(isActive);
        if (displayOrder !== undefined) group.displayOrder = Number(displayOrder);
        await group.save();
        res.json({ data: group });
    } catch (err) {
        console.error('[CMS Group] update error:', err);
        res.status(500).json({ message: 'Failed to update group.' });
    }
};

exports.deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const collectionCount = await VocabularyCollection.countDocuments({ groupId: id });
        if (collectionCount > 0) {
            return res.status(400).json({ message: `Nhóm này còn ${collectionCount} collection. Xóa collection trước.` });
        }
        const deleted = await CollectionGroup.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Group not found.' });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        console.error('[CMS Group] delete error:', err);
        res.status(500).json({ message: 'Failed to delete group.' });
    }
};

// ── CMS: list all collections (optionally filtered by groupId) ─────────────
exports.listCollections = async (req, res) => {
    try {
        const query = {};
        if (req.query.groupId) query.groupId = req.query.groupId;
        const collections = await VocabularyCollection.find(query)
            .populate('groupId', 'name coverEmoji')
            .sort({ displayOrder: 1, createdAt: -1 })
            .lean();
        res.json({ data: collections });
    } catch (err) {
        console.error('[CMS Collection] list error:', err);
        res.status(500).json({ message: 'Failed to load collections.' });
    }
};

// ── CMS: create collection ─────────────────────────────────────────────────
exports.createCollection = async (req, res) => {
    try {
        const { groupId, name, description, category, coverEmoji, difficulty, isPremium, isActive, displayOrder } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });

        const collection = await VocabularyCollection.create({
            groupId: groupId || null,
            name: name.trim(),
            description: description?.trim() || '',
            category: category || 'custom',
            coverEmoji: coverEmoji || '📚',
            difficulty: difficulty || 'intermediate',
            isPremium: Boolean(isPremium),
            isActive: isActive !== false,
            displayOrder: Number(displayOrder) || 0,
            wordIds: [],
        });

        res.status(201).json({ data: collection });
    } catch (err) {
        console.error('[CMS Collection] create error:', err);
        res.status(500).json({ message: 'Failed to create collection.' });
    }
};

// ── CMS: update collection metadata ───────────────────────────────────────
exports.updateCollection = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, coverEmoji, difficulty, isPremium, isActive, displayOrder } = req.body;

        const collection = await VocabularyCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });

        if (name !== undefined) collection.name = name.trim();
        if (description !== undefined) collection.description = description.trim();
        if (category !== undefined) collection.category = category;
        if (coverEmoji !== undefined) collection.coverEmoji = coverEmoji;
        if (difficulty !== undefined) collection.difficulty = difficulty;
        if (isPremium !== undefined) collection.isPremium = Boolean(isPremium);
        if (isActive !== undefined) collection.isActive = Boolean(isActive);
        if (displayOrder !== undefined) collection.displayOrder = Number(displayOrder);

        await collection.save();
        res.json({ data: collection });
    } catch (err) {
        console.error('[CMS Collection] update error:', err);
        res.status(500).json({ message: 'Failed to update collection.' });
    }
};

// ── CMS: delete collection ─────────────────────────────────────────────────
exports.deleteCollection = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await VocabularyCollection.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Collection not found.' });
        res.json({ message: 'Deleted.' });
    } catch (err) {
        console.error('[CMS Collection] delete error:', err);
        res.status(500).json({ message: 'Failed to delete collection.' });
    }
};

// ── CMS: get collection detail with words ─────────────────────────────────
exports.getCollectionDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const collection = await VocabularyCollection.findById(id)
            .populate('wordIds', 'word ipa level partOfSpeech meaningVi meaningEn topic difficulty frequency')
            .lean();
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });
        res.json({ data: collection });
    } catch (err) {
        console.error('[CMS Collection] detail error:', err);
        res.status(500).json({ message: 'Failed to load collection.' });
    }
};

// ── CMS: set words (replace entire word list) ─────────────────────────────
exports.setWords = async (req, res) => {
    try {
        const { id } = req.params;
        const { wordIds } = req.body;

        if (!Array.isArray(wordIds)) return res.status(400).json({ message: 'wordIds must be an array.' });

        const collection = await VocabularyCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });

        // Deduplicate
        const unique = [...new Set(wordIds.map(String))];
        collection.wordIds = unique;
        await collection.save();

        res.json({ data: { wordCount: unique.length } });
    } catch (err) {
        console.error('[CMS Collection] setWords error:', err);
        res.status(500).json({ message: 'Failed to update words.' });
    }
};

// ── CMS: add words to collection ──────────────────────────────────────────
exports.addWords = async (req, res) => {
    try {
        const { id } = req.params;
        const { wordIds } = req.body;

        if (!Array.isArray(wordIds) || wordIds.length === 0) {
            return res.status(400).json({ message: 'wordIds is required.' });
        }

        const collection = await VocabularyCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });

        const existing = new Set(collection.wordIds.map(String));
        for (const wid of wordIds) {
            if (!existing.has(String(wid))) {
                collection.wordIds.push(wid);
                existing.add(String(wid));
            }
        }
        await collection.save();

        res.json({ data: { wordCount: collection.wordIds.length } });
    } catch (err) {
        console.error('[CMS Collection] addWords error:', err);
        res.status(500).json({ message: 'Failed to add words.' });
    }
};

// ── CMS: remove words from collection ────────────────────────────────────
exports.removeWords = async (req, res) => {
    try {
        const { id } = req.params;
        const { wordIds } = req.body;

        if (!Array.isArray(wordIds)) return res.status(400).json({ message: 'wordIds is required.' });

        const collection = await VocabularyCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });

        const toRemove = new Set(wordIds.map(String));
        collection.wordIds = collection.wordIds.filter((wid) => !toRemove.has(String(wid)));
        await collection.save();

        res.json({ data: { wordCount: collection.wordIds.length } });
    } catch (err) {
        console.error('[CMS Collection] removeWords error:', err);
        res.status(500).json({ message: 'Failed to remove words.' });
    }
};

// ── iOS: public list (active only, grouped) ───────────────────────────────
exports.listForIOS = async (req, res) => {
    try {
        const groups = await CollectionGroup.find({ isActive: true })
            .sort({ displayOrder: 1, createdAt: -1 })
            .lean();

        const collections = await VocabularyCollection.find({ isActive: true })
            .populate('wordIds', 'word ipa level partOfSpeech meaningVi meaningEn example topic frequency ieltsBand')
            .sort({ displayOrder: 1, createdAt: -1 })
            .lean();

        // Group collections by groupId
        const collsByGroup = {};
        const ungrouped = [];
        for (const col of collections) {
            if (col.groupId) {
                const key = String(col.groupId);
                if (!collsByGroup[key]) collsByGroup[key] = [];
                collsByGroup[key].push(col);
            } else {
                ungrouped.push(col);
            }
        }

        const result = groups.map((g) => ({
            ...g,
            collections: collsByGroup[String(g._id)] || [],
        }));

        res.json({ data: { groups: result, ungrouped } });
    } catch (err) {
        console.error('[Collection iOS] list error:', err);
        res.status(500).json({ message: 'Failed to load collections.' });
    }
};
