const mongoose = require('mongoose');

const ExamQuestionSchema = new mongoose.Schema({
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamCollection', required: true },
    title: { type: String, required: true, trim: true },
    taskType: { type: String, default: 'other' }, // task1-table, task1-chart, task1-map, task2-essay, reading, listening, speaking, other
    imageUrl: { type: String, default: '' },
    questionText: { type: String, default: '' },
    sampleAnswer: { type: String, default: '' },
    keyPoints: [{ type: String }],
    band: { type: String, default: '' }, // B1, B2, C1, C2 hoặc score như "6.5", "7.0"
    level: { type: String, default: '' }, // A1-C2 CEFR
    examDate: { type: String, default: '' }, // VD: "Tháng 3/2024", "IELTS 01/2025"
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ExamQuestion', ExamQuestionSchema);
