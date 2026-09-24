import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getIndianDateString, isDateWithinRange, convertInputDateToDDMMYYYY } from '../../utils/dateUtils';
import { FileSpreadsheet, Download, Filter, FileText, FileCode, Search, Calendar, User, Shield, ChevronLeft, ChevronRight, UserX, Plane, X, CheckCircle2, Clock, Building2, ChevronDown, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Custom in-DOM dropdown replacing native <select> for this page's report filters.
// Native <select> option lists render as an OS/WebView-anchored popup that can
// appear outside the filter card's bounds on mobile (Android WebView) — this
// keeps the list positioned and sized relative to its own trigger instead.
interface ReportDropdownOption {
  value: string;
  label: string;
}

interface ReportCustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ReportDropdownOption[];
  icon?: React.ReactNode;
  compact?: boolean;
}

const ReportCustomSelect: React.FC<ReportCustomSelectProps> = ({ value, onChange, options, icon, compact }) => {
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

  const selectedLabel = options.find(o => o.value === value)?.label ?? value;

  return (
    <div className={compact ? 'relative inline-block' : 'relative w-full'} ref={wrapRef}>
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`${compact ? 'w-auto min-w-[150px]' : 'w-full'} ${icon ? 'pl-9' : 'pl-3'} pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white text-left truncate cursor-pointer focus:outline-none focus:border-sky-500 transition-colors`}
      >
        {selectedLabel}
      </button>
      <ChevronDown className={`w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                opt.value === value
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
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

export const ReportsModule: React.FC = () => {
  const { authState, morningPlans, eveningReports, showToast, themeMode } = useAuth();
  const user = authState.user;
  const isAdmin = user?.role === 'Admin';

  // Filters
  const [reportType, setReportType] = useState('Daily');
  const [salesPersonFilter, setSalesPersonFilter] = useState('All');
  const [managerFilter, setManagerFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [followUpTypeFilter, setFollowUpTypeFilter] = useState('All');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  const userSalesName = user?.userName || user?.name || '';
  const mySalesNameLower = userSalesName.toLowerCase().trim();

  // Scope plans & reports to current sales rep if not Admin
  const scopedMorningPlans = useMemo(() => {
    if (isAdmin || !userSalesName) return morningPlans;
    return morningPlans.filter(p => {
      const pName = (p.salesPersonName || '').toLowerCase().trim();
      return pName === mySalesNameLower || (mySalesNameLower && pName.includes(mySalesNameLower)) || (mySalesNameLower && mySalesNameLower.includes(pName));
    });
  }, [morningPlans, isAdmin, userSalesName, mySalesNameLower]);

  const scopedEveningReports = useMemo(() => {
    if (isAdmin || !userSalesName) return eveningReports;
    return eveningReports.filter(r => {
      const rName = (r.salesPersonName || '').toLowerCase().trim();
      return rName === mySalesNameLower || (mySalesNameLower && rName.includes(mySalesNameLower)) || (mySalesNameLower && mySalesNameLower.includes(rName));
    });
  }, [eveningReports, isAdmin, userSalesName, mySalesNameLower]);

  // Collect unique filter choices
  const salesPersons = useMemo(() => {
    if (!isAdmin && user) {
      return [user.userName || user.name || 'Sales Rep'];
    }
    return Array.from(new Set(scopedMorningPlans.map(p => p.salesPersonName)));
  }, [scopedMorningPlans, isAdmin, user]);

  const cities = Array.from(new Set(scopedMorningPlans.map(p => p.city)));

  // Combine reports and morning plans for report view
  const processedReportIds = new Set<string>();
  const combinedData = scopedMorningPlans.map(plan => {
    const report = scopedEveningReports.find(r => r.morningPlanId === plan.id) ||
      scopedEveningReports.find(r =>
        r.partyName === plan.partyName &&
        (r.meetingDate === plan.meetingDate || r.meetingDate === getIndianDateString(plan.meetingDate)) &&
        r.salesPersonId === plan.salesPersonId
      );
    if (report) {
      processedReportIds.add(report.id);
      if (report.morningPlanId) processedReportIds.add(report.morningPlanId);
    }
    return {
      planId: plan.id,
      salesPerson: plan.salesPersonName,
      meetingDate: getIndianDateString(plan.meetingDate),
      partyName: plan.partyName,
      contactPerson: plan.contactPerson,
      city: plan.city,
      expectedBusiness: plan.expectedBusiness,
      priority: plan.priority,
      visited: report ? report.visited : 'Pending',
      actualOrder: report ? report.expectedOrder : 0,
      probability: report ? `${report.orderProbability}%` : 'N/A',
      discussion: report ? report.discussion : plan.purpose,
      address: report ? (report.address || '') : (plan.address || ''),
      client: report ? (report.client || '') : '',
      contactNumber: report ? (report.contactNumber || '') : (plan.mobileNumber || ''),
      email: report ? (report.email || '') : '',
      designation: report ? (report.designation || '') : '',
      remarks: report ? (report.remarks || '') : (plan.remarks || ''),
      followUpDate: report ? (report.followUpDate || '') : '',
      attachmentUrls: report ? (report.attachmentUrls || '') : '',
    };
  });

  // Evening entries submitted without a linked Morning Plan (e.g. "New Evening Entry") were being
  // dropped from the report entirely since only morningPlans was iterated above — add them here so
  // every updated follow-up, on any date, still shows up in the table/export.
  scopedEveningReports.forEach(report => {
    if (!report || !report.id) return;
    if (processedReportIds.has(report.id) || (report.morningPlanId && processedReportIds.has(report.morningPlanId))) return;

    combinedData.push({
      planId: report.morningPlanId || report.id,
      salesPerson: report.salesPersonName,
      meetingDate: getIndianDateString(report.meetingDate || report.submittedAt),
      partyName: report.partyName,
      contactPerson: report.client || '',
      city: report.address || '',
      expectedBusiness: 0,
      priority: 'Medium',
      visited: report.visited,
      actualOrder: report.expectedOrder || 0,
      probability: `${report.orderProbability || 0}%`,
      discussion: report.discussion || report.remarks || '',
      address: report.address || '',
      client: report.client || '',
      contactNumber: report.contactNumber || '',
      email: report.email || '',
      designation: report.designation || '',
      remarks: report.remarks || '',
      followUpDate: report.followUpDate || '',
      attachmentUrls: report.attachmentUrls || '',
    });
  });

  // ===== Visit Calendar =====
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const pad2 = (n: number) => String(n).padStart(2, '0');

  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date());
  const [calendarSalesPerson, setCalendarSalesPerson] = useState('All');
  const currentMonthLabel = MONTH_NAMES[new Date().getMonth()];

  // Clicking a day's Plan/Actual badge opens a detail popup for that day
  const [dayDetail, setDayDetail] = useState<{ dateKey: string; type: 'plan' | 'actual' } | null>(null);
  const dayDetailItems = dayDetail
    ? combinedData.filter(item => {
        if (item.meetingDate !== dayDetail.dateKey) return false;
        if (calendarSalesPerson !== 'All' && item.salesPerson !== calendarSalesPerson) return false;
        if (item.partyName === 'On Leave' || item.partyName === 'Travelling') return false;
        if (dayDetail.type === 'actual' && item.visited !== 'Yes') return false;
        return true;
      })
    : [];

  const goToPrevMonth = () => setCalendarMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setCalendarMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const goToCurrentMonth = () => setCalendarMonthDate(new Date());

  // Plan & Actual visit counts per day (key: DD-MM-YYYY), for the selected sales person.
  // Leave / Travelling day-status entries (from Morning Plan) are tracked separately, not as visits.
  const calendarCounts = useMemo(() => {
    const map = new Map<string, { plan: number; actual: number; leave: string[]; travel: string[] }>();
    combinedData.forEach(item => {
      if (calendarSalesPerson !== 'All' && item.salesPerson !== calendarSalesPerson) return;
      if (!map.has(item.meetingDate)) map.set(item.meetingDate, { plan: 0, actual: 0, leave: [], travel: [] });
      const entry = map.get(item.meetingDate)!;

      if (item.partyName === 'On Leave') {
        entry.leave.push(item.salesPerson);
      } else if (item.partyName === 'Travelling') {
        entry.travel.push(item.salesPerson);
      } else {
        entry.plan += 1;
        if (item.visited === 'Yes') entry.actual += 1;
      }
    });
    return map;
  }, [combinedData, calendarSalesPerson]);

  // Grid cells for the currently viewed month (padded to full weeks)
  const calendarGrid = useMemo(() => {
    const year = calendarMonthDate.getFullYear();
    const month = calendarMonthDate.getMonth();
    const firstDayWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const todayKey = getIndianDateString();

    const cells: Array<{ day: number; inCurrentMonth: boolean; dateKey?: string; isToday?: boolean }> = [];

    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, inCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${pad2(d)}-${pad2(month + 1)}-${year}`;
      cells.push({ day: d, inCurrentMonth: true, dateKey, isToday: dateKey === todayKey });
    }
    let trailDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ day: trailDay++, inCurrentMonth: false });
    }

    return cells;
  }, [calendarMonthDate]);

  // Roll-up totals for the currently viewed month (for the summary panel)
  const monthSummary = useMemo(() => {
    let planned = 0, actual = 0, leave = 0, travel = 0, activeDays = 0;
    calendarGrid.forEach(cell => {
      if (!cell.dateKey) return;
      const c = calendarCounts.get(cell.dateKey);
      if (!c) return;
      planned += c.plan;
      actual += c.actual;
      leave += c.leave.length;
      travel += c.travel.length;
      if (c.plan > 0 || c.actual > 0 || c.leave.length > 0 || c.travel.length > 0) activeDays += 1;
    });
    return { planned, actual, pending: Math.max(planned - actual, 0), leave, travel, activeDays };
  }, [calendarGrid, calendarCounts]);

  // Filtered dataset
  const filteredData = combinedData.filter(item => {
    if (salesPersonFilter !== 'All' && item.salesPerson !== salesPersonFilter) return false;
    if (cityFilter !== 'All' && item.city !== cityFilter) return false;
    if (statusFilter !== 'All' && item.visited !== statusFilter) return false;
    // Morning Follow Up = plan only, no evening entry submitted yet (visited === 'Pending')
    // Evening Follow Up = an evening entry already exists (visited is 'Yes' or 'No')
    if (followUpTypeFilter === 'Morning' && item.visited !== 'Pending') return false;
    if (followUpTypeFilter === 'Evening' && item.visited === 'Pending') return false;
    if (dateFromFilter) {
      const fromDD = convertInputDateToDDMMYYYY(dateFromFilter);
      const toDD = dateToFilter ? convertInputDateToDDMMYYYY(dateToFilter) : fromDD;
      if (!isDateWithinRange(item.meetingDate, fromDD, toDD)) return false;
    }
    return true;
  });

  // ===== Sales Person Summary Report (all-time totals, not affected by the filters above) =====
  const salesPersonSummary = useMemo(() => {
    const map = new Map<string, { name: string; planned: number; actual: number; leave: number; travel: number }>();
    combinedData.forEach(item => {
      const key = item.salesPerson.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: item.salesPerson, planned: 0, actual: 0, leave: 0, travel: 0 });
      }
      const entry = map.get(key)!;
      if (item.partyName === 'On Leave') {
        entry.leave += 1;
      } else if (item.partyName === 'Travelling') {
        entry.travel += 1;
      } else {
        entry.planned += 1;
        if (item.visited === 'Yes') entry.actual += 1;
      }
    });

    return Array.from(map.values())
      .map(s => ({ ...s, pending: Math.max(s.planned - s.actual, 0) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [combinedData]);

  const exportSummaryToCSV = () => {
    if (salesPersonSummary.length === 0) return;
    const headers = ['Sales Person', 'Total Planned', 'Total Actual', 'Total Pending', 'On Leave Days', 'Travelling Days'];
    const rows = salesPersonSummary.map(s => [`"${s.name}"`, s.planned, s.actual, s.pending, s.leave, s.travel]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Sales_Person_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'CSV Exported', 'Sales person summary downloaded successfully.');
  };

  const exportSummaryToExcel = () => {
    if (salesPersonSummary.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(salesPersonSummary.map(s => ({
      'Sales Person': s.name,
      'Total Planned': s.planned,
      'Total Actual': s.actual,
      'Total Pending': s.pending,
      'On Leave Days': s.leave,
      'Travelling Days': s.travel,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Person Summary');
    XLSX.writeFile(workbook, `Sales_Person_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('success', 'Excel Exported', 'Sales person summary workbook downloaded successfully.');
  };

  const exportSummaryToPDF = () => {
    if (salesPersonSummary.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Sales Person Summary Report (All-Time)', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    let y = 42;
    doc.setFont('helvetica', 'bold');
    doc.text('Sales Person', 14, y);
    doc.text('Planned', 90, y);
    doc.text('Actual', 118, y);
    doc.text('Pending', 144, y);
    doc.text('Leave', 170, y);
    y += 6;
    doc.setDrawColor(180);
    doc.line(14, y - 4, 196, y - 4);

    doc.setFont('helvetica', 'normal');
    salesPersonSummary.forEach(s => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(s.name, 14, y);
      doc.text(String(s.planned), 90, y);
      doc.text(String(s.actual), 118, y);
      doc.text(String(s.pending), 144, y);
      doc.text(String(s.leave), 170, y);
      y += 7;
    });

    doc.save(`Sales_Person_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('success', 'PDF Exported', 'Sales person summary PDF downloaded.');
  };

  // Export handlers
  const exportToCSV = () => {
    if (filteredData.length === 0) {
      showToast('error', 'No Data', 'No records match the selected filters. Adjust the filters and try again.');
      return;
    }
    const headers = ['Plan ID', 'Sales Rep', 'Meeting Date', 'Party Name', 'City', 'Expected Business', 'Visited Status', 'Actual Order', 'Discussion'];
    const rows = filteredData.map(d => [
      d.planId,
      `"${d.salesPerson}"`,
      d.meetingDate,
      `"${d.partyName}"`,
      `"${d.city}"`,
      d.expectedBusiness,
      d.visited,
      d.actualOrder,
      `"${d.discussion.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Daily_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'CSV Exported', 'Sales report downloaded successfully.');
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      showToast('error', 'No Data', 'No records match the selected filters. Adjust the filters and try again.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(filteredData.map(d => ({
      'Plan ID': d.planId,
      'Sales Person': d.salesPerson,
      'Meeting Date': d.meetingDate,
      'Company Name': d.partyName,
      'Contact Person': d.contactPerson,
      'City': d.city,
      'Address': d.address,
      'Client (Contact Person)': d.client,
      'Contact Number': d.contactNumber,
      'Email': d.email,
      'Designation': d.designation,
      'Expected Business': d.expectedBusiness,
      'Priority': d.priority,
      'Visited': d.visited,
      'Actual Order': d.actualOrder,
      'Probability': d.probability,
      'Remarks': d.remarks,
      'Next Follow Up Date': d.followUpDate,
      'Attachments': d.attachmentUrls,
      'Discussion': d.discussion,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Daily Report');
    XLSX.writeFile(workbook, `Sales_Daily_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('success', 'Excel Exported', 'Excel workbook downloaded successfully.');
  };

  const exportToPDF = () => {
    if (filteredData.length === 0) {
      showToast('error', 'No Data', 'No records match the selected filters. Adjust the filters and try again.');
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Sales Daily Reporting System - Master Log', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    let y = 38;
    filteredData.forEach((item, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${item.partyName} (${item.city}) - ${item.salesPerson}`, 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${item.meetingDate} | Expected: Rs.${item.expectedBusiness} | Visited: ${item.visited}`, 14, y);
      y += 5;
      doc.text(`Discussion: ${item.discussion.substring(0, 80)}...`, 14, y);
      y += 8;
    });

    doc.save(`Sales_Daily_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('success', 'PDF Exported', 'PDF document created and downloaded.');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-950/50 via-slate-900 to-indigo-950/50 border border-blue-800/30">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-lg shadow-blue-950/40">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">Sales Reporting & Export Engine</h1>
            <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
              Generate Daily, Weekly & Monthly filtered reports and summaries
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToPDF}
            className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Export as PDF Document"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>PDF</span>
          </button>

          <button
            onClick={exportToExcel}
            className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Export as Excel File"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Excel</span>
          </button>

          <button
            onClick={exportToCSV}
            className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-800 text-sky-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Export as CSV File"
          >
            <FileCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Report Period</label>
          <ReportCustomSelect
            value={reportType}
            onChange={setReportType}
            icon={<Clock className="w-4 h-4" />}
            options={[
              { value: 'Daily', label: 'Daily Report' },
              { value: 'Weekly', label: 'Weekly Report' },
              { value: 'Monthly', label: 'Monthly Report' },
            ]}
          />
        </div>

        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Sales Person</label>
          <ReportCustomSelect
            value={salesPersonFilter}
            onChange={setSalesPersonFilter}
            icon={<User className="w-4 h-4" />}
            options={[
              { value: 'All', label: 'All Representatives' },
              ...salesPersons.map(sp => ({ value: sp, label: sp })),
            ]}
          />
        </div>

        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">City</label>
          <ReportCustomSelect
            value={cityFilter}
            onChange={setCityFilter}
            icon={<MapPin className="w-4 h-4" />}
            options={[
              { value: 'All', label: 'All Cities' },
              ...cities.map(c => ({ value: c, label: c })),
            ]}
          />
        </div>

        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Visit Status</label>
          <ReportCustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            icon={<CheckCircle2 className="w-4 h-4" />}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Yes', label: 'Visited' },
              { value: 'No', label: 'Not Visited' },
              { value: 'Pending', label: 'Pending' },
            ]}
          />
        </div>

        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Follow Up Type</label>
          <ReportCustomSelect
            value={followUpTypeFilter}
            onChange={setFollowUpTypeFilter}
            icon={<Filter className="w-4 h-4" />}
            options={[
              { value: 'All', label: 'Morning + Evening' },
              { value: 'Morning', label: 'Morning Follow Up (Pending)' },
              { value: 'Evening', label: 'Evening Follow Up (Submitted)' },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 sm:max-w-md">
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Date From</label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              style={{ colorScheme: themeMode === 'dark' ? 'dark' : 'light' }}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Date To</label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              style={{ colorScheme: themeMode === 'dark' ? 'dark' : 'light' }}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>
      </div>
      </div>

      {/* Visit Calendar + Monthly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calendar Card */}
        <div className="relative overflow-hidden p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-xl space-y-3">
          <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-500/20 dark:to-sky-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">Visit Calendar</h2>
            </div>

            <ReportCustomSelect
              value={calendarSalesPerson}
              onChange={setCalendarSalesPerson}
              compact
              options={[
                { value: 'All', label: 'All Sales Reps' },
                ...salesPersons.map(sp => ({ value: sp, label: sp })),
              ]}
            />
          </div>

          {monthSummary.pending > 0 && (
            <div className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 dark:bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
              <Clock className="w-3 h-3" />
              <span>Pending Visits: {monthSummary.pending}</span>
            </div>
          )}

          <div className="relative flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToCurrentMonth}
              className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              title={`Jump to ${currentMonthLabel}`}
            >
              {MONTH_NAMES[calendarMonthDate.getMonth()]} {calendarMonthDate.getFullYear()}
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">
            {WEEKDAY_LABELS.map(d => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="relative grid grid-cols-7 gap-1">
            {calendarGrid.map((cell, idx) => {
              // Only render cells that belong to the currently viewed month — adjacent-month
              // days are left as blank spacers so the weekday columns still line up.
              if (!cell.inCurrentMonth || !cell.dateKey) {
                return <div key={idx} />;
              }

              const counts = calendarCounts.get(cell.dateKey);
              const hasLeave = !!counts?.leave.length;
              const hasTravel = !!counts?.travel.length;
              const hasActual = !!counts && counts.actual > 0;
              const hasPlan = !!counts && counts.plan > 0;
              const dateKey = cell.dateKey;

              // When both plan & actual exist (and it's not a leave/travel day), show the circle
              // half amber (Plan) / half emerald (Actual) instead of one dominant solid color.
              const isSplit = hasPlan && hasActual && !hasLeave && !hasTravel;

              // Dominant status decides the solid circle fill: Leave > Travel > Split > Actual (done) > Plan (pending)
              const circleFill = hasLeave
                ? 'bg-rose-500 text-white'
                : hasTravel
                ? 'bg-purple-500 text-white'
                : isSplit
                ? 'text-slate-950'
                : hasActual
                ? 'bg-emerald-500 text-white'
                : hasPlan
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-800/60 text-slate-400';

              const circleStyle = isSplit
                ? { background: 'linear-gradient(90deg, #fbbf24 50%, #10b981 50%)' }
                : undefined;

              const todayRing = cell.isToday ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-indigo-400' : '';

              // When both plan & actual exist, tapping the circle is ambiguous — show two small
              // choice-dots instead. Otherwise the circle itself opens the relevant detail.
              const circleClickable = !isSplit && !hasLeave && !hasTravel && (hasPlan || hasActual);
              const circleClickType: 'plan' | 'actual' = hasActual ? 'actual' : 'plan';

              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  {circleClickable ? (
                    <button
                      type="button"
                      onClick={() => setDayDetail({ dateKey, type: circleClickType })}
                      title={circleClickType === 'plan' ? `Plan: ${counts!.plan}` : `Actual: ${counts!.actual}`}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer transition-transform hover:scale-110 ${circleFill} ${todayRing}`}
                    >
                      {cell.day}
                    </button>
                  ) : (
                    <span
                      title={hasLeave ? 'On Leave' : hasTravel ? 'Travelling' : isSplit ? `Plan: ${counts!.plan} · Actual: ${counts!.actual}` : undefined}
                      style={circleStyle}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${circleFill} ${todayRing}`}
                    >
                      {cell.day}
                    </span>
                  )}

                  {isSplit && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDayDetail({ dateKey, type: 'plan' })}
                        title={`Plan: ${counts!.plan}`}
                        className="w-2.5 h-2.5 rounded-full bg-amber-500 hover:scale-125 transition-transform cursor-pointer shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => setDayDetail({ dateKey, type: 'actual' })}
                        title={`Actual: ${counts!.actual}`}
                        className="w-2.5 h-2.5 rounded-full bg-emerald-500 hover:scale-125 transition-transform cursor-pointer shrink-0"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1.5 justify-center pt-2 border-t border-slate-800/60 text-[10px] font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-indigo-400 shrink-0"></span>
              <span>Today</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
              <span>Plan</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Actual</span>
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <span>Leave</span>
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
              <span>Travel</span>
            </span>
          </div>
        </div>

        {/* Monthly Summary Card */}
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-xl shadow-slate-950/30 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Summary</p>
              <h3 className="text-sm font-bold text-white mt-0.5">
                {calendarSalesPerson === 'All' ? 'All Sales Reps' : calendarSalesPerson} — {MONTH_NAMES[calendarMonthDate.getMonth()]} {calendarMonthDate.getFullYear()}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{monthSummary.actual}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300/80">Actual</p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-full bg-amber-500 flex items-center justify-center text-white">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-lg font-black text-amber-700 dark:text-amber-400">{monthSummary.pending}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300/80">Pending</p>
            </div>

            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-full bg-sky-500 flex items-center justify-center text-white">
                <Building2 className="w-4 h-4" />
              </div>
              <p className="text-lg font-black text-sky-700 dark:text-sky-400">{monthSummary.planned}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300/80">Planned</p>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-full bg-rose-500 flex items-center justify-center text-white">
                <UserX className="w-4 h-4" />
              </div>
              <p className="text-lg font-black text-rose-700 dark:text-rose-400">{monthSummary.leave}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-rose-300/80">On Leave</p>
            </div>

            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-full bg-purple-500 flex items-center justify-center text-white">
                <Plane className="w-4 h-4" />
              </div>
              <p className="text-lg font-black text-purple-400">{monthSummary.travel}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-purple-300/80">Travelling</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{monthSummary.activeDays} active day{monthSummary.activeDays === 1 ? '' : 's'} this month</span>
          </div>
        </div>
      </div>

      {/* Day Detail Popup: shows Plan or Actual records for the clicked day */}
      <AnimatePresence>
        {dayDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setDayDetail(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className={`text-base font-bold ${dayDetail.type === 'plan' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {dayDetail.type === 'plan' ? 'Planned Visits' : 'Actual Visits'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{dayDetail.dateKey}</p>
                </div>
                <button
                  onClick={() => setDayDetail(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {dayDetailItems.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No records found for this day.</p>
                ) : (
                  dayDetailItems.map((item, idx) => (
                    <div key={`${item.planId}-${idx}`} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">{item.partyName}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{item.planId}</span>
                      </div>
                      <p className="text-slate-400 flex items-center gap-1.5">
                        <User className="w-3 h-3 shrink-0" />
                        <span>{item.salesPerson}</span>
                      </p>
                      {item.city && (
                        <p className="text-slate-400">{item.city}</p>
                      )}
                      {dayDetail.type === 'actual' && (
                        <p className="text-emerald-400 font-semibold">
                          Order: ₹{(item.actualOrder || 0).toLocaleString('en-IN')} · Probability: {item.probability}
                        </p>
                      )}
                      {item.discussion && (
                        <p className="text-slate-300 bg-slate-900 p-2 rounded-xl border border-slate-800">{item.discussion}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sales Person Summary Report (all-time Plan vs Actual per person) */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600" />
            <span>Sales Person Summary Report (All-Time) — {salesPersonSummary.length} Reps</span>
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={exportSummaryToPDF}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Export Summary as PDF Document"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={exportSummaryToExcel}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Export Summary as Excel File"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              onClick={exportSummaryToCSV}
              className="px-3.5 py-2.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-800 text-sky-600 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Export Summary as CSV File"
            >
              <FileCode className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Sales Person</th>
                <th className="py-3 px-4">Total Planned</th>
                <th className="py-3 px-4">Total Actual</th>
                <th className="py-3 px-4">Total Pending</th>
                <th className="py-3 px-4">On Leave</th>
                <th className="py-3 px-4">Travelling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {salesPersonSummary.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-slate-500">No data available yet.</td>
                </tr>
              ) : (
                salesPersonSummary.map((s) => (
                  <tr key={s.name} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{s.name}</td>
                    <td className="py-3 px-4 font-bold text-sky-400">{s.planned}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{s.actual}</td>
                    <td className="py-3 px-4 font-bold text-amber-400">{s.pending}</td>
                    <td className="py-3 px-4 font-bold text-rose-400">{s.leave}</td>
                    <td className="py-3 px-4 font-bold text-purple-400">{s.travel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-sky-600" />
            <span>Master Sales Log ({filteredData.length} Records)</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Plan ID</th>
                <th className="py-3 px-4">Sales Rep</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Target (₹)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Order Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredData.map((d) => (
                <tr key={d.planId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400">{d.planId}</td>
                  <td className="py-3 px-4 font-semibold text-white">{d.salesPerson}</td>
                  <td className="py-3 px-4">{d.meetingDate}</td>
                  <td className="py-3 px-4">{d.partyName}</td>
                  <td className="py-3 px-4">{d.city}</td>
                  <td className="py-3 px-4 font-bold text-amber-400">
                    ₹{(d.expectedBusiness || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.visited === 'Yes'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {d.visited}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-400">
                    ₹{(d.actualOrder || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
