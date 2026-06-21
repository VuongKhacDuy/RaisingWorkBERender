const express = require('express');
const router = express.Router();
const cmsAccountController = require('../controllers/cmsAccountController');
const cmsMissionController = require('../controllers/cmsMissionController');

router.get('/accounts/lookup', cmsAccountController.lookupAccount);
router.patch('/accounts/role', cmsAccountController.updateAccountRole);
router.post('/accounts/coins', cmsAccountController.adjustAccountCoins);
router.get('/missions', cmsMissionController.listMissionPool);
router.post('/missions', cmsMissionController.createMissionPoolItem);
router.put('/missions/:id', cmsMissionController.updateMissionPoolItem);
router.delete('/missions/:id', cmsMissionController.deleteMissionPoolItem);

module.exports = router;
