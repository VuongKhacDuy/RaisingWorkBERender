const express = require('express');
const router = express.Router();
const { listCollections, queryDocuments, deleteDocuments } = require('../controllers/dbManagerController');

router.get('/collections', listCollections);
router.get('/collections/:collection/docs', queryDocuments);
router.delete('/collections/:collection/docs', deleteDocuments);

module.exports = router;
