// GET /get_image_by_type_ref/:type/:refId
exports.getImageByTypeAndRef = async (req, res) => {
  try {
    const { type, refId } = req.params;
    const imageDoc = await ImageBase64.findOne({ type, refId });
    if (!imageDoc) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    res.json({ success: true, base64: imageDoc.base64, type: imageDoc.type, refId: imageDoc.refId, refIdEpisode: imageDoc.refIdEpisode, originalName: imageDoc.originalName });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Get image failed', error: err.message });
  }
};
// controllers/uploadImageSeriesController.js
const ImageBase64 = require('../models/ImageBase64');

exports.uploadImage = async (req, res) => {
  try {
    console.log('=== UPLOAD IMAGE DEBUG ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file ? {
      originalname: req.file.originalname,
      size: req.file.size
    } : null);
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const type = req.body.type;
    const refId = req.body.id || req.body.refId || null; // Thử cả 2 field
    const refIdEpisode = req.body.episodeId || null; // ID của episode cho content block
    
    console.log('Parsed - type:', type, 'refId:', refId, 'refIdEpisode:', refIdEpisode);
    
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
      refIdEpisode,
      base64,
      originalName: req.file.originalname
    });
    
    console.log('Saving to DB:', {
      type: imageDoc.type,
      refId: imageDoc.refId,
      refIdEpisode: imageDoc.refIdEpisode,
      originalName: imageDoc.originalName
    });
    
    await imageDoc.save();
    res.json({ success: true, image: {
      _id: imageDoc._id,
      type: imageDoc.type,
      refId: imageDoc.refId,
      refIdEpisode: imageDoc.refIdEpisode,
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
    console.log('Getting image by ID:', req.params.id);
    const imageDoc = await ImageBase64.findById(req.params.id);
    console.log('Found image doc:', imageDoc ? 'exists' : 'not found');
    if (!imageDoc) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    // Trả về base64
    res.json({ success: true, base64: imageDoc.base64, type: imageDoc.type, refId: imageDoc.refId, refIdEpisode: imageDoc.refIdEpisode, originalName: imageDoc.originalName });
  } catch (err) {
    console.error('Error getting image:', err);
    res.status(500).json({ success: false, message: 'Get image failed', error: err.message });
  }
};

// DELETE /delete_image/:id (xóa ảnh theo id)
exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting image by ID:', id);
    
    const deletedImage = await ImageBase64.findByIdAndDelete(id);
    
    if (!deletedImage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Image deleted successfully',
      deletedImage: {
        _id: deletedImage._id,
        type: deletedImage.type,
        refId: deletedImage.refId,
        refIdEpisode: deletedImage.refIdEpisode,
        originalName: deletedImage.originalName
      }
    });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Delete image failed', 
      error: err.message 
    });
  }
};

// ===== IMAGE MANAGEMENT METHODS =====

// Dọn dẹp ảnh mồ côi
exports.cleanupOrphanedImages = async (req, res) => {
  try {
    const { cleanupOrphanedImages } = require('../utils/imageCleanup');
    const result = await cleanupOrphanedImages();
    
    res.json({
      success: true,
      message: `Cleaned up ${result.orphanedCount} orphaned images`,
      data: result
    });
  } catch (err) {
    console.error('Error cleaning up images:', err);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: err.message
    });
  }
};

// Thống kê ảnh
exports.getImageStats = async (req, res) => {
  try {
    const { getImageStats } = require('../utils/imageCleanup');
    const stats = await getImageStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error getting image stats:', err);
    res.status(500).json({
      success: false,
      message: 'Get stats failed',
      error: err.message
    });
  }
};

// Tìm ảnh theo type và refId
exports.findImagesByRef = async (req, res) => {
  try {
    const { type, refId } = req.params;
    const { findImagesByRef } = require('../utils/imageCleanup');
    const images = await findImagesByRef(type, refId);
    
    res.json({
      success: true,
      data: images,
      count: images.length
    });
  } catch (err) {
    console.error('Error finding images:', err);
    res.status(500).json({
      success: false,
      message: 'Find images failed',
      error: err.message
    });
  }
};

// Tìm ảnh theo episodeId (cho content blocks)
exports.findImagesByEpisodeId = async (req, res) => {
  try {
    const { episodeId } = req.params;
    
    // Tìm ảnh có refIdEpisode = episodeId
    const images = await ImageBase64.find({ refIdEpisode: episodeId });
    
    res.json({
      success: true,
      data: images,
      count: images.length,
      message: `Found ${images.length} images for episode ${episodeId}`
    });
  } catch (err) {
    console.error('Error finding images by episode:', err);
    res.status(500).json({
      success: false,
      message: 'Find images by episode failed',
      error: err.message
    });
  }
};

// Cập nhật refIdEpisode cho các ảnh (sau khi episode được tạo)
exports.updateImageRefIdEpisode = async (req, res) => {
  try {
    const { imageIds, episodeId } = req.body;
    
    if (!Array.isArray(imageIds) || !episodeId) {
      return res.status(400).json({
        success: false,
        message: 'imageIds must be an array and episodeId is required'
      });
    }
    
    console.log(`Updating ${imageIds.length} images with refIdEpisode: ${episodeId}`);
    
    // Cập nhật refIdEpisode cho các ảnh
    const result = await ImageBase64.updateMany(
      { _id: { $in: imageIds } },
      { $set: { refIdEpisode: episodeId } }
    );
    
    console.log(`Updated ${result.modifiedCount} images`);
    
    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} images with episode ID`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        episodeId: episodeId,
        imageIds: imageIds
      }
    });
  } catch (err) {
    console.error('Error updating image refIdEpisode:', err);
    res.status(500).json({
      success: false,
      message: 'Update image refIdEpisode failed',
      error: err.message
    });
  }
};

