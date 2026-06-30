const VocabularyCollection = require('../models/Vocabulary/VocabularyCollectionModel');
const MasterVocabulary = require('../models/Vocabulary/MasterVocabularyModel');

// ── CMS: list all collections ──────────────────────────────────────────────
exports.listCollections = async (req, res) => {
    try {
        const collections = await VocabularyCollection.find()
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
        const { name, description, category, coverEmoji, difficulty, isPremium, isActive, displayOrder } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });

        const collection = await VocabularyCollection.create({
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

// ── iOS: public list (active only, includes word data) ────────────────────
exports.listForIOS = async (req, res) => {
    try {
        const collections = await VocabularyCollection.find({ isActive: true })
            .populate('wordIds', 'word ipa level partOfSpeech meaningVi meaningEn example topic frequency ieltsBand')
            .sort({ displayOrder: 1, createdAt: -1 })
            .lean();
        res.json({ data: collections });
    } catch (err) {
        console.error('[Collection iOS] list error:', err);
        res.status(500).json({ message: 'Failed to load collections.' });
    }
};
