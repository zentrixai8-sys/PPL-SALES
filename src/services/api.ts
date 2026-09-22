import { User, MorningPlan, EveningReport, GPSRecord, GPSExcelRecord, AttendanceRecord, TargetRecord, CRMOrderRecord, ReferenceRecord, LeaveRecord } from '../types';
import { getIndianDateString, getIndianDateTimeString, getIndianTimeString } from '../utils/dateUtils';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyhXWGagj_RY-JEkrNaKA2aNjiSlAOJDEYau6Hm7tCfQ4t7Y03aGZBhgkPWfJrslFrdZg/exec';

// Helper to normalize keys from Google Apps Script / Sheet row object
function normalizeUserData(rawData: Record<string, any>): User {
  const getVal = (...keys: string[]) => {
    for (const k of keys) {
      if (rawData[k] !== undefined && rawData[k] !== null && String(rawData[k]).trim() !== '') {
        return String(rawData[k]).trim();
      }
    }
    return '';
  };

  const id = getVal('id', 'ID', 'Id', 'A', '0');
  const userName = getVal('userName', 'USER NAME', 'USER_NAME', 'username', 'UserName', 'Name', 'C', '2') || id;
  const roleRaw = getVal('role', 'ROLE', 'Role', 'D', '3') || 'Sales';
  const role = (roleRaw.toLowerCase().includes('admin') ? 'Admin' : 'Sales') as User['role'];
  const gmail = getVal('gmail', 'GMAIL', 'Gmail', 'Email', 'E', '4');
  const manager = getVal('manager', 'MANAGER', 'Manager', 'F', '5') || 'Regional Head';
  const crm = getVal('crm', 'CRM', 'Crm', 'G', '6') || 'CRM-1001';
  const profileUrl = getVal('profileUrl', 'PROFILE URL', 'PROFILE_URL', 'ProfileUrl', 'H', '7') ||
    `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`;

  return {
    id,
    userName,
    role,
    gmail,
    manager,
    crm,
    profileUrl,
  };
}

/**
 * Helper to post row data to Google Apps Script according to doPost(e) e.parameter specification
 */
export async function insertSheetRow(sheetName: string, rowArray: any[]): Promise<boolean> {
  try {
    const params = new URLSearchParams();
    params.append('sheetName', sheetName);
    params.append('action', 'insert');
    params.append('rowData', JSON.stringify(rowArray));

    // Fire the request without waiting for the full Apps Script round-trip
    // so the UI isn't stuck on a loading state for every save (fast sheet dump).
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: params,
    }).catch(err => console.warn(`Saved ${sheetName} row locally due to network notice:`, err));

    return true;
  } catch (err) {
    console.warn(`Saved ${sheetName} row locally due to network notice:`, err);
    return false;
  }
}

/**
 * Helper to update row data in Google Apps Script
 */
export async function updateSheetRow(sheetName: string, id: string, rowArray: any[]): Promise<boolean> {
  try {
    const params = new URLSearchParams();
    params.append('sheetName', sheetName);
    params.append('action', 'update');
    params.append('id', id);
    params.append('rowData', JSON.stringify(rowArray));

    // Fire the request without waiting for the full Apps Script round-trip
    // so the UI isn't stuck on a loading state for every save (fast sheet dump).
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: params,
    }).catch(err => console.warn(`Failed to update ${sheetName} row:`, err));

    return true;
  } catch (err) {
    console.warn(`Failed to update ${sheetName} row:`, err);
    return false;
  }
}

/**
 * Uploads a single file to a Google Drive folder via the Apps Script 'uploadFile' action
 * and returns the resulting shareable file URL, or null on failure.
 */
export async function uploadFileToDrive(file: File, folderId: string): Promise<string | null> {
  try {
    const base64Data: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const params = new URLSearchParams();
    params.append('action', 'uploadFile');
    params.append('base64Data', base64Data);
    params.append('fileName', file.name);
    params.append('mimeType', file.type || 'application/octet-stream');
    params.append('folderId', folderId);

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: params,
    });

    if (!response.ok) return null;

    const text = await response.text();
    const json = JSON.parse(text);
    if (json.success && json.fileUrl) {
      return json.fileUrl as string;
    }
    return null;
  } catch (err) {
    console.warn(`Failed to upload file ${file.name}:`, err);
    return null;
  }
}

/**
 * Helper to delete row data in Google Apps Script
 */
export async function deleteSheetRow(sheetName: string, id: string): Promise<boolean> {
  try {
    const params = new URLSearchParams();
    params.append('sheetName', sheetName);
    params.append('action', 'delete');
    params.append('id', id);

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: params,
    });

    if (!response.ok) return false;

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (json.status === 'error' || json.result === 'error' || json.success === false) {
        return false;
      }
    } catch {
      // Apps Script sometimes replies with plain text on success; not JSON isn't a failure.
    }

    return true;
  } catch (err) {
    console.warn(`Failed to delete ${sheetName} row:`, err);
    return false;
  }
}

