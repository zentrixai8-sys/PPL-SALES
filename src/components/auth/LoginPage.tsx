import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Eye,
  EyeOff,
  Loader2,
  HelpCircle,
  Check,
  ArrowRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ================= ONBOARDING SLIDES DATA =================
interface OnboardingSlide {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  image: string;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 1,
    badge: 'SALES STRATEGY & COLLABORATION',
    title: 'Smart Sales Discussions & Ideas',
    subtitle:
      'Empower your regional sales force with real-time target alignment, strategic market reviews, and actionable field insights.',
    image: '/onboarding_1.jpg',
  },
  {
    id: 2,
    badge: 'FIELD ORDERS & INVENTORY',
    title: 'Live Order Booking & Dispatch',
    subtitle:
      'Seamlessly record dealer orders, track distributor inventories, and sync live dispatch status directly from the field.',
    image: '/onboarding_2.jpg',
  },
  {
    id: 3,
    badge: 'GROWTH & REVENUE MILESTONES',
    title: 'Achieve & Celebrate High Targets',
    subtitle:
      'Monitor quarterly performance, unlock dealer milestone incentives, and scale your sales territory with ease.',
    image: '/onboarding_3.jpg',
  },
];

// ================= CONTINUOUS ANIMATED WATER WAVES =================

/**
 * Animated Horizontal Liquid Water Waves (for Mobile View & Top Header)
 * Continuous, multi-layered realistic flowing wave motion.
 */
