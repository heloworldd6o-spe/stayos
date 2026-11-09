import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  TrendingDown,
  Plus,
  Search,
  Trash2,
  X,
  Building2,
  Calendar,
  PieChart as PieIcon
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function ExpensesPage() {
  const { activeProperty, showToast } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    propertyId: '',
    category: 'food',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    description: '',
    vendorName: '',
    paymentMode: 'bank_transfer'
  });

  const categories = [
    { value: 'food', label: 'Food & Groceries (Mess)' },
    { value: 'electricity', label: 'Electricity & Power' },
    { value: 'water', label: 'Water & Tanker Supply' },
    { value: 'internet', label: 'High-Speed Internet / Fiber' },
    { value: 'maintenance', label: 'Repairs & Maintenance' },
    { value: 'salaries', label: 'Chef & Staff Salaries' },
    { value: 'cleaning', label: 'Housekeeping & Supplies' },
    { value: 'security', label: 'Security & CCTV' },
    { value: 'supplies', label: 'Provisions & Toiletries' },
    { value: 'rent', label: 'Property Lease / Rent' },
    { value: 'other', label: 'Miscellaneous' }
  ];

  const COLORS = ['#22c55e', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await api.getExpenses({
        propertyId: activeProperty?.id || '',
        category: categoryFilter,
        search
      });
      setExpenses(data.expenses || []);
      setBreakdown(data.breakdown || []);
      setTotalExpense(data.totalExpense || 0);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [activeProperty, categoryFilter, search]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createExpense({
        ...formData,
        propertyId: activeProperty?.id
      });
      showToast('Expense recorded successfully.', 'success');
      setModalOpen(false);
      fetchExpenses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.deleteExpense(id);
      showToast('Expense deleted.');
      fetchExpenses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Expense Management & Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">Track operational costs, mess groceries, utilities, and staff salaries</p>
        </div>

        <button
          onClick={() => {
            setFormData({
              propertyId: activeProperty?.id || '',
              category: 'food',
              amount: '',
              expenseDate: new Date().toISOString().split('T')[0],
              description: '',
              vendorName: '',
              paymentMode: 'bank_transfer'
            });
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Overview Cards & Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Recorded Expenses</div>
            <div className="text-3xl font-black text-rose-600 font-display mt-2">
              ₹{totalExpense.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-1">Across {expenses.length} transaction entries</div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
            <div className="text-[11px] font-bold text-slate-700">Top Spend Categories:</div>
            {breakdown.slice(0, 3).map((b, i) => (
              <div key={i} className="flex justify-between text-xs text-slate-600">
                <span className="capitalize">{b.category}</span>
                <span className="font-bold text-slate-900">₹{b.total?.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-sm text-slate-900 font-display">Category Distribution</h3>
            <p className="text-[11px] text-slate-400 mb-2">Cost breakdown proportion</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {breakdown.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="capitalize truncate text-slate-700">{b.category}:</span>
                  <span className="font-bold text-slate-900">₹{b.total?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-44 h-44 flex-shrink-0">
            {breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdown} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={60} innerRadius={35} paddingAngle={2}>
                    {breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Amount']} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search expense description or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">Loading expense ledger...</div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No expenses recorded</h3>
          <p className="text-xs text-slate-400 mt-1">Click "Add Expense" to record daily facility costs.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Vendor / Payee</th>
                  <th className="p-4">Mode</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Added By</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4 font-medium text-slate-700">{exp.expense_date}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold capitalize text-[10px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-900">{exp.description}</td>
                    <td className="p-4 text-slate-600">{exp.vendor_name || 'N/A'}</td>
                    <td className="p-4 uppercase font-bold text-[10px] text-slate-500">{exp.payment_mode}</td>
                    <td className="p-4 font-black text-rose-600 text-sm">₹{exp.amount?.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-slate-400 text-[11px]">{exp.added_by}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900 font-display">Record Operating Expense</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expense Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {categories.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-black text-rose-600"
                    placeholder="e.g. 4500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Purpose *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  placeholder="e.g. Weekly vegetables & dairy purchase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vendor / Store Name</label>
                  <input
                    type="text"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    placeholder="e.g. Krishna Wholesale Mart"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold uppercase"
                  >
                    <option value="bank_transfer">Direct Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </select>
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Expense Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
