const mongoose = require("mongoose");

const SeriesSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  author: { 
    type: String, 
    required: true 
  },
  genre: { 
    type: String, 
    required: false 
  },
  coverImage: { 
    type: String, 
    required: false 
  },
  status: { 
    type: String, 
    enum: ['ongoing', 'completed', 'paused'], 
    default: 'ongoing' 
  },
  totalEpisodes: { 
    type: Number, 
    default: 0 
  },
  rating: { 
    type: Number, 
    min: 0, 
    max: 5, 
    default: 0 
  },
  tags: [{ 
    type: String 
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: false 
  }
});

// Middleware để cập nhật updatedAt khi document được modify
SeriesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Series", SeriesSchema);