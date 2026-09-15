const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/grammarController');
const authenticate = require('../middleware/authenticate');

// ── CMS routes ──────────────────────────────────────────────────────────────
router.get('/cms/categories', ctrl.listCategories);
router.post('/cms/categories', ctrl.createCategory);
router.put('/cms/categories/:id', ctrl.updateCategory);
router.delete('/cms/categories/:id', ctrl.deleteCategory);

router.get('/cms/topics', ctrl.listTopics);
router.get('/cms/topics/:id', ctrl.getTopic);
router.post('/cms/topics', ctrl.createTopic);
router.put('/cms/topics/:id', ctrl.updateTopic);
router.delete('/cms/topics/:id', ctrl.deleteTopic);

// ── iOS routes (auth required) ──────────────────────────────────────────────
router.get('/ios/categories', authenticate, ctrl.listCategoriesForIOS);
router.get('/ios/topics/:categoryId', authenticate, ctrl.listTopicsForCategoryForIOS);
router.get('/ios/topic/:id', authenticate, ctrl.getTopicDetailForIOS);

module.exports = router;
