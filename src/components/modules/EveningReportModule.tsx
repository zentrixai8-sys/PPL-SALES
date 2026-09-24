import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { EveningReport, MorningPlan } from '../../types';
import { submitEveningReportToSheet, uploadFileToDrive } from '../../services/api';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { getIndianDateString, convertDDMMYYYYToInputDate, convertInputDateToDDMMYYYY } from '../../utils/dateUtils';
import {
  Moon,
  Plus,
  Building,
  UserCheck,
  Phone,
  Briefcase,
  Calendar,
  MapPin,
  Send,
  Loader2,
  CheckCircle,
  Search,
  Filter,
  Edit3,
  Hash,
  Clock,
  User,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Trash2,
  Plane,
  LayoutGrid,
  List,
  Paperclip,
  UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAvatar } from '../common/UserAvatar';

interface EveningCompanyEntry {
  id: string;
  partyName: string;
  address: string;
  client: string;
  contactNumber: string;
  email: string;
  designation: string;
  remarks: string;
  nextFollowUpDate: string;
}

interface SalesPersonGroup {
  salesPersonName: string;
  meetingDate: string;
  totalCompanies: number;
  completedCount: number;
  items: Array<{
    uid: string;
    date: string;
    salesPersonName: string;
    companyName: string;
    address: string;
    client: string;
    contactNumber: string;
    email: string;
    designation: string;
    remarks: string;
    nextFollowUpDate: string;
    isUpdated: boolean;
    planObj?: MorningPlan;
    reportObj?: EveningReport;
  }>;
}

