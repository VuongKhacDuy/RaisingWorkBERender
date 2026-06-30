const mongoose = require("mongoose");

const contentPackageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    coverImage: {
      type: String,
      default: null,
    },

    // "vocabulary" | "story" | "battle"
    type: {
      type: String,
      enum: ["vocabulary", "story", "battle"],
      required: true,
    },

    // "free" | "premium"
    accessLevel: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },

    // Cho phép user free xem thử một số nội dung
    isPreview: {
      type: Boolean,
      default: false,
    },

    // Sắp xếp hiển thị
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const ContentPackage = mongoose.model("ContentPackage", contentPackageSchema);

module.exports = ContentPackage;
