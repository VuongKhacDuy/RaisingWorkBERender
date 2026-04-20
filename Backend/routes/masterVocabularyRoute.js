const express = require('express');
const router = express.Router();
const {
    getAllMasterVocabulary,
    getMasterVocabularyById,
    createMasterVocabulary,
    updateMasterVocabulary,
    deleteMasterVocabulary,
    bulkCreateMasterVocabulary
} = require('../controllers/masterVocabularyController');

// Standard CRUD
router
    .route('/')
    .get(getAllMasterVocabulary)
    .post(createMasterVocabulary);

router
    .route('/bulk')
    .post(bulkCreateMasterVocabulary);

router
    .route('/:id')
    .get(getMasterVocabularyById)
    .put(updateMasterVocabulary)
    .delete(deleteMasterVocabulary);

module.exports = router;
