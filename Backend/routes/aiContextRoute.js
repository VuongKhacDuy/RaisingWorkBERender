const express = require("express");
const authenticate = require("../middleware/authenticate");
const { getAIUsage, explainInContext } = require("../controllers/aiContextController");

const router = express.Router();

router.get("/usage", authenticate, getAIUsage);
router.post("/context-explain", authenticate, explainInContext);

module.exports = router;
