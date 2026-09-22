import React from 'react';
import { motion } from 'motion/react';
import { NavigationTab } from '../dashboard/DashboardContainer';
import {
  LayoutDashboard,
  Sun,
  Moon,
  Target,
  Grid,
  Layers,
  Sparkles
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenMore: () => void;
  isMoreOpen: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenMore,
  isMoreOpen,
}) => {
  // Check if current tab belongs to the "More" secondary tabs
  const isMoreTabActive = [
    'gps_tracking',
    'customers',
    'references',
    'reports',
    'analytics',
    'settings',
    'profile',
  ].includes(currentTab);

  const mainNavItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Home',
      icon: LayoutDashboard,
      activeColor: 'text-sky-600 dark:text-sky-400',
      activeBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    },
    {
      id: 'morning_plan' as NavigationTab,
      label: 'Morning',
      icon: Sun,
      activeColor: 'text-amber-500 dark:text-amber-400',
      activeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'evening_report' as NavigationTab,
      label: 'Evening',
      icon: Moon,
      activeColor: 'text-blue-600 dark:text-blue-400',
      activeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'target' as NavigationTab,
      label: 'Target',
      icon: Target,
      activeColor: 'text-emerald-600 dark:text-emerald-400',
      activeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-around gap-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id && !isMoreOpen;

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.88 }}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-slate-900 dark:text-white font-bold'
                  : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
              }`}
            >
              {/* Active Indicator Top Pill */}
              {isActive && (
                <motion.div
                  layoutId="mobileNavPill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute -top-1.5 w-7 h-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 shadow-sm shadow-sky-500/50"
                />
              )}

              <div
                className={`relative p-1.5 rounded-xl transition-colors duration-200 ${
                  isActive ? item.activeBg : 'bg-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`} />
              </div>

              <span className="text-[10.5px] mt-0.5 tracking-tight line-clamp-1">
                {item.label}
              </span>
            </motion.button>
          );
        })}

        {/* More Tab / Sheet Trigger */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onOpenMore}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-200 ${
            isMoreOpen || isMoreTabActive
              ? 'text-slate-900 dark:text-white font-bold'
              : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
          }`}
        >
          {(isMoreOpen || isMoreTabActive) && (
            <motion.div
              layoutId="mobileNavPill"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="absolute -top-1.5 w-7 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-sm shadow-indigo-500/50"
            />
          )}

          <div
            className={`relative p-1.5 rounded-xl transition-colors duration-200 ${
              isMoreOpen || isMoreTabActive
                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                : 'bg-transparent'
            }`}
          >
            <Layers className={`w-5 h-5 transition-transform duration-200 ${isMoreOpen || isMoreTabActive ? 'scale-110' : 'scale-100'}`} />
            {isMoreTabActive && !isMoreOpen && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>

          <span className="text-[10.5px] mt-0.5 tracking-tight line-clamp-1">
            More
          </span>
        </motion.button>
      </div>
    </nav>
  );
};
