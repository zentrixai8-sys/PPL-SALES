import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ReferenceRecord } from '../../types';
import { submitReferenceToSheet, fetchSalesPersonsFromLoginSheet } from '../../services/api';
import { getIndianDateString, convertInputDateToDDMMYYYY, convertDDMMYYYYToInputDate } from '../../utils/dateUtils';
import {
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Plus,
  X,
  Phone,
  Building2,
  Calendar,
  UserCheck,
  FileSpreadsheet,
  MapPin,
  MessageSquare,
  Briefcase,
  Download,
  Loader2,
  CheckCircle2,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ReferencesModule: React.FC = () => {
  const { authState, references, addReference, updateReference, deleteReference, refreshReferences, showToast } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSalesPerson, setSelectedSalesPerson] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [salesPersonList, setSalesPersonList] = useState<string[]>([]);

  // Form states matching the 11 header fields
  const [refGivenBy, setRefGivenBy] = useState('');
  const [refGivenCompanyName, setRefGivenCompanyName] = useState('');
  const [allottedToSalesPersonName, setAllottedToSalesPersonName] = useState('');
  const [allottedByWhom, setAllottedByWhom] = useState(authState.user?.userName || '');
  const [companyName, setCompanyName] = useState('');
  const [clientName, setClientName] = useState('');
  const [designation, setDesignation] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState(getIndianDateString());

  // Load sales person names for dropdown
  useEffect(() => {
    fetchSalesPersonsFromLoginSheet().then(names => {
      if (names && names.length > 0) {
        setSalesPersonList(names);
        if (!allottedToSalesPersonName) {
          setAllottedToSalesPersonName(names[0]);
        }
      }
    });
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshReferences();
    setIsRefreshing(false);
    showToast('success', 'References Refreshed', 'Latest reference records loaded.');
  };

  const handleOpenModal = () => {
    setRefGivenBy('');
    setRefGivenCompanyName('');
    setAllottedToSalesPersonName(salesPersonList[0] || authState.user?.userName || '');
    setAllottedByWhom(authState.user?.userName || 'Admin');
    setCompanyName('');
    setClientName('');
    setDesignation('');
    setClientNumber('');
    setAddress('');
    setRemarks('');
    setNextFollowupDate(getIndianDateString());
    setShowModal(true);
  };

  const openEditModal = (ref: ReferenceRecord) => {
    setEditingId(ref.id || null);
    setRefGivenBy(ref.refGivenBy || '');
    setRefGivenCompanyName(ref.refGivenCompanyName || '');
    setAllottedToSalesPersonName(ref.allottedToSalesPersonName || '');
    setAllottedByWhom(ref.allottedByWhom || '');
    setCompanyName(ref.companyName || '');
    setClientName(ref.clientName || '');
    setDesignation(ref.designation || '');
    setClientNumber(ref.clientNumber || '');
    setAddress(ref.address || '');
    setRemarks(ref.remarks || '');
    setNextFollowupDate(ref.nextFollowupDate || getIndianDateString());
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete reference for ${name}?`)) return;
    const success = await deleteReference(id);
    if (!success) {
      showToast('error', 'Delete Failed', 'Could not delete the reference from the sheet. Please try again.');
      return;
    }
    showToast('info', 'Reference Deleted', `Reference for ${name} removed.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim() || !clientName.trim()) {
      showToast('warning', 'Validation Error', 'Please enter Company Name and Client Name.');
      return;
    }

    setIsSubmitting(true);

    const refPayload: Omit<ReferenceRecord, 'id'> = {
      refGivenBy: refGivenBy.trim(),
      refGivenCompanyName: refGivenCompanyName.trim(),
      allottedToSalesPersonName: allottedToSalesPersonName.trim(),
      allottedByWhom: allottedByWhom.trim(),
      companyName: companyName.trim(),
      clientName: clientName.trim(),
      designation: designation.trim(),
      clientNumber: clientNumber.trim(),
      address: address.trim(),
      remarks: remarks.trim(),
      nextFollowupDate: nextFollowupDate.trim(),
    };

    try {
      if (editingId) {
        updateReference({ ...refPayload, id: editingId });
        showToast('success', 'Reference Updated', `Reference for ${clientName} (${companyName}) updated.`);
        setShowModal(false);
        setEditingId(null);
      } else {
        const createdRef = await submitReferenceToSheet(refPayload);
        addReference(createdRef);
        showToast('success', 'Reference Saved', `Reference for ${clientName} (${companyName}) created.`);
        setShowModal(false);
      }
    } catch (err: any) {
      showToast('error', 'Submission Failed', err.message || 'Could not save reference.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered References
  const filteredReferences = references.filter(ref => {
    const matchesSearch =
      (ref.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ref.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ref.refGivenBy || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ref.refGivenCompanyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ref.allottedToSalesPersonName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ref.clientNumber || '').includes(searchTerm);

    const matchesSalesPerson =
      selectedSalesPerson === 'All' || ref.allottedToSalesPersonName === selectedSalesPerson;

    return matchesSearch && matchesSalesPerson;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredReferences.length === 0) {
      showToast('info', 'No Data', 'No records available to export.');
      return;
    }

    const headers = [
      'Ref Given By',
      "Ref Given Company's Name",
      'Allotted To Sales Person Name',
      'Allotted By Whom',
      'Company Name',
      'Client Name',
      'Designation',
      'Client Number',
      'Address',
      'Remarks',
      'Next Followup Date',
    ];

    const rows = filteredReferences.map(r => [
      `"${r.refGivenBy || ''}"`,
      `"${r.refGivenCompanyName || ''}"`,
      `"${r.allottedToSalesPersonName || ''}"`,
      `"${r.allottedByWhom || ''}"`,
      `"${r.companyName || ''}"`,
      `"${r.clientName || ''}"`,
      `"${r.designation || ''}"`,
      `"${r.clientNumber || ''}"`,
      `"${r.address || ''}"`,
      `"${r.remarks || ''}"`,
      `"${r.nextFollowupDate || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `References_Export_${getIndianDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Export Complete', `${filteredReferences.length} records exported to CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="pointer-events-none absolute -top-20 -right-10 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-sky-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/30">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">References Directory</h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage client references, track sales executive allotments, and follow-up schedules
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Records</span>
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-sky-500/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Reference</span>
          </motion.button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="group relative overflow-hidden p-5 bg-slate-900 border border-slate-800 rounded-2xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 space-y-1">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-slate-400 to-slate-600" />
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pl-2">Total References</p>
          <p className="text-2xl font-black text-white pl-2 tabular-nums">{references.length}</p>
        </div>
        <div className="group relative overflow-hidden p-5 bg-slate-900 border border-slate-800 rounded-2xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 space-y-1">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-sky-400 to-blue-500" />
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pl-2">Filtered Count</p>
          <p className="text-2xl font-black text-sky-600 pl-2 tabular-nums">{filteredReferences.length}</p>
        </div>
        <div className="group relative overflow-hidden p-5 bg-slate-900 border border-slate-800 rounded-2xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 space-y-1">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-indigo-400 to-purple-500" />
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pl-2">Sales Execs</p>
          <p className="text-2xl font-black text-indigo-400 pl-2 tabular-nums">
            {new Set(references.map(r => r.allottedToSalesPersonName).filter(Boolean)).size}
          </p>
        </div>
        <div className="group relative overflow-hidden p-5 bg-slate-900 border border-slate-800 rounded-2xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 space-y-1">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-emerald-400 to-teal-500" />
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pl-2">Target Companies</p>
          <p className="text-2xl font-black text-emerald-400 pl-2 tabular-nums">
            {new Set(references.map(r => r.companyName).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client, company, ref given by, sales person or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSalesPerson}
              onChange={e => setSelectedSalesPerson(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none font-medium cursor-pointer"
            >
              <option value="All" className="bg-slate-900 text-white">All Sales Representatives</option>
              {salesPersonList.map(name => (
                <option key={name} value={name} className="bg-slate-900 text-white">
                  {name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* References Data Table */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="font-bold text-base text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-sky-600" />
            <span>References Master Sheet ({filteredReferences.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60 uppercase tracking-wider text-[10px]">
                <th className="p-3">Ref Given By</th>
                <th className="p-3">Ref Given Company</th>
                <th className="p-3">Allotted To Exec</th>
                <th className="p-3">Allotted By</th>
                <th className="p-3">Target Company</th>
                <th className="p-3">Client Contact</th>
                <th className="p-3">Address</th>
                <th className="p-3">Remarks</th>
                <th className="p-3 text-center">Next Followup</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReferences.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                        <UserPlus className="w-8 h-8" />
                      </div>
                      <p className="text-base font-bold text-white">No Reference Records Found</p>
                      <p className="text-xs text-slate-400 mt-1.5 max-w-sm">
                        {references.length === 0
                          ? 'No references have been added yet. Click \'Add Reference\' above to create the first one.'
                          : 'Nothing matches your current search or filter. Try adjusting them.'}
                      </p>
                      {references.length === 0 && (
                        <button
                          onClick={handleOpenModal}
                          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Reference</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReferences.map(ref => (
                  <tr key={ref.id} className="hover:bg-slate-800/40 transition-colors group">
                    {/* 1) Ref Given By */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-200">{ref.refGivenBy || '-'}</div>
                    </td>

                    {/* 2) Ref Given Company Name */}
                    <td className="p-3">
                      <div className="text-slate-300">{ref.refGivenCompanyName || '-'}</div>
                    </td>

                    {/* 3) Allotted To Sales Person Name */}
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-950 text-sky-600 border border-sky-800/60 font-semibold text-[11px]">
                        <UserCheck className="w-3 h-3" />
                        {ref.allottedToSalesPersonName || '-'}
                      </span>
                    </td>

                    {/* 4) Allotted By Whom */}
                    <td className="p-3">
                      <div className="text-slate-400 font-mono text-[11px]">{ref.allottedByWhom || '-'}</div>
                    </td>

                    {/* 5) Company Name */}
                    <td className="p-3">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{ref.companyName || '-'}</span>
                      </div>
                    </td>

                    {/* 6) Client Name, 7) Designation, 8) Client Number */}
                    <td className="p-3 space-y-0.5">
                      <div className="font-semibold text-slate-200">{ref.clientName || '-'}</div>
                      <div className="text-[11px] text-slate-400">{ref.designation || 'Client Contact'}</div>
                      {ref.clientNumber && (
                        <a
                          href={`tel:${ref.clientNumber}`}
                          className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline font-mono"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{ref.clientNumber}</span>
                        </a>
                      )}
                    </td>

                    {/* 9) Address */}
                    <td className="p-3 max-w-[180px] truncate" title={ref.address}>
                      <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{ref.address || '-'}</span>
                      </div>
                    </td>

                    {/* 10) Remarks */}
                    <td className="p-3 max-w-[180px] truncate" title={ref.remarks}>
                      <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <MessageSquare className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{ref.remarks || '-'}</span>
                      </div>
                    </td>

                    {/* 11) Next Followup Date */}
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 font-mono font-bold text-[11px]">
                        <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        {ref.nextFollowupDate ? convertInputDateToDDMMYYYY(ref.nextFollowupDate) : '-'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <button onClick={() => openEditModal(ref)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ref.id!, ref.clientName)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Reference Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5 custom-scrollbar shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{editingId ? 'Edit Reference Record' : 'Add New Reference Record'}</h3>
                    <p className="text-xs text-slate-400">
                      Fill in the reference details to register it in the system
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Row 1: Ref Given By & Ref Given Company */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Ref Given By
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Sharma"
                      value={refGivenBy}
                      onChange={e => setRefGivenBy(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Ref Given Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Industries"
                      value={refGivenCompanyName}
                      onChange={e => setRefGivenCompanyName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Row 2: Allotted To Sales Person Name & Allotted By Whom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Allotted To Sales Person Name *
                    </label>
                    <select
                      value={allottedToSalesPersonName}
                      onChange={e => setAllottedToSalesPersonName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
                    >
                      {salesPersonList.map(name => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Allotted By Whom
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Admin / Manager Name"
                      value={allottedByWhom}
                      onChange={e => setAllottedByWhom(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Row 3: Target Company Name & Client Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Surya Petrochem Pvt Ltd"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sanjay Verma"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Row 4: Designation & Client Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Procurement Head / General Manager"
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Client Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={clientNumber}
                      onChange={e => setClientNumber(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>

                {/* Row 5: Address */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Plot 45, Industrial Zone, Indore, MP"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Row 6: Remarks */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter any reference notes or discussion highlights..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Row 7: Next Followup Date */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Next Followup Date
                  </label>
                  <input
                    type="date"
                    value={convertDDMMYYYYToInputDate(nextFollowupDate)}
                    onChange={e => setNextFollowupDate(convertInputDateToDDMMYYYY(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{editingId ? 'Update Reference' : 'Submit Reference'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
