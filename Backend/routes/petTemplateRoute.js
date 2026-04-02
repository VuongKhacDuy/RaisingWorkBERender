const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const {
    createPetTemplate,
    getAllPetTemplates,
    getPetTemplateById,
    updatePetTemplate,
    deletePetTemplate,
} = require("../controllers/petTemplateController");

// Lấy danh sách pet templates (có thể filter ?element=fire&quality=rare)
router.get("/", authenticate, getAllPetTemplates);

// Lấy 1 pet template theo ID
router.get("/:id", authenticate, getPetTemplateById);

// Tạo pet template mới (admin)
router.post("/", authenticate, createPetTemplate);

// Cập nhật pet template (admin)
router.put("/:id", authenticate, updatePetTemplate);

// Xoá pet template (admin)
router.delete("/:id", authenticate, deletePetTemplate);

module.exports = router;
