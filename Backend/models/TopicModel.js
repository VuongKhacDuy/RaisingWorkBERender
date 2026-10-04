const mongoose = require("mongoose");
const { ExerciseGroupSchema } = require("./shared/ExerciseSchemas");

const TopicSchema = new mongoose.Schema({
  imageUrl: { type: String, require: true },
  title: { type: String, require: true },
  subTitle: {type: String, require: false},
  description: { type: String, require: true },
  reference: { type: String, require: true },
  videoUrl: { type: String, required: false },
  createAt: { type: Date, default: Date.now },
  // CEFR level (A1–C2) — optional, validated in topicsController
  level: { type: String },
  // Fixed categories managed on the CMS (StoryCategory)
  categoryIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "StoryCategory" }], default: [] },
  // Estimated from description word count when the topic is saved
  readingMinutes: { type: Number },
  // Premium stories: non-premium users only get a preview (no text / questions)
  accessLevel: { type: String, enum: ["free", "premium"], default: "free" },
  numbLike: {type: Number, default: 0},
  numbRead: {type: Number, default: 0},
  // Comprehension questions shown after the story (multiple-choice / fill-blank / true-false)
  exerciseGroups: { type: [ExerciseGroupSchema], default: [] }
});

// List screen: newest first, _id as tie-breaker for cursor pagination
TopicSchema.index({ createAt: -1, _id: -1 });
TopicSchema.index({ level: 1, createAt: -1, _id: -1 });
TopicSchema.index({ categoryIds: 1, createAt: -1, _id: -1 });
TopicSchema.index({ numbRead: -1, createAt: -1, _id: -1 });

TopicSchema.statics.LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

module.exports = mongoose.model("Topic", TopicSchema);
