import React, { useEffect, useState, useCallback, useRef } from 'react';
import { cloneService, fileService } from '../services';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import ProgressBar from '../components/ProgressBar';
import LoadingSpinner from '../components/LoadingSpinner';
import FilePreviewModal from '../components/FilePreviewModal';
import { formatBytes, formatDate, getFileIcon, getFileTypeColor, truncate } from '../utils/helpers';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const API_URL = 'http://localhost:5000/api';

const statusColor = {
  pending: 'bg-slate-500/20 text-slate-400 border-slate-500/20',
  running: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
  paused: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/20 text-red-400 border-red-500/20',
};
const statusIcon = { pending: '⏳', running: '🔄', paused: '⏸️', completed: '✅', failed: '❌' };



/* ── Main Component ───────────────────────────────────── */
const CloneJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingIds, setDeletingIds] = useState(null);
  const [viewFile, setViewFile] = useState(null);   // { file, jobStatus }
  const { addToast } = useToast();
  const { addBookmark, removeBookmark, isBookmarked } = useTheme();

  const isJobBookmarked = (jobId) => isBookmarked(`job:${jobId}`);

  const toggleJobBookmark = (e, job) => {
    e.stopPropagation();
    const key = `job:${job._id}`;
    const fileName = truncate(job.fileId?.originalName || 'File', 28);
    const fileIcon = getFileIcon(job.fileId?.fileType);
    if (isBookmarked(key)) {
      removeBookmark(key);
      addToast('File bookmark removed', 'info');
    } else {
      addBookmark({ to: key, icon: fileIcon, label: fileName, type: 'file', jobId: job._id });
      addToast(`"${fileName}" bookmarked ★`, 'success');
    }
  };

  const selectedJobRef = useRef(null);
  const intervalRef = useRef(null);
  useEffect(() => { selectedJobRef.current = selectedJob; }, [selectedJob]);

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, filesRes] = await Promise.all([cloneService.getAll(), fileService.getAll()]);
      const updatedJobs = jobsRes.data.jobs || [];
      setJobs(updatedJobs);
      setFiles(filesRes.data.files || []);
      // Update selected job without stale closure
      const cur = selectedJobRef.current;
      if (cur) {
        const updated = updatedJobs.find(j => j._id === cur._id);
        if (updated) setSelectedJob(updated);
      }
    } catch { }
    finally { setLoading(false); }
  }, []);

  // Smart polling: fast when jobs are running, slow when idle
  useEffect(() => {
    fetchData();
    const tick = () => {
      fetchData();
      const hasActive = jobs.some(j => j.status === 'running');
      intervalRef.current = setTimeout(tick, hasActive ? 800 : 3000);
    };
    intervalRef.current = setTimeout(tick, 1000);
    return () => clearTimeout(intervalRef.current);
  }, [fetchData]); // eslint-disable-line

  const handleStart = async (fileId) => {
    try {
      await cloneService.start(fileId);
      addToast('Clone job started! 🔄', 'success');
      fetchData();
    } catch (err) { addToast(err.response?.data?.message || 'Failed to start clone', 'error'); }
  };

  const handleResume = async (jobId) => {
    try { await cloneService.resume(jobId); addToast('Clone resumed!', 'info'); }
    catch (err) { addToast(err.response?.data?.message || 'Failed to resume', 'error'); }
  };

  const handlePause = async (jobId) => {
    try { await cloneService.pause(jobId); addToast('Clone paused ⏸️', 'warning'); }
    catch (err) { addToast(err.response?.data?.message || 'Failed to pause', 'error'); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === jobs.length ? new Set() : new Set(jobs.map(j => j._id)));
  };

  const confirmDelete = (singleId = null) => { setDeletingIds(singleId); setShowDeleteConfirm(true); };

  const executeDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      if (deletingIds) {
        await cloneService.deleteJob(deletingIds);
        addToast('Job deleted — file moved to Recycle Bin ♻️', 'success');
        setSelectedIds(prev => { const n = new Set(prev); n.delete(deletingIds); return n; });
      } else {
        const ids = [...selectedIds];
        await cloneService.bulkDelete(ids);
        addToast(`${ids.length} job(s) deleted — files moved to Recycle Bin ♻️`, 'success');
        setSelectedIds(new Set());
        setSelectMode(false);
      }
      fetchData();
    } catch (err) { addToast(err.response?.data?.message || 'Delete failed', 'error'); }
    setDeletingIds(null);
  };

  const handleDownloadFile = (fileObj) => {
    const token = localStorage.getItem('token');
    const a = document.createElement('a');
    a.href = `${API_URL}/files/${fileObj._id}/download?token=${token}`;
    a.download = fileObj.originalName;
    a.click();
  };

  const getChartData = (job) => {
    if (!job?.progressHistory?.length) return [];
    return job.progressHistory.slice(-20).map((p, i) => ({ time: i, progress: p.progress }));
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading clone jobs..." />;

  const filesWithoutJobs = files.filter(f =>
    !jobs.some(j => (j.fileId?._id === f._id || j.fileId === f._id) && j.status !== 'failed')
  );
  const allSelected = jobs.length > 0 && selectedIds.size === jobs.length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* File Preview Modal */}
      {viewFile && (
        <FilePreviewModal
          file={viewFile.file}
          jobStatus={viewFile.jobStatus}
          onClose={() => setViewFile(null)}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-sm w-full border border-red-500/30 animate-fade-in">
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🗑️</div>
              <h3 className="text-lg font-bold text-white mb-1">Confirm Delete</h3>
              <p className="text-slate-400 text-sm">
                {deletingIds ? 'Delete this clone job? This cannot be undone.' : `Delete ${selectedIds.size} selected job(s)? This cannot be undone.`}
              </p>
            </div>
            <div className="flex gap-3">
              <button id="cancel-delete-btn" onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
              <button id="confirm-delete-btn" onClick={executeDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Available Files — Start Cloning */}
      {filesWithoutJobs.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">📂 Available Files — Start Cloning</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filesWithoutJobs.map(file => (
              <div key={file._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:border-primary-500/30 transition-all">
                <span className={`text-2xl ${getFileTypeColor(file.fileType)}`}>{getFileIcon(file.fileType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate" title={file.originalName}>{truncate(file.originalName, 18)}</p>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                </div>
                {/* View + Clone buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id={`view-file-${file._id}`}
                    onClick={() => setViewFile({ file, jobStatus: null })}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/8 text-slate-300 border border-white/10 hover:bg-white/15 hover:text-white transition-all"
                  >
                    👁️ View
                  </button>
                  <button
                    id={`start-clone-${file._id}`}
                    onClick={() => handleStart(file._id)}
                    className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Clone
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clone Jobs List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Clone Jobs ({jobs.length})</h3>
          {jobs.length > 0 && (
            <div className="flex items-center gap-2">
              {selectMode ? (
                <>
                  <button id="select-all-btn" onClick={toggleSelectAll}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${allSelected ? 'bg-primary-500/20 text-primary-300 border-primary-500/30' : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}>
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${allSelected ? 'bg-primary-500 border-primary-500' : 'border-slate-500'}`}>{allSelected && '✓'}</span>
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedIds.size > 0 && (
                    <button id="delete-selected-btn" onClick={() => confirmDelete(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
                      🗑️ Delete ({selectedIds.size})
                    </button>
                  )}
                  <button id="cancel-select-btn" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all">
                    Cancel
                  </button>
                </>
              ) : (
                <button id="enter-select-mode-btn" onClick={() => setSelectMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all">
                  ☑️ Select &amp; Delete
                </button>
              )}
            </div>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-5xl mb-4">🔄</div>
            <h3 className="text-lg font-semibold text-white mb-2">No clone jobs yet</h3>
            <p className="text-slate-400 text-sm">Upload a file and start cloning to see progress here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => {
              const file = job.fileId;
              const isRunning = job.status === 'running';
              const isPaused = job.status === 'paused';
              const isPending = job.status === 'pending';
              const isCompleted = job.status === 'completed';
              const isSelected = selectedJob?._id === job._id;
              const isChecked = selectedIds.has(job._id);

              return (
                <div
                  key={job._id}
                  className={`glass-card p-5 transition-all duration-200 ${isChecked ? 'border-primary-500/50 bg-primary-500/5' : isSelected ? 'border-primary-500/40' : ''}`}
                  onClick={() => { if (selectMode) toggleSelect(job._id); else setSelectedJob(isSelected ? null : job); }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    {/* Left: checkbox + icon + name */}
                    <div className="flex items-center gap-3">
                      {selectMode && (
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold transition-all shrink-0 ${isChecked ? 'bg-primary-500 border-primary-500 text-white' : 'border-slate-500 hover:border-primary-400'}`}
                          onClick={e => { e.stopPropagation(); toggleSelect(job._id); }}
                        >{isChecked && '✓'}</div>
                      )}
                      <span className={`text-2xl ${getFileTypeColor(file?.fileType)}`}>{getFileIcon(file?.fileType)}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{truncate(file?.originalName || 'Unknown', 28)}</p>
                        <p className="text-xs text-slate-500">{formatBytes(file?.size || 0)} · {formatDate(job.startedAt)}</p>
                      </div>
                    </div>

                    {/* Right: status badge + action buttons */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className={`text-xs px-3 py-1 rounded-full border font-medium ${statusColor[job.status]}`}>
                        {statusIcon[job.status]} {job.status}
                      </span>

                      {isRunning && (
                        <button id={`pause-btn-${job._id}`}
                          onClick={e => { e.stopPropagation(); handlePause(job._id); }}
                          className="px-3 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:bg-amber-500/30 transition-all">
                          ⏸️ Pause
                        </button>
                      )}
                      {isPaused && (
                        <button id={`resume-btn-${job._id}`}
                          onClick={e => { e.stopPropagation(); handleResume(job._id); }}
                          className="px-3 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:bg-blue-500/30 transition-all">
                          ▶️ Resume
                        </button>
                      )}

                      {/* VIEW button — shown for pending, running, paused, and completed */}
                      {!selectMode && file && (
                        <button
                          id={`view-job-${job._id}`}
                          onClick={e => { e.stopPropagation(); setViewFile({ file, jobStatus: job.status }); }}
                          className="px-2.5 py-1 rounded-lg text-xs bg-white/8 text-slate-300 border border-white/12 hover:bg-white/15 hover:text-white transition-all"
                        >
                          👁️ View
                        </button>
                      )}

                      {/* DOWNLOAD button — only for completed jobs */}
                      {!selectMode && isCompleted && file && (
                        <button
                          id={`download-job-${job._id}`}
                          onClick={e => { e.stopPropagation(); handleDownloadFile(file); }}
                          className="px-2.5 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all"
                        >
                          ⬇️ Download
                        </button>
                      )}

                      {/* Bookmark + Delete (outside select mode) */}
                      {!selectMode && (
                        <>
                          <button
                            id={`bookmark-job-${job._id}`}
                            onClick={e => toggleJobBookmark(e, job)}
                            title={isJobBookmarked(job._id) ? 'Remove file bookmark' : 'Bookmark this file'}
                            className={`px-2 py-1 rounded-lg text-sm border transition-all ${isJobBookmarked(job._id) ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30' : 'bg-white/5 text-slate-500 border-white/10 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20'}`}>
                            {isJobBookmarked(job._id) ? '★' : '☆'}
                          </button>
                          <button
                            id={`delete-job-${job._id}`}
                            onClick={e => { e.stopPropagation(); confirmDelete(job._id); }}
                            className="px-2 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-all"
                            title="Delete this job">
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <ProgressBar
                    value={job.progress}
                    color={isCompleted ? 'green' : isPaused ? 'amber' : 'gradient'}
                    animated={isRunning}
                    height="h-3"
                  />

                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="text-center p-2 rounded-lg bg-white/3">
                      <p className="text-xs text-slate-500">Progress</p>
                      <p className="text-sm font-bold text-white">{job.progress}%</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/3">
                      <p className="text-xs text-slate-500">Chunks</p>
                      <p className="text-sm font-bold text-white">{job.completedChunks}/{job.totalChunks}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/3">
                      <p className="text-xs text-slate-500">Speed</p>
                      <p className="text-sm font-bold text-blue-400">{job.speed || 0} MB/s</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/3">
                      <p className="text-xs text-slate-500">ETA</p>
                      <p className="text-sm font-bold text-amber-400">{job.eta ? `${job.eta}s` : isCompleted ? 'Done' : '—'}</p>
                    </div>
                  </div>

                  {/* Progress chart when expanded */}
                  {isSelected && !selectMode && getChartData(job).length > 1 && (
                    <div className="mt-4 p-4 rounded-xl bg-white/3 border border-white/5">
                      <p className="text-xs font-semibold text-slate-400 mb-3">Progress Over Time</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={getChartData(job)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="time" hide />
                          <YAxis domain={[0, 100]} hide />
                          <Tooltip
                            contentStyle={{ background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                            labelStyle={{ color: '#94a3b8' }}
                            itemStyle={{ color: '#5c7cfa' }}
                            formatter={v => [`${v}%`, 'Progress']}
                          />
                          <Line type="monotone" dataKey="progress" stroke="#5c7cfa" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CloneJobs;
