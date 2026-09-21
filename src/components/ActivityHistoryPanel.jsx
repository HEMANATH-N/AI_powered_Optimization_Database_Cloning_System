import React, { useEffect, useState, useCallback } from 'react';
import { fileService, cloneService, recycleBinService } from '../services';
import { formatBytes, truncate } from '../utils/helpers';

/* ── Time helpers ──────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return 'Unknown time';
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/* ── Event builder from API data ───────────────────────── */
function buildEvents(files, jobs, binFiles) {
  const events = [];

  // File uploads
  files.forEach(f => {
    if (f.createdAt) {
      events.push({
        id:    `upload-${f._id}`,
        ts:    new Date(f.createdAt),
        type:  'upload',
        icon:  '📤',
        color: 'bg-primary-500/20 text-primary-400 border-primary-500/25',
        dot:   'bg-primary-400',
        title: 'File Uploaded',
        detail: `${truncate(f.originalName, 32)} — ${formatBytes(f.size)}`,
        badge:  f.isOptimized ? { label: `✨ ${f.compressionPercent}% saved`, cls: 'bg-emerald-500/15 text-emerald-400' } : null,
      });
    }
  });

  // Clone job events — schema uses startedAt / completedAt (no createdAt/updatedAt)
  jobs.forEach(j => {
    const fileName = j.fileId?.originalName || 'File';
    const startTs  = j.startedAt    ? new Date(j.startedAt)   : null;
    const doneTs   = j.completedAt  ? new Date(j.completedAt) : null;

    // Always push start event (fallback to current time if missing)
    events.push({
      id:    `clone-start-${j._id}`,
      ts:    startTs || new Date(0),
      type:  'clone-start',
      icon:  '🔄',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/25',
      dot:   'bg-blue-400',
      title: 'Clone Job Started',
      detail: truncate(fileName, 32),
      badge: { label: j.status === 'running' ? 'In Progress' : j.status, cls: 'bg-blue-500/15 text-blue-400' },
    });

    // Completed event
    if (j.status === 'completed') {
      events.push({
        id:    `clone-done-${j._id}`,
        ts:    doneTs || startTs || new Date(0),
        type:  'clone-complete',
        icon:  '✅',
        color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/25',
        dot:   'bg-emerald-400',
        title: 'Clone Completed',
        detail: `${truncate(fileName, 26)} — ${j.progress || 100}%`,
        badge:  { label: '100% done', cls: 'bg-emerald-500/15 text-emerald-400' },
      });
    }

    // Paused event
    if (j.status === 'paused') {
      events.push({
        id:    `clone-paused-${j._id}`,
        ts:    startTs || new Date(0),
        type:  'clone-pause',
        icon:  '⏸️',
        color: 'bg-amber-500/20 text-amber-400 border-amber-500/25',
        dot:   'bg-amber-400',
        title: 'Clone Paused',
        detail: `${truncate(fileName, 26)} — ${j.progress || 0}%`,
        badge:  { label: `${j.progress || 0}% paused`, cls: 'bg-amber-500/15 text-amber-400' },
      });
    }

    // Failed event
    if (j.status === 'failed') {
      events.push({
        id:    `clone-failed-${j._id}`,
        ts:    startTs || new Date(0),
        type:  'clone-fail',
        icon:  '❌',
        color: 'bg-red-500/20 text-red-400 border-red-500/25',
        dot:   'bg-red-400',
        title: 'Clone Failed',
        detail: truncate(fileName, 32),
        badge:  { label: 'Failed', cls: 'bg-red-500/15 text-red-400' },
      });
    }
  });

  // Deleted files (in recycle bin)
  binFiles.forEach(f => {
    if (f.deletedAt) {
      events.push({
        id:    `delete-${f._id}`,
        ts:    new Date(f.deletedAt),
        type:  'delete',
        icon:  '🗑️',
        color: 'bg-red-500/15 text-red-400 border-red-500/20',
        dot:   'bg-red-400',
        title: 'File Deleted',
        detail: truncate(f.originalName, 32),
        badge:  { label: 'Recycle Bin', cls: 'bg-red-500/10 text-red-400' },
      });
    }

    if (f.restoredAt) {
      events.push({
        id:    `restore-${f._id}`,
        ts:    new Date(f.restoredAt),
        type:  'restore',
        icon:  '♻️',
        color: 'bg-teal-500/20 text-teal-400 border-teal-500/25',
        dot:   'bg-teal-400',
        title: 'File Restored',
        detail: truncate(f.originalName, 32),
        badge:  null,
      });
    }
  });

  // Sort newest first
  return events.sort((a, b) => b.ts - a.ts);
}

