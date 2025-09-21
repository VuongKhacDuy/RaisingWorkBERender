const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadImageSeriesController = require('../controllers/uploadImageSeriesController');

// Cấu hình lưu file vào memory (buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// API upload ảnh
router.post('/', upload.single('image'), uploadImageSeriesController.uploadImage);
router.get('/get_image_series/:id', uploadImageSeriesController.getImageById);
// Lấy ảnh theo type và refId (id của series/episode)
router.get('/get_image_by_type_ref/:type/:refId', uploadImageSeriesController.getImageByTypeAndRef);
// Xóa ảnh theo id
// router.delete('/delete_image/:id', uploadImageSeriesController.deleteImage);
router.post('/delete_image/:id', uploadImageSeriesController.deleteImage); // Backup route với POST
router.get('/test', (req, res) => res.send('upload ok'));

module.exports = router;
