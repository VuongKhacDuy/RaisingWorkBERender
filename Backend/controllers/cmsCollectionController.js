const VocabularyCollection = require('../models/Vocabulary/VocabularyCollectionModel');
const CollectionGroup = require('../models/Vocabulary/CollectionGroupModel');

// ── CMS: Groups CRUD ───────────────────────────────────────────────────────
exports.listGroups = async (req, res) => {
    try {
        const groups = await CollectionGroup.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
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
        const { name, description, coverEmoji, coverImage, isActive, displayOrder } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
        const group = await CollectionGroup.create({
            name: name.trim(),
            description: description?.trim() || '',
            coverEmoji: coverEmoji || '📂',
            coverImage: coverImage?.trim() || '',
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
        const { name, description, coverEmoji, coverImage, isActive, displayOrder } = req.body;
        const group = await CollectionGroup.findById(id);
        if (!group) return res.status(404).json({ message: 'Group not found.' });
        if (name !== undefined) group.name = name.trim();
        if (description !== undefined) group.description = description.trim();
        if (coverEmoji !== undefined) group.coverEmoji = coverEmoji;
        if (coverImage !== undefined) group.coverImage = coverImage.trim();
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

// ── CMS: Collections ────────────────────────────────────────────────────────
exports.listCollections = async (req, res) => {
    try {
        const query = {};
        if (req.query.groupId) query.groupId = req.query.groupId;
        const collections = await VocabularyCollection.find(query)
            .populate('groupId', 'name coverEmoji')
            .sort({ displayOrder: 1, createdAt: -1 })
            .select('-words') // exclude embedded words for list view (save bandwidth)
            .lean();
        // Manually add wordCount since we excluded words
        // Use mongoose Types.ObjectId to ensure groupId is properly cast for aggregate
        const mongoose = require('mongoose');
        const aggMatch = query.groupId
            ? { groupId: new mongoose.Types.ObjectId(query.groupId) }
            : {};
        const withCount = await VocabularyCollection.aggregate([
            { $match: aggMatch },
            { $project: { wordCount: { $size: { $ifNull: ['$words', []] } } } }
        ]);
        const countMap = Object.fromEntries(withCount.map(c => [String(c._id), c.wordCount]));
        const result = collections.map(c => ({ ...c, wordCount: countMap[String(c._id)] || 0 }));
        res.json({ data: result });
    } catch (err) {
        console.error('[CMS Collection] list error:', err);
        res.status(500).json({ message: 'Failed to load collections.' });
    }
};

exports.createCollection = async (req, res) => {
    try {
        const { groupId, name, description, category, coverEmoji, coverImage, difficulty, isPremium, isActive, displayOrder } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
        const collection = await VocabularyCollection.create({
            groupId: groupId || null,
            name: name.trim(),
            description: description?.trim() || '',
            category: category || 'custom',
            coverEmoji: coverEmoji || '📚',
            coverImage: coverImage?.trim() || '',
            difficulty: difficulty || 'intermediate',
            isPremium: Boolean(isPremium),
            isActive: isActive !== false,
            displayOrder: Number(displayOrder) || 0,
            words: [],
        });
        res.status(201).json({ data: collection });
    } catch (err) {
        console.error('[CMS Collection] create error:', err);
        res.status(500).json({ message: 'Failed to create collection.' });
    }
};

exports.updateCollection = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, coverEmoji, coverImage, difficulty, isPremium, isActive, displayOrder } = req.body;
        const collection = await VocabularyCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });
        if (name !== undefined) collection.name = name.trim();
        if (description !== undefined) collection.description = description.trim();
        if (category !== undefined) collection.category = category;
        if (coverEmoji !== undefined) collection.coverEmoji = coverEmoji;
        if (coverImage !== undefined) collection.coverImage = coverImage.trim();
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

// ── CMS: get collection detail with embedded words ─────────────────────────
exports.getCollectionDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const collection = await VocabularyCollection.findById(id).lean();
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });
        res.json({ data: collection });
    } catch (err) {
        console.error('[CMS Collection] detail error:', err);
        res.status(500).json({ message: 'Failed to load collection.' });
    }
};

