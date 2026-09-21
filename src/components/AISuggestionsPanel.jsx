import React, { useMemo, useState } from 'react';
import { formatBytes, getFileIcon, getFileTypeColor, truncate } from '../utils/helpers';
import { cloneService } from '../services';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

/* ── AI suggestion rules engine ───────────────────────── */
function generateSuggestions(files, jobs) {
  const suggestions = [];
  const completedJobs = new Set(
    jobs.filter(j => j.status === 'completed').map(j => j.fileId?._id || j.fileId)
  );
  const runningJobs = new Set(
    jobs.filter(j => j.status === 'running').map(j => j.fileId?._id || j.fileId)
  );

  files.forEach(file => {
    const ext = (file.originalName || '').split('.').pop().toLowerCase();
    const sizeMB = file.size / (1024 * 1024);
    const isCloned = completedJobs.has(file._id);
    const isRunning = runningJobs.has(file._id);

    // 1. Uncloned large files
    if (!isCloned && !isRunning && sizeMB > 5) {
      suggestions.push({
        id: `clone-large-${file._id}`,
        type: 'clone',
        priority: 'high',
        icon: '🔄',
        title: `Clone "${truncate(file.originalName, 22)}"`,
        detail: `${formatBytes(file.size)} file is unprotected — cloning creates a resumable backup.`,
        saving: null,
        action: 'clone',
        fileId: file._id,
        fileName: file.originalName,
        badge: 'Unprotected',
        badgeColor: 'bg-red-500/20 text-red-400',
      });
    }

    // 2. Uncloned small files
    if (!isCloned && !isRunning && sizeMB <= 5 && sizeMB > 0.1) {
      suggestions.push({
        id: `clone-small-${file._id}`,
        type: 'clone',
        priority: 'medium',
        icon: '🔄',
        title: `Backup "${truncate(file.originalName, 22)}"`,
        detail: `Small file not yet cloned. Quick clone will take seconds.`,
        saving: null,
        action: 'clone',
        fileId: file._id,
        fileName: file.originalName,
        badge: 'Not cloned',
        badgeColor: 'bg-amber-500/20 text-amber-400',
      });
    }

    // 3. Large PNG → WebP suggestion
    if (['png', 'bmp', 'tiff'].includes(ext) && sizeMB > 0.5) {
      const est = Math.round(sizeMB * 0.65 * 10) / 10;
      suggestions.push({
        id: `webp-${file._id}`,
        type: 'optimize',
        priority: 'high',
        icon: '✨',
        title: `Convert "${truncate(file.originalName, 20)}" to WebP`,
        detail: `PNG/BMP files convert to WebP with ~35% size reduction. Estimated: ${formatBytes(file.size * 0.65)} saved.`,
        saving: formatBytes(file.size * 0.35),
        action: 'navigate',
        target: '/upload',
        badge: '~35% smaller',
        badgeColor: 'bg-emerald-500/20 text-emerald-400',
      });
    }

    // 4. Large video files
    if (file.fileType === 'video' && sizeMB > 20) {
      suggestions.push({
        id: `video-${file._id}`,
        type: 'optimize',
        priority: 'medium',
        icon: '🎬',
        title: `Large video detected`,
        detail: `"${truncate(file.originalName, 20)}" is ${formatBytes(file.size)}. Consider cloning it for safe storage.`,
        saving: null,
        action: 'clone',
        fileId: file._id,
        fileName: file.originalName,
        badge: 'Storage heavy',
        badgeColor: 'bg-purple-500/20 text-purple-400',
      });
    }

    // 5. High compression achieved — celebrate
    if (file.compressionPercent >= 30) {
      suggestions.push({
        id: `celebrate-${file._id}`,
        type: 'info',
        priority: 'low',
        icon: '🏆',
        title: `Great compression on "${truncate(file.originalName, 20)}"`,
        detail: `AI saved ${file.compressionPercent}% (${formatBytes(file.size - (file.optimizedSize || file.size))}) on this file. ${isCloned ? 'Already cloned ✓' : 'Consider cloning to protect it.'}`,
        saving: formatBytes(file.size - (file.optimizedSize || file.size)),
        action: isCloned ? null : 'clone',
        fileId: file._id,
        badge: `${file.compressionPercent}% saved`,
        badgeColor: 'bg-emerald-500/20 text-emerald-400',
      });
    }
  });

  // 6. No files yet
  if (files.length === 0) {
    suggestions.push({
      id: 'no-files',
      type: 'info',
      priority: 'low',
      icon: '📤',
      title: 'Upload your first file',
      detail: 'Upload any file to activate AI optimization and get personalized suggestions here.',
      action: 'navigate',
      target: '/upload',
      badge: 'Getting started',
      badgeColor: 'bg-primary-500/20 text-primary-400',
    });
  }

  // 7. All files cloned — perfect state
  const uncloned = files.filter(f => !completedJobs.has(f._id) && !runningJobs.has(f._id));
  if (files.length > 0 && uncloned.length === 0) {
    suggestions.push({
      id: 'all-cloned',
      type: 'info',
      priority: 'low',
      icon: '✅',
      title: 'All files are backed up',
      detail: `All ${files.length} file(s) have completed clone jobs. Your data is fully protected.`,
      action: null,
      badge: '100% protected',
      badgeColor: 'bg-emerald-500/20 text-emerald-400',
    });
  }

  // Sort: high → medium → low
  const order = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 6);
}

