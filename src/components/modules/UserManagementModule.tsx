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

  const openCreateModal = () => {
    // Generate an automatic sequential ID suggestion
    const nextEmpNum = users.length > 0 ? 100 + users.length + 1 : 101;
    setFormData({
      id: `EMP${nextEmpNum}`,
      userName: '',
      password: '',
      role: 'Sales',
      gmail: '',
      manager: 'Rajesh Sharma',
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
      manager: u.manager || 'Rajesh Sharma',
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
  const adminCount = users.filter((u) => u.role === 'Admin').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              User &amp; Employee Management
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Create and manage sales force IDs, credentials, and roles directly in Supabase
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10">
          <button
            type="button"
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={openCreateModal}
            className="py-2.5 px-5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New ID</span>
          </motion.button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
            {totalUsers}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Accounts
            </p>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {totalUsers} Registered
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
            {salesCount}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sales Executives
            </p>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {salesCount} Field Reps
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
            {adminCount}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Administrators
            </p>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {adminCount} Master Admins
            </h3>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 max-w-lg w-full text-slate-900 dark:text-white shadow-2xl border border-slate-200 dark:border-slate-800 relative my-8"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black">
                    {editingUser ? 'Edit User Credentials' : 'Create New Employee ID'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingUser
                      ? `Modifying credentials for ${editingUser.id}`
                      : 'Assign a new login ID and role for field or admin staff'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* User ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                      Employee ID / Login ID *
                    </label>
                    <input
                      type="text"
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                      disabled={!!editingUser || isSubmitting}
                      placeholder="e.g. EMP107 or ADM02"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-mono font-bold focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.userName}
                      onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                      disabled={isSubmitting}
                      placeholder="e.g. Rahul Sharma"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                    {editingUser ? 'New Password (Leave blank to keep unchanged)' : 'Login Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={isSubmitting}
                      placeholder={editingUser ? '•••••••• (unchanged)' : 'Enter strong password (e.g. 123456)'}
                      required={!editingUser}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                    System Role *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Sales', 'Admin', 'Manager'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: r })}
                        className={`py-2 px-3 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer text-center ${
                          formData.role === r
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email & Manager */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.gmail}
                      onChange={(e) => setFormData({ ...formData, gmail: e.target.value })}
                      disabled={isSubmitting}
                      placeholder="e.g. user@popularpaints.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                      Reporting Manager
                    </label>
                    <input
                      type="text"
                      value={formData.manager}
                      onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                      disabled={isSubmitting}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isSubmitting}
                    className="py-2.5 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
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