/**
 * Delete a row by its actual sheet row number (1-based, header = row 1).
 * The Apps Script backend's 'delete' action reads params.rowIndex, not an id.
 */
export async function deleteSheetRowByIndex(sheetName: string, rowIndex: number): Promise<boolean> {
  try {
    const params = new URLSearchParams();
    params.append('sheetName', sheetName);
    params.append('action', 'delete');
    params.append('rowIndex', String(rowIndex));

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: params,
    });

    if (!response.ok) return false;

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (json.status === 'error' || json.result === 'error' || json.success === false) {
        return false;
      }
    } catch {
      // Apps Script sometimes replies with plain text on success; not JSON isn't a failure.
    }

    return true;
  } catch (err) {
    console.warn(`Failed to delete ${sheetName} row by index:`, err);
    return false;
  }
}

/**
 * Delete a row by matching its ID against a column (default: column A).
 * Looks up the row's current position with a fresh sheet read (so it's
 * correct even if the sheet changed since this record was last fetched),
 * then deletes it by that row number. Returns false if no matching row is found.
 */
export async function deleteSheetRowById(sheetName: string, id: string, idColumnIndex: number = 0): Promise<boolean> {
  try {
    const rows = await fetchSheetData(sheetName);
    if (!rows || rows.length <= 1) return false;

    let targetRowNumber = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && String(row[idColumnIndex] ?? '').trim() === id.trim()) {
        targetRowNumber = i + 1; // 1-based sheet row number (row 1 is the header)
        break;
      }
    }

    if (targetRowNumber === -1) return false;

    return await deleteSheetRowByIndex(sheetName, targetRowNumber);
  } catch (err) {
    console.warn(`Failed to delete row (id=${id}) from ${sheetName}:`, err);
    return false;
  }
}

/**
 * Fetch sheet data using doGet(e) with ?sheet=SheetName
 */
export async function fetchSheetData(sheetName: string): Promise<any[][] | null> {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(sheetName)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn(`Fetch notice for sheet '${sheetName}':`, err);
  }
  return null;
}

/**
 * Login function that fetches Users/Login sheet or posts credentials to Google Apps Script.
 */
export async function loginWithGoogleSheet(idInput: string, passwordInput: string): Promise<User> {
  const cleanId = idInput.trim();
  const cleanPass = passwordInput.trim();

  // Primary: If Supabase is configured, authenticate directly via Supabase PostgreSQL table
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`id.ilike.${cleanId},user_name.ilike.${cleanId},gmail.ilike.${cleanId}`)
        .eq('password', cleanPass)
        .maybeSingle();

      if (data && !error) {
        return normalizeUserData({
          id: data.id,
          userName: data.user_name || data.userName,
          role: data.role,
          gmail: data.gmail,
          manager: data.manager,
          crm: data.crm,
          profileUrl: data.profile_url || data.profileUrl,
        });
      }
    } catch (sbError) {
      console.warn('Supabase login check notice:', sbError);
    }
  }

  // Attempt 1: Fetch Login / Users / Data sheet via doGet(?sheet=Login)
  for (const sheetCandidate of ['Login', 'Users', 'Data']) {
    const sheetRows = await fetchSheetData(sheetCandidate);
    if (sheetRows && sheetRows.length > 1) {
      // Search for matching user in rows (row[0]=ID, row[1]=PASSWORD)
      for (let i = 1; i < sheetRows.length; i++) {
        const row = sheetRows[i];
        if (!row || row.length < 2) continue;
        const rowId = String(row[0] || '').trim();
        const rowPass = String(row[1] || '').trim();

        if (rowId.toLowerCase() === cleanId.toLowerCase() && rowPass === cleanPass) {
          return normalizeUserData({
            id: row[0],
            password: row[1],
            userName: row[2],
            role: row[3],
            gmail: row[4],
            manager: row[5],
            crm: row[6],
            profileUrl: row[7],
          });
        }
      }
    }
  }

  // Attempt 2: Direct POST with URLSearchParams to Apps Script
  try {
    const params = new URLSearchParams();
    params.append('action', 'login');
    params.append('id', cleanId);
    params.append('password', cleanPass);

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: params,
    });

    if (response.ok) {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        if (json.status === 'error' || json.result === 'error' || json.success === false) {
          throw new Error(json.message || 'Invalid ID or Password.');
        }

        const userData = json.user || json.data || json;
        if (userData && (userData.id || userData.ID || userData['USER NAME'] || userData.userName)) {
          return normalizeUserData(userData);
        }
      } catch (err: any) {
        if (err.message === 'Invalid ID or Password.') {
          throw err;
        }
      }
    }
  } catch (postError: any) {
    if (postError.message === 'Invalid ID or Password.') {
      throw postError;
    }
    console.warn('GAS POST call notice:', postError);
  }

  throw new Error('Invalid ID or Password.');
}

/**
 * Submit Morning Plan to Google Apps Script
 */
