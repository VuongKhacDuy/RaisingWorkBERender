const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { registerUser, verifyEmail, loginUser, deleteMyAccount, forgotPassword, resetPassword } = require("../controllers/authController");

router.post("/register", registerUser);
router.get("/verify/:token", verifyEmail);
router.post("/login", loginUser);
router.delete("/me", authenticate, deleteMyAccount);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
