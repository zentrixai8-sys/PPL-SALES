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
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Zap,
  Activity,
  Radio,
  Megaphone
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
  hidden: { opacity: 0, y: 16, scale: 0.98 },
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

  // Metrics calculations
  const totalPlans = (morningPlans || []).length;
  const completedVisits = (eveningReports || []).filter(r => r?.status === 'Completed').length;
  const pendingPlans = (morningPlans || []).filter(p => p?.status === 'Pending').length;
  const followUps = (eveningReports || []).filter(r => r?.followUpDate).length;
  const totalOrderValue = (eveningReports || []).reduce((acc, r) => acc + (Number(r?.expectedOrder) || 0), 0);
  const activeGpsUsers = new Set((gpsRecords || []).map(r => r?.salesPersonId)).size;
  const completionRate = totalPlans > 0 ? Math.round((completedVisits / totalPlans) * 100) : 100;

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

  const cards = [
    {
      title: "Today's Plans",
      value: totalPlans,
      subtitle: 'Morning Schedules',
      badge: 'Targeted',
      badgeStyle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: CalendarCheck,
      iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      topLine: 'from-amber-400 via-amber-500 to-amber-600',
      glowColor: 'bg-amber-500/10',
      tab: 'morning_plan' as NavigationTab,
    },
    {
      title: "Today's Visits",
      value: eveningReports.length,
      subtitle: 'Field Activity Logs',
      badge: 'Actuals',
      badgeStyle: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      icon: FileText,
      iconBg: 'bg-gradient-to-br from-sky-500/20 to-blue-600/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
      topLine: 'from-sky-400 via-sky-500 to-blue-600',
      glowColor: 'bg-sky-500/10',
      tab: 'evening_report' as NavigationTab,
    },
    {
      title: 'Completed Visits',
      value: completedVisits,
      subtitle: 'Verified Customer Visits',
      badge: 'Done',
      badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: CheckCircle2,
      iconBg: 'bg-gradient-to-br from-emerald-500/20 to-teal-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      topLine: 'from-emerald-400 via-emerald-500 to-teal-600',
      glowColor: 'bg-emerald-500/10',
      tab: 'evening_report' as NavigationTab,
    },
    {
      title: 'Pending Visits',
      value: pendingPlans,
      subtitle: 'Awaiting Evening Close',
      badge: 'In Progress',
      badgeStyle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      icon: Clock,
      iconBg: 'bg-gradient-to-br from-rose-500/20 to-red-600/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      topLine: 'from-rose-400 via-rose-500 to-red-600',
      glowColor: 'bg-rose-500/10',
      tab: 'morning_plan' as NavigationTab,
    },
    {
      title: 'Follow-ups Scheduled',
      value: followUps,
      subtitle: 'Pipeline Engagements',
      badge: 'Pipeline',
      badgeStyle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      icon: TrendingUp,
      iconBg: 'bg-gradient-to-br from-purple-500/20 to-indigo-600/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      topLine: 'from-purple-400 via-purple-500 to-indigo-600',
      glowColor: 'bg-purple-500/10',
      tab: 'reports' as NavigationTab,
    },
    {
      title: 'Expected Orders',
      value: `₹${(totalOrderValue || 0).toLocaleString('en-IN')}`,
      subtitle: 'Order Value Forecast',
      badge: 'Revenue',
      badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: IndianRupee,
      iconBg: 'bg-gradient-to-br from-emerald-500/20 to-green-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      topLine: 'from-emerald-400 via-teal-500 to-green-600',
      glowColor: 'bg-emerald-500/10',
      tab: 'analytics' as NavigationTab,
    },
    {
      title: 'GPS Active Users',
      value: activeGpsUsers,
      subtitle: 'Live Field Presence',
      badge: 'Live Map',
      badgeStyle: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      icon: Navigation,
      iconBg: 'bg-gradient-to-br from-cyan-500/20 to-teal-600/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      topLine: 'from-cyan-400 via-teal-500 to-sky-600',
      glowColor: 'bg-cyan-500/10',
      tab: 'gps_tracking' as NavigationTab,
    },
    {
      title: 'Visit Completion Rate',
      value: `${completionRate}%`,
      subtitle: 'Plan vs Actual Ratio',
      badge: 'Efficiency',
      badgeStyle: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      icon: Zap,
      iconBg: 'bg-gradient-to-br from-indigo-500/20 to-purple-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      topLine: 'from-indigo-500 via-purple-500 to-pink-500',
      glowColor: 'bg-indigo-500/10',
      tab: 'analytics' as NavigationTab,
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 sm:space-y-6"
    >
      {/* Executive Header Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-sm dark:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        {/* Subtle Ambient Background Light */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 bg-sky-500/10 dark:bg-sky-500/15 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-sky-500/10 to-transparent border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-md shadow-indigo-950/20">
            <Activity className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Executive Control Panel
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Ops Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time Sales Activity &amp; Performance Master Summary · Popular Paints
            </p>
          </div>
        </div>

        {/* Live Status Badge / Date & Notice Trigger */}
        <div className="relative flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onNavigate('users')}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            title="Create & manage employee accounts"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Users</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
            title="Broadcast Announcement to all reps"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Send Notice</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Today: {getIndianDateString(new Date().toISOString())}</span>
          </div>
        </div>
      </motion.div>

      {/* Metric Cards Grid - Compact Luxury 4-Column Layout */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5"
      >
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -3, scale: 1.01 }}
              onClick={() => onNavigate(card.tab)}
              className="group relative overflow-hidden p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700/80 hover:shadow-md hover:shadow-slate-900/5 dark:hover:shadow-indigo-950/30 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5"
            >
              {/* Ultra-Fine Top Accent Gradient Line */}
              <div className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${card.topLine} opacity-80 group-hover:opacity-100 transition-opacity`} />

              {/* Ambient Glow in Corner on Hover */}
              <div className={`pointer-events-none absolute -top-10 -right-10 w-24 h-24 ${card.glowColor} rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              {/* Top Row: Icon + Badge + Arrow */}
              <div className="flex items-center justify-between gap-1.5">
                <div className={`p-1.5 sm:p-2 rounded-xl border ${card.iconBg} shadow-xs group-hover:scale-105 transition-transform duration-200`}>
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${card.badgeStyle}`}>
                    {card.badge}
                  </span>
                  <div className="p-0.5 rounded-md text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Middle Row: Numbers & Title */}
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">
                  {card.title}
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                  {card.value}
                </div>
              </div>

              {/* Bottom Row: Context Subtitle */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <span className="truncate">{card.subtitle}</span>
                <span className="text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                  →
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Active Team Today Feed */}
      <motion.div
        variants={itemVariants}
        className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs"
      >
        {/* Header with Search and Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">Recent Field Activity Feed</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
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
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {/* Mobile Cards List (< md) */}
        <div className="block md:hidden space-y-2.5">
          {paginatedPlans.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching activity records found.
            </div>
          ) : (
            paginatedPlans.map((p, pIdx) => (
              <motion.div
                key={p.id || pIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                whileTap={{ scale: 0.98 }}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <UserAvatar name={p.salesPersonName} size="xs" showRankBadge={false} />
                    <span>{p.salesPersonName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                    {p.status}
                  </span>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                  {p.partyName}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/80 dark:border-slate-900">
                  <span>{p.city} · {getIndianDateString(p.meetingDate)}</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
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
            <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Sales Rep</th>
                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Party / Client</th>
                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Meeting Date</th>
                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">City</th>
                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Business Goal</th>
                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
              {paginatedPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No matching activity records found.
                  </td>
                </tr>
              ) : (
                paginatedPlans.map((p, pIdx) => (
                  <motion.tr
                    key={p.id || pIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={p.salesPersonName} size="xs" showRankBadge={false} />
                        <span>{p.salesPersonName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">{p.partyName}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{getIndianDateString(p.meetingDate)}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{p.city}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700 dark:text-emerald-400">
                      ₹{(p.expectedBusiness || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div className="text-[11px] sm:text-xs">
              Showing <span className="font-bold text-slate-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-slate-900 dark:text-white">{endIndex}</span> of{' '}
              <span className="font-bold text-slate-900 dark:text-white">{totalRecords}</span> entries
            </div>

            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                onClick={() => handlePageChange(1)}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => handlePageChange(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Number Pills */}
              <div className="flex items-center gap-1 mx-1">
                {getPageNumbers().map((page, pIdx) => {
                  if (page === '...') {
                    return (
                      <span key={`dots-${pIdx}`} className="px-2 py-1 text-slate-400 select-none">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = page === validCurrentPage;
                  return (
                    <button
                      key={`page-${page}`}
                      onClick={() => handlePageChange(page as number)}
                      className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                onClick={() => handlePageChange(validCurrentPage + 1)}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