export async function submitMorningPlanToSheet(plan: Omit<MorningPlan, 'id' | 'createdAt'>): Promise<MorningPlan> {
  const newPlan: MorningPlan = {
    ...plan,
    meetingDate: getIndianDateString(plan.meetingDate),
    id: 'MP-' + Date.now(),
    createdAt: getIndianDateTimeString(),
  };

  // 6-column format matching Google Sheet tab 'Morning Follow Up':
  // Col A: Uid | Col B: Date | Col C: Sales Person Name | Col D: Company Name | Col E: Address | Col F: Remark
  const morningFollowUpRow = [
    newPlan.id,
    newPlan.meetingDate,
    newPlan.salesPersonName,
    newPlan.partyName,
    newPlan.address || newPlan.city || '',
    newPlan.remarks || newPlan.purpose || '',
  ];

  const fullRowData = [
    newPlan.id,
    newPlan.salesPersonId,
    newPlan.salesPersonName,
    newPlan.meetingDate,
    newPlan.partyName,
    newPlan.contactPerson,
    newPlan.mobileNumber,
    newPlan.city,
    newPlan.purpose,
    newPlan.expectedBusiness,
    newPlan.priority,
    newPlan.remarks,
    newPlan.status,
    newPlan.createdAt,
    newPlan.latitude || '',
    newPlan.longitude || '',
    newPlan.address || '',
  ];

  if (isSupabaseConfigured) {
    try {
      await supabase.from('morning_plans').upsert([{
        id: newPlan.id,
        sales_person_id: newPlan.salesPersonId,
        sales_person_name: newPlan.salesPersonName,
        meeting_date: newPlan.meetingDate,
        party_name: newPlan.partyName,
        contact_person: newPlan.contactPerson,
        mobile_number: newPlan.mobileNumber,
        city: newPlan.city,
        purpose: newPlan.purpose,
        expected_business: newPlan.expectedBusiness,
        priority: newPlan.priority,
        remarks: newPlan.remarks,
        status: newPlan.status,
        latitude: newPlan.latitude,
        longitude: newPlan.longitude,
        address: newPlan.address || '',
      }]);
    } catch (sbErr) {
      console.warn('Supabase morning plan save notice:', sbErr);
    }
  }

  await insertSheetRow('Morning Follow Up', morningFollowUpRow);
  await insertSheetRow('MorningPlan', fullRowData);

  return newPlan;
}

/**
 * Fetch Morning Plans from Google Sheet 'Morning Follow Up' tab
 */
export async function fetchMorningPlansFromSheet(): Promise<MorningPlan[]> {
  try {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('morning_plans')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            salesPersonId: d.sales_person_id || d.salesPersonId || '',
            salesPersonName: d.sales_person_name || d.salesPersonName || '',
            meetingDate: d.meeting_date || d.meetingDate || '',
            partyName: d.party_name || d.partyName || '',
            contactPerson: d.contact_person || d.contactPerson || '',
            mobileNumber: d.mobile_number || d.mobileNumber || '',
            city: d.city || '',
            purpose: d.purpose || '',
            expectedBusiness: Number(d.expected_business || d.expectedBusiness) || 0,
            priority: d.priority || 'Medium',
            remarks: d.remarks || '',
            status: d.status || 'Pending',
            createdAt: d.created_at || '',
            latitude: d.latitude,
            longitude: d.longitude,
            address: d.address || '',
          }));
        }
      } catch (sbErr) {
        console.warn('Supabase morning plans fetch notice:', sbErr);
      }
    }
    for (const sheetName of ['Morning Follow Up', 'MorningFollowUp', 'MorningPlan']) {
      const rows = await fetchSheetData(sheetName);
      if (rows && rows.length > 1) {
        const plans: MorningPlan[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || !row[0]) continue;

          if (row.length <= 8) {
            // Standard 'Morning Follow Up' 6-column sheet structure
            const id = String(row[0] || `MP-${i}`);
            const meetingDate = getIndianDateString(row[1] || new Date());
            const salesPersonName = String(row[2] || 'Sales Executive');
            const partyName = String(row[3] || 'Client Party');
            const address = String(row[4] || '');
            const remarks = String(row[5] || '');

            plans.push({
              id,
              salesPersonId: 'SALES-' + i,
              salesPersonName,
              meetingDate,
              partyName,
              contactPerson: partyName,
              mobileNumber: '',
              city: address || 'Location',
              purpose: remarks || 'Client Meeting',
              expectedBusiness: 0,
              priority: 'High',
              remarks,
              status: 'Submitted',
              createdAt: getIndianDateTimeString(),
              address,
            });
          } else {
            // Extended format
            plans.push({
              id: String(row[0] || `MP-${i}`),
              salesPersonId: String(row[1] || 'SALES01'),
              salesPersonName: String(row[2] || 'Sales Executive'),
              meetingDate: getIndianDateString(row[3] || new Date()),
              partyName: String(row[4] || ''),
              contactPerson: String(row[5] || ''),
              mobileNumber: String(row[6] || ''),
              city: String(row[7] || ''),
              purpose: String(row[8] || ''),
              expectedBusiness: Number(row[9]) || 0,
              priority: (row[10] as any) || 'High',
              remarks: String(row[11] || ''),
              status: 'Submitted',
              createdAt: getIndianDateTimeString(row[13] || new Date()),
              address: String(row[16] || row[7] || ''),
            });
          }
        }
        if (plans.length > 0) return plans;
      }
    }
  } catch (err) {
    console.warn('Could not fetch morning plans:', err);
  }
  return [];
}

