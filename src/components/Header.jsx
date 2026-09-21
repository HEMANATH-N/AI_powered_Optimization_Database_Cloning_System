import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const pageTitles = {
  '/dashboard':   { title: 'Dashboard',    subtitle: 'Overview of your files and operations' },
  '/upload':      { title: 'Upload Files', subtitle: 'Upload and AI-optimize your files' },
  '/clone':       { title: 'Clone Jobs',   subtitle: 'Manage and monitor cloning operations' },
  '/recycle-bin': { title: 'Recycle Bin',  subtitle: 'Deleted files — restore or permanently remove' },
  '/analytics':   { title: 'Analytics',    subtitle: 'Storage insights and performance metrics' },
};

const Header = ({ onMenuToggle, onHistoryOpen, historyCount = 0 }) => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const page = pageTitles[pathname] || { title: 'AI DB Cloning System', subtitle: '' };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 glass sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          id="menu-toggle-btn"
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-semibold text-white">{page.title}</h2>
          <p className="text-xs text-slate-500 hidden sm:block">{page.subtitle}</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* System Online */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">System Online</span>
        </div>

        {/* History button */}
        <button
          id="history-btn"
          onClick={onHistoryOpen}
          title="Recent Activity"
          className="relative w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200 group"
        >
          {/* Clock icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="9.5" />
            <polyline points="12 7 12 12 15.5 14.5" />
          </svg>
          {/* Badge for unread count */}
          {historyCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 text-white text-[9px] font-bold flex items-center justify-center shadow-lg shadow-primary-500/30 animate-pulse">
              {historyCount > 99 ? '99+' : historyCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
};

export default Header;
