const mongoose = require('mongoose');

const StructureStepSchema = new mongoose.Schema({
    part: { type: String, default: '' },
    guidance: { type: String, default: '' },
    partTranslation: { type: String, default: '' },
    guidanceTranslation: { type: String, default: '' },
}, { _id: false });

const SampleAnswerSchema = new mongoose.Schema({
    band: { type: String, default: '' },
    label: { type: String, default: '' },
    content: { type: String, default: '' },
    translation: { type: String, default: '' }, // Bản dịch tiếng Việt của bài mẫu
    usefulPhrases: [{ type: String }],          // format: "cụm từ: nghĩa tiếng Việt"
    usefulWords: [{ type: String }],            // format: "từ: nghĩa tiếng Việt"
}, { _id: false });

const ExamQuestionSchema = new mongoose.Schema({
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamCollection', required: true },
    title: { type: String, required: true, trim: true },
    taskType: { type: String, default: 'other' },
    imageUrl: { type: String, default: '' },
    questionText: { type: String, default: '' },
    questionTranslation: { type: String, default: '' },

    // Phân tích đề
    requirements: { type: String, default: '' },
    requirementsTranslation: { type: String, default: '' },
    noticePoints: [{ type: String }],
    noticePointsTranslation: [{ type: String }],
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
