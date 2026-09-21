import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ActivityHistoryPanel from './components/ActivityHistoryPanel';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import CloneJobs from './pages/CloneJobs';
import RecycleBin from './pages/RecycleBin';
import Analytics from './pages/Analytics';
import { fileService, cloneService, recycleBinService } from './services';

/* ── Count total activity events for badge ─────────────── */
async function fetchEventCount() {
  try {
    const [filesRes, jobsRes, binRes] = await Promise.all([
      fileService.getAll(),
      cloneService.getAll(),
      recycleBinService.getAll(),
    ]);
    const files = filesRes.data.files   || [];
    const jobs  = jobsRes.data.jobs     || [];
    const bin   = binRes.data.files     || [];
    // Count: 1 per upload + 1 per clone (any status) + 1 per deleted file
    return files.length + jobs.length + bin.length;
  } catch { return 0; }
}

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [historyOpen, setHistoryOpen]   = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  // Fetch badge count on mount
  useEffect(() => {
    fetchEventCount().then(setHistoryCount);
  }, []);

  // Refresh badge count after panel closes (may have changed)
  const handleClose = () => {
    setHistoryOpen(false);
    fetchEventCount().then(setHistoryCount);
  };

  return (
    <div className="min-h-screen animated-bg flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <Header
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
          onHistoryOpen={() => setHistoryOpen(true)}
          historyCount={historyCount}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Activity History Panel */}
      <ActivityHistoryPanel isOpen={historyOpen} onClose={handleClose} />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public */}
              <Route path="/login"    element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected */}
              <Route path="/dashboard" element={
                <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
              } />
              <Route path="/upload" element={
                <ProtectedRoute><Layout><Upload /></Layout></ProtectedRoute>
              } />
              <Route path="/clone" element={
                <ProtectedRoute><Layout><CloneJobs /></Layout></ProtectedRoute>
              } />
              <Route path="/recycle-bin" element={
                <ProtectedRoute><Layout><RecycleBin /></Layout></ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>
              } />

              {/* Redirects */}
              <Route path="/"  element={<Navigate to="/dashboard" replace />} />
              <Route path="*"  element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
