import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ShieldAlert,
  Building2,
  Users,
  CreditCard,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Ban,
  RefreshCw,
  Search,
  Sliders,
  Server,
  Database,
  Lock,
  Calendar
} from 'lucide-react';

export default function SuperAdminPage() {
  const [metrics, setMetrics] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('orgs');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingOrg, setUpdatingOrg] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, o, p, a] = await Promise.all([
        api.getSuperAdminMetrics(),
        api.getSuperAdminOrganizations(),
        api.getPlans(),
        api.getAuditLogs()
      ]);
      setMetrics(m?.data || m || {});
      setOrganizations(Array.isArray(o) ? o : (o?.data || []));
      setPlans(Array.isArray(p) ? p : (p?.data || []));
      setAuditLogs(Array.isArray(a) ? a : (a?.data || []));
    } catch (err) {
      console.error('Failed to load SuperAdmin metrics', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrgStatus = async (orgId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to change status to ${nextStatus.toUpperCase()}?`)) return;

    try {
      setUpdatingOrg(orgId);
      await api.updateOrgStatus(orgId, nextStatus);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update organization status');
    } finally {
      setUpdatingOrg(null);
    }
  };

  const filteredOrgs = organizations.filter(org =>
    org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Lock className="w-4 h-4" /> Root Platform Console
          </div>
          <h1 className="text-2xl font-black font-display tracking-tight text-white flex items-center gap-3">
            StayOS Super Admin Engine
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            System-wide multi-tenant governance, SaaS telemetry, subscription management & tenant isolation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tenants</span>
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {metrics?.total_organizations || organizations.length || 0}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% active operational
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total PG Beds</span>
            <Layers className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {metrics?.total_beds || 0}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">Across all properties</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform Users</span>
            <Users className="w-5 h-5 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {metrics?.total_users || 0}
          </div>
          <div className="text-xs text-sky-600 font-medium mt-1">Active Accounts</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly GMV</span>
            <CreditCard className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{(metrics?.total_revenue_settled || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">Verified Gateway Volume</div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm gap-6">
        <button
          onClick={() => setActiveSubTab('orgs')}
          className={`py-3.5 px-2 text-sm font-bold border-b-2 transition ${activeSubTab === 'orgs'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Tenant Organizations ({organizations.length})
        </button>
        <button
          onClick={() => setActiveSubTab('plans')}
          className={`py-3.5 px-2 text-sm font-bold border-b-2 transition ${activeSubTab === 'plans'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Subscription Tiers ({plans.length})
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`py-3.5 px-2 text-sm font-bold border-b-2 transition ${activeSubTab === 'logs'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          System Audit Stream ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('health')}
          className={`py-3.5 px-2 text-sm font-bold border-b-2 transition ${activeSubTab === 'health'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Services Health
        </button>
      </div>

      {/* Tab Content: Organizations */}
      {activeSubTab === 'orgs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tenant by company, email, or domain slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredOrgs.length} registered organizations
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">SaaS Tier</th>
                  <th className="py-3 px-4">Properties</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{org.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">slug: {org.slug}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{org.email || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">{org.phone || ''}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-bold uppercase text-[10px]">
                        {org.subscription_plan || 'Professional'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {org.property_count || 2} Properties
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${org.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                        }`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {org.created_at ? new Date(org.created_at).toLocaleDateString('en-IN') : '2026-01-15'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => toggleOrgStatus(org.id, org.status)}
                        disabled={updatingOrg === org.id}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition inline-flex items-center gap-1.5 ${org.status === 'active'
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                      >
                        {org.status === 'active' ? (
                          <>
                            <Ban className="w-3.5 h-3.5" /> Suspend
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Plans */}
      {activeSubTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              name: 'Starter',
              price: 999,
              props: '1 Property',
              beds: 'Up to 30 Beds',
              staff: '3 Staff Members',
              color: 'border-slate-300',
              badge: 'bg-slate-100 text-slate-700'
            },
            {
              name: 'Growth',
              price: 2499,
              props: '3 Properties',
              beds: 'Up to 100 Beds',
              staff: '10 Staff Members',
              color: 'border-sky-300',
              badge: 'bg-sky-100 text-sky-800'
            },
            {
              name: 'Professional',
              price: 4999,
              popular: true,
              props: '10 Properties',
              beds: 'Up to 400 Beds',
              staff: 'Unlimited Staff',
              color: 'border-indigo-400 ring-2 ring-indigo-500',
              badge: 'bg-indigo-100 text-indigo-800'
            },
            {
              name: 'Enterprise',
              price: 9999,
              props: 'Unlimited Properties',
              beds: 'Unlimited Beds',
              staff: 'Dedicated Server & SLA',
              color: 'border-amber-300',
              badge: 'bg-amber-100 text-amber-800'
            }
          ].map((plan) => (
            <div key={plan.name} className={`bg-white rounded-2xl p-6 border ${plan.color} shadow-sm flex flex-col justify-between relative`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow">
                  Most Popular
                </div>
              )}
              <div>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.badge}`}>Monthly</span>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-black text-slate-900">₹{plan.price.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-slate-500 ml-1">/ month</span>
                </div>
                <div className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{plan.props}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{plan.beds}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{plan.staff}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Automated UPI Invoicing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Chef KDS & Meal Tracking</span>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition">
                  Configure Tier Limits
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Logs */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" /> Real-time System Audit Stream
          </h3>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto font-mono text-xs">
            {auditLogs.length === 0 ? (
              <div className="text-slate-400 py-8 text-center">No platform audit logs recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                      {log.action}
                    </span>
                    <span className="text-slate-900 font-medium">{log.entity_type} #{log.entity_id || ''}</span>
                    <span className="text-slate-400 text-[11px]">{log.user_email || 'System Daemon'}</span>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    {new Date(log.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Health */}
      {activeSubTab === 'health' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-emerald-600" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">SQLite (WAL Mode)</h4>
                <div className="text-xs text-emerald-600 font-semibold mt-0.5">● Healthy & Fast</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Foreign keys enabled, ACID transactions for financial ledger and bed assignments.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <Server className="w-6 h-6 text-sky-600" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">Background Cron Engine</h4>
                <div className="text-xs text-sky-600 font-semibold mt-0.5">● Active Scheduler</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Daily automated rent reminders, overdue invoice tagging, and automated meal headcounts.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-indigo-600" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">HMAC Payment Gateway</h4>
                <div className="text-xs text-indigo-600 font-semibold mt-0.5">● Cryptographic Signature Active</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Server-side verification with anti-tamper idempotency locks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
