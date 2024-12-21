const router = require('express').Router();
const topicController = require('../controllers/topicsController')

router.get('/', topicController.getAllTopics)
router.get('/:id', topicController.getTopic)
router.get('/search/:key', topicController.searchTopic)
router.post('/', topicController.createTopic)
router.post('/delete/:id', topicController.deleteTopic)

module.exports = router