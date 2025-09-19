// GET /get_image_by_type_ref/:type/:refId
exports.getImageByTypeAndRef = async (req, res) => {
  try {
    const { type, refId } = req.params;
    const imageDoc = await ImageBase64.findOne({ type, refId });
    if (!imageDoc) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    res.json({ success: true, base64: imageDoc.base64, type: imageDoc.type, refId: imageDoc.refId, originalName: imageDoc.originalName });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Get image failed', error: err.message });
  }
};
// controllers/uploadImageSeriesController.js
const ImageBase64 = require('../models/ImageBase64');

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const type = req.body.type;
    const refId = req.body.id || null;
    if (!type) {
      return res.status(400).json({ success: false, message: 'Missing type' });
    }
    // Đọc file và chuyển sang base64
    const base64 = req.file.buffer
      ? req.file.buffer.toString('base64')
      : Buffer.from(req.file.path ? require('fs').readFileSync(req.file.path) : '').toString('base64');

    // Lưu vào DB
    const imageDoc = new ImageBase64({
      type,
      refId,
      base64,
      originalName: req.file.originalname
    });
    await imageDoc.save();
    res.json({ success: true, image: {
      _id: imageDoc._id,
      type: imageDoc.type,
      refId: imageDoc.refId,
      originalName: imageDoc.originalName,
      base64: imageDoc.base64
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
  }
};

// GET /get_image_series/:id (lấy theo id ảnh trong DB)
exports.getImageById = async (req, res) => {
  try {
    const imageDoc = await ImageBase64.findById(req.params.id);
    if (!imageDoc) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    // Trả về base64
    res.json({ success: true, base64: imageDoc.base64, type: imageDoc.type, refId: imageDoc.refId, originalName: imageDoc.originalName });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Get image failed', error: err.message });
  }
};

