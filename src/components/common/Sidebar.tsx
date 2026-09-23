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
  Users,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Shield,
  Briefcase,
  Sparkles,
  Code2,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { motion } from 'motion/react';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  closeMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavGroup {
  title?: string;
  items: {
    id: NavigationTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
    adminOnly?: boolean;
    color?: string;
  }[];
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
  const isAdmin = user?.role === 'Admin';

  const navGroups: NavGroup[] = [
    {
      title: 'CORE & TARGETS',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-blue-500 to-indigo-600' },
        { id: 'target', label: 'Target Assignment', icon: Target, color: 'from-purple-500 to-indigo-600' },
      ],
    },
    {
      title: 'DAILY WORKFLOW',
      items: [
        { id: 'morning_plan', label: 'Morning Follow up', icon: Sun, color: 'from-amber-500 to-orange-500' },
        { id: 'evening_report', label: 'Evening Report', icon: Moon, color: 'from-indigo-500 to-sky-500' },
        { id: 'gps_tracking', label: 'GPS Tracking', icon: Navigation, color: 'from-emerald-500 to-teal-500' },
      ],
    },
    {
      title: 'SALES & CRM',
      items: [
        { id: 'references', label: 'References / Leads', icon: UserPlus, color: 'from-pink-500 to-rose-500' },
        { id: 'reports', label: 'Reports & Logs', icon: FileSpreadsheet, color: 'from-cyan-500 to-blue-500' },
        { id: 'analytics', label: 'Performance Analytics', icon: BarChart3, color: 'from-violet-500 to-purple-600' },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        ...(isAdmin
          ? [{ id: 'users' as NavigationTab, label: 'User Management', icon: Users, badge: 'New', color: 'from-blue-600 to-indigo-600' }]
          : []),
        { id: 'settings', label: 'System Settings', icon: Settings, color: 'from-slate-500 to-slate-700' },
      ],
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 transition-all duration-300 relative select-none shadow-sm">
      {/* Subtle Top Ambient Gradient */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/5 via-indigo-500/5 to-transparent blur-xl" />

      {/* Header with Logo and Collapse Toggle */}
      <div
        className={`p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center relative z-10 transition-all ${
          isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'
        }`}
      >
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2.5">
              <BrandLogo size="md" />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
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

      {/* Categorized Navigation Menu */}
      <nav className={`flex-1 overflow-y-auto space-y-4 slim-scrollbar relative z-10 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        {navGroups.map((group, groupIdx) => {
          if (group.items.length === 0) return null;

          return (
            <div key={groupIdx} className="space-y-1">
              {!isCollapsed && group.title && (
                <div className="px-3 pt-1 pb-1.5 text-[10px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  {group.title}
                </div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: isCollapsed ? 0 : 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onTabChange(item.id);
                      closeMobile();
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-2xl text-xs transition-all relative cursor-pointer group ${
                      isCollapsed ? 'justify-center p-2.5 my-1' : 'gap-3 px-3 py-2.5 my-0.5'
                    } ${
                      isActive
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 text-blue-900 dark:text-white font-extrabold border border-blue-200/80 dark:border-blue-800/80 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border border-transparent'
                    }`}
                  >
                    {/* Active Accent Bar */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActiveIndicator"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-blue-600 dark:bg-blue-400 shadow-sm shadow-blue-500"
                      />
                    )}

                    {/* Icon with Subtle Background Glow on Active */}
                    <div
                      className={`relative z-10 p-1.5 rounded-xl transition-all shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-200/60 dark:group-hover:bg-slate-700/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Label & Optional Badge */}
                    {!isCollapsed && (
                      <div className="relative z-10 truncate flex-1 flex items-center justify-between text-left">
                        <span className="truncate tracking-tight">{item.label}</span>
                        {item.badge && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-black uppercase rounded-full bg-blue-600 text-white shadow-xs">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div
        className={`border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 space-y-2 relative z-10 transition-all ${
          isCollapsed ? 'p-2' : 'p-3'
        }`}
      >
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`w-full flex items-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs ${
            isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
          }`}
        >
          <div className="flex items-center gap-2">
            {themeMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
            )}
            {!isCollapsed && <span>{themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {themeMode === 'dark' ? 'Dark' : 'Light'}
            </span>
          )}
        </button>

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          title="Logout"
          className={`w-full flex items-center rounded-2xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all group cursor-pointer shadow-2xs ${
            isCollapsed ? 'justify-center p-2.5' : 'justify-center gap-2 px-3 py-2'
          }`}
        >
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>

        {/* Developer Branding Signature */}
        <div className="pt-1 text-[9px] text-center text-slate-400 dark:text-slate-500 font-mono tracking-wider font-semibold truncate flex items-center justify-center gap-1">
          <Code2 className="w-3 h-3 text-blue-500 shrink-0" />
          <span>{isCollapsed ? 'DS' : 'DEVELOPED BY DEEPAK SAHU'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block h-screen sticky top-0 shrink-0 z-20 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
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

