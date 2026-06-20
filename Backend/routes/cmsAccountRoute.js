const express = require('express');
const router = express.Router();
const cmsAccountController = require('../controllers/cmsAccountController');

router.get('/accounts/lookup', cmsAccountController.lookupAccount);
router.patch('/accounts/role', cmsAccountController.updateAccountRole);
router.post('/accounts/coins', cmsAccountController.adjustAccountCoins);

module.exports = router;