const AnimatedHorizontalWaves: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none pointer-events-none z-10 -mb-[1px] h-12 sm:h-16 ${className}`}
  >
    <svg
      viewBox="0 0 1000 120"
      preserveAspectRatio="none"
      className="w-[200%] h-full relative"
    >
      {/* Layer 1: Deep Navy Blue Back Wave */}
      <motion.path
        d="M 0,38 C 125,8 125,68 250,38 C 375,8 375,68 500,38 C 625,8 625,68 750,38 C 875,8 875,68 1000,38 L 1000,120 L 0,120 Z"
        fill="#0d4cb5"
        fillOpacity="0.4"
        animate={{ x: [0, -500] }}
        transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
      />
      {/* Layer 2: Vibrant Sky Blue Mid Wave */}
      <motion.path
        d="M 0,54 C 125,26 125,82 250,54 C 375,26 375,82 500,54 C 625,26 625,82 750,54 C 875,26 875,82 1000,54 L 1000,120 L 0,120 Z"
        fill="#60a5fa"
        fillOpacity="0.55"
        animate={{ x: [-500, 0] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'linear' }}
      />
      {/* Layer 3: Crisp Pure White Front Wave */}
      <motion.path
        d="M 0,70 C 125,46 125,94 250,70 C 375,46 375,94 500,70 C 625,46 625,94 750,70 C 875,46 875,94 1000,70 L 1000,120 L 0,120 Z"
        fill="#ffffff"
        animate={{ x: [0, -500] }}
        transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
      />
    </svg>
  </div>
);

/**
 * Animated Vertical Liquid Water Waves (for Desktop Split View)
 * Continuous vertical fluid wave ripple between blue and white panels.
 */
const AnimatedVerticalWaves: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`hidden md:block absolute top-0 bottom-0 right-0 w-20 lg:w-24 pointer-events-none z-10 translate-x-[1px] overflow-hidden ${className}`}
  >
    <svg
      viewBox="0 0 120 1200"
      preserveAspectRatio="none"
      className="w-full h-[200%]"
    >
      {/* Layer 1: Dark Blue Wave */}
      <motion.path
        d="M 0,0 C 45,150 -15,150 25,300 C 65,450 5,450 25,600 C 45,750 -15,750 25,900 C 65,1050 5,1050 25,1200 L 120,1200 L 120,0 Z"
        fill="#0d4cb5"
        fillOpacity="0.4"
        animate={{ y: [0, -600] }}
        transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
      />
      {/* Layer 2: Sky Blue Wave */}
      <motion.path
        d="M 25,0 C 70,150 10,150 50,300 C 90,450 30,450 50,600 C 70,750 10,750 50,900 C 90,1050 30,1050 50,1200 L 120,1200 L 120,0 Z"
        fill="#60a5fa"
        fillOpacity="0.55"
        animate={{ y: [-600, 0] }}
        transition={{ repeat: Infinity, duration: 8.5, ease: 'linear' }}
      />
      {/* Layer 3: Pure White Wave */}
      <motion.path
        d="M 50,0 C 95,150 35,150 75,300 C 115,450 55,450 75,600 C 95,750 35,750 75,900 C 115,1050 55,1050 75,1200 L 120,1200 L 120,0 Z"
        fill="#ffffff"
        animate={{ y: [0, -600] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
      />
    </svg>
  </div>
);

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  // Screen View State: 'onboarding' -> 'login'
  const [currentView, setCurrentView] = useState<'onboarding' | 'login'>('onboarding');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Login Form States
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

  // Slide Auto-play timer
  useEffect(() => {
    if (currentView !== 'onboarding') return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % ONBOARDING_SLIDES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [currentView]);

  const handleNextSlide = () => {
    if (currentSlideIndex < ONBOARDING_SLIDES.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    } else {
      setCurrentView('login');
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

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

  const currentSlide = ONBOARDING_SLIDES[currentSlideIndex];

  return (
    <div className="min-h-screen w-full bg-[#d6dbe4] text-slate-900 flex items-center justify-center p-2 sm:p-6 lg:p-10 select-none overflow-x-hidden">
      <AnimatePresence mode="wait">
        {/* =========================================================================
            SCREEN 1: FULL-IMAGE ISOMETRIC ONBOARDING TOUR (CLEAN WHITE AESTHETIC)
        ========================================================================= */}
        {currentView === 'onboarding' ? (
          <motion.div
            key="onboarding-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.96 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md md:max-w-4xl bg-white rounded-[32px] md:rounded-[40px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.22)] overflow-hidden flex flex-col md:flex-row relative border border-slate-100/80 min-h-[640px] md:min-h-[580px]"
          >
            {/* Top Bar (Brand Header Badge + Skip Button) */}
            <div className="absolute top-0 left-0 right-0 z-30 p-4 sm:p-5 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/50 text-white shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[11px] font-bold tracking-wider uppercase">
                  Popular Paints CRM
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold tracking-wide transition-all border border-slate-300 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
              >
                Skip Tour
              </button>
            </div>

            {/* Left / Top Section: FULL ISOMETRIC ILLUSTRATION (No Dark Blue Box) */}
            <div className="w-full md:w-[55%] bg-gradient-to-b from-slate-50 via-white to-slate-100/60 p-6 sm:p-8 pt-16 md:pt-16 flex flex-col justify-center items-center relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-100">
              {/* Subtle Ambient Radial Highlight */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Full Image Container with Smooth Fade / Scale Animation */}
              <div className="w-full h-full flex items-center justify-center relative z-10 py-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlideIndex}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.4 }}
                    className="w-full flex items-center justify-center p-2"
                  >
                    <img
                      src={currentSlide.image}
                      alt={currentSlide.title}
                      className="w-full max-w-[340px] md:max-w-[420px] max-h-[290px] md:max-h-[360px] object-contain drop-shadow-xl rounded-2xl"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Right / Bottom Content Area: Slide Text, Dots & Navigation */}
            <div className="w-full md:w-[45%] bg-white p-6 sm:p-8 md:p-10 flex flex-col justify-between relative z-20">
              <div className="my-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlideIndex}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.35 }}
                    className="text-center md:text-left"
                  >
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-extrabold tracking-wider uppercase mb-3 border border-blue-100 shadow-2xs">
                      {currentSlide.badge}
                    </span>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
                      {currentSlide.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mt-3 max-w-sm mx-auto md:mx-0">
                      {currentSlide.subtitle}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Bottom Interactive Controls */}
              <div className="pt-6 border-t border-slate-100">
                {/* Pagination Indicator Dots */}
                <div className="flex items-center justify-center md:justify-start gap-2 mb-6">
                  {ONBOARDING_SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === currentSlideIndex
                          ? 'w-8 bg-blue-600'
                          : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Primary Action Button & Navigation */}
                <div className="flex items-center gap-3">
                  {currentSlideIndex > 0 && (
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      className="p-2.5 rounded-full border border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                      title="Previous slide"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleNextSlide}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>
                      {currentSlideIndex === ONBOARDING_SLIDES.length - 1
                        ? 'Get Started • Log In'
                        : 'Next Feature'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* =========================================================================
              SCREEN 2: LOGIN CREDENTIALS FORM (ROYAL BLUE + WATER WAVE ANIMATION)
          ========================================================================= */
          <motion.div
            key="login-screen"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md md:max-w-4xl bg-white rounded-[32px] md:rounded-[40px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.2)] overflow-hidden flex flex-col md:flex-row relative border border-slate-100/60"
          >
            {/* ================= LEFT SECTION (ROYAL BLUE GRADIENT) ================= */}
            <div className="w-full md:w-[44%] bg-gradient-to-b from-[#1b68d6] via-[#1457cb] to-[#0c44b0] text-white p-6 sm:p-8 md:p-10 flex flex-col justify-between items-center text-center relative overflow-hidden shrink-0 min-h-[220px] md:min-h-[520px]">
              {/* Back to Onboarding Tour Button */}
              <button
                type="button"
                onClick={() => setCurrentView('onboarding')}
                className="absolute top-4 left-4 z-30 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-all border border-white/20 cursor-pointer shadow-sm"
                title="View onboarding tour"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Ambient Glows */}
              <div className="absolute -top-20 -left-20 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />

              {/* Top Greeting */}
              <div className="relative z-10 w-full pt-1 md:pt-4">
                <p className="text-white/95 text-sm md:text-base font-normal tracking-wide">
                  Welcome to
                </p>
              </div>

              {/* Center Brand Identity */}
              <div className="relative z-10 my-auto py-2 md:py-6 flex flex-col items-center">
                {/* White Circular Badge with smooth floating animation */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.05 }}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white shadow-xl shadow-blue-950/30 flex items-center justify-center p-3.5 mb-3 md:mb-4"
                >
                  <img
                    src="/popular_paints_logo.png"
                    alt="Popular Paints"
                    className="h-10 md:h-12 w-auto object-contain"
                  />
                </motion.div>

                {/* App Title */}
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
                  Popular Paints
                </h1>
                <p className="text-[11px] md:text-xs font-bold text-blue-200 uppercase tracking-widest mt-1">
                  Sales CRM Portal
                </p>

                {/* Subtitle (Desktop) */}
                <p className="text-xs text-blue-100/85 leading-relaxed max-w-[250px] mx-auto mt-4 hidden md:block">
                  Streamlined daily field reporting, lead tracking, and real-time sales intelligence.
                </p>
              </div>

              {/* Bottom Tag (Desktop) */}
              <div className="relative z-10 text-[9px] md:text-[10px] text-white/50 tracking-widest uppercase font-semibold pb-1 hidden md:block">
                POPULAR PAINTS &amp; CHEMICALS
              </div>

              {/* DESKTOP ANIMATED VERTICAL WATER WAVE */}
              <AnimatedVerticalWaves />

              {/* MOBILE ANIMATED HORIZONTAL WATER WAVE */}
              <AnimatedHorizontalWaves className="block md:hidden" />
            </div>

            {/* ================= RIGHT SECTION (WHITE FORM AREA) ================= */}
            <div className="w-full md:w-[56%] bg-white p-6 sm:p-10 md:p-14 flex flex-col justify-center relative z-20">
              {/* Form Header */}
              <div className="text-center md:text-left mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                  Log in to your account
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Enter your employee credentials to continue
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* User ID Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 tracking-wide mb-1">
                    User ID / Employee ID
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={id}
                      onChange={(e) => {
                        setId(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Enter your User ID"
                      className="w-full bg-transparent border-b-2 border-blue-400/60 focus:border-blue-600 py-2 pr-8 text-slate-800 placeholder-slate-300 text-sm font-medium focus:outline-none transition-colors"
                      required
                      disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none text-blue-400">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 tracking-wide mb-1">
                    Password
                  </label>
                  <div className="relative group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Enter your password"
                      className="w-full bg-transparent border-b-2 border-blue-400/60 focus:border-blue-600 py-2 pr-8 text-slate-800 placeholder-slate-300 text-sm font-medium focus:outline-none transition-colors"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center text-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 transition-colors select-none font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-blue-600 hover:text-blue-700 font-semibold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Error Message Box */}
                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
                      <p className="flex-1 font-semibold">{errorMessage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dual Pill Action Buttons */}
                <div className="flex items-center gap-3 pt-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 sm:flex-none py-2.5 px-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold text-sm rounded-full shadow-md shadow-blue-500/35 hover:shadow-blue-500/50 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Log In</span>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="flex-1 sm:flex-none py-2.5 px-6 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-semibold text-sm rounded-full transition-all text-center cursor-pointer"
                  >
                    Need Help?
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-slate-800 shadow-2xl relative border border-slate-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Need Help?</h3>
                  <p className="text-xs text-slate-500">Security &amp; Account Support</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">
                User accounts and credentials are authenticated directly through the central CRM database.
                Please contact your Sales Manager or Administrator to reset your password.
              </p>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-mono text-slate-600 mb-5 leading-relaxed">
                Support Domain: Popular Paints CRM<br />
                Admin Contact: info@popularpaints.com
              </div>

              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-full text-xs transition-colors shadow-md shadow-blue-500/20 cursor-pointer"
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
