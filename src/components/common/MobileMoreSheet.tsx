import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { NavigationTab } from '../dashboard/DashboardContainer';
import {
  Navigation,
  UserPlus,
  FileSpreadsheet,
  BarChart3,
  Users,
  Settings,
  User,
  LogOut,
  Sun,
  Moon,
  X,
  Search,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Building2,
  TrendingUp,
  MapPin
} from 'lucide-react';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  isOpen,
  onClose,
  currentTab,
  onTabChange,
}) => {
  const { authState, logout, themeMode, toggleTheme } = useAuth();
  const user = authState.user;
  const [searchQuery, setSearchQuery] = useState('');

  // Group 1: Daily Quick Actions / For You
  const forYouModules = [
    {
      id: 'gps_tracking' as NavigationTab,
      label: 'gps live',
      subtext: 'live tracking',
      icon: Navigation,
      badge: 'LIVE',
      badgeType: 'red_dot',
    },
    {
      id: 'references' as NavigationTab,
      label: 'references',
      subtext: 'dealer leads',
      icon: UserPlus,
      badge: 'LEADS',
      badgeType: 'pill',
    },
    {
      id: 'grievances' as NavigationTab,
      label: 'grievances',
      subtext: 'support tickets',
      icon: ShieldAlert,
      badge: 'TICKETS',
      badgeType: 'pill',
    },
    {
      id: 'reports' as NavigationTab,
      label: 'reports & logs',
      subtext: 'excel sheets',
      icon: FileSpreadsheet,
      badge: 'EXCEL',
      badgeType: 'pill',
    },
  ];

  // Group 2: Business & Operations
  const businessModules = [
    {
      id: 'analytics' as NavigationTab,
      label: 'analytics',
      subtext: 'sales metrics',
      icon: BarChart3,
      badge: 'STATS',
      badgeType: 'pill',
    },
    {
      id: 'customers' as NavigationTab,
      label: 'parties / shops',
      subtext: 'client directory',
      icon: Building2,
      badge: 'DIRECTORY',
      badgeType: 'pill',
    },
    {
      id: 'profile' as NavigationTab,
      label: 'my profile',
      subtext: 'account details',
      icon: User,
      badge: 'PROFILE',
      badgeType: 'pill',
    },
    ...(user?.role === 'Admin'
      ? [
          {
            id: 'users' as NavigationTab,
            label: 'user control',
            subtext: 'staff management',
            icon: ShieldCheck,
            badge: 'ADMIN',
            badgeType: 'pill_dark',
          },
        ]
      : []),
    {
      id: 'settings' as NavigationTab,
      label: 'settings',
      subtext: 'app config',
      icon: Settings,
      badge: 'CONFIG',
      badgeType: 'pill',
    },
  ];

  const filterItem = (item: { label: string; subtext: string }) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.label.toLowerCase().includes(q) || item.subtext.toLowerCase().includes(q);
  };

  const filteredForYou = forYouModules.filter(filterItem);
  const filteredBusiness = businessModules.filter(filterItem);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          {/* Subtle blurred backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          {/* CRED-style Bottom Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-10 w-full max-w-lg mx-auto max-h-[90dvh] bg-white dark:bg-[#0c0f17] rounded-t-[2rem] border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-15px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
          >
            {/* Top Pull Handle */}
            <div className="pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-9 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Header: Trending CRED Search Bar */}
            <div className="px-4 pt-1 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='search "reports, tracking, leads"'
                    className="w-full pl-8 pr-7 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/90 text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/40 font-medium transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Close Drawer Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-transform shrink-0"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable CRED explore content */}
            <div className="flex-1 overflow-y-auto px-4 py-1.5 space-y-4 custom-scrollbar overscroll-contain">
              {/* SECTION 1: FOR YOU */}
              {filteredForYou.length > 0 && (
                <div>
                  <div className="text-[9.5px] font-extrabold tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase mb-2.5 px-0.5">
                    FOR YOU
                  </div>

                  <div className="grid grid-cols-4 gap-y-3 gap-x-1.5">
                    {filteredForYou.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onTabChange(item.id);
                            onClose();
                          }}
                          className="flex flex-col items-center group active:scale-90 transition-transform"
                        >
                          {/* Circular CRED icon */}
                          <div
                            className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                              isActive
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md ring-2 ring-indigo-500/40'
                                : 'bg-slate-50 dark:bg-[#141824] text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-800 shadow-xs group-hover:border-slate-400'
                            }`}
                          >
                            <Icon className="w-5 h-5 stroke-[1.7]" />

                            {/* Red live pulse badge or micro pill */}
                            {item.badgeType === 'red_dot' ? (
                              <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-1 ring-white dark:ring-[#0c0f17]" />
                              </span>
                            ) : item.badge ? (
                              <span className="absolute -bottom-1 px-1 py-0.2 rounded-[3px] bg-slate-900 dark:bg-slate-100 text-[6.5px] font-black tracking-wider text-white dark:text-slate-900 shadow-xs border border-white/20 dark:border-black/20 uppercase">
                                {item.badge}
                              </span>
                            ) : null}
                          </div>

                          {/* Item Label */}
                          <span
                            className={`text-[10px] font-medium tracking-tight text-center mt-1.5 leading-tight ${
                              isActive
                                ? 'font-bold text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TRENDING PROMO / METRICS BANNER (CRED Style) */}
              {!searchQuery && (
                <div
                  onClick={() => {
                    onTabChange('analytics');
                    onClose();
                  }}
                  className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-100/90 via-orange-50 to-amber-50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-amber-200/80 dark:border-slate-800 p-2.5 sm:p-3 shadow-xs cursor-pointer active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[8.5px] font-black tracking-wider uppercase px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                          POPULAR PAINTS CRM
                        </span>
                      </div>
                      <h4 className="text-[11.5px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                        Live Field Routes &amp; Sales Targets
                      </h4>
                      <p className="text-[9.5px] text-slate-600 dark:text-slate-400 font-medium line-clamp-1">
                        Instant reporting, attendance &amp; order tracking
                      </p>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 dark:bg-indigo-500/20 text-amber-700 dark:text-indigo-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: OPERATIONS & MANAGEMENT */}
              {filteredBusiness.length > 0 && (
                <div>
                  <div className="text-[9.5px] font-extrabold tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase mb-2.5 px-0.5">
                    OPERATIONS &amp; UTILITIES
                  </div>

                  <div className="grid grid-cols-4 gap-y-3 gap-x-1.5">
                    {filteredBusiness.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onTabChange(item.id);
                            onClose();
                          }}
                          className="flex flex-col items-center group active:scale-90 transition-transform"
                        >
                          {/* Circular CRED icon */}
                          <div
                            className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                              isActive
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-md ring-2 ring-indigo-500/40'
                                : 'bg-slate-50 dark:bg-[#141824] text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-800 shadow-xs group-hover:border-slate-400'
                            }`}
                          >
                            <Icon className="w-5 h-5 stroke-[1.7]" />

                            {/* Micro badge pill */}
                            {item.badge ? (
                              <span
                                className={`absolute -bottom-1 px-1 py-0.2 rounded-[3px] text-[6.5px] font-black tracking-wider shadow-xs uppercase ${
                                  item.badgeType === 'pill_dark'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-white/20 dark:border-black/20'
                                }`}
                              >
                                {item.badge}
                              </span>
                            ) : null}
                          </div>

                          {/* Item Label */}
                          <span
                            className={`text-[10px] font-medium tracking-tight text-center mt-1.5 leading-tight ${
                              isActive
                                ? 'font-bold text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Actions: Theme & Sign Out */}
              <div className="pt-1 pb-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#141824] border border-slate-200/80 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 active:scale-95 transition-all shadow-xs"
                >
                  {themeMode === 'dark' ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                  <span>{themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center gap-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 active:scale-95 transition-all shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Developer Tag */}
              <div className="text-center pt-0.5 pb-4 text-[8.5px] font-mono font-bold tracking-widest text-slate-400 dark:text-slate-600 uppercase">
                POPULAR PAINTS &bull; FIELD SALES APP
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


