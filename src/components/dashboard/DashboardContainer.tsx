import React, { useState } from 'react';
import { motion } from 'motion/react';
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
import { UserProfileModule } from '../modules/UserProfileModule';
import { SettingsModule } from '../modules/SettingsModule';
import { ReferencesModule } from '../modules/ReferencesModule';
import { SalesAutoTracker } from './SalesAutoTracker';

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
  | 'settings'
  | 'profile';

export const DashboardContainer: React.FC = () => {
  const { authState } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [isOpenMoreSheet, setIsOpenMoreSheet] = useState(false);
  const [isCollapsedSidebar, setIsCollapsedSidebar] = useState<boolean>(() => {
    return localStorage.getItem('sales_sidebar_collapsed') === 'true';
  });

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

        <div className="flex-1 min-h-0 overflow-y-auto relative overscroll-contain">
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


