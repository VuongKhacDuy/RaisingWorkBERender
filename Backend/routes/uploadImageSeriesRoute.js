const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Cấu hình lưu file với tên rõ ràng
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    // Lấy type và id từ form-data (nếu có)
    const type = req.body.type || 'file';
    const id = req.body.id || '';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    let filename = `${type}`;
    if (id) filename += `_${id}`;
    filename += `_${timestamp}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });

// API upload ảnh
router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  // Trả về đường dẫn file
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

router.get('/test', (req, res) => res.send('upload ok'));

module.exports = router;
