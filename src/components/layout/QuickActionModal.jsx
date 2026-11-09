import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus,
  Bed,
  CreditCard,
  Receipt,
  TrendingDown,
  ClipboardList,
  Megaphone,
  X
} from 'lucide-react';

export default function QuickActionModal({ onNavigate }) {
  const { quickActionOpen, setQuickActionOpen } = useAuth();

  if (!quickActionOpen) return null;

  const actions = [
    { id: 'checkin', title: 'New Resident Check-In', desc: 'KYC, assign room & collect initial deposit', icon: UserPlus, color: 'bg-emerald-500' },
    { id: 'beds', title: 'Find Available Beds', desc: 'Instant vacancy search & 1-click allocation', icon: Bed, color: 'bg-blue-500' },
    { id: 'payments', title: 'Record Payment', desc: 'Collect cash, UPI, or bank transfer & generate receipt', icon: CreditCard, color: 'bg-indigo-500' },
    { id: 'invoices', title: 'Generate Invoices', desc: 'Run monthly recurring rent billing cycle', icon: Receipt, color: 'bg-amber-500' },
    { id: 'expenses', title: 'Add Expense', desc: 'Record grocery, power, maintenance or staff salary', icon: TrendingDown, color: 'bg-rose-500' },
    { id: 'complaints', title: 'Log Complaint / Issue', desc: 'Register electrical, plumbing or room repairs', icon: ClipboardList, color: 'bg-purple-500' },
    { id: 'notices', title: 'Broadcast Notice', desc: 'Send urgent alert or announcement to residents', icon: Megaphone, color: 'bg-teal-500' }
  ];

  const handleClick = (actionId) => {
    setQuickActionOpen(false);
    onNavigate(actionId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-base text-slate-900 font-display">⚡ StayOS Quick Action Center</h3>
            <p className="text-xs text-slate-500">Fast shortcuts for daily property workflows</p>
          </div>
          <button
            onClick={() => setQuickActionOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          {actions.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleClick(action.id)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md hover:bg-emerald-50/20 text-left transition flex items-start gap-3 group"
              >
                <div className={`p-2.5 rounded-xl ${action.color} text-white shadow-sm group-hover:scale-105 transition`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition">{action.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{action.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
