import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ClipboardList,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  X,
  UserCheck,
  Building2,
  DoorOpen
} from 'lucide-react';

export default function ComplaintsPage() {
  const { user, activeProperty, showToast } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Submit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    propertyId: '',
    category: 'electrical',
    title: '',
    description: '',
    priority: 'medium',
    roomId: ''
  });

  // Assign / Resolve Modal
  const [actionModal, setActionModal] = useState({ open: false, complaint: null, type: '' });
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actualCost, setActualCost] = useState(0);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const data = await api.getComplaints({
        propertyId: activeProperty?.id || '',
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter
      });
      setComplaints(data);

      const staffData = await api.getStaff({ propertyId: activeProperty?.id || '' });
      setStaffList(staffData);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [activeProperty, statusFilter, categoryFilter, priorityFilter]);

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    try {
      await api.submitComplaint({
        ...formData,
        propertyId: activeProperty?.id
      });
      showToast('Complaint ticket logged and assigned to property facility team.', 'success');
      setModalOpen(false);
      fetchComplaints();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAssign = async () => {
    try {
      await api.assignComplaint(actionModal.complaint.id, { staffId: selectedStaffId });
      showToast('Ticket assigned to staff member.', 'success');
      setActionModal({ open: false, complaint: null, type: '' });
      fetchComplaints();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResolve = async () => {
    try {
      await api.updateComplaintStatus(actionModal.complaint.id, {
        status: 'resolved',
        resolutionNotes,
        actualCost: Number(actualCost) || 0
      });
      showToast('Complaint marked as resolved! Resident notified.', 'success');
      setActionModal({ open: false, complaint: null, type: '' });
      fetchComplaints();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Complaints & Facility Tickets</h1>
          <p className="text-xs text-slate-500 mt-1">Track electrical, plumbing, cleaning, WiFi, and room repair requests</p>
        </div>

        <button
          onClick={() => {
            setFormData({
              propertyId: activeProperty?.id || '',
              category: 'electrical',
              title: '',
              description: '',
              priority: 'medium',
              roomId: ''
            });
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Ticket</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted (New)</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="">All Categories</option>
          <option value="electrical">Electrical / AC</option>
          <option value="plumbing">Plumbing / Water</option>
          <option value="wifi">WiFi / Network</option>
          <option value="cleaning">Cleaning / Housekeeping</option>
          <option value="food">Food / Mess</option>
          <option value="room">Room Furniture</option>
          <option value="security">Security</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="">All Priorities</option>
          <option value="urgent">🚨 Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Complaints Table */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">Loading complaint tickets...</div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No complaints matching filters</h3>
          <p className="text-xs text-slate-400 mt-1">All facilities operating normally with zero open tickets.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Ticket</th>
                  <th className="p-4">Resident & Room</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Assigned Staff</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-xs">{c.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{c.description}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-800">{c.resident_name}</div>
                      <div className="text-[11px] text-slate-400">Room {c.room_number || 'N/A'} • {c.resident_phone}</div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium capitalize text-[10px]">
                        {c.category}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${c.priority === 'urgent' ? 'bg-rose-100 text-rose-800 animate-pulse' : (c.priority === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700')}`}>
                        {c.priority}
                      </span>
                    </td>

                    <td className="p-4 text-slate-700 font-medium">
                      {c.assigned_staff_name ? (
                        <span className="text-indigo-700 font-bold">👤 {c.assigned_staff_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${c.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : (c.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : (c.status === 'assigned' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'))}`}>
                        {c.status?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status !== 'resolved' && (
                          <>
                            <button
                              onClick={() => {
                                setActionModal({ open: true, complaint: c, type: 'assign' });
                                setSelectedStaffId(c.assigned_to_staff_id || '');
                              }}
                              className="px-2 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px]"
                            >
                              Assign
                            </button>

                            <button
                              onClick={() => {
                                setActionModal({ open: true, complaint: c, type: 'resolve' });
                                setResolutionNotes('');
                                setActualCost(0);
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                            >
                              Resolve
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Ticket Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900 font-display">Log Facility / Repair Ticket</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Issue Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="electrical">Electrical / AC / Geyser</option>
                    <option value="plumbing">Plumbing / Tap / Water</option>
                    <option value="wifi">WiFi / High Ping</option>
                    <option value="cleaning">Room Housekeeping</option>
                    <option value="food">Mess / Food Quality</option>
                    <option value="room">Bed / Wardrobe Repair</option>
                    <option value="security">Gate / Security</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold uppercase"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">🚨 Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Short Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  placeholder="e.g. Split AC cooling slow / Washbasin leak"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  placeholder="Describe the issue in detail..."
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Resolve Modal */}
      {actionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 font-display">
                {actionModal.type === 'assign' ? 'Assign Staff to Ticket' : 'Mark Ticket Resolved'}
              </h3>
              <button onClick={() => setActionModal({ open: false, complaint: null, type: '' })} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">{actionModal.complaint.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{actionModal.complaint.description}</div>
              </div>

              {actionModal.type === 'assign' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Facility / Maintenance Staff *</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="">-- Choose Staff Member --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role?.replace('_', ' ')})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Resolution Summary / Notes *</label>
                    <input
                      type="text"
                      required
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                      placeholder="e.g. Replaced AC capacitor. Verified cooling."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Actual Repair / Spare Part Cost (₹)</label>
                    <input
                      type="number"
                      value={actualCost}
                      onChange={(e) => setActualCost(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionModal({ open: false, complaint: null, type: '' })}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={actionModal.type === 'assign' ? handleAssign : handleResolve}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  {actionModal.type === 'assign' ? 'Confirm Assignment' : 'Complete & Notify Resident'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
