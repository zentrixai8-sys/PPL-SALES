import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavigationTab } from '../dashboard/DashboardContainer';
import {
  LayoutDashboard,
  Target,
  Sun,
  Moon,
  Navigation,
  FileSpreadsheet,
  BarChart3,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Radio,
  User,
  Zap,
  Code2
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  closeMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  isOpenMobile,
  closeMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { authState, logout, themeMode, toggleTheme } = useAuth();
  const user = authState.user;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'target', label: 'Target Assignment', icon: Target },
    { id: 'morning_plan', label: 'Morning Follow up', icon: Sun },
    { id: 'evening_report', label: 'Evening Report', icon: Moon },
    { id: 'gps_tracking', label: 'GPS Tracking', icon: Navigation },
    { id: 'references', label: 'References / Leads', icon: UserPlus },
    { id: 'reports', label: 'Reports & Logs', icon: FileSpreadsheet },
    { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ] as const;

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800/90 text-slate-800 dark:text-slate-200 transition-all duration-300 relative select-none shadow-sm dark:shadow-2xl">
      {/* Top Ambient Glow */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-indigo-500/5 dark:from-indigo-500/10 to-transparent blur-xl" />

      {/* Brand & Logo Header */}
      <div className={`p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center relative z-10 ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2">
              <BrandLogo size="md" />
            </div>
            <div className="flex items-center gap-1">
              {/* Desktop Collapse Button */}
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={closeMobile}
                className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <BrandLogo variant="icon" size="sm" />
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-sky-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer mt-1"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* User Executive Profile Card */}
      <div className={`border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 relative z-10 ${isCollapsed ? 'p-2.5 flex justify-center' : 'p-3.5'}`}>
        {!isCollapsed ? (
          <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {user?.userName ? user.userName.substring(0, 2).toUpperCase() : 'PP'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {user?.userName || 'Executive User'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {user?.role === 'Admin' ? 'Administrator' : 'Sales Rep'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {user?.id}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative group cursor-pointer" title={`${user?.userName} (${user?.role})`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {user?.userName ? user.userName.substring(0, 2).toUpperCase() : 'PP'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 overflow-y-auto space-y-1.5 custom-scrollbar relative z-10 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        {!isCollapsed && (
          <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Navigation Menu
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <motion.button
              key={item.id}
              whileHover={{ x: isCollapsed ? 0 : 3, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onTabChange(item.id as NavigationTab);
                closeMobile();
              }}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-2xl text-xs transition-all relative cursor-pointer group ${
                isCollapsed
                  ? 'justify-center p-3'
                  : 'gap-3 px-3.5 py-2.5'
              } ${
                isActive
                  ? 'text-slate-950 dark:text-white font-bold'
                  : 'text-slate-700 dark:text-slate-300 font-semibold hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {/* Sliding Active Pill Background with Spring Physics */}
              {isActive && (
                <motion.div
                  layoutId="sidebarActivePill"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-2xl bg-sky-100/90 dark:bg-slate-800 border border-sky-300/80 dark:border-slate-700 shadow-xs"
                />
              )}

              {/* Left Accent Bar for Active Tab */}
              {isActive && (
                <motion.div
                  layoutId="sidebarActiveBar"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-sky-600 dark:bg-sky-400"
                />
              )}

              {/* Icon Container */}
              <div className={`relative z-10 p-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-sky-600 dark:bg-sky-500/20 text-white dark:text-sky-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-200/60 dark:group-hover:bg-slate-800'
              }`}>
                <Icon className="w-4 h-4 shrink-0" />
              </div>

              {/* Label */}
              {!isCollapsed && (
                <span className="relative z-10 truncate flex-1 tracking-tight">
                  {item.label}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer Controls: Theme Toggle & Logout */}
      <div className={`border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/40 space-y-2 relative z-10 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`w-full flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-xs ${
            isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
          }`}
        >
          <div className="flex items-center gap-2">
            {themeMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
            )}
            {!isCollapsed && <span>{themeMode === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {themeMode === 'dark' ? 'Dark' : 'Light'}
            </span>
          )}
        </button>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Logout"
          className={`w-full flex items-center rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all group cursor-pointer shadow-xs ${
            isCollapsed ? 'justify-center p-2.5' : 'justify-center gap-2 px-3 py-2'
          }`}
        >
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>

        {/* Developer Branding Footer */}
        <div className="pt-1 text-[9px] text-center text-slate-400 dark:text-slate-500 font-mono tracking-wider font-semibold truncate flex items-center justify-center gap-1">
          <Code2 className="w-3 h-3 text-indigo-500 shrink-0" />
          <span>{isCollapsed ? 'DS' : 'DEVELOPED BY DEEPAK SAHU'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block h-screen sticky top-0 shrink-0 z-20 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={closeMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 animate-in slide-in-from-left duration-300 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
