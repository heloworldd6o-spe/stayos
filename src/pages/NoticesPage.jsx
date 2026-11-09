import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Megaphone,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
  Building2
} from 'lucide-react';

export default function NoticesPage() {
  const { activeProperty, showToast } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    propertyId: '',
    title: '',
    message: '',
    priority: 'normal',
    targetType: 'all',
    expiresAt: ''
  });

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const data = await api.getNotices({ propertyId: activeProperty?.id || '' });
      setNotices(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [activeProperty]);

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    try {
      await api.createNotice({
        ...formData,
        propertyId: activeProperty?.id
      });
      showToast('Notice published and broadcasted to resident mobile portals.', 'success');
      setModalOpen(false);
      fetchNotices();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this announcement?')) return;
    try {
      await api.deleteNotice(id);
      showToast('Notice removed.');
      fetchNotices();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Digital Noticeboard & Announcements</h1>
          <p className="text-xs text-slate-500 mt-1">Broadcast power shutdowns, maintenance updates, events, and rent reminders</p>
        </div>

        <button
          onClick={() => {
            setFormData({
              propertyId: activeProperty?.id || '',
              title: '',
              message: '',
              priority: 'normal',
              targetType: 'all',
              expiresAt: ''
            });
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Broadcast Notice</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading notices...</div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No active announcements</h3>
          <p className="text-slate-400 mt-1">Click "Broadcast Notice" to alert residents about upcoming facility events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {notices.map(n => {
            const isUrgent = n.priority === 'urgent';
            const isImportant = n.priority === 'important';

            return (
              <div
                key={n.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between space-y-4 ${isUrgent ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20' : (isImportant ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200')}`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${isUrgent ? 'bg-rose-500 text-white animate-pulse' : (isImportant ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')}`}>
                      {n.priority} Notice
                    </span>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 font-display mt-3 leading-snug">{n.title}</h3>
                  <p className="text-slate-600 mt-2 leading-relaxed text-xs">{n.message}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>By: <strong className="text-slate-700">{n.created_by}</strong></span>
                  <span>{n.created_at?.split(' ')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Broadcast Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900 font-display">Broadcast Digital Announcement</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold uppercase"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">🚨 Urgent (Immediate Push)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Audience Target</label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="all">All Residents in Facility</option>
                    <option value="property">This Property Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notice Headline *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  placeholder="e.g. Scheduled Water Maintenance on Saturday"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notice Content / Instructions *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs leading-relaxed"
                  placeholder="Type announcement message here..."
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
                  Publish & Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
