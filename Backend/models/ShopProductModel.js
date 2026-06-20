const mongoose = require('mongoose');

const shopProductSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: {
        type: String,
        enum: ['consumable', 'booster', 'cosmetic', 'bundle'],
        default: 'consumable'
    },
    itemType: {
        type: String,
        enum: ['small_potion', 'xp_booster', 'coin_charm'],
        required: true
    },
    quantity: { type: Number, default: 1, min: 1 },
    priceCoins: { type: Number, required: true, min: 0 },
    iconName: { type: String, default: 'cross.case.fill' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

shopProductSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('ShopProduct', shopProductSchema);
