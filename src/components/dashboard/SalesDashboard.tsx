import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavigationTab } from './DashboardContainer';
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

  // Filter for logged-in user
  const userPlans = morningPlans.filter(p => p.salesPersonId === user?.id || p.salesPersonName === user?.userName);
  const userReports = eveningReports.filter(r => r.salesPersonId === user?.id || r.salesPersonName === user?.userName);

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
            Field Officer Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Hello, {user?.userName}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Manager: <span className="text-white font-medium">{user?.manager || 'Deepak Sahu'}</span> · CRM: <span className="font-mono text-sky-400 font-semibold">{user?.crm || user?.id}</span>
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

      {/* Quick Summary Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-3 gap-2.5 sm:gap-4"
      >
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3, scale: 1.02 }}
          className="p-3 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs"
        >
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">Planned Today</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{userPlans.length}</div>
          <p className="text-[9px] sm:text-[11px] text-amber-700 dark:text-amber-400 font-bold truncate">₹{(totalBusinessGoal || 0).toLocaleString('en-IN')}</p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3, scale: 1.02 }}
          className="p-3 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs"
        >
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">Completed</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">{userReports.length}</div>
          <p className="text-[9px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">Logged in Sheet</p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -3, scale: 1.02 }}
          className="p-3 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs"
        >
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">Pending</span>
          <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400">{Math.max(0, pendingVisits)}</div>
          <p className="text-[9px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">Before 6 PM</p>
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
