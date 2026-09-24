import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MorningPlan } from '../../types';
import { submitMorningPlanToSheet, fetchSalesPersonsFromLoginSheet } from '../../services/api';
import { getIndianDateString, convertDDMMYYYYToInputDate, convertInputDateToDDMMYYYY } from '../../utils/dateUtils';
import {
  Sun,
  Plus,
  Calendar,
  Building,
  User,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  Search,
  ChevronDown,
  ChevronLeft,
  Trash2,
  Users,
  Building2,
  Eye,
  X,
  ChevronRight,
  ExternalLink,
  Clock,
  Briefcase,
  Edit2,
  UserX,
  Plane,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAvatar } from '../common/UserAvatar';

interface CompanyVisitEntry {
  id: string;
  partyName: string;
  address: string;
  remarks: string;
}

interface SalesPersonSummaryGroup {
  salesPersonName: string;
  meetingDate: string;
  companyCount: number;
  plans: MorningPlan[];
}

export const MorningPlanModule: React.FC = () => {
  const { authState, morningPlans, addMorningPlan, updateMorningPlan, deleteMorningPlan, refreshMorningPlans, captureGPSLocation, showToast } = useAuth();
  const user = authState.user;

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Date filter state: Default to today's date in Indian format, or 'ALL'
  const todayDate = getIndianDateString();
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(todayDate);
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Interactive Calendar Popover State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calViewDate, setCalViewDate] = useState<Date>(() => {
    const parts = todayDate.split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10) || 1;
      const m = (parseInt(parts[1], 10) || 1) - 1;
      const y = parseInt(parts[2], 10) || new Date().getFullYear();
      return new Date(y, m, 1);
    }
    return new Date();
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close calendar popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Modal for inspecting details of a specific Sales Person's plan
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<SalesPersonSummaryGroup | null>(null);

  // Edit Plan State
  const [editingPlan, setEditingPlan] = useState<MorningPlan | null>(null);

  // Form fields matching Google Sheet 'Morning Follow Up' (Uid, Date, Sales Person Name, Company Name, Address, Remark)
  const [salesPersonName, setSalesPersonName] = useState(user?.userName || 'Atul Baghmar');
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
  const [meetingDate, setMeetingDate] = useState(getIndianDateString());

  // Day status: whether the sales person is visiting clients, on leave, or travelling
  const [dayStatus, setDayStatus] = useState<'visit' | 'leave' | 'travel'>('visit');
  const [statusRemark, setStatusRemark] = useState('');

  // Dynamic array of companies for form
  const [companies, setCompanies] = useState<CompanyVisitEntry[]>([
    { id: '1', partyName: '', address: '', remarks: '' },
  ]);

  const addCompanyRow = () => {
    setCompanies(prev => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        partyName: '',
        address: '',
        remarks: '',
      },
    ]);
  };

  const removeCompanyRow = (id: string) => {
    if (companies.length <= 1) return;
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  const updateCompanyField = (id: string, field: keyof CompanyVisitEntry, value: string) => {
    setCompanies(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  useEffect(() => {
    let isMounted = true;
    refreshMorningPlans();
    fetchSalesPersonsFromLoginSheet().then(names => {
      if (isMounted && names && names.length > 0) {
        setSalesPersonsList(names);
        if (!salesPersonName || !names.includes(salesPersonName)) {
          setSalesPersonName(names[0]);
        }
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Sales person is on leave or travelling today — save a single simplified record
    if (dayStatus !== 'visit') {
      if (!statusRemark.trim()) {
        showToast('error', 'Incomplete Form', 'Please enter a remark.');
        return;
      }

      setIsSubmitting(true);
      const gpsRec = await captureGPSLocation('Morning Plan Submission');
      const statusLabel = dayStatus === 'leave' ? 'On Leave' : 'Travelling';

      try {
        const planData: Omit<MorningPlan, 'id' | 'createdAt'> = {
          salesPersonId: user?.id || 'SALES01',
          salesPersonName: salesPersonName || user?.userName || 'Sales Executive',
          meetingDate: getIndianDateString(meetingDate),
          partyName: statusLabel,
          contactPerson: statusLabel,
          mobileNumber: '',
          city: statusLabel,
          purpose: statusRemark.trim(),
          expectedBusiness: 0,
          priority: 'High',
          remarks: statusRemark.trim(),
          status: 'Submitted',
          latitude: gpsRec?.latitude,
          longitude: gpsRec?.longitude,
          address: gpsRec?.address || '',
        };

        const createdPlan = await submitMorningPlanToSheet(planData);
        addMorningPlan(createdPlan);
        showToast('success', 'Recorded', `${statusLabel} recorded for ${salesPersonName}.`);
        setStatusRemark('');
        setDayStatus('visit');
        setShowModal(false);
      } catch (err: any) {
        showToast('error', 'Submission Failed', err.message || 'Could not save record.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Validate that at least one company name is filled
    const validCompanies = companies.filter(c => c.partyName.trim() !== '');
    if (validCompanies.length === 0) {
      showToast('error', 'Incomplete Form', 'Please enter at least one Company Name.');
      return;
    }

    setIsSubmitting(true);

    // Capture location automatically
    const gpsRec = await captureGPSLocation('Morning Plan Submission');

    try {
      let count = 0;
      for (const company of validCompanies) {
        const planData: Omit<MorningPlan, 'id' | 'createdAt'> = {
          salesPersonId: user?.id || 'SALES01',
          salesPersonName: salesPersonName || user?.userName || 'Sales Executive',
          meetingDate: getIndianDateString(meetingDate),
          partyName: company.partyName.trim(),
          contactPerson: company.partyName.trim(),
          mobileNumber: '',
          city: company.address.trim() || 'Location',
          purpose: company.remarks.trim() || 'Morning Follow Up',
          expectedBusiness: 0,
          priority: 'High',
          remarks: company.remarks.trim(),
          status: 'Submitted',
          latitude: gpsRec?.latitude,
          longitude: gpsRec?.longitude,
          address: company.address.trim() || gpsRec?.address || '',
        };

        const createdPlan = await submitMorningPlanToSheet(planData);
        addMorningPlan(createdPlan);
        count++;
      }

      showToast(
        'success',
        'Morning Follow Up Created',
        `${count} company ${count > 1 ? 'visits' : 'visit'} recorded.`
      );

      // Reset form
      setCompanies([{ id: Date.now().toString(), partyName: '', address: '', remarks: '' }]);
      setShowModal(false);
    } catch (err: any) {
      showToast('error', 'Submission Failed', err.message || 'Could not save Morning Plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setIsSubmitting(true);
    try {
      updateMorningPlan(editingPlan);
      showToast('success', 'Plan Updated', 'Morning plan has been updated successfully.');
      setEditingPlan(null);
      // Also update selectedGroupDetails if it's open
      if (selectedGroupDetails) {
        setSelectedGroupDetails(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            plans: prev.plans.map(p => p.id === editingPlan.id ? editingPlan : p)
          };
        });
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Could not update plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    const success = await deleteMorningPlan(id);
    if (!success) {
      showToast('error', 'Delete Failed', 'Could not delete the plan from the sheet. Please try again.');
      return;
    }
    showToast('success', 'Plan Deleted', 'Plan has been removed.');
    if (selectedGroupDetails) {
      setSelectedGroupDetails(prev => {
        if (!prev) return prev;
        const newPlans = prev.plans.filter(p => p.id !== id);
        return {
          ...prev,
          companyCount: newPlans.length,
          plans: newPlans
        };
      });
    }
  };

  // Filter plans based on date and search term, with strict deduplication by ID
  const filteredPlans = useMemo(() => {
    const map = new Map<string, MorningPlan>();
    const isSalesUser = user?.role !== 'Admin';
    const myName = (user?.userName || user?.name || '').toLowerCase().trim();

    morningPlans.forEach(p => {
      if (!p || !p.id) return;

      // Sales ID data restriction: only see own records
      if (isSalesUser && myName) {
        const planPerson = (p.salesPersonName || '').toLowerCase().trim();
        if (planPerson && !planPerson.includes(myName) && !myName.includes(planPerson)) {
          return;
        }
      }

      const matchesDate =
        selectedDateFilter === 'ALL' ||
        !selectedDateFilter ||
        p.meetingDate === selectedDateFilter;

      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        p.salesPersonName.toLowerCase().includes(query) ||
        p.partyName.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        (p.remarks && p.remarks.toLowerCase().includes(query)) ||
        (p.address && p.address.toLowerCase().includes(query));

      if (matchesDate && matchesSearch) {
        map.set(p.id, p);
      }
    });

    return Array.from(map.values());
  }, [morningPlans, selectedDateFilter, searchTerm, user]);

  // Group filtered plans by Sales Person Name
  const groupedBySalesPerson: SalesPersonSummaryGroup[] = useMemo(() => {
    const groupsMap = new Map<string, MorningPlan[]>();

    filteredPlans.forEach(plan => {
      const key = `${plan.salesPersonName}___${plan.meetingDate}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(plan);
    });

    const result: SalesPersonSummaryGroup[] = [];
    groupsMap.forEach((plansList, key) => {
      const [salesPersonName, meetingDate] = key.split('___');
      result.push({
        salesPersonName,
        meetingDate,
        companyCount: plansList.length,
        plans: plansList,
      });
    });

    // Sort by company count descending
    return result.sort((a, b) => b.companyCount - a.companyCount);
  }, [filteredPlans]);

  // Map of meetingDate -> status indicators (Plan, Actual, Leave, Travel)
  const dateStatusMap = useMemo(() => {
    const map: Record<string, { hasPlan: boolean; hasActual: boolean; hasLeave: boolean; hasTravel: boolean; totalCount: number }> = {};
    const isSalesUser = user?.role !== 'Admin';
    const myName = (user?.userName || user?.name || '').toLowerCase().trim();

    morningPlans.forEach(p => {
      if (!p || !p.meetingDate) return;

      // Sales ID data restriction
      if (isSalesUser && myName) {
        const planPerson = (p.salesPersonName || '').toLowerCase().trim();
        if (planPerson && !planPerson.includes(myName) && !myName.includes(planPerson)) {
          return;
        }
      }

      if (!map[p.meetingDate]) {
        map[p.meetingDate] = { hasPlan: false, hasActual: false, hasLeave: false, hasTravel: false, totalCount: 0 };
      }
      map[p.meetingDate].totalCount += 1;
      const party = (p.partyName || '').toLowerCase();
      const purpose = (p.purpose || '').toLowerCase();
      const status = (p.status || '').toLowerCase();

      if (party.includes('leave') || purpose.includes('leave')) {
        map[p.meetingDate].hasLeave = true;
      } else if (party.includes('travel') || purpose.includes('travel')) {
        map[p.meetingDate].hasTravel = true;
      } else if (status.includes('completed') || status.includes('visited')) {
        map[p.meetingDate].hasActual = true;
      } else {
        map[p.meetingDate].hasPlan = true;
      }
    });
    return map;
  }, [morningPlans, user]);

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = calViewDate.getFullYear();
  const currentMonth = calViewDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCalViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCalViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        {/* Soft accent glow — theme-safe */}
        <div className="pointer-events-none absolute -top-20 -right-10 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/30">
            <Sun className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">Morning Follow Up Plans</h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
              Sales team daily planned company visits &amp; follow ups
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          className="relative flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>New Morning Plan</span>
        </motion.button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sales person, company name, address..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
            {/* Interactive Date Calendar Selector */}
            <div className="relative" ref={calendarRef}>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(prev => !prev)}
                className="flex items-center gap-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-95 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs group"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Date:</span>
                  <span className="text-amber-500 dark:text-amber-400 font-black">
                    {selectedDateFilter === 'ALL'
                      ? 'All Dates'
                      : selectedDateFilter === todayDate
                      ? `Today (${todayDate})`
                      : selectedDateFilter}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isCalendarOpen ? 'rotate-180 text-amber-500' : ''
                  }`}
                />
              </button>

              {/* Floating Calendar Popover - Small, Compact & Perfectly Positioned */}
              <AnimatePresence>
                {isCalendarOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="absolute left-0 top-full mt-1.5 z-50 w-[245px] sm:w-[258px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 text-slate-800 dark:text-slate-100 select-none backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10"
                  >
                    {/* Month Navigation Header */}
                    <div className="flex items-center justify-between pb-1.5 px-0.5">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                        title="Previous Month"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                        {MONTH_NAMES[currentMonth]} {currentYear}
                      </h4>

                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                        title="Next Month"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-0.5 text-center text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-1">
                      {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                        <span key={d}>
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 pb-2">
                      {/* Empty padding slots */}
                      {Array.from({ length: startDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="w-6.5 h-6.5" />
                      ))}

                      {/* Day cells */}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dayStr = String(dayNum).padStart(2, '0');
                        const monthStr = String(currentMonth + 1).padStart(2, '0');
                        const dateKey = `${dayStr}-${monthStr}-${currentYear}`;
                        const statusInfo = dateStatusMap[dateKey];
                        const isSelected = selectedDateFilter === dateKey;
                        const isToday = todayDate === dateKey;

                        return (
                          <button
                            key={dateKey}
                            type="button"
                            onClick={() => {
                              setSelectedDateFilter(dateKey);
                              setIsCalendarOpen(false);
                            }}
                            className={`w-6.5 h-6.5 mx-auto rounded-lg text-[10.5px] font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white font-bold shadow-xs scale-105 z-10'
                                : isToday
                                ? 'border border-indigo-600 dark:border-indigo-400 text-slate-900 dark:text-white font-bold bg-indigo-50/50 dark:bg-indigo-950/40'
                                : statusInfo
                                ? 'bg-slate-100/90 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                                : 'bg-slate-50/60 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={`${dateKey}${statusInfo ? ` (${statusInfo.totalCount} entries)` : ''}`}
                          >
                            <span className="leading-none">{dayNum}</span>

                            {/* Status Dots underneath */}
                            {statusInfo && !isSelected && (
                              <div className="flex items-center gap-0.5 absolute bottom-0.5">
                                {statusInfo.hasPlan && (
                                  <span className="w-1 h-1 rounded-full bg-amber-400 shadow-xs" title="Plan" />
                                )}
                                {statusInfo.hasActual && (
                                  <span className="w-1 h-1 rounded-full bg-emerald-500 shadow-xs" title="Actual" />
                                )}
                                {statusInfo.hasLeave && (
                                  <span className="w-1 h-1 rounded-full bg-rose-500 shadow-xs" title="Leave" />
                                )}
                                {statusInfo.hasTravel && (
                                  <span className="w-1 h-1 rounded-full bg-purple-500 shadow-xs" title="Travel" />
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Legend Footer */}
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[8.5px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full border border-indigo-500 inline-block" />
                          <span>Today</span>
                        </span>
                        <span className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                          <span>Plan</span>
                        </span>
                        <span className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          <span>Act</span>
                        </span>
                        <span className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                          <span>Leave</span>
                        </span>
                        <span className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                          <span>Trvl</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDateFilter('ALL');
                          setIsCalendarOpen(false);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[8.5px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0 ml-1"
                      >
                        All
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            {/* Category Mode: Summary vs All Plans */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Sales Person Summary</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>All Plans ({filteredPlans.length})</span>
              </button>
            </div>

            {/* Layout Switcher: Grid vs List */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  layoutMode === 'grid'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('list')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  layoutMode === 'list'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="group relative overflow-hidden p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-amber-400 to-orange-500" />
          <div className="pl-2">
            <p className="text-xs font-medium text-slate-400">Total Companies Planned</p>
            <p className="text-3xl font-black text-amber-400 mt-1 tabular-nums">{filteredPlans.length}</p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 transition-transform group-hover:scale-110">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="group relative overflow-hidden p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-sky-400 to-blue-500" />
          <div className="pl-2">
            <p className="text-xs font-medium text-slate-400">Active Sales Executives</p>
            <p className="text-3xl font-black text-sky-600 mt-1 tabular-nums">{groupedBySalesPerson.length}</p>
          </div>
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-600 transition-transform group-hover:scale-110">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="group relative overflow-hidden p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-emerald-400 to-teal-500" />
          <div className="pl-2">
            <p className="text-xs font-medium text-slate-400">Selected Date</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">
              {selectedDateFilter === 'ALL' ? 'All Records' : selectedDateFilter}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 transition-transform group-hover:scale-110">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {viewMode === 'grouped' ? (
        groupedBySalesPerson.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-full flex flex-col items-center justify-center text-center py-16 px-6 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-4">
              <Sun className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">No Morning Plans Found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm">
              No sales executive submitted morning follow-ups for {selectedDateFilter === 'ALL' ? 'the selected search' : selectedDateFilter}.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowModal(true)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Morning Plan</span>
            </motion.button>
          </motion.div>
        ) : layoutMode === 'grid' ? (
          /* Grouped Grid View by Sales Person */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedBySalesPerson.map((group, groupIdx) => (
              <motion.div
                key={`group-${group.salesPersonName}-${group.meetingDate}-${groupIdx}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIdx * 0.05, duration: 0.28, type: 'spring', stiffness: 350, damping: 25 }}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedGroupDetails(group)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all duration-200 space-y-4 cursor-pointer hover:shadow-xl hover:shadow-amber-500/10 group relative overflow-hidden text-slate-900 dark:text-slate-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={group.salesPersonName} size="md" showRankBadge={false} />
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {group.salesPersonName}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>{group.meetingDate}</span>
                      </p>
                    </div>
                  </div>

                  {/* Company Count Pill */}
                  <div className="px-3 py-1.5 rounded-full bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 font-extrabold text-xs flex items-center gap-1.5 shadow-xs shrink-0">
                    <Building className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{group.companyCount} {group.companyCount === 1 ? 'Company' : 'Companies'}</span>
                  </div>
                </div>

                {/* Companies Preview List */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Planned Visit List</span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono">{group.companyCount} total</span>
                  </p>
                  <ul className="space-y-1.5">
                    {group.plans.slice(0, 4).map((p, idx) => (
                      <li key={`prev-${p.id || 'plan'}-${idx}`} className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs truncate">
                        <span className="truncate font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0"></span>
                          <span className="truncate">{p.partyName}</span>
                        </span>
                        {p.city && p.city !== 'Location' && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 ml-2 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                            {p.city}
                          </span>
                        )}
                      </li>
                    ))}
                    {group.plans.length > 4 && (
                      <li className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold pt-1">
                        + {group.plans.length - 4} more companies...
                      </li>
                    )}
                  </ul>
                </div>

                {/* Bottom Footer Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    <Eye className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    Click to View Details
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Grouped Table List View */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-3.5 min-w-[180px]">Sales Executive</th>
                    <th className="p-3.5 min-w-[130px]">Meeting Date</th>
                    <th className="p-3.5 min-w-[140px]">Total Companies</th>
                    <th className="p-3.5 min-w-[300px]">Planned Visits Preview</th>
                    <th className="p-3.5 text-right min-w-[120px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {groupedBySalesPerson.map((group, gIdx) => (
                    <tr
                      key={`grouped-list-${group.salesPersonName}-${group.meetingDate}-${gIdx}`}
                      onClick={() => setSelectedGroupDetails(group)}
                      className="hover:bg-amber-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={group.salesPersonName} size="sm" showRankBadge={false} />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {group.salesPersonName}
                            </p>
                            <span className="text-[10px] text-slate-400">Sales Executive</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{group.meetingDate}</span>
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs inline-flex items-center gap-1">
                          <Building className="w-3.5 h-3.5" />
                          <span>{group.companyCount} {group.companyCount === 1 ? 'Company' : 'Companies'}</span>
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                          {group.plans.slice(0, 3).map((p, pIdx) => (
                            <span
                              key={`tag-${p.id}-${pIdx}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/80 dark:border-slate-700 truncate max-w-[160px]"
                              title={p.partyName}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="truncate">{p.partyName}</span>
                            </span>
                          ))}
                          {group.plans.length > 3 && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                              +{group.plans.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGroupDetails(group);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Plans</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Detailed View for All Plans */
        filteredPlans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-full flex flex-col items-center justify-center text-center py-16 px-6 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">No Company Plans Found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm">
              Nothing matches the current date or search filters. Try adjusting them.
            </p>
          </motion.div>
        ) : layoutMode === 'grid' ? (
          /* Grid View for All Plans */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlans.map((plan, planIdx) => (
              <motion.div
                key={`list-${plan.id || 'plan'}-${planIdx}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: planIdx * 0.03, duration: 0.22 }}
                whileHover={{ y: -2 }}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3 relative overflow-hidden shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {plan.id}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                      {plan.partyName}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <User className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      {plan.salesPersonName}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingPlan(plan)} className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/50" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {plan.address && (
                    <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{plan.address}</span>
                    </p>
                  )}
                  {plan.remarks && (
                    <p className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300">
                      <strong className="text-amber-600 dark:text-amber-400">Remark:</strong> {plan.remarks}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {plan.meetingDate}
                  </span>

                  {plan.latitude && plan.longitude ? (
                    <a
                      href={`https://www.google.com/maps?q=${plan.latitude},${plan.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      GPS Logged
                    </a>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Submitted
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Table List View for All Plans */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-3.5 min-w-[80px]">UID</th>
                    <th className="p-3.5 min-w-[170px]">Sales Person</th>
                    <th className="p-3.5 min-w-[110px]">Date</th>
                    <th className="p-3.5 min-w-[180px]">Company Name</th>
                    <th className="p-3.5 min-w-[180px]">Address</th>
                    <th className="p-3.5 min-w-[160px]">Remarks</th>
                    <th className="p-3.5 text-right min-w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPlans.map((plan, planIdx) => (
                    <tr
                      key={`plan-tbl-row-${plan.id || 'plan'}-${planIdx}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                        {plan.id}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <UserAvatar name={plan.salesPersonName} size="xs" showRankBadge={false} />
                          <span className="font-bold text-slate-900 dark:text-white">{plan.salesPersonName}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{plan.meetingDate}</span>
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        {plan.partyName}
                      </td>
                      <td className="p-3.5 text-slate-500 dark:text-slate-400">
                        {plan.address || '-'}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {plan.remarks || '-'}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingPlan(plan)}
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                            title="Edit Plan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(plan.id)}
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/50"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* MODAL 1: CREATE NEW MORNING PLAN */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Morning Plan</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Fill date, sales executive, and target companies</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Date (DD-MM-YYYY) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={convertDDMMYYYYToInputDate(meetingDate)}
                      onChange={(e) => setMeetingDate(convertInputDateToDDMMYYYY(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Sales Person Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={salesPersonName}
                        onChange={(e) => setSalesPersonName(e.target.value)}
                        className="w-full p-2.5 pr-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
                        required
                      >
                        {salesPersonsList.map((name) => (
                          <option key={name} value={name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Day Status: Visiting Clients / On Leave / Travelling */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Today's Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDayStatus('visit')}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        dayStatus === 'visit'
                          ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/25'
                          : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Building className="w-3.5 h-3.5" />
                      <span>Visiting Clients</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayStatus('leave')}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        dayStatus === 'leave'
                          ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/25'
                          : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>On Leave</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayStatus('travel')}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        dayStatus === 'travel'
                          ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/25'
                          : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Plane className="w-3.5 h-3.5" />
                      <span>Travelling</span>
                    </button>
                  </div>
                </div>

                {dayStatus !== 'visit' ? (
                  /* Leave / Travelling: just a remark, no company visits needed */
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Remark <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={statusRemark}
                      onChange={(e) => setStatusRemark(e.target.value)}
                      rows={3}
                      placeholder={dayStatus === 'leave' ? 'e.g. On leave due to fever, back tomorrow' : 'e.g. Travelling to Raipur, expected arrival 6 PM'}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                ) : (
                <>
                {/* Dynamic List of Companies */}
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Companies / Visits ({companies.length})
                    </label>
                    <button
                      type="button"
                      onClick={addCompanyRow}
                      className="px-3 py-1.5 bg-amber-500/15 dark:bg-amber-500/20 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border border-amber-500/40 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Add Another Company</span>
                    </button>
                  </div>

                  {companies.map((company, index) => (
                    <div key={company.id} className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 relative">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800/60">
                        <span className="font-bold text-slate-800 dark:text-slate-300 text-[11px]">
                          Company #{index + 1}
                        </span>
                        {companies.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCompanyRow(company.id)}
                            className="text-rose-600 dark:text-rose-400 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                            title="Remove Company"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-[11px]">
                          Company Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={company.partyName}
                          onChange={(e) => updateCompanyField(company.id, 'partyName', e.target.value)}
                          placeholder="e.g. Reliance Logistics Pvt Ltd"
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-[11px]">Address</label>
                        <input
                          type="text"
                          value={company.address}
                          onChange={(e) => updateCompanyField(company.id, 'address', e.target.value)}
                          placeholder="e.g. Plot 42, BKC Industrial Area, Mumbai"
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-[11px]">Remark</label>
                        <input
                          type="text"
                          value={company.remarks}
                          onChange={(e) => updateCompanyField(company.id, 'remarks', e.target.value)}
                          placeholder="e.g. Follow up regarding Q3 lubricants order"
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                </>
                )}

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>GPS location will be tagged automatically upon submission.</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-amber-500/25"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Plan...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {dayStatus === 'visit'
                            ? `Submit Morning Plan (${companies.length})`
                            : `Save ${dayStatus === 'leave' ? 'Leave' : 'Travelling'} Record`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: SALES PERSON COMPANY DETAILS MODAL */}
      <AnimatePresence>
        {selectedGroupDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <UserAvatar name={selectedGroupDetails.salesPersonName} size="lg" showRankBadge={false} />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{selectedGroupDetails.salesPersonName}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold">
                        {selectedGroupDetails.companyCount} {selectedGroupDetails.companyCount === 1 ? 'Company' : 'Companies'}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>Meeting Date: <strong>{selectedGroupDetails.meetingDate}</strong></span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedGroupDetails(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Companies Breakdown List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span>Planned Company Visits ({selectedGroupDetails.plans.length})</span>
                </h3>

                <div className="space-y-3">
                  {selectedGroupDetails.plans.map((plan, idx) => (
                    <div
                      key={`modal-${plan.id || 'plan'}-${idx}`}
                      className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{plan.partyName}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                            {plan.id}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); setEditingPlan(plan); }} className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors cursor-pointer border border-slate-200 dark:border-slate-700" title="Edit">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }} className="p-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-md transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/50" title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {plan.address && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pl-8">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{plan.address}</span>
                        </p>
                      )}

                      {plan.remarks && (
                        <div className="ml-8 p-2.5 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300">
                          <strong className="text-amber-600 dark:text-amber-400">Remark:</strong> {plan.remarks}
                        </div>
                      )}

                      <div className="ml-8 pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800/40">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Submitted: {plan.createdAt || plan.meetingDate}
                        </span>

                        {plan.latitude && plan.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${plan.latitude},${plan.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>GPS Location</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-500">Location Tagged</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSelectedGroupDetails(null)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-amber-500/25"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PLAN MODAL */}
      <AnimatePresence>
        {editingPlan && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Plan</h2>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">{editingPlan.id}</p>
                  </div>
                </div>
                <button onClick={() => setEditingPlan(null)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Company Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editingPlan.partyName}
                    onChange={(e) => setEditingPlan({ ...editingPlan, partyName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Meeting Date (DD-MM-YYYY) <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    value={convertDDMMYYYYToInputDate(editingPlan.meetingDate)}
                    onChange={(e) => setEditingPlan({ ...editingPlan, meetingDate: convertInputDateToDDMMYYYY(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">City / Location</label>
                  <input
                    type="text"
                    value={editingPlan.city}
                    onChange={(e) => setEditingPlan({ ...editingPlan, city: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Remarks</label>
                  <textarea
                    value={editingPlan.remarks}
                    onChange={(e) => setEditingPlan({ ...editingPlan, remarks: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none min-h-[80px]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold transition-all disabled:opacity-50 shadow-md shadow-amber-500/25">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
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
