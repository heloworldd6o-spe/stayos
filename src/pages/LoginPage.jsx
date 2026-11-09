import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Sparkles,
  ArrowRight,
  Shield,
  ChefHat,
  Wrench,
  Users,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';

export default function LoginPage({ onBackToLanding, initialMode = 'login' }) {
  const { login, register, switchRole, showToast } = useAuth();
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login form state
  const [email, setEmail] = useState('owner@urbanstay.com');
  const [password, setPassword] = useState('password123');

  // Register form state
  const [regData, setRegData] = useState({
    orgName: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    propertyName: '',
    city: 'Hyderabad',
    planCode: 'growth'
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      showToast(err.message || 'Login failed. Check credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(regData);
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'owner', email: 'owner@urbanstay.com', title: 'Property Owner', name: 'Rajesh Sharma', badge: 'Full Org & P&L', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
    { role: 'manager', email: 'manager@urbanstay.com', title: 'Property Manager', name: 'Vikram Reddy', badge: 'Beds & Check-Ins', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
    { role: 'accountant', email: 'accountant@urbanstay.com', title: 'Accountant', name: 'Priya Nair', badge: 'Invoices & Ledger', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
    { role: 'warden', email: 'warden@urbanstay.com', title: 'Warden', name: 'Suresh Kumar', badge: 'Gate & Attendance', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' },
    { role: 'receptionist', email: 'reception@urbanstay.com', title: 'Receptionist', name: 'Ananya Sen', badge: 'Front Desk & Gate', color: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100' },
    { role: 'chef', email: 'chef@urbanstay.com', title: 'Chef Ramu', name: 'Kitchen Master', badge: 'Food KDS Live', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
    { role: 'kitchen_staff', email: 'kitchen@urbanstay.com', title: 'Kitchen Staff', name: 'Mani Shankar', badge: 'Prep Checklist', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
    { role: 'maintenance', email: 'maintenance@urbanstay.com', title: 'Maintenance', name: 'Karthik Verma', badge: 'Repair Work Orders', color: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' },
    { role: 'resident', email: 'resident@urbanstay.com', title: 'Resident (Aarav)', name: 'Room 101 / 101-A', badge: 'UPI Rent & Mess', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
    { role: 'super_admin', email: 'admin@stayos.com', title: 'Super Admin', name: 'Platform Admin', badge: 'All Tenants', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 mb-4 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <span>← Back to StayOS Home</span>
        </button>

        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center text-slate-950 font-black font-display text-2xl shadow-xl shadow-emerald-500/20 mx-auto">
          S
        </div>
        <h2 className="mt-4 text-3xl font-black text-white font-display tracking-tight">
          {isRegister ? 'Register Your PG / Hostel' : 'Sign in to StayOS'}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          {isRegister ? 'Set up your multi-tenant organization in under 60 seconds.' : 'Select a 1-click role demo below or enter your credentials.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl">
          {/* Tab switch */}
          <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800">
            <button
              onClick={() => setIsRegister(false)}
              className={`w-1/2 py-2 text-xs font-bold rounded-lg transition ${!isRegister ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsRegister(true)}
              className={`w-1/2 py-2 text-xs font-bold rounded-lg transition ${isRegister ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              New Organization
            </button>
          </div>

          {!isRegister ? (
            <div>
              {/* Demo Role Switcher Quick Pill Grid */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Instant 1-Click Role Logins (All 10 Roles):</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {demoAccounts.map(acc => (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => switchRole(acc.role)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition active:scale-95 ${acc.color}`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{acc.title}</span>
                      </div>
                      <div className="text-[10px] opacity-80 mt-0.5 truncate">{acc.badge}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-3 text-slate-500 font-bold">Or sign in with email</span></div>
              </div>

              {/* Standard Email Login */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                      placeholder="e.g. owner@urbanstay.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                </button>
              </form>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Organization / Brand Name</label>
                  <input
                    type="text"
                    required
                    value={regData.orgName}
                    onChange={(e) => setRegData({ ...regData, orgName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Hyderabad PG Co-Living"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    required
                    value={regData.fullName}
                    onChange={(e) => setRegData({ ...regData, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Rajesh Sharma"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="contact@yourpg.in"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone (+91)</label>
                  <input
                    type="text"
                    required
                    value={regData.phone}
                    onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">First Property Name</label>
                  <input
                    type="text"
                    required
                    value={regData.propertyName}
                    onChange={(e) => setRegData({ ...regData, propertyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Madhapur Wing 1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={regData.city}
                    onChange={(e) => setRegData({ ...regData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Hyderabad"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Password</label>
                <input
                  type="password"
                  required
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="At least 6 characters"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Creating Organization...' : 'Create StayOS Organization'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
