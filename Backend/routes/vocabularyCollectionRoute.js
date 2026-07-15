const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cmsCollectionController');

// iOS public endpoints
router.get('/', ctrl.listForIOS);
router.get('/groups', ctrl.listGroupsForIOS);
router.get('/by-group/:groupId', ctrl.listCollectionsByGroupForIOS);
router.get('/:collectionId/words', ctrl.listWordsForIOS);

module.exports = router;
