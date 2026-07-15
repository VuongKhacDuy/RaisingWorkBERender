const mongoose = require('mongoose');

const ExamCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    coverEmoji: { type: String, default: '📝' },
    coverImage: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ExamCategory', ExamCategorySchema);
