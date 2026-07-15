const mongoose = require('mongoose');

const ExamSectionSchema = new mongoose.Schema({
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamCategory', required: true },
    name: { type: String, required: true, trim: true }, // VD: Writing Task 1, Writing Task 2, Reading...
    description: { type: String, default: '' },
    coverEmoji: { type: String, default: '📝' },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ExamSection', ExamSectionSchema);
