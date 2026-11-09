import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  X,
  Phone,
  User,
  LogOut
} from 'lucide-react';

export default function VisitorsPage() {
  const { activeProperty, showToast } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    propertyId: '',
    visitorName: '',
    visitorPhone: '+91 ',
    relationship: 'Friend',
    purpose: 'Personal visit',
    visitDate: new Date().toISOString().split('T')[0],
    expectedTime: '04:00 PM',
    idType: 'Aadhaar',
    idNumber: ''
  });

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const data = await api.getVisitors({
        propertyId: activeProperty?.id || '',
        status: statusFilter
      });
      setVisitors(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [activeProperty, statusFilter]);

  const handleUpdateStatus = async (visitorId, status) => {
    try {
      await api.updateVisitorStatus(visitorId, { status });
      showToast(`Visitor status updated to ${status}.`);
      fetchVisitors();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Visitor Gate Passes & Security</h1>
          <p className="text-xs text-slate-500 mt-1">Manage guest entry requests, warden approvals, and gate check-in logs</p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 shadow-sm"
        >
          <option value="">All Visitor Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved Pass</option>
          <option value="checked_in">Checked In (Inside Facility)</option>
          <option value="checked_out">Checked Out</option>
        </select>
      </div>

      {/* Visitors List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading visitor logs...</div>
      ) : visitors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No visitors recorded</h3>
          <p className="text-slate-400 mt-1">Residents can request guest passes directly via their resident portal.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Visitor Name</th>
                  <th className="p-4">Resident Visiting</th>
                  <th className="p-4">Date & Expected Time</th>
                  <th className="p-4">Gate Check-In / Out</th>
                  <th className="p-4">Purpose</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visitors.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-xs">{v.visitor_name}</div>
                      <div className="text-[11px] text-slate-400">{v.visitor_phone} • {v.relationship}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-800">{v.resident_name}</div>
                      <div className="text-[11px] text-slate-400">Room {v.room_number || 'N/A'} (Bed {v.bed_number || 'N/A'})</div>
                    </td>

                    <td className="p-4 text-slate-700 font-medium">
                      {v.visit_date} @ {v.expected_time || 'Anytime'}
                    </td>

                    <td className="p-4 text-slate-600">
                      <div>In: <span className="font-bold text-slate-800">{v.check_in_time || '—'}</span></div>
                      <div>Out: <span className="font-bold text-slate-800">{v.check_out_time || '—'}</span></div>
                    </td>

                    <td className="p-4 text-slate-600 italic">
                      {v.purpose || 'Visit'}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${v.status === 'checked_in' ? 'bg-emerald-100 text-emerald-800' : (v.status === 'approved' ? 'bg-blue-100 text-blue-800' : (v.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'))}`}>
                        {v.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {v.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(v.id, 'approved')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(v.id, 'rejected')}
                              className="px-2 py-1 border border-rose-300 text-rose-600 font-bold rounded-lg text-[10px]"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {v.status === 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(v.id, 'checked_in')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px]"
                          >
                            Gate Check-In
                          </button>
                        )}

                        {v.status === 'checked_in' && (
                          <button
                            onClick={() => handleUpdateStatus(v.id, 'checked_out')}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-[10px]"
                          >
                            Gate Check-Out
                          </button>
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
    </div>
  );
}
