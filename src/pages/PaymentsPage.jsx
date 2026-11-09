import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CreditCard,
  Search,
  Plus,
  Printer,
  X,
  CheckCircle2,
  Calendar,
  Receipt,
  Building2,
  ArrowUpRight
} from 'lucide-react';

export default function PaymentsPage() {
  const { activeProperty, showToast } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Record Offline Payment Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [residents, setResidents] = useState([]);
  const [residentInvoices, setResidentInvoices] = useState([]);

  const [formData, setFormData] = useState({
    residentId: '',
    invoiceId: '',
    amount: '',
    paymentMethod: 'cash',
    transactionReference: '',
    notes: 'Counter payment collected'
  });

  // Selected Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await api.getPayments({
        propertyId: activeProperty?.id || '',
        method: methodFilter,
        search
      });
      setPayments(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [activeProperty, methodFilter, search]);

  const openRecordModal = async () => {
    try {
      const resList = await api.getResidents({ propertyId: activeProperty?.id || '', status: 'active' });
      setResidents(resList);
      setFormData({
        residentId: '',
        invoiceId: '',
        amount: '',
        paymentMethod: 'upi',
        transactionReference: '',
        notes: 'Counter payment verified'
      });
      setResidentInvoices([]);
      setModalOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResidentSelect = async (resId) => {
    setFormData({ ...formData, residentId: resId, invoiceId: '', amount: '' });
    try {
      const invList = await api.getInvoices({ residentId: resId, status: 'all' });
      const pendingOnes = invList.filter(i => i.balance_amount > 0);
      setResidentInvoices(pendingOnes);
      if (pendingOnes.length > 0) {
        setFormData(prev => ({
          ...prev,
          residentId: resId,
          invoiceId: pendingOnes[0].id,
          amount: pendingOnes[0].balance_amount
        }));
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.recordOfflinePayment(formData);
      showToast(`Payment of ₹${res.amount?.toLocaleString('en-IN')} recorded. Receipt #${res.receiptNumber}`, 'success');
      setModalOpen(false);
      fetchPayments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openReceiptView = async (id) => {
    try {
      const full = await api.getPaymentReceipt(id);
      setSelectedReceipt(full);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Payments & Receipts Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">Verified UPI, cash, and bank collections with tamper-proof receipts</p>
        </div>

        <button
          onClick={openRecordModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Record Counter Payment</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search receipt #, transaction ID, or resident name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="">All Payment Modes</option>
          <option value="upi">UPI (GPay, PhonePe, Paytm)</option>
          <option value="cash">Cash (Counter Desk)</option>
          <option value="bank_transfer">Bank Transfer / IMPS</option>
          <option value="card">Card Payment</option>
        </select>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">Loading payment ledger...</div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No payment records found</h3>
          <p className="text-xs text-slate-400 mt-1">Record offline payment or check search criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Receipt #</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Resident</th>
                  <th className="p-4">Amount Paid</th>
                  <th className="p-4">Payment Mode</th>
                  <th className="p-4">Transaction Ref</th>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4 font-extrabold text-slate-900 font-display">
                      {pay.receipt_number}
                    </td>

                    <td className="p-4 text-slate-600 font-medium">
                      {pay.payment_date}
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-900">{pay.resident_name}</div>
                      <div className="text-[11px] text-slate-400">Room {pay.room_number || 'N/A'} (Bed {pay.bed_number || 'N/A'})</div>
                    </td>

                    <td className="p-4 font-black text-emerald-600 text-sm">
                      ₹{pay.amount?.toLocaleString('en-IN')}
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold uppercase">
                        {pay.payment_method}
                      </span>
                    </td>

                    <td className="p-4 text-slate-500 text-[11px] font-mono truncate max-w-[140px]">
                      {pay.transaction_id}
                    </td>

                    <td className="p-4 font-medium text-slate-700">
                      {pay.invoice_number || 'Direct Payment'}
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => openReceiptView(pay.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px]"
                      >
                        Print Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900 font-display">Record Counter / Desk Payment</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Resident *</label>
                <select
                  required
                  value={formData.residentId}
                  onChange={(e) => handleResidentSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="">-- Choose Resident --</option>
                  {residents.map(r => (
                    <option key={r.id} value={r.id}>{r.full_name} (Room {r.room_number || 'N/A'})</option>
                  ))}
                </select>
              </div>

              {formData.residentId && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Pending Invoice</label>
                  {residentInvoices.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 text-slate-500 text-[11px]">
                      No pending balance due for this resident.
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.invoiceId}
                      onChange={(e) => {
                        const inv = residentInvoices.find(i => i.id === e.target.value);
                        setFormData({ ...formData, invoiceId: e.target.value, amount: inv ? inv.balance_amount : '' });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      {residentInvoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} (Balance Due: ₹{inv.balance_amount?.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Collected (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-black text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold uppercase"
                  >
                    <option value="upi">UPI (GPay / PhonePe)</option>
                    <option value="cash">Counter Cash</option>
                    <option value="bank_transfer">Bank Transfer / IMPS</option>
                    <option value="card">Card POS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / UTR (Optional)</label>
                <input
                  type="text"
                  value={formData.transactionReference}
                  onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  placeholder="e.g. UPI Ref # or Cash Note"
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
                  Record Payment & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-sm text-slate-900">Payment Receipt: {selectedReceipt.receipt_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button onClick={() => setSelectedReceipt(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1 printable-area space-y-6">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 font-display">{selectedReceipt.organization_name}</h2>
                  <div className="text-slate-500 mt-0.5">{selectedReceipt.property_name}</div>
                  <div className="text-slate-500">{selectedReceipt.property_address}, {selectedReceipt.property_city}</div>
                  {selectedReceipt.gst_enabled && selectedReceipt.gst_number && (
                    <div className="text-[11px] font-bold text-slate-700 mt-1">GSTIN: {selectedReceipt.gst_number}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">OFFICIAL RECEIPT</div>
                  <div className="text-base font-black text-slate-900 mt-1">{selectedReceipt.receipt_number}</div>
                  <div className="text-slate-500 mt-1">{selectedReceipt.payment_date}</div>
                </div>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <div className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider">RECEIVED FROM:</div>
                  <div className="font-black text-base text-slate-900 mt-0.5">{selectedReceipt.resident_name}</div>
                  <div className="text-slate-600">Room {selectedReceipt.room_number || 'N/A'}, Bed {selectedReceipt.bed_number || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider">AMOUNT PAID:</div>
                  <div className="font-black text-2xl text-emerald-700 font-display">₹{selectedReceipt.amount?.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span>Payment Mode:</span>
                  <span className="font-bold uppercase text-slate-900">{selectedReceipt.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction ID:</span>
                  <span className="font-mono text-slate-900">{selectedReceipt.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target Invoice:</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.invoice_number || 'Ad-Hoc Settlement'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Invoice Balance:</span>
                  <span className="font-bold text-slate-900">₹{selectedReceipt.remaining_balance?.toLocaleString('en-IN') || 0}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 text-center text-[10px] text-slate-400">
                Thank you for your payment! This is an electronically verified StayOS receipt.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
