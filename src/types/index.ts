export type UserRole = 'Admin' | 'Sales' | 'Manager';

export interface User {
  id: string;
  password?: string;
  userName: string;
  role: UserRole;
  gmail: string;
  manager: string;
  crm: string;
  profileUrl: string;
  designation?: string;
  department?: string;
  phone?: string;
  altPhone?: string;
  joiningDate?: string;
  dob?: string;
  bloodGroup?: string;
  territory?: string;
  headquarters?: string;
  shiftTiming?: string;
  workStatus?: string;
  kycStatus?: string;
  bankAccount?: string;
  pfUan?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface MorningPlan {
  id: string;
  salesPersonId: string;
  salesPersonName: string;
  meetingDate: string;
  partyName: string;
  contactPerson: string;
  mobileNumber: string;
  city: string;
  purpose: string;
  expectedBusiness: number;
  priority: 'High' | 'Medium' | 'Low';
  remarks: string;
  status: 'Pending' | 'Submitted' | 'Completed';
  createdAt: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface EveningReport {
  id: string;
  morningPlanId?: string;
  salesPersonId: string;
  salesPersonName: string;
  meetingDate?: string;
  partyName: string;
  address?: string;
  client?: string;
  contactNumber?: string;
  email?: string;
  designation?: string;
  visited: 'Yes' | 'No';
  meetingTime?: string;
  discussion?: string;
  productsDiscussed?: string;
  requirement?: string;
  followUpDate: string;
  expectedOrder?: number;
  orderProbability?: number; // percentage
  remarks: string;
  photoUrl?: string;
  attachmentUrls?: string;
  latitude?: number;
  longitude?: number;
  status: 'Completed' | 'Pending';
  submittedAt: string;
}

export interface GPSRecord {
  id: string;
  salesPersonId: string;
  salesPersonName: string;
  latitude: number;
  longitude: number;
  address: string;
  date: string;
  time: string;
  accuracy: number;
  actionSource?: string; // e.g. "Morning Plan", "Evening Report", "Manual Check-in"
}

export interface GPSExcelRecord {
  id?: string;
  transporterName: string;
  recipientCustomerName: string;
  vehicleNumber: string;
  resourceName: string;
  deviceNumber: string;
  resultDate: string;
  address: string;
  latitude: string | number;
  longitude: string | number;
  accuracy: string | number;
  distance: string | number;
  status: string;
  type: string;
  uploadedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  salesPersonId: string;
  salesPersonName: string;
  date: string;
  punchInTime: string;
  punchOutTime?: string;
  punchInLocation?: string;
  punchOutLocation?: string;
  punchInAddress?: string;
  punchOutAddress?: string;
  punchInPhotoUrl?: string;
  punchOutPhotoUrl?: string;
  odometerReading?: string | number;
  status: 'Present' | 'Late' | 'Half Day' | 'Absent';
}

export interface Customer {
  id: string;
  partyName: string;
  contactPerson: string;
  mobileNumber: string;
  city: string;
  crmId: string;
  totalOrders: number;
  lastVisitDate: string;
}

export interface TargetRecord {
  id: string;
  timestamp: string;
  month: string;
  salesPersonName: string;
  totalNewOrders: number;
  amount: number;
  remark: string;
}

export interface CRMOrderRecord {
  salesPersonName: string;
  orderActualDate: string;
  orderStatus: string;
}

export interface ReferenceRecord {
  id: string;
  refGivenBy: string;
  refGivenCompanyName: string;
  allottedToSalesPersonName: string;
  allottedByWhom: string;
  companyName: string;
  clientName: string;
  designation: string;
  clientNumber: string;
  address: string;
  remarks: string;
  nextFollowupDate: string;
  createdAt?: string;
}

export interface LeaveRecord {
  id: string;
  timestamp: string;
  lrNumber: string;
  requestedBy: string;
  department: string;
  totalLeaveDays: number;
  jobLocation: string;
  dateFrom: string;
  dateTo: string;
  reason: string;
  remark: string;
  imageUrl: string;
  approvedBy?: string;
  status?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export interface ReportFilter {
  startDate: string;
  endDate: string;
  salesPersonId: string;
  managerName: string;
  city: string;
  status: string;
  product: string;
}

export interface AdminNotice {
  id: string;
  title: string;
  message: string;
  priority: 'urgent' | 'important' | 'info';
  createdAt: string;
  sender: string;
  isActive: boolean;
}

export type GrievanceCategory =
  | 'Product Quality'
  | 'Packaging / Damage'
  | 'Delivery Delay'
  | 'Billing / Scheme Mismatch'
  | 'Shade / Color Variation'
  | 'Material Replacement'
  | 'Other';

export type GrievancePriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type GrievanceStatus = 'Open' | 'In Review' | 'Closed';

export interface GrievanceTicket {
  id: string;
  ticketNumber: string;
  salesPersonId: string;
  salesPersonName: string;
  customerName: string;
  contactPerson?: string;
  contactNumber: string;
  city?: string;
  category: GrievanceCategory;
  priority: GrievancePriority;
  description: string;
  images: string[];
  status: GrievanceStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedById?: string;
  resolutionRemarks?: string;
  resolutionImages?: string[];
  actionTaken?: string;
}


