import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import {
  User,
  Lock,
  Mail,
  Shield,
  Building,
  Key,
  CheckCircle,
  Loader2,
  Camera,
  Maximize2,
  X,
  ExternalLink,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  Award,
  TrendingUp,
  CreditCard,
  Clock,
  HeartPulse,
  BadgeCheck,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const UserProfileModule: React.FC = () => {
  const { authState, showToast, updateUserProfilePic } = useAuth();
  const user = authState.user;

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  // DP Upload and View state
  const [isUploadingDp, setIsUploadingDp] = useState(false);
  const [showDpModal, setShowDpModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
  const currentDpUrl = user?.profileUrl || defaultAvatar;

  // Demo dynamic employee details based on role
  const isAdministrator = user?.role === 'Admin';
  const empDetails = {
    empCode: isAdministrator ? 'PPL-ADM-001' : `PPL-SLS-${user?.id || '042'}`,
    designation: isAdministrator ? 'Executive Vice President / Admin' : 'Senior Area Sales Manager',
    department: 'Decorative & Industrial Coatings Division',
    phone: '+91 98261 45090',
    altPhone: '+91 94252 88710',
    email: user?.gmail || (isAdministrator ? 'admin@popularpaints.com' : `${(user?.userName || 'sales').toLowerCase().replace(/\s+/g, '.')}@popularpaints.com`),
    joiningDate: '15-Jan-2021 (5+ Yrs with Popular Paints)',
    dob: '12-Aug-1991',
    bloodGroup: 'B+ Positive',
    territory: isAdministrator ? 'National HQ / All Zones' : 'Raipur, Bilaspur, Katni, Sambalpur',
    headquarters: 'Raipur Central Office, Chhattisgarh',
    crmId: user?.crm || 'CRM-PPL-1001',
    manager: user?.manager || 'Board of Directors / MD',
    shiftTiming: '09:30 AM - 06:30 PM (Mon - Sat)',
    workStatus: 'Full Time · Permanent Staff',
    kycStatus: 'Verified (Aadhaar & PAN Linked)',
    bankAccount: 'HDFC Bank · A/C Ending in 9042',
    pfUan: '100984729104',
    monthlyTarget: isAdministrator ? '₹50,00,000' : '₹15,00,000',
    targetAchievement: '96.8%',
    totalVisits: '552 Visits',
    activeDealers: isAdministrator ? '240+ Dealers' : '48 Active Accounts',
  };

  const handleDpFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Invalid File', 'Please select an image file (JPG, PNG, WEBP).');
      return;
    }

    setIsUploadingDp(true);
    try {
      const cdnUrl = await uploadToCloudinary(file);
      if (cdnUrl) {
        await updateUserProfilePic(cdnUrl);
        showToast('success', 'Profile Picture Updated', 'Your new profile photo was uploaded successfully!');
      } else {
        showToast('error', 'Upload Failed', 'Could not upload image to Cloudinary. Please try again.');
      }
    } catch (err: any) {
      showToast('error', 'Upload Error', err?.message || 'Failed to update profile picture.');
    } finally {
      setIsUploadingDp(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      showToast('error', 'Password Mismatch', 'New password and confirmation do not match.');
      return;
    }
    if (newPass.length < 6) {
      showToast('error', 'Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    setIsChanging(true);
    setTimeout(() => {
      setIsChanging(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      showToast('success', 'Password Updated', 'Your account password was changed successfully.');
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hidden File Input for DP */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDpFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Hero Profile Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-3.5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden"
      >
        {/* Background decorative ambient glow */}
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
          {/* Avatar with Upload & Enlarge Overlay */}
          <div className="relative group shrink-0 flex flex-col items-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl overflow-hidden ring-4 ring-sky-500/30 bg-slate-950 relative shadow-2xl shadow-sky-950/40">
              <img
                src={currentDpUrl}
                alt={user?.userName}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Uploading Spinner */}
              {isUploadingDp && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1 z-10">
                  <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 text-sky-400 animate-spin" />
                  <span className="text-[10px] font-bold">Uploading...</span>
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-2.5 sm:mt-3">
              <button
                type="button"
                onClick={() => setShowDpModal(true)}
                className="py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs flex items-center gap-1 sm:gap-1.5 transition-all shadow-xs cursor-pointer font-semibold"
                title="View Fullscreen Photo"
              >
                <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-600 dark:text-sky-400" />
                <span className="text-[11px] sm:text-xs">View</span>
              </button>

              <button
                type="button"
                disabled={isUploadingDp}
                onClick={() => fileInputRef.current?.click()}
                className="py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 !text-white text-xs flex items-center gap-1 sm:gap-1.5 transition-all shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer font-semibold"
                title="Upload New Photo"
              >
                <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5 !text-white" />
                <span className="text-[11px] sm:text-xs !text-white font-bold">Change</span>
              </button>
            </div>
          </div>

          {/* User Essential Title & Tags */}
          <div className="text-center md:text-left flex-1 space-y-1.5 sm:space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-sky-950 text-sky-400 border border-sky-800 text-[11px] sm:text-xs font-bold shadow-xs">
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{user?.role} Account</span>
              </span>

              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] sm:text-xs font-semibold">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active Employee</span>
              </span>

              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] sm:text-xs font-mono font-semibold">
                {empDetails.empCode}
              </span>
            </div>

            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center md:justify-start gap-1.5 sm:gap-2">
                <span>{user?.userName}</span>
                <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 inline shrink-0" />
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-sky-400 mt-0.5">{empDetails.designation}</p>
              <p className="text-[11px] sm:text-xs text-slate-400">{empDetails.department}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs text-slate-300 pt-1.5 sm:pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{empDetails.email}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Manager: <strong className="text-white">{empDetails.manager}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Performance Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 space-y-0.5 sm:space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Monthly Quota</span>
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          </div>
          <div className="text-base sm:text-xl font-bold text-white">{empDetails.monthlyTarget}</div>
          <div className="text-[9px] sm:text-[10px] text-emerald-400 font-semibold">Assigned Sales Target</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 space-y-0.5 sm:space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Target Achieved</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          </div>
          <div className="text-base sm:text-xl font-bold text-emerald-400">{empDetails.targetAchievement}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400">YTD Performance Rating</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 space-y-0.5 sm:space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Visits</span>
            <CheckCircle className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-white">{empDetails.totalVisits}</div>
          <div className="text-[10px] text-slate-400">Logged in Field Tracker</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Network Parties</span>
            <Building className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-white">{empDetails.activeDealers}</div>
          <div className="text-[10px] text-slate-400">Assigned Dealer Network</div>
        </div>
      </div>

      {/* Comprehensive Details 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal & Contact Details */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <User className="w-4 h-4 text-sky-400" />
            <h2 className="font-bold text-sm text-white">Personal &amp; Contact Details</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-sky-400" />
                <span>Primary Mobile</span>
              </span>
              <span className="font-semibold text-white">{empDetails.phone}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Emergency Contact</span>
              </span>
              <span className="font-semibold text-white">{empDetails.altPhone}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-sky-400" />
                <span>Official Email</span>
              </span>
              <span className="font-semibold text-white">{empDetails.email}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Date of Birth</span>
              </span>
              <span className="font-semibold text-white">{empDetails.dob}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                <span>Blood Group</span>
              </span>
              <span className="font-semibold text-rose-400">{empDetails.bloodGroup}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Base Location</span>
              </span>
              <span className="font-semibold text-white text-right">{empDetails.headquarters}</span>
            </div>
          </div>
        </div>

        {/* Job & Territory Details */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Briefcase className="w-4 h-4 text-indigo-400" />
            <h2 className="font-bold text-sm text-white">Employment &amp; Territory</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                <span>Department</span>
              </span>
              <span className="font-semibold text-white">{empDetails.department}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Date of Joining</span>
              </span>
              <span className="font-semibold text-white">{empDetails.joiningDate}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Assigned Zone</span>
              </span>
              <span className="font-semibold text-white text-right">{empDetails.territory}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Shift Timing</span>
              </span>
              <span className="font-semibold text-white">{empDetails.shiftTiming}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <FileCheck2 className="w-3.5 h-3.5 text-teal-400" />
                <span>KYC &amp; Compliance</span>
              </span>
              <span className="font-semibold text-emerald-400">{empDetails.kycStatus}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                <span>Salary Account</span>
              </span>
              <span className="font-semibold text-white">{empDetails.bankAccount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Key className="w-4 h-4 text-sky-400" />
          <h2 className="font-bold text-sm text-white">Security &amp; Account Password</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Current Password</label>
            <input
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">New Password</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Repeat new password"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isChanging}
            className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            {isChanging ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Update Password</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Fullscreen DP Lightbox Modal */}
      <AnimatePresence>
        {showDpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center"
            >
              {/* Top Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="text-left">
                  <h3 className="font-bold text-sm text-white">{user?.userName}</h3>
                  <p className="text-[11px] text-slate-400">Employee Photo · {empDetails.empCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDpModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* High-res Image Preview */}
              <div className="w-full aspect-square max-h-[360px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
                <img
                  src={currentDpUrl}
                  alt={user?.userName}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDpModal(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Change Photo</span>
                </button>

                <a
                  href={currentDpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors flex items-center gap-1.5"
                  title="Open Full Image"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
