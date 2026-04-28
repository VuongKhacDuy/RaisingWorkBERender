const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');
// const auth = require('../middleware/auth'); // Placeholder for actual auth middleware

const authenticate = require('../middleware/authenticate');

// Public leaderboard access
router.get('/', rankingController.getLeaderboard);

// User specific rank status (Needs auth)
router.get('/status', authenticate, rankingController.getRankStatus);

// Tiers metadata (Needs auth)
router.get('/tiers', authenticate, rankingController.getTiers);

// Personal history (Needs auth)
router.get('/history/my', authenticate, rankingController.getMyHistory);

// Update XP (Needs auth)
router.post('/update-xp', authenticate, rankingController.updateXP);

module.exports = router;
