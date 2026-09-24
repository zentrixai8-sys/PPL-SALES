import {
  User,
  MorningPlan,
  EveningReport,
  GPSRecord,
  GPSExcelRecord,
  AttendanceRecord,
  TargetRecord,
  CRMOrderRecord,
  ReferenceRecord,
  LeaveRecord,
  GrievanceTicket,
} from '../types';
import {
  getIndianDateString,
  getIndianDateTimeString,
  getIndianTimeString,
  parseUniversalDate,
  formatToDDMMYYYYHHMM,
} from '../utils/dateUtils';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Retained for backward-compatibility if imported elsewhere
export const APPS_SCRIPT_URL = '';

/**
 * Normalizes user record from Supabase / database format to standard User object.
 */
function normalizeUserData(rawData: Record<string, any>): User {
  const getVal = (...keys: string[]) => {
    for (const k of keys) {
      if (rawData[k] !== undefined && rawData[k] !== null && String(rawData[k]).trim() !== '') {
        return String(rawData[k]).trim();
      }
    }
    return '';
  };

  const id = getVal('id', 'ID', 'Id');
  const userName = getVal('user_name', 'userName', 'USER NAME', 'username', 'UserName', 'Name') || id;
  const roleRaw = getVal('role', 'ROLE', 'Role') || 'Sales';
  const role = (roleRaw.toLowerCase().includes('admin') ? 'Admin' : 'Sales') as User['role'];
  const gmail = getVal('gmail', 'GMAIL', 'Gmail', 'email', 'Email');
  const manager = getVal('manager', 'MANAGER', 'Manager') || 'Regional Head';
  const crm = getVal('crm', 'CRM', 'Crm') || 'CRM-1001';
  const profileUrl =
    getVal('profile_url', 'profileUrl', 'PROFILE URL', 'ProfileUrl') ||
    `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`;

  return {
    id,
    userName,
    role,
    gmail,
    manager,
    crm,
    profileUrl,
    designation: getVal('designation'),
    department: getVal('department'),
    phone: getVal('phone'),
    altPhone: getVal('alt_phone', 'altPhone'),
    joiningDate: getVal('joining_date', 'joiningDate'),
    dob: getVal('dob'),
    bloodGroup: getVal('blood_group', 'bloodGroup'),
    territory: getVal('territory'),
    headquarters: getVal('headquarters'),
    shiftTiming: getVal('shift_timing', 'shiftTiming'),
    workStatus: getVal('work_status', 'workStatus'),
    kycStatus: getVal('kyc_status', 'kycStatus'),
    bankAccount: getVal('bank_account', 'bankAccount'),
    pfUan: getVal('pf_uan', 'pfUan'),
  };
}

/**
 * Compatibility helpers (now no-op / redirect to Supabase where relevant)
 */
export async function insertSheetRow(_sheetName: string, _rowArray: any[]): Promise<boolean> {
  return true;
}

export async function updateSheetRow(_sheetName: string, _id: string, _rowArray: any[]): Promise<boolean> {
  return true;
}

export async function deleteSheetRow(_sheetName: string, _id: string): Promise<boolean> {
  return true;
}

export async function deleteSheetRowByIndex(_sheetName: string, _rowIndex: number): Promise<boolean> {
  return true;
}

export async function deleteSheetRowById(_sheetName: string, _id: string, _idColumnIndex: number = 0): Promise<boolean> {
  return true;
}

export async function fetchSheetData(_sheetName: string): Promise<any[][] | null> {
  return null;
}

export async function uploadFileToDrive(_file: File, _folderId: string): Promise<string | null> {
  return null;
}

// =========================================================================
// 1. AUTHENTICATION & USER MANAGEMENT (SUPABASE)
// =========================================================================

/**
 * Authenticate employee credentials directly with Supabase 'users' table.
 */
