const Episode = require("../../models/SeriesStories/EpisodeModel");
const Series = require("../../models/SeriesStories/SeriesModel");

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

      const newEpisode = new Episode(req.body);
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

      // Giảm totalEpisodes của series
      await Series.findByIdAndUpdate(episode.seriesId, {
        $inc: { totalEpisodes: -1 }
      });

      await Episode.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "Episode deleted successfully"
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
  }
};