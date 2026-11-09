import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Building2,
  Bell,
  Search,
  Plus,
  ChevronDown,
  User,
  LogOut,
  Sparkles,
  Shield,
  UtensilsCrossed,
  Wrench,
  Home,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';

export default function TopNavbar({ onOpenNotifications, onSearchClick }) {
  const { user, organization, properties = [], activeProperty, setActiveProperty, switchRole, logout, setQuickActionOpen } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [propMenuOpen, setPropMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const safeProps = Array.isArray(properties) ? properties : [];

  useEffect(() => {
    if (user) {
      api.getNotifications()
        .then(res => setUnreadCount(res?.unreadCount || 0))
        .catch(() => {});
    }
  }, [user]);

  const demoRoles = [
    { role: 'owner', label: 'Owner', desc: 'Full Organization & P&L Control', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { role: 'manager', label: 'Manager', desc: 'Daily Operations, Beds & Check-ins', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { role: 'accountant', label: 'Accountant', desc: 'Invoices, Payments & Expenses', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { role: 'warden', label: 'Warden', desc: 'Attendance, Visitors & Complaints', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { role: 'receptionist', label: 'Receptionist', desc: 'Front Desk, Check-ins & Gate', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { role: 'chef', label: 'Chef', desc: 'Kitchen Dashboard & Food Alerts', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { role: 'kitchen_staff', label: 'Kitchen Staff', desc: 'Meal Counts & Prep Checklist', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { role: 'maintenance', label: 'Maintenance', desc: 'Repairs & Assigned Work Orders', color: 'bg-slate-100 text-slate-700 border-slate-300' },
    { role: 'resident', label: 'Resident', desc: 'Mobile App, Rent Pay & Food Menu', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { role: 'super_admin', label: 'Super Admin', desc: 'Platform Multi-Tenant Console', color: 'bg-rose-50 text-rose-700 border-rose-200' }
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left: Property Selector & Organization Name */}
      <div className="flex items-center gap-3">
        {user?.role !== 'super_admin' && user?.role !== 'resident' && safeProps.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => { setPropMenuOpen(!propMenuOpen); setRoleMenuOpen(false); setUserMenuOpen(false); }}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100 transition text-sm font-semibold text-slate-800 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span className="truncate max-w-[180px] md:max-w-[240px]">{activeProperty?.name || 'Select Property'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {propMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-fade-in">
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Switch Active Property</div>
                {safeProps.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setActiveProperty(p); setPropMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${activeProperty?.id === p.id ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700'}`}
                  >
                    <div className="truncate">
                      <div className="truncate">{p.name}</div>
                      <div className="text-xs text-slate-400 font-normal truncate">{p.city} • {p.room_count || 0} Rooms</div>
                    </div>
                    {activeProperty?.id === p.id && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {user?.role === 'resident' && (
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
            <span>Resident Portal</span>
          </div>
        )}

        {user?.role === 'super_admin' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>SaaS Platform Super Admin</span>
          </div>
        )}
      </div>

      {/* Center / Right: Demo Role Switcher, Quick Action, Notification & Profile */}
      <div className="flex items-center gap-2.5 md:gap-3.5">
        {/* Quick Action Button for staff/owners */}
        {['owner', 'manager', 'accountant', 'receptionist'].includes(user?.role) && (
          <button
            type="button"
            onClick={() => setQuickActionOpen && setQuickActionOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Action</span>
          </button>
        )}

        {/* 1-Click Demo Role Switcher Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setRoleMenuOpen(!roleMenuOpen); setPropMenuOpen(false); setUserMenuOpen(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer"
            title="Switch demo role instantly to test all 10 portals"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Demo Role:</span>
            <span className="capitalize font-bold">{user?.role?.replace('_', ' ')}</span>
            <ChevronDown className="w-3 h-3 text-indigo-500" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 animate-fade-in max-h-[460px] overflow-y-auto">
              <div className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                1-Click Role Switcher (10 Roles)
              </div>
              <div className="grid grid-cols-1 gap-1.5 mt-1">
                {demoRoles.map(dr => (
                  <button
                    key={dr.role}
                    type="button"
                    onClick={() => { switchRole(dr.role); setRoleMenuOpen(false); }}
                    className={`text-left p-2 rounded-lg border text-xs transition flex items-center justify-between cursor-pointer ${user?.role === dr.role ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${dr.color}`}>{dr.label}</span>
                        {user?.role === dr.role && <span className="text-[10px] text-indigo-600 font-bold">• Active</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{dr.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setUserMenuOpen(!userMenuOpen); setRoleMenuOpen(false); setPropMenuOpen(false); }}
            className="flex items-center gap-2 p-1 pl-2 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">{user?.full_name}</div>
              <div className="text-[10px] text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-7 h-7 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            )}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="font-bold text-xs text-slate-800">{user?.full_name}</div>
                <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                <div className="text-[10px] font-semibold text-emerald-600 uppercase mt-1">{organization?.name || 'StayOS Platform'}</div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
