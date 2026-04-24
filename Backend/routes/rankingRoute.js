const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');
// const auth = require('../middleware/auth'); // Placeholder for actual auth middleware

// Public leaderboard access
router.get('/', rankingController.getLeaderboard);

// User specific rank status (Needs auth)
router.get('/status', rankingController.getRankStatus);

module.exports = router;
