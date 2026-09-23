import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Customer } from '../../types';
import { Users, Plus, Search, Building2, Phone, MapPin, IndianRupee, Shield, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CustomersModule: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, showToast } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [partyName, setPartyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [city, setCity] = useState('');
  const [crmId, setCrmId] = useState(`CRM-${Math.floor(100 + Math.random() * 900)}`);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName || !contactPerson) return;

    const newCust: Customer = {
      id: 'CUST-' + Date.now(),
      partyName,
      contactPerson,
      mobileNumber,
      city,
      crmId,
      totalOrders: editingId ? (customers.find(c => c.id === editingId)?.totalOrders || 0) : 0,
      lastVisitDate: editingId ? (customers.find(c => c.id === editingId)?.lastVisitDate || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
    };

    if (editingId) {
      updateCustomer({ ...newCust, id: editingId });
      showToast('success', 'Customer Updated', `${partyName} details updated.`);
    } else {
      addCustomer(newCust);
      showToast('success', 'Customer Added', `${partyName} saved to CRM directory.`);
    }

    setPartyName('');
    setContactPerson('');
    setMobileNumber('');
    setCity('');
    setEditingId(null);
    setShowModal(false);
  };

  const openEditModal = (cust: Customer) => {
    setEditingId(cust.id);
    setPartyName(cust.partyName);
    setContactPerson(cust.contactPerson);
    setMobileNumber(cust.mobileNumber);
    setCity(cust.city);
    setCrmId(cust.crmId);
    setShowModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteCustomer(id);
      showToast('info', 'Customer Deleted', `${name} has been removed.`);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/30">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 shadow-lg shadow-purple-950/40">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">Customer CRM Directory</h1>
            <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
              Party master database and CRM accounts directory
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setPartyName('');
            setContactPerson('');
            setMobileNumber('');
            setCity('');
            setCrmId(`CRM-${Math.floor(100 + Math.random() * 900)}`);
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 sm:top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search party name, city or contact..."
            className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 sm:space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold">
                  {cust.crmId}
                </span>
                <h3 className="font-bold text-base text-white mt-1">{cust.partyName}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditModal(cust)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(cust.id, cust.partyName)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Contact: {cust.contactPerson}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>{cust.mobileNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{cust.city}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-500">Total Business</span>
                <div className="font-bold text-emerald-400">
                  ₹{(cust.totalOrders || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500">Last Visit</span>
                <div className="text-slate-300 font-medium">{cust.lastVisitDate}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-base text-white">{editingId ? 'Edit Customer' : 'Add New Customer Party'}</h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Party / Company Name</label>
                  <input
                    type="text"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    placeholder="e.g. Reliance Retail Logistics"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Mr. Suresh Menon"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 98201 12345"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-md shadow-purple-500/20"
                >
                  {editingId ? 'Update Party' : 'Save Party to CRM'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
