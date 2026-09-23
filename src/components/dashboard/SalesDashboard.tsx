import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavigationTab } from './DashboardContainer';
import { fetchAllUsersFromSheet } from '../../services/api';
import { User } from '../../types';
import {
  Sun,
  Moon,
  Compass,
  CheckCircle2,
  Calendar,
  IndianRupee,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface SalesDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 28 },
  },
};

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ onNavigate }) => {
  const { authState, morningPlans, eveningReports } = useAuth();
  const user = authState.user;
  const isManager = user?.role === 'Manager';
  const isAdmin = user?.role === 'Admin';

  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchAllUsersFromSheet().then(usersList => {
      if (usersList && usersList.length > 0) {
        setAllUsers(usersList);
      }
    });
  }, []);

  // Assigned sales persons for this manager
  const teamUsers = useMemo(() => {
    if (!isManager) return [];
    const myName = (user?.userName || '').toLowerCase();
    const myId = (user?.id || '').toLowerCase();
    return allUsers.filter(u => {
      const mgr = (u.manager || '').toLowerCase();
      return mgr === myName || mgr === myId;
    });
  }, [isManager, user, allUsers]);

  const teamMemberNames = useMemo(() => {
    return [user?.userName || '', ...teamUsers.map(u => u.userName)].filter(Boolean);
  }, [user, teamUsers]);

  const teamMemberIds = useMemo(() => {
    return [user?.id || '', ...teamUsers.map(u => u.id)].filter(Boolean);
  }, [user, teamUsers]);

  // Filter plans & reports based on role
  const userPlans = useMemo(() => {
    if (isAdmin) return morningPlans;
    if (isManager) {
      if (teamUsers.length > 0) {
        return morningPlans.filter(p =>
          teamMemberNames.some(name => name.toLowerCase() === p.salesPersonName?.toLowerCase()) ||
          teamMemberIds.some(id => id.toLowerCase() === p.salesPersonId?.toLowerCase())
        );
      }
      return morningPlans;
    }
    // Sales person: only their own
    return morningPlans.filter(p => p.salesPersonId === user?.id || p.salesPersonName === user?.userName);
  }, [isAdmin, isManager, morningPlans, teamUsers, teamMemberNames, teamMemberIds, user]);

  const userReports = useMemo(() => {
    if (isAdmin) return eveningReports;
    if (isManager) {
      if (teamUsers.length > 0) {
        return eveningReports.filter(r =>
          teamMemberNames.some(name => name.toLowerCase() === r.salesPersonName?.toLowerCase()) ||
          teamMemberIds.some(id => id.toLowerCase() === r.salesPersonId?.toLowerCase())
        );
      }
      return eveningReports;
    }
    return eveningReports.filter(r => r.salesPersonId === user?.id || r.salesPersonName === user?.userName);
  }, [isAdmin, isManager, eveningReports, teamUsers, teamMemberNames, teamMemberIds, user]);

  const pendingVisits = userPlans.length - userReports.length;
  const totalBusinessGoal = userPlans.reduce((sum, p) => sum + (p.expectedBusiness || 0), 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 sm:space-y-6"
    >
      {/* Welcome Banner */}
      <motion.div
        variants={itemVariants}
        className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border border-sky-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
      >
        <div>
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-sky-500">
            {isAdmin ? 'Administrator Portal' : isManager ? 'Area Manager Portal' : 'Field Officer Portal'}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Hello, {user?.userName}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            {isManager ? (
              <>Managing: <span className="text-white font-medium">{teamUsers.length} Sales Officers</span> · Role: <span className="font-mono text-emerald-400 font-semibold">Manager</span></>
            ) : isAdmin ? (
              <>Role: <span className="font-mono text-emerald-400 font-semibold">Administrator</span> · All Sales Team Accounts</>
            ) : (
              <>Manager: <span className="text-white font-medium">{user?.manager || 'Deepak Sahu'}</span> · CRM: <span className="font-mono text-sky-400 font-semibold">{user?.crm || user?.id}</span></>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 pt-1 sm:pt-0">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('morning_plan')}
            className="px-3 sm:px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Morning Plan</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('evening_report')}
            className="px-3 sm:px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Evening Report</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Quick Summary Cards (Matching Premium KPI Card Reference Design) */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5"
      >
        {/* Planned Today Card */}
        <motion.div
          variants={itemVariants}
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -2, scale: 1.01 }}
          onClick={() => onNavigate('morning_plan')}
          className="group relative overflow-hidden p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5"
        >
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
          <div className="pointer-events-none absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-br from-amber-500/5 to-orange-500/10 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />

          <div className="flex items-center justify-between gap-1">
            <div className="w-8 h-8 rounded-xl border flex items-center justify-center bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-2xs group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/80">
              Targeted 🎯
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">
              Planned Today
            </span>
            <div className="flex items-baseline justify-between gap-1">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {userPlans.length}
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                ₹{(totalBusinessGoal || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            <span className="truncate">Morning Schedules</span>
            <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all text-amber-600 bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-white">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </motion.div>

        {/* Completed Visits Card */}
        <motion.div
          variants={itemVariants}
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -2, scale: 1.01 }}
          onClick={() => onNavigate('evening_report')}
          className="group relative overflow-hidden p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5"
        >
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600" />
          <div className="pointer-events-none absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />

          <div className="flex items-center justify-between gap-1">
            <div className="w-8 h-8 rounded-xl border flex items-center justify-center bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-2xs group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80">
              Done ✓
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">
              Completed Visits
            </span>
            <div className="flex items-baseline justify-between gap-1">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {userReports.length}
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                ↗ {userPlans.length > 0 ? Math.round((userReports.length / userPlans.length) * 100) : 100}%
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            <span className="truncate">Logged in Sheet</span>
            <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all text-emerald-600 bg-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-white">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </motion.div>

        {/* Pending Visits Card */}
        <motion.div
          variants={itemVariants}
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -2, scale: 1.01 }}
          onClick={() => onNavigate('evening_report')}
          className="group relative overflow-hidden p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5"
        >
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-rose-400 via-rose-500 to-red-600" />
          <div className="pointer-events-none absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-br from-rose-500/5 to-pink-500/10 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />

          <div className="flex items-center justify-between gap-1">
            <div className="w-8 h-8 rounded-xl border flex items-center justify-center bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-2xs group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full border bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/80">
              In Progress ⏳
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">
              Pending Visits
            </span>
            <div className="flex items-baseline justify-between gap-1">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {Math.max(0, pendingVisits)}
              </div>
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                Action Req.
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            <span className="truncate">Submit by 6 PM</span>
            <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all text-rose-600 bg-rose-500/10 group-hover:bg-rose-500 group-hover:text-white">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Today's Schedule List */}
      <motion.div
        variants={itemVariants}
        className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>My Planned Visits</span>
          </h2>
          <button
            onClick={() => onNavigate('morning_plan')}
            className="text-xs text-sky-600 hover:underline font-bold flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {userPlans.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No visits planned for today yet.
            </div>
          ) : (
            userPlans.map((plan, pIdx) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pIdx * 0.04, duration: 0.25 }}
                whileTap={{ scale: 0.98 }}
                className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{plan.partyName}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {plan.contactPerson ? `${plan.contactPerson} · ` : ''}{plan.city}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-900">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    ₹{(plan.expectedBusiness || 0).toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => onNavigate('evening_report')}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 text-xs font-bold transition-colors"
                  >
                    Log Visit
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
