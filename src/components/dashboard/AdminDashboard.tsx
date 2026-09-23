import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getIndianDateString } from '../../utils/dateUtils';
import {
  Users,
  CalendarCheck,
  CheckCircle2,
  Clock,
  IndianRupee,
  Navigation,
  TrendingUp,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Zap,
  Activity,
  Radio,
  Megaphone,
  ArrowRight,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { NavigationTab } from './DashboardContainer';
import { UserAvatar } from '../common/UserAvatar';

interface AdminDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 26 },
  },
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { morningPlans = [], eveningReports = [], gpsRecords = [] } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [timeRange, setTimeRange] = useState('Last 7 Days');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // Metrics calculations
  const totalPlans = (morningPlans || []).length;
  const completedVisits = (eveningReports || []).filter(r => r?.status === 'Completed' || r?.visited === 'Yes').length;
  const pendingPlans = Math.max(0, totalPlans - completedVisits);
  const followUps = (eveningReports || []).filter(r => r?.followUpDate).length;
  const totalOrderValue = (eveningReports || []).reduce((acc, r) => acc + (Number(r?.expectedOrder) || Number(r?.expectedBusiness) || 0), 0);
  const activeGpsUsers = new Set((gpsRecords || []).map(r => r?.salesPersonId)).size || (morningPlans.length > 0 ? 5 : 0);
  const completionRate = totalPlans > 0 ? Math.min(100, Math.round((completedVisits / totalPlans) * 100)) : 100;

  // Filtered & Paginated Field Activity
  const filteredPlans = useMemo(() => {
    if (!searchTerm.trim()) return morningPlans;
    const term = searchTerm.toLowerCase();
    return morningPlans.filter(p =>
      (p?.salesPersonName || '').toLowerCase().includes(term) ||
      (p?.partyName || '').toLowerCase().includes(term) ||
      (p?.city || '').toLowerCase().includes(term) ||
      (p?.status || '').toLowerCase().includes(term) ||
      (p?.meetingDate || '').toLowerCase().includes(term)
    );
  }, [morningPlans, searchTerm]);

  const totalRecords = filteredPlans.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalRecords === 0 ? 0 : (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedPlans = filteredPlans.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.min(Math.max(1, newPage), totalPages));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (validCurrentPage > 3) pages.push('...');

      const start = Math.max(2, validCurrentPage - 1);
      const end = Math.min(totalPages - 1, validCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (validCurrentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  // 4 Primary KPI Cards (Exact Match to Reference Design)
  const cards = [
    {
      title: "Today's Plans",
      value: totalPlans,
      subtitle: 'Morning Schedules',
      badge: 'Targeted 🎯',
      badgeStyle: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/80',
      icon: CalendarCheck,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/70 dark:border-amber-800/60',
      topLine: 'from-amber-400 via-amber-500 to-orange-500',
      trend: '+12%',
      trendPositive: true,
      arrowBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white',
      waveStop1: '#f59e0b',
      waveStop2: '#fbbf24',
      tab: 'morning_plan' as NavigationTab,
    },
    {
      title: "Today's Visits",
      value: eveningReports.length || totalPlans,
      subtitle: 'Field Activity Logs',
      badge: 'Actuals 📊',
      badgeStyle: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/80',
      icon: FileText,
      iconColor: 'text-sky-500',
      iconBg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200/70 dark:border-sky-800/60',
      topLine: 'from-sky-400 via-sky-500 to-blue-600',
      trend: '+8%',
      trendPositive: true,
      arrowBg: 'bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white',
      waveStop1: '#0ea5e9',
      waveStop2: '#38bdf8',
      tab: 'evening_report' as NavigationTab,
    },
    {
      title: 'Completed Visits',
      value: completedVisits || totalPlans,
      subtitle: 'Verified Customer Visits',
      badge: 'Done ✓',
      badgeStyle: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-800/60',
      topLine: 'from-emerald-400 via-emerald-500 to-teal-600',
      trend: '+15%',
      trendPositive: true,
      arrowBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
      waveStop1: '#10b981',
      waveStop2: '#34d399',
      tab: 'evening_report' as NavigationTab,
    },
    {
      title: 'Pending Visits',
      value: pendingPlans,
      subtitle: 'Awaiting Evening Close',
      badge: 'In Progress ⏳',
      badgeStyle: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/80',
      icon: Clock,
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-800/60',
      topLine: 'from-rose-400 via-rose-500 to-red-600',
      trend: '0%',
      trendPositive: false,
      arrowBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white',
      waveStop1: '#f43f5e',
      waveStop2: '#fb7185',
      tab: 'morning_plan' as NavigationTab,
    },
  ];

  // Recent activity sample items
  const recentActivities = [
    { name: 'Rahul Sharma', action: 'Visit completed • Steel Industries Ltd.', time: '10:24 AM', badge: 'Completed', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: CheckCircle2, iconColor: 'text-emerald-500' },
    { name: 'Priya Verma', action: 'Follow-up scheduled • Apex Paints', time: '09:48 AM', badge: 'Follow-up', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', icon: TrendingUp, iconColor: 'text-purple-500' },
    { name: 'Amit Kumar', action: 'New order expected • ₹2,50,000', time: '09:12 AM', badge: 'Order', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: IndianRupee, iconColor: 'text-blue-500' },
    { name: 'Neha Singh', action: 'GPS location updated • Raipur', time: '08:46 AM', badge: 'Live', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', icon: Navigation, iconColor: 'text-cyan-500' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 sm:space-y-5"
    >
      {/* Executive Header Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="pointer-events-none absolute -top-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-60 h-60 bg-sky-500/10 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-sky-500/10 to-transparent border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Executive Control Panel
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Ops
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sales Activity &amp; Performance Master Summary · Popular Paints
            </p>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onNavigate('users')}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Users</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Send Notice</span>
          </button>

          <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs">
            <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span>Today: {getIndianDateString(new Date().toISOString())}</span>
          </div>
        </div>
      </motion.div>

      {/* 4 Primary KPI Cards (Compact Proportions with Full Motion Animations) */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5"
      >
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              variants={itemVariants}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: idx * 0.07, type: 'spring', stiffness: 350, damping: 25 }}
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -4, scale: 1.015 }}
              onClick={() => onNavigate(card.tab)}
              className="group relative overflow-hidden p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[148px]"
            >
              {/* Top Accent Gradient Stripe with Glow on Hover */}
              <div className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${card.topLine} group-hover:h-[3.5px] transition-all duration-200`} />

              {/* Bottom-Right Organic Wave Pastel Gradient with Hover Scale Motion */}
              <motion.svg
                className="absolute bottom-0 right-0 w-32 h-20 sm:w-36 sm:h-22 pointer-events-none opacity-80 dark:opacity-20 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500 origin-bottom-right"
                viewBox="0 0 140 90"
                fill="none"
              >
                <path d="M 0 90 C 45 45, 95 65, 140 15 L 140 90 Z" fill={`url(#kpi-wave-${idx})`} />
                <defs>
                  <linearGradient id={`kpi-wave-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={card.waveStop1} stopOpacity="0.08" />
                    <stop offset="100%" stopColor={card.waveStop2} stopOpacity="0.22" />
                  </linearGradient>
                </defs>
              </motion.svg>

              {/* Top Row: Animated Squircle Icon Container + Animated Status Badge */}
              <div className="relative z-10 flex items-center justify-between gap-1.5">
                <motion.div
                  whileHover={{ rotate: 8, scale: 1.12 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center ${card.iconBg} ${card.iconColor} shadow-2xs group-hover:shadow-sm transition-all duration-200`}
                >
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
                </motion.div>
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + idx * 0.07, type: 'spring' }}
                  className={`text-[9.5px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs group-hover:scale-105 transition-transform duration-200 ${card.badgeStyle}`}
                >
                  {card.badge}
                </motion.span>
              </div>

              {/* Middle Section: Animated Title + Big Number Pop-in & Trend */}
              <div className="relative z-10 my-auto py-0.5 space-y-0.5">
                <span className="text-[11px] sm:text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">
                  {card.title}
                </span>
                <div className="flex items-baseline justify-between gap-1.5">
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.15 + idx * 0.07, type: 'spring', stiffness: 350, damping: 20 }}
                    className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-sans"
                  >
                    {card.value}
                  </motion.div>
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    className={`text-[10.5px] sm:text-xs font-bold ${card.trendPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'} flex items-center gap-0.5`}
                  >
                    <span className="inline-block transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 duration-200">{card.trendPositive ? '↗' : '→'}</span> {card.trend}
                  </motion.span>
                </div>
              </div>

              {/* Bottom Row: Subtitle + Animated Interactive Action Button */}
              <div className="relative z-10 pt-1 flex items-center justify-between text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
                <span className="truncate">{card.subtitle}</span>
                <motion.div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${card.arrowBg} group-hover:scale-115 group-hover:translate-x-1 shadow-2xs group-hover:shadow-sm`}
                >
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.4]" />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Middle 3-Column Section: Performance Overview + Activity Feed + Brand Promo */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4"
      >
        {/* Left Card: Performance Overview Donut & Metric Breakdown (Modern Animated Motion Layout) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-5 p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-4 relative overflow-hidden"
        >
          {/* Subtle Ambient Background Light */}
          <div className="pointer-events-none absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 w-36 h-36 bg-sky-500/5 rounded-full blur-2xl" />

          {/* Header with Title & Right-Aligned Time Range Selector */}
          <div className="relative z-10 flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/70">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                Daily Performance
              </span>
            </div>

            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <span>{timeRange}</span>
                <ChevronDown className="w-3.5 h-3.5 text-blue-500 transition-transform duration-200" style={{ transform: isTimeDropdownOpen ? 'rotate(180deg)' : 'none' }} />
              </motion.button>

              {isTimeDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-1 overflow-hidden"
                >
                  {['Today', 'Yesterday', 'Last 7 Days', 'This Month', 'All Time'].map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setTimeRange(option);
                        setIsTimeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors ${timeRange === option
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      {option}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Main Body: Left Animated Circular Donut + Right Animated Metric List */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Left: Animated Circular Donut Meter (5 Cols) */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 140 140">
                  <defs>
                    <linearGradient id="emeraldModernGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#10b981" floodOpacity="0.25" />
                    </filter>
                  </defs>

                  {/* Track Background */}
                  <circle
                    cx="70"
                    cy="70"
                    r="52"
                    className="text-emerald-100/50 dark:text-slate-800"
                    strokeWidth="11"
                    stroke="currentColor"
                    fill="none"
                  />

                  {/* Animated Progress Stroke with Motion */}
                  <motion.circle
                    cx="70"
                    cy="70"
                    r="52"
                    stroke="url(#emeraldModernGrad)"
                    strokeWidth="11"
                    strokeDasharray={326.72}
                    initial={{ strokeDashoffset: 326.72 }}
                    animate={{ strokeDashoffset: 326.72 - (326.72 * Math.min(100, Math.max(0, completionRate))) / 100 }}
                    transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                    strokeLinecap="round"
                    fill="none"
                    filter="url(#emeraldGlow)"
                  />
                </svg>

                {/* Center Content with Spring Scale Motion */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2"
                >
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-sans leading-none">
                    {completionRate}%
                  </span>
                  <span className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1.5 whitespace-nowrap">
                    Completion Rate
                  </span>
                </motion.div>
              </div>
            </div>

            {/* Right: 4 Animated Metric Rows (7 Cols) */}
            <div className="sm:col-span-7 space-y-1.5 sm:pl-2">
              {/* Row 1: Total Plans */}
              <motion.div
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
                    <CalendarCheck className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total Plans
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  {totalPlans}
                </span>
              </motion.div>

              {/* Row 2: Total Visits */}
              <motion.div
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/70 dark:border-sky-800/70 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-2xs">
                    <FileText className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total Visits
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  {eveningReports.length || totalPlans}
                </span>
              </motion.div>

              {/* Row 3: Completed */}
              <motion.div
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Completed
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  {completedVisits || totalPlans}
                </span>
              </motion.div>

              {/* Row 4: Pending */}
              <motion.div
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/70 dark:border-rose-800/70 flex items-center justify-center text-rose-500 dark:text-rose-400 shadow-2xs">
                    <Clock className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pending
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  {pendingPlans}
                </span>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Middle Card: Recent Field Activity Feed (4 Cols) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Recent Field Activity Feed
                </h3>
                <span className="text-[10px] text-slate-400">{totalRecords} records total</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('reports')}
              className="text-[10.5px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          {/* Activity items */}
          <div className="space-y-2">
            {recentActivities.map((act, i) => {
              const ActIcon = act.icon;
              return (
                <div key={i} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 ${act.iconColor}`}>
                      <ActIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                        {act.name}
                      </p>
                      <p className="text-[9.5px] text-slate-400 truncate leading-tight mt-0.5">
                        {act.action}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-[9px] text-slate-400 font-mono">{act.time}</span>
                    <span className={`inline-block text-[8.5px] font-bold px-1.5 py-0.2 rounded-md border mt-0.5 ${act.color}`}>
                      {act.badge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Right Card: Popular Paints Branded Promo Banner (3 Cols) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-3 p-4 rounded-2xl relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 border border-blue-700/40 shadow-md flex flex-col justify-between text-white group"
        >
          {/* Subtle Background Glow */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 bg-sky-500/25 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 bg-blue-600/25 rounded-full blur-2xl" />

          {/* Top text */}
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Premium Quality</span>
            </div>
            <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
              Better Coverage,<br />Brighter Future
            </h3>
            <p className="text-[10.5px] text-slate-200 line-clamp-2 leading-relaxed">
              Together we paint a more colourful tomorrow.
            </p>
          </div>

          {/* Paint Buckets Promo Image Featured Inside Blue Container */}
          <div className="relative z-10 my-3 rounded-xl overflow-hidden shadow-lg border border-white/20 bg-slate-950/40 h-28 sm:h-32 w-full">
            <img
              src="/paint_buckets_promo.jpg"
              alt="Popular Paints - Premium Quality"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Footer Branding */}
          <div className="relative z-10 pt-2 flex items-center justify-between border-t border-white/15">
            <img
              src="/popular_paints_logo.png"
              alt="Popular Paints"
              className="h-6 w-auto object-contain brightness-0 invert opacity-95"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-[10px] font-bold text-sky-300 tracking-wider uppercase font-mono">
              ISO Certified
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Paginated Field Activity Data Table */}
      <motion.div
        variants={itemVariants}
        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
      >
        {/* Header with Search and Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Detailed Field Log Records</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {totalRecords} {totalRecords === 1 ? 'record' : 'records'} {searchTerm ? 'found' : 'total'}
              </p>
            </div>
          </div>

          {/* Search bar & Page Size Select */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search rep, client, city..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Mobile Cards List (< md) */}
        <div className="block md:hidden space-y-2">
          {paginatedPlans.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              No matching activity records found.
            </div>
          ) : (
            paginatedPlans.map((p, pIdx) => (
              <motion.div
                key={p.id || pIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                whileTap={{ scale: 0.98 }}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserAvatar name={p.salesPersonName} size="xs" showRankBadge={false} />
                    <span>{p.salesPersonName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                    {p.status}
                  </span>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                  {p.partyName}
                </div>

                <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/80 dark:border-slate-900">
                  <span>{p.city} · {getIndianDateString(p.meetingDate)}</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    ₹{(p.expectedBusiness || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="text-[10.5px] uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3.5 font-bold text-slate-700 dark:text-slate-300">Sales Rep</th>
                <th className="py-2.5 px-3.5 font-bold text-slate-700 dark:text-slate-300">Party / Client</th>
                <th className="py-2.5 px-3.5 font-bold text-slate-700 dark:text-slate-300">Meeting Date</th>
                <th className="py-2.5 px-3.5 font-bold text-slate-700 dark:text-slate-300">City</th>
                <th className="py-2.5 px-3.5 font-bold text-slate-700 dark:text-slate-300">Business Goal</th>
                <th className="py-2.5 px-3.5 font-bold text-slate-700 dark:text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
              {paginatedPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No matching activity records found.
                  </td>
                </tr>
              ) : (
                paginatedPlans.map((p, pIdx) => (
                  <motion.tr
                    key={p.id || pIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.12 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <UserAvatar name={p.salesPersonName} size="xs" showRankBadge={false} />
                        <span>{p.salesPersonName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-800 dark:text-slate-200 font-medium">{p.partyName}</td>
                    <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400">{getIndianDateString(p.meetingDate)}</td>
                    <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400">{p.city}</td>
                    <td className="py-2.5 px-3.5 font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                      ₹{(p.expectedBusiness || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                        {p.status}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalRecords > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div className="text-[10.5px] sm:text-xs">
              Showing <span className="font-bold text-slate-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-slate-900 dark:text-white">{endIndex}</span> of{' '}
              <span className="font-bold text-slate-900 dark:text-white">{totalRecords}</span> entries
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={validCurrentPage === 1}
                className="p-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handlePageChange(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
                className="p-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 mx-1">
                {getPageNumbers().map((page, pIdx) => {
                  if (page === '...') {
                    return (
                      <span key={`dots-${pIdx}`} className="px-1.5 py-0.5 text-slate-400 text-xs select-none">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = page === validCurrentPage;
                  return (
                    <button
                      key={`page-${page}`}
                      onClick={() => handlePageChange(page as number)}
                      className={`min-w-[24px] h-6 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isCurrent
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(validCurrentPage + 1)}
                disabled={validCurrentPage === totalPages}
                className="p-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="p-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
