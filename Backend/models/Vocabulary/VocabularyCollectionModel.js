const mongoose = require('mongoose');

const VocabularyCollectionSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category: {
        type: String,
        enum: ['ielts', 'toeic', 'daily', 'grammar', 'topic', 'custom'],
        default: 'custom'
    },
    coverEmoji: { type: String, default: '📚' },
    wordIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MasterVocabulary' }],
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'intermediate'
    },
    isPremium: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
}, {
    timestamps: true
});

VocabularyCollectionSchema.virtual('wordCount').get(function () {
    return this.wordIds ? this.wordIds.length : 0;
});

VocabularyCollectionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('VocabularyCollection', VocabularyCollectionSchema);
