const File = require('../models/File');
const CloneJob = require('../models/CloneJob');

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const files = await File.find({ userId, isDeleted: false });
    const totalFiles = files.length;
    const totalStorage = files.reduce((sum, f) => sum + f.size, 0);
    const totalOptimizedStorage = files.reduce((sum, f) => sum + (f.optimizedSize || 0), 0);
    const totalSaved = totalStorage - totalOptimizedStorage;
    const avgCompression = files.length > 0
      ? Math.round(files.reduce((sum, f) => sum + (f.compressionPercent || 0), 0) / files.length)
      : 0;

    const cloneJobs = await CloneJob.find({ userId });
    const totalClones = cloneJobs.length;
    const completedClones = cloneJobs.filter(j => j.status === 'completed').length;
    const runningClones = cloneJobs.filter(j => j.status === 'running').length;

    const filesByType = files.reduce((acc, f) => {
      acc[f.fileType] = (acc[f.fileType] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      analytics: {
        totalFiles,
        totalStorage,
        totalOptimizedStorage,
        totalSaved,
        avgCompression,
        totalClones,
        completedClones,
        runningClones,
        filesByType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
