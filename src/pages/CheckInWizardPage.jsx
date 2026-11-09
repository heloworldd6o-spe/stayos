import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  UserPlus,
  Building2,
  DoorOpen,
  Bed,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  FileCheck2,
  Calendar,
  Receipt
} from 'lucide-react';

export default function CheckInWizardPage({ prefilledBed, onComplete }) {
  const { activeProperty, properties, showToast } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Available vacant beds
  const [vacantBeds, setVacantBeds] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    fullName: '',
    gender: 'male',
    dob: '2000-01-01',
    phone: '+91 ',
    email: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: 'Father',
    permanentAddress: '',

    // Step 2: KYC & Stay
    idType: 'aadhaar',
    idNumber: '',
    propertyId: prefilledBed?.propertyId || activeProperty?.id || '',
    roomId: prefilledBed?.roomId || '',
    bedId: prefilledBed?.bedId || '',
    joiningDate: new Date().toISOString().split('T')[0],
    expectedCheckoutDate: '',
    occupation: 'working_professional',
    organizationOrCollege: '',
    foodPreference: 'veg',
    medicalNotes: '',

    // Step 3: Financials & Initial Settlement
    monthlyRent: prefilledBed?.monthlyRent || 12000,
    depositAmount: 20000,
    initialPaymentAmount: 32000,
    paymentMethod: 'upi',
    rentDueDay: 5
  });

  useEffect(() => {
    if (formData.propertyId) {
      api.getVacantBeds({ propertyId: formData.propertyId })
        .then(data => setVacantBeds(data))
        .catch(() => {});
    }
  }, [formData.propertyId]);

  const handleBedSelect = (bed) => {
    setFormData({
      ...formData,
      roomId: bed.room_id,
      bedId: bed.id,
      monthlyRent: bed.monthly_rent || 10000,
      initialPaymentAmount: (bed.monthly_rent || 10000) + formData.depositAmount
    });
  };

  const handleFinishCheckIn = async () => {
    setLoading(true);
    try {
      const res = await api.processCheckIn(formData);
      setSuccessData(res);
      setStep(4);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      showToast('🎉 Resident successfully onboarded!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Step-by-Step Resident Onboarding Wizard</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">New Resident Check-In</h1>
        <p className="text-xs text-slate-500 mt-1">Collect KYC, allocate vacant bed, and record initial deposit settlement</p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between max-w-xl mx-auto px-4">
        {[
          { num: 1, label: 'Personal & KYC' },
          { num: 2, label: 'Bed & Stay Plan' },
          { num: 3, label: 'Rent & Payment' },
          { num: 4, label: 'Activation' }
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition ${step === s.num ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : (step > s.num ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600')}`}>
              {step > s.num ? '✓' : s.num}
            </div>
            <span className={`text-xs font-semibold hidden sm:inline ${step === s.num ? 'text-slate-900' : 'text-slate-400'}`}>
              {s.label}
            </span>
            {idx < 3 && <div className="w-8 sm:w-12 h-0.5 bg-slate-200 ml-2"></div>}
          </div>
        ))}
      </div>

      {/* Step 1: Personal & KYC */}
      {step === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5 animate-fade-in text-xs">
          <h2 className="font-bold text-base text-slate-900 font-display border-b border-slate-100 pb-3">
            1. Personal & Contact Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                placeholder="e.g. Aarav Patel"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile Phone (+91) *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs"
                placeholder="+91 9849000000"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs"
                placeholder="resident@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ID Type</label>
              <select
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs"
              >
                <option value="aadhaar">Aadhaar Card (UIDAI)</option>
                <option value="passport">Passport</option>
                <option value="driving_license">Driving License</option>
                <option value="student_id">College / University ID</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">ID Number</label>
              <input
                type="text"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs uppercase"
                placeholder="e.g. 5432-8765-1098"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Emergency Contact Name</label>
              <input
                type="text"
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                placeholder="Parent / Guardian Name"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Emergency Phone</label>
              <input
                type="text"
                value={formData.emergencyContactPhone}
                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                placeholder="+91 9800000000"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Relation</label>
              <input
                type="text"
                value={formData.emergencyContactRelation}
                onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                placeholder="Father, Mother, Brother"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (!formData.fullName || !formData.phone || !formData.email) {
                  showToast('Please fill in Full Name, Phone, and Email.', 'error');
                  return;
                }
                setStep(2);
              }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2"
            >
              <span>Continue to Bed Selection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Bed Selection & Stay Plan */}
      {step === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5 animate-fade-in text-xs">
          <h2 className="font-bold text-base text-slate-900 font-display border-b border-slate-100 pb-3">
            2. Room Allocation & Lifestyle Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Property</label>
              <select
                value={formData.propertyId}
                onChange={(e) => setFormData({ ...formData, propertyId: e.target.value, bedId: '' })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Food Preference</label>
              <select
                value={formData.foodPreference}
                onChange={(e) => setFormData({ ...formData, foodPreference: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-emerald-700"
              >
                <option value="veg">Pure Vegetarian (Veg)</option>
                <option value="non_veg">Non-Vegetarian</option>
                <option value="eggetarian">Eggetarian</option>
                <option value="jain">Jain Food</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Occupation</label>
              <select
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs"
              >
                <option value="working_professional">Working Professional (IT/Corporate)</option>
                <option value="student">Student</option>
                <option value="business">Business / Entrepreneur</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company / College Name</label>
              <input
                type="text"
                value={formData.organizationOrCollege}
                onChange={(e) => setFormData({ ...formData, organizationOrCollege: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs"
                placeholder="e.g. Microsoft, Infosys, IIIT"
              />
            </div>
          </div>

          {/* Vacant Beds Selection Grid */}
          <div className="pt-3">
            <label className="block font-bold text-slate-900 mb-2">Select Vacant Bed from Inventory *</label>
            {vacantBeds.length === 0 ? (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-center font-medium">
                No vacant beds available in this property. Please add rooms or select another property.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto p-1">
                {vacantBeds.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleBedSelect(b)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${formData.bedId === b.id ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900">Bed {b.bed_number}</span>
                        {formData.bedId === b.id && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Room {b.room_number} • {b.ac_type === 'ac' ? 'AC' : 'Non-AC'}</div>
                    </div>
                    <div className="mt-2 font-black text-xs text-emerald-700">₹{b.monthly_rent?.toLocaleString('en-IN')}/mo</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!formData.bedId) {
                  showToast('Please select a vacant bed to assign.', 'error');
                  return;
                }
                setStep(3);
              }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2"
            >
              <span>Continue to Financial Settlement</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Financial Settlement & Deposit Collection */}
      {step === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5 animate-fade-in text-xs">
          <h2 className="font-bold text-base text-slate-900 font-display border-b border-slate-100 pb-3">
            3. Rent, Security Deposit & Initial Payment Collection
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Agreed Monthly Rent (₹) *</label>
              <input
                type="number"
                required
                value={formData.monthlyRent}
                onChange={(e) => setFormData({ ...formData, monthlyRent: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Security Deposit Amount (₹) *</label>
              <input
                type="number"
                required
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900"
              />
            </div>
          </div>

          {/* Payment Collection Summary Box */}
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
              <span>First Month Rent + Deposit Total:</span>
              <span className="text-base font-black">₹{(Number(formData.monthlyRent) + Number(formData.depositAmount)).toLocaleString('en-IN')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-emerald-200">
              <div>
                <label className="block font-semibold text-emerald-950 mb-1">Initial Amount Collected Today (₹)</label>
                <input
                  type="number"
                  value={formData.initialPaymentAmount}
                  onChange={(e) => setFormData({ ...formData, initialPaymentAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-black text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-emerald-950 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold uppercase"
                >
                  <option value="upi">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="cash">Cash (Counter Desk)</option>
                  <option value="bank_transfer">Direct IMPS / NEFT Transfer</option>
                  <option value="card">Debit / Credit Card</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleFinishCheckIn}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Processing Onboarding...' : '✓ Complete Check-In & Generate Receipt'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success & Activation View */}
      {step === 4 && successData && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display">Resident Successfully Onboarded!</h2>
            <p className="text-xs text-slate-500 mt-1">Bed {successData.bedAssigned} has been locked and marked occupied.</p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 max-w-md mx-auto text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Resident Name:</span>
              <span className="font-bold text-slate-900">{formData.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned Bed:</span>
              <span className="font-bold text-emerald-700">{successData.bedAssigned}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Initial Invoice Number:</span>
              <span className="font-bold text-slate-900">{successData.invoiceNumber}</span>
            </div>
            {successData.receiptNumber && (
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-emerald-700">
                <span>Verified Payment Receipt:</span>
                <span>#{successData.receiptNumber}</span>
              </div>
            )}
          </div>

          <div className="pt-3 flex justify-center gap-3">
            <button
              onClick={onComplete}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              Back to Resident Directory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
