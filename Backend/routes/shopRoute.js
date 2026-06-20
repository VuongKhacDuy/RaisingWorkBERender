const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const authenticate = require('../middleware/authenticate');

router.get('/products', shopController.listProducts);
router.post('/products', shopController.createProduct);
router.put('/products/:id', shopController.updateProduct);
router.delete('/products/:id', shopController.deleteProduct);
router.post('/purchase', authenticate, shopController.purchaseProduct);

module.exports = router;
