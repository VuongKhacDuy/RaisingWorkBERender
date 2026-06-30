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
        enum: [
            'small_potion', 'medium_potion', 'large_potion', 'super_potion', 'full_potion',
            'small_mana_potion', 'medium_mana_potion', 'large_mana_potion', 'super_mana_potion', 'full_mana_potion',
            'mana_potion', 'think_time_booster', 'enemy_time_trap', 'power_booster', 'defense_booster', 'xp_booster', 'coin_charm'
        ],
        required: true
    },
    quantity: { type: Number, default: 1, min: 1 },
    priceCoins: { type: Number, required: true, min: 0 },
    effectType: {
        type: String,
        enum: ['heal_hp', 'restore_mana', 'add_think_time', 'reduce_enemy_think_time', 'boost_power', 'boost_defense', 'boost_xp', 'boost_coin'],
        default: 'heal_hp'
    },
    effectValue: { type: Number, default: 30, min: 0 },
    effectUnit: {
        type: String,
        enum: ['percent', 'points', 'seconds'],
        default: 'percent'
    },
    durationSeconds: { type: Number, default: 0, min: 0 },
    iconName: { type: String, default: 'cross.case.fill' },
    imageUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

shopProductSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('ShopProduct', shopProductSchema);
