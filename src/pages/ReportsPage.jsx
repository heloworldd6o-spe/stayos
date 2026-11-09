import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  BarChart3,
  Download,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function ReportsPage() {
  const { activeProperty, showToast } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalytics(activeProperty?.id || null);
      setAnalytics(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeProperty]);

  const handleDownloadCsv = async (type) => {
    try {
      showToast(`Generating ${type} report CSV...`, 'info');
      const token = localStorage.getItem('stayos_token');
      const orgId = localStorage.getItem('stayos_org_id');
      const response = await fetch(`${api.getExportUrl(type)}?token=${token || ''}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(orgId ? { 'x-organization-id': orgId } : {})
        }
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to download report');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `stayos_${type}_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showToast(`Exported ${type} report CSV successfully!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading || !analytics) {
    return <div className="text-center py-20 text-xs text-slate-400">Compiling financial & occupancy reports...</div>;
  }

  return (
    <div className="space-y-6 text-xs">
      {/* Header & CSV Download Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Analytics & Financial Reports</h1>
          <p className="text-xs text-slate-500 mt-1">Exportable audit logs, P&L comparisons, and bed utilization</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleDownloadCsv('residents')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Residents CSV</span>
          </button>
          <button
            onClick={() => handleDownloadCsv('payments')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Payments CSV</span>
          </button>
          <button
            onClick={() => handleDownloadCsv('expenses')}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Expenses CSV</span>
          </button>
        </div>
      </div>

      {/* Row 1: Monthly Financial Comparison (Revenue vs Expenses) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 font-display">Revenue vs Operational Expenses (Past 6 Months)</h3>
            <p className="text-[11px] text-slate-400">Monthly P&L overview with net operating profit</p>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.financialComparison}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip
                formatter={(val, name) => [`₹${Number(val).toLocaleString('en-IN')}`, name === 'revenue' ? 'Revenue' : (name === 'expenses' ? 'Expenses' : 'Net Margin')]}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Room Type Utilization & Outstanding Dues by Property */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Type Utilization */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 font-display mb-1">Room Sharing Type Utilization</h3>
          <p className="text-[11px] text-slate-400 mb-4">Occupancy distribution across single, double, and multi-sharing rooms</p>

          <div className="space-y-3">
            {analytics.roomTypeStats.map((r, idx) => {
              const occPct = r.total_beds > 0 ? Math.round((r.occupied_beds / r.total_beds) * 100) : 0;
              return (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center font-bold text-slate-800 capitalize mb-1">
                    <span>{r.room_type?.replace('_', ' ')}:</span>
                    <span className="text-emerald-700">{occPct}% ({r.occupied_beds}/{r.total_beds} Beds)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${occPct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outstanding Dues by Branch */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 font-display mb-1">Outstanding Dues by Property</h3>
          <p className="text-[11px] text-slate-400 mb-4">Unpaid monthly rent balances and overdue flags</p>

          <div className="space-y-3">
            {analytics.propertyDues.map((p, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">{p.property_name}</div>
                  <div className="text-[11px] text-rose-600 font-semibold">{p.overdue_invoices} Overdue Invoices</div>
                </div>
                <div className="text-right font-black text-sm text-slate-900">
                  ₹{p.total_outstanding?.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
