const express = require("express");
const multer = require("multer");
const router = express.Router();
const { uploadMedia, migratePetImages } = require("../controllers/mediaController");

// Images only, kept in memory and streamed straight to Supabase (5 MB max)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const singleImage = (req, res, next) => upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "Ảnh vượt quá 5MB." : err.message });
    next();
});

// CMS: upload one image into a bucket folder → { url }
router.post("/upload", singleImage, uploadMedia);

// CMS: move base64 pet images in templates to Supabase links ({ apply: true } to run, otherwise dry run)
router.post("/migrate-pet-images", migratePetImages);

module.exports = router;