/* ── Group events by date ──────────────────────────────── */
function groupByDate(events) {
  const groups = {};
  events.forEach(ev => {
    const label = fmtDate(ev.ts);
    if (!groups[label]) groups[label] = [];
    groups[label].push(ev);
  });
  return Object.entries(groups);
}

/* ── Filter options ────────────────────────────────────── */
const FILTERS = [
  { key: 'all',    label: 'All' },
  { key: 'upload', label: 'Uploads' },
  { key: 'clone',  label: 'Clones' },
  { key: 'delete', label: 'Deletions' },
];

function matchFilter(ev, f) {
  if (f === 'all')    return true;
  if (f === 'upload') return ev.type === 'upload';
  if (f === 'clone')  return ev.type.startsWith('clone');
  if (f === 'delete') return ev.type === 'delete' || ev.type === 'restore';
  return true;
}

/* ── Main Panel ────────────────────────────────────────── */
const ActivityHistoryPanel = ({ isOpen, onClose }) => {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, jobsRes, binRes] = await Promise.all([
        fileService.getAll(),
        cloneService.getAll(),
        recycleBinService.getAll(),
      ]);
      const evs = buildEvents(
        filesRes.data.files   || [],
        jobsRes.data.jobs     || [],
        binRes.data.files     || [],
      );
      setEvents(evs);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const filtered = events.filter(ev => {
    if (!matchFilter(ev, filter)) return false;
    if (search.trim()) return ev.title.toLowerCase().includes(search.toLowerCase()) ||
                              ev.detail.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const grouped = groupByDate(filtered);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(15,17,27,0.98) 0%, rgba(10,12,20,0.99) 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-600/20 border border-primary-500/25 flex items-center justify-center text-lg">
              🕐
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Recent Activity</h3>
              <p className="text-[10px] text-slate-500">{events.length} events recorded</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} title="Refresh"
              className="w-7 h-7 rounded-lg bg-white/4 hover:bg-white/8 flex items-center justify-center text-slate-500 hover:text-white transition-all text-xs">
              ↺
            </button>
            <button id="history-close-btn" onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/4 hover:bg-white/8 flex items-center justify-center text-slate-500 hover:text-white transition-all text-sm">
              ✕
            </button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search activity…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 rounded-xl text-xs bg-white/4 border border-white/8 text-white placeholder-slate-700 focus:outline-none focus:border-primary-500/40 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white text-[10px]">✕</button>
            )}
          </div>
        </div>

        {/* ── Filter chips ── */}
        <div className="flex items-center gap-1.5 px-4 pb-3 shrink-0">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                filter === f.key
                  ? 'bg-primary-500/20 text-primary-300 border-primary-500/30'
                  : 'border-white/8 text-slate-500 hover:text-white hover:border-white/15'
              }`}>
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-slate-700">{filtered.length} events</span>
        </div>

        {/* ── Timeline ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-600">Loading activity…</p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-4xl">📭</div>
              <p className="text-slate-500 text-sm">No activity found</p>
              <p className="text-slate-700 text-xs text-center">
                {search ? 'Try a different search term' : 'Upload files or start clone jobs to see your activity here'}
              </p>
            </div>
          ) : (
            grouped.map(([dateLabel, evs]) => (
              <div key={dateLabel}>
                {/* Date separator */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2">{dateLabel}</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* Events for this date */}
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-white/5" />

                  <div className="space-y-1">
                    {evs.map((ev, idx) => (
                      <div key={ev.id} className="flex items-start gap-3 group pl-1">
                        {/* Dot */}
                        <div className={`w-6 h-6 rounded-full ${ev.color} border flex items-center justify-center text-[11px] shrink-0 relative z-10 mt-0.5`}>
                          {ev.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-2.5 px-3 rounded-xl transition-all hover:bg-white/3 cursor-default">
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <p className="text-xs font-semibold text-white">{ev.title}</p>
                            <span className="text-[10px] text-slate-700 shrink-0 ml-1 mt-0.5">{fmtTime(ev.ts)}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{ev.detail}</p>
                          {ev.badge && (
                            <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${ev.badge.cls}`}>
                              {ev.badge.label}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-3 border-t border-white/5 shrink-0">
          <p className="text-[10px] text-slate-700 text-center">
            Activity derived from files, clone jobs & recycle bin · Auto-updates on open
          </p>
        </div>
      </div>
    </>
  );
};

export default ActivityHistoryPanel;