const priorityDot = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-emerald-400' };

/* ── Component ─────────────────────────────────────────── */
const AISuggestionsPanel = ({ files = [], jobs = [], onRefresh }) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [acting, setActing] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());

  const suggestions = useMemo(
    () => generateSuggestions(files, jobs).filter(s => !dismissed.has(s.id)),
    [files, jobs, dismissed]
  );

  const handleAction = async (s) => {
    if (s.action === 'navigate') { navigate(s.target); return; }
    if (s.action === 'clone' && s.fileId) {
      setActing(s.id);
      try {
        await cloneService.start(s.fileId);
        addToast(`Clone started for "${truncate(s.fileName || 'file', 20)}" 🔄`, 'success');
        onRefresh?.();
        setDismissed(prev => new Set([...prev, s.id]));
      } catch (err) {
        addToast(err.response?.data?.message || 'Clone failed', 'error');
      } finally {
        setActing(null);
      }
    }
  };

  const dismiss = (id) => setDismissed(prev => new Set([...prev, id]));

  if (suggestions.length === 0) return null;

  return (
    <div className="glass-card p-5 border border-primary-500/15"
      style={{ background: 'linear-gradient(135deg, rgba(92,124,250,0.04) 0%, rgba(167,139,250,0.04) 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-sm shadow-lg">
            🤖
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Suggestions</h3>
            <p className="text-[10px] text-slate-500">{suggestions.length} insight{suggestions.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-primary-500/15 text-primary-400 border border-primary-500/20 font-medium">
          Intelligence Layer
        </span>
      </div>

      {/* Suggestions list */}
      <div className="space-y-2.5">
        {suggestions.map(s => (
          <div
            key={s.id}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-white/3 border border-white/6 hover:border-primary-500/20 hover:bg-white/5 transition-all group"
          >
            {/* Priority dot + icon */}
            <div className="relative shrink-0 mt-0.5">
              <span className="text-2xl">{s.icon}</span>
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${priorityDot[s.priority]}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="text-xs font-semibold text-white">{s.title}</p>
                {s.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.badgeColor}`}>
                    {s.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{s.detail}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {s.action && (
                <button
                  onClick={() => handleAction(s)}
                  disabled={acting === s.id}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/25 hover:bg-primary-500/35 transition-all disabled:opacity-50"
                >
                  {acting === s.id ? '⏳' : s.action === 'navigate' ? 'Go →' : 'Apply'}
                </button>
              )}
              <button
                onClick={() => dismiss(s.id)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100 text-xs"
                title="Dismiss"
              >✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AISuggestionsPanel;
