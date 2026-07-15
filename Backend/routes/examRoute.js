const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/examController');
const authenticate = require('../middleware/authenticate');

// ── CMS routes ──────────────────────────────────────────────────────────────
router.get('/cms/categories', ctrl.listCategories);
router.post('/cms/categories', ctrl.createCategory);
router.put('/cms/categories/:id', ctrl.updateCategory);
router.delete('/cms/categories/:id', ctrl.deleteCategory);

router.get('/cms/sections', ctrl.listSections);
router.post('/cms/sections', ctrl.createSection);
router.put('/cms/sections/:id', ctrl.updateSection);
router.delete('/cms/sections/:id', ctrl.deleteSection);

router.get('/cms/collections', ctrl.listCollections);
router.post('/cms/collections', ctrl.createCollection);
router.put('/cms/collections/:id', ctrl.updateCollection);
router.delete('/cms/collections/:id', ctrl.deleteCollection);

router.get('/cms/questions', ctrl.listQuestions);
router.get('/cms/questions/:id', ctrl.getQuestion);
router.post('/cms/questions', ctrl.createQuestion);
router.put('/cms/questions/:id', ctrl.updateQuestion);
router.delete('/cms/questions/:id', ctrl.deleteQuestion);

// Migration (chạy 1 lần)
router.post('/cms/migrate-sections', ctrl.migrateSections);

// ── iOS routes (auth required) ──────────────────────────────────────────────
router.get('/ios/categories', authenticate, ctrl.listCategoriesForIOS);
router.get('/ios/sections/:categoryId', authenticate, ctrl.listSectionsByCategory);
router.get('/ios/collections/:sectionId', authenticate, ctrl.listCollectionsBySection);
router.get('/ios/questions/:collectionId', authenticate, ctrl.listQuestionsByCollection);
router.get('/ios/question/:id', authenticate, ctrl.getQuestionDetailForIOS);

module.exports = router;