/**
 * Submit Evening Report to Google Apps Script
 */
export async function submitEveningReportToSheet(report: Omit<EveningReport, 'id' | 'submittedAt'>): Promise<EveningReport> {
  const newReport: EveningReport = {
    ...report,
    followUpDate: report.followUpDate ? getIndianDateString(report.followUpDate) : '',
    id: report.morningPlanId ? `ER-${report.morningPlanId}` : 'ER-' + Date.now(),
    submittedAt: getIndianDateTimeString(),
  };

  // 12-column format strictly matching Google Sheet tab 'Evening Follow Up':
  // Col A: Uid | Col B: Date | Col C: Sales Person Name | Col D: Company Name | Col E: Address | Col F: Client | Col G: Contact Number | Col H: Designation | Col I: Remarks | Col J: Next Follow Up Date | Col K: Attachment | Col L: Email
  const eveningFollowUp10Cols = [
    newReport.morningPlanId || newReport.id,
    newReport.meetingDate ? getIndianDateString(newReport.meetingDate) : getIndianDateString(),
    newReport.salesPersonName || '',
    newReport.partyName || '',
    newReport.address || '',
    newReport.client || '',
    newReport.contactNumber || '',
    newReport.designation || '',
    newReport.remarks || newReport.discussion || '',
    newReport.followUpDate ? getIndianDateString(newReport.followUpDate) : '',
    newReport.attachmentUrls || '',
    newReport.email || '',
  ];

  const fullRowData = [
    newReport.id,
    newReport.morningPlanId || '',
    newReport.salesPersonId,
    newReport.salesPersonName,
    newReport.partyName,
    newReport.visited || 'Yes',
    newReport.meetingTime || '',
    newReport.discussion || newReport.remarks || '',
    newReport.productsDiscussed || '',
    newReport.requirement || '',
    newReport.followUpDate || '',
    newReport.expectedOrder || 0,
    newReport.orderProbability || 0,
    newReport.remarks || '',
    newReport.status || 'Completed',
    newReport.submittedAt,
    newReport.photoUrl || '',
    newReport.latitude || '',
    newReport.longitude || '',
    newReport.address || '',
  ];

  if (isSupabaseConfigured) {
    try {
      await supabase.from('evening_reports').upsert([{
        id: newReport.id,
        morning_plan_id: newReport.morningPlanId || null,
        sales_person_id: newReport.salesPersonId,
        sales_person_name: newReport.salesPersonName,
        meeting_date: newReport.meetingDate || null,
        party_name: newReport.partyName,
        address: newReport.address || null,
        client: newReport.client || null,
        contact_number: newReport.contactNumber || null,
        email: newReport.email || null,
        designation: newReport.designation || null,
        visited: newReport.visited || 'Yes',
        meeting_time: newReport.meetingTime || null,
        discussion: newReport.discussion || newReport.remarks || null,
        products_discussed: newReport.productsDiscussed || null,
        requirement: newReport.requirement || null,
        follow_up_date: newReport.followUpDate || null,
        expected_order: newReport.expectedOrder || 0,
        order_probability: newReport.orderProbability || 0,
        remarks: newReport.remarks || null,
        photo_url: newReport.photoUrl || null,
        attachment_urls: newReport.attachmentUrls || null,
        latitude: newReport.latitude || null,
        longitude: newReport.longitude || null,
        status: newReport.status || 'Completed',
        submitted_at: newReport.submittedAt,
      }]);
    } catch (sbErr) {
      console.warn('Supabase evening report save notice:', sbErr);
    }
  }

  await insertSheetRow('Evening Follow Up', eveningFollowUp10Cols);
  await insertSheetRow('EveningReport', fullRowData);

  return newReport;
}

/**
 * Fetch Evening Reports from Google Sheet 'Evening Follow Up' tab
 */
