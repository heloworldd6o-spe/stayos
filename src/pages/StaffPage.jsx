import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  CalendarCheck,
  Plus,
  Phone,
  Mail,
  UserCheck,
  Clock,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';

export default function StaffPage() {
  const { activeProperty, showToast } = useAuth();
  const [tab, setTab] = useState('attendance'); // 'attendance' or 'directory'
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    propertyId: '',
    name: '',
    phone: '+91 ',
    email: '',
    role: 'warden',
    salary: 28000,
    emergencyContact: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const staffData = await api.getStaff({ propertyId: activeProperty?.id || '' });
      setStaff(staffData);

      const attData = await api.getTodayAttendance({ propertyId: activeProperty?.id || '' });
      setAttendance(attData.roster || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeProperty]);

  const handleMarkAttendance = async (staffId, status) => {
    try {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await api.markAttendance({
        staffId,
        propertyId: activeProperty?.id,
        status,
        checkInTime: status === 'present' ? nowTime : null
      });
      showToast(`Marked ${status}.`);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await api.addStaff({
        ...formData,
        propertyId: activeProperty?.id
      });
      showToast('Staff member added and login created.', 'success');
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Staff Management & Attendance</h1>
          <p className="text-xs text-slate-500 mt-1">Manage wardens, receptionists, chefs, maintenance and daily shift roster</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab switch */}
          <div className="flex p-1 rounded-xl bg-slate-200/80 border border-slate-300">
            <button
              onClick={() => setTab('attendance')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${tab === 'attendance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Today's Attendance
            </button>
            <button
              onClick={() => setTab('directory')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${tab === 'directory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Staff Directory ({staff.length})
            </button>
          </div>

          <button
            onClick={() => {
              setFormData({
                propertyId: activeProperty?.id || '',
                name: '',
                phone: '+91 ',
                email: '',
                role: 'warden',
                salary: 28000,
                emergencyContact: ''
              });
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Attendance Roster View */}
      {tab === 'attendance' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Shift Attendance Roster — Today ({new Date().toISOString().split('T')[0]})</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Present: <span className="font-bold text-emerald-700">{attendance.filter(a => a.status === 'present').length}</span> / {attendance.length} Staff
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Staff Member</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Check-In Time</th>
                  <th className="p-4">Shift Status</th>
                  <th className="p-4 text-right">Mark Today</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.map(a => {
                  const isPresent = a.status === 'present';
                  const isAbsent = a.status === 'absent';
                  const isLeave = a.status === 'leave';

                  return (
                    <tr key={a.staff_id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-xs">{a.name}</div>
                        <div className="text-[11px] text-slate-400">{a.phone}</div>
                      </td>

                      <td className="p-4 font-bold capitalize text-slate-700">
                        {a.role?.replace('_', ' ')}
                      </td>

                      <td className="p-4 text-slate-600 font-medium">
                        {a.property_name}
                      </td>

                      <td className="p-4 font-medium text-slate-700">
                        {a.check_in_time || '—'}
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${isPresent ? 'bg-emerald-100 text-emerald-800' : (isAbsent ? 'bg-rose-100 text-rose-800' : (isLeave ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'))}`}>
                          {a.status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleMarkAttendance(a.staff_id, 'present')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition ${isPresent ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-emerald-50 text-slate-700'}`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(a.staff_id, 'absent')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition ${isAbsent ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-rose-50 text-slate-700'}`}
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(a.staff_id, 'leave')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition ${isLeave ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-amber-50 text-slate-700'}`}
                          >
                            Leave
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Staff Directory Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {staff.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    {s.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 font-display">{s.name}</h3>
                    <div className="text-[11px] font-bold text-emerald-700 uppercase">{s.role?.replace('_', ' ')}</div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                  {s.status}
                </span>
              </div>

              <div className="space-y-1.5 text-slate-600 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.phone}</span>
                </div>
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.email}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="text-slate-400">Monthly Salary:</div>
                <div className="font-extrabold text-slate-900">₹{s.salary?.toLocaleString('en-IN')}/mo</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900 font-display">Add New Staff Member</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Staff Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                    placeholder="e.g. Suresh Kumar"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold capitalize"
                  >
                    <option value="manager">Property Manager</option>
                    <option value="warden">Warden</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="accountant">Accountant</option>
                    <option value="chef">Master Chef</option>
                    <option value="kitchen_staff">Kitchen Staff</option>
                    <option value="maintenance">Maintenance / Electrician</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone (+91) *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    placeholder="+91 9849000000"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email (For Login Access)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    placeholder="staff@urbanstay.in"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    placeholder="+91 Phone"
                  />
                </div>
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
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
