const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cmsCollectionController');

// Groups (Cấp 1)
router.get('/collection-groups', ctrl.listGroups);
router.post('/collection-groups', ctrl.createGroup);
router.put('/collection-groups/:id', ctrl.updateGroup);
router.delete('/collection-groups/:id', ctrl.deleteGroup);

// Collections (Cấp 2) — ?groupId=xxx để filter theo group
router.get('/collections', ctrl.listCollections);
router.post('/collections', ctrl.createCollection);
router.get('/collections/:id', ctrl.getCollectionDetail);
router.put('/collections/:id', ctrl.updateCollection);
router.delete('/collections/:id', ctrl.deleteCollection);
router.put('/collections/:id/words', ctrl.setWords);
router.post('/collections/:id/words/add', ctrl.addWords);
router.put('/collections/:id/words/:wordId', ctrl.updateWord);
router.post('/collections/:id/words/remove', ctrl.removeWords);
router.post('/collections/:id/words/import', ctrl.importWordsJson);
router.patch('/collections/:id/words/import-images', ctrl.importWordImages);

module.exports = router;
