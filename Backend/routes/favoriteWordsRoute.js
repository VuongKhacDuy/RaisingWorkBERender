const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const {
    addFavoriteWord,
    getFavoriteWords,
    updateFavoriteWord,
    removeFavoriteWord,
    syncFavoriteWords,
} = require("../controllers/favoriteWordsController");

// All routes require a valid JWT token
router.post("/sync", authenticate, syncFavoriteWords);
router.post("/", authenticate, addFavoriteWord);
router.get("/", authenticate, getFavoriteWords);
router.put("/:wordId", authenticate, updateFavoriteWord);
router.delete("/:wordId", authenticate, removeFavoriteWord);

module.exports = router;
