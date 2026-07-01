const mongoose = require('mongoose');

const CollectionWordSchema = new mongoose.Schema({
    word:         { type: String, required: true, trim: true },
    ipa:          { type: String, default: '' },
    partOfSpeech: { type: String, default: 'n' },
    meaningVi:    { type: String, required: true, trim: true },
    meaningEn:    { type: String, default: '', trim: true },
    examples:     [{ type: String, trim: true }],
    imageUrl:     { type: String, default: '' },
    level:        { type: String, default: '' },
    topic:        { type: String, default: '' },
}, { _id: true });

const VocabularyCollectionSchema = new mongoose.Schema({
    groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionGroup', default: null },
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category:    { type: String, enum: ['ielts','toeic','daily','grammar','topic','custom'], default: 'custom' },
    coverEmoji:  { type: String, default: '📚' },
    coverImage:  { type: String, default: '' },
    words:       [CollectionWordSchema],
    difficulty:  { type: String, enum: ['beginner','intermediate','advanced'], default: 'intermediate' },
    isPremium:   { type: Boolean, default: false },
    isActive:    { type: Boolean, default: true },
    displayOrder:{ type: Number, default: 0 },
}, { timestamps: true });

VocabularyCollectionSchema.virtual('wordCount').get(function () {
    return this.words ? this.words.length : 0;
});
VocabularyCollectionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('VocabularyCollection', VocabularyCollectionSchema);
