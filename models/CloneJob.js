const mongoose = require('mongoose');

const cloneJobSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalChunks: { type: Number, required: true },
  completedChunks: { type: Number, default: 0 },
  progress: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'running', 'paused', 'failed', 'completed'],
    default: 'pending'
  },
  speed: { type: Number, default: 0 },
  eta: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  progressHistory: [
    {
      progress: Number,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('CloneJob', cloneJobSchema);
