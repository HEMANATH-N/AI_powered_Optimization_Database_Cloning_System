import React from 'react';
import { formatBytes, formatDate, getFileIcon, getFileTypeColor, truncate } from '../utils/helpers';
import ProgressBar from './ProgressBar';

const FileCard = ({ file, onClone, onDelete, cloneJob }) => {
  const isCloning = cloneJob && ['running', 'pending'].includes(cloneJob.status);
  const isPaused = cloneJob?.status === 'paused';
  const isCompleted = cloneJob?.status === 'completed';

  return (
    <div className="glass-card p-5 animate-fade-in group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`text-3xl ${getFileTypeColor(file.fileType)}`}>
            {getFileIcon(file.fileType)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate max-w-[160px]" title={file.originalName}>
              {truncate(file.originalName, 22)}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 capitalize">
              {file.fileType}
            </span>
          </div>
        </div>
        {file.isOptimized && (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shrink-0">
            ✨ Optimized
          </span>
        )}
      </div>

      {/* Size info */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-white/3">
          <p className="text-xs text-slate-500 mb-0.5">Original</p>
          <p className="text-xs font-medium text-white">{formatBytes(file.size)}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/3">
          <p className="text-xs text-slate-500 mb-0.5">Optimized</p>
          <p className="text-xs font-medium text-emerald-400">{formatBytes(file.optimizedSize)}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/3">
          <p className="text-xs text-slate-500 mb-0.5">Saved</p>
          <p className="text-xs font-bold text-primary-400">{file.compressionPercent}%</p>
        </div>
      </div>

      {/* Compression bar */}
      <div className="mb-4">
        <ProgressBar value={file.compressionPercent} label="Compression" color="green" height="h-1.5" />
      </div>

      {/* Clone progress */}
      {cloneJob && (
        <div className="mb-4 p-3 rounded-xl bg-white/3 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Clone Progress</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isCompleted ? 'bg-emerald-500/20 text-emerald-400' :
              isPaused ? 'bg-amber-500/20 text-amber-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {cloneJob.status}
            </span>
          </div>
          <ProgressBar value={cloneJob.progress} color="gradient" animated={isCloning} height="h-2" />
          {isCloning && (
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-slate-500">Speed: {cloneJob.speed || 0} MB/s</span>
              <span className="text-xs text-slate-500">ETA: {cloneJob.eta || 0}s</span>
            </div>
          )}
        </div>
      )}

      {/* Date */}
      <p className="text-xs text-slate-600 mb-4">{formatDate(file.createdAt)}</p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          id={`clone-btn-${file._id}`}
          onClick={() => onClone(file)}
          disabled={isCloning}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
            isCompleted
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 cursor-default'
              : isCloning
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-not-allowed'
              : 'btn-primary'
          }`}
        >
          {isCompleted ? '✅ Cloned' : isCloning ? '⏳ Cloning...' : isPaused ? '▶️ Resume' : '🔄 Clone'}
        </button>
        <button
          id={`delete-btn-${file._id}`}
          onClick={() => onDelete(file._id)}
          className="py-2 px-3 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 transition-all duration-200"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default FileCard;
