import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../common/Header';
import { NewsTickerBar } from '../common/NewsTickerBar';
import { Sidebar } from '../common/Sidebar';
import { MobileBottomNav } from '../common/MobileBottomNav';
import { MobileMoreSheet } from '../common/MobileMoreSheet';
import { AdminDashboard } from './AdminDashboard';
import { SalesDashboard } from './SalesDashboard';
import { TargetModule } from '../modules/TargetModule';
import { MorningPlanModule } from '../modules/MorningPlanModule';
import { EveningReportModule } from '../modules/EveningReportModule';
import { GPSTrackingModule } from '../modules/GPSTrackingModule';
import { CustomersModule } from '../modules/CustomersModule';
import { ReportsModule } from '../modules/ReportsModule';
import { AnalyticsModule } from '../modules/AnalyticsModule';
import { SettingsModule } from '../modules/SettingsModule';
import { UserProfileModule } from '../modules/UserProfileModule';
import { ReferencesModule } from '../modules/ReferencesModule';
import { UserManagementModule } from '../modules/UserManagementModule';
import { SalesAutoTracker } from './SalesAutoTracker';
import { RefreshCw, ArrowDown } from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'target'
  | 'morning_plan'
  | 'evening_report'
  | 'gps_tracking'
  | 'customers'
  | 'references'
  | 'reports'
  | 'analytics'
  | 'users'
  | 'settings'
  | 'profile';

export const DashboardContainer: React.FC = () => {
  const { 
    authState, 
    refreshMorningPlans, 
    refreshEveningReports, 
    refreshGPSData, 
    refreshReferences, 
    refreshLeaves, 
    showToast 
  } = useAuth();
  
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [isOpenMoreSheet, setIsOpenMoreSheet] = useState(false);
  const [isCollapsedSidebar, setIsCollapsedSidebar] = useState<boolean>(() => {
    return localStorage.getItem('sales_sidebar_collapsed') === 'true';
  });

  // Pull to refresh states
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  const handlePullRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshMorningPlans(),
        refreshEveningReports(),
        refreshGPSData(),
        refreshReferences(),
        refreshLeaves(),
      ]);
      showToast('success', 'Data Refreshed', 'Latest records synced successfully!');
    } catch (err) {
      console.warn('Pull refresh notice:', err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setPullY(0);
      }, 500);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 2 && !isRefreshing) {
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0 && scrollRef.current && scrollRef.current.scrollTop <= 2) {
      const resistance = 0.45;
      const pull = Math.min(diff * resistance, 90);
      setPullY(pull);
    } else {
      setPullY(0);
    }
  };

  const onTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (pullY >= 50 && !isRefreshing) {
      setPullY(50);
      handlePullRefresh();
    } else {
      setPullY(0);
    }
  };

  const toggleCollapseSidebar = () => {
    setIsCollapsedSidebar(prev => {
      const next = !prev;
      localStorage.setItem('sales_sidebar_collapsed', String(next));
      return next;
    });
  };

  const role = authState.user?.role;

  const renderActiveModule = () => {
    switch (currentTab) {
      case 'dashboard':
        return role === 'Admin' ? (
          <AdminDashboard onNavigate={setCurrentTab} />
        ) : (
          <SalesDashboard onNavigate={setCurrentTab} />
        );
      case 'target':
        return <TargetModule />;
      case 'morning_plan':
        return <MorningPlanModule />;
      case 'evening_report':
        return <EveningReportModule />;
      case 'gps_tracking':
        return <GPSTrackingModule />;
      case 'customers':
        return <CustomersModule />;
      case 'reports':
        return <ReportsModule />;
      case 'analytics':
        return <AnalyticsModule />;
      case 'settings':
        return <SettingsModule />;
      case 'profile':
        return <UserProfileModule />;
      case 'references':
        return <ReferencesModule />;
      case 'users':
        return <UserManagementModule />;
      default:
        return role === 'Admin' ? (
          <AdminDashboard onNavigate={setCurrentTab} />
        ) : (
          <SalesDashboard onNavigate={setCurrentTab} />
        );
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row selection:bg-sky-500 selection:text-white transition-colors">
      {/* Desktop Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        isOpenMobile={isOpenMobileSidebar}
        closeMobile={() => setIsOpenMobileSidebar(false)}
        isCollapsed={isCollapsedSidebar}
        onToggleCollapse={toggleCollapseSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <Header
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          toggleSidebarMobile={() => setIsOpenMoreSheet(true)}
          onToggleCollapseSidebar={toggleCollapseSidebar}
          isSidebarCollapsed={isCollapsedSidebar}
        />

        {/* Real-time Broadcast Marquee News Ticker */}
        <NewsTickerBar />

        {/* Pull to Refresh Animated Indicator */}
        <AnimatePresence>
          {(pullY > 0 || isRefreshing) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: isRefreshing ? 48 : pullY, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="w-full flex items-center justify-center overflow-hidden bg-slate-100/90 dark:bg-slate-900/90 border-b border-sky-500/20 text-sky-600 dark:text-sky-400 z-20 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                <RefreshCw
                  className={`w-4 h-4 ${
                    isRefreshing
                      ? 'animate-spin text-sky-500'
                      : pullY >= 50
                      ? 'text-emerald-500 rotate-180 transition-transform'
                      : 'text-sky-500'
                  }`}
                  style={{
                    transform: isRefreshing ? undefined : `rotate(${pullY * 3.6}deg)`
                  }}
                />
                <span>
                  {isRefreshing
                    ? 'Syncing latest data...'
                    : pullY >= 50
                    ? 'Release to refresh'
                    : 'Pull down to refresh'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={scrollRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex-1 min-h-0 overflow-y-auto relative overscroll-y-contain touch-pan-y"
        >
          <main className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-28 lg:pb-12">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderActiveModule()}
            </motion.div>
          </main>
        </div>

        {/* Mobile Bottom App Navigation */}
        <MobileBottomNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setIsOpenMoreSheet(false);
          }}
          onOpenMore={() => setIsOpenMoreSheet(true)}
          isMoreOpen={isOpenMoreSheet}
        />

        {/* Mobile "More Apps" Action Sheet */}
        <MobileMoreSheet
          isOpen={isOpenMoreSheet}
          onClose={() => setIsOpenMoreSheet(false)}
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setIsOpenMoreSheet(false);
          }}
        />

        {/* Desktop Footer */}
        <footer className="hidden lg:block w-full shrink-0 border-t border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md py-3 z-10">
          <div className="max-w-7xl mx-auto px-4 flex justify-center items-center overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ 
                opacity: 1, 
                y: 0 
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex items-center gap-2"
            >
              <motion.div
                animate={{ 
                  opacity: [0.5, 1, 0.5],
                  y: [0, -2, 0],
                  textShadow: [
                    "0px 0px 0px rgba(79,70,229,0)",
                    "0px 0px 12px rgba(79,70,229,0.6)",
                    "0px 0px 0px rgba(79,70,229,0)"
                  ]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="flex items-center gap-2 font-mono text-xs sm:text-sm tracking-[0.15em] font-extrabold text-indigo-600 dark:text-indigo-400"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 dark:bg-indigo-500"></span>
                </span>
                <span>DEVELOPED BY DEEPAK SAHU</span>
                <span className="text-indigo-400 font-bold ml-1">|</span>
              </motion.div>
            </motion.div>
          </div>
        </footer>
      </div>
    </div>
  );
};


