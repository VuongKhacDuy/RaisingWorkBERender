const Episode = require("../../models/SeriesStories/EpisodeModel");
const Series = require("../../models/SeriesStories/SeriesModel");
const ImageBase64 = require("../../models/ImageBase64");
const { 
  migrateLegacyContent, 
  createDefaultContentBlocks,
  validateContentBlock 
} = require("../../utils/contentMigration");

module.exports = {
  // Tạo episode mới
  createEpisode: async (req, res) => {
    try {
      const { seriesId } = req.body;
      
      // Kiểm tra series có tồn tại không
      const series = await Series.findById(seriesId);
      if (!series) {
        return res.status(404).json({
          success: false,
          message: "Series not found"
        });
      }

      const episodeData = { ...req.body };
      
      // Nếu có content cũ (legacy), migrate sang content blocks
      if (episodeData.content && !episodeData.contentBlocks) {
        episodeData.contentBlocks = migrateLegacyContent(episodeData.content);
        episodeData.legacyContent = episodeData.content;
        delete episodeData.content;
      }
      
      // Nếu không có content blocks, tạo default
      if (!episodeData.contentBlocks || episodeData.contentBlocks.length === 0) {
        episodeData.contentBlocks = createDefaultContentBlocks();
      }

      const newEpisode = new Episode(episodeData);
      await newEpisode.save();

      // Cập nhật totalEpisodes của series
      await Series.findByIdAndUpdate(seriesId, {
        $inc: { totalEpisodes: 1 }
      });

      res.status(201).json({
        success: true,
        message: "Episode created successfully",
        data: newEpisode
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create episode",
        error: error.message
      });
    }
  },

  // Lấy tất cả episodes
  getAllEpisodes: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const episodes = await Episode.find()
        .populate('seriesId', 'title author')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Episode.countDocuments();

      res.status(200).json({
        success: true,
        data: episodes,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get episodes",
        error: error.message
      });
    }
  },

  // Lấy tất cả episodes của một series
  getEpisodesBySeries: async (req, res) => {
    try {
      const { seriesId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const episodes = await Episode.find({ seriesId })
        .sort({ episodeNumber: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Episode.countDocuments({ seriesId });

      res.status(200).json({
        success: true,
        data: episodes,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get episodes",
        error: error.message
      });
    }
  },

  // Lấy episode theo ID
  getEpisodeById: async (req, res) => {
    try {
      const episode = await Episode.findById(req.params.id)
        .populate('seriesId', 'title author status');

      if (!episode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found"
        });
      }

      // Tăng read count
      await Episode.findByIdAndUpdate(req.params.id, {
        $inc: { readCount: 1 }
      });

      res.status(200).json({
        success: true,
        data: episode
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get episode",
        error: error.message
      });
    }
  },

  // Cập nhật episode
  updateEpisode: async (req, res) => {
    try {
      const updatedEpisode = await Episode.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!updatedEpisode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Episode updated successfully",
        data: updatedEpisode
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update episode",
        error: error.message
      });
    }
  },

  // Xóa episode
  deleteEpisode: async (req, res) => {
    try {
      const episode = await Episode.findById(req.params.id);
      
      if (!episode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found"
        });
      }

      // 1. Collect tất cả imageIds từ content blocks
      const imageIdsToDelete = [];
      if (episode.contentBlocks && Array.isArray(episode.contentBlocks)) {
        episode.contentBlocks.forEach(block => {
          if (block.type === 'image' && block.data && block.data.imageId) {
            imageIdsToDelete.push(block.data.imageId);
          }
        });
      }

      // 2. Xóa ảnh của episode (theo refId)
      await ImageBase64.deleteMany({ 
        type: 'episode', 
        refId: req.params.id 
      });

      // 3. Xóa ảnh trong content blocks (theo imageId)
      if (imageIdsToDelete.length > 0) {
        await ImageBase64.deleteMany({ 
          _id: { $in: imageIdsToDelete } 
        });
      }

      // 4. Giảm totalEpisodes của series
      await Series.findByIdAndUpdate(episode.seriesId, {
        $inc: { totalEpisodes: -1 }
      });

      // 5. Xóa episode
      await Episode.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "Episode and related images deleted successfully",
        deletedImageIds: imageIdsToDelete.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete episode",
        error: error.message
      });
    }
  },

  // Toggle publish status
  togglePublishEpisode: async (req, res) => {
    try {
      const episode = await Episode.findById(req.params.id);
      
      if (!episode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found"
        });
      }

      episode.isPublished = !episode.isPublished;
      if (episode.isPublished) {
        episode.publishedAt = new Date();
      }

      await episode.save();

      res.status(200).json({
        success: true,
        message: `Episode ${episode.isPublished ? 'published' : 'unpublished'} successfully`,
        data: episode
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to toggle publish status",
        error: error.message
      });
    }
  },

  // Like episode
  likeEpisode: async (req, res) => {
    try {
      const episode = await Episode.findByIdAndUpdate(
        req.params.id,
        { $inc: { likeCount: 1 } },
        { new: true }
      );

      if (!episode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Episode liked successfully",
        data: { likeCount: episode.likeCount }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to like episode",
        error: error.message
      });
    }
  },

  // ===== DYNAMIC CONTENT BUILDER METHODS =====

  // Cập nhật content blocks
  updateContentBlocks: async (req, res) => {
    try {
      const { id } = req.params;
      const { contentBlocks } = req.body;

      // Validate contentBlocks
      if (!Array.isArray(contentBlocks)) {
        return res.status(400).json({
          success: false,
          message: "contentBlocks must be an array"
        });
      }

      // Validate mỗi block
      for (let i = 0; i < contentBlocks.length; i++) {
        const block = contentBlocks[i];
        if (!block.id || !block.type || block.order === undefined) {
          return res.status(400).json({
            success: false,
            message: `Block at index ${i} missing required fields (id, type, order)`
          });
        }
        
        // Validate block type
        const validTypes = ['text', 'heading', 'image', 'quote', 'divider'];
        if (!validTypes.includes(block.type)) {
          return res.status(400).json({
            success: false,
            message: `Invalid block type: ${block.type}`
          });
        }
      }

      // Sắp xếp blocks theo order
      contentBlocks.sort((a, b) => a.order - b.order);

      const updatedEpisode = await Episode.findByIdAndUpdate(
        id,
        { contentBlocks },
        { new: true, runValidators: true }
      );

      if (!updatedEpisode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Content blocks updated successfully",
        data: updatedEpisode
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update content blocks",
        error: error.message
      });
    }
  },

  // Thêm block mới
  addContentBlock: async (req, res) => {
    try {
      const { id } = req.params;
      const { block } = req.body;

      // Validate block
      if (!block.id || !block.type || block.order === undefined) {
        return res.status(400).json({
          success: false,
          message: "Block missing required fields (id, type, order)"
        });
      }

      const episode = await Episode.findById(id);
      if (!episode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found"
        });
      }

      // Thêm block mới
      episode.contentBlocks.push(block);
      
      // Sắp xếp lại theo order
      episode.contentBlocks.sort((a, b) => a.order - b.order);
      
      await episode.save();

      res.status(200).json({
        success: true,
        message: "Content block added successfully",
        data: episode
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to add content block",
        error: error.message
      });
    }
  },

  // Xóa block
  deleteContentBlock: async (req, res) => {
    try {
      const { id, blockId } = req.params;

      const episode = await Episode.findById(id);
      if (!episode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found"
        });
      }

      // Tìm và xóa block
      const blockIndex = episode.contentBlocks.findIndex(block => block.id === blockId);
      if (blockIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Content block not found"
        });
      }

      // Không cho phép xóa nếu chỉ còn 1 block
      if (episode.contentBlocks.length <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete the last content block"
        });
      }

      episode.contentBlocks.splice(blockIndex, 1);
      await episode.save();

      res.status(200).json({
        success: true,
        message: "Content block deleted successfully",
        data: episode
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete content block",
        error: error.message
      });
    }
  },

  // Di chuyển block (thay đổi order)
  reorderContentBlocks: async (req, res) => {
    try {
      const { id } = req.params;
      const { blockOrders } = req.body; // Array of {blockId, newOrder}

      if (!Array.isArray(blockOrders)) {
        return res.status(400).json({
          success: false,
          message: "blockOrders must be an array"
        });
      }

      const episode = await Episode.findById(id);
      if (!episode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found"
        });
      }

      // Cập nhật order cho các blocks
      blockOrders.forEach(({ blockId, newOrder }) => {
        const block = episode.contentBlocks.find(b => b.id === blockId);
        if (block) {
          block.order = newOrder;
        }
      });

      // Sắp xếp lại
      episode.contentBlocks.sort((a, b) => a.order - b.order);
      
      await episode.save();

      res.status(200).json({
        success: true,
        message: "Content blocks reordered successfully",
        data: episode
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to reorder content blocks",
        error: error.message
      });
    }
  },

  // Migration: Convert legacy content to content blocks
  migrateLegacyContentToBlocks: async (req, res) => {
    try {
      const { id } = req.params;
      
      const episode = await Episode.findById(id);
      if (!episode) {
        return res.status(404).json({
          success: false,
          message: "Episode not found"
        });
      }

      // Kiểm tra xem đã có content blocks chưa
      if (episode.contentBlocks && episode.contentBlocks.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Episode already has content blocks"
        });
      }

      // Migrate từ legacy content hoặc tạo default
      const legacyContent = episode.legacyContent || '';
      episode.contentBlocks = migrateLegacyContent(legacyContent);
      
      await episode.save();

      res.status(200).json({
        success: true,
        message: "Legacy content migrated successfully",
        data: episode
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to migrate legacy content",
        error: error.message
      });
    }
  }
};