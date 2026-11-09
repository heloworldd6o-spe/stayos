import React, { useState } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  UtensilsCrossed,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Shield,
  Smartphone,
  BarChart3,
  Check,
  Star,
  Lock,
  Clock,
  ChefHat,
  Wrench
} from 'lucide-react';

export default function LandingPage({ onGetStarted, onLogin, onSelectRole }) {
  const [billingAnnual, setBillingAnnual] = useState(true);

  const handleLoginClick = () => {
    if (onLogin) onLogin();
  };

  const handleGetStartedClick = () => {
    if (onGetStarted) onGetStarted();
  };

  const handleRoleClick = (role) => {
    if (onSelectRole) {
      onSelectRole(role);
    } else if (onLogin) {
      onLogin();
    }
  };

  const quickRoles = [
    { role: 'owner', label: 'Property Owner', icon: Building2, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' },
    { role: 'manager', label: 'Property Manager', icon: Users, color: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30' },
    { role: 'chef', label: 'Head Chef (KDS)', icon: ChefHat, color: 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30' },
    { role: 'resident', label: 'Resident (UPI Pay)', icon: Smartphone, color: 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30' },
    { role: 'accountant', label: 'Accountant', icon: CreditCard, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' },
    { role: 'super_admin', label: 'Super Admin', icon: Shield, color: 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30' }
  ];

  const features = [
    { icon: Building2, title: 'Multi-Property & Beds', desc: 'Manage unlimited buildings, floors, rooms, and individual bed status with visual matrices.' },
    { icon: Users, title: 'Instant Check-Ins & KYC', desc: 'Digital onboarding, Aadhaar ID verification, rental agreements, and welcome receipts.' },
    { icon: CreditCard, title: 'UPI & Automated Rent', desc: 'Dynamic UPI QR codes, instant receipts, automated overdue late fees, and reminders.' },
    { icon: UtensilsCrossed, title: 'Chef KDS & Mess Alerts', desc: 'Weekly meal schedules, live meal count tracking, and 1-click "Food Ready" resident notifications.' },
    { icon: ShieldCheck, title: 'Visitors & Security Pass', desc: 'Resident visitor entry requests, warden gate approval passes, and check-in/out logs.' },
    { icon: BarChart3, title: 'Financials & GST Reports', desc: 'Real-time occupancy analytics, P&L statements, expense categorization, and CSV/PDF exports.' }
  ];

  const roleHighlights = [
    {
      role: 'For Property Owners',
      badge: 'Revenue & Oversight',
      desc: 'Complete financial transparency across all PG branches. Track real-time occupancy %, overdue collections, verified bank transfers, and net profit margins from your phone.',
      points: ['Multi-property consolidated dashboard', 'Automated rent reminders on WhatsApp', 'Configurable GST and invoice numbering']
    },
    {
      role: 'For Property Managers & Wardens',
      badge: 'Zero Operational Chaos',
      desc: 'Never double-book a bed again. Quickly search vacant beds, allocate residents, record counter cash, approve visitor passes, and assign repair tickets.',
      points: ['1-Click Check-In and Check-Out workflows', 'Automated deposit refund & damage settlement', 'Digital staff attendance logging']
    },
    {
      role: 'For Residents & Stayers',
      badge: 'Mobile-First App',
      desc: 'A premium resident app where stayers can view their room, pay rent via UPI with instant receipt downloads, check today’s mess menu, and log repair requests.',
      points: ['Zero-friction UPI QR rent payments', 'Meal schedule & 1-click meal skip toggle', 'Digital gate passes & repair tracking']
    },
    {
      role: 'For Chefs & Kitchen Staff',
      badge: 'Kitchen Display System (KDS)',
      desc: 'An ultra-simple kitchen display screen showing expected meal counts for breakfast, lunch, and dinner. Click once when food is ready to notify all residents.',
      points: ['Automated headcount minus resident opt-outs', '1-Click "Food Ready" broadcast alert', 'Weekly South & North Indian menu planner']
    }
  ];

  const plans = [
    {
      name: 'Starter PG',
      desc: 'For single PG or hostel owners managing up to 50 beds.',
      priceMonthly: 1499,
      priceAnnual: 1199,
      beds: 'Up to 50 Beds',
      properties: '1 Property',
      features: ['Room & Bed Matrix', 'Resident KYC & ID Vault', 'Rent & Deposit Invoicing', 'UPI Receipts & Ledgers', 'Complaints Management', 'Email Support']
    },
    {
      name: 'Growth Co-Living',
      desc: 'Best for expanding multi-property PG businesses.',
      priceMonthly: 3499,
      priceAnnual: 2799,
      beds: 'Up to 200 Beds',
      properties: '3 Properties',
      popular: true,
      features: ['Everything in Starter', 'Multi-Property Selector', 'Chef Live KDS & Mess Menu', 'WhatsApp Payment Reminders', 'Staff Attendance Roster', 'Maintenance Cost Tracking', 'Priority Support']
    },
    {
      name: 'Professional Chain',
      desc: 'For large student hostels and co-living operators.',
      priceMonthly: 6999,
      priceAnnual: 5599,
      beds: 'Up to 600 Beds',
      properties: '10 Properties',
      features: ['Everything in Growth', 'Custom Invoice Branding', 'GST Compliant Invoicing', 'Visitor Gate Pass System', '10 Role-Based RBAC Accounts', 'Automated Cron Schedulers', 'Dedicated Account Manager']
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="h-20 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center text-slate-950 font-black font-display text-xl shadow-lg shadow-emerald-500/20">
            S
          </div>
          <div>
            <div className="font-black text-white text-xl tracking-tight font-display flex items-center gap-2">
              <span>StayOS</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-widest uppercase">PG OS</span>
            </div>
            <div className="text-xs text-slate-400 font-medium">Enterprise Accommodation Platform</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLoginClick}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={handleGetStartedClick}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-28 px-4 md:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen Operating System for PGs, Hostels & Co-Living</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white font-display tracking-tight max-w-5xl mx-auto leading-[1.1]">
          Run Your PG & Hostel <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">From One Single Platform.</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
          Manage residents, beds, rent, UPI payments, chef food schedules, staff attendance, complaints, and daily operations with zero paperwork.
        </p>

        {/* Hero CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleGetStartedClick}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-base shadow-xl shadow-emerald-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Managing Your Property</span>
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleLoginClick}
            className="w-full sm:w-auto px-7 py-4 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/80 hover:bg-slate-800 text-white font-bold text-base transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Sign In / Demo Accounts</span>
          </button>
        </div>

        {/* 1-Click Instant Demo Role Launcher Banner */}
        <div className="mt-10 p-5 bg-slate-950/80 border border-slate-800 rounded-2xl max-w-4xl mx-auto shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Click any role below to launch the live application immediately:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {quickRoles.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleRoleClick(item.role)}
                  className={`p-3 rounded-xl border text-left transition active:scale-95 flex flex-col items-center text-center gap-1.5 cursor-pointer ${item.color}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-bold tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Badges / Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { label: 'Occupancy Boost', value: '+35%', desc: 'Faster empty bed allocation' },
            { label: 'Rent Collection', value: '100% On-Time', desc: 'With automated UPI reminders' },
            { label: 'Food Waste', value: '-40%', desc: 'Live daily headcount tracking' },
            { label: 'Roles Supported', value: '10 Portals', desc: 'Owner, Chef, Resident & Staff' }
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-center">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-display">{stat.value}</div>
              <div className="text-xs font-bold text-white mt-1">{stat.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-slate-950/60 border-y border-slate-800 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white font-display">
              Everything Your PG & Hostel Needs to Scale
            </h2>
            <p className="mt-3 text-slate-400 text-sm md:text-base">
              Built specifically for Indian PG accommodations, student hostels, and co-living chains.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition group hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-display mb-2">{feat.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Role-Specific Workflows */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white font-display">
            Tailored Experiences for Everyone in Your Facility
          </h2>
          <p className="mt-3 text-slate-400 text-sm md:text-base">
            Dedicated interfaces and strict role authorization for owners, managers, chefs, and stayers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {roleHighlights.map((rh, i) => (
            <div key={i} className="p-8 rounded-2xl bg-slate-800/30 border border-slate-800 hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">{rh.badge}</span>
              </div>
              <h3 className="text-2xl font-bold text-white font-display mb-3">{rh.role}</h3>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">{rh.desc}</p>
              <div className="space-y-2.5">
                {rh.points.map((pt, j) => (
                  <div key={j} className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-slate-950 border-t border-slate-800 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white font-display">
              Simple, Transparent SaaS Pricing
            </h2>
            <p className="mt-3 text-slate-400 text-sm">
              All plans include complete bed tracking, invoicing, UPI receipts, and role security.
            </p>

            {/* Toggle */}
            <div className="mt-6 inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setBillingAnnual(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${!billingAnnual ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingAnnual(true)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${billingAnnual ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                <span>Annual Billing</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-950 text-emerald-400 text-[10px]">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((p, i) => (
              <div
                key={i}
                className={`p-8 rounded-3xl border transition flex flex-col justify-between relative ${p.popular ? 'bg-slate-900/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xl shadow-emerald-500/10' : 'bg-slate-900/40 border-slate-800'}`}
              >
                {p.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white font-display">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{p.desc}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white font-display">₹{(billingAnnual ? p.priceAnnual : p.priceMonthly).toLocaleString('en-IN')}</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>

                  <div className="mt-2 text-xs font-semibold text-emerald-400">
                    {p.properties} • {p.beds}
                  </div>

                  <div className="mt-8 space-y-3 border-t border-slate-800 pt-6">
                    {p.features.map((feat, j) => (
                      <div key={j} className="flex items-center gap-2.5 text-xs text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGetStartedClick}
                  className={`mt-8 w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 cursor-pointer ${p.popular ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                >
                  Get Started with {p.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 px-4 md:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display font-extrabold text-sm text-slate-300">
            <span className="w-6 h-6 rounded bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">S</span>
            <span>StayOS PG Management SaaS</span>
          </div>
          <div>© 2026 StayOS Technologies India Pvt Ltd. All rights reserved. Built for Indian Hostels & PGs.</div>
          <div className="flex items-center gap-4 text-slate-400">
            <button type="button" onClick={handleLoginClick} className="hover:text-white cursor-pointer">Admin Login</button>
            <button type="button" onClick={handleGetStartedClick} className="hover:text-white cursor-pointer">Sign Up</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
