const CloneJob = require('../models/CloneJob');

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

const processChunks = async (jobId) => {
  const job = await CloneJob.findById(jobId);
  if (!job || job.status !== 'running') return;

  const interval = setInterval(async () => {
    const currentJob = await CloneJob.findById(jobId);
    if (!currentJob || currentJob.status === 'paused' || currentJob.status === 'completed') {
      clearInterval(interval);
      return;
    }

    if (currentJob.completedChunks < currentJob.totalChunks) {
      const chunksToProcess = Math.min(
        Math.ceil(Math.random() * 3) + 1,
        currentJob.totalChunks - currentJob.completedChunks
      );
      const newCompleted = currentJob.completedChunks + chunksToProcess;
      const progress = Math.round((newCompleted / currentJob.totalChunks) * 100);
      const speed = Math.floor(2 + Math.random() * 8); // MB/s
      const remaining = currentJob.totalChunks - newCompleted;
      const eta = remaining > 0 ? Math.round(remaining / (chunksToProcess || 1)) : 0;

      const update = {
        completedChunks: newCompleted,
        progress,
        speed,
        eta,
        $push: { progressHistory: { progress, timestamp: new Date() } }
      };

      if (newCompleted >= currentJob.totalChunks) {
        update.status = 'completed';
        update.completedAt = new Date();
        clearInterval(interval);
      }

      await CloneJob.findByIdAndUpdate(jobId, update);
    } else {
      await CloneJob.findByIdAndUpdate(jobId, { status: 'completed', completedAt: new Date() });
      clearInterval(interval);
    }
  }, 800);

  return interval;
};

const getChunkCount = (fileSize) => {
  return Math.max(10, Math.ceil(fileSize / CHUNK_SIZE));
};

module.exports = { processChunks, getChunkCount };
