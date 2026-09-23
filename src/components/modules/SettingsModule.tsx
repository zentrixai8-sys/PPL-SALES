import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { APPS_SCRIPT_URL } from '../../services/api';
import { 
  Settings, 
  Palette, 
  Sun, 
  Moon, 
  Megaphone, 
  Send, 
  Trash2, 
  AlertTriangle, 
  Flame, 
  Info, 
  Sparkles,
  Radio
} from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const { 
    showToast, 
    themeMode, 
    toggleTheme, 
    authState, 
    activeNotice, 
    broadcastNotice, 
    clearNotice 
  } = useAuth();

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticePriority, setNoticePriority] = useState<'urgent' | 'important' | 'info'>('important');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const isAdmin = authState.user?.role === 'Admin';

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeMessage.trim()) {
      showToast('error', 'Fields Required', 'Please enter both a title and message for the notice.');
      return;
    }

    setIsBroadcasting(true);
    try {
      await broadcastNotice({
        title: noticeTitle.trim(),
        message: noticeMessage.trim(),
        priority: noticePriority,
      });
      setNoticeTitle('');
      setNoticeMessage('');
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border border-slate-200 dark:border-slate-800 flex items-center gap-3 sm:gap-4 shadow-sm">
        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-sky-600 shrink-0">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">System Settings & Controls</h1>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure application theme, broadcast company notices, and manage live news bar
          </p>
        </div>
      </div>

      {/* Admin Broadcast Announcement & Live News Bar Control */}
      {isAdmin && (
        <div className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-lg shadow-indigo-500/5 space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Send Broadcast Notice</span>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold uppercase tracking-wider">
                    Admin
                  </span>
                </h2>
                <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
                  Notice likhein jo sabhi sales rep ko Notification Bell aur top screen News Bar me realtime run ho
                </p>
              </div>
            </div>
          </div>

          {/* Active Notice Status / Clear Card */}
          {activeNotice && activeNotice.isActive ? (
            <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                    Live Broadcast Active Now
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearNotice}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Broadcast</span>
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900/90 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    activeNotice.priority === 'urgent' 
                      ? 'bg-rose-600 text-white' 
                      : activeNotice.priority === 'important' 
                      ? 'bg-amber-500 text-slate-950' 
                      : 'bg-sky-600 text-white'
                  }`}>
                    {activeNotice.priority}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {activeNotice.title}
                  </h4>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-line">
                  {activeNotice.message}
                </p>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                  Sent by: {activeNotice.sender} • {new Date(activeNotice.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>No active broadcast notice currently running.</span>
              <span className="text-[11px] font-semibold text-slate-400">Idle</span>
            </div>
          )}

          {/* Broadcast Composer Form */}
          <form onSubmit={handleBroadcast} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Notice Title / Headline <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. URGENT: Monthly Target Review Meeting at 5:00 PM"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Notice Message / Announcement Details <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Type your notice description here. All sales executives will see this running on their screen and inside their notification panel..."
                value={noticeMessage}
                onChange={(e) => setNoticeMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <label 
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  noticePriority === 'urgent'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  checked={noticePriority === 'urgent'}
                  onChange={() => setNoticePriority('urgent')}
                  className="hidden"
                />
                <Flame className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="text-xs">
                  <div>Urgent (Red)</div>
                </div>
              </label>

              <label 
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  noticePriority === 'important'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  checked={noticePriority === 'important'}
                  onChange={() => setNoticePriority('important')}
                  className="hidden"
                />
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="text-xs">
                  <div>Important (Gold)</div>
                </div>
              </label>

              <label 
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  noticePriority === 'info'
                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-700 dark:text-sky-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  checked={noticePriority === 'info'}
                  onChange={() => setNoticePriority('info')}
                  className="hidden"
                />
                <Megaphone className="w-4 h-4 text-sky-500 shrink-0" />
                <div className="text-xs">
                  <div>Info / Update</div>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={isBroadcasting}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-700 hover:from-indigo-500 hover:to-sky-500 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 text-sm transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{isBroadcasting ? 'Broadcasting Notice...' : 'Broadcast Notice To All Reps & Live News Bar'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Appearance & Theme Setting */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Application Theme & Appearance</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold uppercase">
            {themeMode} Mode
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 gap-4">
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Light / Dark Color Theme</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Switch between High-Contrast Dark Mode and Crisp Light Mode
            </p>
          </div>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md cursor-pointer shrink-0"
          >
            {themeMode === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-300" />
                <span>Switch to Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-100" />
                <span>Switch to Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

