import React from 'react';

const ProgressBar = ({ value = 0, label, showPercent = true, color = 'blue', animated = false, height = 'h-2' }) => {
  const colorMap = {
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    red: 'from-red-500 to-rose-500',
    gradient: 'from-blue-500 via-purple-500 to-pink-500',
  };
  const barColor = colorMap[color] || colorMap.blue;
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
          {showPercent && (
            <span className="text-xs font-bold text-white">{Math.round(clamped)}%</span>
          )}
        </div>
      )}
      <div className={`w-full ${height} bg-white/5 rounded-full overflow-hidden`}>
        <div
          className={`${height} rounded-full bg-gradient-to-r ${barColor} transition-all duration-500 ease-out ${animated && clamped > 0 && clamped < 100 ? 'progress-bar-animated' : ''}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
