import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { deviceService } from '../services';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const FAQ_ITEMS = [
  { q: 'What is AI-Powered Optimization?', a: 'Our AI engine analyzes your files and applies smart compression algorithms to reduce size by 20–45% while preserving data integrity.' },
  { q: 'How does database cloning work?', a: 'Files are split into chunks and cloned in parallel with real-time progress tracking. You can pause, resume, or cancel at any time.' },
  { q: 'Is my data secure?', a: 'All uploads use JWT-authenticated endpoints. Files are stored server-side and only accessible to the authenticated user.' },
  { q: 'What file types are supported?', a: 'Images, videos, audio, PDFs, archives, and documents are all supported for upload and AI optimization.' },
  { q: 'How do I restore a deleted file?', a: 'Deleted files go to the Recycle Bin. Navigate there to restore or permanently delete them.' },
  { q: 'Can I use this on multiple devices?', a: 'Yes! Your account works across all devices. Check the "Connected Devices" tab in Settings to see active sessions.' },
];

const AI_KB = [
  { keys: ['upload', 'file', 'add'], reply: '📤 To upload a file, go to **Upload Files** in the sidebar. Drag & drop or click to browse. Supported types: images, videos, audio, PDFs, archives, and documents.' },
  { keys: ['clone', 'cloning', 'copy', 'start'], reply: '🔄 Go to **Clone Jobs** and click the "Clone" button next to any uploaded file. Cloning splits your file into 10 chunks processed in parallel with real-time progress.' },
  { keys: ['pause', 'resume', 'stop'], reply: '⏸️ On the **Clone Jobs** page, each running job has a **Pause** button. You can resume paused jobs at any time without losing progress.' },
  { keys: ['delete', 'remove', 'trash'], reply: '🗑️ Click the trash 🗑️ icon on any file card or clone job. Deleted files move to the **Recycle Bin** where you can restore or permanently remove them.' },
  { keys: ['recycle', 'bin', 'restore', 'recovery'], reply: '♻️ Go to **Recycle Bin** in the sidebar. Click **Restore** to recover a file, or **Delete Permanently** to remove it forever.' },
  { keys: ['analytics', 'stats', 'storage', 'metrics', 'chart'], reply: '📊 The **Analytics** page shows total files, storage used, space saved by AI compression, and interactive performance charts.' },
  { keys: ['secure', 'security', 'safe', 'auth', 'token', 'jwt'], reply: '🔐 The system uses JWT-based authentication. Your token expires in 7 days. All API requests require a valid Bearer token.' },
  { keys: ['compress', 'compression', 'optimize', 'optimization', 'size', 'reduce'], reply: '✨ The AI optimizer reduces file size by 20–45%. You can see savings under the "Space Saved" stat on your Dashboard.' },
  { keys: ['device', 'devices', 'session', 'connected'], reply: '💻 Open **Settings → Devices** to see all connected devices and sessions for your account. You can remove any device session from there.' },
  { keys: ['bookmark', 'star', 'favourite', 'favorite', 'save'], reply: '⭐ Click the ☆ star icon next to any page name in the sidebar to bookmark it. Bookmarked pages appear in the sidebar and the Bookmarks tab in Settings.' },
  { keys: ['dark', 'light', 'theme', 'mode'], reply: '🎨 Go to **Settings → Appearance** and toggle between Dark Mode and Light Mode. Your preference is saved automatically.' },
  { keys: ['language', 'lang'], reply: '🌐 Go to **Settings → Language** to choose from 8 available languages. The setting is saved locally.' },
  { keys: ['password', 'forgot', 'reset'], reply: '🔑 Password reset is not yet implemented. Please register a new account or contact your admin if you forgot your password.' },
  { keys: ['speed', 'slow', 'fast'], reply: '⚡ Cloning speed depends on file size. You can see real-time speed (MB/s) and ETA for each clone job on the Clone Jobs page.' },
  { keys: ['progress', 'percent', '%'], reply: '📈 Each clone job shows a live progress bar, chunk count, speed, and ETA. Click a job card to expand the historical progress chart.' },
  { keys: ['error', 'fail', 'failed', 'issue', 'problem', 'bug', 'not working', 'broken'], reply: '🔧 Common fixes:\n1. Refresh the page\n2. Check your internet connection\n3. Log out and back in to refresh your token\n4. If a clone fails, click "Clone" again to restart it.' },
  { keys: ['register', 'sign up', 'signup', 'account', 'create'], reply: '📝 Click **Create Account** on the login page. Enter your name, email, and password (min 6 chars). You\'ll be redirected to the dashboard immediately.' },
  { keys: ['login', 'sign in', 'signin'], reply: '🔑 Go to /login and enter your email & password. After authentication you\'ll be redirected to the Dashboard.' },
  { keys: ['chunk', 'chunks'], reply: '🧩 Files are split into chunks for parallel processing. A 1MB file uses ~10 chunks. You can see completed vs total chunks for each job on Clone Jobs.' },
];

