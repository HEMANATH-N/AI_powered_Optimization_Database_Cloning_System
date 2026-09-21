import React, { useEffect, useState, useCallback } from 'react';
import { recycleBinService } from '../services';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import FilePreviewModal from '../components/FilePreviewModal';
import { formatBytes, formatDate, getFileIcon, getFileTypeColor, truncate } from '../utils/helpers';



/* ── Delete Confirmation Modal ─────────────────────────── */
const DeleteConfirmModal = ({ fileName, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="glass-card p-6 max-w-sm w-full border border-red-500/30 animate-fade-in">
      <div className="text-center mb-5">
        <div className="text-5xl mb-3">⚠️</div>
        <h3 className="text-lg font-bold text-white mb-2">Permanently Delete?</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          <span className="text-white font-medium">{truncate(fileName, 30)}</span> will be permanently removed.
          <br /><span className="text-red-400 text-xs mt-1 block">This cannot be undone.</span>
        </p>
      </div>
      <div className="flex gap-3">
        <button id="cancel-perm-delete-btn" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-300 hover:bg-white/5 transition-all">
          Cancel
        </button>
        <button id="confirm-perm-delete-btn" onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
          Delete Forever
        </button>
      </div>
    </div>
  </div>
);

/* ── Empty Bin Confirm Modal ─────────────────────────────── */
const EmptyBinModal = ({ count, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="glass-card p-6 max-w-sm w-full border border-red-500/30 animate-fade-in">
      <div className="text-center mb-5">
        <div className="text-5xl mb-3">🗑️</div>
        <h3 className="text-lg font-bold text-white mb-2">Empty Recycle Bin?</h3>
        <p className="text-slate-400 text-sm">Permanently delete all <span className="text-white font-medium">{count} file{count !== 1 ? 's' : ''}</span>?</p>
        <p className="text-red-400 text-xs mt-1">This cannot be undone.</p>
      </div>
      <div className="flex gap-3">
        <button id="cancel-empty-bin-btn" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-300 hover:bg-white/5 transition-all">
          Cancel
        </button>
        <button id="confirm-empty-bin-btn" onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
          Delete All
        </button>
      </div>
    </div>
  </div>
);

/* ── Main Component ───────────────────────────────────── */
const RecycleBin = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [viewFile, setViewFile] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name } or null
  const [emptyConfirm, setEmptyConfirm] = useState(false);
  const { addToast } = useToast();

  const fetchFiles = useCallback(async () => {
    try {
      const res = await recycleBinService.getAll();
      setFiles(res.data.files || []);
    } catch { addToast('Failed to load recycle bin', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const setLoadingState = (id, state) =>
    setActionLoading(prev => ({ ...prev, [id]: state }));

  const handleRestore = async (id) => {
    setLoadingState(id, 'restoring');
    try {
      await recycleBinService.restore(id);
      addToast('File restored successfully ✅', 'success');
      fetchFiles();
    } catch { addToast('Failed to restore file', 'error'); }
    finally { setLoadingState(id, null); }
  };

  const handlePermanentDelete = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeleteConfirm(null);
    setLoadingState(id, 'deleting');
    try {
      await recycleBinService.permanentDelete(id);
      addToast('File permanently deleted 🗑️', 'warning');
      setFiles(prev => prev.filter(f => f._id !== id));
    } catch { addToast('Failed to delete file', 'error'); }
    finally { setLoadingState(id, null); }
  };

  const handleDeleteAll = async () => {
    setEmptyConfirm(false);
    for (const file of files) {
      await recycleBinService.permanentDelete(file._id).catch(() => {});
    }
    addToast('Recycle bin emptied 🗑️', 'warning');
    setFiles([]);
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading recycle bin..." />;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* File Preview Modal */}
      {viewFile && <FilePreviewModal file={viewFile} onClose={() => setViewFile(null)} />}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          fileName={deleteConfirm.name}
          onConfirm={handlePermanentDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Empty Bin Confirm */}
      {emptyConfirm && (
        <EmptyBinModal
          count={files.length}
          onConfirm={handleDeleteAll}
          onCancel={() => setEmptyConfirm(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">🗑️ Recycle Bin</h2>
          <p className="text-slate-400 text-sm">{files.length} deleted file{files.length !== 1 ? 's' : ''}</p>
        </div>
        {files.length > 0 && (
          <button
            id="delete-all-btn"
            onClick={() => setEmptyConfirm(true)}
            className="px-4 py-2 rounded-xl text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
          >
            🗑️ Empty Bin
          </button>
        )}
      </div>

      {files.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="text-6xl mb-4 opacity-30">🗑️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Recycle Bin is Empty</h3>
          <p className="text-slate-400 text-sm">Deleted files will appear here. You can restore or permanently delete them.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">File</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Size</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Deleted</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {files.map(file => (
                <tr key={file._id} className="hover:bg-white/2 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl ${getFileTypeColor(file.fileType)}`}>{getFileIcon(file.fileType)}</span>
                      <div>
                        <p className="text-sm font-medium text-white" title={file.originalName}>{truncate(file.originalName, 32)}</p>
                        <span className="text-xs text-slate-500 capitalize px-1.5 py-0.5 rounded bg-white/5">{file.fileType}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="text-sm text-slate-300">{formatBytes(file.size)}</span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-sm text-slate-400">{formatDate(file.deletedAt)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* VIEW */}
                      <button
                        id={`view-btn-${file._id}`}
                        onClick={() => setViewFile(file)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/8 text-slate-300 border border-white/12 hover:bg-white/15 hover:text-white transition-all"
                      >
                        👁️ View
                      </button>
                      {/* RESTORE */}
                      <button
                        id={`restore-btn-${file._id}`}
                        onClick={() => handleRestore(file._id)}
                        disabled={!!actionLoading[file._id]}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                      >
                        {actionLoading[file._id] === 'restoring' ? '...' : '♻️ Restore'}
                      </button>
                      {/* DELETE */}
                      <button
                        id={`perm-delete-btn-${file._id}`}
                        onClick={() => setDeleteConfirm({ id: file._id, name: file.originalName })}
                        disabled={!!actionLoading[file._id]}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30 transition-all disabled:opacity-50"
                      >
                        {actionLoading[file._id] === 'deleting' ? '...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecycleBin;
