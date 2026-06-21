const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { registerUser, verifyEmail, loginUser, deleteMyAccount } = require("../controllers/authController");

router.post("/register", registerUser);
router.get("/verify/:token", verifyEmail);
router.post("/login", loginUser);
router.delete("/me", authenticate, deleteMyAccount);

module.exports = router;