function getAIReply(text) {
  const lower = text.toLowerCase();
  for (const entry of AI_KB) {
    if (entry.keys.some(k => lower.includes(k))) return entry.reply;
  }
  for (const faq of FAQ_ITEMS) {
    if (faq.q.toLowerCase().split(' ').some(w => w.length > 3 && lower.includes(w))) return `💡 ${faq.a}`;
  }
  return "🤔 I'm not sure about that. Try asking about: uploading files, cloning, deleting, the recycle bin, analytics, bookmarks, devices, or security. You can also browse the FAQ items above!";
}

const QUICK_QUESTIONS = [
  'How do I start cloning?',
  'What file types are supported?',
  'How do I restore a file?',
  'Is my data secure?',
];

const TABS = [
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'language', label: 'Language', icon: '🌐' },
  { id: 'devices', label: 'Devices', icon: '💻' },
  { id: 'bookmarks', label: 'Bookmarks', icon: '🔖' },
  { id: 'faq', label: 'FAQ & AI', icon: '🤖' },
];

const SettingsPanel = ({ isOpen, onClose }) => {
  const { theme, toggleTheme, language, setLanguage, bookmarks, removeBookmark, refreshBookmarks } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('appearance');
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: "👋 Hi! I'm your AI Assistant. Ask me anything about this system — uploading, cloning, deleting files, settings, or anything else!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Re-sync bookmarks from storage every time the panel opens
  useEffect(() => {
    if (isOpen && refreshBookmarks) refreshBookmarks();
    if (isOpen && activeTab === 'devices') fetchDevices();
  }, [isOpen, activeTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const fetchDevices = async () => {
    setDevicesLoading(true);
    try {
      const res = await deviceService.getAll();
      setDevices(res.data.devices || []);
    } catch { setDevices([]); }
    finally { setDevicesLoading(false); }
  };

  const handleRemoveDevice = async (id) => {
    try {
      await deviceService.remove(id);
      setDevices(prev => prev.filter(d => d._id !== id));
    } catch { }
  };

  const sendMessage = (text) => {
    if (!text.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: text.trim() }]);
    setChatInput('');
    setIsTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'ai', text: getAIReply(text) }]);
      setIsTyping(false);
    }, 700 + Math.random() * 400);
  };

  const renderText = (text) =>
    text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} className="text-white">{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md z-[70] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(15,15,30,0.98) 0%, rgba(20,20,40,0.98) 100%)',
          backdropFilter: 'blur(30px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-base">⚙️</div>
            <div>
              <h2 className="text-base font-bold text-white">Settings</h2>
              <p className="text-xs text-slate-500">Preferences &amp; Account</p>
            </div>
          </div>
          <button id="close-settings-btn" onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 border-b border-white/5 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} id={`settings-tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Theme</p>
              <div className="grid grid-cols-2 gap-3">
                <button id="theme-dark-btn" onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`relative p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/20 bg-white/3'}`}>
                  <div className="w-full h-16 rounded-lg mb-3 overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f0f1a,#1a1b2e)' }}>
                    <div className="p-2 space-y-1.5">
                      <div className="h-1.5 w-12 rounded bg-white/20" />
                      <div className="h-1.5 w-8 rounded bg-primary-500/60" />
                      <div className="h-1.5 w-10 rounded bg-white/10" />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-white">🌙 Dark Mode</p>
                  {theme === 'dark' && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center text-[9px] text-white font-bold">✓</div>}
                </button>
                <button id="theme-light-btn" onClick={() => theme !== 'light' && toggleTheme()}
                  className={`relative p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/20 bg-white/3'}`}>
                  <div className="w-full h-16 rounded-lg mb-3 overflow-hidden" style={{ background: 'linear-gradient(135deg,#f0f4ff,#e8eeff)' }}>
                    <div className="p-2 space-y-1.5">
                      <div className="h-1.5 w-12 rounded bg-slate-400/50" />
                      <div className="h-1.5 w-8 rounded bg-primary-500/70" />
                      <div className="h-1.5 w-10 rounded bg-slate-300/50" />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-white">☀️ Light Mode</p>
                  {theme === 'light' && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center text-[9px] text-white font-bold">✓</div>}
                </button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/4 border border-white/8">
                <div>
                  <p className="text-sm font-medium text-white">{theme === 'dark' ? '🌙 Dark Mode Active' : '☀️ Light Mode Active'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Click to switch theme</p>
                </div>
                <button id="theme-toggle-switch" onClick={toggleTheme}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${theme === 'dark' ? 'bg-primary-600' : 'bg-amber-400'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${theme === 'dark' ? 'left-0.5' : 'left-6'}`} />
                </button>
              </div>
            </div>
          )}

          {/* LANGUAGE */}
          {activeTab === 'language' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Select Language</p>
              {LANGUAGES.map(lang => (
                <button key={lang.code} id={`lang-${lang.code}`} onClick={() => setLanguage(lang.code)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                    language === lang.code ? 'bg-primary-500/15 border-primary-500/40 text-primary-300' : 'border-white/8 hover:border-white/15 hover:bg-white/4 text-slate-300'
                  }`}>
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-sm font-medium flex-1 text-left">{lang.label}</span>
                  {language === lang.code && <span className="text-xs bg-primary-500/30 text-primary-300 px-2 py-0.5 rounded-full">Active</span>}
                </button>
              ))}
            </div>
          )}

          {/* DEVICES */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Connected Devices</p>
                <button onClick={fetchDevices} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">🔄 Refresh</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{devices.filter(d => d.isActive).length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Active Now</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <p className="text-2xl font-bold text-blue-400">{devices.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Total Devices</p>
                </div>
              </div>
              {devicesLoading ? (
                <div className="py-8 text-center text-slate-500 text-sm">Loading devices…</div>
              ) : devices.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-4xl mb-2">💻</div>
                  <p className="text-slate-400 text-sm">No devices recorded yet</p>
                  <p className="text-slate-600 text-xs mt-1">Devices appear after your first API request</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map(device => (
                    <div key={device._id} className={`flex items-center gap-3 p-3.5 rounded-xl border ${device.isActive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/3 border-white/8'}`}>
                      <div className="text-2xl">{device.deviceName?.includes('Mobile') ? '📱' : '💻'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{device.deviceName || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{device.browser} · {device.os}</p>
                        <p className="text-xs mt-0.5">{device.isActive ? <span className="text-emerald-400">● Active</span> : `Last seen: ${new Date(device.lastSeen).toLocaleString()}`}</p>
                      </div>
                      <button id={`remove-device-${device._id}`} onClick={() => handleRemoveDevice(device._id)}
                        className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all shrink-0">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BOOKMARKS */}
          {activeTab === 'bookmarks' && (() => {
            const pageBookmarks = bookmarks.filter(b => !b.to.startsWith('job:'));
            const fileBookmarks = bookmarks.filter(b => b.to.startsWith('job:'));
            const hasAny = bookmarks.length > 0;
            return (
              <div className="space-y-5">
                {!hasAny ? (
                  <div className="py-10 text-center">
                    <div className="text-4xl mb-2">🔖</div>
                    <p className="text-slate-400 text-sm">No bookmarks yet</p>
                    <p className="text-slate-600 text-xs mt-1">Click ☆ on any sidebar page or file card to bookmark it</p>
                  </div>
                ) : (
                  <>
                    {/* Page shortcuts */}
                    {pageBookmarks.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Page Shortcuts</p>
                        <div className="space-y-2">
                          {pageBookmarks.map(bm => (
                            <div key={bm.to} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8 hover:border-primary-500/30 transition-all">
                              <span className="text-xl shrink-0">{bm.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">{bm.label}</p>
                                <p className="text-[10px] text-slate-500">{bm.to}</p>
                              </div>
                              <button id={`remove-bm-${bm.to.replace('/', '')}`} onClick={() => removeBookmark(bm.to)}
                                className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all shrink-0">Remove</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bookmarked files */}
                    {fileBookmarks.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Bookmarked Files</p>
                        <div className="space-y-2">
                          {fileBookmarks.map(bm => (
                            <div key={bm.to} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:border-amber-500/30 transition-all">
                              <span className="text-xl shrink-0">{bm.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{bm.label}</p>
                                <p className="text-[10px] text-amber-500/70">★ File Bookmark · Clone Jobs</p>
                              </div>
                              <button onClick={() => removeBookmark(bm.to)}
                                className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all shrink-0">Remove</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* FAQ & AI ASSISTANT */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              {/* FAQ Accordion */}
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Frequently Asked Questions</p>
              <div className="space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i} className="rounded-xl border border-white/8 overflow-hidden">
                    <button id={`faq-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/4 transition-all">
                      <span className="text-sm font-medium text-white pr-3">{item.q}</span>
                      <span className={`text-slate-400 text-lg transition-transform duration-200 shrink-0 ${openFaq === i ? 'rotate-180' : ''}`}>⌄</span>
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3 bg-white/2">{item.a}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* AI ASSISTANT CHAT */}
              <div className="rounded-2xl border border-primary-500/20 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(92,124,250,0.06) 0%, rgba(167,139,250,0.06) 100%)' }}>

                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8"
                  style={{ background: 'linear-gradient(135deg, rgba(92,124,250,0.12), rgba(167,139,250,0.12))' }}>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-sm shadow-lg">🤖</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">AI Assistant</p>
                    <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                      Always online · Ask me anything
                    </p>
                  </div>
                  <button onClick={() => setChatMessages([{ role: 'ai', text: "👋 Hi! I'm your AI Assistant. How can I help you today?" }])}
                    className="text-[10px] px-2 py-1 rounded-lg bg-white/8 text-slate-400 hover:text-white transition-all" title="Clear chat">
                    Clear
                  </button>
                </div>

                {/* Chat messages */}
                <div className="h-52 overflow-y-auto p-3 space-y-2.5">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'ai' && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-[10px] shrink-0 mt-0.5">🤖</div>
                      )}
                      <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'bg-primary-500/30 text-white rounded-br-sm'
                          : 'bg-white/8 text-slate-300 rounded-bl-sm'
                      }`}>
                        {msg.role === 'ai' ? renderText(msg.text) : msg.text}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold text-white">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-[10px] shrink-0">🤖</div>
                      <div className="bg-white/8 px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick question chips */}
                <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button key={i} id={`quick-q-${i}`} onClick={() => sendMessage(q)}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500/20 transition-all whitespace-nowrap">
                      {q}
                    </button>
                  ))}
                </div>

                {/* Chat input */}
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(chatInput); }} className="flex items-center gap-2 p-3 pt-0">
                  <input
                    id="ai-chat-input"
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask anything about the system…"
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white/8 border border-white/12 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500/50 focus:bg-primary-500/5 transition-all"
                    disabled={isTyping}
                  />
                  <button type="submit" id="ai-chat-send"
                    disabled={!chatInput.trim() || isTyping}
                    className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-sm disabled:opacity-40 hover:shadow-lg hover:shadow-primary-500/25 transition-all shrink-0">
                    ➤
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-sm font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
            </div>
            <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-slate-500' : 'bg-amber-400'}`} />
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