export async function loginWithGoogleSheet(idInput: string, passwordInput: string): Promise<User> {
  const cleanId = idInput.trim();
  const cleanPass = passwordInput.trim();

  if (!isSupabaseConfigured) {
    throw new Error('Supabase database is not configured. Please check your .env credentials.');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`id.ilike.${cleanId},user_name.ilike.${cleanId},gmail.ilike.${cleanId}`)
      .eq('password', cleanPass)
      .maybeSingle();

    if (error) {
      console.error('Supabase login query error:', error);
      throw new Error(error.message || 'Authentication error.');
    }

    if (data) {
      return normalizeUserData(data);
    }
  } catch (sbError: any) {
    if (sbError.message && sbError.message !== 'Invalid ID or Password.') {
      console.error('Supabase authentication failed:', sbError);
    }
    throw sbError.message ? sbError : new Error('Invalid ID or Password.');
  }

  throw new Error('Invalid ID or Password.');
}

/**
 * Fetch all registered users from Supabase 'users' table.
 */
export async function fetchAllUsersFromSheet(): Promise<User[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('user_name', { ascending: true });

    if (error) {
      console.error('Error fetching users from Supabase:', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map(normalizeUserData);
    }
  } catch (err) {
    console.error('Error fetching all users:', err);
  }

  return [];
}

/**
 * Register a new user in Supabase 'users' table.
 */
export async function registerUserInSheet(newUser: {
  id: string;
  password: string;
  userName: string;
  role: 'Admin' | 'Sales' | 'Manager';
  gmail?: string;
  manager?: string;
  crm?: string;
  profileUrl?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('users').upsert([
      {
        id: newUser.id,
        user_name: newUser.userName,
        password: newUser.password,
        role: newUser.role,
        gmail: newUser.gmail || null,
        manager: newUser.manager || 'Regional Head',
        crm: newUser.crm || 'CRM-1001',
        profile_url: newUser.profileUrl || null,
      },
    ]);

    if (error) {
      console.error('Error registering user in Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to register user:', err);
    return false;
  }
}

/**
 * Update user details in Supabase 'users' table.
 */
export async function updateUserInSheet(id: string, updates: Partial<User> & { password?: string }): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const payload: Record<string, any> = {};
    if (updates.userName !== undefined) payload.user_name = updates.userName;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.gmail !== undefined) payload.gmail = updates.gmail;
    if (updates.manager !== undefined) payload.manager = updates.manager;
    if (updates.crm !== undefined) payload.crm = updates.crm;
    if (updates.profileUrl !== undefined) payload.profile_url = updates.profileUrl;
    if (updates.password !== undefined) payload.password = updates.password;
    if (updates.designation !== undefined) payload.designation = updates.designation;
    if (updates.department !== undefined) payload.department = updates.department;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.altPhone !== undefined) payload.alt_phone = updates.altPhone;
    if (updates.joiningDate !== undefined) payload.joining_date = updates.joiningDate;
    if (updates.dob !== undefined) payload.dob = updates.dob;
    if (updates.bloodGroup !== undefined) payload.blood_group = updates.bloodGroup;
    if (updates.territory !== undefined) payload.territory = updates.territory;
    if (updates.headquarters !== undefined) payload.headquarters = updates.headquarters;
    if (updates.shiftTiming !== undefined) payload.shift_timing = updates.shiftTiming;
    if (updates.workStatus !== undefined) payload.work_status = updates.workStatus;
    if (updates.kycStatus !== undefined) payload.kyc_status = updates.kycStatus;
    if (updates.bankAccount !== undefined) payload.bank_account = updates.bankAccount;
    if (updates.pfUan !== undefined) payload.pf_uan = updates.pfUan;

    const { error } = await supabase.from('users').update(payload).eq('id', id);

    if (error) {
      console.error('Error updating user in Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to update user:', err);
    return false;
  }
}

/**
 * Delete a user from Supabase 'users' table.
 */
export async function deleteUserFromSheet(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      console.error('Error deleting user from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete user:', err);
    return false;
  }
}

/**
 * Fetch sales person names from Supabase 'users' table.
 */
