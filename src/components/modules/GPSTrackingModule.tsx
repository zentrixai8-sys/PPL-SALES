import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GPSExcelRecord } from '../../types';
import { saveGPSExcelRowsToSheet } from '../../services/api';
import { getIndianDateString } from '../../utils/dateUtils';
import {
  Navigation,
  MapPin,
  ExternalLink,
  Clock,
  Shield,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  Loader2,
  X,
  Search,
  Filter,
  FileText,
  Calendar,
  Smartphone,
  XCircle,
  ChevronDown,
  Route
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

// Convert 24-hour time to 12-hour format with AM/PM (e.g. 20:06 -> 08:06 PM)
const to12Hour = (h: number, m: number): string => {
  const period = h >= 12 ? 'PM' : 'AM';
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return `${String(hr).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

const formatExcelDate = (val: any): string => {
  if (!val) return '-';
  const num = Number(val);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      const day = String(jsDate.getDate()).padStart(2, '0');
      const month = String(jsDate.getMonth() + 1).padStart(2, '0');
      const year = jsDate.getFullYear();
      return `${day}-${month}-${year} ${to12Hour(jsDate.getHours(), jsDate.getMinutes())}`;
    }
  }

  // String case (e.g. "27-07-2026 20:06"): convert any 24-hour time to 12-hour AM/PM.
  const str = String(val).trim();
  const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (timeMatch && !/\b(am|pm)\b/i.test(str)) {
    const h = Number(timeMatch[1]);
    const m = Number(timeMatch[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      const datePart = str.slice(0, timeMatch.index).trim();
      const converted = to12Hour(h, m);
      return datePart ? `${datePart} ${converted}` : converted;
    }
  }

  return str;
};

// Parse an Excel serial number or a "DD-MM-YYYY[ HH:mm]" string into a Date
// (callers that only need the date truncate the time portion themselves)
const parseResultDateToDate = (val: any): Date | null => {
  if (!val) return null;
  const num = Number(val);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000));
    return isNaN(jsDate.getTime()) ? null : jsDate;
  }

  const str = String(val).trim();
  const m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) {
    const jsDate = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0));
    return isNaN(jsDate.getTime()) ? null : jsDate;
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const GPSTrackingModule: React.FC = () => {
  const { authState, gpsRecords, captureGPSLocation, gpsExcelRecords, addGPSExcelRecords, clearGPSExcelRecords, refreshGPSData, showToast, themeMode } = useAuth();
  const user = authState.user;
  const isAdmin = user?.role === 'Admin';

  const [activeTab, setActiveTab] = useState<'excel' | 'live'>('excel');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileFilter, setMobileFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(getIndianDateString());
  const [dateTo, setDateTo] = useState(getIndianDateString());
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Auto Refresh GPS Sheet Data on Mount
  useEffect(() => {
    refreshGPSData();
  }, []);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    const ok = await refreshGPSData();
    setIsRefreshing(false);
    if (ok) {
      showToast('success', 'GPS Refreshed', 'Latest GPS records loaded successfully.');
    } else {
      showToast('info', 'GPS Data Updated', 'GPS records refreshed.');
    }
  };

  const handleClearData = () => {
    if (isConfirmingClear) {
      clearGPSExcelRecords();
      showToast('success', 'Data Cleared', 'All Excel uploaded GPS records have been removed from local storage.');
      setIsConfirmingClear(false);
    } else {
      setIsConfirmingClear(true);
      setTimeout(() => setIsConfirmingClear(false), 3000);
    }
  };

  // File Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<GPSExcelRecord[]>([]);
  const [skippedDuplicates, setSkippedDuplicates] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleManualPing = async () => {
    setIsCapturing(true);
    await captureGPSLocation('GPS Tracking Module Ping');
    setIsCapturing(false);
  };

  // Helper to calculate unique signature key for a record to prevent duplicates
  const getRecordKey = (r: GPSExcelRecord): string => {
    const trans = (r.transporterName || '').toLowerCase().trim();
    const rec = (r.recipientCustomerName || '').toLowerCase().trim();
    const veh = (r.vehicleNumber || '').toLowerCase().trim();
    const dev = (r.deviceNumber || '').toLowerCase().trim();
    const resDate = (r.resultDate || '').toLowerCase().trim();
    const addr = (r.address || '').toLowerCase().trim();
    const lat = String(r.latitude || '').trim();
    const lng = String(r.longitude || '').trim();

    return `${trans}|${rec}|${veh}|${dev}|${resDate}|${addr}|${lat}|${lng}`;
  };

  // Trigger File Dialog
  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Process Excel File Upload with Deduplication
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse sheet into 2D array or json objects
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawRows.length < 2) {
          showToast('error', 'Empty File', 'The uploaded Excel file contains no data rows.');
          return;
        }

        // Row 0 is header
        const headers = (rawRows[0] as string[]).map(h => String(h || '').trim());

        const existingKeys = new Set(gpsExcelRecords.map(getRecordKey));
        const fileKeys = new Set<string>();
        const uniqueRecords: GPSExcelRecord[] = [];
        let dupsCount = 0;

        // Map data rows (starting row 1)
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          // Helper to get value by column index or header name search
          const getVal = (colIdx: number, ...possibleHeaders: string[]) => {
            if (row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim() !== '') {
              return String(row[colIdx]).trim();
            }
            for (const ph of possibleHeaders) {
              const hIdx = headers.findIndex(h => h.toLowerCase().includes(ph.toLowerCase()));
              if (hIdx >= 0 && row[hIdx] !== undefined && row[hIdx] !== null) {
                return String(row[hIdx]).trim();
              }
            }
            return '';
          };

          const record: GPSExcelRecord = {
            id: 'GPS-EXCEL-' + Date.now() + '-' + i,
            transporterName: getVal(0, 'transporter'),
            recipientCustomerName: getVal(1, 'recipient', 'customer'),
            vehicleNumber: getVal(2, 'vehicle'),
            resourceName: getVal(3, 'resource'),
            deviceNumber: getVal(4, 'device'),
            resultDate: getVal(5, 'result date', 'date'),
            address: getVal(6, 'address', 'location'),
            latitude: getVal(7, 'latitude', 'lat'),
            longitude: getVal(8, 'longitude', 'long', 'lng'),
            accuracy: getVal(9, 'accuracy'),
            distance: getVal(10, 'distance'),
            status: getVal(11, 'status'),
            type: getVal(12, 'type'),
            uploadedAt: getIndianDateString(),
          };

          // Check if record is valid and non-duplicate
          if (record.transporterName || record.recipientCustomerName || record.vehicleNumber || record.address || record.latitude) {
            const key = getRecordKey(record);
            if (existingKeys.has(key) || fileKeys.has(key)) {
              dupsCount++;
            } else {
              fileKeys.add(key);
              uniqueRecords.push(record);
            }
          }
        }

        setSkippedDuplicates(dupsCount);

        if (uniqueRecords.length === 0) {
          if (dupsCount > 0) {
            showToast('warning', 'All Duplicates', `All ${dupsCount} row(s) in this file already exist in the system and were skipped.`);
          } else {
            showToast('warning', 'No Valid Data', 'Could not parse valid GPS rows from file.');
          }
          return;
        }

        if (dupsCount > 0) {
          showToast('info', 'Duplicates Removed', `${dupsCount} duplicate row(s) skipped. ${uniqueRecords.length} new unique rows ready.`);
        }

        setParsedRows(uniqueRecords);
        setShowPreviewModal(true);
      } catch (err: any) {
        console.error('File parsing error:', err);
        showToast('error', 'Parse Error', 'Could not parse Excel file. Please use valid .xlsx or .xls format.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Submit Parsed Excel rows to Google Sheet 'GPS' tab
  const handleConfirmUpload = async () => {
    if (parsedRows.length === 0) return;

    setIsUploading(true);

    try {
      const success = await saveGPSExcelRowsToSheet(parsedRows);

      // Save locally to context state as well
      addGPSExcelRecords(parsedRows);

      if (success) {
        showToast('success', 'GPS File Uploaded', `${parsedRows.length} GPS rows successfully stored.`);
      } else {
        showToast('info', 'Saved Locally', `${parsedRows.length} GPS rows saved locally.`);
      }

      setShowPreviewModal(false);
      setParsedRows([]);
      setActiveTab('excel');
    } catch (err: any) {
      showToast('error', 'Upload Failed', err.message || 'Could not upload data.');
    } finally {
      setIsUploading(false);
    }
  };

  // Download Sample Excel Template with exact 13 headers
  const handleDownloadSample = () => {
    const sampleHeaders = [
      'Transporter Name',
      'Recipient Customer Name',
      'Vehicle Number',
      'Resource Name',
      'Device Number',
      'Result Date',
      'Address',
      'Latitude',
      'Longitude',
      'Accuracy',
      'Distance',
      'Status',
      'Type'
    ];

    const sampleRow = [
      'Piramal Logistics',
      'Reliance Industries Ltd',
      'MH-04-EK-9821',
      'Ramesh Kumar',
      'DEV-99201',
      '27-07-2026',
      'BKC Bandra, Mumbai 400051',
      '19.0760',
      '72.8777',
      '10',
      '12.5 km',
      'Active',
      'Live Tracking'
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([sampleHeaders, sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'GPS');

    XLSX.writeFile(workbook, 'GPS_Upload_Template.xlsx');
    showToast('info', 'Template Downloaded', 'GPS_Upload_Template.xlsx downloaded with 13 column headers.');
  };

  // Get list of sales persons for filter
  const salesPersons = Array.from(new Set(gpsRecords.map(r => r.salesPersonName)));

  // Unique mobile/device numbers found in Excel GPS records, for the dropdown filter
  const mobileNumberOptions = Array.from(
    new Set(
      gpsExcelRecords
        .map(r => (r.deviceNumber || '').trim())
        .filter(Boolean)
    )
  ).sort();

  // Filtered Live Records
  const filteredLiveRecords = gpsRecords.filter(r => {
    if (selectedSalesPerson === 'All') return true;
    return r.salesPersonName === selectedSalesPerson;
  });

  // Filtered Excel Records
  const filteredExcelRecords = gpsExcelRecords.filter(r => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q || (
      (r.transporterName || '').toLowerCase().includes(q) ||
      (r.recipientCustomerName || '').toLowerCase().includes(q) ||
      (r.vehicleNumber || '').toLowerCase().includes(q) ||
      (r.resourceName || '').toLowerCase().includes(q) ||
      (r.deviceNumber || '').toLowerCase().includes(q) ||
      (r.address || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    );

    const mobileQuery = mobileFilter.trim();
    const matchesMobile = !mobileQuery || (
      (r.deviceNumber || '').includes(mobileQuery) ||
      (r.resourceName || '').includes(mobileQuery)
    );

    let matchesDateRange = true;
    if (dateFrom || dateTo) {
      const recDate = parseResultDateToDate(r.resultDate);
      if (!recDate) {
        matchesDateRange = false;
      } else {
        const recDateOnly = new Date(recDate.getFullYear(), recDate.getMonth(), recDate.getDate()).getTime();
        
        if (dateFrom) {
          const [y, m, d] = dateFrom.split('-');
          const fromDate = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
          if (recDateOnly < fromDate) matchesDateRange = false;
        }
        
        if (dateTo) {
          const [y, m, d] = dateTo.split('-');
          const toDate = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
          if (recDateOnly > toDate) matchesDateRange = false;
        }
      }
    }

    return matchesSearch && matchesMobile && matchesDateRange;
  });

  const hasActiveGpsFilters = searchTerm.trim() !== '' || mobileFilter.trim() !== '' || dateFrom !== '' || dateTo !== '';
  const clearGpsFilters = () => {
    setSearchTerm('');
    setMobileFilter('');
    setDateFrom('');
    setDateTo('');
  };

  // Chronological movement path for the selected mobile number (drives the "View Route on Map" card)
  const MAX_ROUTE_STOPS = 23; // Google Maps directions URL supports up to ~25 waypoints
  const routeRecords = mobileFilter
    ? [...filteredExcelRecords]
        .filter(r => {
          const lat = Number(r.latitude);
          const lng = Number(r.longitude);
          return r.latitude && r.longitude && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        })
        .sort((a, b) => {
          const da = parseResultDateToDate(a.resultDate)?.getTime() ?? 0;
          const db = parseResultDateToDate(b.resultDate)?.getTime() ?? 0;
          return da - db;
        })
        .filter((r, i, arr) => {
          if (i === 0) return true;
          const prev = arr[i - 1];
          // Filter out consecutive pings that are practically in the same location (jitter < 0.0002 deg, approx 20m)
          const latDiff = Math.abs(Number(r.latitude) - Number(prev.latitude));
          const lngDiff = Math.abs(Number(r.longitude) - Number(prev.longitude));
          return latDiff > 0.0002 || lngDiff > 0.0002;
        })
        .slice(0, MAX_ROUTE_STOPS)
    : [];

  const routeMapsUrl = routeRecords.length > 0
    ? `https://www.google.com/maps/dir/${routeRecords.map(r => `${r.latitude},${r.longitude}`).join('/')}`
    : '';

  const routeInteractiveMapsUrl = routeRecords.length > 0
    ? `/map.html?route=${routeRecords.map(r => `${r.latitude},${r.longitude}`).join('|')}`
    : '';

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-sky-950/50 border border-emerald-800/40 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/40">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Real-Time GPS & Excel Upload</h1>
            <p className="text-xs text-slate-400 mt-1">
              Upload Excel files or capture live pings to record system location data
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-800 text-sky-600 font-bold text-xs transition-all disabled:opacity-60 cursor-pointer shadow-md"
            title="Refresh latest GPS data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh GPS Data'}</span>
          </button>

          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-all cursor-pointer"
            title="Download sample Excel format"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Sample Excel</span>
          </button>

          <button
            onClick={handleTriggerFileInput}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload GPS Excel File</span>
          </button>

          {gpsExcelRecords.length > 0 && (
            <button
              onClick={handleClearData}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer shadow-md ${
                isConfirmingClear
                  ? 'bg-rose-600 hover:bg-rose-500 border-rose-500 text-white animate-pulse'
                  : 'bg-rose-950/80 hover:bg-rose-900 border-rose-800 text-rose-300'
              }`}
              title="Clear all Excel uploaded GPS records"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{isConfirmingClear ? 'Click again to confirm' : 'Clear Excel Data'}</span>
            </button>
          )}

        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'excel'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel Uploaded GPS Records ({gpsExcelRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-sky-950/80 text-sky-600 border border-sky-800/80 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Route className="w-4 h-4 text-sky-600" />
            <span>Road Map</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Excel Uploaded GPS Data View */}
      {activeTab === 'excel' && (
        <div className="space-y-4">
          {/* Unified Search & Filters Panel */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Filters</span>
                {hasActiveGpsFilters && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    Active
                  </span>
                )}
              </div>

              {/* Compact Search Bar */}
              <div className="relative flex-1 lg:max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search records..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {hasActiveGpsFilters && (
                <button
                  onClick={clearGpsFilters}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer lg:ml-auto shrink-0"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Mobile Number Dropdown */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={mobileFilter}
                    onChange={(e) => setMobileFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer transition-colors"
                  >
                    <option value="">All Mobile Numbers</option>
                    {mobileNumberOptions.map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* From Date */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  From Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{ colorScheme: themeMode === 'dark' ? 'dark' : 'light' }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* To Date */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  To Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{ colorScheme: themeMode === 'dark' ? 'dark' : 'light' }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Movement Route Card — appears when a Mobile Number is selected */}
          {mobileFilter && routeRecords.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-emerald-950/40 border border-sky-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 shrink-0">
                  <Route className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">Movement Route — {mobileFilter}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {routeRecords.length} location ping{routeRecords.length > 1 ? 's' : ''}
                    {routeRecords.length > 1 && (
                      <>
                        {' · From '}
                        <span className="text-emerald-400 font-medium">{routeRecords[0].address || 'Start Point'}</span>
                        {' to '}
                        <span className="text-sky-600 font-medium">{routeRecords[routeRecords.length - 1].address || 'End Point'}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <a
                href={routeMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-600 hover:from-sky-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition-all shrink-0 cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>View Route on Map</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {filteredExcelRecords.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-medium text-sm">No Excel GPS Records Found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click <strong className="text-emerald-400 font-semibold">'Upload GPS Excel File'</strong> above to select and upload your spreadsheet into the system.
              </p>
              <button
                onClick={handleTriggerFileInput}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Excel File</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                    <th className="p-3.5 text-center">#</th>
                    <th className="p-3.5 min-w-[130px]">Transporter</th>
                    <th className="p-3.5 min-w-[150px]">Recipient Customer</th>
                    <th className="p-3.5 min-w-[120px]">Vehicle No</th>
                    <th className="p-3.5 min-w-[140px]">Resource Name</th>
                    <th className="p-3.5 min-w-[120px]">Device No</th>
                    <th className="p-3.5 min-w-[130px]">Result Date</th>
                    <th className="p-3.5 min-w-[200px]">Address</th>
                    <th className="p-3.5">Lat</th>
                    <th className="p-3.5">Long</th>
                    <th className="p-3.5">Accuracy</th>
                    <th className="p-3.5">Distance</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredExcelRecords.map((item, idx) => {
                    const mapsUrl = item.latitude && item.longitude
                      ? `https://maps.google.com/?q=${item.latitude},${item.longitude}`
                      : null;

                    return (
                      <tr key={`excel-tr-${item.id || idx}`} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-medium text-slate-200">{item.transporterName || '-'}</td>
                        <td className="p-3 text-slate-300">{item.recipientCustomerName || '-'}</td>
                        <td className="p-3 font-bold text-amber-400 whitespace-nowrap">{item.vehicleNumber || '-'}</td>
                        <td className="p-3 text-slate-300">{item.resourceName || '-'}</td>
                        <td className="p-3 font-mono text-sky-600 whitespace-nowrap">{item.deviceNumber || '-'}</td>
                        <td className="p-3 text-slate-300 whitespace-nowrap">{formatExcelDate(item.resultDate)}</td>
                        <td className="p-3 text-slate-300 max-w-[220px] truncate" title={item.address}>{item.address || '-'}</td>
                        <td className="p-3 font-mono text-emerald-400 whitespace-nowrap">{item.latitude || '-'}</td>
                        <td className="p-3 font-mono text-sky-600 whitespace-nowrap">{item.longitude || '-'}</td>
                        <td className="p-3 text-slate-300 whitespace-nowrap">{item.accuracy || '-'}</td>
                        <td className="p-3 text-slate-300 whitespace-nowrap">{item.distance || '-'}</td>
                        <td className="p-3 font-semibold whitespace-nowrap">
                          {item.status ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px]">
                              {item.status}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300 whitespace-nowrap">{item.type || '-'}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {mapsUrl ? (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-600 text-[11px] font-semibold transition-colors"
                            >
                              <span>Map</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Road Map */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white mb-2">Select Number & Date for Road Map</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Mobile / Device Number
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={mobileFilter}
                    onChange={(e) => setMobileFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer transition-colors"
                  >
                    <option value="">Select Mobile Number...</option>
                    {mobileNumberOptions.map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setDateTo(e.target.value); }}
                    style={{ colorScheme: themeMode === 'dark' ? 'dark' : 'light' }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Render Route if available */}
          {mobileFilter && dateFrom && routeRecords.length > 0 ? (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-emerald-950/40 border border-sky-800/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Road Map Details</h3>
                  <p className="text-xs text-slate-400">Showing {routeRecords.length} location points</p>
                </div>
                <a
                  href={routeInteractiveMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-600 hover:from-sky-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                >
                  <Route className="w-4 h-4" />
                  <span>View Interactive Road Map (with Arrows)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="relative border-l-2 border-slate-700/50 ml-3 pl-6 space-y-8 py-2">
                  {routeRecords.map((r, i) => {
                    const isLast = i === routeRecords.length - 1;
                    const nextRoute = !isLast ? routeRecords[i+1] : null;
                    const segmentUrl = nextRoute ? `https://www.google.com/maps/dir/${r.latitude},${r.longitude}/${nextRoute.latitude},${nextRoute.longitude}` : '';
                    
                    return (
                      <div key={r.id || i} className="relative">
                        <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </div>
                        <p className="text-xs font-bold text-emerald-400">
                          {i === 0 ? 'START: ' : isLast ? 'END: ' : `LOCATION ${i + 1}: `}
                          <span className="text-white">{formatExcelDate(r.resultDate)}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{r.address}</p>
                        
                        {!isLast && (
                          <div className="mt-5 mb-1 relative">
                            <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-0.5 text-emerald-500/50">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                            <a
                              href={segmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 text-sky-600 hover:text-sky-600 text-[10px] font-semibold transition-colors"
                            >
                              <span>View Route: {i + 1} ➔ {i + 2}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (mobileFilter || dateFrom) ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800">
               <Route className="w-8 h-8 text-slate-600 mx-auto mb-3" />
               <p className="text-sm font-semibold text-slate-300">No route data available</p>
               <p className="text-xs text-slate-500 mt-1">Try selecting a different number or date to view the road map.</p>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800">
               <Route className="w-8 h-8 text-slate-600 mx-auto mb-3" />
               <p className="text-sm font-semibold text-slate-300">Select a Mobile Number and Date</p>
               <p className="text-xs text-slate-500 mt-1">Use the filters above to generate a road map for a specific device.</p>
            </div>
          )}
        </div>
      )}

      {/* Excel Upload Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-4xl w-full text-slate-900 dark:text-slate-200 shadow-2xl space-y-5 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Excel Upload Preview</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <FileText className="w-3.5 h-3.5 text-sky-600" />
                      <span>{uploadFileName}</span>
                      <span className="mx-0.5">•</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{parsedRows.length} Unique Rows</strong>
                      {skippedDuplicates > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/90 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 text-[10px] font-bold">
                          {skippedDuplicates} Duplicates Skipped
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verify the 13 columns mapped from your file below. Click <strong className="text-emerald-600 dark:text-emerald-400 font-bold">'Upload &amp; Save Records'</strong> to store them in the system database.
              </p>

              {/* Preview Table */}
              <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950/80 custom-scrollbar">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Transporter</th>
                      <th className="p-3">Recipient Customer</th>
                      <th className="p-3">Vehicle No</th>
                      <th className="p-3">Resource</th>
                      <th className="p-3">Device No</th>
                      <th className="p-3">Result Date</th>
                      <th className="p-3">Address</th>
                      <th className="p-3">Lat</th>
                      <th className="p-3">Long</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedRows.map((r, i) => (
                      <tr key={`prow-${i}`} className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono text-slate-500">{i + 1}</td>
                        <td className="p-3 font-medium text-slate-200">{r.transporterName || '-'}</td>
                        <td className="p-3 text-slate-300">{r.recipientCustomerName || '-'}</td>
                        <td className="p-3 font-bold text-amber-400">{r.vehicleNumber || '-'}</td>
                        <td className="p-3 text-slate-300">{r.resourceName || '-'}</td>
                        <td className="p-3 font-mono text-sky-600">{r.deviceNumber || '-'}</td>
                        <td className="p-3 text-slate-300">{r.resultDate || '-'}</td>
                        <td className="p-3 text-slate-300 truncate max-w-[150px]">{r.address || '-'}</td>
                        <td className="p-3 font-mono text-emerald-400">{r.latitude || '-'}</td>
                        <td className="p-3 font-mono text-sky-600">{r.longitude || '-'}</td>
                        <td className="p-3 font-semibold text-emerald-400">{r.status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirmUpload}
                  disabled={isUploading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Records...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Upload & Save Records ({parsedRows.length} Rows)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
