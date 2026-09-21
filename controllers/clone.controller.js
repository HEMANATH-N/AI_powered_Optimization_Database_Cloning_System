const CloneJob = require('../models/CloneJob');
const File = require('../models/File');
const { processChunks, getChunkCount } = require('../services/clone.service');

exports.startClone = async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ success: false, message: 'fileId is required' });

    const file = await File.findOne({ _id: fileId, userId: req.user._id, isDeleted: false });
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });

    // Check for existing running job
    const existingJob = await CloneJob.findOne({ fileId, userId: req.user._id, status: { $in: ['running', 'pending'] } });
    if (existingJob) {
      return res.status(400).json({ success: false, message: 'Clone job already running', job: existingJob });
    }

    const totalChunks = getChunkCount(file.size);
    const job = await CloneJob.create({
      fileId,
      userId: req.user._id,
      totalChunks,
      status: 'running'
    });

    processChunks(job._id);

    res.status(201).json({ success: true, message: 'Clone started', job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resumeClone = async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ success: false, message: 'jobId is required' });

    const job = await CloneJob.findOne({ _id: jobId, userId: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: 'Clone job not found' });
    if (job.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Clone job already completed' });
    }

    await CloneJob.findByIdAndUpdate(jobId, { status: 'running' });
    processChunks(jobId);

    res.json({ success: true, message: 'Clone resumed', job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.pauseClone = async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = await CloneJob.findOneAndUpdate(
      { _id: jobId, userId: req.user._id },
      { status: 'paused' },
      { new: true }
    );
    if (!job) return res.status(404).json({ success: false, message: 'Clone job not found' });
    res.json({ success: true, message: 'Clone paused', job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCloneStatus = async (req, res) => {
  try {
    const job = await CloneJob.findOne({ _id: req.params.id, userId: req.user._id }).populate('fileId', 'originalName size');
    if (!job) return res.status(404).json({ success: false, message: 'Clone job not found' });
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCloneJobs = async (req, res) => {
  try {
    const jobs = await CloneJob.find({ userId: req.user._id })
      .populate('fileId', 'originalName size fileType')
      .sort({ startedAt: -1 });
    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCloneJob = async (req, res) => {
  try {
    const job = await CloneJob.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: 'Clone job not found' });

    // Also move the associated file to recycle bin so it doesn't reappear
    if (job.fileId) {
      await File.findOneAndUpdate(
        { _id: job.fileId, userId: req.user._id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() }
      );
    }

    res.json({ success: true, message: 'Clone job and file moved to recycle bin' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkDeleteCloneJobs = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array is required' });
    }

    // Get all job docs first to collect their fileIds
    const jobs = await CloneJob.find({ _id: { $in: ids }, userId: req.user._id });
    const fileIds = jobs.map(j => j.fileId).filter(Boolean);

    // Delete the clone jobs
    const result = await CloneJob.deleteMany({ _id: { $in: ids }, userId: req.user._id });

    // Move associated files to recycle bin
    if (fileIds.length > 0) {
      await File.updateMany(
        { _id: { $in: fileIds }, userId: req.user._id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() }
      );
    }

    res.json({ success: true, message: `${result.deletedCount} job(s) and their files moved to recycle bin` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


