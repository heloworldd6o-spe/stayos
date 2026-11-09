import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Receipt,
  Search,
  Plus,
  Filter,
  Calendar,
  CreditCard,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Download
} from 'lucide-react';

export default function InvoicesPage() {
  const { activeProperty, showToast } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Bulk generator state
  const [generating, setGenerating] = useState(false);

  // Selected Invoice Modal for View / Print
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await api.getInvoices({
        propertyId: activeProperty?.id || '',
        status: statusFilter,
        search
      });
      setInvoices(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [activeProperty, statusFilter, search]);

  const handleBulkGenerate = async () => {
    setGenerating(true);
    try {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const res = await api.generateMonthlyInvoices({
        propertyId: activeProperty?.id || null,
        month,
        year
      });
      showToast(res.message, 'success');
      fetchInvoices();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const openInvoiceView = async (id) => {
    try {
      const full = await api.getInvoice(id);
      setSelectedInvoice(full);
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Invoices & Rent Billing</h1>
          <p className="text-xs text-slate-500 mt-1">Manage monthly recurring rent invoices, dues, and GST receipts</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
            title="Auto generate monthly rent invoices for all active residents"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generating ? 'Generating...' : '⚡ Bulk Generate Monthly Invoices'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search invoice number, resident name, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="">All Invoice Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Fully Paid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="overdue">Overdue (Late)</option>
        </select>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">Loading invoices ledger...</div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No invoices found</h3>
          <p className="text-xs text-slate-400 mt-1">Generate monthly invoices or check search filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Resident</th>
                  <th className="p-4">Billing Period</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Paid</th>
                  <th className="p-4">Balance Due</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4 font-extrabold text-slate-900 font-display">
                      {inv.invoice_number}
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-900">{inv.resident_name}</div>
                      <div className="text-[11px] text-slate-400">Room {inv.room_number || 'N/A'} (Bed {inv.bed_number || 'N/A'})</div>
                    </td>

                    <td className="p-4 text-slate-600 font-medium">
                      {inv.billing_month}/{inv.billing_year}
                    </td>

                    <td className="p-4 font-black text-slate-900">
                      ₹{inv.total_amount?.toLocaleString('en-IN')}
                    </td>

                    <td className="p-4 font-bold text-emerald-600">
                      ₹{inv.paid_amount?.toLocaleString('en-IN')}
                    </td>

                    <td className="p-4">
                      {inv.balance_amount > 0 ? (
                        <span className="font-black text-rose-600">
                          ₹{inv.balance_amount?.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-[11px]">₹0 (Settled)</span>
                      )}
                    </td>

                    <td className="p-4 font-medium text-slate-700">
                      {inv.due_date}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : (inv.status === 'partially_paid' ? 'bg-amber-100 text-amber-800' : (inv.status === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'))}`}>
                        {inv.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => openInvoiceView(inv.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px]"
                      >
                        View & Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Controls */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-sm text-slate-900">Tax Invoice: {selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Sheet */}
            <div className="p-8 overflow-y-auto flex-1 printable-area space-y-6">
              {/* Org Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 font-display">{selectedInvoice.organization_name}</h2>
                  <div className="text-slate-500 mt-1">{selectedInvoice.property_name}</div>
                  <div className="text-slate-500">{selectedInvoice.property_address}, {selectedInvoice.property_city}</div>
                  <div className="text-slate-500">Contact: {selectedInvoice.property_phone}</div>
                  {selectedInvoice.gst_enabled && selectedInvoice.gst_number && (
                    <div className="text-[11px] font-bold text-slate-700 mt-1">GSTIN: {selectedInvoice.gst_number}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">TAX INVOICE</div>
                  <div className="text-base font-black text-slate-900 mt-1">{selectedInvoice.invoice_number}</div>
                  <div className="text-slate-500 mt-1">Date: {selectedInvoice.created_at?.split(' ')[0]}</div>
                  <div className="text-rose-600 font-bold">Due Date: {selectedInvoice.due_date}</div>
                </div>
              </div>

              {/* Billed To */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between">
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">BILLED TO:</div>
                  <div className="font-extrabold text-sm text-slate-900 mt-0.5">{selectedInvoice.resident_name}</div>
                  <div className="text-slate-500">{selectedInvoice.resident_phone} • {selectedInvoice.resident_email}</div>
                  <div className="text-slate-500">Room {selectedInvoice.room_number}, Bed {selectedInvoice.bed_number}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">BILLING PERIOD:</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedInvoice.period_start} to {selectedInvoice.period_end}</div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 font-medium text-slate-800">Monthly Accommodation & Room Rent</td>
                    <td className="py-3 text-right font-bold text-slate-900">₹{selectedInvoice.rent_amount?.toLocaleString('en-IN')}</td>
                  </tr>
                  {selectedInvoice.electricity_amount > 0 && (
                    <tr>
                      <td className="py-3 font-medium text-slate-800">Electricity & Utility Consumption Charges</td>
                      <td className="py-3 text-right font-bold text-slate-900">₹{selectedInvoice.electricity_amount?.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  {selectedInvoice.maintenance_amount > 0 && (
                    <tr>
                      <td className="py-3 font-medium text-slate-800">Common Maintenance & Housekeeping</td>
                      <td className="py-3 text-right font-bold text-slate-900">₹{selectedInvoice.maintenance_amount?.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  {selectedInvoice.late_fee_amount > 0 && (
                    <tr>
                      <td className="py-3 font-medium text-rose-600">Late Fee Charge</td>
                      <td className="py-3 text-right font-bold text-rose-600">₹{selectedInvoice.late_fee_amount?.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  {selectedInvoice.discount_amount > 0 && (
                    <tr>
                      <td className="py-3 font-medium text-emerald-600">Special Discount Deduction</td>
                      <td className="py-3 text-right font-bold text-emerald-600">-₹{selectedInvoice.discount_amount?.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="border-t border-slate-200 pt-4 space-y-1.5 max-w-xs ml-auto text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Grand Total:</span>
                  <span className="font-extrabold text-slate-900 text-sm">₹{selectedInvoice.total_amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Amount Paid:</span>
                  <span className="font-bold">₹{selectedInvoice.paid_amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-black border-t border-slate-200 pt-2 text-sm">
                  <span>Balance Payable:</span>
                  <span>₹{selectedInvoice.balance_amount?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400">
                This is a computer-generated tax invoice issued by StayOS. No physical signature is required.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
