import React, { useEffect, useState, useCallback } from 'react';
import { fileService, cloneService, analyticsService } from '../services';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import FileCard from '../components/FileCard';
import LoadingSpinner from '../components/LoadingSpinner';
import AISuggestionsPanel from '../components/AISuggestionsPanel';
import { formatBytes } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [cloneJobs, setCloneJobs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [optimizingAll, setOptimizingAll] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState(null); // { started, skipped }
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [filesRes, cloneRes, analyticsRes] = await Promise.all([
        fileService.getAll(),
        cloneService.getAll(),
        analyticsService.getAnalytics(),
      ]);
      setFiles(filesRes.data.files || []);
      setCloneJobs(cloneRes.data.jobs || []);
      setAnalytics(analyticsRes.data.analytics || null);
    } catch {
      // silent fail on polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleClone = async (file) => {
    const existingJob = cloneJobs.find(j => j.fileId?._id === file._id || j.fileId === file._id);
    try {
      if (existingJob && existingJob.status === 'paused') {
        await cloneService.resume(existingJob._id);
        addToast('Clone resumed!', 'info');
      } else if (!existingJob || existingJob.status === 'completed' || existingJob.status === 'failed') {
        await cloneService.start(file._id);
        addToast('Clone started! 🔄', 'success');
      }
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Clone failed', 'error');
    }
  };

  const handleDelete = async (fileId) => {
    try {
      await fileService.delete(fileId);
      addToast('File moved to recycle bin 🗑️', 'info');
      fetchData();
    } catch {
      addToast('Failed to delete file', 'error');
    }
  };

  const getCloneJobForFile = (fileId) => {
    return cloneJobs.find(j =>
      (j.fileId?._id === fileId || j.fileId === fileId) &&
      j.status !== 'failed'
    );
  };

  /* ── Optimize All ── */
  const handleOptimizeAll = async () => {
    const completedOrRunning = new Set(
      cloneJobs.filter(j => ['completed', 'running', 'pending'].includes(j.status))
        .map(j => j.fileId?._id || j.fileId)
    );
    const unprotected = files.filter(f => !completedOrRunning.has(f._id));

    if (unprotected.length === 0) {
      addToast('All files are already cloned! ✅', 'success');
      return;
    }

    setOptimizingAll(true);
    setOptimizeResult(null);
    let started = 0;
    let skipped = 0;

    for (const file of unprotected) {
      try {
        await cloneService.start(file._id);
        started++;
      } catch {
        skipped++;
      }
    }

    setOptimizeResult({ started, skipped });
    addToast(`🚀 Optimize All: ${started} clone job(s) started!`, 'success');
    fetchData();
    setOptimizingAll(false);
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />;

  const unprotectedCount = files.filter(f =>
    !cloneJobs.some(j =>
      (j.fileId?._id === f._id || j.fileId === f._id) &&
      ['completed', 'running', 'pending'].includes(j.status)
    )
  ).length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* Welcome banner */}
      <div className="glass-card p-6 bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-cyan-500/10 border-primary-500/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]} 👋</span>
            </h2>
            <p className="text-slate-400 text-sm">Your AI-powered database cloning system is ready.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Optimize All button */}
            {files.length > 0 && (
              <button
                id="optimize-all-btn"
                onClick={handleOptimizeAll}
                disabled={optimizingAll || unprotectedCount === 0}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  unprotectedCount === 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 hover:shadow-amber-500/30 hover:scale-105'
                } disabled:opacity-60`}
              >
                {optimizingAll ? (
                  <><span className="animate-spin">⚙️</span> Optimizing...</>
                ) : unprotectedCount === 0 ? (
                  <><span>✅</span> All Protected</>
                ) : (
                  <><span>⚡</span> Optimize All ({unprotectedCount})</>
                )}
              </button>
            )}
            <button
              id="dashboard-upload-btn"
              onClick={() => navigate('/upload')}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold hidden sm:flex items-center gap-2"
            >
              <span>📤</span> Upload File
            </button>
          </div>
        </div>

        {/* Optimize result flash */}
        {optimizeResult && (
          <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
            <span className="text-xl">🚀</span>
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                Optimize All complete — {optimizeResult.started} job{optimizeResult.started !== 1 ? 's' : ''} started!
              </p>
              {optimizeResult.skipped > 0 && (
                <p className="text-xs text-slate-400">{optimizeResult.skipped} file(s) skipped (already cloning).</p>
              )}
            </div>
            <button onClick={() => setOptimizeResult(null)} className="ml-auto text-slate-500 hover:text-white text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Stats */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="📁" label="Total Files" value={analytics.totalFiles} color="blue" />
          <StatCard icon="💾" label="Total Storage" value={formatBytes(analytics.totalStorage)} color="purple" />
          <StatCard icon="✨" label="Space Saved" value={formatBytes(analytics.totalSaved)} sub={`Avg ${analytics.avgCompression}% compression`} color="green" />
          <StatCard icon="🔄" label="Clone Jobs" value={analytics.totalClones} sub={`${analytics.completedClones} completed`} color="amber" />
        </div>
      )}

      {/* AI Suggestions Panel */}
      <AISuggestionsPanel files={files} jobs={cloneJobs} onRefresh={fetchData} />

      {/* Files */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Your Files</h3>
            <p className="text-xs text-slate-500">{files.length} files uploaded</p>
          </div>
          {files.length > 0 && (
            <button
              id="view-all-btn"
              onClick={() => navigate('/upload')}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Upload More →
            </button>
          )}
        </div>

        {files.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-5xl mb-4">📂</div>
            <h3 className="text-lg font-semibold text-white mb-2">No files yet</h3>
            <p className="text-slate-400 text-sm mb-6">Upload your first file to get started with AI optimization</p>
            <button
              id="start-uploading-btn"
              onClick={() => navigate('/upload')}
              className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold"
            >
              Start Uploading 📤
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map(file => (
              <FileCard
                key={file._id}
                file={file}
                cloneJob={getCloneJobForFile(file._id)}
                onClone={handleClone}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
