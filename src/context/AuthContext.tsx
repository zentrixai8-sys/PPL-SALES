import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, ToastMessage, MorningPlan, EveningReport, GPSRecord, GPSExcelRecord, AttendanceRecord, Customer, ReferenceRecord, LeaveRecord, AdminNotice } from '../types';
import {
  loginWithGoogleSheet,
  saveGPSToSheet,
  fetchGPSDataFromSheet,
  clearGPSExcelRowsFromSheet,
  fetchReferencesFromSheet,
  fetchLeavesFromSheet,
  fetchMorningPlansFromSheet,
  fetchEveningReportsFromSheet,
  deleteSheetRow,
  deleteSheetRowById,
  updateSheetRow,
  updateUserInSheet
} from '../services/api';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface AuthContextType {
  authState: AuthState;
  login: (id: string, pass: string, rememberMe: boolean) => Promise<User>;
  logout: () => void;
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
  // Theme Mode
  themeMode: 'dark' | 'light';
  toggleTheme: () => void;
  // Broadcast Notices
  activeNotice: AdminNotice | null;
  broadcastNotice: (notice: { title: string; message: string; priority: 'urgent' | 'important' | 'info' }) => Promise<void>;
  clearNotice: () => void;
  dismissNotice: () => void;
  isNoticeDismissed: boolean;
  // Data States
  morningPlans: MorningPlan[];
  addMorningPlan: (plan: MorningPlan) => void;
  eveningReports: EveningReport[];
  addEveningReport: (report: EveningReport) => void;
  gpsRecords: GPSRecord[];
  addGPSRecord: (record: GPSRecord) => void;
  gpsExcelRecords: GPSExcelRecord[];
  addGPSExcelRecords: (recs: GPSExcelRecord[]) => void;
  clearGPSExcelRecords: () => void;
  refreshGPSData: () => Promise<boolean>;
  captureGPSLocation: (actionSource?: string) => Promise<GPSRecord | null>;
  attendanceRecords: AttendanceRecord[];
  addAttendanceRecord: (rec: AttendanceRecord) => void;
  customers: Customer[];
  addCustomer: (cust: Customer) => void;
  references: ReferenceRecord[];
  addReference: (ref: ReferenceRecord) => void;
  refreshReferences: () => Promise<void>;
  leaveRecords: LeaveRecord[];
  refreshLeaves: () => Promise<void>;
  refreshMorningPlans: () => Promise<void>;
  refreshEveningReports: () => Promise<void>;


  updateMorningPlan: (plan: MorningPlan) => void;
  deleteMorningPlan: (id: string) => Promise<boolean>;
  updateEveningReport: (report: EveningReport) => void;
  deleteEveningReport: (id: string) => Promise<boolean>;
  updateCustomer: (cust: Customer) => void;
  deleteCustomer: (id: string) => void;
  updateReference: (ref: ReferenceRecord) => void;
  deleteReference: (id: string) => Promise<boolean>;
  updateAttendanceRecord: (rec: AttendanceRecord) => void;
  deleteAttendanceRecord: (id: string) => void;
  updateUserProfilePic: (newProfileUrl: string) => Promise<void>;
  updateUserProfileDetails: (updates: Partial<User>) => Promise<boolean>;
}

const LOCAL_STORAGE_USER_KEY = 'sales_reporting_user';
const LOCAL_STORAGE_REMEMBER_KEY = 'sales_reporting_remember_id';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Known demo/sample record IDs. These are purged from any previously cached
// localStorage so the system shows ONLY real data from the connected source.
const DEMO_RECORD_IDS = new Set<string>([
  'MP-101', 'MP-102',
  'ER-201',
  'GPS-01', 'GPS-02',
  'ATT-101', 'ATT-102',
  'CUST-001', 'CUST-002',
  'REF-101', 'REF-102',
]);