export async function fetchSalesPersonsFromLoginSheet(): Promise<string[]> {
  const defaultSalesPersons = [
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
  ];

  if (!isSupabaseConfigured) return defaultSalesPersons;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_name')
      .order('user_name', { ascending: true });

    if (!error && data && data.length > 0) {
      const names = data.map((d: any) => String(d.user_name || '').trim()).filter(Boolean);
      if (names.length > 0) return Array.from(new Set(names));
    }
  } catch (err) {
    console.warn('Could not fetch salespersons from Supabase:', err);
  }

  return defaultSalesPersons;
}

// =========================================================================
// 2. MORNING PLANS (SUPABASE)
// =========================================================================

/**
 * Submit Morning Plan to Supabase 'morning_plans' table.
 */
export async function submitMorningPlanToSheet(plan: Omit<MorningPlan, 'id' | 'createdAt'>): Promise<MorningPlan> {
  const newPlan: MorningPlan = {
    ...plan,
    meetingDate: getIndianDateString(plan.meetingDate),
    id: 'MP-' + Date.now(),
    createdAt: getIndianDateTimeString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('morning_plans').upsert([
        {
          id: newPlan.id,
          sales_person_id: newPlan.salesPersonId,
          sales_person_name: newPlan.salesPersonName,
          meeting_date: newPlan.meetingDate,
          party_name: newPlan.partyName,
          contact_person: newPlan.contactPerson || null,
          mobile_number: newPlan.mobileNumber || null,
          city: newPlan.city || null,
          purpose: newPlan.purpose || null,
          expected_business: newPlan.expectedBusiness || 0,
          priority: newPlan.priority || 'Medium',
          remarks: newPlan.remarks || null,
          status: newPlan.status || 'Pending',
          latitude: newPlan.latitude || null,
          longitude: newPlan.longitude || null,
          address: newPlan.address || null,
        },
      ]);

      if (error) {
        console.error('Error saving morning plan to Supabase:', error);
      }
    } catch (sbErr) {
      console.error('Supabase morning plan save exception:', sbErr);
    }
  }

  return newPlan;
}

/**
 * Fetch Morning Plans from Supabase 'morning_plans' table.
 */
export async function fetchMorningPlansFromSheet(): Promise<MorningPlan[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('morning_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching morning plans from Supabase:', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((d: any) => ({
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
  } catch (err) {
    console.error('Could not fetch morning plans:', err);
  }

  return [];
}

/**
 * Update a Morning Plan in Supabase 'morning_plans' table.
 */
export async function updateMorningPlanInSheet(id: string, updates: Partial<MorningPlan>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const payload: Record<string, any> = {};
    if (updates.partyName !== undefined) payload.party_name = updates.partyName;
    if (updates.contactPerson !== undefined) payload.contact_person = updates.contactPerson;
    if (updates.mobileNumber !== undefined) payload.mobile_number = updates.mobileNumber;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.purpose !== undefined) payload.purpose = updates.purpose;
    if (updates.expectedBusiness !== undefined) payload.expected_business = updates.expectedBusiness;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.remarks !== undefined) payload.remarks = updates.remarks;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.meetingDate !== undefined) payload.meeting_date = updates.meetingDate;
    if (updates.address !== undefined) payload.address = updates.address;

    const { error } = await supabase.from('morning_plans').update(payload).eq('id', id);
    if (error) {
      console.error('Error updating morning plan in Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to update morning plan:', err);
    return false;
  }
}

/**
 * Delete a Morning Plan from Supabase 'morning_plans' table.
 */
export async function deleteMorningPlan(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('morning_plans').delete().eq('id', id);
    if (error) {
      console.error('Error deleting morning plan from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete morning plan:', err);
    return false;
  }
}

// =========================================================================
// 3. EVENING REPORTS (SUPABASE)
// =========================================================================

/**
 * Submit Evening Report to Supabase 'evening_reports' table.
 */
