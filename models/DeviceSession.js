const mongoose = require('mongoose');

const deviceSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceName: { type: String, default: 'Unknown Device' },
  browser: { type: String, default: 'Unknown' },
  os: { type: String, default: 'Unknown' },
  ip: { type: String, default: '0.0.0.0' },
  userAgent: { type: String },
  isActive: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DeviceSession', deviceSessionSchema);