export async function fetchEveningReportsFromSheet(): Promise<EveningReport[]> {
  try {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('evening_reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            morningPlanId: d.morning_plan_id || d.morningPlanId || '',
            salesPersonId: d.sales_person_id || d.salesPersonId || '',
            salesPersonName: d.sales_person_name || d.salesPersonName || '',
            meetingDate: d.meeting_date || d.meetingDate || '',
            partyName: d.party_name || d.partyName || '',
            address: d.address || '',
            client: d.client || '',
            contactNumber: d.contact_number || d.contactNumber || '',
            email: d.email || '',
            designation: d.designation || '',
            visited: d.visited || 'Yes',
            meetingTime: d.meeting_time || d.meetingTime || '',
            discussion: d.discussion || d.remarks || '',
            productsDiscussed: d.products_discussed || d.productsDiscussed || '',
            requirement: d.requirement || '',
            followUpDate: d.follow_up_date || d.followUpDate || '',
            expectedOrder: Number(d.expected_order || d.expectedOrder) || 0,
            orderProbability: Number(d.order_probability || d.orderProbability) || 0,
            remarks: d.remarks || '',
            photoUrl: d.photo_url || d.photoUrl || '',
            attachmentUrls: d.attachment_urls || d.attachmentUrls || '',
            latitude: d.latitude,
            longitude: d.longitude,
            status: d.status || 'Completed',
            submittedAt: d.submitted_at || '',
          }));
        }
      } catch (sbErr) {
        console.warn('Supabase evening reports fetch notice:', sbErr);
      }
    }
    for (const sheetName of ['Evening Follow Up', 'EveningFollowUp', 'EveningReport']) {
      const rows = await fetchSheetData(sheetName);
      if (rows && rows.length > 1) {
        const reports: EveningReport[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || !row[0]) continue;

          if (row.length <= 13) {
            // 10/11/12-column format: Uid | Date | Sales Person Name | Company Name | Address | Client | Contact Number | Designation | Remarks | Next Follow Up Date | Attachment | Email
            const uid = String(row[0] || `ER-${i}`);
            const date = getIndianDateString(row[1] || new Date());
            const salesPersonName = String(row[2] || '');
            const partyName = String(row[3] || '');
            const address = String(row[4] || '');
            const client = String(row[5] || '');
            const contactNumber = String(row[6] || '');
            const designation = String(row[7] || '');
            const remarks = String(row[8] || '');
            const followUpDate = getIndianDateString(row[9] || '');
            const attachmentUrls = String(row[10] || '');
            const email = String(row[11] || '');

            reports.push({
              id: uid,
              morningPlanId: uid,
              salesPersonId: 'SALES-' + i,
              salesPersonName,
              meetingDate: date,
              partyName,
              address,
              client,
              contactNumber,
              email,
              designation,
              visited: 'Yes',
              remarks,
              discussion: remarks,
              followUpDate,
              attachmentUrls,
              status: 'Completed',
              submittedAt: getIndianDateTimeString(),
            });
          } else {
            // Extended format
            reports.push({
              id: String(row[0] || `ER-${i}`),
              morningPlanId: String(row[1] || ''),
              salesPersonId: String(row[2] || 'SALES01'),
              salesPersonName: String(row[3] || ''),
              partyName: String(row[4] || ''),
              visited: (row[5] as any) || 'Yes',
              meetingTime: String(row[6] || ''),
              discussion: String(row[7] || ''),
              productsDiscussed: String(row[8] || ''),
              requirement: String(row[9] || ''),
              followUpDate: getIndianDateString(row[10] || ''),
              expectedOrder: Number(row[11]) || 0,
              orderProbability: Number(row[12]) || 50,
              remarks: String(row[13] || ''),
              status: 'Completed',
              submittedAt: getIndianDateTimeString(row[15] || new Date()),
              photoUrl: String(row[16] || ''),
              address: String(row[19] || ''),
            });
          }
        }
        if (reports.length > 0) return reports;
      }
    }
  } catch (err) {
    console.warn('Could not fetch evening reports:', err);
  }
  return [];
}

/**
 * Save GPS Tracking location record to Google Sheet / Supabase
 */
export async function saveGPSToSheet(record: Omit<GPSRecord, 'id'>): Promise<GPSRecord> {
  const gpsRecord: GPSRecord = {
    ...record,
    date: getIndianDateString(record.date),
    time: record.time || getIndianTimeString(),
    id: 'GPS-' + Date.now(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('gps_records').insert([{
        id: gpsRecord.id,
        sales_person_id: gpsRecord.salesPersonId,
        sales_person_name: gpsRecord.salesPersonName,
        latitude: gpsRecord.latitude,
        longitude: gpsRecord.longitude,
        address: gpsRecord.address,
        date: gpsRecord.date,
        time: gpsRecord.time,
        accuracy: gpsRecord.accuracy,
        action_source: gpsRecord.actionSource || 'Live Check-in',
      }]);
    } catch (sbErr) {
      console.warn('Supabase GPS record save notice:', sbErr);
    }
  }

  const rowData = [
    gpsRecord.id,
    gpsRecord.salesPersonId,
    gpsRecord.salesPersonName,
    gpsRecord.latitude,
    gpsRecord.longitude,
    gpsRecord.address,
    gpsRecord.date,
    gpsRecord.time,
    gpsRecord.accuracy,
    gpsRecord.actionSource || '',
  ];

  await insertSheetRow('GPS', rowData);
  await insertSheetRow('GPSLogs', rowData);

  return gpsRecord;
}