export async function submitEveningReportToSheet(
  report: Omit<EveningReport, 'id' | 'submittedAt'>
): Promise<EveningReport> {
  const newReport: EveningReport = {
    ...report,
    followUpDate: report.followUpDate ? getIndianDateString(report.followUpDate) : '',
    id: report.morningPlanId ? `ER-${report.morningPlanId}` : 'ER-' + Date.now(),
    submittedAt: getIndianDateTimeString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('evening_reports').upsert([
        {
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
        },
      ]);

      if (error) {
        console.error('Error saving evening report to Supabase:', error);
      }
    } catch (sbErr) {
      console.error('Supabase evening report save exception:', sbErr);
    }
  }

  return newReport;
}

/**
 * Fetch Evening Reports from Supabase 'evening_reports' table.
 */
export async function fetchEveningReportsFromSheet(): Promise<EveningReport[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('evening_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching evening reports from Supabase:', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((d: any) => ({
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
  } catch (err) {
    console.error('Could not fetch evening reports:', err);
  }

  return [];
}

/**
 * Update an Evening Report in Supabase 'evening_reports' table.
 */
export async function updateEveningReportInSheet(id: string, updates: Partial<EveningReport>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const payload: Record<string, any> = {};
    if (updates.partyName !== undefined) payload.party_name = updates.partyName;
    if (updates.address !== undefined) payload.address = updates.address;
    if (updates.client !== undefined) payload.client = updates.client;
    if (updates.contactNumber !== undefined) payload.contact_number = updates.contactNumber;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.designation !== undefined) payload.designation = updates.designation;
    if (updates.visited !== undefined) payload.visited = updates.visited;
    if (updates.meetingTime !== undefined) payload.meeting_time = updates.meetingTime;
    if (updates.discussion !== undefined) payload.discussion = updates.discussion;
    if (updates.productsDiscussed !== undefined) payload.products_discussed = updates.productsDiscussed;
    if (updates.requirement !== undefined) payload.requirement = updates.requirement;
    if (updates.followUpDate !== undefined) payload.follow_up_date = updates.followUpDate;
    if (updates.expectedOrder !== undefined) payload.expected_order = updates.expectedOrder;
    if (updates.orderProbability !== undefined) payload.order_probability = updates.orderProbability;
    if (updates.remarks !== undefined) payload.remarks = updates.remarks;
    if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
    if (updates.attachmentUrls !== undefined) payload.attachment_urls = updates.attachmentUrls;
    if (updates.status !== undefined) payload.status = updates.status;

    const { error } = await supabase.from('evening_reports').update(payload).eq('id', id);
    if (error) {
      console.error('Error updating evening report in Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to update evening report:', err);
    return false;
  }
}

/**
 * Delete an Evening Report from Supabase 'evening_reports' table.
 */
export async function deleteEveningReport(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('evening_reports').delete().eq('id', id);
    if (error) {
      console.error('Error deleting evening report from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete evening report:', err);
    return false;
  }
}

// =========================================================================
// 4. GPS TRACKING & ATTENDANCE (SUPABASE)
// =========================================================================

/**
 * Save GPS Tracking location record to Supabase 'gps_records' table.
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
      const { error } = await supabase.from('gps_records').insert([
        {
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
        },
      ]);

      if (error) {
        console.error('Error saving GPS record to Supabase:', error);
      }
    } catch (sbErr) {
      console.error('Supabase GPS record save exception:', sbErr);
    }
  }

  return gpsRecord;
}

/**
 * Save GPS Excel rows to Supabase 'gps_records' table.
 */
export async function saveGPSExcelRowsToSheet(records: GPSExcelRecord[]): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const rows = records.map((rec, i) => {
      const parsedDate = parseUniversalDate(rec.resultDate);
      const formattedDate = parsedDate ? formatToDDMMYYYYHHMM(parsedDate) : (rec.resultDate || getIndianDateString());
      return {
        id: `GPS-EXCEL-${Date.now()}-${i}`,
        sales_person_id: rec.deviceNumber || 'EXCEL',
        sales_person_name: rec.resourceName || rec.recipientCustomerName || 'Field Agent',
        latitude: Number(rec.latitude) || 0,
        longitude: Number(rec.longitude) || 0,
        address: rec.address || '',
        date: formattedDate,
        time: parsedDate ? getIndianTimeString(parsedDate) : getIndianTimeString(),
        accuracy: Number(rec.accuracy) || 10,
        action_source: rec.type || 'Excel Import',
      };
    });

    const { error } = await supabase.from('gps_records').insert(rows);
    if (error) {
      console.error('Error inserting GPS excel rows to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving GPS excel rows:', err);
    return false;
  }
}

/**
 * Fetch GPS records from Supabase 'gps_records' table.
 */
export async function fetchGPSDataFromSheet(): Promise<{
  liveRecords: GPSRecord[];
  excelRecords: GPSExcelRecord[];
}> {
  const liveRecords: GPSRecord[] = [];
  const excelRecords: GPSExcelRecord[] = [];

  if (!isSupabaseConfigured) return { liveRecords, excelRecords };

  try {
    const { data, error } = await supabase
      .from('gps_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching GPS records from Supabase:', error);
      return { liveRecords, excelRecords };
    }

    if (data && Array.isArray(data)) {
      data.forEach((d: any) => {
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
  } catch (err) {
    console.error('Could not fetch GPS data from Supabase:', err);
  }

  return { liveRecords, excelRecords };
}

/**
 * Save Attendance Punch record to Supabase 'attendance' table.
 */
export async function submitAttendanceToSheet(
  attendance: Omit<AttendanceRecord, 'id'>
): Promise<AttendanceRecord> {
  const newAttendance: AttendanceRecord = {
    ...attendance,
    id: 'ATT-' + Date.now(),
  };

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('attendance').insert([
        {
          id: newAttendance.id,
          sales_person_id: newAttendance.salesPersonId,
          sales_person_name: newAttendance.salesPersonName,
          date: newAttendance.date,
          punch_in_time: newAttendance.punchInTime || null,
          punch_out_time: newAttendance.punchOutTime || null,
          punch_in_address: newAttendance.punchInAddress || null,
          punch_out_address: newAttendance.punchOutAddress || null,
          punch_in_photo_url: newAttendance.punchInPhotoUrl || null,
          punch_out_photo_url: newAttendance.punchOutPhotoUrl || null,
          status: newAttendance.status || 'Present',
          odometer_reading: newAttendance.odometerReading || null,
        },
      ]);

      if (error) {
        console.error('Error saving attendance to Supabase:', error);
      }
    } catch (sbErr) {
      console.error('Supabase attendance save exception:', sbErr);
    }
  }

  return newAttendance;
}

/**
 * Fetch Attendance records from Supabase 'attendance' table.
 */
export async function fetchAttendanceFromSheet(): Promise<AttendanceRecord[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attendance from Supabase:', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((d: any) => ({
        id: d.id,
        salesPersonId: d.sales_person_id || d.salesPersonId || '',
        salesPersonName: d.sales_person_name || d.salesPersonName || '',
        date: d.date || '',
        punchInTime: d.punch_in_time || d.punchInTime || '',
        punchOutTime: d.punch_out_time || d.punchOutTime || '',
        punchInAddress: d.punch_in_address || d.punchInAddress || '',
        punchOutAddress: d.punch_out_address || d.punchOutAddress || '',
        punchInPhotoUrl: d.punch_in_photo_url || d.punchInPhotoUrl || '',
        punchOutPhotoUrl: d.punch_out_photo_url || d.punchOutPhotoUrl || '',
        status: d.status || 'Present',
        odometerReading: d.odometer_reading || d.odometerReading || '',
      }));
    }
  } catch (err) {
    console.error('Could not fetch attendance from Supabase:', err);
  }

  return [];
}

