const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: "" },
    manaCost: { type: Number, default: 0 },
    damage: { type: Number, default: 0 },
}, { _id: false });

const petTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    image: { type: String, required: true },      // URL hoặc asset name
    description: { type: String, default: "" },

    // Hệ nguyên tố
    element: {
        type: String,
        enum: ["fire", "water", "grass", "electric", "dark", "light", "earth", "ice", "wind", "poison"],
        required: true,
    },

    // Phẩm chất
    quality: {
        type: String,
        enum: ["common", "uncommon", "rare", "epic", "legendary"],
        default: "common",
    },

    // Chỉ số gốc (base stats — scale theo level khi người chơi sở hữu)
    baseHp: { type: Number, required: true, min: 1 },
    baseMana: { type: Number, required: true, min: 0 },
    basePower: { type: Number, required: true, min: 1 },

    // Giới hạn cấp & tuổi thọ (đơn vị: ngày)
    maxLevel: { type: Number, default: 50 },
    lifespan: { type: Number, default: 30 },

    // Tỉ lệ bắt (0.0 – 1.0)
    catchRate: { type: Number, default: 0.5, min: 0, max: 1 },

    // Danh sách skill
    skills: { type: [skillSchema], default: [] },

}, { timestamps: true });

module.exports = mongoose.model("PetTemplate", petTemplateSchema);
