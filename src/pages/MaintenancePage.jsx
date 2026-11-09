import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  DoorOpen,
  UserCheck
} from 'lucide-react';

export default function MaintenancePage() {
  const { activeProperty, showToast } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    propertyId: '',
    title: '',
    description: '',
    roomId: '',
    priority: 'medium',
    estimatedCost: 0
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getMaintenanceTasks({ propertyId: activeProperty?.id || '' });
      setTasks(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeProperty]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.createMaintenanceTask({
        ...formData,
        propertyId: activeProperty?.id
      });
      showToast('Maintenance task logged.', 'success');
      setModalOpen(false);
      fetchTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateStatus = async (taskId, status) => {
    try {
      await api.updateMaintenanceTask(taskId, { status });
      showToast(`Task status updated to ${status}.`);
      fetchTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Maintenance & Repair Work Orders</h1>
          <p className="text-xs text-slate-500 mt-1">Track preventive checks, spare parts, and contractor repair orders</p>
        </div>

        <button
          onClick={() => {
            setFormData({
              propertyId: activeProperty?.id || '',
              title: '',
              description: '',
              roomId: '',
              priority: 'medium',
              estimatedCost: 0
            });
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Work Order</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading work orders...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No active maintenance tasks</h3>
          <p className="text-slate-400 mt-1">All facilities and assets in normal operating condition.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map(t => {
            const isCompleted = t.status === 'completed';
            const isInProgress = t.status === 'in_progress';

            return (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${t.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                      {t.priority} Priority
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${isCompleted ? 'bg-emerald-100 text-emerald-800' : (isInProgress ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800')}`}>
                      {t.status?.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 font-display mt-3">{t.title}</h3>
                  <p className="text-slate-500 mt-1 leading-relaxed">{t.description}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Room:</span>
                      <span className="font-bold text-slate-900">{t.room_number ? `Room ${t.room_number}` : 'Common Area'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Assigned Technician:</span>
                      <span className="font-bold text-indigo-700">{t.assigned_staff_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actual Repair Cost:</span>
                      <span className="font-bold text-slate-900">₹{t.actual_cost?.toLocaleString('en-IN') || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {!isCompleted ? (
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'completed')}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition"
                    >
                      Mark Completed
                    </button>
                  ) : (
                    <div className="w-full text-center text-emerald-700 font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Repairs Finished</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Work Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900 font-display">Create Work Order / Repair Task</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  placeholder="e.g. RO Filter Quarterly Replacement"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
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
                  Create Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
