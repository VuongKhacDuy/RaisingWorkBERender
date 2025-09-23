// models/ImageBase64.js
const mongoose = require('mongoose');

const ImageBase64Schema = new mongoose.Schema({
  type: { type: String, required: true }, // 'series' hoặc 'episode'
  refId: { type: mongoose.Schema.Types.ObjectId, required: false }, // id của series hoặc episode, có thể null
  refIdEpisode: { type: mongoose.Schema.Types.ObjectId, required: false }, // id của episode cho content block images
  base64: { type: String, required: true },
  originalName: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ImageBase64', ImageBase64Schema);