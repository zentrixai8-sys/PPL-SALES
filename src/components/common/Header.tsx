import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavigationTab } from '../dashboard/DashboardContainer';
import { getIndianDateString, parseDDMMYYYYToDate } from '../../utils/dateUtils';
import {
  Bell,
  LogOut,
  User,
  Menu,
  Sparkles,
  Sun,
  Moon,
  UserX,
  Megaphone,
  Flame,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  toggleSidebarMobile: () => void;
  onToggleCollapseSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

const TAB_TITLES: Record<NavigationTab, string> = {
  dashboard: 'Dashboard',
  target: 'Target Goals',
  morning_plan: 'Morning Follow up',
  evening_report: 'Evening Report',
  gps_tracking: 'GPS Tracking',
  customers: 'Parties & Dealers',
  references: 'References',
  reports: 'Reports & Sheets',
  analytics: 'Sales Analytics',
  settings: 'App Settings',
  profile: 'My Profile',
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  toggleSidebarMobile,
  onToggleCollapseSidebar,
  isSidebarCollapsed,
}) => {
  const { 
    authState, 
    logout, 
    themeMode, 
    toggleTheme, 
    leaveRecords, 
    refreshLeaves, 
    activeNotice,
    refreshMorningPlans,
    refreshEveningReports,
    refreshGPSData,
    refreshReferences,
    showToast
  } = useAuth();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isHeaderRefreshing, setIsHeaderRefreshing] = useState(false);

  const handleHeaderSync = async () => {
    if (isHeaderRefreshing) return;
    setIsHeaderRefreshing(true);
    try {
      await Promise.all([
        refreshMorningPlans(),
        refreshEveningReports(),
        refreshGPSData(),
        refreshReferences(),
        refreshLeaves()
      ]);
      showToast('success', 'Data Synchronized', 'All reports & records are up to date!');
    } catch (err) {
      console.warn('Header sync notice:', err);
    } finally {
      setTimeout(() => setIsHeaderRefreshing(false), 500);
    }
  };

  const user = authState.user;
  const userInitial = (user?.userName || 'U').charAt(0).toUpperCase();

  // Keep leave data fresh so "on leave today" notifications stay accurate
  useEffect(() => {
    refreshLeaves();
  }, []);

  // Sales department persons currently on approved leave for today's date
  const todayStr = getIndianDateString();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const isOnLeaveToday = (l: typeof leaveRecords[number]): boolean => {
    const today = parseDDMMYYYYToDate(todayStr);
    const from = parseDDMMYYYYToDate(l.dateFrom);
    if (!today || !from) return false;

    let to = parseDDMMYYYYToDate(l.dateTo) || from;
    const spanDays = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) + 1;
    if (l.totalLeaveDays > 0 && spanDays > l.totalLeaveDays * 2 + 3) {
      to = new Date(from.getTime() + (Math.ceil(l.totalLeaveDays) - 1) * MS_PER_DAY);
    }

    return today >= from && today <= to;
  };

  const leaveNotifications = (leaveRecords || [])
    .filter(l => (l?.department || '').trim().toLowerCase() === 'sales')
    .filter(l => (l?.status || '').trim().toLowerCase() === 'approved')
    .filter(isOnLeaveToday)
    .map(l => ({
      id: `leave-${l?.id || Math.random()}`,
      title: `${l?.requestedBy || 'Sales Member'} is on Leave Today`,
      desc: l?.reason || `${l?.department || 'Team'} · ${l?.totalLeaveDays || ''} day(s) leave`,
      time: 'Today',
      icon: UserX,
      color: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
    }));

  return (
    <header className="sticky top-0 z-30 h-14 md:h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-3 md:px-6 flex items-center justify-between text-slate-800 dark:text-slate-100 transition-colors">
      {/* Left section: Mobile Brand / Tab title vs Desktop Hamburger & Live Status */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile View App Header Left */}
        <div className="flex lg:hidden items-center gap-2">
          <img
            src={themeMode === 'light' ? '/popular_paints_logo_dark.png' : '/popular_paints_logo.png'}
            alt="Popular Paints"
            className="h-7 w-auto object-contain"
          />
          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700" />
          <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[130px] sm:max-w-[200px]">
            {TAB_TITLES[currentTab] || 'Sales Portal'}
          </span>
        </div>

        {/* Desktop Sidebar Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapseSidebar}
          className="hidden lg:flex p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle Sidebar"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden lg:flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">
            System Online &amp; Synced
          </span>
        </div>
      </div>

      {/* Right Section: Notifications, Theme Switcher & User Profile */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Quick Sync/Refresh Button */}
        <button
          type="button"
          onClick={handleHeaderSync}
          disabled={isHeaderRefreshing}
          className="p-1.5 md:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
          title="Refresh All Data"
        >
          <RefreshCw className={`w-4 h-4 md:w-4.5 md:h-4.5 text-sky-500 transition-all ${isHeaderRefreshing ? 'animate-spin text-sky-600' : 'hover:rotate-45'}`} />
          <span className="hidden sm:inline text-sky-600 dark:text-sky-400 font-bold">Sync</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 md:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {themeMode === 'dark' ? (
            <>
              <Sun className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
              <span className="hidden sm:inline text-amber-300">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
              <span className="hidden sm:inline text-indigo-600 font-bold">Dark</span>
            </>
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="relative p-1.5 md:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 md:w-5 md:h-5" />
            {(leaveNotifications.length > 0 || (activeNotice && activeNotice.isActive)) && (
              <span className="absolute top-1 right-1 md:top-1.5 md:right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="fixed inset-x-3 top-16 md:absolute md:inset-auto md:right-0 md:top-auto md:mt-2 md:w-88 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-slate-800 dark:text-slate-200 max-h-[85vh] overflow-y-auto"
              >
                {/* Broadcast Notice from Admin if active */}
                {activeNotice && activeNotice.isActive && (
                  <div className="mb-4 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/80 via-sky-50/50 to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-950 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 rounded-md bg-indigo-600 text-white">
                          {activeNotice.priority === 'urgent' ? (
                            <Flame className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <Megaphone className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                          {activeNotice.priority === 'urgent' ? '🚨 Urgent Notice' : activeNotice.priority === 'important' ? '⭐ Important Notice' : '📢 Broadcast Notice'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(activeNotice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                      {activeNotice.title}
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed whitespace-pre-line bg-white/70 dark:bg-black/20 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800">
                      {activeNotice.message}
                    </p>
                    <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Posted by: <strong className="text-slate-700 dark:text-slate-300">{activeNotice.sender}</strong></span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Active Announcement</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-600" />
                    <span>Sales Team On Leave</span>
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-600 border border-sky-200 dark:border-sky-800 font-semibold">
                    {leaveNotifications.length} Active
                  </span>
                </div>

                <div className="space-y-2.5">
                  {leaveNotifications.length === 0 && (!activeNotice || !activeNotice.isActive) ? (
                    <p className="text-xs text-slate-500 text-center py-4">No notifications right now.</p>
                  ) : leaveNotifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2">No team members on leave today.</p>
                  ) : (
                    leaveNotifications.map((n) => {
                      const Icon = n.icon;
                      return (
                        <div
                          key={n.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-start gap-2.5"
                        >
                          <div className={`p-1.5 rounded-lg border ${n.color} shrink-0 mt-0.5`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{n.title}</h4>
                              <span className="text-[10px] text-slate-500">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.desc}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1 md:p-1.5 md:pr-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
          >
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl overflow-hidden bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs md:text-sm font-bold ring-2 ring-sky-500/30 shrink-0 shadow-sm">
              {user?.profileUrl ? (
                <img src={user.profileUrl} alt={user.userName} className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
            <div className="hidden md:block text-left leading-none">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">
                {user?.userName || 'User'}
              </div>
              <div className="text-[10px] text-sky-600 font-medium mt-0.5">
                {user?.role || 'Sales'}
              </div>
            </div>
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="fixed inset-x-3 top-16 md:absolute md:inset-auto md:right-0 md:top-auto md:mt-2 md:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-base font-bold ring-2 ring-sky-500/40 shrink-0">
                    {user?.profileUrl ? (
                      <img src={user.profileUrl} alt={user.userName} className="w-full h-full object-cover" />
                    ) : (
                      userInitial
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{user?.userName}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">ID: {user?.id}</p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-600 border border-sky-200 dark:border-sky-800/60 font-semibold">
                      Manager: {user?.manager}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onTabChange('profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                  >
                    <User className="w-4 h-4 text-sky-600" />
                    <span>My Profile &amp; Security</span>
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

