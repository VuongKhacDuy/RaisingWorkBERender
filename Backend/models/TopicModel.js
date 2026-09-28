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
  numbLike: {type: Number, default: 0},
  numbRead: {type: Number, default: 0},
  // Comprehension questions shown after the story (multiple-choice / fill-blank / true-false)
  exerciseGroups: { type: [ExerciseGroupSchema], default: [] }
});

// List screen: newest first, _id as tie-breaker for cursor pagination
TopicSchema.index({ createAt: -1, _id: -1 });
// Search by title / subtitle (default_language 'none' → no English stemming / stopwords)
TopicSchema.index(
  { title: "text", subTitle: "text" },
  { weights: { title: 3, subTitle: 1 }, default_language: "none", name: "topic_title_text" }
);

module.exports = mongoose.model("Topic", TopicSchema);
