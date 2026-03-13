const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { syncAchievements, getAchievements } = require("../controllers/achievementController");

router.post("/sync", authenticate, syncAchievements);
router.get("/", authenticate, getAchievements);

module.exports = router;
