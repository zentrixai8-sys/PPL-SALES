import React from 'react';
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
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Grid
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

  const moreModules = [
    {
      id: 'gps_tracking' as NavigationTab,
      label: 'GPS Tracking',
      desc: 'Live location & field routes',
      icon: Navigation,
      gradient: 'from-teal-500/20 to-emerald-500/20',
      iconColor: 'text-teal-600 dark:text-teal-400',
      borderColor: 'border-teal-500/30',
      badge: 'Live',
      badgeColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30'
    },
    {
      id: 'references' as NavigationTab,
      label: 'References',
      desc: 'Leads & new dealer references',
      icon: UserPlus,
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-500/30',
      badge: 'Leads',
      badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30'
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Reports & Sheets',
      desc: 'Google Sheets & exported logs',
      icon: FileSpreadsheet,
      gradient: 'from-emerald-500/20 to-green-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-500/30',
      badge: 'Excel',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'analytics' as NavigationTab,
      label: 'Analytics',
      desc: 'Sales performance & graphs',
      icon: BarChart3,
      gradient: 'from-sky-500/20 to-blue-500/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      borderColor: 'border-sky-500/30',
      badge: 'Stats',
      badgeColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30'
    },
    {
      id: 'customers' as NavigationTab,
      label: 'Clients / Parties',
      desc: 'Directory of customers & shops',
      icon: Users,
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-500/30',
      badge: 'Directory',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
    },
    {
      id: 'profile' as NavigationTab,
      label: 'My Profile',
      desc: 'User account, DP & security',
      icon: User,
      gradient: 'from-indigo-500/20 to-violet-500/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      borderColor: 'border-indigo-500/30',
      badge: 'Account',
      badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30'
    },
    ...(user?.role === 'Admin'
      ? [
          {
            id: 'users' as NavigationTab,
            label: 'User Management',
            desc: 'Create & manage employee IDs',
            icon: Users,
            gradient: 'from-blue-500/20 to-indigo-500/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
            borderColor: 'border-blue-500/30',
            badge: 'Admin',
            badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
          },
        ]
      : []),
    {
      id: 'settings' as NavigationTab,
      label: 'App Settings',
      desc: 'System preferences & config',
      icon: Settings,
      gradient: 'from-slate-500/20 to-zinc-500/20',
      iconColor: 'text-slate-600 dark:text-slate-300',
      borderColor: 'border-slate-500/30',
      badge: 'Config',
      badgeColor: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30'
    },
  ];

  const userInitial = (user?.userName || 'U').charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          {/* Backdrop with smooth blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Native Bottom Sheet Drawer Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative z-10 w-full max-w-lg mx-auto max-h-[88dvh] bg-white dark:bg-slate-900 rounded-t-[2rem] border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
          >
            {/* Top Sheet Drag Handle & Title */}
            <div className="pt-3 pb-3 px-5 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md">
              <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <Grid className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      All Applications &amp; Features
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tap any module to open instantly
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 custom-scrollbar overscroll-contain">
              {/* User Profile Summary Card */}
              <div
                onClick={() => {
                  onTabChange('profile');
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/20 flex items-center justify-between shadow-xs cursor-pointer hover:border-sky-500/40 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-sky-500/20 shrink-0 ring-2 ring-sky-500/30">
                    {user?.profileUrl ? (
                      <img src={user.profileUrl} alt={user.userName} className="w-full h-full object-cover" />
                    ) : (
                      userInitial
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {user?.userName || 'User'}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold border border-sky-500/30 shrink-0">
                        {user?.role || 'Sales'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user?.role === 'Admin' ? 'Administrator' : 'Sales Representative'} · <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">{user?.id || 'CRM'}</span>
                    </p>
                  </div>
                </div>

                <div className="p-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-400 shrink-0 ml-2">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Module Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {moreModules.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onTabChange(item.id);
                        onClose();
                      }}
                      className={`relative p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 overflow-hidden ${
                        isActive
                          ? 'bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/60 ring-2 ring-sky-500/30 shadow-md'
                          : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200/90 dark:border-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Top icon and badge */}
                      <div className="flex items-center justify-between w-full">
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.gradient} border ${item.borderColor} ${item.iconColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isActive ? (
                          <span className="flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-full bg-sky-500 text-white font-bold shadow-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold border ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* Text details */}
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 font-normal">
                          {item.desc}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Theme & Session Control Bar */}
              <div className="pt-2 grid grid-cols-2 gap-2.5">
                {/* Theme Toggle Button */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-3 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-between active:scale-[0.97] transition-all"
                >
                  <div className="flex items-center gap-2">
                    {themeMode === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-500" />
                    )}
                    <span className="font-bold">{themeMode === 'dark' ? 'Light' : 'Dark'}</span>
                  </div>
                  <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold uppercase tracking-wider">
                    {themeMode}
                  </span>
                </button>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Developer branding tag & safe bottom spacing */}
              <div className="text-center pt-2 pb-6 text-[9.5px] font-mono font-extrabold tracking-wider text-slate-400 dark:text-slate-500">
                POPULAR PAINTS &bull; DEVELOPED BY DEEPAK SAHU
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

