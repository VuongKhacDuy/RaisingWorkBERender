const mongoose = require("mongoose");

const NewsSchema = new mongoose.Schema({
  imageUrl: { type: String, require: true },
  title: { type: String, require: true },
  subTitle: {type: String, require: true},
  description: { type: String, require: true },
  reference: { type: String, require: true },
  createAt: { type: Date, default: Date.now },

});

module.exports = mongoose.model("News", NewsSchema);
