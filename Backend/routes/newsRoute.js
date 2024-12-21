const router = require('express').Router()
const newsController = require('../controllers/News/newsController')

// const upload        = require('../middleware/upload')

router.post('/', newsController.createNews),
// router.post('/', upload.single('imageUrl'), newsController.createNews),
router.get('/', newsController.getAllNews),
router.get('/:id', newsController.getNews),

router.post('/delete/:id', newsController.deleteNews)

module.exports = router