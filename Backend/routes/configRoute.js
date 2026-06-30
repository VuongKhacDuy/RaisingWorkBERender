const express = require("express");
const router = express.Router();
const configController = require("../controllers/configController");

router.get("/", configController.getAppConfig);

module.exports = router;
