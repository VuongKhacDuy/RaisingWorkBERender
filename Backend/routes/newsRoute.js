const router = require('express').Router()
const newsController = require('../controllers/News/newsController')

// const upload        = require('../middleware/upload')

router.post('/', newsController.createNews),
// router.post('/', upload.single('imageUrl'), newsController.createNews),
router.get('/', newsController.getAllNews),
router.get('/cms/:id', newsController.getNewsForCms),
router.get('/:id', newsController.getNews),

router.post('/delete/:id', newsController.deleteNews)
router.post('/:id', newsController.updateNews)
router.put('/:id', newsController.updateNews)

module.exports = router
