import React, { useEffect, useState, useCallback } from 'react';
import { analyticsService } from '../services';
import { useToast } from '../context/ToastContext';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatBytes } from '../utils/helpers';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const PIE_COLORS = ['#4c6ef5', '#a78bfa', '#f59e0b', '#10b981', '#ef4444', '#38bdf8'];

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await analyticsService.getAnalytics();
      setAnalytics(res.data.analytics);
    } catch { addToast('Failed to load analytics', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading) return <LoadingSpinner size="lg" text="Loading analytics..." />;

  const fileTypeData = analytics?.filesByType
    ? Object.entries(analytics.filesByType).map(([name, value]) => ({ name, value }))
    : [];

  const storageBarData = [
    { name: 'Total Storage', value: analytics?.totalStorage || 0, fill: '#4c6ef5' },
    { name: 'Optimized', value: analytics?.totalOptimizedStorage || 0, fill: '#a78bfa' },
    { name: 'Saved', value: analytics?.totalSaved || 0, fill: '#10b981' },
  ];

  const cloneBarData = [
    { name: 'Total Jobs', value: analytics?.totalClones || 0, fill: '#4c6ef5' },
    { name: 'Completed', value: analytics?.completedClones || 0, fill: '#10b981' },
    { name: 'Running', value: analytics?.runningClones || 0, fill: '#f59e0b' },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div className="glass px-3 py-2 rounded-xl border border-white/10 text-xs">
          <p className="text-white font-medium">{payload[0].name}</p>
          <p className="text-primary-400">{typeof payload[0].value === 'number' && payload[0].value > 1000
            ? formatBytes(payload[0].value)
            : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">📊 Analytics Dashboard</h2>
        <p className="text-slate-400 text-sm">Real-time insights into your storage and cloning operations</p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📁" label="Total Files" value={analytics?.totalFiles || 0} color="blue" />
        <StatCard icon="💾" label="Total Storage" value={formatBytes(analytics?.totalStorage || 0)} color="purple" />
        <StatCard
          icon="✨"
          label="Space Saved"
          value={formatBytes(analytics?.totalSaved || 0)}
          sub={`Avg ${analytics?.avgCompression || 0}% compression`}
          color="green"
        />
        <StatCard
          icon="🔄"
          label="Clone Jobs"
          value={analytics?.totalClones || 0}
          sub={`${analytics?.completedClones || 0} completed`}
          color="amber"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage bar chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-white mb-6">💾 Storage Overview</h3>
          {analytics?.totalStorage > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={storageBarData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => formatBytes(v)} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {storageBarData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">No storage data yet</div>
          )}
        </div>

        {/* File type pie chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-white mb-6">📂 Files by Type</h3>
          {fileTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={fileTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {fileTypeData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                <Legend
                  formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'capitalize' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">No files uploaded yet</div>
          )}
        </div>
      </div>

      {/* Clone jobs chart */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-white mb-6">🔄 Clone Operations Summary</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Jobs', value: analytics?.totalClones || 0, color: 'text-primary-400' },
            { label: 'Completed', value: analytics?.completedClones || 0, color: 'text-emerald-400' },
            { label: 'In Progress', value: analytics?.runningClones || 0, color: 'text-amber-400' },
          ].map((item, i) => (
            <div key={i} className="text-center p-4 rounded-xl bg-white/3 border border-white/5">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-slate-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
        {cloneBarData.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={cloneBarData} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {cloneBarData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">No clone jobs yet</div>
        )}
      </div>

      {/* Efficiency metric */}
      <div className="glass-card p-6 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border-emerald-500/15">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl">
            🤖
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-1">AI Efficiency Score</h3>
            <p className="text-slate-400 text-xs">Based on average compression across all files</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-4xl font-bold text-emerald-400">{analytics?.avgCompression || 0}%</p>
            <p className="text-xs text-slate-500">avg compression</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
