const mongoose = require('mongoose');

// A run of text with formatting flags — one span per distinct formatting combination
const InlineSpanSchema = new mongoose.Schema({
    text: { type: String, default: '' },
    bold: { type: Boolean, default: false },
    italic: { type: Boolean, default: false },
    underline: { type: Boolean, default: false },
    highlight: { type: Boolean, default: false },
}, { _id: false });

// One visual line inside a `paragraph` block's `lines[]`. `style` unset = plain text
// line; set = a list-item line rendered with that marker.
const RichLineSchema = new mongoose.Schema({
    style: { type: String, enum: ['bullet', 'dash', 'number'] },
    spans: [InlineSpanSchema],
}, { _id: false });

const ContentBlockSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, enum: ['heading', 'paragraph', 'bulletList'], required: true },
    order: { type: Number, required: true },
    data: {
        level: { type: Number, enum: [1, 2, 3] },          // heading only
        spans: [InlineSpanSchema],                          // heading; paragraph legacy (pre-`lines`) fallback
        lines: [RichLineSchema],                            // paragraph: multi-line content, some lines can be list items
        items: [[InlineSpanSchema]],                        // bulletList: one span-run per item
        style: { type: String, enum: ['bullet', 'dash', 'number'], default: 'bullet' },  // bulletList only — marker shown before each item
    },
}, { _id: false });

// One question inside an exercise group — flat `type`-driven fields living side by
// side (same convention ExamQuestionModel uses for structureSteps/sampleAnswers).
// Adding a new exercise type later only means adding more optional fields here.
const ExerciseQuestionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    order: { type: Number, default: 0 },
    explanation: { type: String, default: '' },

    // multiple-choice fields
    prompt: { type: String, default: '' },
    options: [{ type: String }],
    correctOptionIndex: { type: Number, default: 0 },

    // fill-blank fields
    textWithBlanks: { type: String, default: '' },
    blankAnswers: [{ type: String }],
}, { _id: false });

// A group of questions sharing one instruction/prompt (e.g. "Put the verb into the
// correct form" followed by 10 fill-blank sentences) — admin writes the instructions
// once per group instead of repeating it on every question.
const ExerciseGroupSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },   // 'multiple-choice' | 'fill-blank' | ...
    order: { type: Number, default: 0 },
    instructions: { type: String, default: '' },
    questions: [ExerciseQuestionSchema],
}, { _id: false });

const GrammarTopicSchema = new mongoose.Schema({
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'GrammarCategory', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    coverEmoji: { type: String, default: '📖' },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },

    contentBlocks: [ContentBlockSchema],
    exerciseGroups: [ExerciseGroupSchema],
}, { timestamps: true });

GrammarTopicSchema.index({ categoryId: 1, displayOrder: 1 });

module.exports = mongoose.model('GrammarTopic', GrammarTopicSchema);
