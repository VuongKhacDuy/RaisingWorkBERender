const mongoose = require('mongoose');

// Shared exercise schemas — used by GrammarTopic (Bài tập vận dụng) and Topic
// (short story comprehension questions).

// One question inside an exercise group — flat `type`-driven fields living side by
// side (same convention ExamQuestionModel uses for structureSteps/sampleAnswers).
// Adding a new exercise type later only means adding more optional fields here.
const ExerciseQuestionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    order: { type: Number, default: 0 },
    explanation: { type: String, default: '' },

    // multiple-choice / true-false fields
    // true-false: `prompt` is the statement, options = ['True', 'False'],
    // correctOptionIndex 0 = True, 1 = False
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
    type: { type: String, required: true },   // 'multiple-choice' | 'fill-blank' | 'true-false' | ...
    order: { type: Number, default: 0 },
    instructions: { type: String, default: '' },
    questions: [ExerciseQuestionSchema],
}, { _id: false });

module.exports = { ExerciseQuestionSchema, ExerciseGroupSchema };
