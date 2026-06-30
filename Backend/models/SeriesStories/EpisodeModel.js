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
  // Dynamic content blocks
  contentBlocks: [{
    id: { type: String, required: true }, // unique ID cho mỗi block
    type: { 
      type: String, 
      enum: ['text', 'heading', 'image', 'quote', 'divider'],
      required: true 
    },
    order: { type: Number, required: true }, // thứ tự hiển thị
    data: {
      // For text block
      text: { type: String },
      
      // For heading block  
      level: { type: Number, enum: [1, 2, 3] }, // H1, H2, H3
      
      // For image block
      imageId: { type: String }, // ID của ảnh trong ImageBase64
      caption: { type: String },
      
      // For quote block
      quote: { type: String },
      author: { type: String }
      
      // divider block không cần data
    }
  }],
  
  // Backup content cũ (để migration)
  legacyContent: { 
    type: String, 
    required: false 
  },
  videoUrl: { 
    type: String, 
    required: false 
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
  accessLevel: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
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
