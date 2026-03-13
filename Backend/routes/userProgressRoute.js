const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getUserProgress, syncUserProgress } = require('../controllers/userProgressController');

router.get('/', authenticate, getUserProgress);
router.post('/sync', authenticate, syncUserProgress);

module.exports = router;
