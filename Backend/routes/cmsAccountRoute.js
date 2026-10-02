const express = require('express');
const router = express.Router();
const cmsAccountController = require('../controllers/cmsAccountController');
const cmsMissionController = require('../controllers/cmsMissionController');
const cmsSeedController = require('../controllers/cmsSeedController');
const cmsPremiumController = require('../controllers/cmsPremiumController');

router.get('/accounts/lookup', cmsAccountController.lookupAccount);
router.patch('/accounts/role', cmsAccountController.updateAccountRole);
router.post('/accounts/coins', cmsAccountController.adjustAccountCoins);
router.get('/leaderboard/accounts', cmsAccountController.listLeaderboardAccounts);

// Seeder accounts
router.post('/accounts/seed', cmsSeedController.seedAccounts);
router.get('/accounts/seeders', cmsSeedController.listSeederAccounts);
router.delete('/accounts/seeders', cmsSeedController.deleteSeederAccounts);
router.patch('/accounts/seeders/:id/toggle', cmsSeedController.toggleSeederActive);
// Premium / Apple IAP
router.get('/premium/summary', cmsPremiumController.getSummary);
router.get('/premium/subscriptions', cmsPremiumController.listSubscriptions);
router.get('/premium/subscriptions/:id', cmsPremiumController.getSubscription);
router.post('/premium/subscriptions/:id/sync', cmsPremiumController.syncSubscription);
router.get('/premium/users', cmsPremiumController.lookupUser);
router.post('/premium/users/manual', cmsPremiumController.setManualPremium);

router.get('/missions', cmsMissionController.listMissionPool);
router.post('/missions', cmsMissionController.createMissionPoolItem);
router.put('/missions/:id', cmsMissionController.updateMissionPoolItem);
router.delete('/missions/:id', cmsMissionController.deleteMissionPoolItem);

module.exports = router;
