const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { syncGameStatistics, getGameStatistics } = require("../controllers/gameStatisticsController");

router.post("/sync", authenticate, syncGameStatistics);
router.get("/", authenticate, getGameStatistics);

module.exports = router;
