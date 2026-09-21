import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatBytes, formatDate, getFileIcon, getFileTypeColor } from '../utils/helpers';

const API_URL = 'http://localhost:5000/api';

/* ── helpers ───────────────────────────────────────────── */
const BROWSER_UNSUPPORTED = ['pptx','ppt','docx','doc','xlsx','xls','odt','ods','odp'];

function getUrls(fileId) {
  const token = localStorage.getItem('token');
  return {
    view:     `${API_URL}/files/${fileId}/view?token=${token}`,
    download: `${API_URL}/files/${fileId}/download?token=${token}`,
  };
}

/* ── Image Preview ─────────────────────────────────────── */
function ImagePreview({ url, name }) {
  const [zoomed, setZoomed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState(false);

  return (
    <div className="relative rounded-xl overflow-hidden bg-black/40 flex items-center justify-center"
      style={{ minHeight: 200, maxHeight: zoomed ? '75vh' : 340 }}>
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-500/40 border-t-primary-500 rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="p-8 text-center">
          <div className="text-4xl mb-2">🖼️</div>
          <p className="text-slate-500 text-xs">Could not load image preview</p>
        </div>
      )}
      <img
        src={url}
        alt={name}
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); setLoaded(true); }}
        onClick={() => setZoomed(v => !v)}
        className={`transition-all duration-300 object-contain cursor-zoom-${zoomed ? 'out' : 'in'} ${
          loaded && !error ? 'opacity-100' : 'opacity-0'
        } ${zoomed ? 'max-h-[75vh] w-full' : 'max-h-80 max-w-full'}`}
        style={{ display: loaded && !error ? 'block' : 'none' }}
      />
      {/* Zoom badge */}
      {loaded && !error && (
        <div className="absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded-full bg-black/60 text-slate-400 backdrop-blur-sm">
          {zoomed ? '🔍 Click to shrink' : '🔍 Click to zoom'}
        </div>
      )}
    </div>
  );
}

