import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  Home,
  CreditCard,
  UtensilsCrossed,
  ClipboardList,
  ShieldCheck,
  Megaphone,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Clock,
  Plus,
  X,
  Sparkles,
  Receipt,
  User,
  Users,
  Phone,
  Mail,
  DoorOpen,
  Bed,
  Building,
  MapPin,
  Calendar,
  Check,
  ExternalLink,
  ChevronRight,
  Shield,
  FileText
} from 'lucide-react';

export default function ResidentPortalPage({
  activeTab = 'resident_home',
  initialTab = 'resident_home',
  onNavigateTab
}) {
  const { user, resident, showToast } = useAuth();
  const [profile, setProfile] = useState(null);
  const [todayMeals, setTodayMeals] = useState(null);
  const [weeklyMeals, setWeeklyMeals] = useState([]);
  const [complaintsList, setComplaintsList] = useState([]);
  const [visitorsList, setVisitorsList] = useState([]);
  const [noticesList, setNoticesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active tab resolver (maps 'dashboard' to 'resident_home')
  const currentTab = (activeTab === 'dashboard' ? 'resident_home' : activeTab) || initialTab || 'resident_home';

  const navigateTo = (tabId) => {
    if (onNavigateTab) {
      onNavigateTab(tabId);
    }
  };

  // Selected Day for Weekly Meal Schedule
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const [selectedMealDay, setSelectedMealDay] = useState(todayDayName);

  // UPI Payment Modal
  const [payModal, setPayModal] = useState({ open: false, invoice: null });
  const [paying, setPaying] = useState(false);

  // Submit Complaint Modal
  const [complaintModal, setComplaintModal] = useState(false);
  const [complaintData, setComplaintData] = useState({
    category: 'electrical',
    title: '',
    description: '',
    priority: 'medium'
  });

  // Request Visitor Pass Modal
  const [visitorModal, setVisitorModal] = useState(false);
  const [visitorData, setVisitorData] = useState({
    visitorName: '',
    visitorPhone: '+91 ',
    relationship: 'Friend',
    purpose: 'Personal visit',
    visitDate: new Date().toISOString().split('T')[0],
    expectedTime: '05:00 PM'
  });

  const fetchResidentData = async () => {
    try {
      setLoading(true);
      let resId = resident?.id;
      let propId = resident?.property_id;

      if (!resId && user) {
        try {
          const me = await api.getMe();
          if (me?.resident?.id) {
            resId = me.resident.id;
            propId = me.resident.property_id;
          }
        } catch (e) {
          console.warn('getMe check in resident portal:', e);
        }
      }

      if (resId) {
        try {
          const full = await api.getResident(resId);
          setProfile(full);
          if (!propId && full?.property_id) propId = full.property_id;
        } catch (e) {
          console.warn('getResident error:', e);
        }
      }

      // Fetch today's meals
      try {
        const mealData = await api.getDailyMealStatus({ propertyId: propId || null });
        setTodayMeals(mealData || {});
      } catch (e) {
        setTodayMeals({});
      }

      // Fetch weekly meal schedule
      try {
        const schedule = await api.getMealSchedule(propId || null);
        setWeeklyMeals(schedule || []);
      } catch (e) {
        setWeeklyMeals([]);
      }

      // Fetch complaints
      try {
        const comps = await api.getComplaints();
        setComplaintsList(comps || []);
      } catch (e) {
        setComplaintsList([]);
      }

      // Fetch visitor passes
      try {
        const vists = await api.getVisitors();
        setVisitorsList(vists || []);
      } catch (e) {
        setVisitorsList([]);
      }

      // Fetch notices
      try {
        const nots = await api.getNotices({ propertyId: propId || null });
        setNoticesList(nots || []);
      } catch (e) {
        setNoticesList([]);
      }
    } catch (err) {
      console.error('Error in fetchResidentData:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidentData();
  }, [resident, user]);

  const handlePayInvoice = async () => {
    if (!payModal.invoice) return;
    setPaying(true);
    try {
      const inv = payModal.invoice;
      const order = await api.createPaymentOrder({
        invoiceId: inv.id,
        amount: inv.balance_amount
      });

      const verified = await api.verifyPayment({
        invoiceId: inv.id,
        amount: order.amount,
        paymentMethod: 'upi',
        gatewayOrderId: order.orderId,
        gatewayPaymentId: `TXN_UPI_${Date.now()}`,
        gatewaySignature: order.checksum
      });

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      showToast(`🎉 Payment of ₹${(verified.amount || inv.balance_amount || 0).toLocaleString('en-IN')} verified! Receipt #${verified.receiptNumber || 'REC-NEW'}`, 'success');
      setPayModal({ open: false, invoice: null });
      fetchResidentData();
    } catch (err) {
      showToast(err.message || 'Payment verification failed', 'error');
    } finally {
      setPaying(false);
    }
  };

  const handleMealOptOut = async (mealType, isOptedOut) => {
    try {
      const res = await api.setMealOptOut({
        mealType,
        isOptedOut: !isOptedOut
      });
      showToast(res.message || 'Meal preference updated', 'info');
      fetchResidentData();
    } catch (err) {
      showToast(err.message || 'Failed to update meal preference', 'error');
    }
  };

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    try {
      await api.submitComplaint(complaintData);
      showToast('Complaint logged successfully. Assigned to facility team.', 'success');
      setComplaintModal(false);
      setComplaintData({ category: 'electrical', title: '', description: '', priority: 'medium' });
      fetchResidentData();
    } catch (err) {
      showToast(err.message || 'Failed to submit complaint', 'error');
    }
  };

  const handleRequestVisitor = async (e) => {
    e.preventDefault();
    try {
      await api.requestVisitorPass(visitorData);
      showToast('Visitor gate pass requested! Warden will approve upon gate arrival.', 'success');
      setVisitorModal(false);
      fetchResidentData();
    } catch (err) {
      showToast(err.message || 'Failed to request visitor pass', 'error');
    }
  };

  const p = profile || resident || {
    full_name: user?.full_name || 'Resident',
    property_name: 'UrbanStay Madhapur',
    room_number: '101',
    bed_number: '101-A',
    monthly_rent: 16000,
    invoices: [],
    payments: [],
    roommates: []
  };

  const pendingInvoices = (p.invoices || []).filter(i => (i.balance_amount || 0) > 0);

  if (loading && !profile && !resident) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse py-8">
        <div className="h-36 bg-slate-200 rounded-3xl"></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 bg-slate-200 rounded-2xl"></div>
          <div className="h-20 bg-slate-200 rounded-2xl"></div>
          <div className="h-20 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-48 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 text-xs pb-16">
      {/* Resident Digital Key Header (Present across tabs) */}
      <div className="bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">StayOS Digital Key</span>
          </div>
          <h2 className="text-xl font-black font-display text-white mt-1">{p.full_name || user?.full_name}</h2>
          <div className="text-xs text-slate-300 mt-0.5">{p.property_name || 'Accommodation'}</div>
          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 font-bold flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Room {p.room_number || '101'}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-emerald-300" />
              <span>Bed {p.bed_number || '101-A'}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
              {p.room_type || 'Shared'} Room
            </div>
          </div>
        </div>

        <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Monthly Rent</div>
          <div className="text-xl font-black text-white font-display mt-0.5">₹{(p.monthly_rent || 12000).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-1">Due on {p.rent_due_day || 5}th of month</div>
        </div>
      </div>

      {/* Quick Navigation Pills for Top Mobile/Desktop Access */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          { id: 'resident_home', label: 'My Room & Stay', icon: Home },
          { id: 'resident_payments', label: 'Pay Rent & Dues', icon: CreditCard, count: pendingInvoices.length },
          { id: 'resident_food', label: 'Mess & Food', icon: UtensilsCrossed },
          { id: 'resident_complaints', label: 'Complaints', icon: ClipboardList, count: complaintsList.filter(c => c.status !== 'resolved').length },
          { id: 'resident_visitors', label: 'Visitors', icon: ShieldCheck },
          { id: 'resident_notices', label: 'Notices', icon: Megaphone, count: noticesList.length },
          { id: 'resident_docs', label: 'Documents', icon: FileCheck2 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigateTo(tab.id)}
              className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {Boolean(tab.count) && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: MY ROOM & STAY (HOME)                               */}
      {/* ========================================================= */}
      {currentTab === 'resident_home' && (
        <div className="space-y-4 animate-fade-in">
          {/* Outstanding Due Banner */}
          {pendingInvoices.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-sm flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900">
                    Pending Rent Invoice: ₹{(pendingInvoices[0]?.balance_amount || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Invoice #{pendingInvoices[0]?.invoice_number} • Due: {pendingInvoices[0]?.due_date}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPayModal({ open: true, invoice: pendingInvoices[0] })}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay via UPI</span>
              </button>
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setComplaintModal(true)}
              className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 text-center shadow-sm transition active:scale-95 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <ClipboardList className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-800">Log Repair</span>
            </button>

            <button
              type="button"
              onClick={() => setVisitorModal(true)}
              className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 text-center shadow-sm transition active:scale-95 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-800">Visitor Pass</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (pendingInvoices.length > 0) {
                  setPayModal({ open: true, invoice: pendingInvoices[0] });
                } else {
                  navigateTo('resident_payments');
                }
              }}
              className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 text-center shadow-sm transition active:scale-95 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-800">Pay Dues</span>
            </button>
          </div>

          {/* Room & Stay Specifications */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="font-extrabold text-sm text-slate-900 font-display flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>Room Specifications & Amenities</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">{p.building_name || 'Main Block'} • {p.floor_name || '1st Floor'}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Room Type</div>
                <div className="font-bold text-slate-800 text-xs mt-0.5 capitalize">{p.room_type || '2-Sharing'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Air Conditioning</div>
                <div className="font-bold text-slate-800 text-xs mt-0.5 uppercase">{p.ac_type || 'AC'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Bathroom</div>
                <div className="font-bold text-slate-800 text-xs mt-0.5 capitalize">{p.bathroom_type || 'Attached'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Security Deposit</div>
                <div className="font-bold text-slate-800 text-xs mt-0.5">₹{(p.deposit_amount || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-[11px]">
              <span className="text-emerald-800 font-medium">Joined on <strong>{p.joining_date || 'Active Stay'}</strong></span>
              <span className="text-emerald-700 font-semibold">Rent cycle: 1st - 30th</span>
            </div>
          </div>

          {/* Roommates Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="font-extrabold text-sm text-slate-900 font-display flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Roommates in Room {p.room_number || '101'}</span>
              </span>
            </div>

            {(!p.roommates || p.roommates.length === 0) ? (
              <div className="text-slate-500 py-3 text-center">
                You are currently the only resident allocated to this room.
              </div>
            ) : (
              <div className="space-y-2">
                {p.roommates.map(rm => (
                  <div key={rm.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                        {rm.full_name?.charAt(0) || 'R'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{rm.full_name}</div>
                        <div className="text-[10px] text-slate-400">Bed {rm.bed_number || 'N/A'}</div>
                      </div>
                    </div>
                    {rm.phone && (
                      <a href={`tel:${rm.phone}`} className="text-blue-600 font-bold hover:underline text-[11px] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>Contact</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Mess Quick View */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2 font-extrabold text-sm text-slate-900 font-display">
                <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                <span>Today's Mess Schedule</span>
              </span>
              <button
                type="button"
                onClick={() => navigateTo('resident_food')}
                className="text-emerald-600 font-bold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Timetable</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {((todayMeals?.meals || []).slice(0, 2)).map(m => (
                <div key={m.mealType} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold capitalize text-slate-900">{m.mealType}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${m.status === 'ready' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {m.status === 'ready' ? '🍽️ SERVING' : m.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{m.title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMealOptOut(m.mealType, m.isMyOptedOut)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                      m.isMyOptedOut ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {m.isMyOptedOut ? 'Skipping ✕' : 'Skip'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PAY RENT & DUES                                     */}
      {/* ========================================================= */}
      {currentTab === 'resident_payments' && (
        <div className="space-y-4 animate-fade-in">
          {/* Outstanding Balance Hero */}
          <div className="p-6 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Total Pending Dues</div>
              <div className="text-3xl font-black font-display mt-1">
                ₹{(pendingInvoices.reduce((sum, inv) => sum + (inv.balance_amount || 0), 0)).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-emerald-100 mt-1">
                {pendingInvoices.length > 0 ? `${pendingInvoices.length} invoice(s) pending payment` : 'All your dues are fully cleared!'}
              </div>
            </div>

            {pendingInvoices.length > 0 && (
              <button
                type="button"
                onClick={() => setPayModal({ open: true, invoice: pendingInvoices[0] })}
                className="px-5 py-3 rounded-2xl bg-white text-emerald-800 font-black text-xs shadow-lg hover:bg-emerald-50 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Pay ₹{(pendingInvoices[0]?.balance_amount || 0).toLocaleString('en-IN')} via UPI</span>
              </button>
            )}
          </div>

          {/* Invoices List */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="font-extrabold text-sm text-slate-900 font-display border-b border-slate-100 pb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <span>Rent Invoices</span>
            </div>

            {(p.invoices || []).length === 0 ? (
              <div className="text-center py-6 text-slate-400">No rent invoices issued yet.</div>
            ) : (
              <div className="space-y-3">
                {(p.invoices || []).map(inv => (
                  <div key={inv.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">#{inv.invoice_number}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Due Date: <strong>{inv.due_date}</strong> • Total: ₹{(inv.total_amount || 0).toLocaleString('en-IN')}
                      </div>
                      {inv.notes && <div className="text-[10px] text-slate-400 mt-0.5">{inv.notes}</div>}
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1">
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold sm:text-right">Balance Due</div>
                        <div className="font-black text-slate-900 text-base sm:text-right">₹{(inv.balance_amount || 0).toLocaleString('en-IN')}</div>
                      </div>
                      {inv.balance_amount > 0 && (
                        <button
                          type="button"
                          onClick={() => setPayModal({ open: true, invoice: inv })}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-sm transition active:scale-95 cursor-pointer mt-1"
                        >
                          Pay UPI
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Receipts History */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="font-extrabold text-sm text-slate-900 font-display border-b border-slate-100 pb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Settled Payment Receipts</span>
            </div>

            {(p.payments || []).length === 0 ? (
              <div className="text-center py-6 text-slate-400">No payment receipts on record.</div>
            ) : (
              <div className="space-y-2.5">
                {(p.payments || []).map(pay => (
                  <div key={pay.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">{pay.receipt_number}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {pay.payment_date} • Mode: <span className="uppercase font-bold text-slate-700">{pay.payment_method}</span>
                      </div>
                      {pay.transaction_id && (
                        <div className="text-[9px] font-mono text-slate-400">Txn: {pay.transaction_id}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-600 text-sm">₹{(pay.amount || 0).toLocaleString('en-IN')}</div>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                        Verified
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MESS & FOOD                                        */}
      {/* ========================================================= */}
      {currentTab === 'resident_food' && (
        <div className="space-y-4 animate-fade-in">
          {/* Today's Live Mess Schedule */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                <span className="font-extrabold text-sm text-slate-900 font-display">Today's Live Menu</span>
              </div>
              <span className="text-[11px] text-slate-500 font-bold capitalize">{todayMeals?.day || todayDayName}</span>
            </div>

            <div className="space-y-3">
              {(todayMeals?.meals || []).length === 0 ? (
                <div className="text-center py-6 text-slate-400">Chef is updating today's meal schedule.</div>
              ) : (
                (todayMeals?.meals || []).map(m => (
                  <div key={m.mealType} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold capitalize text-slate-900 text-sm">{m.mealType}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          m.status === 'ready' ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {m.status === 'ready' ? '🍽️ SERVING NOW' : m.status}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800 text-xs mt-1">{m.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{(m.menuItems || []).join(' • ')}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMealOptOut(m.mealType, m.isMyOptedOut)}
                      className={`px-3.5 py-2 rounded-xl font-bold text-[11px] transition flex-shrink-0 cursor-pointer ${
                        m.isMyOptedOut ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {m.isMyOptedOut ? 'Skipping ✕' : 'Skip Meal'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weekly Menu Timetable */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="font-extrabold text-sm text-slate-900 font-display flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Weekly Meal Schedule</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                7 Days Planned
              </span>
            </div>

            {/* Day Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {daysOfWeek.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedMealDay(day)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                    selectedMealDay === day
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {day.substring(0, 3)}
                </button>
              ))}
            </div>

            {/* Meals for selected day */}
            <div className="space-y-2.5 pt-2">
              {(() => {
                const dayPlans = weeklyMeals.filter(w => w.day_of_week === selectedMealDay);
                if (dayPlans.length === 0) {
                  return <div className="text-center py-6 text-slate-400">No meal plan published for {selectedMealDay}.</div>;
                }
                return dayPlans.map(plan => (
                  <div key={plan.id || plan.meal_type} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 capitalize text-xs">{plan.meal_type}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{plan.timing || 'Standard Timings'}</span>
                    </div>
                    <div className="font-semibold text-slate-800 text-[11px] mt-1">{plan.menu_title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {Array.isArray(plan.menu_items) ? plan.menu_items.join(' • ') : plan.menu_items}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: COMPLAINTS & REPAIRS                                */}
      {/* ========================================================= */}
      {currentTab === 'resident_complaints' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 font-display">My Maintenance & Complaint Tickets</h3>
            <button
              type="button"
              onClick={() => setComplaintModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log New Repair</span>
            </button>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            {complaintsList.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-800">No issues reported!</div>
                <div className="text-[11px] text-slate-400">Everything in your room is running smoothly.</div>
              </div>
            ) : (
              complaintsList.map(comp => (
                <div key={comp.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{comp.title}</span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase ${
                          comp.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                          comp.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {comp.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize mt-0.5">
                        Category: {comp.category} • Priority: {comp.priority}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {comp.created_at ? comp.created_at.substring(0, 10) : 'Recent'}
                    </span>
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">{comp.description}</p>

                  {comp.resolution_notes && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-800">
                      <strong>Resolution Note:</strong> {comp.resolution_notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: VISITORS & GATE PASS                                */}
      {/* ========================================================= */}
      {currentTab === 'resident_visitors' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 font-display">Visitor Gate Passes</h3>
            <button
              type="button"
              onClick={() => setVisitorModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Request Visitor Pass</span>
            </button>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            {visitorsList.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-800">No Visitor Passes</div>
                <div className="text-[11px] text-slate-400">Request a pass for friends, parents or delivery executives.</div>
              </div>
            ) : (
              visitorsList.map(vis => (
                <div key={vis.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{vis.visitor_name}</span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase ${
                        vis.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        vis.status === 'checked_in' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {vis.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {vis.relationship} • {vis.visitor_phone}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Visit Date: {vis.visit_date} • {vis.expected_time || 'General'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                      PASS #{vis.id ? vis.id.substring(0, 8).toUpperCase() : 'PASS'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: NOTICES & BROADCASTS                               */}
      {/* ========================================================= */}
      {currentTab === 'resident_notices' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="font-extrabold text-sm text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-3">
              <Megaphone className="w-4 h-4 text-emerald-600" />
              <span>Announcements & Property Notices</span>
            </div>

            {noticesList.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No active notices broadcasted.</div>
            ) : (
              <div className="space-y-3">
                {noticesList.map(n => (
                  <div key={n.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase ${
                        n.priority === 'urgent' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {n.priority || 'General'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{n.content}</p>
                    <div className="text-[10px] text-slate-400 pt-1">
                      Posted on {n.created_at ? n.created_at.substring(0, 10) : 'Recent'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: MY DOCUMENTS & KYC                                 */}
      {/* ========================================================= */}
      {currentTab === 'resident_docs' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="font-extrabold text-sm text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>KYC & Document Vault</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-emerald-900 text-xs">KYC Verification Status</span>
                </div>
                <div className="text-[11px] text-emerald-800">
                  Government ID verified. Your profile is formally registered under PG residency regulations.
                </div>
                <div className="text-[10px] font-semibold text-emerald-700">
                  ID Type: <span className="uppercase font-bold">{p.id_type || 'Aadhaar'}</span> • ID #{p.id_number || 'Registered'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-900 text-xs">Tenancy Agreement</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Standard PG Tenancy terms active from <strong>{p.joining_date || 'Date of Check-in'}</strong>.
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">
                  Notice Period: 30 Days before formal check-out
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="font-bold text-slate-900 text-xs mb-2">Emergency Contact Information</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div>Contact Name: <strong>{p.emergency_contact_name || 'Guardian'}</strong></div>
                <div>Relation: <strong>{p.emergency_contact_relation || 'Parent'}</strong></div>
                <div>Phone: <strong>{p.emergency_contact_phone || 'Registered on file'}</strong></div>
                <div>Permanent City: <strong>{p.permanent_address ? p.permanent_address.split(',')[0] : 'On record'}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SIMULATED UPI MODAL                                       */}
      {/* ========================================================= */}
      {payModal.open && payModal.invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 font-display">UPI Instant Rent Payment</h3>
              <button type="button" onClick={() => setPayModal({ open: false, invoice: null })} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">TOTAL PAYABLE:</div>
                <div className="text-3xl font-black text-slate-900 font-display mt-1">
                  ₹{(payModal.invoice.balance_amount || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Invoice #{payModal.invoice.invoice_number}</div>
              </div>

              {/* Dynamic QR Code Simulation */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center">
                <div className="w-36 h-36 bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="w-24 h-24 text-slate-900 mx-auto" />
                    <div className="text-[9px] font-bold text-emerald-700 uppercase mt-1">UPI VERIFIED QR</div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-2">stayos.urbanstay@upi</div>
              </div>

              <div className="text-[11px] text-slate-500">
                Tap button below to simulate server-side gateway transaction verification and instant receipt issuance.
              </div>

              <button
                type="button"
                disabled={paying}
                onClick={handlePayInvoice}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {paying ? 'Verifying with Bank...' : `Pay ₹${(payModal.invoice.balance_amount || 0).toLocaleString('en-IN')} via UPI`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LOG REPAIR MODAL                                          */}
      {/* ========================================================= */}
      {complaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 font-display">Log Room / Facility Repair</h3>
              <button type="button" onClick={() => setComplaintModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="p-6 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Category *</label>
                <select
                  value={complaintData.category}
                  onChange={(e) => setComplaintData({ ...complaintData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="electrical">⚡ Electrical (Fan, Light, Switch)</option>
                  <option value="plumbing">🚰 Plumbing (Tap, Geyser, Flush)</option>
                  <option value="cleaning">🧹 Housekeeping & Cleaning</option>
                  <option value="wifi">📶 Wi-Fi & Internet</option>
                  <option value="food">🍲 Food & Mess</option>
                  <option value="room">🚪 Room Furniture & Mattress</option>
                  <option value="security">🛡️ Security & Access</option>
                  <option value="other">📝 Other Request</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Geyser in room bathroom not heating"
                  value={complaintData.title}
                  onChange={(e) => setComplaintData({ ...complaintData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Explain the problem in detail..."
                  value={complaintData.description}
                  onChange={(e) => setComplaintData({ ...complaintData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComplaintModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REQUEST VISITOR PASS MODAL                                */}
      {/* ========================================================= */}
      {visitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 font-display">Request Visitor Entry Pass</h3>
              <button type="button" onClick={() => setVisitorModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestVisitor} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Visitor Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sumanth V"
                    value={visitorData.visitorName}
                    onChange={(e) => setVisitorData({ ...visitorData, visitorName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Visitor Phone *</label>
                  <input
                    type="text"
                    required
                    value={visitorData.visitorPhone}
                    onChange={(e) => setVisitorData({ ...visitorData, visitorPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Relationship</label>
                  <select
                    value={visitorData.relationship}
                    onChange={(e) => setVisitorData({ ...visitorData, relationship: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Friend">Friend / Colleague</option>
                    <option value="Parent">Parent / Guardian</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Delivery">Delivery / Courier</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expected Visit Time</label>
                  <input
                    type="text"
                    value={visitorData.expectedTime}
                    onChange={(e) => setVisitorData({ ...visitorData, expectedTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVisitorModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  Issue Digital Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