// Load a persisted array from localStorage, dropping any leftover demo records
// while preserving real user-entered data.
function loadStoredRecords<T extends { id?: string }>(key: string): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: T) => item && item.id && !DEMO_RECORD_IDS.has(item.id));
  } catch {
    return [];
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Theme Mode State ('dark' or 'light') - Default to Light
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('sales_theme');
    return savedTheme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem('sales_theme', themeMode);
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Persistent modules data state (real data only — demo records are purged)
  const [morningPlans, setMorningPlans] = useState<MorningPlan[]>(() => {
    const stored = loadStoredRecords<MorningPlan>('sales_morning_plans');
    const map = new Map<string, MorningPlan>();
    stored.forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });
    return Array.from(map.values());
  });

  const [eveningReports, setEveningReports] = useState<EveningReport[]>(() =>
    loadStoredRecords<EveningReport>('sales_evening_reports')
  );

  const [gpsRecords, setGpsRecords] = useState<GPSRecord[]>(() =>
    loadStoredRecords<GPSRecord>('sales_gps_records')
  );

  const [gpsExcelRecords, setGpsExcelRecords] = useState<GPSExcelRecord[]>(() =>
    loadStoredRecords<GPSExcelRecord>('sales_gps_excel_records')
  );

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    loadStoredRecords<AttendanceRecord>('sales_attendance')
  );

  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadStoredRecords<Customer>('sales_customers')
  );

  const [references, setReferences] = useState<ReferenceRecord[]>(() =>
    loadStoredRecords<ReferenceRecord>('sales_references')
  );

  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>(() =>
    loadStoredRecords<LeaveRecord>('sales_leaves')
  );

  // Admin Broadcast Notice State
  const [activeNotice, setActiveNotice] = useState<AdminNotice | null>(() => {
    try {
      const saved = localStorage.getItem('ppl_admin_broadcast_notice');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isActive) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);

  // Sync notice across browser tabs in real-time
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ppl_admin_broadcast_notice') {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            setActiveNotice(parsed?.isActive ? parsed : null);
            setIsNoticeDismissed(false);
          } else {
            setActiveNotice(null);
          }
        } catch {
          setActiveNotice(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const broadcastNotice = async (notice: { title: string; message: string; priority: 'urgent' | 'important' | 'info' }) => {
    const newNotice: AdminNotice = {
      id: `notice-${Date.now()}`,
      title: notice.title.trim() || 'System Announcement',
      message: notice.message.trim(),
      priority: notice.priority || 'important',
      createdAt: new Date().toISOString(),
      sender: authState.user?.userName || 'Administrator',
      isActive: true
    };
    setActiveNotice(newNotice);
    setIsNoticeDismissed(false);
    localStorage.setItem('ppl_admin_broadcast_notice', JSON.stringify(newNotice));
    showToast('success', 'Notice Broadcasted', 'Notice has been broadcast to all users & live news ticker.');
  };

  const clearNotice = () => {
    setActiveNotice(null);
    localStorage.removeItem('ppl_admin_broadcast_notice');
    showToast('info', 'Notice Cleared', 'Active broadcast notice has been removed.');
  };

  const dismissNotice = () => {
    setIsNoticeDismissed(true);
  };

  // Save to LocalStorage on changes
  useEffect(() => {
    localStorage.setItem('sales_morning_plans', JSON.stringify(morningPlans));
  }, [morningPlans]);

  useEffect(() => {
    localStorage.setItem('sales_evening_reports', JSON.stringify(eveningReports));
  }, [eveningReports]);

  useEffect(() => {
    localStorage.setItem('sales_gps_records', JSON.stringify(gpsRecords));
  }, [gpsRecords]);

  useEffect(() => {
    localStorage.setItem('sales_gps_excel_records', JSON.stringify(gpsExcelRecords));
  }, [gpsExcelRecords]);

  useEffect(() => {
    localStorage.setItem('sales_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('sales_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('sales_references', JSON.stringify(references));
  }, [references]);

  useEffect(() => {
    localStorage.setItem('sales_leaves', JSON.stringify(leaveRecords));
  }, [leaveRecords]);

  // Read saved user on load with strict validation
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (savedUserStr) {
        const savedUser: User = JSON.parse(savedUserStr);
        if (savedUser && typeof savedUser === 'object' && savedUser.id && savedUser.userName && savedUser.role) {
          setAuthState({
            user: savedUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        } else {
          // Corrupted or invalid user state - clear it
          localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        }
      }
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  // Periodic data sync from Google Sheets to keep local state up to date in real-time
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const syncRemoteData = async () => {
      await Promise.all([
        refreshMorningPlans(),
        refreshEveningReports(),
        refreshGPSData(),
        refreshReferences(),
        refreshLeaves()
      ]).catch(err => console.warn('Error in periodic sync:', err));
    };

    // Sync immediately on mount / login
    syncRemoteData();

    // Poll every 10 seconds for fast real-time updates
    const interval = setInterval(syncRemoteData, 10000);
    return () => clearInterval(interval);
  }, [authState.isAuthenticated]);


  const showToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const login = async (id: string, pass: string, rememberMe: boolean): Promise<User> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const user = await loginWithGoogleSheet(id, pass);

      // Save user in LocalStorage as specified in requirements
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      localStorage.setItem('ID', user.id);
      localStorage.setItem('User Name', user.userName);
      localStorage.setItem('Role', user.role);
      localStorage.setItem('Manager', user.manager);
      localStorage.setItem('Profile URL', user.profileUrl);

      if (rememberMe) {
        localStorage.setItem(LOCAL_STORAGE_REMEMBER_KEY, id);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_REMEMBER_KEY);
      }

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      showToast('success', 'Login Successful', `Welcome back, ${user.userName}!`);
      return user;
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid ID or Password.';
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMsg,
      });
      showToast('error', 'Login Failed', errorMsg);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    localStorage.removeItem('ID');
    localStorage.removeItem('User Name');
    localStorage.removeItem('Role');
    localStorage.removeItem('Manager');
    localStorage.removeItem('Profile URL');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    showToast('info', 'Logged Out', 'You have been securely signed out.');
  };

  const addMorningPlan = (plan: MorningPlan) => {
    if (!plan || !plan.id) return;
    setMorningPlans(prev => {
      const index = prev.findIndex(p => p.id === plan.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = { ...copy[index], ...plan };
        return copy;
      }
      return [plan, ...prev];
    });
  };

  const addEveningReport = (report: EveningReport) => {
    setEveningReports(prev => [report, ...prev]);
  };

  const updateMorningPlan = async (plan: MorningPlan) => {
    setMorningPlans(prev => prev.map(p => p.id === plan.id ? plan : p));

    const morningFollowUpArray = [
      plan.id,
      plan.meetingDate || '',
      plan.salesPersonName || '',
      plan.partyName || '',
      plan.address || plan.city || '',
      plan.remarks || plan.purpose || '',
    ];

    const fullRowArray = [
      plan.id, plan.salesPersonId, plan.salesPersonName, plan.meetingDate, plan.partyName,
      plan.contactPerson, plan.mobileNumber, plan.city, plan.purpose, plan.expectedBusiness,
      plan.priority, plan.remarks, plan.status, plan.createdAt, plan.latitude || '', plan.longitude || '',
      plan.address || ''
    ];

    await updateSheetRow('Morning Follow Up', plan.id, morningFollowUpArray);
    await updateSheetRow('MorningPlan', plan.id, fullRowArray);
  };
  const deleteMorningPlan = async (id: string): Promise<boolean> => {
    const previous = morningPlans;
    setMorningPlans(prev => prev.filter(p => p.id !== id));

    // 'Morning Follow Up' is the sheet the app actually reads plans from;
    // 'MorningPlan' is a secondary mirror kept in sync on a best-effort basis.
    const [primarySuccess] = await Promise.all([
      deleteSheetRowById('Morning Follow Up', id),
      deleteSheetRowById('MorningPlan', id),
    ]);

    if (!primarySuccess) {
      setMorningPlans(previous);
    }
    return primarySuccess;
  };
  const updateEveningReport = async (report: EveningReport) => {
    setEveningReports(prev => prev.map(p => p.id === report.id ? report : p));

    const eveningFollowUpArray = [
      report.id,
      report.meetingDate || '',
      report.salesPersonName || '',
      report.partyName || '',
      report.address || '',
      report.client || '',
      report.contactNumber || '',
      report.designation || '',
      report.remarks || report.discussion || '',
      report.followUpDate || '',
      report.attachmentUrls || '',
    ];

    const fullRowArray = [
      report.id,
      report.morningPlanId || '',
      report.salesPersonId || '',
      report.salesPersonName || '',
      report.partyName || '',
      report.visited || 'Yes',
      report.meetingTime || '',
      report.discussion || report.remarks || '',
      report.productsDiscussed || '',
      report.requirement || '',
      report.followUpDate || '',
      report.expectedOrder || 0,
      report.orderProbability || 0,
      report.remarks || '',
      report.status || 'Completed',
      report.submittedAt || '',
      report.photoUrl || '',
      report.latitude || '',
      report.longitude || '',
      report.address || '',
    ];

    await updateSheetRow('Evening Follow Up', report.id, eveningFollowUpArray);
    await updateSheetRow('EveningReport', report.id, fullRowArray);
  };
  const deleteEveningReport = async (id: string): Promise<boolean> => {
    const previous = eveningReports;
    setEveningReports(prev => prev.filter(p => p.id !== id));

    // 'Evening Follow Up' is the sheet the app actually reads reports from.
    const success = await deleteSheetRowById('Evening Follow Up', id);
    if (!success) {
      setEveningReports(previous);
    }
    return success;
  };



  const addGPSRecord = (record: GPSRecord) => {
    setGpsRecords(prev => [record, ...prev]);
  };

  const addGPSExcelRecords = (recs: GPSExcelRecord[]) => {
    setGpsExcelRecords(prev => [...recs, ...prev]);
  };

  const clearGPSExcelRecords = async () => {
    setGpsExcelRecords([]);
    try {
      await clearGPSExcelRowsFromSheet();
    } catch (err) {
      console.error('Error clearing GPS excel records:', err);
    }
  };

  const refreshGPSData = async (): Promise<boolean> => {
    try {
      const { liveRecords, excelRecords } = await fetchGPSDataFromSheet();
      if (liveRecords.length > 0) {
        setGpsRecords(prev => {
          const map = new Map<string, GPSRecord>();
          liveRecords.forEach(r => map.set(r.id, r));
          prev.forEach(r => {
            if (!map.has(r.id)) map.set(r.id, r);
          });
          return Array.from(map.values());
        });
      }
      if (excelRecords.length > 0) {
        setGpsExcelRecords(prev => {
          const map = new Map<string, GPSExcelRecord>();
          excelRecords.forEach(r => map.set(r.id, r));
          prev.forEach(r => {
            if (!map.has(r.id)) map.set(r.id, r);
          });
          return Array.from(map.values());
        });
      }
      return true;
    } catch (err) {
      console.warn('Error refreshing GPS data:', err);
      return false;
    }
  };

  const addAttendanceRecord = (rec: AttendanceRecord) => {
    setAttendanceRecords(prev => [rec, ...prev]);
  };

  const addCustomer = (cust: Customer) => {
    setCustomers(prev => [cust, ...prev]);
  };

  const addReference = (ref: ReferenceRecord) => {
    setReferences(prev => [ref, ...prev]);
  };

  const updateCustomer = async (cust: Customer) => {
    setCustomers(prev => prev.map(p => p.id === cust.id ? cust : p));
    const rowArray = [cust.id, cust.partyName, cust.contactPerson, cust.mobileNumber, cust.city, cust.crmId, cust.totalOrders, cust.lastVisitDate];
    await updateSheetRow('Customer', cust.id, rowArray);
  };
  const deleteCustomer = async (id: string) => {
    setCustomers(prev => prev.filter(p => p.id !== id));
    await deleteSheetRow('Customer', id);
  };
  const updateReference = async (ref: ReferenceRecord) => {
    setReferences(prev => prev.map(p => p.id === ref.id ? ref : p));
    const rowArray = [ref.id, ref.createdAt, ref.refGivenBy, ref.refGivenCompanyName, ref.allottedToSalesPersonName, ref.allottedByWhom, ref.companyName, ref.clientName, ref.designation, ref.clientNumber, ref.address, ref.remarks, ref.nextFollowupDate];
    await updateSheetRow('Reference', ref.id, rowArray);
  };
  const deleteReference = async (id: string): Promise<boolean> => {
    const previous = references;
    setReferences(prev => prev.filter(p => p.id !== id));

    // The actual sheet tab is named 'Refrences' (matches fetchReferencesFromSheet/submitReferenceToSheet).
    const success = await deleteSheetRowById('Refrences', id);
    if (!success) {
      setReferences(previous);
    }
    return success;
  };
  const updateAttendanceRecord = async (rec: AttendanceRecord) => {
    setAttendanceRecords(prev => prev.map(p => p.id === rec.id ? rec : p));
    const rowArray = [rec.id, rec.salesPersonId, rec.salesPersonName, rec.date, rec.punchInTime, rec.punchOutTime, rec.punchInLocation, rec.punchOutLocation, rec.status];
    await updateSheetRow('Attendance', rec.id, rowArray);
  };
  const deleteAttendanceRecord = async (id: string) => {
    setAttendanceRecords(prev => prev.filter(p => p.id !== id));
    await deleteSheetRow('Attendance', id);
  };


  const refreshMorningPlans = async () => {
    try {
      const remotePlans = await fetchMorningPlansFromSheet();
      if (remotePlans) {
        setMorningPlans(remotePlans);
      }
    } catch (err) {
      console.warn('Error refreshing morning plans:', err);
    }
  };

  const refreshEveningReports = async () => {
    try {
      const remoteReports = await fetchEveningReportsFromSheet();
      if (remoteReports) {
        setEveningReports(remoteReports);
      }
    } catch (err) {
      console.warn('Error refreshing evening reports:', err);
    }
  };

  const refreshReferences = async () => {
    try {
      const remoteRefs = await fetchReferencesFromSheet();
      if (remoteRefs) {
        setReferences(remoteRefs);
      }
    } catch (err) {
      console.warn('Error fetching references from sheet:', err);
    }
  };

  const refreshLeaves = async () => {
    try {
      const remoteLeaves = await fetchLeavesFromSheet();
      if (remoteLeaves) {
        setLeaveRecords(remoteLeaves);
      }
    } catch (err) {
      console.warn('Error fetching leave records from sheet:', err);
    }
  };

  const captureGPSLocation = async (actionSource = 'Manual Check-in'): Promise<GPSRecord | null> => {
    if (!authState.user) return null;

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        showToast('warning', 'GPS Unavailable', 'Geolocation is not supported by your browser.');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const dateStr = new Date().toISOString().split('T')[0];
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const rec: GPSRecord = {
            id: 'GPS-' + Date.now(),
            salesPersonId: authState.user!.id,
            salesPersonName: authState.user!.userName,
            latitude,
            longitude,
            address: `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)} (Captured)`,
            date: dateStr,
            time: timeStr,
            accuracy: Math.round(accuracy),
            actionSource,
          };

          addGPSRecord(rec);
          await saveGPSToSheet(rec);
          showToast('success', 'GPS Location Captured', `Lat ${latitude.toFixed(4)}, Long ${longitude.toFixed(4)} logged.`);
          resolve(rec);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          showToast('warning', 'GPS Location Notice', 'Could not get high-accuracy position. Defaulting to last known area.');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const updateUserProfilePic = async (newProfileUrl: string) => {
    if (!authState.user) return;
    const updatedUser = { ...authState.user, profileUrl: newProfileUrl };
    setAuthState(prev => ({ ...prev, user: updatedUser }));
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updatedUser));
    localStorage.setItem('Profile URL', newProfileUrl);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('users')
          .update({ profile_url: newProfileUrl })
          .eq('id', authState.user.id);
      } catch (err) {
        console.warn('Could not update profile in Supabase:', err);
      }
    }
  };

  const updateUserProfileDetails = async (updates: Partial<User>): Promise<boolean> => {
    if (!authState.user) return false;
    const success = await updateUserInSheet(authState.user.id, updates);
    if (success) {
      const updatedUser = { ...authState.user, ...updates };
      setAuthState(prev => ({ ...prev, user: updatedUser }));
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updatedUser));
    }
    return success;
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        login,
        logout,
        toasts,
        showToast,
        removeToast,
        themeMode,
        toggleTheme,
        activeNotice,
        broadcastNotice,
        clearNotice,
        dismissNotice,
        isNoticeDismissed,
        morningPlans,
        addMorningPlan,
        eveningReports,
        addEveningReport,
        gpsRecords,
        addGPSRecord,
        gpsExcelRecords,
        addGPSExcelRecords,
        clearGPSExcelRecords,
        refreshGPSData,
        captureGPSLocation,
        attendanceRecords,
        addAttendanceRecord,
        customers,
        addCustomer,
        references,
        addReference,
        refreshReferences,
        leaveRecords,
        refreshLeaves,
        refreshMorningPlans,
        refreshEveningReports,
        updateMorningPlan,
        deleteMorningPlan,
        updateEveningReport,
        deleteEveningReport,
        updateCustomer,
        deleteCustomer,
        updateReference,
        deleteReference,
        updateAttendanceRecord,
        deleteAttendanceRecord,
        updateUserProfilePic,
        updateUserProfileDetails,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
