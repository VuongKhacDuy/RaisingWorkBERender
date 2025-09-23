const Series = require("../../models/SeriesStories/SeriesModel");
const Episode = require("../../models/SeriesStories/EpisodeModel");
const ImageBase64 = require("../../models/ImageBase64");

module.exports = {
  // Tạo series mới
  createSeries: async (req, res) => {
    try {
      const newSeries = new Series(req.body);
      await newSeries.save();
      res.status(201).json({
        success: true,
        message: "Series created successfully",
        data: newSeries
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create series",
        error: error.message
      });
    }
  },

  // Lấy tất cả series
  getAllSeries: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const series = await Series.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email');

      const total = await Series.countDocuments();

      res.status(200).json({
        success: true,
        data: series,
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
        message: "Failed to get series",
        error: error.message
      });
    }
  },

  // Lấy series theo ID với danh sách episodes
  getSeriesById: async (req, res) => {
    try {
      const series = await Series.findById(req.params.id)
        .populate('createdBy', 'name email');
      
      if (!series) {
        return res.status(404).json({
          success: false,
          message: "Series not found"
        });
      }

      // Lấy danh sách episodes của series này
      const episodes = await Episode.find({ seriesId: req.params.id })
        .sort({ episodeNumber: 1 })
        .select('episodeNumber title summary publishedAt isPublished readCount likeCount');

      res.status(200).json({
        success: true,
        data: {
          series,
          episodes
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get series",
        error: error.message
      });
    }
  },

  // Cập nhật series
  updateSeries: async (req, res) => {
    try {
      const updatedSeries = await Series.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!updatedSeries) {
        return res.status(404).json({
          success: false,
          message: "Series not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Series updated successfully",
        data: updatedSeries
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update series",
        error: error.message
      });
    }
  },

  // Xóa series
  deleteSeries: async (req, res) => {
    try {
      const series = await Series.findById(req.params.id);
      
      if (!series) {
        return res.status(404).json({
          success: false,
          message: "Series not found"
        });
      }

      // 1. Lấy tất cả episodes thuộc series này
      const episodes = await Episode.find({ seriesId: req.params.id });
      
      // 2. Collect tất cả imageIds từ content blocks của episodes
      const imageIdsToDelete = [];
      episodes.forEach(episode => {
        if (episode.contentBlocks && Array.isArray(episode.contentBlocks)) {
          episode.contentBlocks.forEach(block => {
            if (block.type === 'image' && block.data && block.data.imageId) {
              imageIdsToDelete.push(block.data.imageId);
            }
          });
        }
      });

      // 3. Xóa ảnh của series (theo refId)
      const deletedSeriesImages = await ImageBase64.deleteMany({ 
        type: 'series', 
        refId: req.params.id 
      });
      console.log(`Deleted ${deletedSeriesImages.deletedCount} series images`);

      // 4. Xóa ảnh của episodes (theo refId)
      const episodeIds = episodes.map(ep => ep._id);
      
      // Xóa ảnh episode theo refId = episodeId
      const deletedEpisodeImagesByEpisodeId = await ImageBase64.deleteMany({ 
        type: 'episode', 
        refId: { $in: episodeIds }
      });
      console.log(`Deleted ${deletedEpisodeImagesByEpisodeId.deletedCount} episode images by episodeId`);
      
      // Xóa ảnh episode theo refId = seriesId (trường hợp frontend truyền seriesId làm refId)
      const deletedEpisodeImagesBySeriesId = await ImageBase64.deleteMany({ 
        type: 'episode', 
        refId: req.params.id 
      });
      console.log(`Deleted ${deletedEpisodeImagesBySeriesId.deletedCount} episode images by seriesId`);
      
      // Xóa ảnh content blocks theo refIdEpisode (trường hợp mới)
      const deletedContentImagesByEpisodeId = await ImageBase64.deleteMany({ 
        refIdEpisode: { $in: episodeIds }
      });
      console.log(`Deleted ${deletedContentImagesByEpisodeId.deletedCount} content block images by refIdEpisode`);

      // 5. Xóa ảnh trong content blocks (theo imageId)
      let deletedContentImages = { deletedCount: 0 };
      if (imageIdsToDelete.length > 0) {
        console.log(`Deleting ${imageIdsToDelete.length} content block images:`, imageIdsToDelete);
        deletedContentImages = await ImageBase64.deleteMany({ 
          _id: { $in: imageIdsToDelete } 
        });
        console.log(`Deleted ${deletedContentImages.deletedCount} content block images`);
      }
      
      console.log(`Total episodes found: ${episodes.length}`);
      console.log(`Total imageIds in content blocks: ${imageIdsToDelete.length}`);

      // 6. Xóa tất cả episodes thuộc series này
      await Episode.deleteMany({ seriesId: req.params.id });
      
      // 7. Xóa series
      await Series.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "Series, episodes and all related images deleted successfully",
        deletedCounts: {
          episodes: episodes.length,
          seriesImages: deletedSeriesImages.deletedCount,
          episodeImagesByEpisodeId: deletedEpisodeImagesByEpisodeId.deletedCount,
          episodeImagesBySeriesId: deletedEpisodeImagesBySeriesId.deletedCount,
          contentBlockImages: deletedContentImages.deletedCount,
          contentBlockImagesByEpisodeId: deletedContentImagesByEpisodeId.deletedCount,
          totalImages: deletedSeriesImages.deletedCount + deletedEpisodeImagesByEpisodeId.deletedCount + deletedEpisodeImagesBySeriesId.deletedCount + deletedContentImages.deletedCount + deletedContentImagesByEpisodeId.deletedCount
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete series",
        error: error.message
      });
    }
  },

  // Tìm kiếm series
  searchSeries: async (req, res) => {
    try {
      const { keyword } = req.params;
      const series = await Series.find({
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { author: { $regex: keyword, $options: 'i' } },
          { tags: { $in: [new RegExp(keyword, 'i')] } }
        ]
      }).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: series,
        count: series.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to search series",
        error: error.message
      });
    }
  }
};