// =========================================================================
// 5. TARGETS (SUPABASE)
// =========================================================================

/**
 * Fetch targets from Supabase 'targets' table.
 */
export async function fetchTargetsFromSheet(): Promise<TargetRecord[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('targets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching targets from Supabase:', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((d: any) => ({
        id: d.id,
        timestamp: d.timestamp || d.created_at || '',
        month: d.month,
        salesPersonName: d.sales_person_name || d.salesPersonName,
        totalNewOrders: Number(d.total_new_orders || d.totalNewOrders) || 0,
        amount: Number(d.amount) || 0,
        remark: d.remark || '',
      }));
    }
  } catch (err) {
    console.error('Error fetching targets:', err);
  }

  return [];
}

/**
 * Assign and save a new target to Supabase 'targets' table.
 */
export async function assignTargetToSheet(
  target: Omit<TargetRecord, 'id' | 'timestamp'>
): Promise<TargetRecord> {
  const newTarget: TargetRecord = {
    ...target,
    id: 'TGT-' + Date.now(),
    timestamp: getIndianDateTimeString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('targets').upsert([
        {
          id: newTarget.id,
          timestamp: newTarget.timestamp,
          month: newTarget.month,
          sales_person_name: newTarget.salesPersonName,
          total_new_orders: newTarget.totalNewOrders,
          amount: newTarget.amount,
          remark: newTarget.remark || '',
        },
      ]);

      if (error) {
        console.error('Error saving target to Supabase:', error);
      }
    } catch (sbErr) {
      console.error('Supabase target save exception:', sbErr);
    }
  }

  return newTarget;
}

