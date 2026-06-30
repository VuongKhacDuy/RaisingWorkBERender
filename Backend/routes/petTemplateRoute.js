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
router.get("/", getAllPetTemplates);

// Lấy 1 pet template theo ID
router.get("/:id", getPetTemplateById);

// Tạo pet template mới (admin)
router.post("/", createPetTemplate);

// Cập nhật pet template (admin)
router.put("/:id", updatePetTemplate);

// Xoá pet template (admin)
router.delete("/:id", deletePetTemplate);

module.exports = router;
