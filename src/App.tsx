import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardContainer } from './components/dashboard/DashboardContainer';
import { ToastContainer } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { motion } from 'motion/react';

const BrandLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a122c] to-slate-950 flex flex-col items-center justify-center text-slate-100 p-4 select-none relative overflow-hidden">
      {/* Background Animated Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.25, 0.45, 0.25],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/25 rounded-full blur-3xl"
        />
      </div>

      {/* Main Logo & Loader */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center text-center max-w-xs w-full"
      >
        {/* Pulsing & Floating Brand Logo Container */}
        <div className="relative mb-5">
          {/* Animated Glow Aura */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.35, 0.7, 0.35],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600 rounded-3xl blur-md opacity-50"
          />

          {/* Logo Container Badge */}
          <motion.div
            animate={{
              y: [0, -6, 0],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative px-6 py-4 bg-white rounded-3xl shadow-2xl shadow-blue-950/70 flex items-center justify-center border border-white/80"
          >
            <img
              src="/popular_paints_logo.png"
              alt="Popular Paints"
              className="h-12 sm:h-14 w-auto object-contain drop-shadow-sm"
            />
          </motion.div>
        </div>


        {/* Brand Title */}
        <h2 className="text-xl font-black tracking-tight text-white mb-0.5 drop-shadow-xs">
          Popular Paints
        </h2>
        <p className="text-[11px] font-bold text-sky-400 tracking-widest uppercase mb-5 font-mono">
          Sales CRM Portal
        </p>

        {/* Animated Brand Progress Bar Track */}
        <div className="w-48 h-1.5 bg-slate-800/80 rounded-full overflow-hidden mb-3 border border-slate-700/50 relative shadow-inner">
          <motion.div
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-full h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent rounded-full"
          />
        </div>

        {/* Loading Subtitle */}
        <p className="text-xs text-slate-400 font-medium tracking-wide animate-pulse">
          Connecting to Sales Reporting System...
        </p>
      </motion.div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { authState } = useAuth();

  if (authState.isLoading) {
    return <BrandLoadingScreen />;
  }

  return (
    <>
      <ToastContainer />
      {!authState.isAuthenticated ? <LoginPage /> : <DashboardContainer />}
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