/**
 * Delete a Target from Supabase 'targets' table.
 */
export async function deleteTarget(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('targets').delete().eq('id', id);
    if (error) {
      console.error('Error deleting target from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete target:', err);
    return false;
  }
}

// =========================================================================
// 6. REFERENCES / LEADS (SUPABASE)
// =========================================================================

/**
 * Fetch references from Supabase 'reference_records' table.
 */
export async function fetchReferencesFromSheet(): Promise<ReferenceRecord[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('reference_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching references from Supabase:', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((d: any) => ({
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
  } catch (err) {
    console.error('Error fetching references:', err);
  }

  return [];
}

/**
 * Submit Reference to Supabase 'reference_records' table.
 */
export async function submitReferenceToSheet(ref: Omit<ReferenceRecord, 'id'>): Promise<ReferenceRecord> {
  const newRef: ReferenceRecord = {
    ...ref,
    id: 'REF-' + Date.now(),
    createdAt: ref.createdAt || getIndianDateTimeString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('reference_records').upsert([
        {
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
        },
      ]);

      if (error) {
        console.error('Error saving reference to Supabase:', error);
      }
    } catch (sbErr) {
      console.error('Supabase reference save exception:', sbErr);
    }
  }

  return newRef;
}

// =========================================================================
// 7. LEAVE MANAGEMENT (SUPABASE)
// =========================================================================

/**
 * Fetch leave requests from Supabase 'leave_records' table.
 */
export async function fetchLeavesFromSheet(): Promise<LeaveRecord[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('leave_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leaves from Supabase:', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((d: any) => ({
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
  } catch (err) {
    console.error('Error fetching leaves:', err);
  }

  return [];
}

/**
 * Submit Leave request to Supabase 'leave_records' table.
 */
export async function submitLeaveToSheet(leave: Omit<LeaveRecord, 'id' | 'timestamp'>): Promise<LeaveRecord> {
  const newLeave: LeaveRecord = {
    ...leave,
    id: 'LV-' + Date.now(),
    timestamp: getIndianDateTimeString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('leave_records').insert([
        {
          id: newLeave.id,
          lr_number: newLeave.lrNumber,
          requested_by: newLeave.requestedBy,
          department: newLeave.department,
          total_leave_days: newLeave.totalLeaveDays,
          job_location: newLeave.jobLocation,
          date_from: newLeave.dateFrom,
          date_to: newLeave.dateTo,
          reason: newLeave.reason,
          remark: newLeave.remark || '',
          image_url: newLeave.imageUrl || null,
          approved_by: newLeave.approvedBy || '',
          status: newLeave.status || 'Pending',
          timestamp: newLeave.timestamp,
        },
      ]);

      if (error) {
        console.error('Error saving leave request to Supabase:', error);
      }
    } catch (sbErr) {
      console.error('Supabase leave save exception:', sbErr);
    }
  }

  return newLeave;
}

// =========================================================================
// 8. CRM ORDERS & ANALYTICS (SUPABASE)
// =========================================================================

/**
 * Fetch CRM Orders for target achievement calculation from Supabase 'crm_orders' table.
 */
export async function fetchCRMOrdersFromSheet(): Promise<CRMOrderRecord[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase.from('crm_orders').select('*');

    if (error) {
      console.error('Error fetching CRM orders from Supabase:', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((d: any) => ({
        salesPersonName: d.sales_person_name,
        orderActualDate: d.order_actual_date || '',
        orderStatus: d.order_status || 'Active',
      }));
    }
  } catch (err) {
    console.error('Error fetching CRM orders:', err);
  }

  return [];
}

// =========================================================================
// 9. CUSTOMER GRIEVANCE & SUPPORT TICKETS
// =========================================================================

const GRIEVANCE_STORAGE_KEY = 'pppl_customer_grievance_tickets';

const INITIAL_DEMO_TICKETS: GrievanceTicket[] = [
  {
    id: 'tck-1',
    ticketNumber: 'TCK-2026-081',
    salesPersonId: 'sales01',
    salesPersonName: 'Deepak Sahu',
    customerName: 'Shree Balaji Hardware & Paints',
    contactPerson: 'Ramesh Balaji',
    contactNumber: '9826011223',
    city: 'Indore',
    category: 'Packaging / Damage',
    priority: 'High',
    description: 'Received 5 buckets of 20L WeatherShield Premium with cracked lids during transport transit. Leakage occurred in 2 buckets.',
    images: [
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    ],
    status: 'Closed',
    createdAt: '22-09-2026 11:30 AM',
    resolvedAt: '23-09-2026 10:15 AM',
    resolvedBy: 'Administrator',
    resolvedById: 'admin01',
    resolutionRemarks: 'Replacement dispatch initiated via Indore central depot. Invoice credit adjusted.',
    resolutionImages: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    ],
    actionTaken: 'Replacement 5 Buckets Dispatched + Credit Note #CN-9923',
  },
  {
    id: 'tck-2',
    ticketNumber: 'TCK-2026-082',
    salesPersonId: 'sales02',
    salesPersonName: 'Amit Verma',
    customerName: 'Mahalaxmi Paints & Traders',
    contactPerson: 'Suresh Agarwal',
    contactNumber: '9893044112',
    city: 'Bhopal',
    category: 'Shade / Color Variation',
    priority: 'Urgent',
    description: 'Customer reports slight shade discrepancy in Royal Lustre Base shade #PL-402 between Batch B-08 and Batch B-09.',
    images: [
      'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80',
    ],
    status: 'Open',
    createdAt: '23-09-2026 09:45 AM',
  },
];

/**
 * Fetch all grievance tickets from Supabase or localStorage fallback.
 */
export async function fetchGrievanceTicketsFromSheet(): Promise<GrievanceTicket[]> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('grievance_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          id: String(d.id),
          ticketNumber: d.ticket_number || `TCK-${String(d.id).slice(-4)}`,
          salesPersonId: d.sales_person_id || '',
          salesPersonName: d.sales_person_name || '',
          customerName: d.customer_name || '',
          contactPerson: d.contact_person || '',
          contactNumber: d.contact_number || '',
          city: d.city || '',
          category: d.category || 'Product Quality',
          priority: d.priority || 'Medium',
          description: d.description || '',
          images: Array.isArray(d.images) ? d.images : (typeof d.images === 'string' && d.images ? JSON.parse(d.images) : []),
          status: d.status || 'Open',
          createdAt: d.created_at_formatted || d.created_at || '',
          resolvedAt: d.resolved_at || undefined,
          resolvedBy: d.resolved_by || undefined,
          resolvedById: d.resolved_by_id || undefined,
          resolutionRemarks: d.resolution_remarks || undefined,
          resolutionImages: Array.isArray(d.resolution_images) ? d.resolution_images : (typeof d.resolution_images === 'string' && d.resolution_images ? JSON.parse(d.resolution_images) : []),
          actionTaken: d.action_taken || undefined,
        }));
      }
    }
  } catch (err) {
    console.warn('Supabase grievance fetch warning, using local cached tickets:', err);
  }

  // LocalStorage fallback
  try {
    const cached = localStorage.getItem(GRIEVANCE_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_) {}

  localStorage.setItem(GRIEVANCE_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_TICKETS));
  return INITIAL_DEMO_TICKETS;
}

