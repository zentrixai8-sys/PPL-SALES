import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAllUsersFromSheet,
  registerUserInSheet,
  updateUserInSheet,
  deleteUserFromSheet,
} from '../../services/api';
import { User } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Briefcase,
  Mail,
  Lock,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  UserCheck,
  Sparkles,
  Key,
  Building,
  Phone,
  RefreshCw,
  Eye,
  EyeOff,
  Hash,
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const UserManagementModule: React.FC = () => {
  const { authState, showToast } = useAuth();
  const currentLoggedInUser = authState.user;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Admin' | 'Sales' | 'Manager'>('All');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    id: '',
    userName: '',
    password: '',
    role: 'Sales' as 'Admin' | 'Sales' | 'Manager',
    gmail: '',
    manager: 'Rajesh Sharma',
    crm: 'CRM-1001',
    profileUrl: '',
  });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllUsersFromSheet();
      setUsers(data);
    } catch (err: any) {
      showToast('error', 'Fetch Failed', err.message || 'Could not load users list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // List of all Manager & Admin users for Reporting Manager dropdown
  const managerOptions = React.useMemo(() => {
    const list = users.filter(u => u.role === 'Manager' || u.role === 'Admin');
    if (list.length === 0) {
      return [
        { id: 'MGR101', userName: 'Rajesh Sharma', role: 'Manager' as const },
        { id: 'MGR102', userName: 'Deepak Sahu', role: 'Manager' as const },
        { id: 'ADM001', userName: 'Administrator', role: 'Admin' as const },
      ];
    }
    return list;
  }, [users]);

  const openCreateModal = () => {
    // Generate an automatic sequential ID suggestion
    const nextEmpNum = users.length > 0 ? 100 + users.length + 1 : 101;
    const defaultManager = managerOptions[0]?.userName || 'Rajesh Sharma';
    setFormData({
      id: `EMP${nextEmpNum}`,
      userName: '',
      password: '',
      role: 'Sales',
      gmail: '',
      manager: defaultManager,
      crm: `CRM-${nextEmpNum}`,
      profileUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`,
    });
    setEditingUser(null);
    setShowCreateModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormData({
      id: u.id,
      userName: u.userName,
      password: '', // leave empty unless changing
      role: u.role,
      gmail: u.gmail || '',
      manager: u.manager || managerOptions[0]?.userName || 'Rajesh Sharma',
      crm: u.crm || 'CRM-1001',
      profileUrl: u.profileUrl || '',
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id.trim() || !formData.userName.trim()) {
      showToast('error', 'Missing Fields', 'Please fill in User ID and Full Name.');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      showToast('error', 'Password Required', 'Please set an initial login password for the new user.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Update existing user
        const updatePayload: any = {
          userName: formData.userName.trim(),
          role: formData.role,
          gmail: formData.gmail.trim() || undefined,
          manager: formData.manager.trim() || undefined,
          crm: formData.crm.trim() || undefined,
          profileUrl: formData.profileUrl.trim() || undefined,
        };
        if (formData.password.trim()) {
          updatePayload.password = formData.password.trim();
        }

        const ok = await updateUserInSheet(editingUser.id, updatePayload);
        if (ok) {
          showToast('success', 'User Updated', `${formData.userName} details saved successfully.`);
          setShowCreateModal(false);
          await loadUsers();
        } else {
          showToast('error', 'Update Error', 'Could not update user record.');
        }
      } else {
        // Create new user
        const ok = await registerUserInSheet({
          id: formData.id.trim(),
          userName: formData.userName.trim(),
          password: formData.password.trim(),
          role: formData.role,
          gmail: formData.gmail.trim() || undefined,
          manager: formData.manager.trim() || undefined,
          crm: formData.crm.trim() || undefined,
          profileUrl: formData.profileUrl.trim() || undefined,
        });

        if (ok) {
          showToast('success', 'User Created', `Employee ID ${formData.id} successfully registered in Supabase.`);
          setShowCreateModal(false);
          await loadUsers();
        } else {
          showToast('error', 'Create Error', 'User ID might already exist or Supabase write failed.');
        }
      }
    } catch (err: any) {
      showToast('error', 'Operation Failed', err.message || 'Error saving user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentLoggedInUser?.id) {
      showToast('error', 'Action Denied', 'You cannot delete your own active administrator account.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await deleteUserFromSheet(id);
      if (ok) {
        showToast('success', 'User Deleted', `User ID ${id} removed from database.`);
        setDeletingUserId(null);
        await loadUsers();
      } else {
        showToast('error', 'Delete Failed', 'Could not delete user record.');
      }
    } catch (err: any) {
      showToast('error', 'Delete Error', err.message || 'Failed to remove user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.gmail && u.gmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.manager && u.manager.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'All' ? true : u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const salesCount = users.filter((u) => u.role === 'Sales').length;
  const managerCount = users.filter((u) => u.role === 'Manager').length;
  const adminCount = users.filter((u) => u.role === 'Admin').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header with Gradient Backdrop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 dark:from-blue-950/50 dark:via-slate-900 dark:to-indigo-950/40 p-4 sm:p-5 rounded-3xl border border-blue-200/80 dark:border-blue-800/60 shadow-sm relative overflow-hidden">
        {/* Soft gradient glow accents */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-gradient-to-tr from-purple-500/15 to-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 shrink-0 ring-1 ring-white/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-sky-300 border border-blue-300/60 dark:border-blue-700/60 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-blue-600 dark:text-sky-400" />
                <span>SUPABASE AUTH &amp; ACCESS CONTROL</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              User &amp; Employee Management
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Create and manage sales force IDs, credentials, and roles directly in Supabase
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 self-end sm:self-center">
          <button
            type="button"
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2.5 rounded-2xl border border-blue-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50/80 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-xs"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={openCreateModal}
            className="py-2.5 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New ID</span>
          </motion.button>
        </div>
      </div>

      {/* Compact Metrics Row with Gradient Styling */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Accounts */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-white to-indigo-500/5 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/20 p-3.5 sm:p-4 rounded-3xl border border-blue-200/80 dark:border-blue-800/50 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Total Accounts
            </p>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalUsers}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              All registered staff IDs
            </p>
          </div>
        </div>

        {/* Sales Executives */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/5 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/20 p-3.5 sm:p-4 rounded-3xl border border-emerald-200/80 dark:border-emerald-800/50 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Sales Executives
            </p>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {salesCount}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              Active field officers
            </p>
          </div>
        </div>

        {/* Area Managers */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-white to-orange-500/5 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/20 p-3.5 sm:p-4 rounded-3xl border border-amber-200/80 dark:border-amber-800/50 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Area Managers
            </p>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {managerCount}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              Team &amp; territory leads
            </p>
          </div>
        </div>

        {/* Administrators */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-white to-pink-500/5 dark:from-purple-950/40 dark:via-slate-900 dark:to-pink-950/20 p-3.5 sm:p-4 rounded-3xl border border-purple-200/80 dark:border-purple-800/50 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Administrators
            </p>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
              {adminCount}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              Full control accounts
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, employee ID, email, manager..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['All', 'Sales', 'Admin', 'Manager'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                roleFilter === r
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table & Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Fetching accounts from Supabase...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-white">No Users Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              No employee matches your current search criteria. Click &quot;Create New ID&quot; to add a member.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Employee</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Contact &amp; Email</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Reporting Manager</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">CRM Code</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs sm:text-sm">
                {filteredUsers.map((u) => {
                  const isCurrentAdmin = u.id === currentLoggedInUser?.id;
                  const isSales = u.role === 'Sales';
                  const isAdmin = u.role === 'Admin';

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              u.profileUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
                            }
                            alt={u.userName}
                            className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.userName}</span>
                              {isCurrentAdmin && (
                                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] rounded-md font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              ID: {u.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase ${
                            isAdmin
                              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800'
                              : isSales
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800'
                              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800'
                          }`}
                        >
                          {isAdmin ? <Shield className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                          <span>{u.role}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-600 dark:text-slate-300">
                        {u.gmail ? (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{u.gmail}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No email set</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 hidden sm:table-cell text-slate-600 dark:text-slate-300 font-medium">
                        {u.manager || 'Head Office'}
                      </td>

                      <td className="py-3.5 px-4 hidden lg:table-cell font-mono text-slate-500 dark:text-slate-400 text-xs">
                        {u.crm || 'CRM-1001'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all cursor-pointer"
                            title="Edit User Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {!isCurrentAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeletingUserId(u.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: CREATE / EDIT USER ================= */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 max-w-xl w-full text-slate-900 dark:text-white shadow-2xl border border-slate-200/90 dark:border-slate-800 relative my-6"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-start gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                  {editingUser ? <Edit2 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                </div>
                <div className="min-w-0 pr-8">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 border border-blue-200/60 dark:border-blue-800/60">
                      {editingUser ? 'Credential Editor' : 'New Staff Setup'}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                    {editingUser ? 'Edit User Credentials' : 'Create New Employee ID'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {editingUser
                      ? `Modifying login profile and access for ${editingUser.id}`
                      : 'Assign a unique employee login ID, system role, and reporting manager'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* 1. Identity & Credentials Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Employee ID */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Employee ID / Login ID <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.id}
                        onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                        disabled={!!editingUser || isSubmitting}
                        placeholder="e.g. EMP107"
                        required
                        className="w-full pl-9.5 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-mono font-black focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.userName}
                        onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                        disabled={isSubmitting}
                        placeholder="e.g. Rahul Sharma"
                        required
                        className="w-full pl-9.5 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>
                      {editingUser ? 'New Password' : 'Login Password'} <span className="text-rose-500">{!editingUser && '*'}</span>
                    </span>
                    {editingUser && (
                      <span className="text-[10px] text-slate-400 font-normal">Leave blank to keep unchanged</span>
                    )}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={isSubmitting}
                      placeholder={editingUser ? '•••••••• (unchanged)' : 'Enter strong password (e.g. 123456)'}
                      required={!editingUser}
                      className="w-full pl-9.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    System Role &amp; Permission Level <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { role: 'Sales' as const, label: 'Sales', desc: 'Field Officer', icon: Briefcase },
                      { role: 'Admin' as const, label: 'Admin', desc: 'Full System', icon: Shield },
                      { role: 'Manager' as const, label: 'Manager', desc: 'Team Lead', icon: UserCheck },
                    ].map(({ role: r, label, desc, icon: IconComponent }) => {
                      const isSelected = formData.role === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormData({ ...formData, role: r })}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-500/30'
                              : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <IconComponent className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-xs font-black">{label}</p>
                            <p className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                              {desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Email & Reporting Manager */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={formData.gmail}
                        onChange={(e) => setFormData({ ...formData, gmail: e.target.value })}
                        disabled={isSubmitting}
                        placeholder="e.g. user@popularpaints.com"
                        className="w-full pl-9.5 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* Reporting Manager */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Reporting Manager</span>
                      <span className="text-[10px] text-blue-600 dark:text-sky-400 font-bold lowercase">from managers</span>
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={formData.manager}
                        onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                        disabled={isSubmitting}
                        className="w-full pl-9.5 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 cursor-pointer appearance-none"
                      >
                        <option value="">-- Select Reporting Manager --</option>
                        {managerOptions.map((mgr) => (
                          <option key={mgr.id + mgr.userName} value={mgr.userName}>
                            {mgr.userName} ({mgr.id} · {mgr.role})
                          </option>
                        ))}
                        {formData.manager && !managerOptions.some(m => m.userName.toLowerCase() === formData.manager.toLowerCase()) && (
                          <option value={formData.manager}>{formData.manager} (Current / Custom)</option>
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Modal Footer / Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isSubmitting}
                    className="py-2.5 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{editingUser ? 'Save Changes' : 'Create User ID'}</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      <AnimatePresence>
        {deletingUserId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-slate-900 dark:text-white shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-black text-center mb-1">Delete User Account?</h3>
              <p className="text-xs text-slate-500 text-center leading-relaxed mb-6">
                Are you sure you want to permanently remove employee ID <strong className="text-slate-800 dark:text-white font-mono">{deletingUserId}</strong> from Supabase database?
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingUserId(null)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteUser(deletingUserId)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm Delete</span>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
