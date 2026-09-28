const mongoose = require('mongoose');

// Fixed categories for Short Stories (Topic) — managed on the CMS, a topic can have many.
const StoryCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('StoryCategory', StoryCategorySchema);
