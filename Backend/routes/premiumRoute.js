const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const {
  getCatalog,
  verifyAppleTransaction,
  getEntitlements,
} = require("../controllers/premiumController");

// Public — no authentication needed
router.get("/content/catalog", getCatalog);

// Protected — require valid JWT
router.post("/iap/apple/transactions", authenticate, verifyAppleTransaction);
router.get("/users/me/entitlements", authenticate, getEntitlements);

module.exports = router;