/**
 * Save array of 13-column GPS Excel records directly to Google Sheet 'GPS' tab
 * Uses parallel execution in chunks for fast dumping
 */
export async function saveGPSExcelRowsToSheet(records: GPSExcelRecord[]): Promise<boolean> {
  try {
    const allRowArrays = records.map(rec => [
      rec.transporterName || '',
      rec.recipientCustomerName || '',
      rec.vehicleNumber || '',
      rec.resourceName || '',
      rec.deviceNumber || '',
      rec.resultDate || '',
      rec.address || '',
      rec.latitude || '',
      rec.longitude || '',
      rec.accuracy || '',
      rec.distance || '',
      rec.status || '',
      rec.type || '',
    ]);

    // 1. Send bulk insert request
    try {
      const bulkParams = new URLSearchParams();
      bulkParams.append('sheetName', 'GPS');
      bulkParams.append('action', 'insertBulk');
      bulkParams.append('rowsData', JSON.stringify(allRowArrays));
      bulkParams.append('rowData', JSON.stringify(allRowArrays));

      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: bulkParams,
      }).catch(() => {});
    } catch (e) {
      // ignore
    }

    // 2. Dispatch row insertions concurrently in background for fast dump
    (async () => {
      const chunkSize = 15;
      for (let i = 0; i < allRowArrays.length; i += chunkSize) {
        const chunk = allRowArrays.slice(i, i + chunkSize);
        await Promise.allSettled(chunk.map(row => insertSheetRow('GPS', row)));
      }
    })();

    return true;
  } catch (err) {
    console.warn('Error saving GPS excel rows to Google Sheet:', err);
    return false;
  }
}

/**
 * Fetch GPS records from Google Sheet 'GPS' tab / Supabase
 */
export async function fetchGPSDataFromSheet(): Promise<{
  liveRecords: GPSRecord[];
  excelRecords: GPSExcelRecord[];
}> {
  const liveRecords: GPSRecord[] = [];
  const excelRecords: GPSExcelRecord[] = [];

  try {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('gps_records')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          data.forEach(d => {
            liveRecords.push({
              id: d.id,
              salesPersonId: d.sales_person_id || d.salesPersonId || '',
              salesPersonName: d.sales_person_name || d.salesPersonName || '',
              latitude: Number(d.latitude) || 0,
              longitude: Number(d.longitude) || 0,
              address: d.address || '',
              date: d.date || '',
              time: d.time || '',
              accuracy: Number(d.accuracy) || 10,
              actionSource: d.action_source || d.actionSource || 'Live Check-in',
            });
          });
        }
      } catch (sbErr) {
        console.warn('Supabase GPS fetch notice:', sbErr);
      }
    }

    const rows = await fetchSheetData('GPS');
    if (!rows || rows.length <= 1) {
      return { liveRecords, excelRecords };
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const col0 = String(row[0] || '').trim();
      const col1 = String(row[1] || '').trim();
      const col2 = String(row[2] || '').trim();

      // Live ping check: ID starts with GPS- or contains numeric lat/lng
      if (col0.startsWith('GPS-') || (row.length >= 7 && !isNaN(Number(row[3])) && !isNaN(Number(row[4])) && Number(row[3]) !== 0)) {
        if (!liveRecords.some(r => r.id === col0)) {
          liveRecords.push({
            id: col0 || `GPS-${Date.now()}-${i}`,
            salesPersonId: col1 || 'USR-01',
            salesPersonName: col2 || 'Sales User',
            latitude: Number(row[3]) || 0,
            longitude: Number(row[4]) || 0,
            address: String(row[5] || 'Recorded Location'),
            date: String(row[6] || getIndianDateString()),
            time: String(row[7] || getIndianTimeString()),
            accuracy: Number(row[8]) || 10,
            actionSource: String(row[9] || 'Live Check-in'),
          });
        }
      } else {
        // Treat as 13-column Excel GPS record
        if (col0 || col1 || col2 || row[6] || row[7]) {
          excelRecords.push({
            id: `GPS-EXCEL-${i}`,
            transporterName: col0,
            recipientCustomerName: col1,
            vehicleNumber: col2,
            resourceName: String(row[3] || ''),
            deviceNumber: String(row[4] || ''),
            resultDate: String(row[5] || ''),
            address: String(row[6] || ''),
            latitude: row[7] || '',
            longitude: row[8] || '',
            accuracy: row[9] || '',
            distance: row[10] || '',
            status: String(row[11] || ''),
            type: String(row[12] || ''),
          });
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch GPS data from Sheet:', err);
  }

  return { liveRecords, excelRecords };
}

/**
 * Fetch targets from Google Sheet 'Target' tab / Supabase
 */
export async function fetchTargetsFromSheet(): Promise<TargetRecord[]> {
  try {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('targets')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            timestamp: d.timestamp || d.created_at || '',
            month: d.month,
            salesPersonName: d.sales_person_name || d.salesPersonName,
            totalNewOrders: Number(d.total_new_orders || d.totalNewOrders) || 0,
            amount: Number(d.amount) || 0,
            remark: d.remark || '',
          }));
        }
      } catch (sbErr) {
        console.warn('Supabase targets fetch notice:', sbErr);
      }
    }

    const rows = await fetchSheetData('Target');
    if (!rows || rows.length <= 1) {
      return [];
    }

    const targets: TargetRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;

      targets.push({
        id: String(row[0] || `TGT-${i}`),
        timestamp: getIndianDateTimeString(row[1] || new Date()),
        month: String(row[2] || ''),
        salesPersonName: String(row[3] || 'All Sales Reps'),
        totalNewOrders: Number(row[4]) || 0,
        amount: Number(row[5]) || 0,
        remark: String(row[6] || ''),
      });
    }

    return targets;
  } catch (err) {
    console.warn('Error fetching targets:', err);
    return [];
  }
}