/**
 * Save new Grievance Ticket raised by Sales Person
 */
export async function saveGrievanceTicketToSheet(
  ticketData: Omit<GrievanceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'status'>
): Promise<GrievanceTicket> {
  const newId = `tck-${Date.now()}`;
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const ticketNumber = `TCK-${new Date().getFullYear()}-${randomNum}`;
  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

  const newTicket: GrievanceTicket = {
    ...ticketData,
    id: newId,
    ticketNumber,
    status: 'Open',
    createdAt: formattedDate,
  };

  // Try save to Supabase
  if (isSupabaseConfigured) {
    try {
      await supabase.from('grievance_tickets').insert([
        {
          ticket_number: ticketNumber,
          sales_person_id: newTicket.salesPersonId,
          sales_person_name: newTicket.salesPersonName,
          customer_name: newTicket.customerName,
          contact_person: newTicket.contactPerson || '',
          contact_number: newTicket.contactNumber,
          city: newTicket.city || '',
          category: newTicket.category,
          priority: newTicket.priority,
          description: newTicket.description,
          images: newTicket.images,
          status: 'Open',
          created_at_formatted: formattedDate,
        },
      ]);
    } catch (err) {
      console.warn('Supabase insert grievance error:', err);
    }
  }

  // Update localStorage
  try {
    const current = await fetchGrievanceTicketsFromSheet();
    const updated = [newTicket, ...current];
    localStorage.setItem(GRIEVANCE_STORAGE_KEY, JSON.stringify(updated));
  } catch (_) {}

  return newTicket;
}

