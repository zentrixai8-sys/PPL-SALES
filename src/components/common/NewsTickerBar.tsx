import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, AlertTriangle, Info, Flame, X, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const NewsTickerBar: React.FC = () => {
  const { activeNotice, isNoticeDismissed, dismissNotice } = useAuth();

  if (!activeNotice || !activeNotice.isActive || isNoticeDismissed) {
    return null;
  }

  const getPriorityConfig = () => {
    switch (activeNotice.priority) {
      case 'urgent':
        return {
          barBg: 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-lg shadow-rose-900/20 border-b border-rose-400/40',
          badgeBg: 'bg-white text-rose-700 shadow-sm font-black',
          badgeIcon: <Flame className="w-3.5 h-3.5 animate-bounce text-rose-600" />,
          badgeLabel: 'URGENT NOTICE',
          pulseColor: 'bg-rose-300'
        };
      case 'important':
        return {
          barBg: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-900/20 border-b border-amber-400/40 font-medium',
          badgeBg: 'bg-slate-950 text-amber-400 shadow-sm font-black',
          badgeIcon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />,
          badgeLabel: 'IMPORTANT UPDATE',
          pulseColor: 'bg-amber-300'
        };
      case 'info':
      default:
        return {
          barBg: 'bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-sky-900/20 border-b border-sky-400/40',
          badgeBg: 'bg-white text-sky-800 shadow-sm font-black',
          badgeIcon: <Megaphone className="w-3.5 h-3.5 text-sky-600 animate-pulse" />,
          badgeLabel: 'ANNOUNCEMENT',
          pulseColor: 'bg-sky-300'
        };
    }
  };

  const config = getPriorityConfig();

  const formattedTime = () => {
    try {
      const d = new Date(activeNotice.createdAt);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const tickerItem = (
    <div className="flex items-center gap-6 px-4 shrink-0">
      <span className="font-extrabold tracking-wide uppercase text-xs sm:text-sm drop-shadow-sm">
        {activeNotice.title} :
      </span>
      <span className="text-xs sm:text-sm tracking-normal font-medium opacity-95">
        {activeNotice.message}
      </span>
      <span className="text-[11px] opacity-80 flex items-center gap-1 font-sans bg-black/15 px-2 py-0.5 rounded-full">
        <span>By {activeNotice.sender}</span>
        <span>•</span>
        <span>{formattedTime()}</span>
      </span>
      <span className="text-white/40 text-xs">✦</span>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full relative z-40 overflow-hidden select-none ${config.barBg}`}
      >
        <div className="flex items-center justify-between h-9 sm:h-10 px-2 sm:px-4">
          {/* Static Left Badge */}
          <div className="flex items-center gap-2 shrink-0 pr-3 z-10">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs tracking-wider uppercase ${config.badgeBg}`}>
              {config.badgeIcon}
              <span>{config.badgeLabel}</span>
            </div>
            <div className="hidden md:flex items-center gap-1 text-[11px] font-semibold opacity-90">
              <Sparkles className="w-3 h-3 animate-spin text-white/80" />
              <span>LIVE</span>
            </div>
          </div>

          {/* Running News Ticker Track */}
          <div className="flex-1 overflow-hidden relative mx-2 pause-on-hover mask-fade-edges">
            <div className="animate-ticker-marquee flex items-center whitespace-nowrap">
              {tickerItem}
              {tickerItem}
              {tickerItem}
              {tickerItem}
            </div>
          </div>

          {/* Dismiss Button */}
          <div className="flex items-center shrink-0 pl-2 z-10">
            <button
              onClick={dismissNotice}
              title="Dismiss banner"
              className="p-1 sm:p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
