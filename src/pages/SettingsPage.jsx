import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Receipt,
  Bell,
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Clock,
  ShieldAlert,
  Percent,
  FileText
} from 'lucide-react';

export default function SettingsPage() {
  const { organization, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState(null);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    invoice_prefix: 'STAY-',
    gst_enabled: false,
    gstin: '',
    gst_percentage: 5,
    rent_due_day: 5,
    grace_period_days: 5,
    late_fee_type: 'fixed',
    late_fee_amount: 250,
    notification_email_enabled: true,
    notification_sms_enabled: true,
    notification_whatsapp_enabled: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getOrgSettings();
      if (res?.data) {
        setFormData({
          name: res.data.name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          address: res.data.address || '',
          currency: res.data.currency || 'INR',
          timezone: res.data.timezone || 'Asia/Kolkata',
          invoice_prefix: res.data.invoice_prefix || 'STAY-',
          gst_enabled: Boolean(res.data.gst_enabled),
          gstin: res.data.gstin || '',
          gst_percentage: res.data.gst_percentage || 5,
          rent_due_day: res.data.rent_due_day || 5,
          grace_period_days: res.data.grace_period_days || 5,
          late_fee_type: res.data.late_fee_type || 'fixed',
          late_fee_amount: res.data.late_fee_amount || 250,
          notification_email_enabled: res.data.notification_email_enabled !== 0,
          notification_sms_enabled: res.data.notification_sms_enabled !== 0,
          notification_whatsapp_enabled: res.data.notification_whatsapp_enabled !== 0
        });
      }
    } catch (err) {
      console.error('Failed to load org settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.updateOrgSettings(formData);
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      if (refreshProfile) refreshProfile();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerCron = async () => {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await api.triggerDailyCron();
      setCronResult(res?.data || { message: 'Cron job executed successfully' });
    } catch (err) {
      alert(err.message || 'Failed to trigger cron job');
    } finally {
      setCronRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 font-display">Organization & System Settings</h1>
        <p className="text-slate-500 text-xs mt-1">
          Configure business rules, tax registration, rent cycles, invoice styling & automated routines.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm gap-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`py-3.5 px-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'general' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          General & Profile
        </button>
        <button
          onClick={() => setActiveTab('rent')}
          className={`py-3.5 px-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'rent' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Rent Cycles & Policies
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          className={`py-3.5 px-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'tax' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          GST & Invoice Prefixes
        </button>
        <button
          onClick={() => setActiveTab('cron')}
          className={`py-3.5 px-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'cron' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Background Automations
        </button>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {activeTab === 'general' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" /> Organization Profile
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Brand Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Contact Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Phone Number (+91)</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Currency & Timezone</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    name="currency"
                    value={formData.currency}
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-bold"
                  />
                  <input
                    type="text"
                    name="timezone"
                    value={formData.timezone}
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-bold"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Registered Address</label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rent' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" /> Rent Collection Rules
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rent Due Day of Month</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="28"
                    name="rent_due_day"
                    value={formData.rent_due_day}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-500 whitespace-nowrap">th of month</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Grace Period (Days)</label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  name="grace_period_days"
                  value={formData.grace_period_days}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Late Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  name="late_fee_amount"
                  value={formData.late_fee_amount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <span className="font-bold">Automated Rule:</span> Invoices generated on the 1st of every month become overdue if unpaid by day {Number(formData.rent_due_day) + Number(formData.grace_period_days)}, applying the configured late fee.
            </div>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" /> Invoicing & GST Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Number Prefix</label>
                <input
                  type="text"
                  name="invoice_prefix"
                  value={formData.invoice_prefix}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <div className="text-[10px] text-slate-400 mt-1">Example: {formData.invoice_prefix}2026-0042</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GST Tax Status</label>
                <div className="flex items-center gap-3 mt-2">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      name="gst_enabled"
                      checked={formData.gst_enabled}
                      onChange={handleChange}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Enable GST on Invoices</span>
                  </label>
                </div>
              </div>

              {formData.gst_enabled && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number (15 digits)</label>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="36AAAAA0000A1Z5"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Default GST Rate (%)</label>
                    <select
                      name="gst_percentage"
                      value={formData.gst_percentage}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="0">0% (Exempt)</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cron' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-emerald-600" /> Daily Cron Automations
            </h3>
            <p className="text-xs text-slate-500">
              StayOS runs background cron jobs every midnight to calculate upcoming rent due dates, issue automated in-app alerts, flag overdue balances, and compile chef headcounts.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Run Automated Daily Cycle Now</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Executes reminder dispatch, meal headcount, and overdue invoice check</div>
              </div>
              <button
                type="button"
                onClick={handleTriggerCron}
                disabled={cronRunning}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition"
              >
                <Play className={`w-3.5 h-3.5 ${cronRunning ? 'animate-spin' : ''}`} />
                {cronRunning ? 'Executing Cycle...' : 'Trigger Now'}
              </button>
            </div>

            {cronResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-mono space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" /> Automated Cycle Completed
                </div>
                <div>Reminders Dispatched: {cronResult.reminders_dispatched || 0}</div>
                <div>Overdue Invoices Processed: {cronResult.overdue_processed || 0}</div>
                <div>Meal Attendance Logs Created: {cronResult.meals_logged || 0}</div>
                <div className="text-[10px] text-slate-500 mt-1">Timestamp: {new Date().toLocaleTimeString()}</div>
              </div>
            )}
          </div>
        )}

        {activeTab !== 'cron' && (
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10 transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