/**
 * Assign and save a new target to Google Sheet 'Target' tab / Supabase
 */
export async function assignTargetToSheet(target: Omit<TargetRecord, 'id' | 'timestamp'>): Promise<TargetRecord> {
  const newTarget: TargetRecord = {
    ...target,
    id: 'TGT-' + Date.now(),
    timestamp: getIndianDateTimeString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('targets').upsert([{
        id: newTarget.id,
        timestamp: newTarget.timestamp,
        month: newTarget.month,
        sales_person_name: newTarget.salesPersonName,
        total_new_orders: newTarget.totalNewOrders,
        amount: newTarget.amount,
        remark: newTarget.remark || '',
      }]);
    } catch (sbErr) {
      console.warn('Supabase target save notice:', sbErr);
    }
  }

  await insertSheetRow('Target', [
    newTarget.id,
    newTarget.timestamp,
    newTarget.month,
    newTarget.salesPersonName,
    newTarget.totalNewOrders,
    newTarget.amount,
    newTarget.remark,
  ]);

  return newTarget;
}

/**
 * Fetch list of sales person names from Column C (USER NAME) of the 'Login' sheet
 */
export async function fetchSalesPersonsFromLoginSheet(): Promise<string[]> {
  const defaultSalesPersons = [
    'Atul Baghmar',
    'Pamendra Singh Rajput',
    'Neha Garg',
    'Pradeep Kumar',
    'ADMIN',
    'Anas Siddique',
    'Vivek Yadav',
    'Jaspreet Singh',
    'Bhushan Singh Chouhan',
    'Pankaj Kumar',
    'Devi Naidu',
  ];

  try {
    for (const sheetCandidate of ['Login', 'Users', 'Data']) {
      const rows = await fetchSheetData(sheetCandidate);
      if (rows && rows.length > 1) {
        const names: string[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 3) continue;
          const name = String(row[2] || '').trim(); // Column C is index 2 (USER NAME)
          if (name && !names.includes(name)) {
            names.push(name);
          }
        }
        if (names.length > 0) {
          return names;
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch Login sheet salespersons:', err);
  }

  return defaultSalesPersons;
}

/**
 * Fetch references from Sheet 'Refrences' tab / Supabase
 */
export async function fetchReferencesFromSheet(): Promise<ReferenceRecord[]> {
  try {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('reference_records')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            createdAt: d.created_at || '',
            refGivenBy: d.ref_given_by || '',
            refGivenCompanyName: d.ref_given_company_name || '',
            allottedToSalesPersonName: d.allotted_to_sales_person_name || '',
            allottedByWhom: d.allotted_by_whom || '',
            companyName: d.company_name || '',
            clientName: d.client_name || '',
            designation: d.designation || '',
            clientNumber: d.client_number || '',
            address: d.address || '',
            remarks: d.remarks || '',
            nextFollowupDate: d.next_followup_date || '',
          }));
        }
      } catch (sbErr) {
        console.warn('Supabase references fetch notice:', sbErr);
      }
    }

    const rows = await fetchSheetData('Refrences');
    if (!rows || rows.length <= 1) {
      return [];
    }

    const references: ReferenceRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row.some(cell => cell)) continue;

      references.push({
        id: String(row[0] || `REF-${i}`),
        createdAt: String(row[1] || ''),
        refGivenBy: String(row[2] || ''),
        refGivenCompanyName: String(row[3] || ''),
        allottedToSalesPersonName: String(row[4] || ''),
        allottedByWhom: String(row[5] || ''),
        companyName: String(row[6] || ''),
        clientName: String(row[7] || ''),
        designation: String(row[8] || ''),
        clientNumber: String(row[9] || ''),
        address: String(row[10] || ''),
        remarks: String(row[11] || ''),
        nextFollowupDate: String(row[12] || ''),
      });
    }

    return references;
  } catch (err) {
    console.warn('Error fetching references:', err);
    return [];
  }
}

