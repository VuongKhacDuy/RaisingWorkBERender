const mongoose = require("mongoose");

const favoriteWordSchema = new mongoose.Schema({
    // Reference to the user who added this word
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    // The word itself (always required)
    word: {
        type: String,
        required: true,
        trim: true,
    },

    // Meaning / definition
    meaning: {
        type: String,
        default: null,
    },

    // Example sentences
    sentence1: {
        type: String,
        default: null,
    },

    sentence2: {
        type: String,
        default: null,
    },

    // Spaced repetition / quiz tracking
    proficiencyLevel: {
        type: Number,
        default: 0,
    },

    lastReviewDate: {
        type: Date,
        default: null,
    },

    // Where the word came from
    source: {
        type: String,
        enum: ["manual", "system", "news", "story"],
        default: "manual",
    },

    sourceLessonId: {
        type: String,
        default: null,
    },

    sourceLessonTitle: {
        type: String,
        default: null,
    },

    // If from system, store the reference ID (null if manually typed)
    wordId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },

    dateCreated: {
        type: Date,
        default: Date.now,
    },
});

// Prevent duplicate: same user cannot add the same word twice
favoriteWordSchema.index({ userId: 1, word: 1 }, { unique: true });

module.exports = mongoose.model("FavoriteWord", favoriteWordSchema);