/* ── Video Preview ─────────────────────────────────────── */
function VideoPreview({ url, name }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress]  = useState(0);
  const [duration, setDuration]  = useState(0);
  const [currentTime, setCurrent] = useState(0);
  const [volume, setVolume]       = useState(1);
  const [muted, setMuted]         = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const fmt = (s) => {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else          { v.pause(); setIsPlaying(false); }
  };

  const seekTo = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => { setCurrent(v.currentTime); setProgress((v.currentTime / v.duration) * 100 || 0); };
    const onMeta = () => setDuration(v.duration);
    const onEnd  = () => setIsPlaying(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('ended', onEnd);
    return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('loadedmetadata', onMeta); v.removeEventListener('ended', onEnd); };
  }, []);

  return (
    <div className="rounded-xl overflow-hidden bg-black border border-white/8">
      {/* Video element */}
      <div className="relative group cursor-pointer" onClick={toggle}>
        <video
          ref={videoRef}
          src={url}
          className="w-full max-h-72 object-contain"
          muted={muted}
          preload="metadata"
        />
        {/* Play overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-all">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl hover:bg-white/30 transition-all">
              ▶
            </div>
          </div>
        )}
      </div>

      {/* Custom controls */}
      <div className="p-3 space-y-2 bg-black/60">
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-8 shrink-0">{fmt(currentTime)}</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer relative group/bar" onClick={seekTo}>
            <div className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all relative"
              style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 w-8 shrink-0 text-right">{fmt(duration)}</span>
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center text-white text-sm transition-all">
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={() => { setMuted(m => !m); if (videoRef.current) videoRef.current.muted = !muted; }}
              className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center text-white text-xs transition-all">
              {muted ? '🔇' : '🔊'}
            </button>
            {/* Volume slider */}
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={e => { const v = parseFloat(e.target.value); setVolume(v); if (videoRef.current) { videoRef.current.volume = v; setMuted(v === 0); } }}
              className="w-16 h-1 accent-primary-500 cursor-pointer" />
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-[10px] px-2.5 py-1 rounded-lg bg-white/8 text-slate-400 hover:text-white hover:bg-white/15 transition-all">
            ↗ Fullscreen
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Audio Preview ─────────────────────────────────────── */
function AudioPreview({ url, name }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent]   = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted]       = useState(false);

  const fmt = (s) => { const m = Math.floor(s/60), sec = Math.floor(s%60); return `${m}:${sec.toString().padStart(2,'0')}`; };
  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };
  const seek = (e) => {
    const a = audioRef.current; if (!a) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  };

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onTime = () => { setCurrent(a.currentTime); setProgress((a.currentTime/a.duration)*100||0); };
    const onMeta = () => setDuration(a.duration);
    const onEnd  = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onMeta); a.removeEventListener('ended', onEnd); };
  }, []);

  return (
    <div className="rounded-xl p-5 border border-white/8 bg-gradient-to-br from-purple-500/8 to-primary-500/8">
      <audio ref={audioRef} src={url} preload="metadata" />
      {/* Visual */}
      <div className="flex items-center justify-center gap-1 mb-5 h-12">
        {Array.from({length: 20}).map((_, i) => (
          <div key={i}
            className={`w-1 rounded-full transition-all ${playing ? 'bg-primary-500 animate-pulse' : 'bg-white/15'}`}
            style={{ height: `${20 + Math.sin(i * 0.8) * 16 + Math.cos(i * 1.2) * 8}px`, animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
      <p className="text-xs text-slate-400 text-center truncate mb-4">{name}</p>

      {/* Seek bar */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-slate-600 w-8">{fmt(current)}</span>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer" onClick={seek}>
          <div className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] text-slate-600 w-8 text-right">{fmt(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm">⏮</button>
        <button onClick={toggle}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-lg hover:shadow-primary-500/30 transition-all hover:scale-105">
          {playing ? '⏸' : '▶'}
        </button>
        <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10); }}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm">⏭</button>
        <button onClick={() => { setMuted(m => !m); if (audioRef.current) audioRef.current.muted = !muted; }}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all text-xs">
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  );
}

/* ── PDF Preview ───────────────────────────────────────── */
function PdfPreview({ url, name }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden border border-white/8 relative" style={{ height: 380 }}>
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/2">
          <div className="w-8 h-8 border-2 border-primary-500/40 border-t-primary-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500">Loading PDF…</p>
        </div>
      )}
      <iframe
        src={`${url}#toolbar=1&navpanes=0`}
        className="w-full h-full"
        title={name}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

/* ── Unsupported ───────────────────────────────────────── */
function UnsupportedPreview({ file, ext, onDownload }) {
  return (
    <div className="p-8 rounded-xl bg-white/3 border border-white/8 text-center">
      <div className="text-5xl mb-4">{getFileIcon(file.fileType)}</div>
      <p className="text-white text-sm font-semibold mb-1">{file.originalName}</p>
      <p className="text-slate-400 text-xs mb-1">
        <span className="font-semibold uppercase text-slate-300">.{ext}</span> files cannot be previewed in the browser.
      </p>
      <p className="text-slate-600 text-xs mb-5">Download the file to open it with the appropriate application.</p>
      <button onClick={onDownload}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-500 to-purple-600 text-white hover:opacity-90 shadow-lg transition-all">
        ⬇️ Download to Open
      </button>
    </div>
  );
}

