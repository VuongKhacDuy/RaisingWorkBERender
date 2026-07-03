const mongoose = require('mongoose');

const StructureStepSchema = new mongoose.Schema({
    part: { type: String, default: '' },        // VD: "Introduction", "Body Paragraph 1"
    guidance: { type: String, default: '' },    // Hướng dẫn viết phần đó
}, { _id: false });

const SampleAnswerSchema = new mongoose.Schema({
    band: { type: String, default: '' },        // VD: "6.5", "7.5", "8.0"
    label: { type: String, default: '' },       // VD: "Band 6.5 — Intermediate"
    content: { type: String, default: '' },     // Bài viết mẫu
    usefulPhrases: [{ type: String }],          // Cụm từ hay dùng
    usefulWords: [{ type: String }],            // Từ vựng nổi bật (VD: "ubiquitous: có mặt khắp nơi")
}, { _id: false });

const ExamQuestionSchema = new mongoose.Schema({
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamCollection', required: true },
    title: { type: String, required: true, trim: true },
    taskType: { type: String, default: 'other' },
    imageUrl: { type: String, default: '' },
    questionText: { type: String, default: '' },

    // Phân tích đề
    requirements: { type: String, default: '' },        // Đề yêu cầu gì (phân tích rõ)
    noticePoints: [{ type: String }],                   // Những điểm cần chú ý trong đề
    keyVocabInPrompt: [{ type: String }],               // Từ/cụm từ quan trọng trong đề
    structureSteps: [StructureStepSchema],              // Phát triển bài từng phần

    // Bài mẫu (tối đa 4, nhiều band khác nhau)
    sampleAnswers: [SampleAnswerSchema],

    // Legacy fields (giữ lại để không mất data cũ)
    sampleAnswer: { type: String, default: '' },
    keyPoints: [{ type: String }],

    band: { type: String, default: '' },
    level: { type: String, default: '' },
    examDate: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ExamQuestion', ExamQuestionSchema);
