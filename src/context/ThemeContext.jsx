import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const readBookmarks = () => {
  try { return JSON.parse(localStorage.getItem('bookmarks') || '[]'); } catch { return []; }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en');
  const [bookmarks, setBookmarks] = useState(readBookmarks);

  // Cross-tab sync: when another tab writes to localStorage, update our state
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'bookmarks') setBookmarks(readBookmarks());
      if (e.key === 'theme') setTheme(e.newValue || 'dark');
      if (e.key === 'language') setLanguage(e.newValue || 'en');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Refresh bookmarks from localStorage whenever tab gains focus (e.g. switching tabs)
  useEffect(() => {
    const handleFocus = () => setBookmarks(readBookmarks());
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [theme]);

  useEffect(() => { localStorage.setItem('language', language); }, [language]);
  useEffect(() => { localStorage.setItem('bookmarks', JSON.stringify(bookmarks)); }, [bookmarks]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const addBookmark = (item) => {
    setBookmarks(prev => {
      if (prev.find(b => b.to === item.to)) return prev;
      return [...prev, item];
    });
  };

  const removeBookmark = (to) => {
    setBookmarks(prev => prev.filter(b => b.to !== to));
  };

  const isBookmarked = (to) => bookmarks.some(b => b.to === to);
  const refreshBookmarks = () => setBookmarks(readBookmarks());

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, language, setLanguage, bookmarks, addBookmark, removeBookmark, isBookmarked, refreshBookmarks }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export default ThemeContext;
