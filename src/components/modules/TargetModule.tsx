import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchTargetsFromSheet, assignTargetToSheet, fetchSalesPersonsFromLoginSheet, fetchCRMOrdersFromSheet, deleteSheetRowById, updateSheetRow } from '../../services/api';
import { TargetRecord, CRMOrderRecord } from '../../types';
import { getIndianDateTimeString } from '../../utils/dateUtils';
import {
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  User,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  Layers,
  Award,
  Clock,
  MessageSquare,
  Package,
  Sparkles,
  ChevronDown,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const formatMonthDisplay = (val: any): string => {
  if (!val) return 'July 2026';
  const str = String(val).trim();
  if (!str) return 'July 2026';

  // If already in Month Year format (e.g. "July 2026" or "June 2026")
  if (/^[A-Za-z]+\s+\d{4}$/.test(str)) {
    return str;
  }

  // If ISO date string or YYYY-MM date (e.g. "2026-06-30T18:30:00.000Z")
  if (str.includes('T') || (str.includes('-') && str.length >= 7 && str.startsWith('202'))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      // Adjust by IST (+5.5 hrs) for UTC date bounds from Google Sheets
      const localDate = new Date(d.getTime() + (5.5 * 3600 * 1000));
      return `${monthNames[localDate.getUTCMonth()]} ${localDate.getUTCFullYear()}`;
    }
  }

  // Parse DD/MM/YYYY or DD-MM-YYYY
  const dmMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmMatch) {
    const month = parseInt(dmMatch[2], 10) - 1;
    const year = dmMatch[3];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[month]} ${year}`;
  }

  // If numeric Excel date serial
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${monthNames[jsDate.getMonth()]} ${jsDate.getFullYear()}`;
    }
  }

  return str;
};

