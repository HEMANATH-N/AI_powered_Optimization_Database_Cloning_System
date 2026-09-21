import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const toastStyles = {
  success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  error: 'bg-red-500/20 border-red-500/40 text-red-300',
  warning: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  info: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
};

const toastIcons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const Toast = ({ toast, onClose }) => (
  <div
    className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md mb-2 animate-fade-in cursor-pointer ${toastStyles[toast.type]}`}
    onClick={onClose}
    style={{ minWidth: '280px', maxWidth: '400px' }}
  >
    <span className="text-lg">{toastIcons[toast.type]}</span>
    <span className="text-sm font-medium flex-1">{toast.message}</span>
    <button className="opacity-60 hover:opacity-100 text-lg">&times;</button>
  </div>
);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export default ToastContext;
