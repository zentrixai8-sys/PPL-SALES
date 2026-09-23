/**
 * Date Utilities for Indian Standard Time (IST) formatting (DD-MM-YYYY)
 */

/**
 * Returns date formatted as DD-MM-YYYY in Indian Standard Time (Asia/Kolkata)
 */
export function getIndianDateString(input?: Date | string | number): string {
  if (!input) {
    const now = new Date();
    return formatToDDMMYYYYParts(now);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    // Already in DD-MM-YYYY format
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    // Standard ISO YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}-${m}-${y}`;
    }
    // ISO string with T or colon (typically from Google Sheets API)
    if (trimmed.includes('T') || trimmed.includes(':')) {
      const dateObj = new Date(trimmed);
      if (!isNaN(dateObj.getTime())) {
        // Fix Google Sheets US Locale date swapping bug:
        // When Google Sheets parses DD-MM-YYYY (e.g. 01-08-2026) in US locale,
        // it treats DD as month (01 = Jan) and MM as day (08 = 8th).
        // So the date returned is Jan 8th instead of Aug 1st.
        // We swap the day and month back to recover the original DD-MM-YYYY.
        const d = String(dateObj.getMonth() + 1).padStart(2, '0');
        const m = String(dateObj.getDate()).padStart(2, '0');
        const y = dateObj.getFullYear();
        return `${d}-${m}-${y}`;
      }
    }
  }

  const date = new Date(input);
  if (isNaN(date.getTime())) {
    return String(input);
  }

  return formatToDDMMYYYYParts(date);
}

function formatToDDMMYYYYParts(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value || '01';
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    return `${day}-${month}-${year}`;
  } catch (err) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  }
}

/**
 * Returns time formatted as hh:mm:ss AM/PM or hh:mm AM/PM in IST
 */
export function getIndianTimeString(input?: Date | string | number): string {
  const date = input ? new Date(input) : new Date();
  if (isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch (err) {
    return date.toLocaleTimeString();
  }
}

/**
 * Returns combined DD-MM-YYYY hh:mm:ss AM/PM in IST
 */
export function getIndianDateTimeString(input?: Date | string | number): string {
  const dateStr = getIndianDateString(input);
  const timeStr = getIndianTimeString(input);
  return `${dateStr} ${timeStr}`.trim();
}

/**
 * Helper to convert HTML <input type="date"> value (YYYY-MM-DD) to DD-MM-YYYY
 */
export function convertInputDateToDDMMYYYY(isoDate: string): string {
  if (!isoDate) return getIndianDateString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, d] = isoDate.split('-');
    return `${d}-${m}-${y}`;
  }
  return getIndianDateString(isoDate);
}

/**
 * Parses a DD-MM-YYYY string into a Date (midnight local time). Returns null if invalid/empty.
 */
export function parseDDMMYYYYToDate(ddmmyyyy: string): Date | null {
  if (!ddmmyyyy) return null;
  const match = ddmmyyyy.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Checks whether `dateStr` (DD-MM-YYYY) falls within [fromStr, toStr] inclusive (both DD-MM-YYYY).
 * Returns false if dateStr or fromStr is missing/unparseable.
 */
export function isDateWithinRange(dateStr: string, fromStr: string, toStr: string): boolean {
  const date = parseDDMMYYYYToDate(dateStr);
  const from = parseDDMMYYYYToDate(fromStr);
  if (!date || !from) return false;
  const to = parseDDMMYYYYToDate(toStr) || from;
  return date >= from && date <= to;
}

/**
 * Universal date parser that handles:
 * - DD-MM-YYYY / DD/MM/YYYY with or without time (12hr or 24hr)
 * - YYYY-MM-DD / ISO strings (e.g. 2026-09-22T02:59:00 or 2026-09-22T 02:59 AM)
 * - Excel date serial numbers (e.g. 45678.1234)
 * - Timestamps and Date instances
 */
export function parseUniversalDate(val: any): Date | null {
  if (val === undefined || val === null || val === '') return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  // Excel serial number check
  const num = Number(val);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const totalMs = Math.round((num - 25569) * 86400 * 1000);
    const jsDate = new Date(totalMs);
    return isNaN(jsDate.getTime()) ? null : jsDate;
  }

  const str = String(val).trim();
  if (!str) return null;

  // 1. DD-MM-YYYY or DD/MM/YYYY with optional time
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?)?/i);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]) - 1;
    const year = Number(dmyMatch[3]);
    let hours = Number(dmyMatch[4] || 0);
    const minutes = Number(dmyMatch[5] || 0);
    const seconds = Number(dmyMatch[6] || 0);
    const meridiem = dmyMatch[7]?.toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const d = new Date(year, month, day, hours, minutes, seconds);
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. YYYY-MM-DD or YYYY/MM/DD with optional time
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?)?/i);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]) - 1;
    const day = Number(ymdMatch[3]);
    let hours = Number(ymdMatch[4] || 0);
    const minutes = Number(ymdMatch[5] || 0);
    const seconds = Number(ymdMatch[6] || 0);
    const meridiem = ymdMatch[7]?.toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const d = new Date(year, month, day, hours, minutes, seconds);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback
  const cleanIso = str.replace('T', ' ');
  const parsed = new Date(cleanIso);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format any date value into clean "DD-MM-YYYY hh:mm AM/PM"
 */
export function formatToDDMMYYYYHHMM(val: any): string {
  if (!val) return '-';
  const d = parseUniversalDate(val);
  if (!d) return String(val).replace('T', ' ');

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hrStr = String(hours).padStart(2, '0');

  return `${day}-${month}-${year} ${hrStr}:${minutes} ${period}`;
}

/**
 * Helper to convert DD-MM-YYYY to YYYY-MM-DD for HTML <input type="date">
 */
export function convertDDMMYYYYToInputDate(ddmmyyyy: string): string {
  if (!ddmmyyyy) {
    const [d, m, y] = getIndianDateString().split('-');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(ddmmyyyy)) {
    const [d, m, y] = ddmmyyyy.split('-');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(ddmmyyyy)) {
    return ddmmyyyy;
  }
  return new Date().toISOString().substring(0, 10);
}
