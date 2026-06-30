const express = require('express');
const router = express.Router();
const cmsAccountController = require('../controllers/cmsAccountController');
const cmsMissionController = require('../controllers/cmsMissionController');
const cmsSeedController = require('../controllers/cmsSeedController');

router.get('/accounts/lookup', cmsAccountController.lookupAccount);
router.patch('/accounts/role', cmsAccountController.updateAccountRole);
router.post('/accounts/coins', cmsAccountController.adjustAccountCoins);

// Seeder accounts
router.post('/accounts/seed', cmsSeedController.seedAccounts);
router.get('/accounts/seeders', cmsSeedController.listSeederAccounts);
router.delete('/accounts/seeders', cmsSeedController.deleteSeederAccounts);
router.get('/missions', cmsMissionController.listMissionPool);
router.post('/missions', cmsMissionController.createMissionPoolItem);
router.put('/missions/:id', cmsMissionController.updateMissionPoolItem);
router.delete('/missions/:id', cmsMissionController.deleteMissionPoolItem);

module.exports = router;