/* ── Main Modal ────────────────────────────────────────── */
const FilePreviewModal = ({ file, jobStatus, onClose }) => {
  const [tab, setTab] = useState('preview');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!file) return null;

  const ext = (file.originalName || '').split('.').pop().toLowerCase();
  const { view: viewUrl, download: downloadUrl } = getUrls(file._id);

  const isImage    = file.fileType === 'image';
  const isVideo    = file.fileType === 'video';
  const isAudio    = file.fileType === 'audio';
  const isPdf      = file.mimeType === 'application/pdf' || ext === 'pdf';
  const isUnsupported = BROWSER_UNSUPPORTED.includes(ext);
  const isPreviewable = isImage || isVideo || isAudio || isPdf;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = downloadUrl; a.download = file.originalName; a.click();
  };

  const meta = [
    { label: 'Original Size',  value: formatBytes(file.size),                         color: 'text-white' },
    { label: 'Optimized Size', value: formatBytes(file.optimizedSize || file.size),    color: 'text-emerald-400' },
    { label: 'Compression',    value: `${file.compressionPercent || 0}%`,              color: 'text-primary-400' },
    { label: 'File Type',      value: file.fileType?.toUpperCase() || 'UNKNOWN',       color: 'text-slate-300' },
    { label: 'Uploaded',       value: formatDate(file.createdAt),                      color: 'text-slate-300' },
    { label: 'Clone Status',   value: jobStatus || 'Not started',
      color: jobStatus === 'completed' ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'AI Optimized',   value: file.isOptimized ? 'Yes ✓' : 'No',
      color: file.isOptimized ? 'text-emerald-400' : 'text-slate-500' },
    { label: 'Extension',      value: ext ? `.${ext.toUpperCase()}` : '—',             color: 'text-slate-400' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-card w-full animate-fade-in border border-white/10 flex flex-col overflow-hidden"
        style={{ maxWidth: 680, maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-2xl shrink-0 ${getFileTypeColor(file.fileType)}`}>{getFileIcon(file.fileType)}</span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate max-w-xs" title={file.originalName}>{file.originalName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-medium">{file.fileType}</span>
                <span className="text-slate-700">·</span>
                <span className="text-[10px] text-slate-500">{formatBytes(file.size)}</span>
                {file.isOptimized && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium">✨ AI Optimized</span>
                )}
              </div>
            </div>
          </div>
          <button id="preview-modal-close" onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-lg bg-white/5 hover:bg-white/12 flex items-center justify-center text-slate-400 hover:text-white transition-all ml-2">
            ✕
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex items-center gap-1 px-5 pt-3 shrink-0">
          {[
            { key: 'preview', label: isImage ? '🖼️ Preview' : isVideo ? '🎬 Preview' : isAudio ? '🎵 Preview' : isPdf ? '📄 Preview' : '👁️ Preview' },
            { key: 'info', label: 'ℹ️ Details' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === t.key
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-5 pt-3 space-y-4">
          {tab === 'preview' && (
            <>
              {isImage    && <ImagePreview url={viewUrl} name={file.originalName} />}
              {isVideo    && <VideoPreview url={viewUrl} name={file.originalName} />}
              {isAudio    && <AudioPreview url={viewUrl} name={file.originalName} />}
              {isPdf      && !isImage && !isVideo && !isAudio && <PdfPreview url={viewUrl} name={file.originalName} />}
              {isUnsupported && <UnsupportedPreview file={file} ext={ext} onDownload={handleDownload} />}
              {!isPreviewable && !isUnsupported && (
                <div className="p-8 rounded-xl bg-white/3 border border-white/8 text-center">
                  <div className="text-5xl mb-4">{getFileIcon(file.fileType)}</div>
                  <p className="text-slate-400 text-sm mb-4">Preview not available for <span className="font-semibold text-slate-300">.{ext}</span> files.</p>
                  <button onClick={() => window.open(viewUrl, '_blank')}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/30 hover:bg-primary-500/30 transition-all">
                    🔗 Try Opening in Browser
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'info' && (
            <div className="grid grid-cols-2 gap-2">
              {meta.map(({ label, value, color }) => (
                <div key={label} className="p-3.5 rounded-xl bg-white/4 border border-white/8">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                  <p className={`text-sm font-semibold ${color} truncate`}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="flex gap-2 px-5 pb-5 shrink-0 border-t border-white/5 pt-4">
          <button id="modal-open-btn" onClick={() => window.open(viewUrl, '_blank', 'noopener,noreferrer')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-white/6 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white transition-all">
            🔗 Open in Browser
          </button>
          <button id="modal-download-btn" onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary-500 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-primary-500/15 transition-all">
            ⬇️ Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
