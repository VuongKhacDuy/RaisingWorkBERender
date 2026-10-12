const PetTemplate = require("../models/Pet/PetTemplateModel");
const { ALLOWED_FOLDERS, uploadBuffer, sniffImage, slugify } = require("../services/supabaseStorage");

const randomId = () => Math.random().toString(36).slice(2, 8);

// POST /api/media/upload  (multipart: image, folder, prefix?, name?)
// Uploads one image to the Supabase bucket and returns its permanent public URL.
const uploadMedia = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Chưa có file ảnh." });
        const folder = req.body.folder;
        if (!ALLOWED_FOLDERS.includes(folder)) {
            return res.status(400).json({ message: `Thư mục không hợp lệ. Cho phép: ${ALLOWED_FOLDERS.join(", ")}` });
        }
        const image = sniffImage(req.file.buffer);
        if (!image) return res.status(400).json({ message: "File không phải ảnh PNG / JPG / GIF / WEBP." });

        const prefix = slugify(req.body.prefix);        // e.g. pet name → its own sub-folder
        const name = slugify(req.body.name) || "image"; // e.g. "front", "cover"
        const path = [folder, prefix, `${name}-${Date.now()}-${randomId()}.${image.ext}`].filter(Boolean).join("/");

        const url = await uploadBuffer(req.file.buffer, path, image.type);
        res.status(201).json({ url, path });
    } catch (err) {
        console.error("uploadMedia error:", err);
        res.status(500).json({ message: err.message || "Upload ảnh thất bại." });
    }
};

// ── Pet image migration: base64 stored in templates → Supabase links ──────────

const isBase64Image = (value) => typeof value === "string" && value.length > 200 && !/^https?:\/\//i.test(value.trim());

const decodeBase64 = (value) => Buffer.from(value.includes(",") && value.startsWith("data:") ? value.split(",")[1] : value, "base64");

/** Every base64 image field of a template: { field path, value }. */
const base64Fields = (pet) => {
    const fields = [];
    if (isBase64Image(pet.image)) fields.push({ key: "image", name: "cover", value: pet.image });
    for (const [dir, value] of Object.entries(pet.sprites || {})) {
        if (isBase64Image(value)) fields.push({ key: `sprites.${dir}`, name: dir, value });
    }
    (pet.evolutionStages || []).forEach((stage, index) => {
        if (isBase64Image(stage.spriteUrl)) fields.push({ key: `evolutionStages.${index}.spriteUrl`, name: `stage-${stage.stage}`, value: stage.spriteUrl });
    });
    return fields;
};

// POST /api/media/migrate-pet-images { apply: false }
// Dry run (default) reports what would move; apply: true backs up all templates to the bucket,
// uploads each base64 image to Pets/<slug>-<id>/ and replaces it with the public link. Safe to re-run.
const migratePetImages = async (req, res) => {
    try {
        const apply = req.body?.apply === true;
        const pets = await PetTemplate.find({}).lean();
        const report = pets
            .map((pet) => ({ pet, fields: base64Fields(pet) }))
            .filter((r) => r.fields.length > 0);

        const summary = report.map(({ pet, fields }) => ({
            id: pet._id,
            name: pet.name,
            images: fields.length,
            sizeKB: Math.round(fields.reduce((sum, f) => sum + f.value.length * 0.75, 0) / 1024),
        }));
        if (!apply) {
            return res.status(200).json({ dryRun: true, pets: summary, totalImages: summary.reduce((s, p) => s + p.images, 0) });
        }

        // Backup of the original templates before anything changes
        const backupPath = `Pets/_backup/pet-templates-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        const backupUrl = await uploadBuffer(Buffer.from(JSON.stringify(pets)), backupPath, "application/json");

        const results = [];
        for (const { pet, fields } of report) {
            const folder = `Pets/${slugify(pet.name) || "pet"}-${String(pet._id).slice(-8)}`;
            const update = {};
            const errors = [];
            for (const field of fields) {
                try {
                    const buffer = decodeBase64(field.value);
                    const image = sniffImage(buffer) || { ext: "png", type: "image/png" };
                    update[field.key] = await uploadBuffer(buffer, `${folder}/${field.name}.${image.ext}`, image.type);
                } catch (err) {
                    errors.push(`${field.key}: ${err.message}`);
                }
            }
            if (Object.keys(update).length > 0) {
                await PetTemplate.updateOne({ _id: pet._id }, { $set: update });
            }
            results.push({ id: pet._id, name: pet.name, migrated: Object.keys(update).length, errors });
        }
        res.status(200).json({ dryRun: false, backupUrl, results });
    } catch (err) {
        console.error("migratePetImages error:", err);
        res.status(500).json({ message: err.message || "Chuyển ảnh pet thất bại." });
    }
};

module.exports = { uploadMedia, migratePetImages };
