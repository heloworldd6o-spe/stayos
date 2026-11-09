import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  UtensilsCrossed,
  Wrench,
  Megaphone,
  CheckCheck
} from 'lucide-react';

export default function NotificationDrawer({ onClose }) {
  const { showToast } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      showToast('All notifications marked as read.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'food_ready':
        return <UtensilsCrossed className="w-4 h-4 text-orange-600" />;
      case 'payment_success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'payment_reminder':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      case 'complaint_update':
      case 'maintenance_update':
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'notice':
        return <Megaphone className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-base text-slate-800">Notifications & Alerts</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-emerald-50 transition"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-10 text-xs text-slate-400">Loading alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-700">No new notifications</div>
              <div className="text-xs text-slate-400 mt-1">You are all caught up with property alerts!</div>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
                className={`p-3.5 rounded-xl border text-xs transition cursor-pointer ${n.is_read ? 'bg-white border-slate-200 opacity-75' : 'bg-emerald-50/40 border-emerald-200 shadow-sm'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${n.is_read ? 'bg-slate-100' : 'bg-white shadow-sm border border-emerald-100'}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900">{n.title}</div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      )}
                    </div>
                    <div className="text-slate-600 mt-1 leading-relaxed">{n.message}</div>
                    <div className="text-[10px] text-slate-400 mt-2 font-medium">
                      {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
