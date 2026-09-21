import React from 'react';

const StatCard = ({ icon, label, value, sub, color = 'blue', trend }) => {
  const colorMap = {
    blue: { bg: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20', text: 'text-blue-400', glow: 'shadow-blue-500/10' },
    purple: { bg: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/20', text: 'text-purple-400', glow: 'shadow-purple-500/10' },
    green: { bg: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    amber: { bg: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/10' },
    red: { bg: 'from-red-500/20 to-red-600/5', border: 'border-red-500/20', text: 'text-red-400', glow: 'shadow-red-500/10' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`stat-card glass-card p-6 bg-gradient-to-br ${c.bg} border ${c.border} shadow-lg ${c.glow} animate-fade-in`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center text-2xl border ${c.border}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-2xl font-bold ${c.text} mb-1`}>{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
};

export default StatCard;
