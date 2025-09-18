const mongoose = require("mongoose");

const EpisodeSchema = new mongoose.Schema({
  seriesId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Series',
    required: true 
  },
  episodeNumber: { 
    type: Number, 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  summary: { 
    type: String, 
    required: false 
  },
  duration: { 
    type: Number, // thời gian đọc (phút)
    required: false 
  },
  publishedAt: { 
    type: Date, 
    default: Date.now 
  },
  isPublished: { 
    type: Boolean, 
    default: false 
  },
  readCount: { 
    type: Number, 
    default: 0 
  },
  likeCount: { 
    type: Number, 
    default: 0 
  },
  coverImage: { 
    type: String, 
    required: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index để tìm kiếm nhanh
EpisodeSchema.index({ seriesId: 1, episodeNumber: 1 });

// Middleware để cập nhật updatedAt
EpisodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Episode", EpisodeSchema);