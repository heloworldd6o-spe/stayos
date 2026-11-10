import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import TopNavbar from './TopNavbar';
import NotificationDrawer from './NotificationDrawer';
import QuickActionModal from './QuickActionModal';
import {
  LayoutDashboard,
  Users,
  DoorOpen,
  Bed,
  UserCheck,
  UserX,
  CreditCard,
  Receipt,
  TrendingDown,
  BarChart3,
  UtensilsCrossed,
  ChefHat,
  ClipboardList,
  Wrench,
  ShieldCheck,
  Megaphone,
  Building2,
  Settings,
  Sparkles,
  Menu,
  X,
  Home,
  FileText,
  FileCheck2,
  CalendarCheck
} from 'lucide-react';

export default function AppLayout({ activeTab, setActiveTab, children }) {
  const { user, organization, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Role based navigation filter
  const role = user?.role || 'owner';

  // Navigation Items
  const navSections = [
    {
      title: 'Overview',
      roles: ['super_admin', 'owner', 'manager', 'accountant', 'warden', 'receptionist'],
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'owner', 'manager', 'accountant', 'warden', 'receptionist'] }
      ]
    },
    {
      title: 'Operations',
      roles: ['super_admin', 'owner', 'manager', 'warden', 'receptionist'],
      items: [
        { id: 'residents', label: 'Residents Directory', icon: Users, roles: ['super_admin', 'owner', 'manager', 'warden', 'receptionist'] },
        { id: 'rooms', label: 'Rooms Matrix', icon: DoorOpen, roles: ['super_admin', 'owner', 'manager', 'warden', 'receptionist'] },
        { id: 'beds', label: 'Available Beds', icon: Bed, roles: ['super_admin', 'owner', 'manager', 'warden', 'receptionist'], badge: 'Vacant' },
        { id: 'checkin', label: 'New Check-In', icon: UserCheck, roles: ['super_admin', 'owner', 'manager', 'receptionist', 'warden'] }
      ]
    },
    {
      title: 'Finance & Accounts',
      roles: ['super_admin', 'owner', 'manager', 'accountant', 'receptionist', 'warden'],
      items: [
        { id: 'payments', label: 'Payments & Receipts', icon: CreditCard, roles: ['super_admin', 'owner', 'manager', 'accountant', 'receptionist', 'warden'] },
        { id: 'invoices', label: 'Invoices & Rent', icon: Receipt, roles: ['super_admin', 'owner', 'manager', 'accountant', 'warden'] },
        { id: 'expenses', label: 'Expenses Ledger', icon: TrendingDown, roles: ['super_admin', 'owner', 'manager', 'accountant'] },
        { id: 'reports', label: 'Financial Reports', icon: BarChart3, roles: ['super_admin', 'owner', 'manager', 'accountant'] }
      ]
    },
    {
      title: 'Food & Kitchen',
      roles: ['super_admin', 'owner', 'manager', 'chef', 'kitchen_staff'],
      items: [
        { id: 'food', label: 'Weekly Meal Menu', icon: UtensilsCrossed, roles: ['super_admin', 'owner', 'manager', 'chef', 'kitchen_staff'] },
        { id: 'chef', label: "Chef Live Screen", icon: ChefHat, roles: ['super_admin', 'owner', 'manager', 'chef', 'kitchen_staff'], badge: 'KDS' }
      ]
    },
    {
      title: 'Property & Facility',
      roles: ['super_admin', 'owner', 'manager', 'warden', 'maintenance', 'receptionist'],
      items: [
        { id: 'complaints', label: 'Complaints & Issues', icon: ClipboardList, roles: ['super_admin', 'owner', 'manager', 'warden', 'maintenance'] },
        { id: 'maintenance', label: 'Maintenance Tasks', icon: Wrench, roles: ['super_admin', 'owner', 'manager', 'maintenance'] },
        { id: 'staff', label: 'Staff & Attendance', icon: CalendarCheck, roles: ['super_admin', 'owner', 'manager', 'accountant', 'warden'] },
        { id: 'visitors', label: 'Visitors & Gate Pass', icon: ShieldCheck, roles: ['super_admin', 'owner', 'manager', 'warden', 'receptionist'] },
        { id: 'notices', label: 'Notices & Broadcast', icon: Megaphone, roles: ['super_admin', 'owner', 'manager', 'warden', 'accountant'] }
      ]
    },
    {
      title: 'Settings',
      roles: ['super_admin', 'owner'],
      items: [
        { id: 'properties', label: 'Properties & Floors', icon: Building2, roles: ['super_admin', 'owner'] },
        { id: 'settings', label: 'Org Settings & Tax', icon: Settings, roles: ['super_admin', 'owner'] }
      ]
    }
  ];

  // Super Admin specific navigation
  if (role === 'super_admin') {
    navSections.unshift({
      title: 'Platform SaaS',
      roles: ['super_admin'],
      items: [
        { id: 'superadmin', label: 'Platform Console', icon: Sparkles, roles: ['super_admin'], badge: 'Admin' }
      ]
    });
  }

  // Resident portal view tabs
  const residentNavItems = [
    { id: 'resident_home', label: 'My Room & Stay', icon: Home },
    { id: 'resident_payments', label: 'Pay Rent & Dues', icon: CreditCard, badge: 'UPI' },
    { id: 'resident_food', label: 'Mess & Food', icon: UtensilsCrossed },
    { id: 'resident_complaints', label: 'Complaints', icon: ClipboardList },
    { id: 'resident_visitors', label: 'Visitors', icon: ShieldCheck },
    { id: 'resident_notices', label: 'Notices', icon: Megaphone },
    { id: 'resident_docs', label: 'My Documents', icon: FileCheck2 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold font-display shadow-md shadow-emerald-500/20">
            S
          </div>
          <div>
            <div className="font-extrabold text-slate-900 tracking-tight leading-none text-base">StayOS</div>
            <div className="text-[10px] text-slate-500 font-semibold">{organization?.name || 'PG & Hostel Cloud'}</div>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Main Sidebar for Desktop */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950/40">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black font-display text-lg shadow-lg shadow-emerald-500/20">
            S
          </div>
          <div>
            <div className="font-extrabold text-white text-lg tracking-tight font-display flex items-center gap-1.5">
              <span>StayOS</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">SaaS</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
              {organization?.name || 'Management'}
            </div>
          </div>
        </div>

        {/* Navigation items list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {role === 'resident' ? (
            <div className="space-y-1">
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Resident Portal</div>
              {residentNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || ((activeTab === 'dashboard' || !activeTab) && item.id === 'resident_home');
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition ${isActive ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'}`}>{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            navSections.map(section => {
              if (!section.roles.includes(role)) return null;
              return (
                <div key={section.title} className="space-y-1">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {section.title}
                  </div>
                  {section.items.map(item => {
                    if (!item.roles.includes(role)) return null;
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition ${isActive ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400 border border-emerald-500/20'}`}>{item.badge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate text-left">
                <div className="text-xs font-bold text-white truncate">{user?.full_name}</div>
                <div className="text-[10px] text-slate-400 capitalize">{role.replace('_', ' ')}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar
          onOpenNotifications={() => setNotificationsOpen(true)}
          onSearchClick={() => {}}
        />

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Notification Drawer Modal */}
      {notificationsOpen && (
        <NotificationDrawer onClose={() => setNotificationsOpen(false)} />
      )}

      {/* Quick Action Modal */}
      <QuickActionModal onNavigate={(tab) => setActiveTab(tab)} />
    </div>
  );
}