/**
 * Resolve & Close Grievance Ticket with multiple resolution proof images and remarks (Manager / Admin Action)
 */
export async function resolveGrievanceTicketInSheet(
  ticketId: string,
  resolution: {
    remarks: string;
    images: string[];
    resolvedBy: string;
    resolvedById: string;
    actionTaken?: string;
  }
): Promise<GrievanceTicket | null> {
  const now = new Date();
  const resolvedAt = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

  // Try Supabase update
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('grievance_tickets')
        .update({
          status: 'Closed',
          resolved_at: resolvedAt,
          resolved_by: resolution.resolvedBy,
          resolved_by_id: resolution.resolvedById,
          resolution_remarks: resolution.remarks,
          resolution_images: resolution.images,
          action_taken: resolution.actionTaken || 'Resolved & Closed',
        })
        .eq('id', ticketId);
    } catch (err) {
      console.warn('Supabase resolve ticket error:', err);
    }
  }

  // Update localStorage
  try {
    const current = await fetchGrievanceTicketsFromSheet();
    const targetIdx = current.findIndex(t => t.id === ticketId || t.ticketNumber === ticketId);
    if (targetIdx !== -1) {
      current[targetIdx] = {
        ...current[targetIdx],
        status: 'Closed',
        resolvedAt,
        resolvedBy: resolution.resolvedBy,
        resolvedById: resolution.resolvedById,
        resolutionRemarks: resolution.remarks,
        resolutionImages: resolution.images,
        actionTaken: resolution.actionTaken || 'Resolved & Closed',
      };
      localStorage.setItem(GRIEVANCE_STORAGE_KEY, JSON.stringify(current));
      return current[targetIdx];
    }
  } catch (_) {}

  return null;
}

