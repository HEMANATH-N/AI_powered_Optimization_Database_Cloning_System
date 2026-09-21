const DeviceSession = require('../models/DeviceSession');

exports.getDevices = async (req, res) => {
  try {
    const sessions = await DeviceSession.find({ userId: req.user._id }).sort({ lastSeen: -1 });
    // Mark devices inactive if not seen in last 30 minutes
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const devices = sessions.map(s => ({
      ...s.toObject(),
      isActive: s.lastSeen > thirtyMinsAgo
    }));
    res.json({ success: true, devices, total: devices.length, active: devices.filter(d => d.isActive).length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeDevice = async (req, res) => {
  try {
    await DeviceSession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Device removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
