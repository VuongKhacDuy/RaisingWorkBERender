const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cmsCollectionController');

// CMS routes (admin only — add auth middleware here when ready)
router.get('/collections', ctrl.listCollections);
router.post('/collections', ctrl.createCollection);
router.get('/collections/:id', ctrl.getCollectionDetail);
router.put('/collections/:id', ctrl.updateCollection);
router.delete('/collections/:id', ctrl.deleteCollection);
router.put('/collections/:id/words', ctrl.setWords);
router.post('/collections/:id/words/add', ctrl.addWords);
router.post('/collections/:id/words/remove', ctrl.removeWords);

module.exports = router;