// ── CMS: set embedded words (replace entire list) ─────────────────────────
exports.setWords = async (req, res) => {
    try {
        const { id } = req.params;
        const { words } = req.body;
        if (!Array.isArray(words)) return res.status(400).json({ message: 'words must be an array.' });
        const collection = await VocabularyCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });
        collection.words = words;
        await collection.save();
        res.json({ data: { wordCount: collection.words.length } });
    } catch (err) {
        console.error('[CMS Collection] setWords error:', err);
        res.status(500).json({ message: 'Failed to update words.' });
    }
};

// ── CMS: add words to collection ──────────────────────────────────────────
exports.addWords = async (req, res) => {
    try {
        const { id } = req.params;
        const { words } = req.body;
        if (!Array.isArray(words) || words.length === 0) {
            return res.status(400).json({ message: 'words is required.' });
        }
        const collection = await VocabularyCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });
        const existingWords = new Set(collection.words.map(w => w.word.toLowerCase()));
        for (const w of words) {
            if (w.word && !existingWords.has(w.word.toLowerCase())) {
                collection.words.push(w);
                existingWords.add(w.word.toLowerCase());
            }
        }
        await collection.save();
        res.json({ data: { wordCount: collection.words.length } });
    } catch (err) {
        console.error('[CMS Collection] addWords error:', err);
        res.status(500).json({ message: 'Failed to add words.' });
    }
};

// ── CMS: update single embedded word ─────────────────────────────────────
exports.updateWord = async (req, res) => {
    try {
        const { id, wordId } = req.params;
        const collection = await VocabularyCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });
        const word = collection.words.id(wordId);
        if (!word) return res.status(404).json({ message: 'Word not found.' });
        const { word: w, ipa, partOfSpeech, meaningVi, meaningEn, examples, imageUrl, level, topic } = req.body;
        if (w !== undefined) word.word = w;
        if (ipa !== undefined) word.ipa = ipa;
        if (partOfSpeech !== undefined) word.partOfSpeech = partOfSpeech;
        if (meaningVi !== undefined) word.meaningVi = meaningVi;
        if (meaningEn !== undefined) word.meaningEn = meaningEn;
        if (examples !== undefined) word.examples = examples;
        if (imageUrl !== undefined) word.imageUrl = imageUrl;
        if (level !== undefined) word.level = level;
        if (topic !== undefined) word.topic = topic;
        await collection.save();
        res.json({ data: word });
    } catch (err) {
        console.error('[CMS Collection] updateWord error:', err);
        res.status(500).json({ message: 'Failed to update word.' });
    }
};

// ── CMS: remove word by subdocument _id ──────────────────────────────────
exports.removeWords = async (req, res) => {
    try {
        const { id } = req.params;
        const { wordIds } = req.body; // subdocument _ids
        if (!Array.isArray(wordIds)) return res.status(400).json({ message: 'wordIds is required.' });
        const collection = await VocabularyCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });
        const toRemove = new Set(wordIds.map(String));
        collection.words = collection.words.filter(w => !toRemove.has(String(w._id)));
        await collection.save();
        res.json({ data: { wordCount: collection.words.length } });
    } catch (err) {
        console.error('[CMS Collection] removeWords error:', err);
        res.status(500).json({ message: 'Failed to remove words.' });
    }
};

