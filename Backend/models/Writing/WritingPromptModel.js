const mongoose = require('mongoose');

const WritingPromptSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    instruction: { type: String, required: true },
    hint: { type: String, default: '' },
    level: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], default: 'A2' },
    minWords: { type: Number, default: 30, min: 0 },
    maxWords: { type: Number, default: 150, min: 1 },
    coverImage: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('WritingPrompt', WritingPromptSchema);
