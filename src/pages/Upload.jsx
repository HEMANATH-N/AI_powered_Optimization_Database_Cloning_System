import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { fileService } from '../services';
import { useToast } from '../context/ToastContext';
import { formatBytes, getFileIcon, getFileTypeColor } from '../utils/helpers';
import ProgressBar from '../components/ProgressBar';

const ACCEPTED_TYPES = '*';

const TYPE_FILTERS = [
  { key: 'all',      label: 'All',       icon: '📁' },
  { key: 'image',    label: 'Images',    icon: '🖼️' },
  { key: 'video',    label: 'Videos',    icon: '🎬' },
  { key: 'audio',    label: 'Audio',     icon: '🎵' },
  { key: 'document', label: 'Documents', icon: '📄' },
  { key: 'archive',  label: 'Archives',  icon: '🗜️' },
  { key: 'other',    label: 'Other',     icon: '📝' },
];

const SIZE_FILTERS = [
  { key: 'all',    label: 'Any size' },
  { key: 'small',  label: '< 1 MB' },
  { key: 'medium', label: '1 – 50 MB' },
  { key: 'large',  label: '> 50 MB' },
];

const SORT_OPTIONS = [
  { key: 'date-desc',  label: 'Newest first' },
  { key: 'date-asc',   label: 'Oldest first' },
  { key: 'size-desc',  label: 'Largest first' },
  { key: 'size-asc',   label: 'Smallest first' },
  { key: 'name-asc',   label: 'Name A → Z' },
  { key: 'name-desc',  label: 'Name Z → A' },
];

function matchesSize(file, key) {
  const mb = file.size / (1024 * 1024);
  if (key === 'small')  return mb < 1;
  if (key === 'medium') return mb >= 1 && mb <= 50;
  if (key === 'large')  return mb > 50;
  return true;
}

function matchesType(file, key) {
  if (key === 'all') return true;
  return file.fileType === key;
}

function sortFiles(files, sortKey) {
  return [...files].sort((a, b) => {
    if (sortKey === 'date-desc') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortKey === 'date-asc')  return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortKey === 'size-desc') return b.size - a.size;
    if (sortKey === 'size-asc')  return a.size - b.size;
    if (sortKey === 'name-asc')  return (a.originalName || '').localeCompare(b.originalName || '');
    if (sortKey === 'name-desc') return (b.originalName || '').localeCompare(a.originalName || '');
    return 0;
  });
}

