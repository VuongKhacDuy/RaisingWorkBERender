const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const {
  getCatalog,
  getPackageById,
  verifyAppleTransaction,
  getEntitlements,
} = require("../controllers/premiumController");

// Public — no authentication needed
router.get("/content/catalog", getCatalog);
router.get("/content/packages/:id", getPackageById);

// Protected — require valid JWT
router.post("/iap/apple/transactions", authenticate, verifyAppleTransaction);
router.get("/users/me/entitlements", authenticate, getEntitlements);

module.exports = router;
