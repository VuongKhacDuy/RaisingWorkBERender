const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cmsCollectionController');

// iOS public endpoint
router.get('/', ctrl.listForIOS);

module.exports = router;
