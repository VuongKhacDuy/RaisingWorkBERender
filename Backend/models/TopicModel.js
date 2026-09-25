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
  numbRead: {type: Number, defaul: 0},
  // Comprehension questions shown after the story (multiple-choice / fill-blank / true-false)
  exerciseGroups: { type: [ExerciseGroupSchema], default: [] }
});

module.exports = mongoose.model("Topic", TopicSchema);
