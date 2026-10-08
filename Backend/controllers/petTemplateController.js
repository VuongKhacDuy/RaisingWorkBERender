const PetTemplate = require("../models/Pet/PetTemplateModel");

// Each base stat has an IV range wild pets roll in: ±20% of the base.
// Recomputed whenever a base changes so the range never goes stale after an edit.
const STAT_RANGES = [
    ["baseHp", "minHP", "maxHP"],
    ["baseMana", "minMana", "maxMana"],
    ["basePower", "minPower", "maxPower"],
    ["baseDefense", "minDefense", "maxDefense"],
    ["baseSpeed", "minSpeed", "maxSpeed"],
];

const withStatRanges = (data) => {
    const result = { ...data };
    for (const [baseKey, minKey, maxKey] of STAT_RANGES) {
        const base = Number(result[baseKey]);
        if (!Number.isFinite(base) || base <= 0) continue;
        result[minKey] = Math.max(1, Math.floor(base * 0.8));
        result[maxKey] = Math.max(result[minKey], Math.floor(base * 1.2));
    }
    return result;
};

// ──────────────────────────────────────────────────────────────
// POST /api/pets/templates — Tạo pet template mới (admin)
// ──────────────────────────────────────────────────────────────
const createPetTemplate = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Thiếu tên pet." });

        const updateData = withStatRanges(req.body);

        // Sử dụng findOneAndUpdate với upsert: true để tránh tạo trùng tên
        const pet = await PetTemplate.findOneAndUpdate(
            { name: name.trim() },
            { $set: updateData },
            { upsert: true, new: true, runValidators: true }
        );

        const isNew = pet.createdAt.getTime() === pet.updatedAt.getTime();
        res.status(isNew ? 201 : 200).json({
            message: isNew ? "Tạo pet template thành công." : "Cập nhật pet template thành công.",
            data: pet
        });
    } catch (err) {
        console.error("createPetTemplate error:", err);
        res.status(500).json({ message: "Lỗi server khi tạo/cập nhật pet template." });
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

        // Delta Sync support
        if (req.query.since) {
            filter.updatedAt = { $gt: new Date(req.query.since) };
        }

        // Lightweight id list so clients can drop templates deleted on the server
        if (req.query.idsOnly === 'true') {
            const ids = await PetTemplate.find(filter).distinct('_id');
            return res.status(200).json({ data: ids.map(String), total: ids.length });
        }

        const isSpawnQuery = req.query.spawn === 'true';

        if (req.query.habitat) {
            filter.habitats = req.query.habitat;
            // Only apply hard minRate filter if it's NOT a spawn query
            if (req.query.minRate && !isSpawnQuery) {
                const rateKey = `habitatRates.${req.query.habitat}`;
                filter[rateKey] = { $gte: parseFloat(req.query.minRate) };
            }
        }

        let pets = await PetTemplate.find(filter).sort({ quality: 1, name: 1 });

        // Probabilistic filter for spawning
        if (isSpawnQuery && req.query.habitat) {
            const habitat = req.query.habitat;
            pets = pets.filter(pet => {
                const rate = pet.habitatRates.get ? pet.habitatRates.get(habitat) : (pet.habitatRates[habitat] || 0);
                // The "Dice Roll" logic
                return Math.random() <= rate;
            });
        }

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
            { $set: withStatRanges(req.body) },
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
