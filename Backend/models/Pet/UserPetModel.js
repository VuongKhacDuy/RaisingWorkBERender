const mongoose = require("mongoose");

const userPetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    petTemplateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PetTemplate",
        required: true,
    },

    // Tùy chỉnh của người dùng
    nickname: { type: String, default: "" },
    isActive: { type: Boolean, default: false },   // Pet đang được chọn làm main

    // Tiến trình
    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },       // XP tích lũy trong level hiện tại

    // Chỉ số hiện tại (= base * level multiplier)
    hp: { type: Number, default: 0 },
    mana: { type: Number, default: 0 },
    power: { type: Number, default: 0 },

    // Thời điểm bắt được
    caughtAt: { type: Date, default: Date.now },

}, { timestamps: true });

// Index để truy vấn nhanh theo userId
userPetSchema.index({ userId: 1 });
userPetSchema.index({ userId: 1, petTemplateId: 1 });

module.exports = mongoose.model("UserPet", userPetSchema);
