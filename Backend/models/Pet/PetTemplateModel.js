const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: "" },
    manaCost: { type: Number, default: 0 },
    damage: { type: Number, default: 0 },
}, { _id: false });

const petTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    image: { type: String, required: true },      // URL hoặc asset name
    description: { type: String, default: "" },

    // Các ảnh sprite hướng dẫn (optionals)
    sprites: {
        front: { type: String, default: "" },
        back: { type: String, default: "" },
        left: { type: String, default: "" },
        right: { type: String, default: "" },
        topLeft: { type: String, default: "" },
        topRight: { type: String, default: "" },
        bottomLeft: { type: String, default: "" },
        bottomRight: { type: String, default: "" }
    },

    // Hệ nguyên tố
    element: {
        type: [String],
        enum: ["fire", "water", "grass", "electric", "dark", "light", "earth", "ice", "wind", "poison"],
        validate: {
            validator: function (v) {
                return v && v.length >= 1 && v.length <= 3;
            },
            message: "Mỗi Pet phải có từ 1 đến 3 hệ nguyên tố."
        },
        required: true,
    },

    // Phẩm chất
    quality: {
        type: String,
        enum: ["common", "uncommon", "rare", "epic", "legendary"],
        default: "common",
    },

    // Thế hệ (Gen)
    gen: { type: Number, default: 1, required: true },

    // Khu vực xuất hiện (Habitats)
    habitats: {
        type: [String],
        enum: ["plains", "mountain", "ocean", "river", "lake", "grassland", "sky"],
        default: ["plains"],
        required: true,
        validate: {
            validator: function (v) {
                return v && v.length >= 1;
            },
            message: "Mỗi Pet phải có ít nhất 1 khu vực xuất hiện."
        }
    },

    // Tỉ lệ xuất hiện theo từng khu vực (key: habitatId, value: rate 0-1)
    habitatRates: {
        type: Map,
        of: Number,
        default: {}
    },

    // Chỉ số gốc (Dải biến thiên cho từng loài)
    baseHp: { type: Number, required: true, min: 1 },
    minHP: { type: Number, required: true, min: 1 },
    maxHP: { type: Number, required: true, min: 1 },

    baseMana: { type: Number, required: true, min: 0 },
    minMana: { type: Number, required: true, min: 0 },
    maxMana: { type: Number, required: true, min: 0 },

    basePower: { type: Number, required: true, min: 1 },
    minPower: { type: Number, required: true, min: 1 },
    maxPower: { type: Number, required: true, min: 1 },

    baseDefense: { type: Number, default: 10 },
    minDefense: { type: Number, default: 5 },
    maxDefense: { type: Number, default: 20 },

    baseSpeed: { type: Number, default: 10 },
    minSpeed: { type: Number, default: 5 },
    maxSpeed: { type: Number, default: 20 },

    // Giới hạn cấp & tuổi thọ (đơn vị: ngày)
    maxLevel: { type: Number, default: 50 },
    lifespan: { type: Number, default: 30 },

    // Tỉ lệ bắt (0.0 – 1.0)
    catchRate: { type: Number, default: 0.5, min: 0, max: 1 },

    // Danh sách skill
    skills: { type: [skillSchema], default: [] },

}, { timestamps: true });

module.exports = mongoose.model("PetTemplate", petTemplateSchema);
