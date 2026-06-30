const mongoose = require("mongoose");

const aiExplanationCacheSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    selectedText: {
      type: String,
      required: true,
    },
    contextHash: {
      type: String,
      required: true,
      index: true,
    },
    targetLanguage: {
      type: String,
      default: "vi",
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AIExplanationCache", aiExplanationCacheSchema);
