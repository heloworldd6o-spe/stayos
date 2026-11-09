import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import CheckOutModal from './CheckOutModal';
import {
  Users,
  Search,
  Plus,
  Filter,
  Phone,
  Mail,
  Building2,
  DoorOpen,
  Bed,
  Calendar,
  CreditCard,
  Receipt,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  LogOut,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function ResidentsPage({ onNavigate, onStartCheckIn, onStartCheckOut }) {
  const { activeProperty, showToast } = useAuth();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Full Profile Modal
  const [selectedResident, setSelectedResident] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState('overview');

  // Internal Checkout Modal
  const [checkoutResident, setCheckoutResident] = useState(null);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const data = await api.getResidents({
        propertyId: activeProperty?.id || '',
        status: statusFilter,
        search
      });
      setResidents(Array.isArray(data) ? data : (data?.data || []));
    } catch (err) {
      console.error('Failed to fetch residents:', err);
      showToast(err.message || 'Failed to fetch residents', 'error');
      setResidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, [activeProperty, statusFilter, search]);

  const openProfile = async (resId) => {
    try {
      setProfileLoading(true);
      const data = await api.getResident(resId);
      setSelectedResident(data);
      setProfileTab('overview');
    } catch (err) {
      showToast(err.message || 'Failed to load profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCheckInClick = () => {
    if (onStartCheckIn) {
      onStartCheckIn();
    } else if (onNavigate) {
      onNavigate('checkin');
    }
  };

  const handleCheckoutClick = (res) => {
    if (onStartCheckOut) {
      onStartCheckOut(res);
    } else {
      setCheckoutResident(res);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Resident Master Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage KYC profiles, stays, agreements, and dues</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchResidents}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleCheckInClick}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Check-In Onboarding</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search resident name, phone, email, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
        >
          <option value="active">Active Stayers</option>
          <option value="notice_period">Notice Period</option>
          <option value="checked_out">Checked Out (Archived)</option>
          <option value="all">All Records</option>
        </select>
      </div>

      {/* Residents Table */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">Loading resident directory...</div>
      ) : residents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No residents found</h3>
          <p className="text-xs text-slate-400 mt-1">Onboard your first resident using the Check-In Wizard.</p>
          <button
            type="button"
            onClick={handleCheckInClick}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Check-In Wizard</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Resident</th>
                  <th className="p-4">Room & Bed</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Joining Date</th>
                  <th className="p-4">Monthly Rent</th>
                  <th className="p-4">Outstanding Dues</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {residents.map(res => {
                  const hasDues = (res.total_outstanding || 0) > 0;
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {res.photo_url ? (
                            <img src={res.photo_url} alt={res.full_name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                              {res.full_name?.charAt(0) || 'R'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{res.full_name}</div>
                            <div className="text-[11px] text-slate-400 capitalize">{res.occupation?.replace('_', ' ') || 'Resident'} • {res.organization_or_college || 'Private'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {res.room_number ? `Room ${res.room_number}` : 'Unassigned'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Bed {res.bed_number || 'None'} • {res.property_name || 'Property'}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-slate-800">{res.phone}</div>
                        <div className="text-[11px] text-slate-400">{res.email}</div>
                      </td>

                      <td className="p-4 font-medium text-slate-700">
                        {res.joining_date || 'N/A'}
                      </td>

                      <td className="p-4 font-extrabold text-slate-900">
                        ₹{(res.monthly_rent || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="p-4">
                        {hasDues ? (
                          <span className="font-bold text-rose-600">
                            ₹{(res.total_outstanding || 0).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Settled</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${res.status === 'active' ? 'bg-emerald-100 text-emerald-800' : (res.status === 'notice_period' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}`}>
                          {res.status?.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openProfile(res.id)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold cursor-pointer"
                            title="View Full Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {res.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleCheckoutClick(res)}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              title="Initiate Check-Out"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Check-Out</span>
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
        </div>
      )}

      {/* Resident Full Profile Modal */}
      {selectedResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                  {selectedResident.full_name?.charAt(0) || 'R'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 font-display flex items-center gap-2">
                    <span>{selectedResident.full_name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                      {selectedResident.status}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    Room {selectedResident.room_number || 'N/A'} • Bed {selectedResident.bed_number || 'N/A'} • {selectedResident.property_name || 'Property'}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedResident(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Tab Selector */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 gap-4 text-xs font-bold">
              {[
                { id: 'overview', label: 'Overview & KYC' },
                { id: 'invoices', label: `Invoices (${selectedResident.invoices?.length || 0})` },
                { id: 'payments', label: `Payments (${selectedResident.payments?.length || 0})` },
                { id: 'complaints', label: `Complaints (${selectedResident.complaints?.length || 0})` },
                { id: 'stay', label: 'Stay History' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setProfileTab(t.id)}
                  className={`py-3 border-b-2 transition cursor-pointer ${profileTab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {profileTab === 'overview' && (
                <div className="space-y-6">
                  {/* Personal & KYC */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Identity & Personal Details</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <div className="text-slate-400 text-[11px]">Phone (+91)</div>
                        <div className="font-bold text-slate-900 mt-0.5">{selectedResident.phone || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[11px]">Email</div>
                        <div className="font-bold text-slate-900 mt-0.5">{selectedResident.email || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[11px]">Gender / DOB</div>
                        <div className="font-bold text-slate-900 mt-0.5 capitalize">{selectedResident.gender || 'N/A'} • {selectedResident.dob || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[11px]">ID Type & Number</div>
                        <div className="font-bold text-slate-900 mt-0.5 uppercase">{selectedResident.id_type || 'ID'}: {selectedResident.id_number || 'Verified'}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[11px]">Occupation / Org</div>
                        <div className="font-bold text-slate-900 mt-0.5 capitalize">{selectedResident.occupation?.replace('_', ' ') || 'Working'} ({selectedResident.organization_or_college || 'Private'})</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[11px]">Food Preference</div>
                        <div className="font-bold text-emerald-700 mt-0.5 uppercase">🥗 {selectedResident.food_preference || 'Veg'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Overview */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Financial Plan</h4>
                    <div className="grid grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                      <div>
                        <div className="text-emerald-700 text-[11px]">Monthly Rent</div>
                        <div className="font-black text-slate-900 text-base mt-0.5">₹{(selectedResident.monthly_rent || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-emerald-700 text-[11px]">Security Deposit Held</div>
                        <div className="font-black text-slate-900 text-base mt-0.5">₹{(selectedResident.deposit_amount || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-emerald-700 text-[11px]">Outstanding Dues</div>
                        <div className={`font-black text-base mt-0.5 ${(selectedResident.outstanding || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ₹{(selectedResident.outstanding || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Emergency Contact & Permanent Address</h4>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{selectedResident.emergency_contact_name || 'Guardian'} ({selectedResident.emergency_contact_relation || 'Parent'})</span>
                        <span className="font-semibold text-slate-700">{selectedResident.emergency_contact_phone || 'N/A'}</span>
                      </div>
                      <div className="text-slate-500">{selectedResident.permanent_address || 'No permanent address recorded'}</div>
                    </div>
                  </div>
                </div>
              )}

              {profileTab === 'invoices' && (
                <div className="space-y-3">
                  {(selectedResident.invoices || []).map(inv => (
                    <div key={inv.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{inv.invoice_number}</div>
                        <div className="text-[11px] text-slate-500">Period: {inv.period_start} to {inv.period_end} • Due: {inv.due_date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-900">₹{(inv.total_amount || 0).toLocaleString('en-IN')}</div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {profileTab === 'payments' && (
                <div className="space-y-3">
                  {(selectedResident.payments || []).map(pay => (
                    <div key={pay.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">Receipt #{pay.receipt_number}</div>
                        <div className="text-[11px] text-slate-500">{pay.payment_date} via <span className="uppercase font-bold">{pay.payment_method}</span></div>
                      </div>
                      <div className="text-right font-black text-emerald-600 text-sm">
                        +₹{(pay.amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {profileTab === 'complaints' && (
                <div className="space-y-3">
                  {(selectedResident.complaints || []).map(c => (
                    <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{c.title}</div>
                        <div className="text-[11px] text-slate-500 capitalize">{c.category} • Priority: {c.priority}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold uppercase">
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {profileTab === 'stay' && (
                <div className="space-y-3">
                  {(selectedResident.stayHistory || []).map(st => (
                    <div key={st.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">Room {st.room_number} (Bed {st.bed_number})</div>
                        <div className="text-[11px] text-slate-500">Allocated on: {st.start_date} by {st.allocated_by}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                        {st.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Internal Check-Out Settlement Modal */}
      {checkoutResident && (
        <CheckOutModal
          resident={checkoutResident}
          onClose={() => setCheckoutResident(null)}
          onSuccess={() => {
            setCheckoutResident(null);
            fetchResidents();
          }}
        />
      )}
    </div>
  );
}
