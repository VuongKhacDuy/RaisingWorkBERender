const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getDailyMissions, syncDailyMissions } = require('../controllers/dailyMissionController');

router.get('/', authenticate, getDailyMissions);
router.post('/sync', authenticate, syncDailyMissions);

module.exports = router;
