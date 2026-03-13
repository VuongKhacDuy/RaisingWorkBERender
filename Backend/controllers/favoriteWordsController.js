const FavoriteWord = require("../models/FavoriteWords/FavoriteWords");

// POST /api/favorite-words — Add a word to favorites
const addFavoriteWord = async (req, res) => {
    try {
        const { word, meaning, sentence1, sentence2, proficiencyLevel, source, wordId } = req.body;

        if (!word) {
            return res.status(400).json({ message: "Word is required." });
        }

        const favorite = new FavoriteWord({
            userId: req.userId,
            word: word.trim(),
            meaning: meaning || null,
            sentence1: sentence1 || null,
            sentence2: sentence2 || null,
            proficiencyLevel: proficiencyLevel ?? 0,
            source: source || "manual",
            wordId: wordId || null,
        });

        await favorite.save();

        res.status(201).json({
            message: "Word added to favorites.",
            data: favorite,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Word already in favorites." });
        }
        console.error("Error adding favorite word:", error);
        res.status(500).json({ message: "Failed to add word to favorites." });
    }
};

// GET /api/favorite-words — Get all favorite words of the logged-in user
const getFavoriteWords = async (req, res) => {
    try {
        const words = await FavoriteWord.find({ userId: req.userId }).sort({
            dateCreated: -1,
        });

        res.status(200).json({
            total: words.length,
            data: words,
        });
    } catch (error) {
        console.error("Error fetching favorite words:", error);
        res.status(500).json({ message: "Failed to fetch favorite words." });
    }
};

// PUT /api/favorite-words/:wordId — Update a word
const updateFavoriteWord = async (req, res) => {
    try {
        const { word, meaning, sentence1, sentence2, proficiencyLevel, lastReviewDate } = req.body;

        const updatedWord = await FavoriteWord.findOneAndUpdate(
            { _id: req.params.wordId, userId: req.userId }, // Only owner can update
            {
                $set: {
                    ...(word !== undefined && { word: word.trim() }),
                    ...(meaning !== undefined && { meaning }),
                    ...(sentence1 !== undefined && { sentence1 }),
                    ...(sentence2 !== undefined && { sentence2 }),
                    ...(proficiencyLevel !== undefined && { proficiencyLevel }),
                    ...(lastReviewDate !== undefined && { lastReviewDate }),
                },
            },
            { new: true } // Return updated document
        );

        if (!updatedWord) {
            return res.status(404).json({ message: "Favorite word not found." });
        }

        res.status(200).json({
            message: "Word updated successfully.",
            data: updatedWord,
        });
    } catch (error) {
        console.error("Error updating favorite word:", error);
        res.status(500).json({ message: "Failed to update word." });
    }
};

// DELETE /api/favorite-words/:wordId — Remove a word from favorites
const removeFavoriteWord = async (req, res) => {
    try {
        const deleted = await FavoriteWord.findOneAndDelete({
            _id: req.params.wordId,
            userId: req.userId, // Ensure user can only delete their own words
        });

        if (!deleted) {
            return res.status(404).json({ message: "Favorite word not found." });
        }

        res.status(200).json({ message: "Word removed from favorites." });
    } catch (error) {
        console.error("Error removing favorite word:", error);
        res.status(500).json({ message: "Failed to remove word from favorites." });
    }
};

// POST /api/favorite-words/sync — Sync multiple favorite words from the app
const syncFavoriteWords = async (req, res) => {
    try {
        const { words } = req.body; // Array of favorite words

        if (!Array.isArray(words)) {
            return res.status(400).json({ message: "Invalid payload formatting. Expected an array of words." });
        }

        const userId = req.userId;
        const bulkOps = words.map((w) => ({
            updateOne: {
                filter: { userId, word: w.word.trim() },
                update: {
                    $set: {
                        meaning: w.meaning || null,
                        sentence1: w.sentence1 || null,
                        sentence2: w.sentence2 || null,
                        proficiencyLevel: w.proficiencyLevel ?? 0,
                        lastReviewDate: w.lastReviewDate || null,
                        source: w.source || "manual",
                        wordId: w.wordId || null,
                        dateCreated: w.dateCreated || new Date(),
                    }
                },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await FavoriteWord.bulkWrite(bulkOps);
        }

        // Delete any words in the DB that are not present in the payload
        const wordsInPayload = words.map(w => w.word.trim());
        const deleteResult = await FavoriteWord.deleteMany({
            userId,
            word: { $nin: wordsInPayload }
        });

        res.status(200).json({
            message: "Favorite words synced successfully.",
            syncedCount: bulkOps.length,
            deletedCount: deleteResult.deletedCount,
        });
    } catch (error) {
        console.error("Error syncing favorite words:", error);
        res.status(500).json({ message: "Failed to sync favorite words." });
    }
};

module.exports = { addFavoriteWord, getFavoriteWords, updateFavoriteWord, removeFavoriteWord, syncFavoriteWords };
