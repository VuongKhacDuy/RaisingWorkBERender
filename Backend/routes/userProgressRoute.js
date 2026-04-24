const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getUserProgress, syncUserProgress, getCoinHistory } = require('../controllers/userProgressController');

router.get('/', authenticate, getUserProgress);
router.get('/coins/history', authenticate, getCoinHistory);
router.post('/sync', authenticate, syncUserProgress);

module.exports = router;