/**
 * Submit Reference to Sheet 'Refrences' tab / Supabase
 */
export async function submitReferenceToSheet(ref: Omit<ReferenceRecord, 'id'>): Promise<ReferenceRecord> {
  const newRef: ReferenceRecord = {
    ...ref,
    id: 'REF-' + Date.now(),
    createdAt: ref.createdAt || getIndianDateTimeString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('reference_records').upsert([{
        id: newRef.id,
        ref_given_by: newRef.refGivenBy || '',
        ref_given_company_name: newRef.refGivenCompanyName || '',
        allotted_to_sales_person_name: newRef.allottedToSalesPersonName || '',
        allotted_by_whom: newRef.allottedByWhom || '',
        company_name: newRef.companyName,
        client_name: newRef.clientName,
        designation: newRef.designation || '',
        client_number: newRef.clientNumber || '',
        address: newRef.address || '',
        remarks: newRef.remarks || '',
        next_followup_date: newRef.nextFollowupDate || '',
      }]);
    } catch (sbErr) {
      console.warn('Supabase reference save notice:', sbErr);
    }
  }

  await insertSheetRow('Refrences', [
    newRef.id,
    newRef.createdAt,
    newRef.refGivenBy,
    newRef.refGivenCompanyName,
    newRef.allottedToSalesPersonName,
    newRef.allottedByWhom,
    newRef.companyName,
    newRef.clientName,
    newRef.designation,
    newRef.clientNumber,
    newRef.address,
    newRef.remarks,
    newRef.nextFollowupDate,
  ]);

  return newRef;
}

/**
 * Fetch leave requests from Sheet 'Leave' tab / Supabase
 */
export async function fetchLeavesFromSheet(): Promise<LeaveRecord[]> {
  try {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('leave_records')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            timestamp: d.timestamp || d.created_at || '',
            lrNumber: d.lr_number || '',
            requestedBy: d.requested_by || '',
            department: d.department || 'Sales',
            totalLeaveDays: Number(d.total_leave_days) || 1,
            jobLocation: d.job_location || '',
            dateFrom: d.date_from || '',
            dateTo: d.date_to || '',
            reason: d.reason || '',
            remark: d.remark || '',
            imageUrl: d.image_url || '',
            approvedBy: d.approved_by || '',
            status: d.status || 'Approved',
          }));
        }
      } catch (sbErr) {
        console.warn('Supabase leaves fetch notice:', sbErr);
      }
    }

    const rows = await fetchSheetData('Leave');
    if (!rows || rows.length <= 1) {
      return [];
    }

    const leaves: LeaveRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row.some(cell => cell)) continue;

      const requestedBy = String(row[2] || '').trim();
      if (!requestedBy) continue;

      const rawFrom = row[6] ? String(row[6]).trim() : '';
      const rawTo = row[7] ? String(row[7]).trim() : '';

      leaves.push({
        id: String(row[1] || `LV-${i}`),
        timestamp: getIndianDateTimeString(row[0] || new Date()),
        lrNumber: String(row[1] || ''),
        requestedBy,
        department: String(row[3] || ''),
        totalLeaveDays: Number(row[4]) || 0,
        jobLocation: String(row[5] || ''),
        dateFrom: rawFrom ? getIndianDateString(rawFrom) : '',
        dateTo: rawTo ? getIndianDateString(rawTo) : (rawFrom ? getIndianDateString(rawFrom) : ''),
        reason: String(row[8] || ''),
        remark: String(row[9] || ''),
        imageUrl: String(row[10] || ''),
        approvedBy: String(row[14] || ''),
        status: String(row[15] || ''),
      });
    }

    return leaves;
  } catch (err) {
    console.warn('Error fetching leaves:', err);
    return [];
  }
}

/**
 * Fetch CRM Orders for target achievement calculation
 */
export async function fetchCRMOrdersFromSheet(): Promise<CRMOrderRecord[]> {
  try {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('crm_orders')
          .select('*');

        if (data && !error && data.length > 0) {
          return data.map(d => ({
            salesPersonName: d.sales_person_name,
            orderActualDate: d.order_actual_date || '',
            orderStatus: d.order_status || 'Active',
          }));
        }
      } catch (sbErr) {
        console.warn('Supabase CRM orders fetch notice:', sbErr);
      }
    }

    const rows = await fetchSheetData('Crm New Lead Order Recived');
    if (!rows || rows.length <= 1) {
      return [];
    }

    const orders: CRMOrderRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const salesPersonName = String(row[10] || '').trim();
      const orderActualDate = String(row[60] || '').trim();
      const orderStatus = String(row[68] || '').trim();

      if (salesPersonName && orderActualDate) {
        orders.push({
          salesPersonName,
          orderActualDate,
          orderStatus
        });
      }
    }

    return orders;
  } catch (err) {
    console.error('Error fetching CRM orders:', err);
    return [];
  }
}
