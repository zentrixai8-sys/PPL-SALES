import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Activity,
  Trophy,
  Award,
  Crown,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Flame,
  IndianRupee,
  Users,
  Target,
  ArrowUpRight,
  TrendingDown,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAvatar as RepAvatar } from '../common/UserAvatar';

interface RepPerformance {
  name: string;
  totalPlans: number;
  completedVisits: number;
  pendingVisits: number;
  targetAmount: number;
  actualRevenue: number;
  followUps: number;
  completionRate: number;
  performanceGrade: 'Star Performer' | 'Strong Performer' | 'Average' | 'Needs Improvement';
  gradeColor: string;
  badgeBg: string;
  improvementTip?: string;
}

export const AnalyticsModule: React.FC = () => {
  const { morningPlans = [], eveningReports = [], themeMode } = useAuth();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'performance' | 'charts'>('leaderboard');

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Parse date strings
  const getMonthIndex = (dateStr?: string): number | null => {
    if (!dateStr) return null;
    const parts = String(dateStr).split(/[-/]/).map(p => p.trim());
    if (parts.length < 2) return null;
    const m = Number(parts[1]);
    if (!m || m < 1 || m > 12) return null;
    return m - 1;
  };

  // --- Aggregate Sales Reps Comprehensive Performance ---
  const repPerformanceList = useMemo<RepPerformance[]>(() => {
    const map = new Map<string, {
      name: string;
      totalPlans: number;
      completedVisits: number;
      pendingVisits: number;
      targetAmount: number;
      actualRevenue: number;
      followUps: number;
    }>();

    // 1. Process Morning Plans
    morningPlans.forEach(p => {
      const name = (p.salesPersonName || 'Unknown').trim();
      if (!name) return;
      const entry = map.get(name) || {
        name,
        totalPlans: 0,
        completedVisits: 0,
        pendingVisits: 0,
        targetAmount: 0,
        actualRevenue: 0,
        followUps: 0
      };
      entry.totalPlans += 1;
      entry.targetAmount += Number(p.expectedBusiness) || 0;
      if (p.status === 'Pending') {
        entry.pendingVisits += 1;
      }
      map.set(name, entry);
    });

    // 2. Process Evening Reports
    eveningReports.forEach(r => {
      const plan = morningPlans.find(p => p.id === r.morningPlanId);
      const name = (plan?.salesPersonName || 'Unknown').trim();
      if (!name) return;
      const entry = map.get(name) || {
        name,
        totalPlans: 0,
        completedVisits: 0,
        pendingVisits: 0,
        targetAmount: 0,
        actualRevenue: 0,
        followUps: 0
      };
      if (r.status === 'Completed') {
        entry.completedVisits += 1;
      }
      entry.actualRevenue += Number(r.expectedOrder) || 0;
      if (r.followUpDate) {
        entry.followUps += 1;
      }
      map.set(name, entry);
    });

    const list: RepPerformance[] = Array.from(map.values()).map(r => {
      const compRate = r.totalPlans > 0 ? Math.round((r.completedVisits / r.totalPlans) * 100) : 0;
      
      let performanceGrade: RepPerformance['performanceGrade'] = 'Average';
      let gradeColor = 'text-amber-600 dark:text-amber-400 border-amber-500/30';
      let badgeBg = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300';
      let improvementTip = 'Consistent follow-up on scheduled morning meetings.';

      if (compRate >= 80 || r.actualRevenue >= 500000) {
        performanceGrade = 'Star Performer';
        gradeColor = 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
        badgeBg = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300';
        improvementTip = 'Top-tier momentum. Ready to mentor junior field reps.';
      } else if (compRate >= 55 || r.actualRevenue >= 200000) {
        performanceGrade = 'Strong Performer';
        gradeColor = 'text-sky-600 dark:text-sky-400 border-sky-500/30';
        badgeBg = 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300';
        improvementTip = 'Good execution. Focus on turning follow-ups into orders.';
      } else if (compRate < 40 || r.pendingVisits > 5) {
        performanceGrade = 'Needs Improvement';
        gradeColor = 'text-rose-600 dark:text-rose-400 border-rose-500/30';
        badgeBg = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300';
        improvementTip = 'High pending visits or low closure. Requires field alignment & follow-up closure coaching.';
      }

      return {
        ...r,
        completionRate: compRate,
        performanceGrade,
        gradeColor,
        badgeBg,
        improvementTip
      };
    });

    return list;
  }, [morningPlans, eveningReports]);

  // Leaders rankings
  const topSalesReps = useMemo(() => {
    return [...repPerformanceList].sort((a, b) => b.actualRevenue - a.actualRevenue);
  }, [repPerformanceList]);

  const topVisitReps = useMemo(() => {
    return [...repPerformanceList].sort((a, b) => b.completedVisits - a.completedVisits);
  }, [repPerformanceList]);

  const starPerformers = useMemo(() => {
    return repPerformanceList.filter(r => r.performanceGrade === 'Star Performer' || r.performanceGrade === 'Strong Performer');
  }, [repPerformanceList]);

  const needsImprovementReps = useMemo(() => {
    return repPerformanceList.filter(r => r.performanceGrade === 'Needs Improvement');
  }, [repPerformanceList]);

  // Overall totals
  const totalTeamRevenue = repPerformanceList.reduce((sum, r) => sum + r.actualRevenue, 0);
  const totalCompletedVisits = repPerformanceList.reduce((sum, r) => sum + r.completedVisits, 0);
  const totalPlans = repPerformanceList.reduce((sum, r) => sum + r.totalPlans, 0);
  const averageEfficiency = totalPlans > 0 ? Math.round((totalCompletedVisits / totalPlans) * 100) : 0;

  // --- Charts Data ---
  const cityMap = new Map<string, { city: string; target: number; actual: number }>();
  morningPlans.forEach(p => {
    const city = (p.city || '').trim() || 'Other';
    const entry = cityMap.get(city) || { city, target: 0, actual: 0 };
    entry.target += Number(p.expectedBusiness) || 0;
    cityMap.set(city, entry);
  });
  eveningReports.forEach(r => {
    const plan = morningPlans.find(p => p.id === r.morningPlanId);
    const city = ((plan?.city) || '').trim() || 'Other';
    const entry = cityMap.get(city) || { city, target: 0, actual: 0 };
    entry.actual += Number(r.expectedOrder) || 0;
    cityMap.set(city, entry);
  });
  const cityData = Array.from(cityMap.values()).slice(0, 10);

  const priorityMeta: Record<string, string> = { High: '#f43f5e', Medium: '#f59e0b', Low: '#38bdf8' };
  const priorityCounts: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
  morningPlans.forEach(p => {
    const key = p.priority && priorityCounts[p.priority] !== undefined ? p.priority : 'Medium';
    priorityCounts[key] += 1;
  });
  const priorityDistribution = Object.keys(priorityMeta)
    .filter(name => priorityCounts[name] > 0)
    .map(name => ({ name: `${name} Priority`, value: priorityCounts[name], color: priorityMeta[name] }));

  const monthMap = new Map<number, { month: string; visits: number; orders: number }>();
  morningPlans.forEach(p => {
    const idx = getMonthIndex(p.meetingDate);
    if (idx === null) return;
    const entry = monthMap.get(idx) || { month: MONTHS[idx], visits: 0, orders: 0 };
    entry.visits += 1;
    monthMap.set(idx, entry);
  });
  eveningReports.forEach(r => {
    const plan = morningPlans.find(p => p.id === r.morningPlanId);
    const idx = getMonthIndex(plan?.meetingDate);
    if (idx === null) return;
    const entry = monthMap.get(idx) || { month: MONTHS[idx], visits: 0, orders: 0 };
    entry.orders += Number(r.expectedOrder) || 0;
    monthMap.set(idx, entry);
  });
  const monthlyTrend = Array.from(monthMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);

  const isDark = themeMode === 'dark';
  const chartTooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#334155' : '#cbd5e1',
    color: isDark ? '#ffffff' : '#0f172a',
    borderRadius: '1rem',
    fontSize: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-sm dark:shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-sky-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-lg">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Sales Analytics &amp; Leadership Suite
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wide">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Live AI Insights
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time rep leaderboard, visit velocity, sales revenue &amp; coaching radar
            </p>
          </div>
        </div>

        {/* Executive Stats Badges */}
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Total Team Sales</div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ₹{totalTeamRevenue.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Visits Closed</div>
            <div className="text-base font-black text-sky-600 dark:text-sky-400 font-mono">
              {totalCompletedVisits} <span className="text-xs text-slate-400 font-normal">/ {totalPlans}</span>
            </div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Execution Rate</div>
            <div className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {averageEfficiency}%
            </div>
          </div>
        </div>
      </div>

      {/* Modern Navigation Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 w-full sm:w-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'leaderboard'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Leaderboard &amp; Top Performers</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'performance'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-emerald-500" />
          <span>Performance Matrix &amp; Coaching Radar</span>
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'charts'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-sky-500" />
          <span>Interactive Visual Analytics</span>
        </button>
      </div>

      {/* TAB 1: LEADERBOARDS & PODIUM */}
      {activeTab === 'leaderboard' && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Top 3 Sales & Visits Champions Podium */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales Revenue Champions Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-slate-900 dark:text-white">Revenue Leaders (Top Sales)</h2>
                    <p className="text-[11px] text-slate-500">Highest order value conversion</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400">
                  ₹ Orders
                </span>
              </div>

              <div className="space-y-3">
                {topSalesReps.slice(0, 5).map((rep, idx) => (
                  <div
                    key={rep.name}
                    className={`p-3.5 rounded-2xl flex items-center justify-between border transition-all ${
                      idx === 0
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RepAvatar name={rep.name} rank={idx + 1} size="md" />
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{rep.name}</span>
                          {idx === 0 && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <div className="text-[10px] text-slate-500">{rep.completedVisits} visits completed</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        ₹{rep.actualRevenue.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        {rep.completionRate}% completion
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visit Volume Champions Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-slate-900 dark:text-white">Field Visit Champions</h2>
                    <p className="text-[11px] text-slate-500">Most client meetings executed</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-400">
                  Visits Done
                </span>
              </div>

              <div className="space-y-3">
                {topVisitReps.slice(0, 5).map((rep, idx) => (
                  <div
                    key={rep.name}
                    className={`p-3.5 rounded-2xl flex items-center justify-between border transition-all ${
                      idx === 0
                        ? 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/60 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RepAvatar name={rep.name} rank={idx + 1} size="md" />
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{rep.name}</span>
                          {idx === 0 && <Trophy className="w-3.5 h-3.5 text-sky-500" />}
                        </div>
                        <div className="text-[10px] text-slate-500">{rep.totalPlans} scheduled meetings</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-sm text-sky-600 dark:text-sky-400 font-mono">
                        {rep.completedVisits} <span className="text-xs text-slate-400 font-normal">Visits</span>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                        ₹{rep.actualRevenue.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: PERFORMANCE MATRIX & COACHING RADAR */}
      {activeTab === 'performance' && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Overview Breakdown Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Star Performers Hub */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200/90 dark:border-emerald-900/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Top Star Performers ({starPerformers.length})</h3>
                    <p className="text-[11px] text-slate-500">High visit completion &amp; strong order generation</p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 font-bold">
                  Excellent
                </span>
              </div>

              <div className="space-y-3">
                {starPerformers.map(rep => (
                  <div key={rep.name} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <RepAvatar name={rep.name} size="sm" showRankBadge={false} />
                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{rep.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rep.gradeColor}`}>
                            {rep.performanceGrade}
                          </span>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {rep.completionRate}% execution
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(rep.completionRate, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>{rep.completedVisits} Done · {rep.pendingVisits} Pending</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        Sales: ₹{rep.actualRevenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coaching & Improvement Radar */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200/90 dark:border-rose-900/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Needs Coaching &amp; Alignment ({needsImprovementReps.length})</h3>
                    <p className="text-[11px] text-slate-500">Pending meetings or lower closure rates</p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400 font-bold">
                  Action Needed
                </span>
              </div>

              <div className="space-y-3">
                {needsImprovementReps.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs font-medium">
                    🎉 Great news! All sales representatives are performing above baseline efficiency.
                  </div>
                ) : (
                  needsImprovementReps.map(rep => (
                    <div key={rep.name} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <RepAvatar name={rep.name} size="sm" showRankBadge={false} />
                          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{rep.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60">
                              {rep.pendingVisits} Pending Visits
                            </span>
                          </div>
                        </div>
                        <div className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                          {rep.completionRate}% rate
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/70 dark:border-slate-800">
                        💡 <strong>Recommendation:</strong> {rep.improvementTip}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>{rep.completedVisits} Completed / {rep.totalPlans} Total</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          ₹{rep.actualRevenue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Full Scorecard Master Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Complete Sales Rep Performance Scorecard</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">{repPerformanceList.length} Reps Monitored</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-transparent">
                  <tr>
                    <th className="p-3 rounded-l-xl">Sales Representative</th>
                    <th className="p-3">Total Plans</th>
                    <th className="p-3">Completed</th>
                    <th className="p-3">Pending</th>
                    <th className="p-3">Execution %</th>
                    <th className="p-3 text-right">Actual Orders (₹)</th>
                    <th className="p-3 text-center rounded-r-xl">Performance Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {repPerformanceList.map((rep) => (
                    <tr key={rep.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <RepAvatar name={rep.name} size="sm" showRankBadge={false} />
                          <span>{rep.name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{rep.totalPlans}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{rep.completedVisits}</td>
                      <td className="p-3 font-mono text-rose-600 dark:text-rose-400">{rep.pendingVisits}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">{rep.completionRate}%</span>
                          <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${Math.min(rep.completionRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ₹{rep.actualRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${rep.badgeBg}`}>
                          {rep.performanceGrade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: VISUAL RECHARTS SUITE */}
      {activeTab === 'charts' && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* 1. Bar Chart: City-wise Business Target vs Actual */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                <span>City-Wise Target vs Actual Sales (₹)</span>
              </h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                  <XAxis dataKey="city" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                  <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Bar dataKey="target" name="Target ₹" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual ₹" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Pie Chart: Lead Priority Distribution */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-amber-500" />
                <span>Meeting Priority Distribution</span>
              </h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Area Chart: Monthly Business Growth Trend */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Monthly Revenue Growth Trend</span>
              </h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                  <XAxis dataKey="month" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                  <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="orders" name="Order Value ₹" stroke="#10b981" fill="#10b98122" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Line Chart: Field Visits Velocity */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Field Visits Execution Velocity</span>
              </h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                  <XAxis dataKey="month" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                  <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="visits" name="Visits Count" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
