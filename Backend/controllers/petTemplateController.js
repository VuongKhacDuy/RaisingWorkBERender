const PetTemplate = require("../models/Pet/PetTemplateModel");

// ──────────────────────────────────────────────────────────────
// POST /api/pets/templates — Tạo pet template mới (admin)
// ──────────────────────────────────────────────────────────────
const createPetTemplate = async (req, res) => {
    try {
        const {
            name, image, description,
            element, quality,
            baseHp, baseMana, basePower,
            maxLevel, lifespan, catchRate,
            skills, sprites,
            gen, habitats, habitatRates,
        } = req.body;

        if (!name || !image || !element || !baseHp || !baseMana || !basePower) {
            return res.status(400).json({ message: "Thiếu trường bắt buộc: name, image, element, baseHp, baseMana, basePower." });
        }

        if (!Array.isArray(element) || element.length < 1 || element.length > 3) {
            return res.status(400).json({ message: "Phải có từ 1 đến 3 hệ nguyên tố." });
        }

        const pet = new PetTemplate({
            name, image, description,
            element, quality,
            baseHp, baseMana, basePower,
            maxLevel, lifespan, catchRate,
            skills: skills || [],
            sprites: sprites || {},
            gen: gen || 1,
            habitats: habitats || ["plains"],
            habitatRates: habitatRates || {},
        });

        await pet.save();
        res.status(201).json({ message: "Tạo pet template thành công.", data: pet });
    } catch (err) {
        console.error("createPetTemplate error:", err);
        res.status(500).json({ message: "Lỗi server khi tạo pet template." });
    }
};

// ──────────────────────────────────────────────────────────────
// GET /api/pets/templates — Lấy tất cả pet templates
// Optional query: ?element=fire&quality=rare
// ──────────────────────────────────────────────────────────────
const getAllPetTemplates = async (req, res) => {
    try {
        const filter = {};
        if (req.query.element) filter.element = req.query.element;
        if (req.query.quality) filter.quality = req.query.quality;
        if (req.query.habitat) filter.habitats = req.query.habitat;

        const pets = await PetTemplate.find(filter).sort({ quality: 1, name: 1 });
        res.status(200).json({ data: pets, total: pets.length });
    } catch (err) {
        console.error("getAllPetTemplates error:", err);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách pet template." });
    }
};

// ──────────────────────────────────────────────────────────────
// GET /api/pets/templates/:id — Lấy 1 pet template theo ID
// ──────────────────────────────────────────────────────────────
const getPetTemplateById = async (req, res) => {
    try {
        const pet = await PetTemplate.findById(req.params.id);
        if (!pet) return res.status(404).json({ message: "Không tìm thấy pet template." });
        res.status(200).json({ data: pet });
    } catch (err) {
        console.error("getPetTemplateById error:", err);
        res.status(500).json({ message: "Lỗi server." });
    }
};

// ──────────────────────────────────────────────────────────────
// PUT /api/pets/templates/:id — Cập nhật pet template
// ──────────────────────────────────────────────────────────────
const updatePetTemplate = async (req, res) => {
    try {
        const updated = await PetTemplate.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ message: "Không tìm thấy pet template." });
        res.status(200).json({ message: "Cập nhật thành công.", data: updated });
    } catch (err) {
        console.error("updatePetTemplate error:", err);
        res.status(500).json({ message: "Lỗi server khi cập nhật pet template." });
    }
};

// ──────────────────────────────────────────────────────────────
// DELETE /api/pets/templates/:id — Xoá pet template
// ──────────────────────────────────────────────────────────────
const deletePetTemplate = async (req, res) => {
    try {
        const deleted = await PetTemplate.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Không tìm thấy pet template." });
        res.status(200).json({ message: "Đã xoá pet template.", data: deleted });
    } catch (err) {
        console.error("deletePetTemplate error:", err);
        res.status(500).json({ message: "Lỗi server khi xoá pet template." });
    }
};

module.exports = {
    createPetTemplate,
    getAllPetTemplates,
    getPetTemplateById,
    updatePetTemplate,
    deletePetTemplate,
};
