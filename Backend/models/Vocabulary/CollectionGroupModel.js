const mongoose = require('mongoose');

const CollectionGroupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    coverEmoji: { type: String, default: '📂' },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
}, {
    timestamps: true
});

module.exports = mongoose.model('CollectionGroup', CollectionGroupSchema);
