import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrandColorBar } from '../common/BrandLogo';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Load remembered ID if available
  useEffect(() => {
    const savedId = localStorage.getItem('sales_reporting_remember_id');
    if (savedId) {
      setId(savedId);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !password.trim()) {
      setErrorMessage('Please enter both User ID and Password.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login(id, password, rememberMe);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid ID or Password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100 flex items-center justify-center p-4 md:p-6 overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Animated Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-36 -left-36 w-[30rem] h-[30rem] bg-blue-600/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.25, 0.45, 0.25],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-1/2 -right-36 w-[32rem] h-[32rem] bg-indigo-600/25 rounded-full blur-3xl"
        />
      </div>

      {/* Main Login Card - Inspired by standard modern mobile/web layout */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md bg-white text-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-950/70 overflow-hidden border border-slate-100"
      >
        {/* Top Wavy Liquid Blue Header Banner */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 text-white pt-10 pb-16 px-8 overflow-hidden">
          {/* Decorative fluid wave overlay */}
          <svg
            className="absolute bottom-0 left-0 right-0 w-full h-16 text-white preserve-3d"
            viewBox="0 0 500 150"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 C150,90 350,-40 500,60 L500,150 L0,150 Z"
              fill="currentColor"
            />
          </svg>

          {/* Glowing accent circle */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">
              Welcome Back,
            </p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-1 text-white">
              Log In!
            </h1>
          </div>
        </div>

        {/* Center Popular Paints Brand Logo & Form Body */}
        <div className="px-8 pb-10 pt-2 -mt-4 relative z-10 bg-white">
          {/* Popular Paints Logo Container */}
          <div className="text-center mb-6">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/20 mb-3 border border-slate-800 max-w-xs w-full"
            >
              <img
                src="/popular_paints_logo.png"
                alt="Popular Paints &amp; Chemicals"
                className="h-12 w-auto max-w-full object-contain drop-shadow-md"
              />
            </motion.div>

            <div className="flex items-center justify-center gap-2 mb-1">
              <BrandColorBar />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Sales CRM Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Making Every Wall A Masterpiece
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* User ID Input Field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                User ID / Employee ID
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Enter your User ID"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-all text-sm font-medium"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-all text-sm font-medium"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5 px-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 transition-colors select-none font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 rounded-sm"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Error Message Box */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
                  <p className="flex-1 font-semibold">{errorMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Primary Action Button - Curved Pill Button */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-sm rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Authenticating Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Log in</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-slate-800 shadow-2xl relative border border-slate-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Reset Password</h3>
                  <p className="text-xs text-slate-500">Security Notice</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">
                Passwords are authenticated directly against the secure database system.
                Please contact your Sales Manager or Administrator to update your password.
              </p>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs font-mono text-slate-600 mb-5">
                Support Domain: Popular Paints CRM<br />
                Admin Contact: info@popularpaints.com
              </div>

              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl text-xs transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
