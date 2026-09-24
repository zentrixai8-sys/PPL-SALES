
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GPSExcelRecord } from '../../types';
import { saveGPSExcelRowsToSheet } from '../../services/api';
import { getIndianDateString, parseUniversalDate, parseDDMMYYYYToDate, formatToDDMMYYYYHHMM, convertDDMMYYYYToInputDate, convertInputDateToDDMMYYYY } from '../../utils/dateUtils';
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

// Calculate distance in KM between two lat/lng coordinates using the Haversine formula
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
  if (lat1 === 0 && lon1 === 0) return 0;
  if (lat2 === 0 && lon2 === 0) return 0;
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Number(d.toFixed(2));
};

// Custom in-DOM dropdown for the Mobile Number filter.
// Native <select> option lists render as an OS/WebView-anchored popup that can
// appear outside the filter card's bounds on mobile (Android WebView) — this
// keeps the list positioned and sized relative to its own container instead.
interface MobileNumberDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  dark?: boolean;
}

const MobileNumberDropdown: React.FC<MobileNumberDropdownProps> = ({ value, onChange, options, placeholder, dark }) => {
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

  const triggerClass = dark
    ? 'bg-slate-950 border-slate-800 text-slate-200'
    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200';

  const panelClass = dark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';

  const itemClass = (active: boolean) => {
    if (active) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    return dark
      ? 'text-slate-300 hover:bg-slate-800'
      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
  };

  return (
    <div className="relative" ref={wrapRef}>
      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`w-full pl-9 pr-8 py-2.5 border rounded-xl text-xs text-left truncate focus:outline-none focus:border-emerald-500 cursor-pointer transition-colors ${triggerClass}`}
      >
        {value || placeholder}
      </button>
      <ChevronDown className={`w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />

      {open && (
        <div className={`absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border shadow-xl custom-scrollbar ${panelClass}`}>
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors cursor-pointer ${itemClass(!value)}`}
          >
            {placeholder}
          </button>
          {options.map(num => (
            <button
              key={num}
              type="button"
              onClick={() => { onChange(num); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-mono transition-colors cursor-pointer ${itemClass(value === num)}`}
            >
              {num}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
      const recDate = parseUniversalDate(r.resultDate);
      if (!recDate) {
        matchesDateRange = false;
      } else {
        const recDateOnly = new Date(recDate.getFullYear(), recDate.getMonth(), recDate.getDate()).getTime();

        if (dateFrom) {
          const fromDate = parseDDMMYYYYToDate(dateFrom)?.getTime();
          if (fromDate !== undefined && recDateOnly < fromDate) matchesDateRange = false;
        }

        if (dateTo) {
          const toDate = parseDDMMYYYYToDate(dateTo)?.getTime();
          if (toDate !== undefined && recDateOnly > toDate) matchesDateRange = false;
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

  // Sort Excel records in Ascending order by Date & Time (earliest to latest)
  const sortedExcelRecords = React.useMemo(() => {
    return [...filteredExcelRecords].sort((a, b) => {
      const da = parseUniversalDate(a.resultDate)?.getTime() ?? 0;
      const db = parseUniversalDate(b.resultDate)?.getTime() ?? 0;
      return da - db;
    });
  }, [filteredExcelRecords]);

  // Chronological movement path for the selected mobile number (drives the "View Route on Map" card)
  const MAX_ROUTE_STOPS = 23; // Google Maps directions URL supports up to ~25 waypoints
  const routeRecords = mobileFilter
    ? [...sortedExcelRecords]
        .filter(r => {
          const lat = Number(r.latitude);
          const lng = Number(r.longitude);
          return r.latitude && r.longitude && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        })
        .sort((a, b) => {
          const da = parseUniversalDate(a.resultDate)?.getTime() ?? 0;
          const db = parseUniversalDate(b.resultDate)?.getTime() ?? 0;
          return da - db; // ASCENDING: Earlier points first
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

  // Calculate Total Traveled Distance in KM across all route waypoints
  const totalTraveledKm = React.useMemo(() => {
    if (!routeRecords || routeRecords.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < routeRecords.length - 1; i++) {
      const p1 = routeRecords[i];
      const p2 = routeRecords[i + 1];
      const dist = calculateDistanceKm(
        Number(p1.latitude),
        Number(p1.longitude),
        Number(p2.latitude),
        Number(p2.longitude)
      );
      total += dist;
    }
    return Number(total.toFixed(2));
  }, [routeRecords]);

  const routeMapsUrl = routeRecords.length > 0
    ? `https://www.google.com/maps/dir/${routeRecords.map(r => `${r.latitude},${r.longitude}`).join('/')}`
    : '';

  const routeInteractiveMapsUrl = routeRecords.length > 0
    ? `/map.html?route=${routeRecords.map(r => `${r.latitude},${r.longitude}`).join('|')}&stops=${encodeURIComponent(
        JSON.stringify(routeRecords.map(r => ({ a: r.address || '', t: formatToDDMMYYYYHHMM(r.resultDate) })))
      )}`
    : '';

  // Full unfiltered ping log for the selected mobile/date — same source as routeRecords
  // but without the jitter-dedup or MAX_ROUTE_STOPS cap, so every raw entry is visible.
  const fullLogRecords = mobileFilter
    ? [...sortedExcelRecords]
        .filter(r => {
          const lat = Number(r.latitude);
          const lng = Number(r.longitude);
          return r.latitude && r.longitude && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        })
        .sort((a, b) => {
          const da = parseUniversalDate(a.resultDate)?.getTime() ?? 0;
          const db = parseUniversalDate(b.resultDate)?.getTime() ?? 0;
          return da - db;
        })
    : [];
  const [showFullLogModal, setShowFullLogModal] = useState(false);

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-sky-950/50 border border-emerald-800/40 shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/40">
            <Navigation className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">Real-Time GPS & Excel Upload</h1>
            <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
              Upload Excel files or capture live pings to record system location data
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/90 dark:bg-sky-950/80 hover:bg-slate-100 dark:hover:bg-sky-900 border border-slate-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold text-xs transition-all disabled:opacity-60 cursor-pointer shadow-xs"
            title="Refresh latest GPS data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync GPS'}</span>
          </button>

          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all cursor-pointer shadow-xs"
            title="Download sample Excel format"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Sample Excel</span>
          </button>

          <button
            onClick={handleTriggerFileInput}
            className="flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload GPS Excel</span>
          </button>

          {gpsExcelRecords.length > 0 && (
            <button
              onClick={handleClearData}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer shadow-xs ${
                isConfirmingClear
                  ? 'bg-rose-600 hover:bg-rose-500 border-rose-500 text-white animate-pulse'
                  : 'bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              }`}
              title="Clear all Excel uploaded GPS records"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{isConfirmingClear ? 'Confirm Clear' : 'Clear Excel'}</span>
            </button>
          )}

        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2 overflow-x-auto">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'excel'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Excel GPS ({gpsExcelRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Route className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Road Map</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Excel Uploaded GPS Data View */}
      {activeTab === 'excel' && (
        <div className="space-y-4">
          {/* Unified Search & Filters Panel */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Filters</span>
                {hasActiveGpsFilters && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-500/30">
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
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {hasActiveGpsFilters && (
                <button
                  onClick={clearGpsFilters}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer lg:ml-auto shrink-0"
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
                <MobileNumberDropdown
                  value={mobileFilter}
                  onChange={setMobileFilter}
                  options={mobileNumberOptions}
                  placeholder="All Mobile Numbers"
                />
              </div>

              {/* From Date */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  From Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={dateFrom ? convertDDMMYYYYToInputDate(dateFrom) : ''}
                    onChange={(e) => setDateFrom(convertInputDateToDDMMYYYY(e.target.value))}
                    style={{ colorScheme: themeMode === 'dark' ? 'dark' : 'light' }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* To Date */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  To Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={dateTo ? convertDDMMYYYYToInputDate(dateTo) : ''}
                    onChange={(e) => setDateTo(convertInputDateToDDMMYYYY(e.target.value))}
                    style={{ colorScheme: themeMode === 'dark' ? 'dark' : 'light' }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Movement Route Card — appears when a Mobile Number is selected */}
          {mobileFilter && routeRecords.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 shrink-0">
                  <Route className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Movement Route — {mobileFilter}</h3>
                    {totalTraveledKm > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                        🛣️ Total: {totalTraveledKm} KM
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {routeRecords.length} location ping{routeRecords.length > 1 ? 's' : ''}
                    {routeRecords.length > 1 && (
                      <>
                        {' · From '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{routeRecords[0].address || 'Start Point'}</span>
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
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all shrink-0 cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>View Route on Map</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {sortedExcelRecords.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <p className="text-slate-800 dark:text-slate-300 font-bold text-sm">No Excel GPS Records Found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">'Upload GPS Excel File'</strong> above to select and upload your spreadsheet into the system.
              </p>
              <button
                onClick={handleTriggerFileInput}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Excel File</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {sortedExcelRecords.map((item, idx) => {
                    const mapsUrl = item.latitude && item.longitude
                      ? `https://maps.google.com/?q=${item.latitude},${item.longitude}`
                      : null;

                    return (
                      <tr key={`excel-tr-${item.id || idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-400 dark:text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{item.transporterName || '-'}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{item.recipientCustomerName || '-'}</td>
                        <td className="p-3 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">{item.vehicleNumber || '-'}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{item.resourceName || '-'}</td>
                        <td className="p-3 font-mono text-sky-600 whitespace-nowrap">{item.deviceNumber || '-'}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatToDDMMYYYYHHMM(item.resultDate)}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 max-w-[220px] truncate" title={item.address}>{item.address || '-'}</td>
                        <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{item.latitude || '-'}</td>
                        <td className="p-3 font-mono text-sky-600 whitespace-nowrap">{item.longitude || '-'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.accuracy || '-'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.distance || '-'}</td>
                        <td className="p-3 font-semibold whitespace-nowrap">
                          {item.status ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                              {item.status}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.type || '-'}</td>
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
                <MobileNumberDropdown
                  value={mobileFilter}
                  onChange={setMobileFilter}
                  options={mobileNumberOptions}
                  placeholder="Select Mobile Number..."
                  dark
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={dateFrom ? convertDDMMYYYYToInputDate(dateFrom) : ''}
                    onChange={(e) => { const ddmmyyyy = convertInputDateToDDMMYYYY(e.target.value); setDateFrom(ddmmyyyy); setDateTo(ddmmyyyy); }}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold text-white">Road Map Details</h3>
                    {totalTraveledKm > 0 && (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-xs font-black shadow-xs">
                        🛣️ Total Distance: {totalTraveledKm} KM
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Showing {routeRecords.length} location points</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowFullLogModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>View Full Log ({fullLogRecords.length})</span>
                  </button>
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
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="relative border-l-2 border-slate-700/50 ml-3 pl-6 space-y-8 py-2">
                  {routeRecords.map((r, i) => {
                    const isLast = i === routeRecords.length - 1;
                    const nextRoute = !isLast ? routeRecords[i+1] : null;
                    const segmentUrl = nextRoute ? `https://www.google.com/maps/dir/${r.latitude},${r.longitude}/${nextRoute.latitude},${nextRoute.longitude}` : '';
                    const legKm = nextRoute
                      ? calculateDistanceKm(
                          Number(r.latitude),
                          Number(r.longitude),
                          Number(nextRoute.latitude),
                          Number(nextRoute.longitude)
                        )
                      : 0;
                    
                    return (
                      <div key={r.id || i} className="relative">
                        <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </div>
                        <p className="text-xs font-bold text-emerald-400">
                          {i === 0 ? 'START: ' : isLast ? 'END: ' : `LOCATION ${i + 1}: `}
                          <span className="text-white">{formatToDDMMYYYYHHMM(r.resultDate)}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{r.address}</p>
                        
                        {!isLast && (
                          <div className="mt-5 mb-1 relative flex items-center gap-2 flex-wrap">
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
                            {legKm > 0 && (
                              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
                                ~{legKm} KM
                              </span>
                            )}
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

      {/* Full Unfiltered Ping Log Modal */}
      <AnimatePresence>
        {showFullLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">Full GPS Ping Log</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {mobileFilter} · {dateFrom} · {fullLogRecords.length} raw record{fullLogRecords.length === 1 ? '' : 's'} (unfiltered)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullLogModal(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto -mx-2 px-2">
                {fullLogRecords.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-10">No raw ping records found.</p>
                ) : (
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-950 sticky top-0">
                      <tr>
                        <th className="py-2 px-2">#</th>
                        <th className="py-2 px-2">Time</th>
                        <th className="py-2 px-2">Address</th>
                        <th className="py-2 px-2 text-right">Lat / Long</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {fullLogRecords.map((r, i) => (
                        <tr key={r.id || i} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-2 font-mono text-slate-500">{i + 1}</td>
                          <td className="py-2 px-2 whitespace-nowrap font-semibold text-white">{formatToDDMMYYYYHHMM(r.resultDate)}</td>
                          <td className="py-2 px-2 text-slate-400">{r.address || '-'}</td>
                          <td className="py-2 px-2 text-right font-mono text-slate-500 whitespace-nowrap">{r.latitude}, {r.longitude}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
