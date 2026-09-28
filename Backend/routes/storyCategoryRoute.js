const router = require('express').Router();
const ctrl = require('../controllers/storyCategoryController');

router.get('/', ctrl.listCategories);
router.post('/', ctrl.createCategory);
router.put('/:id', ctrl.updateCategory);
router.delete('/:id', ctrl.deleteCategory);

module.exports = router;
