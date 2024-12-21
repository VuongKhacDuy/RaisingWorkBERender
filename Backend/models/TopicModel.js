const mongoose = require("mongoose");

const TopicSchema = new mongoose.Schema({
  imageUrl: { type: String, require: true },
  title: { type: String, require: true },
  subTitle: {type: String, require: false},
  description: { type: String, require: true },
  reference: { type: String, require: true },
  createAt: { type: Date, default: Date.now },
  numbLike: {type: Number, default: 0},
  numbRead: {type: Number, defaul: 0}
});

module.exports = mongoose.model("Topic", TopicSchema);
