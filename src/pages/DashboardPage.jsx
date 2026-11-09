import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Building2,
  DoorOpen,
  Bed,
  Users,
  CreditCard,
  Receipt,
  TrendingUp,
  TrendingDown,
  Percent,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  UtensilsCrossed,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChefHat,
  Megaphone,
  Calendar
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardPage({ onNavigate }) {
  const { user, organization, activeProperty, setQuickActionOpen } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats(activeProperty?.id);
      setData(res || {});
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activeProperty]);

  if (loading || !data || !data.summary) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-48"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-200 rounded-2xl lg:col-span-2"></div>
          <div className="h-80 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const s = data.summary || {};
  const todayMeals = Array.isArray(data.todayMeals) ? data.todayMeals : [];
  const revenueTrends = Array.isArray(data.revenueTrends) ? data.revenueTrends : [];
  const expenseBreakdown = Array.isArray(data.expenseBreakdown) ? data.expenseBreakdown : [];
  const currency = organization?.currency_symbol || '₹';

  const COLORS = ['#22c55e', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              Operational Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              Live IST
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {activeProperty ? `Managing: ${activeProperty.name} (${activeProperty.city || 'India'})` : 'All Properties Consolidated View'}
          </p>
        </div>

        {/* Quick Speed Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('checkin')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>+ Check-In</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('beds')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <Bed className="w-3.5 h-3.5 text-blue-600" />
            <span>Find Beds</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('payments')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span>Collect Pay</span>
          </button>
        </div>
      </div>

      {/* Row 1: Occupancy & Core Capacity Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Occupancy</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-display mt-2">
            {s.occupancyPercent || 0}%
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
            {s.occupiedBeds || 0} / {s.totalBeds || 0} Beds Occupied
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Available Beds</span>
            <Bed className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 font-display mt-2">
            {s.availableBeds || 0}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
            Ready for instant allocation
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Residents</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-display mt-2">
            {s.activeResidents || 0}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
            Across {s.totalRooms || 0} rooms
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Monthly Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-display mt-2">
            {currency}{(s.monthlyRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
            Today: {currency}{(s.todayRevenue || 0).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Monthly Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 font-display mt-2">
            {currency}{(s.monthlyExpenses || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
            Net: {currency}{(s.netRevenue || 0).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Pending Dues</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-display mt-2">
            {currency}{(s.pendingAmount || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-rose-600 font-bold mt-0.5">
            {s.overdueCount || 0} Overdue Invoices
          </div>
        </div>
      </div>

      {/* Row 2: Today's Food / Kitchen Status & Check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Live Mess Status (Chef & Operations) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-display">Today's Kitchen & Mess Headcounts</h3>
                <p className="text-[11px] text-slate-400">Live meal prep status & automated resident headcount</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('chef')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Chef Live KDS</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {['breakfast', 'lunch', 'snacks', 'dinner'].map((mType) => {
              const meal = todayMeals.find(m => m.meal_type === mType);
              const status = meal?.status || 'pending';
              const isReady = status === 'ready';
              const isPreparing = status === 'preparing';
              const isDone = status === 'completed';

              return (
                <div key={mType} className={`p-3.5 rounded-xl border text-xs ${isReady ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold capitalize text-slate-800">{mType}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${isReady ? 'bg-emerald-500 text-white' : (isPreparing ? 'bg-amber-100 text-amber-800' : (isDone ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'))}`}>
                      {status}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-xl font-black text-slate-900 font-display">
                      {meal?.expected_count || 0} <span className="text-[10px] text-slate-400 font-normal">meals</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Opted out: {meal?.opted_out_count || 0}</span>
                      {meal?.guest_count > 0 && <span className="text-emerald-600 font-bold">+{meal.guest_count} guests</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Operations Ticker */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 font-display mb-3">Today's Activity Tracker</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-700">Today's Check-Ins</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{s.todayCheckins || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <UserX className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-semibold text-slate-700">Today's Check-Outs</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{s.todayCheckouts || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-700">Open Complaint Tickets</span>
                </div>
                <span className={`text-sm font-bold ${(s.openComplaints || 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{s.openComplaints || 0}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('complaints')}
            className="w-full mt-3 py-2 text-center text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
          >
            Manage Facility Tickets →
          </button>
        </div>
      </div>

      {/* Row 3: Charts (Revenue Trends & Expense Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 font-display">Revenue Collection Trends</h3>
              <p className="text-[11px] text-slate-400">Verified successful receipts across past billing months</p>
            </div>
          </div>

          <div className="h-64">
            {revenueTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrends}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip
                    formatter={(value) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Verified Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No revenue trend data recorded yet.</div>
            )}
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 font-display mb-1">Expense Breakdown</h3>
          <p className="text-[11px] text-slate-400 mb-4">Monthly cost distribution by category</p>

          <div className="h-52">
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No expenses recorded yet.</div>
            )}
          </div>

          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
            {expenseBreakdown.map((e, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 capitalize text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span>{e.category}</span>
                </div>
                <span className="font-bold text-slate-900">{currency}{(e.total || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
