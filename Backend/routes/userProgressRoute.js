const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getUserProgress, syncUserProgress, getCoinHistory, recoverUserCoins } = require('../controllers/userProgressController');

router.get('/', authenticate, getUserProgress);
router.get('/coins/history', authenticate, getCoinHistory);
router.post('/sync', authenticate, syncUserProgress);
router.post('/coins/recover', recoverUserCoins); // Internal admin tool

module.exports = router;
