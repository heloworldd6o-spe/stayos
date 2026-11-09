import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  LogOut,
  X,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Bed,
  CreditCard,
  DollarSign
} from 'lucide-react';

export default function CheckOutModal({ resident, onClose, onSuccess }) {
  const { showToast } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [calcData, setCalcData] = useState(null);

  const [deductions, setDeductions] = useState(0);
  const [deductionReason, setDeductionReason] = useState('Room cleaning / wall paint touchup');
  const [notes, setNotes] = useState('Formal check-out settlement processed');
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const fetchCalculation = async (deductAmt) => {
    try {
      setLoading(true);
      const data = await api.calculateCheckOut({
        residentId: resident.id,
        deductions: Number(deductAmt) || 0
      });
      setCalcData(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resident) {
      fetchCalculation(deductions);
    }
  }, [resident]);

  const handleDeductionChange = (val) => {
    const num = Number(val) || 0;
    setDeductions(num);
    fetchCalculation(num);
  };

  const handleExecuteCheckout = async () => {
    setSettling(true);
    try {
      const depositToRefund = Math.max(0, calcData.netRefundable);
      const duesToCollect = calcData.netRefundable < 0 ? Math.abs(calcData.netRefundable) : 0;

      const res = await api.settleCheckOut({
        residentId: resident.id,
        deductions,
        deductionReason,
        depositRefunded: depositToRefund,
        duesSettled: duesToCollect,
        paymentMethod,
        notes
      });

      showToast(`Check-out complete! Bed ${resident.bed_number} released. Receipt #${res.settlementReceiptNumber}`, 'success');
      onSuccess();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSettling(false);
    }
  };

  if (!resident) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 font-display">Resident Check-Out & Settlement</h3>
              <p className="text-[11px] text-slate-500">Calculate final dues, deposit return, and bed clearance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !calcData ? (
          <div className="p-12 text-center text-slate-400">Calculating settlement ledger...</div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Resident Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-sm text-slate-900">{calcData.resident.fullName}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Room {calcData.resident.roomNumber} (Bed {calcData.resident.bedNumber}) • {calcData.resident.propertyName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400">Joining Date</div>
                <div className="font-bold text-slate-800">{calcData.resident.joiningDate}</div>
              </div>
            </div>

            {/* Financial Calculations Breakdown */}
            <div className="space-y-2 border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
              <div className="flex justify-between items-center text-slate-700">
                <span>Security Deposit Held:</span>
                <span className="font-bold text-slate-900">₹{calcData.depositPaid.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center text-rose-600">
                <span>Less: Unpaid Pending Rent Invoices:</span>
                <span className="font-bold">-₹{calcData.pendingDues.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-700">Damage / Maintenance Deductions (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={deductions}
                  onChange={(e) => handleDeductionChange(e.target.value)}
                  className="w-28 px-2 py-1 border border-slate-300 rounded-lg text-right font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-1">
                <input
                  type="text"
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-[11px] text-slate-600"
                  placeholder="Deduction reason (e.g. Deep cleaning / painting)"
                />
              </div>

              {/* Net Settlement Total */}
              <div className={`mt-3 pt-3 border-t-2 border-dashed flex justify-between items-center font-extrabold text-sm ${calcData.netRefundable >= 0 ? 'text-emerald-700 border-emerald-200 bg-emerald-50/80 -mx-4 -mb-4 p-4 rounded-b-2xl' : 'text-rose-700 border-rose-200 bg-rose-50/80 -mx-4 -mb-4 p-4 rounded-b-2xl'}`}>
                <span>{calcData.netRefundable >= 0 ? 'Net Deposit Amount to Refund:' : 'Resident Owes Pending Balance:'}</span>
                <span className="text-base font-black">₹{Math.abs(calcData.netRefundable).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Settlement Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold uppercase"
                >
                  <option value="upi">UPI Transfer</option>
                  <option value="cash">Counter Cash</option>
                  <option value="bank_transfer">Direct Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-600"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={settling}
                onClick={handleExecuteCheckout}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{settling ? 'Settling...' : 'Release Bed & Finalize Check-Out'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