export const EveningReportModule: React.FC = () => {
  const { authState, eveningReports, addEveningReport, updateEveningReport, deleteEveningReport, morningPlans, captureGPSLocation, showToast } = useAuth();
  const user = authState.user;

  const [showModal, setShowModal] = useState(false);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<SalesPersonGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const todayDate = getIndianDateString();
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(todayDate);
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

  // Active item being updated
  const [activePlan, setActivePlan] = useState<MorningPlan | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Form states matching 10 Google Sheet columns:
  // Col A: Uid | Col B: Date | Col C: Sales Person Name | Col D: Company Name | Col E: Address | Col F: Client | Col G: Contact Number | Col H: Designation | Col I: Remarks | Col J: Next Follow Up Date
  const [uid, setUid] = useState('');
  const [reportDate, setReportDate] = useState(getIndianDateString());
  const [salesPersonName, setSalesPersonName] = useState('');
  const [partyName, setPartyName] = useState('');
  const [address, setAddress] = useState('');
  const [client, setClient] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(
    getIndianDateString(new Date(Date.now() + 86400000 * 3))
  );

  // Attachments for the Update Evening Follow Up form (Column K)
  const EVENING_ATTACHMENT_FOLDER_ID = '1CfN3oREhoozRw0s3g14wuG0UnGdphj9d';
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [existingAttachmentUrls, setExistingAttachmentUrls] = useState('');
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

  // "New Evening Entry" (not tied to a specific planned company) allows adding multiple companies at once
  const [isNewEntryMode, setIsNewEntryMode] = useState(false);
  const blankEveningCompany = (): EveningCompanyEntry => ({
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    partyName: '',
    address: '',
    client: '',
    contactNumber: '',
    email: '',
    designation: '',
    remarks: '',
    nextFollowUpDate: getIndianDateString(new Date(Date.now() + 86400000 * 3)),
  });
  const [eveningCompanies, setEveningCompanies] = useState<EveningCompanyEntry[]>([blankEveningCompany()]);

  const addEveningCompanyRow = () => {
    setEveningCompanies(prev => [...prev, blankEveningCompany()]);
  };
  const removeEveningCompanyRow = (id: string) => {
    if (eveningCompanies.length <= 1) return;
    setEveningCompanies(prev => prev.filter(c => c.id !== id));
  };
  const updateEveningCompanyField = (id: string, field: keyof EveningCompanyEntry, value: string) => {
    setEveningCompanies(prev => prev.map(c => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // Open update modal for a specific Morning Plan / Company item
  const openUpdateModal = (plan?: MorningPlan, existingReport?: EveningReport, defaultSalesPerson?: string, defaultParty?: string, defaultDate?: string, defaultUid?: string, defaultAddress?: string, defaultClient?: string, defaultContact?: string, defaultEmail?: string) => {
    if (plan) {
      setIsNewEntryMode(false);
      setActivePlan(plan);
      setUid(plan.id);
      setReportDate(plan.meetingDate || getIndianDateString());
      setSalesPersonName(plan.salesPersonName || user?.userName || 'Sales Exec');
      setPartyName(plan.partyName);
      setAddress(plan.address || plan.city || '');
      setClient(existingReport?.client || plan.contactPerson || '');
      setContactNumber(existingReport?.contactNumber || plan.mobileNumber || '');
      setEmail(existingReport?.email || '');
      setDesignation(existingReport?.designation || '');
      setRemarks(existingReport?.remarks || existingReport?.discussion || plan.remarks || '');
      setNextFollowUpDate(existingReport?.followUpDate || getIndianDateString(new Date(Date.now() + 86400000 * 3)));
      setEditingReportId(existingReport?.id || null);
      setAttachmentFiles([]);
      setExistingAttachmentUrls(existingReport?.attachmentUrls || '');
    } else if (existingReport) {
      setIsNewEntryMode(false);
      setActivePlan(null);
      setUid(existingReport.morningPlanId || existingReport.id);
      setEditingReportId(existingReport.id);
      setReportDate(existingReport.meetingDate || getIndianDateString());
      setSalesPersonName(existingReport.salesPersonName || user?.userName || 'Sales Exec');
      setPartyName(existingReport.partyName);
      setAddress(existingReport.address || '');
      setClient(existingReport.client || '');
      setContactNumber(existingReport.contactNumber || '');
      setEmail(existingReport.email || '');
      setDesignation(existingReport.designation || '');
      setRemarks(existingReport.remarks || existingReport.discussion || '');
      setNextFollowUpDate(existingReport.followUpDate || getIndianDateString(new Date(Date.now() + 86400000 * 3)));
      setAttachmentFiles([]);
      setExistingAttachmentUrls(existingReport.attachmentUrls || '');
    } else {
      // Fresh "New Evening Entry" — not tied to a specific planned company, so allow multiple companies
      setIsNewEntryMode(true);
      setActivePlan(null);
      setUid(defaultUid || 'MP-' + Date.now());
      setReportDate(defaultDate || getIndianDateString());
      setSalesPersonName(defaultSalesPerson || user?.userName || 'Sales Exec');
      setPartyName(defaultParty || '');
      setAddress(defaultAddress || '');
      setClient(defaultClient || '');
      setContactNumber(defaultContact || '');
      setEmail(defaultEmail || '');
      setDesignation('');
      setRemarks('');
      setNextFollowUpDate(getIndianDateString(new Date(Date.now() + 86400000 * 3)));
      setEditingReportId(null);
      setAttachmentFiles([]);
      setExistingAttachmentUrls('');
      setEveningCompanies([blankEveningCompany()]);
    }
    setShowModal(true);
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Evening Report?')) return;
    const success = await deleteEveningReport(id);
    if (!success) {
      showToast('error', 'Delete Failed', 'Could not delete the report from the sheet. Please try again.');
      return;
    }
    showToast('success', 'Report Deleted', 'The evening report has been removed.');
    if (selectedGroupDetails) {
      setSelectedGroupDetails(prev => {
        if (!prev) return null;
        const updatedItems = prev.items.map(item => {
          if (item.reportObj && item.reportObj.id === id) {
            return {
              ...item,
              isUpdated: false,
              reportObj: undefined,
              client: item.planObj?.contactPerson || '',
              contactNumber: item.planObj?.mobileNumber || '',
              email: '',
              remarks: item.planObj?.remarks || '',
              nextFollowUpDate: ''
            };
          }
          return item;
        });
        return {
          ...prev,
          completedCount: updatedItems.filter(i => i.isUpdated).length,
          items: updatedItems
        };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNewEntryMode) {
      const validCompanies = eveningCompanies.filter(c => c.partyName.trim() !== '');
      if (validCompanies.length === 0) {
        showToast('error', 'Incomplete Form', 'Please enter at least one Company Name.');
        return;
      }

      setIsSubmitting(true);

      let uploadedUrls: string[] = [];
      if (attachmentFiles.length > 0) {
        setIsUploadingAttachments(true);
        const results = await Promise.all(
          attachmentFiles.map(async (file) => {
            const cloudUrl = await uploadToCloudinary(file);
            if (cloudUrl) return cloudUrl;
            return uploadFileToDrive(file, EVENING_ATTACHMENT_FOLDER_ID);
          })
        );
        setIsUploadingAttachments(false);

        uploadedUrls = results.filter((url): url is string => !!url);
        if (uploadedUrls.length < attachmentFiles.length) {
          showToast('warning', 'Some Attachments Failed', `${attachmentFiles.length - uploadedUrls.length} of ${attachmentFiles.length} file(s) could not be uploaded.`);
        }
      }
      const multiAttachmentUrls = uploadedUrls.filter(Boolean).join(', ');

      // Capture location once for this batch of visits
      const gpsRec = await captureGPSLocation('Evening Follow Up Submission');

      try {
        let count = 0;
        for (const company of validCompanies) {
          const companyReportData: Omit<EveningReport, 'id' | 'submittedAt'> = {
            salesPersonId: user?.id || 'SALES01',
            salesPersonName: salesPersonName || user?.userName || 'Sales Exec',
            meetingDate: reportDate,
            partyName: company.partyName.trim(),
            address: company.address.trim(),
            client: company.client.trim(),
            contactNumber: company.contactNumber.trim(),
            email: company.email.trim(),
            designation: company.designation.trim(),
            remarks: company.remarks.trim(),
            discussion: company.remarks.trim(),
            followUpDate: company.nextFollowUpDate ? getIndianDateString(company.nextFollowUpDate) : getIndianDateString(),
            visited: 'Yes',
            status: 'Completed',
            latitude: gpsRec?.latitude,
            longitude: gpsRec?.longitude,
            attachmentUrls: multiAttachmentUrls,
          };

          const createdCompanyReport = await submitEveningReportToSheet(companyReportData);
          addEveningReport(createdCompanyReport);
          count++;
        }

        showToast('success', 'Evening Follow Up Saved', `${count} compan${count > 1 ? 'ies' : 'y'} recorded.`);

        setEveningCompanies([blankEveningCompany()]);
        setAttachmentFiles([]);
        setShowModal(false);
      } catch (err: any) {
        showToast('error', 'Submission Error', err.message || 'Could not save report.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!partyName) {
      showToast('error', 'Incomplete Form', 'Please enter Company Name.');
      return;
    }

    setIsSubmitting(true);

    // Upload any newly selected attachments to Cloudinary before saving the report
    let uploadedUrls: string[] = [];
    if (attachmentFiles.length > 0) {
      setIsUploadingAttachments(true);
      const results = await Promise.all(
        attachmentFiles.map(async (file) => {
          const cloudUrl = await uploadToCloudinary(file);
          if (cloudUrl) return cloudUrl;
          return uploadFileToDrive(file, EVENING_ATTACHMENT_FOLDER_ID);
        })
      );
      setIsUploadingAttachments(false);

      uploadedUrls = results.filter((url): url is string => !!url);
      if (uploadedUrls.length < attachmentFiles.length) {
        showToast('warning', 'Some Attachments Failed', `${attachmentFiles.length - uploadedUrls.length} of ${attachmentFiles.length} file(s) could not be uploaded.`);
      }
    }
    const attachmentUrls = [existingAttachmentUrls, ...uploadedUrls].filter(Boolean).join(', ');

    // Capture GPS coordinates for visit check-in
    const gpsRec = await captureGPSLocation('Evening Follow Up Submission');

    const reportData: Omit<EveningReport, 'id' | 'submittedAt'> = {
      morningPlanId: uid || activePlan?.id || undefined,
      salesPersonId: user?.id || 'SALES01',
      salesPersonName: salesPersonName || user?.userName || 'Sales Exec',
      meetingDate: reportDate,
      partyName,
      address,
      client,
      contactNumber,
      email,
      designation,
      remarks,
      discussion: remarks,
      followUpDate: nextFollowUpDate ? getIndianDateString(nextFollowUpDate) : getIndianDateString(),
      visited: 'Yes',
      status: 'Completed',
      latitude: gpsRec?.latitude,
      longitude: gpsRec?.longitude,
      attachmentUrls,
    };

    try {
      let createdReport;
      if (editingReportId) {
        createdReport = { ...reportData, id: editingReportId, submittedAt: getIndianDateString() } as EveningReport;
        updateEveningReport(createdReport);
        showToast('success', 'Follow Up Updated', `Data for ${partyName} updated successfully.`);
      } else {
        createdReport = await submitEveningReportToSheet(reportData);
        addEveningReport(createdReport);
        showToast('success', 'Evening Follow Up Saved', `Data for ${partyName} saved successfully.`);
      }

      setShowModal(false);

      // Update local group details state if modal is open
      if (selectedGroupDetails) {
        setSelectedGroupDetails(prev => {
          if (!prev) return null;
          const updatedItems = prev.items.map(item => {
            if (item.uid === uid || item.companyName === partyName) {
              return {
                ...item,
                client,
                contactNumber,
                email,
                designation,
                remarks,
                nextFollowUpDate: reportData.followUpDate,
                address,
                isUpdated: true,
                reportObj: createdReport
              };
            }
            return item;
          });
          return {
            ...prev,
            completedCount: updatedItems.filter(i => i.isUpdated).length,
            items: updatedItems
          };
        });
      }
    } catch (err: any) {
      showToast('error', 'Submission Error', err.message || 'Could not save report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combine Morning Plans with Evening Reports so all planned companies are shown ("SAME DATA SHOW HONA CHAHIYE")
  const combinedDataList = useMemo(() => {
    const list: Array<{
      uid: string;
      date: string;
      salesPersonName: string;
      companyName: string;
      address: string;
      client: string;
      contactNumber: string;
      email: string;
      designation: string;
      remarks: string;
      nextFollowUpDate: string;
      isUpdated: boolean;
      planObj?: MorningPlan;
      reportObj?: EveningReport;
    }> = [];

    const processedUids = new Set<string>();
    const isSalesUser = user?.role !== 'Admin';
    const myName = (user?.userName || user?.name || '').toLowerCase().trim();

    // First map all Morning Plans
    morningPlans.forEach(plan => {
      if (!plan || !plan.id) return;

      // Sales ID data restriction
      if (isSalesUser && myName) {
        const planPerson = (plan.salesPersonName || '').toLowerCase().trim();
        if (planPerson && !planPerson.includes(myName) && !myName.includes(planPerson)) {
          return;
        }
      }

      // Find matching evening report if available
      const matchedReport = eveningReports.find(
        r => r.morningPlanId === plan.id || r.id === plan.id || (r.partyName === plan.partyName && r.meetingDate === plan.meetingDate)
      );

      list.push({
        uid: plan.id,
        date: plan.meetingDate,
        salesPersonName: plan.salesPersonName,
        companyName: plan.partyName,
        address: plan.address || plan.city || '',
        client: matchedReport?.client || plan.contactPerson || '',
        contactNumber: matchedReport?.contactNumber || plan.mobileNumber || '',
        email: matchedReport?.email || '',
        designation: matchedReport?.designation || '',
        remarks: matchedReport?.remarks || matchedReport?.discussion || plan.remarks || '',
        nextFollowUpDate: matchedReport?.followUpDate || '',
        isUpdated: !!matchedReport,
        planObj: plan,
        reportObj: matchedReport,
      });

      processedUids.add(plan.id);
      if (matchedReport) {
        processedUids.add(matchedReport.id);
        if (matchedReport.morningPlanId) processedUids.add(matchedReport.morningPlanId);
      }
    });

    // Add remaining standalone Evening Reports if any
    eveningReports.forEach(report => {
      if (!report || !report.id) return;
      if (processedUids.has(report.id) || (report.morningPlanId && processedUids.has(report.morningPlanId))) {
        return;
      }

      // Sales ID data restriction
      if (isSalesUser && myName) {
        const reportPerson = (report.salesPersonName || '').toLowerCase().trim();
        if (reportPerson && !reportPerson.includes(myName) && !myName.includes(reportPerson)) {
          return;
        }
      }

      list.push({
        uid: report.morningPlanId || report.id,
        date: report.meetingDate || getIndianDateString(),
        salesPersonName: report.salesPersonName,
        companyName: report.partyName,
        address: report.address || '',
        client: report.client || '',
        contactNumber: report.contactNumber || '',
        email: report.email || '',
        designation: report.designation || '',
        remarks: report.remarks || report.discussion || '',
        nextFollowUpDate: report.followUpDate || '',
        isUpdated: true,
        reportObj: report,
      });
    });

    return list;
  }, [morningPlans, eveningReports, user]);

  // Group items Sales Person-wise
  const groupedBySalesPerson = useMemo(() => {
    const map = new Map<string, SalesPersonGroup>();

    combinedDataList.forEach(item => {
      const matchesDate =
        selectedDateFilter === 'ALL' ||
        !selectedDateFilter ||
        item.date === selectedDateFilter;

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.uid.toLowerCase().includes(q) ||
        item.salesPersonName.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.client.toLowerCase().includes(q) ||
        item.contactNumber.toLowerCase().includes(q) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        item.remarks.toLowerCase().includes(q);

      if (!matchesDate || !matchesSearch) return;

      // Normalize name casing/whitespace so the same person's entries always land in one card,
      // even if one form submission was typed with different capitalization.
      const key = `${item.salesPersonName.trim().toLowerCase()}___${item.date}`;
      if (!map.has(key)) {
        map.set(key, {
          salesPersonName: item.salesPersonName,
          meetingDate: item.date,
          totalCompanies: 0,
          completedCount: 0,
          items: [],
        });
      }

      const grp = map.get(key)!;
      grp.items.push(item);
      grp.totalCompanies += 1;
      if (item.isUpdated) grp.completedCount += 1;
    });

    return Array.from(map.values());
  }, [combinedDataList, selectedDateFilter, searchTerm]);

  // Map of meetingDate -> status indicators (Plan, Actual, Leave, Travel)
  const dateStatusMap = useMemo(() => {
    const map: Record<string, { hasPlan: boolean; hasActual: boolean; hasLeave: boolean; hasTravel: boolean; totalCount: number }> = {};
    combinedDataList.forEach(item => {
      if (!item || !item.date) return;
      if (!map[item.date]) {
        map[item.date] = { hasPlan: false, hasActual: false, hasLeave: false, hasTravel: false, totalCount: 0 };
      }
      map[item.date].totalCount += 1;
      const comp = (item.companyName || '').toLowerCase();
      const remarks = (item.remarks || '').toLowerCase();

      if (comp.includes('leave') || remarks.includes('leave')) {
        map[item.date].hasLeave = true;
      } else if (comp.includes('travel') || remarks.includes('travel')) {
        map[item.date].hasTravel = true;
      } else if (item.isUpdated) {
        map[item.date].hasActual = true;
      } else {
        map[item.date].hasPlan = true;
      }
    });
    return map;
  }, [combinedDataList]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-6 rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/50 border border-sky-800/40 shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 shrink-0 shadow-lg shadow-sky-950/40">
            <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">Evening Follow Up</h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
              Sales Person wise daily follow-up records and updates
            </p>
          </div>
        </div>

        <button
          onClick={() => openUpdateModal()}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>New Evening Entry</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Sales Person, Company, Address, Client, Contact..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Interactive Date Calendar Selector & Layout Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative" ref={calendarRef}>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(prev => !prev)}
              className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 active:scale-95 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs group"
            >
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Date:</span>
                <span className="text-sky-600 dark:text-sky-400 font-black">
                  {selectedDateFilter === 'ALL'
                    ? 'All Dates'
                    : selectedDateFilter === todayDate
                      ? `Today (${todayDate})`
                      : selectedDateFilter}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180 text-sky-500' : ''
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
                          className={`w-6.5 h-6.5 mx-auto rounded-lg text-[10.5px] font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${isSelected
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

          {/* View Switcher: Grid vs List */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${layoutMode === 'grid'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${layoutMode === 'list'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Person-Wise Cards Grid or Table List */}
      <div className="space-y-4">
        {groupedBySalesPerson.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 space-y-2 shadow-xs">
            <User className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <p className="text-slate-900 dark:text-slate-300 font-bold text-sm">No Sales Person entries found</p>
            <p className="text-xs text-slate-500">Create a Morning Plan or add an Evening entry to get started.</p>
          </div>
        ) : layoutMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groupedBySalesPerson.map((group, groupIdx) => (
              <motion.div
                key={`sp-group-${group.salesPersonName}-${group.meetingDate}-${groupIdx}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIdx * 0.05, duration: 0.28, type: 'spring', stiffness: 350, damping: 25 }}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedGroupDetails(group)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500/50 transition-all space-y-4 cursor-pointer hover:shadow-xl hover:shadow-sky-500/10 group relative overflow-hidden shadow-xs text-slate-900 dark:text-slate-100"
              >
                {/* Person Header with DP / Avatar */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={group.salesPersonName} size="md" showRankBadge={false} />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 transition-colors text-sm">
                        {group.salesPersonName}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>{group.meetingDate}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 font-bold">
                    {group.completedCount} / {group.totalCompanies} Done
                  </span>
                </div>

                {/* Company Preview List */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    Planned Companies ({group.totalCompanies})
                  </p>
                  <ul className="space-y-1.5">
                    {group.items.slice(0, 4).map((item, idx) => {
                      const isLeave = item.companyName === 'On Leave';
                      const isTravel = item.companyName === 'Travelling';
                      const dotColor = isLeave ? 'bg-rose-500' : isTravel ? 'bg-purple-500' : item.isUpdated ? 'bg-emerald-500' : 'bg-amber-500';
                      const nameColor = isLeave ? 'text-rose-600 dark:text-rose-400' : isTravel ? 'text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300';
                      const statusLabel = isLeave ? 'On Leave' : isTravel ? 'Travelling' : item.isUpdated ? 'Updated' : 'Pending';
                      const statusColor = isLeave ? 'text-rose-600 dark:text-rose-400' : isTravel ? 'text-purple-600 dark:text-purple-400' : item.isUpdated ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400';
                      const rowBg = isLeave
                        ? 'bg-rose-500/10 border border-rose-500/30'
                        : isTravel
                          ? 'bg-purple-500/10 border border-purple-500/30'
                          : 'bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800';
                      return (
                        <li key={`preview-${item.uid}-${idx}`} className={`flex items-center justify-between text-xs truncate rounded-lg px-2 py-1.5 ${rowBg}`}>
                          <span className={`truncate font-bold flex items-center gap-1.5 ${nameColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`}></span>
                            <span className="truncate">{item.companyName}</span>
                          </span>
                          <span className={`text-[10px] font-bold shrink-0 ml-2 ${statusColor}`}>{statusLabel}</span>
                        </li>
                      );
                    })}
                    {group.items.length > 4 && (
                      <li className="text-[10px] text-slate-500 italic pt-1">
                        + {group.items.length - 4} more companies
                      </li>
                    )}
                  </ul>
                </div>

                {/* Click Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-sky-600 font-semibold">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-sky-600 transition-colors">
                    Click to review &amp; update entries
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Table List View for Evening Reports */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-3.5 min-w-[190px]">Sales Executive</th>
                    <th className="p-3.5 min-w-[120px]">Follow Up Date</th>
                    <th className="p-3.5 min-w-[130px]">Progress Status</th>
                    <th className="p-3.5 min-w-[320px]">Planned Companies &amp; Status</th>
                    <th className="p-3.5 text-right min-w-[140px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {groupedBySalesPerson.map((group, groupIdx) => (
                    <tr
                      key={`sp-list-row-${group.salesPersonName}-${group.meetingDate}-${groupIdx}`}
                      onClick={() => setSelectedGroupDetails(group)}
                      className="hover:bg-sky-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={group.salesPersonName} size="sm" showRankBadge={false} />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
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
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${group.completedCount === group.totalCompanies && group.totalCompanies > 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60'
                          }`}>
                          {group.completedCount} / {group.totalCompanies} Done
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                          {group.items.slice(0, 3).map((item, idx) => {
                            const isLeave = item.companyName === 'On Leave';
                            const isTravel = item.companyName === 'Travelling';
                            const dotColor = isLeave ? 'bg-rose-500' : isTravel ? 'bg-purple-500' : item.isUpdated ? 'bg-emerald-500' : 'bg-amber-500';
                            return (
                              <span
                                key={`list-tag-${item.uid}-${idx}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/80 dark:border-slate-700 truncate max-w-[160px]"
                                title={item.companyName}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                                <span className="truncate">{item.companyName}</span>
                              </span>
                            );
                          })}
                          {group.items.length > 3 && (
                            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-900">
                              +{group.items.length - 3} more
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Review &amp; Update</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Person Detail View Modal (Shows Companies & Update Buttons) */}
      <AnimatePresence>
        {selectedGroupDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-3xl w-full text-slate-900 dark:text-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <UserAvatar name={selectedGroupDetails.salesPersonName} size="md" showRankBadge={false} />
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      {selectedGroupDetails.salesPersonName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{selectedGroupDetails.meetingDate}</span>
                      <span className="mx-1">•</span>
                      <span className="text-amber-700 dark:text-amber-400 font-bold">{selectedGroupDetails.totalCompanies} Planned Companies</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedGroupDetails(null)}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Companies List for this Sales Person */}
              <div className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a company below and click <strong className="text-sky-600 font-bold">Update</strong> to log follow up details.
                </p>

                <div className="space-y-3">
                  {selectedGroupDetails.items.map((item, idx) => {
                    const isLeave = item.companyName === 'On Leave';
                    const isTravel = item.companyName === 'Travelling';
                    const cardTint = isLeave
                      ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
                      : isTravel
                        ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700';
                    const nameColor = isLeave ? 'text-rose-700 dark:text-rose-400' : isTravel ? 'text-purple-700 dark:text-purple-400' : 'text-slate-900 dark:text-white';
                    return (
                      <div
                        key={`grp-item-${item.uid}-${idx}`}
                        className={`p-4 border rounded-2xl space-y-3 transition-colors ${cardTint}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                              #{item.uid}
                            </span>
                            <h4 className={`font-bold text-sm ${nameColor}`}>{item.companyName}</h4>
                          </div>

                          <div className="flex items-center gap-2">
                            {isLeave ? (
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold flex items-center gap-1">
                                <UserX className="w-3 h-3 text-rose-500" />
                                On Leave
                              </span>
                            ) : isTravel ? (
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold flex items-center gap-1">
                                <Plane className="w-3 h-3 text-purple-500" />
                                Travelling
                              </span>
                            ) : item.isUpdated ? (
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                Follow Up Saved
                              </span>
                            ) : (
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-500" />
                                Pending Update
                              </span>
                            )}

                            <button
                              onClick={() => openUpdateModal(
                                item.planObj,
                                item.reportObj,
                                item.salesPersonName,
                                item.companyName,
                                item.date,
                                item.uid,
                                item.address,
                                item.client,
                                item.contactNumber,
                                item.email
                              )}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{item.isUpdated ? 'Edit Update' : 'Update'}</span>
                            </button>
                            {item.isUpdated && item.reportObj && (
                              <button
                                onClick={() => handleDeleteReport(item.reportObj!.id)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold shadow-xs flex items-center justify-center cursor-pointer transition-colors border border-rose-200 dark:border-rose-900/50"
                                title="Delete Report"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Details row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Sales Person</span>
                            <p className="text-slate-800 dark:text-slate-300 font-medium truncate flex items-center gap-1">
                              <User className="w-3 h-3 text-sky-600 shrink-0" />
                              <span>{item.salesPersonName || 'N/A'}</span>
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Address</span>
                            <p className="text-slate-800 dark:text-slate-300 font-medium truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                              <span>{item.address || 'N/A'}</span>
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Client (Contact Person)</span>
                            <p className="text-slate-800 dark:text-slate-300 font-medium truncate flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-sky-600 shrink-0" />
                              <span>{item.client || 'N/A'}</span>
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Contact Number</span>
                            <p className="text-slate-800 dark:text-slate-300 font-medium truncate flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>{item.contactNumber || 'N/A'}</span>
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Email</span>
                            <p className="text-slate-800 dark:text-slate-300 font-medium truncate flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-sky-500 shrink-0" />
                              <span>{item.email || 'N/A'}</span>
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Designation</span>
                            <p className="text-slate-800 dark:text-slate-300 font-medium truncate flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>{item.designation || 'N/A'}</span>
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Next Follow Up Date</span>
                            <p className="text-sky-600 font-bold flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-sky-600 shrink-0" />
                              <span>{item.nextFollowUpDate || 'Pending'}</span>
                            </p>
                          </div>
                        </div>

                        {item.remarks && (
                          <div className="pt-1 text-xs text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            <strong>Remarks:</strong> "{item.remarks}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Update Evening Follow Up Form Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full text-slate-900 dark:text-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Moon className="w-5 h-5 text-sky-600" />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Update Evening Follow Up</h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data entered below will be saved directly into the system database.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* 1. Uid & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!isNewEntryMode && (
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Uid (ID)</label>
                      <input
                        type="text"
                        value={uid}
                        onChange={(e) => setUid(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-300 font-mono"
                        required
                      />
                    </div>
                  )}

                  <div className={isNewEntryMode ? 'sm:col-span-2' : ''}>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Date (DD-MM-YYYY)</label>
                    <input
                      type="date"
                      value={convertDDMMYYYYToInputDate(reportDate)}
                      onChange={(e) => setReportDate(convertInputDateToDDMMYYYY(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* 2. Sales Person Name & Company Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={isNewEntryMode ? 'sm:col-span-2' : ''}>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Sales Person Name</label>
                    <input
                      type="text"
                      value={salesPersonName}
                      onChange={(e) => setSalesPersonName(e.target.value)}
                      placeholder="e.g. Vikram Sharma"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  {!isNewEntryMode && (
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Company Name</label>
                      <input
                        type="text"
                        value={partyName}
                        onChange={(e) => setPartyName(e.target.value)}
                        placeholder="e.g. Reliance Retail Logistics"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                        required
                      />
                    </div>
                  )}
                </div>

                {isNewEntryMode ? (
                  /* Multiple companies for a fresh Evening Entry */
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        Companies Visited ({eveningCompanies.length})
                      </label>
                      <button
                        type="button"
                        onClick={addEveningCompanyRow}
                        className="px-3 py-1.5 bg-sky-500/15 dark:bg-sky-500/20 hover:bg-sky-500/25 text-sky-700 dark:text-sky-400 rounded-xl text-[11px] font-bold flex items-center gap-1 border border-sky-500/30 transition-all cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Another Company</span>
                      </button>
                    </div>

                    {eveningCompanies.map((company, index) => (
                      <div key={company.id} className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 relative">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800/60">
                          <span className="font-bold text-slate-800 dark:text-slate-300 text-[11px]">
                            Company #{index + 1}
                          </span>
                          {eveningCompanies.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEveningCompanyRow(company.id)}
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
                            onChange={(e) => updateEveningCompanyField(company.id, 'partyName', e.target.value)}
                            placeholder="e.g. Reliance Retail Logistics"
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-sky-500"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-[11px]">Address</label>
                            <input
                              type="text"
                              value={company.address}
                              onChange={(e) => updateEveningCompanyField(company.id, 'address', e.target.value)}
                              placeholder="e.g. Plot 44, MIDC Industrial Area"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-[11px]">Client (Contact Person)</label>
                            <input
                              type="text"
                              value={company.client}
                              onChange={(e) => updateEveningCompanyField(company.id, 'client', e.target.value)}
                              placeholder="e.g. Rajesh Mehta"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-[11px]">Contact Number</label>
                            <input
                              type="text"
                              value={company.contactNumber}
                              onChange={(e) => updateEveningCompanyField(company.id, 'contactNumber', e.target.value)}
                              placeholder="e.g. +91 98201 12345"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-[11px]">Email</label>
                            <input
                              type="email"
                              value={company.email}
                              onChange={(e) => updateEveningCompanyField(company.id, 'email', e.target.value)}
                              placeholder="e.g. name@example.com"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-[11px]">Designation</label>
                            <input
                              type="text"
                              value={company.designation}
                              onChange={(e) => updateEveningCompanyField(company.id, 'designation', e.target.value)}
                              placeholder="e.g. Purchase Manager"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-[11px]">Remarks</label>
                          <textarea
                            value={company.remarks}
                            onChange={(e) => updateEveningCompanyField(company.id, 'remarks', e.target.value)}
                            rows={2}
                            placeholder="Meeting discussion outcome, feedback, or follow-up notes..."
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-[11px]">Next Follow Up Date (DD-MM-YYYY)</label>
                          <input
                            type="date"
                            value={convertDDMMYYYYToInputDate(company.nextFollowUpDate)}
                            onChange={(e) => updateEveningCompanyField(company.id, 'nextFollowUpDate', convertInputDateToDDMMYYYY(e.target.value))}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sky-600 font-semibold text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* 3. Address & Client */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Address</label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. Plot 44, MIDC Industrial Area"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Client (Contact Person)</label>
                        <input
                          type="text"
                          value={client}
                          onChange={(e) => setClient(e.target.value)}
                          placeholder="e.g. Rajesh Mehta"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* 4. Contact Number, Email & Designation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Contact Number</label>
                        <input
                          type="text"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          placeholder="e.g. +91 98201 12345"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. name@example.com"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Designation</label>
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="e.g. Purchase Manager"
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* 5. Remarks */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Remarks</label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={3}
                        placeholder="Enter meeting discussion outcome, feedback, or follow-up notes..."
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* 6. Next Follow Up Date */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Next Follow Up Date (DD-MM-YYYY)</label>
                      <input
                        type="date"
                        value={convertDDMMYYYYToInputDate(nextFollowUpDate)}
                        onChange={(e) => setNextFollowUpDate(convertInputDateToDDMMYYYY(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sky-600 font-bold"
                      />
                    </div>
                  </>
                )}

                {/* 7. Attachments */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Attachments</label>

                  {existingAttachmentUrls && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {existingAttachmentUrls.split(',').map(u => u.trim()).filter(Boolean).map((url, idx) => (
                        <a
                          key={`existing-att-${idx}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 flex items-center gap-1 font-semibold"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>Attachment {idx + 1}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 cursor-pointer hover:border-sky-500 transition-colors">
                    <Paperclip className="w-4 h-4 shrink-0 text-sky-600" />
                    <span className="text-xs font-medium">Click to add file(s)</span>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        setAttachmentFiles(prev => [...prev, ...files]);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  {attachmentFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {attachmentFiles.map((file, idx) => (
                        <span
                          key={`new-att-${idx}-${file.name}`}
                          className="text-[11px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                        >
                          <span className="truncate max-w-[140px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setAttachmentFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Evening Follow Up...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{isNewEntryMode ? `Save Evening Follow Up (${eveningCompanies.length})` : 'Save Evening Follow Up'}</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
