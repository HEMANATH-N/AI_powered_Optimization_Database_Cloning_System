import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SettingsPanel from './SettingsPanel';
import { fileService, cloneService } from '../services';
import { formatBytes, getFileIcon, getFileTypeColor, truncate } from '../utils/helpers';

const navItems = [
  { to: '/dashboard', icon: '⚡', label: 'Dashboard' },
  { to: '/upload', icon: '📤', label: 'Upload Files' },
  { to: '/clone', icon: '🔄', label: 'Clone Jobs' },
  { to: '/recycle-bin', icon: '🗑️', label: 'Recycle Bin' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState({ files: [], jobs: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Only filter nav items when search is short / not found in files yet
  const pageMatches = navItems.filter(item =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleBookmarkToggle = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (isBookmarked(item.to)) {
      removeBookmark(item.to);
    } else {
      addBookmark(item);
    }
  };

  // Debounced search across files + jobs
  const runSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults({ files: [], jobs: [] });
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const [filesRes, jobsRes] = await Promise.allSettled([
        fileService.getAll(),
        cloneService.getAll(),
      ]);

      const q = query.toLowerCase();

      const files = (filesRes.status === 'fulfilled' ? filesRes.value.data.files || [] : [])
        .filter(f => !f.isDeleted && f.originalName?.toLowerCase().includes(q));

      const jobs = (jobsRes.status === 'fulfilled' ? jobsRes.value.data.jobs || [] : [])
        .filter(j => {
          const name = j.fileId?.originalName || '';
          return name.toLowerCase().includes(q);
        });

      setSearchResults({ files: files.slice(0, 5), jobs: jobs.slice(0, 5) });
      setShowDropdown(true);
    } catch {
      setSearchResults({ files: [], jobs: [] });
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (search.trim().length >= 2) {
      debounceRef.current = setTimeout(() => runSearch(search), 350);
    } else {
      setShowDropdown(false);
      setSearchResults({ files: [], jobs: [] });
    }
    return () => clearTimeout(debounceRef.current);
  }, [search, runSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        searchRef.current && !searchRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clearSearch = () => {
    setSearch('');
    setShowDropdown(false);
    setSearchResults({ files: [], jobs: [] });
  };

  const handleResultClick = (path) => {
    clearSearch();
    onClose();
    navigate(path);
  };

  const hasSearchResults = searchResults.files.length > 0 || searchResults.jobs.length > 0;
  const isActiveSearch = search.trim().length >= 2;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 sidebar z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-lg font-bold shadow-lg glow-blue shrink-0">
              🤖
            </div>
            <div>
              <h1 className="text-xs font-bold gradient-text leading-tight">AI-Powered Optimization</h1>
              <p className="text-xs text-slate-400 font-medium">DB Cloning System</p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-3 pt-3 pb-1 relative" ref={searchRef}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              {isSearching ? '⏳' : '🔍'}
            </span>
            <input
              id="sidebar-search"
              type="text"
              placeholder="Search files, jobs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') clearSearch();
              }}
              onFocus={() => { if (isActiveSearch && hasSearchResults) setShowDropdown(true); }}
              autoComplete="off"
              spellCheck={false}
              className="w-full pl-8 pr-8 py-2 rounded-xl text-xs bg-white/5 border border-white/8 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 focus:bg-primary-500/5 transition-all"
            />
            <button
              onClick={clearSearch}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-500 hover:text-white text-xs transition-all ${search ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >✕</button>
          </div>

          {/* Search results dropdown */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden shadow-2xl border border-white/10 max-h-72 overflow-y-auto"
              style={{ background: '#13141f', zIndex: 9999 }}
            >
              {!hasSearchResults ? (
                <div className="p-4 text-center">
                  <p className="text-slate-500 text-xs">No files or jobs match "{search}"</p>
                </div>
              ) : (
                <>
                  {/* File results */}
                  {searchResults.files.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 pt-3 pb-1">Files</p>
                      {searchResults.files.map(file => (
                        <button
                          key={file._id}
                          onClick={() => handleResultClick('/upload')}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/6 transition-colors text-left"
                        >
                          <span className={`text-lg shrink-0 ${getFileTypeColor(file.fileType)}`}>
                            {getFileIcon(file.fileType)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{truncate(file.originalName, 28)}</p>
                            <p className="text-[10px] text-slate-500">{formatBytes(file.size)} · {file.fileType}</p>
                          </div>
                          <span className="text-[10px] text-slate-600 shrink-0">📤</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Job results */}
                  {searchResults.jobs.length > 0 && (
                    <div className={searchResults.files.length > 0 ? 'border-t border-white/5' : ''}>
                      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 pt-3 pb-1">Clone Jobs</p>
                      {searchResults.jobs.map(job => (
                        <button
                          key={job._id}
                          onClick={() => handleResultClick('/clone')}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/6 transition-colors text-left"
                        >
                          <span className={`text-lg shrink-0 ${getFileTypeColor(job.fileId?.fileType)}`}>
                            {getFileIcon(job.fileId?.fileType)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{truncate(job.fileId?.originalName || 'Unknown', 28)}</p>
                            <p className="text-[10px] text-slate-500 capitalize">{job.status} · {job.progress}%</p>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                            job.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>{job.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">

          {/* Main Pages */}
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 py-2">Pages</p>
          {pageMatches.length === 0 && !isActiveSearch ? (
            <p className="text-xs text-slate-600 px-4 py-2">No pages match "{search}"</p>
          ) : (
            (isActiveSearch ? navItems : pageMatches).map((item) => (
              <div key={item.to} className="relative">
                <NavLink
                  to={item.to}
                  onClick={() => { onClose(); clearSearch(); }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 pr-9 ${
                      isActive
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                </NavLink>
                {/* Bookmark star — always visible, dimmed when not bookmarked */}
                <button
                  id={`bookmark-${item.to.replace('/', '')}`}
                  onClick={(e) => handleBookmarkToggle(e, item)}
                  title={isBookmarked(item.to) ? 'Remove bookmark' : 'Add bookmark'}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-sm transition-all duration-150 ${
                    isBookmarked(item.to)
                      ? 'text-amber-400 hover:text-amber-300'
                      : 'text-slate-700 hover:text-amber-400 hover:bg-white/5'
                  }`}
                >
                  {isBookmarked(item.to) ? '★' : '☆'}
                </button>
              </div>
            ))
          )}

          {/* Bookmarks section - only page bookmarks (not file/job: bookmarks) */}
          {bookmarks.filter(b => !b.to.startsWith('job:')).length > 0 && !search && (
            <>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 pt-4 pb-2">Bookmarks</p>
              {bookmarks.filter(b => !b.to.startsWith('job:')).map(bm => (
                <div key={bm.to} className="relative group">
                  <NavLink
                    to={bm.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 pr-9 ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <span className="text-base shrink-0">{bm.icon}</span>
                    <span className="flex-1 truncate">{bm.label}</span>
                    <span className="text-amber-500 text-xs">★</span>
                  </NavLink>
                </div>
              ))}
            </>
          )}

          {/* Settings */}
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 pt-4 pb-2">Preferences</p>
          <button
            id="open-settings-btn"
            onClick={() => { setSettingsOpen(true); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <span className="text-base">⚙️</span>
            <span>Settings</span>
            <span className="ml-auto text-slate-600 text-xs">›</span>
          </button>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-white/5">
          <div className="glass-card p-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-sm font-bold shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            id="logout-btn"
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Settings slide-in panel */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};

export default Sidebar;
