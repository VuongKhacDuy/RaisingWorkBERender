const Series = require("../../models/SeriesStories/SeriesModel");
const Episode = require("../../models/SeriesStories/EpisodeModel");

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

      // Xóa tất cả episodes thuộc series này
      await Episode.deleteMany({ seriesId: req.params.id });
      
      // Xóa series
      await Series.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "Series and all episodes deleted successfully"
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