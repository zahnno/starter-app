const mongoose = require('mongoose');

const ImageGenerationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  negative_prompt: {
    type: String,
    required: false
  },
  width: {
    type: Number,
    default: 512
  },
  height: {
    type: Number,
    default: 512
  },
  steps: {
    type: Number,
    default: 30
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  imageUrl: {
    type: String,
    required: false
  },
  error: {
    type: String,
    required: false
  },
  estimatedTimeSeconds: {
    type: Number,
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ImageGeneration', ImageGenerationSchema); 