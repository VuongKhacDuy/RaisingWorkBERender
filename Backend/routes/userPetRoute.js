const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const {
    catchPet,
    getMyPets,
    getMyPetById,
    addXpToPet,
    levelUpPet,
    setNickname,
    releasePet,
} = require("../controllers/userPetController");

// Bắt pet mới
router.post("/catch", authenticate, catchPet);

// Lấy toàn bộ pet của user (?isActive=true để lọc)
router.get("/", authenticate, getMyPets);

// Lấy 1 pet cụ thể
router.get("/:id", authenticate, getMyPetById);

// Cộng XP cho pet
router.post("/:id/addxp", authenticate, addXpToPet);

// Level up pet
router.post("/:id/levelup", authenticate, levelUpPet);

// Đặt biệt danh
router.patch("/:id/nickname", authenticate, setNickname);

// Thả pet
router.delete("/:id", authenticate, releasePet);

module.exports = router;