// Custom in-DOM dropdown replacing native <select> across this page's filters/forms.
// Native <select> option lists render as an OS/WebView-anchored popup that can
// appear outside the card's bounds on mobile (Android WebView) — this keeps the
// list positioned and sized relative to its own trigger instead.
interface DropdownOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  triggerClassName: string;
  placeholder?: string;
  accent?: 'indigo' | 'sky';
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, triggerClassName, placeholder, accent = 'indigo' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selectedOption = options.find(o => o.value === value);
  const activeClass = accent === 'sky'
    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`${triggerClassName} text-left truncate ${!selectedOption ? 'text-slate-400 dark:text-slate-500' : ''}`}
      >
        {selectedOption ? selectedOption.label : (placeholder || '')}
      </button>
      <ChevronDown className={`w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                opt.value === value
                  ? activeClass
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const TargetModule: React.FC = () => {
  const { authState, showToast } = useAuth();
  const user = authState.user;

  // Real data state from Google Sheet
  const [targets, setTargets] = useState<TargetRecord[]>([]);
  const [crmOrders, setCrmOrders] = useState<CRMOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Salespersons list fetched from Login sheet Column C (USER NAME)
  const [salesPersonsList, setSalesPersonsList] = useState<string[]>([
    'Rohan Mehra',
    'Amit Verma',
    'Suresh Yadav',
    'Manish Tiwari',
    'Vikas Deshmukh',
    'Sunil Chauhan',
    'Gaurav Mishra',
    'Nikhil Aggarwal',
    'Rakesh Soni',
    'Sanjay Jaiswal',
    'Kunal Sen',
    'Harish Rawat',
    'Abhishek Gupta',
    'Tarun Bhatt',
    'Mayank Joshi',
    'Arun Nayak',
    'Prakash Rathore',
    'Dinesh Rajput',
    'Vinod Maurya',
    'Sachin Bisen',
    'Atul Baghmar',
    'Pamendra Singh Rajput',
  ]);

  // Form states for assigning target
  const [salesPersonName, setSalesPersonName] = useState(
    user?.userName || 'Atul Baghmar'
  );
  const [month, setMonth] = useState('July 2026');
  const [totalNewOrders, setTotalNewOrders] = useState('10');
  const [amount, setAmount] = useState('500000');
  const [remark, setRemark] = useState('Monthly Sales Target Assignment');
  const [isAssigning, setIsAssigning] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }, []);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(currentMonthStr);

  // Edit Target State
  const [editingTarget, setEditingTarget] = useState<TargetRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch real targets and sales persons on mount
  const loadTargets = async () => {
    setLoading(true);
    try {
      const [targetsData, crmOrdersData] = await Promise.all([
        fetchTargetsFromSheet(),
        fetchCRMOrdersFromSheet()
      ]);
      setTargets(targetsData);
      setCrmOrders(crmOrdersData);
    } catch (err) {
      console.error('Failed to load targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTargets();
    fetchSalesPersonsFromLoginSheet().then(names => {
      if (names && names.length > 0) {
        setSalesPersonsList(names);
        // Ensure default selected name is valid
        if (!salesPersonName || !names.includes(salesPersonName)) {
          setSalesPersonName(names[0]);
        }
      }
    });
  }, []);

  const handleAssignTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesPersonName.trim()) {
      showToast('error', 'Required Field', 'Please enter or select a Sales Person Name.');
      return;
    }

    setIsAssigning(true);
    try {
      const newRecord = await assignTargetToSheet({
        month,
        salesPersonName: salesPersonName.trim(),
        totalNewOrders: Number(totalNewOrders) || 0,
        amount: Number(amount) || 0,
        remark: remark.trim(),
      });

      setTargets(prev => [newRecord, ...prev]);
      showToast('success', 'Target Assigned!', `Target successfully assigned to ${salesPersonName}.`);

      // Reset form defaults
      setRemark('');
    } catch (err: any) {
      showToast('error', 'Assignment Error', err.message || 'Failed to record target.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget) return;
    setIsUpdating(true);
    try {
      setTargets(prev => prev.map(t => (t.id === editingTarget.id ? editingTarget : t)));
      
      const rowArray = [
        editingTarget.id,
        editingTarget.timestamp,
        editingTarget.month,
        editingTarget.salesPersonName,
        editingTarget.totalNewOrders,
        editingTarget.amount,
        editingTarget.remark
      ];
      await updateSheetRow('Target', editingTarget.id, rowArray);

      showToast('success', 'Target Updated', 'The target record has been updated.');
      setEditingTarget(null);
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Could not update target.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTarget = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this target record?')) return;
    const previousTargets = targets;
    setTargets(prev => prev.filter(t => t.id !== id));

    const success = await deleteSheetRowById('Target', id);
    if (!success) {
      setTargets(previousTargets);
      showToast('error', 'Delete Failed', 'Could not delete the target record from the sheet. Please try again.');
      return;
    }

    showToast('success', 'Target Deleted', 'The target record has been removed.');
  };

  // Filter targets
  const filteredTargets = targets.filter(t => {
    // Sales ID data restriction: only see own target
    if (user?.role !== 'Admin') {
      const myName = (user?.userName || user?.name || '').toLowerCase().trim();
      const targetPerson = (t.salesPersonName || '').toLowerCase().trim();
      if (myName && targetPerson && !targetPerson.includes(myName) && !myName.includes(targetPerson)) {
        return false;
      }
    }

    const formattedMonth = formatMonthDisplay(t.month);
    const matchesSearch =
      t.salesPersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.remark.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formattedMonth.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.month || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMonth =
      selectedMonthFilter === 'All' ||
      formattedMonth.toLowerCase() === selectedMonthFilter.toLowerCase() ||
      (t.month || '').toLowerCase() === selectedMonthFilter.toLowerCase();

    return matchesSearch && matchesMonth;
  });

  // Helper to calculate achieved orders for a target
  const getAchievedCount = (target: TargetRecord): number => {
    const targetMonth = formatMonthDisplay(target.month);
    return crmOrders.filter(order => {
      // 1. Match Sales Person Name
      const isSamePerson = order.salesPersonName.trim().toLowerCase() === target.salesPersonName.trim().toLowerCase();
      if (!isSamePerson) return false;

      // 2. Order status must be 'Recieved' (checking both spellings just in case)
      const statusLower = (order.orderStatus || '').toLowerCase();
      const isReceived = statusLower.includes('recieved') || statusLower.includes('received');
      if (!isReceived) return false;

      // 3. Order Actual Date's month must strictly match Target Month
      const orderMonth = formatMonthDisplay(order.orderActualDate);
      return orderMonth === targetMonth;
    }).length;
  };

  // Calculate total targets summary
  const totalAssignedAmount = targets.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalAssignedOrders = targets.reduce((sum, t) => sum + (t.totalNewOrders || 0), 0);
  const totalAchievedOrders = targets.reduce((sum, t) => sum + getAchievedCount(t), 0);

  // User-specific target
  const userTarget = targets.find(t => t.salesPersonName.toLowerCase().includes((user?.userName || '').toLowerCase())) || targets[0];
  const userAchievedOrders = userTarget ? getAchievedCount(userTarget) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-indigo-950/50 dark:to-slate-900 border border-slate-200 dark:border-indigo-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-sm dark:shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm">
            <Target className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Sales Target Assignment</h1>
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/80 font-mono font-semibold">
                Synced
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
              Assign and monitor monthly sales targets and revenue goals
            </p>
          </div>
        </div>

        <button
          onClick={loadTargets}
          disabled={loading}
          className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border border-slate-300 dark:border-slate-700 transition-all shrink-0 cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Targets</span>
        </button>
      </div>

      {/* Target Key Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          whileHover={{ y: -3, scale: 1.01 }}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 relative overflow-hidden shadow-sm"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Total Revenue Target Assigned</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ₹{(totalAssignedAmount || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Across {targets.length} assigned goals</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          whileHover={{ y: -3, scale: 1.01 }}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Total New Orders Progress</span>
            <Package className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <div className="flex items-end justify-between mb-2">
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
                {totalAchievedOrders} <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">/ {totalAssignedOrders}</span>
              </div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {totalAssignedOrders > 0 ? Math.round((totalAchievedOrders / totalAssignedOrders) * 100) : 0}%
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-1000 relative" 
                style={{ width: `${totalAssignedOrders > 0 ? Math.min((totalAchievedOrders / totalAssignedOrders) * 100, 100) : 0}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          whileHover={{ y: -3, scale: 1.01 }}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">My Active Monthly Target</span>
            <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mb-1">
              ₹{(userTarget?.amount || 500000).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mb-3">
              {formatMonthDisplay(userTarget?.month)}
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span>Orders Progress</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {userAchievedOrders} / {userTarget?.totalNewOrders || 10}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-1000 relative" 
                  style={{ width: `${(userTarget?.totalNewOrders || 10) > 0 ? Math.min((userAchievedOrders / (userTarget?.totalNewOrders || 10)) * 100, 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Assign Target Form (Visible to Admin/Manager or for direct assignment) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Assign New Target (Add to Target Sheet)</h2>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Sheet: Target</span>
        </div>

        <form onSubmit={handleAssignTarget} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales Person Name */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Sales Person Name <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 z-10 pointer-events-none" />
                <CustomSelect
                  value={salesPersonName}
                  onChange={setSalesPersonName}
                  options={salesPersonsList.map((name) => ({ value: name, label: name }))}
                  placeholder="-- Select Sales Person --"
                  triggerClassName="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Month */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Month <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              <CustomSelect
                value={month}
                onChange={setMonth}
                options={[
                  { value: 'July 2026', label: 'July 2026' },
                  { value: 'August 2026', label: 'August 2026' },
                  { value: 'September 2026', label: 'September 2026' },
                  { value: 'October 2026', label: 'October 2026' },
                  { value: 'November 2026', label: 'November 2026' },
                  { value: 'December 2026', label: 'December 2026' },
                ]}
                triggerClassName="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>

            {/* Total New Orders */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Total New Orders Quota</label>
              <input
                type="number"
                value={totalNewOrders}
                onChange={(e) => setTotalNewOrders(e.target.value)}
                placeholder="10"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Target Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500000"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Remark */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Remark / Notes</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Focus on Industrial lubricant accounts in North Zone"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isAssigning}
              className="py-3 px-6 bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              {isAssigning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Assigning Target...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Assign Target</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Target Live Data Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Target Records ({filteredTargets.length})</h2>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search salesperson..."
                className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <CustomSelect
              value={selectedMonthFilter}
              onChange={setSelectedMonthFilter}
              options={[
                { value: 'All', label: 'All Months' },
                { value: 'July 2026', label: 'July 2026' },
                { value: 'August 2026', label: 'August 2026' },
              ]}
              accent="sky"
              triggerClassName="py-1.5 pl-3 pr-8 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Mobile Cards View (< md) */}
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />
              <span>Fetching target records...</span>
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-medium text-xs">
              No target records found. Assign a target above to insert data.
            </div>
          ) : (
            filteredTargets.map((t, idx) => (
              <div
                key={t.id || idx}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{t.salesPersonName}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{formatMonthDisplay(t.month)} · ID: <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">{t.id}</span></div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                      ₹{(t.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/50">
                  <div className="flex items-center justify-between text-[11px] font-bold font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400">{getAchievedCount(t)} Achieved</span>
                    <span className="text-slate-500 dark:text-slate-400">Quota: {t.totalNewOrders} Orders</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-700"
                      style={{ width: `${t.totalNewOrders > 0 ? Math.min((getAchievedCount(t) / t.totalNewOrders) * 100, 100) : 0}%` }}
                    />
                  </div>
                </div>

                {t.remark && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900/40 px-2 py-1 rounded-lg border border-slate-200 dark:border-transparent">
                    "{t.remark}"
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-900 text-[10px] text-slate-500">
                  <span>{getIndianDateTimeString(t.timestamp)}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingTarget(t)}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTarget(t.id)}
                      className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-400 rounded-lg font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table view (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-transparent">
              <tr>
                <th className="p-3 rounded-l-xl">ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Month</th>
                <th className="p-3">Sales Person Name</th>
                <th className="p-3">Target Progress</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3">Remark</th>
                <th className="p-3 rounded-r-xl text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />
                    <span>Fetching target records...</span>
                  </td>
                </tr>
              ) : filteredTargets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                    No target records found. Assign a target above to insert data.
                  </td>
                </tr>
              ) : (
                filteredTargets.map((t, idx) => (
                  <tr key={t.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono text-sky-600 dark:text-sky-400 font-semibold">{t.id}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">{getIndianDateTimeString(t.timestamp)}</td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{formatMonthDisplay(t.month)}</td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{t.salesPersonName}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1.5 min-w-[120px]">
                        <div className="flex items-center justify-between text-[11px] font-bold font-mono">
                          <span className="text-emerald-600 dark:text-emerald-400">{getAchievedCount(t)} Achieved</span>
                          <span className="text-slate-500">/ {t.totalNewOrders}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${t.totalNewOrders > 0 ? Math.min((getAchievedCount(t) / t.totalNewOrders) * 100, 100) : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black">
                      ₹{(t.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{t.remark || '-'}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setEditingTarget(t)} className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteTarget(t.id)} className="p-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-400 rounded-lg transition-colors cursor-pointer" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT TARGET MODAL */}
      <AnimatePresence>
        {editingTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Target</h2>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">{editingTarget.id}</p>
                  </div>
                </div>
                <button onClick={() => setEditingTarget(null)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateTarget} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Sales Person Name <span className="text-rose-500 dark:text-rose-400">*</span></label>
                    <CustomSelect
                      value={editingTarget.salesPersonName}
                      onChange={(v) => setEditingTarget({ ...editingTarget, salesPersonName: v })}
                      options={salesPersonsList.map(name => ({ value: name, label: name }))}
                      triggerClassName="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Month <span className="text-rose-500 dark:text-rose-400">*</span></label>
                    <input
                      type="text"
                      value={editingTarget.month}
                      onChange={(e) => setEditingTarget({ ...editingTarget, month: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Target Orders (Qty) <span className="text-rose-500 dark:text-rose-400">*</span></label>
                    <input
                      type="number"
                      value={editingTarget.totalNewOrders}
                      onChange={(e) => setEditingTarget({ ...editingTarget, totalNewOrders: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Target Amount (₹) <span className="text-rose-500 dark:text-rose-400">*</span></label>
                    <input
                      type="number"
                      value={editingTarget.amount}
                      onChange={(e) => setEditingTarget({ ...editingTarget, amount: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Remark</label>
                  <input
                    type="text"
                    value={editingTarget.remark}
                    onChange={(e) => setEditingTarget({ ...editingTarget, remark: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button type="button" onClick={() => setEditingTarget(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={isUpdating} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all disabled:opacity-50 cursor-pointer">
                    {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
