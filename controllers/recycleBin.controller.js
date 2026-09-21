const File = require('../models/File');

exports.getRecycleBin = async (req, res) => {
  try {
    const files = await File.find({ userId: req.user._id, isDeleted: true }).sort({ deletedAt: -1 });
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.restoreFile = async (req, res) => {
  try {
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!file) return res.status(404).json({ success: false, message: 'File not found in recycle bin' });
    res.json({ success: true, message: 'File restored', file });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.permanentDelete = async (req, res) => {
  try {
    const file = await File.findOneAndDelete({ _id: req.params.id, userId: req.user._id, isDeleted: true });
    if (!file) return res.status(404).json({ success: false, message: 'File not found in recycle bin' });
    res.json({ success: true, message: 'File permanently deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
