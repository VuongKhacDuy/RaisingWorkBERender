const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { syncAchievements, getAchievements, listTemplates, createTemplate, updateTemplate, deleteTemplate } = require("../controllers/achievementController");

// ─── Template CRUD (must be above user routes to avoid param conflicts) ────
router.get("/templates", authenticate, listTemplates);
router.post("/templates", authenticate, createTemplate);
router.put("/templates/:achievementId", authenticate, updateTemplate);
router.delete("/templates/:achievementId", authenticate, deleteTemplate);

// ─── User Achievement Routes ───────────────────────────────────────────────
router.post("/sync", authenticate, syncAchievements);
router.get("/", authenticate, getAchievements);

module.exports = router;