// ── CMS: bulk import words via JSON ───────────────────────────────────────
exports.importWordsJson = async (req, res) => {
    try {
        const { id } = req.params;
        const { words, mode } = req.body; // mode: 'replace' | 'append'
        if (!Array.isArray(words)) return res.status(400).json({ message: 'words must be an array.' });
        const collection = await VocabularyCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });
        let importedCount = 0;
        if (mode === 'replace') {
            importedCount = words.length;
            collection.words = words;
        } else {
            const existingWords = new Set(collection.words.map(w => w.word.toLowerCase()));
            for (const w of words) {
                if (w.word && !existingWords.has(w.word.toLowerCase())) {
                    collection.words.push(w);
                    existingWords.add(w.word.toLowerCase());
                    importedCount++;
                }
            }
        }
        await collection.save();
        res.json({ data: { wordCount: collection.words.length, imported: importedCount } });
    } catch (err) {
        console.error('[CMS Collection] importWords error:', err);
        res.status(500).json({ message: 'Failed to import words.' });
    }
};

// Import image URLs — extract word from filename, match case-insensitively
// Accepts: { urls: ["https://.../Apple.png?token=...", ...] }
exports.importWordImages = async (req, res) => {
    try {
        const { id } = req.params;
        const { urls } = req.body;
        if (!Array.isArray(urls)) return res.status(400).json({ message: 'urls must be an array of strings.' });
        const collection = await VocabularyCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });

        // Build map: word (lowercase) → imageUrl
        const imageMap = {};
        for (const url of urls) {
            if (!url || typeof url !== 'string') continue;
            // Extract path before ?token, get last segment, strip extension
            const pathPart = url.split('?')[0];
            const filename = pathPart.split('/').pop() || '';
            const wordKey = filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ').toLowerCase();
            if (wordKey) imageMap[wordKey] = url;
        }

        let updated = 0;
        for (const w of collection.words) {
            const url = imageMap[w.word.toLowerCase()];
            if (url) { w.imageUrl = url; updated++; }
        }
        await collection.save();
        res.json({ data: { updated, total: urls.length, matched: Object.keys(imageMap).length } });
    } catch (err) {
        console.error('[CMS Collection] importWordImages error:', err);
        res.status(500).json({ message: 'Failed to import images.' });
    }
};

// ── iOS: public list (active only, grouped, with embedded words) ───────────
exports.listForIOS = async (req, res) => {
    try {
        const groups = await CollectionGroup.find({ isActive: true })
            .sort({ displayOrder: 1, createdAt: -1 })
            .lean();

        const collections = await VocabularyCollection.find({ isActive: true })
            .sort({ displayOrder: 1, createdAt: -1 })
            .lean();

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

// iOS: chỉ lấy danh sách Group (cấp 1), không có collections/words
exports.listGroupsForIOS = async (req, res) => {
    try {
        const groups = await CollectionGroup.find({ isActive: true })
            .sort({ displayOrder: 1, createdAt: -1 })
            .lean();
        res.json({ data: groups });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load groups.' });
    }
};

// iOS: lấy collections của 1 group (cấp 2), không có words
exports.listCollectionsByGroupForIOS = async (req, res) => {
    try {
        const { groupId } = req.params;
        const collections = await VocabularyCollection.find({ groupId, isActive: true })
            .select('-words')
            .sort({ displayOrder: 1, createdAt: -1 })
            .lean();
        const withCount = await VocabularyCollection.aggregate([
            { $match: { groupId: require('mongoose').Types.ObjectId.createFromHexString(groupId), isActive: true } },
            { $project: { wordCount: { $size: { $ifNull: ['$words', []] } } } }
        ]);
        const countMap = Object.fromEntries(withCount.map(c => [String(c._id), c.wordCount]));
        const result = collections.map(c => ({ ...c, wordCount: countMap[String(c._id)] || 0 }));
        res.json({ data: result });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load collections.' });
    }
};

// iOS: lấy words của 1 collection (cấp 3)
exports.listWordsForIOS = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const collection = await VocabularyCollection.findById(collectionId).select('words').lean();
        if (!collection) return res.status(404).json({ message: 'Collection not found.' });
        res.json({ data: collection.words });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load words.' });
    }
};