const Upload = () => {
  const [dragActive, setDragActive]       = useState(false);
  const [pendingFiles, setPendingFiles]   = useState([]);
  const [uploading, setUploading]         = useState(false);
  const [serverFiles, setServerFiles]     = useState([]);
  const [loadingFiles, setLoadingFiles]   = useState(true);
  // Filters
  const [searchQuery, setSearchQuery]     = useState('');
  const [typeFilter, setTypeFilter]       = useState('all');
  const [sizeFilter, setSizeFilter]       = useState('all');
  const [sortKey, setSortKey]             = useState('date-desc');
  const [showFilters, setShowFilters]     = useState(false);

  const inputRef = useRef(null);
  const { addToast } = useToast();

  /* fetch existing files */
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fileService.getAll();
      setServerFiles(res.data.files || []);
    } catch {}
    finally { setLoadingFiles(false); }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  /* ── Filtered + sorted files ── */
  const filteredFiles = useMemo(() => {
    let result = serverFiles.filter(f => !f.isDeleted);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.originalName?.toLowerCase().includes(q));
    }
    result = result.filter(f => matchesType(f, typeFilter));
    result = result.filter(f => matchesSize(f, sizeFilter));
    return sortFiles(result, sortKey);
  }, [serverFiles, searchQuery, typeFilter, sizeFilter, sortKey]);

  const activeFilterCount = [
    typeFilter !== 'all' ? 1 : 0,
    sizeFilter !== 'all' ? 1 : 0,
    sortKey !== 'date-desc' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  /* ── Drag & drop ── */
  const handleDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const addFiles = (newFiles) => {
    const items = newFiles.map(f => ({
      id: Date.now() + Math.random(),
      file: f, name: f.name, size: f.size, type: f.type, progress: 0, status: 'pending',
    }));
    setPendingFiles(prev => [...prev, ...items]);
  };

  const handleFileInput = (e) => { addFiles(Array.from(e.target.files)); e.target.value = ''; };
  const removeFile = (id) => setPendingFiles(prev => prev.filter(f => f.id !== id));

  /* ── Upload ── */
  const uploadAll = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    let done = 0;
    for (const fi of pendingFiles) {
      setPendingFiles(prev => prev.map(f => f.id === fi.id ? { ...f, status: 'uploading', progress: 0 } : f));
      try {
        const fd = new FormData();
        fd.append('file', fi.file);
        await fileService.upload(fd, (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setPendingFiles(prev => prev.map(f => f.id === fi.id ? { ...f, progress: pct } : f));
        });
        done++;
        setPendingFiles(prev => prev.map(f => f.id === fi.id ? { ...f, status: 'done', progress: 100 } : f));
      } catch {
        setPendingFiles(prev => prev.map(f => f.id === fi.id ? { ...f, status: 'error' } : f));
      }
    }
    addToast(`${done} file(s) uploaded & optimized! ✨`, 'success');
    setTimeout(() => setPendingFiles(prev => prev.filter(f => f.status !== 'done')), 2000);
    setUploading(false);
    fetchFiles();
  };

  const getStatusBadge = (status) => ({
    pending:   'bg-slate-500/20 text-slate-400',
    uploading: 'bg-blue-500/20 text-blue-400',
    done:      'bg-emerald-500/20 text-emerald-400',
    error:     'bg-red-500/20 text-red-400',
  }[status] || 'bg-slate-500/20 text-slate-400');

  const getQueueIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type === 'application/pdf') return '📄';
    if (type.includes('zip') || type.includes('rar')) return '🗜️';
    return '📝';
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Upload Files</h2>
        <p className="text-slate-400 text-sm">Files are automatically AI-optimized on upload</p>
      </div>

      {/* Drop Zone */}
      <div
        id="dropzone"
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`glass-card p-12 border-2 border-dashed cursor-pointer text-center transition-all duration-300 ${
          dragActive ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-primary-500/50 hover:bg-primary-500/5'
        }`}
      >
        <input ref={inputRef} type="file" id="file-input" multiple accept={ACCEPTED_TYPES} onChange={handleFileInput} className="hidden" />
        <div className="text-6xl mb-4">{dragActive ? '🎯' : '📤'}</div>
        <h3 className="text-lg font-semibold text-white mb-2">{dragActive ? 'Drop files here!' : 'Drag & Drop your files'}</h3>
        <p className="text-slate-400 text-sm mb-4">or click to browse — images, videos, documents, archives</p>
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          {['🖼️ Images','🎬 Videos','📄 Documents','🗜️ Archives'].map(t => (
            <span key={t} className="flex items-center gap-1">{t.split(' ').map((p,i) => i===0 ? <span key={i}>{p}</span> : p)}</span>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-3">Max file size: 100MB</p>
      </div>

      {/* Upload queue */}
      {pendingFiles.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Upload Queue ({pendingFiles.length})</h3>
            <div className="flex gap-2">
              <button id="clear-queue-btn" onClick={() => setPendingFiles([])} disabled={uploading}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                Clear All
              </button>
              <button id="upload-all-btn" onClick={uploadAll}
                disabled={uploading || pendingFiles.every(f => f.status === 'done')}
                className="btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50">
                {uploading ? 'Uploading...' : `Upload All (${pendingFiles.filter(f => f.status === 'pending').length})`}
              </button>
            </div>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {pendingFiles.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                <span className="text-xl">{getQueueIcon(f.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-white truncate max-w-[200px]" title={f.name}>{f.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 ${getStatusBadge(f.status)}`}>
                      {f.status==='done'?'✅ Done':f.status==='error'?'❌ Error':f.status==='uploading'?'⏫ Uploading':'⏳ Pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{formatBytes(f.size)}</span>
                    {f.status==='uploading' && <div className="flex-1"><ProgressBar value={f.progress} showPercent={false} color="blue" height="h-1" animated /></div>}
                  </div>
                </div>
                {f.status==='pending' && (
                  <button onClick={() => removeFile(f.id)} className="text-slate-500 hover:text-red-400 transition-colors text-lg ml-2">×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Advanced Search + Filter bar ─────────────────────── */}
      <div className="glass-card p-4 space-y-3">
        {/* Search row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input
              id="file-search-input"
              type="text"
              placeholder="Search by file name…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoComplete="off"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-white/5 border border-white/8 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs">✕</button>
            )}
          </div>
          <button
            id="toggle-filters-btn"
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary-500/20 text-primary-300 border-primary-500/30'
                : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            <span>⚙️</span>
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setTypeFilter('all'); setSizeFilter('all'); setSortKey('date-desc'); }}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg"
            >
              Reset
            </button>
          )}
        </div>

        {/* Expanded filter options */}
        {showFilters && (
          <div className="space-y-3 pt-2 border-t border-white/5 animate-fade-in">
            {/* Type filter */}
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">File Type</p>
              <div className="flex flex-wrap gap-2">
                {TYPE_FILTERS.map(tf => (
                  <button
                    key={tf.key}
                    onClick={() => setTypeFilter(tf.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      typeFilter === tf.key
                        ? 'bg-primary-500/20 text-primary-300 border-primary-500/30'
                        : 'border-white/8 text-slate-400 hover:text-white hover:border-white/15'
                    }`}
                  >
                    <span>{tf.icon}</span>{tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size + Sort row */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-40">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">File Size</p>
                <div className="flex flex-wrap gap-2">
                  {SIZE_FILTERS.map(sf => (
                    <button key={sf.key} onClick={() => setSizeFilter(sf.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        sizeFilter === sf.key
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'border-white/8 text-slate-400 hover:text-white hover:border-white/15'
                      }`}>
                      {sf.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Sort By</p>
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/8 text-white focus:outline-none focus:border-primary-500/40 cursor-pointer"
                >
                  {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Result count */}
        <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
          <span>
            {searchQuery || activeFilterCount > 0
              ? `${filteredFiles.length} of ${serverFiles.length} files match`
              : `${serverFiles.length} file${serverFiles.length !== 1 ? 's' : ''} total`
            }
          </span>
          {filteredFiles.length === 0 && (searchQuery || activeFilterCount > 0) && (
            <span className="text-amber-500/70">No files match the current filters</span>
          )}
        </div>
      </div>

      {/* Uploaded files grid */}
      {loadingFiles ? (
        <div className="text-center py-10 text-slate-500 text-sm">Loading files…</div>
      ) : filteredFiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map(file => (
            <div key={file._id} className="glass-card p-4 hover:border-primary-500/25 transition-all">
              <div className="flex items-start gap-3 mb-3">
                <span className={`text-3xl ${getFileTypeColor(file.fileType)}`}>{getFileIcon(file.fileType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate" title={file.originalName}>{file.originalName}</p>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">{file.fileType} · {formatBytes(file.size)}</p>
                </div>
                {file.isOptimized && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shrink-0">✨ Optimized</span>
                )}
              </div>
              {/* Compression bar */}
              {file.compressionPercent > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>{formatBytes(file.size)} → {formatBytes(file.optimizedSize || file.size)}</span>
                    <span className="text-emerald-400 font-semibold">-{file.compressionPercent}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                      style={{ width: `${file.compressionPercent}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : serverFiles.length > 0 ? (
        <div className="glass-card p-10 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-400 text-sm mb-1">No files match your search</p>
          <p className="text-slate-600 text-xs">Try adjusting filters or clear the search</p>
          <button onClick={() => { setSearchQuery(''); setTypeFilter('all'); setSizeFilter('all'); }}
            className="mt-3 px-4 py-2 rounded-lg text-xs font-medium text-primary-400 border border-primary-500/20 hover:bg-primary-500/10 transition-all">
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="glass-card p-10 text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-slate-400 text-sm">No files uploaded yet — drag & drop above to get started.</p>
        </div>
      )}

      {/* AI info */}
      <div className="glass-card p-5 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border-emerald-500/15">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="text-sm font-bold text-white">AI Optimization Active</h3>
            <p className="text-xs text-slate-400">Files are automatically compressed using AI algorithms</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {['20-45% Size Reduction', 'Lossless Quality', 'Instant Processing'].map((feature, i) => (
            <div key={i} className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
              <p className="text-xs text-emerald-400 font-medium">{feature}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Upload;
