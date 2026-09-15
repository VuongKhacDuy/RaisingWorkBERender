const mongoose = require('mongoose');

// A run of text with formatting flags — one span per distinct formatting combination
const InlineSpanSchema = new mongoose.Schema({
    text: { type: String, default: '' },
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
    highlight: { type: Boolean, default: false },
}, { _id: false });

const ContentBlockSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, enum: ['heading', 'paragraph', 'bulletList'], required: true },
    order: { type: Number, required: true },
    data: {
        level: { type: Number, enum: [1, 2, 3] },          // heading only
        spans: [InlineSpanSchema],                          // paragraph / heading
        items: [[InlineSpanSchema]],                        // bulletList: one span-run per item
    },
}, { _id: false });

// Polymorphic exercise: flat `type` string + fields for every supported type living
// side by side (same convention ExamQuestionModel uses for structureSteps/sampleAnswers).
// Adding a new exercise type later only means adding more optional fields here.
const ExerciseSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },   // 'multiple-choice' | 'fill-blank' | ...
    order: { type: Number, default: 0 },
    prompt: { type: String, default: '' },
    explanation: { type: String, default: '' },

    // multiple-choice fields
    options: [{ type: String }],
    correctOptionIndex: { type: Number, default: 0 },

    // fill-blank fields
    textWithBlanks: { type: String, default: '' },
    blankAnswers: [{ type: String }],
}, { _id: false });

const GrammarTopicSchema = new mongoose.Schema({
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'GrammarCategory', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    coverEmoji: { type: String, default: '📖' },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },

    contentBlocks: [ContentBlockSchema],
    exercises: [ExerciseSchema],
}, { timestamps: true });

GrammarTopicSchema.index({ categoryId: 1, displayOrder: 1 });

module.exports = mongoose.model('GrammarTopic', GrammarTopicSchema);
