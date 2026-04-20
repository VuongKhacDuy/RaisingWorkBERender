const mongoose = require('mongoose');

const MasterVocabularySchema = new mongoose.Schema({
    word: { type: String, required: true, trim: true },
    ipa: { type: String, trim: true },
    level: {
        type: String,
        enum: ['kids', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        default: 'A1'
    },
    partOfSpeech: { type: String, trim: true },
    meaningEn: { type: String, required: true },
    meaningVi: { type: String, required: true },
    example: { type: String },
    topic: { type: String, trim: true },
    frequency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    register: { type: String, trim: true }, // formal, neutral, informal
    collocations: { type: [String], default: [] },
    synonyms: { type: [String], default: [] },
    antonyms: { type: [String], default: [] },
    wordFamily: { type: [String], default: [] },
    phrasalVerbs: { type: [String], default: [] },
    difficultyScore: { type: Number, default: 0 }, // 1-100
    ieltsBand: { type: Number, default: 0 }, // 0-9.0
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model('MasterVocabulary', MasterVocabularySchema);
