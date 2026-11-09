// StayOS API Service Client
const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('stayos_token');
  const orgId = localStorage.getItem('stayos_org_id');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(orgId ? { 'x-organization-id': orgId } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! Status: ${response.status}`);
    }

    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),
  switchDemoRole: (roleOrEmail) => request('/auth/demo-switch', {
    method: 'POST',
    body: JSON.stringify(typeof roleOrEmail === 'string' && roleOrEmail.includes('@') ? { email: roleOrEmail } : { role: roleOrEmail })
  }),

  // Dashboard
  getDashboardStats: (propertyId) => request(`/dashboard/stats${propertyId ? `?propertyId=${propertyId}` : ''}`),

  // Properties
  getProperties: () => request('/properties'),
  getProperty: (id) => request(`/properties/${id}`),
  createProperty: (payload) => request('/properties', { method: 'POST', body: JSON.stringify(payload) }),
  updateProperty: (id, payload) => request(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Rooms
  getRooms: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/rooms${query ? `?${query}` : ''}`);
  },
  getRoom: (id) => request(`/rooms/${id}`),
  createRoom: (payload) => request('/rooms', { method: 'POST', body: JSON.stringify(payload) }),
  updateRoom: (id, payload) => request(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Beds
  getBeds: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/beds${query ? `?${query}` : ''}`);
  },
  getVacantBeds: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/beds/vacant${query ? `?${query}` : ''}`);
  },
  updateBedStatus: (id, payload) => request(`/beds/${id}/status`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Residents
  getResidents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/residents${query ? `?${query}` : ''}`);
  },
  getResident: (id) => request(`/residents/${id}`),
  updateResident: (id, payload) => request(`/residents/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Check-In & Check-Out
  processCheckIn: (payload) => request('/checkins', { method: 'POST', body: JSON.stringify(payload) }),
  calculateCheckOut: (payload) => request('/checkouts/calculate', { method: 'POST', body: JSON.stringify(payload) }),
  settleCheckOut: (payload) => request('/checkouts/settle', { method: 'POST', body: JSON.stringify(payload) }),

  // Invoices
  getInvoices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/invoices${query ? `?${query}` : ''}`);
  },
  getInvoice: (id) => request(`/invoices/${id}`),
  createInvoice: (payload) => request('/invoices', { method: 'POST', body: JSON.stringify(payload) }),
  generateMonthlyInvoices: (payload) => request('/invoices/generate-monthly', { method: 'POST', body: JSON.stringify(payload) }),

  // Payments
  getPayments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/payments${query ? `?${query}` : ''}`);
  },
  getPaymentReceipt: (id) => request(`/payments/${id}/receipt`),
  createPaymentOrder: (payload) => request('/payments/create-order', { method: 'POST', body: JSON.stringify(payload) }),
  verifyPayment: (payload) => request('/payments/verify', { method: 'POST', body: JSON.stringify(payload) }),
  recordOfflinePayment: (payload) => request('/payments/record-offline', { method: 'POST', body: JSON.stringify(payload) }),

  // Expenses
  getExpenses: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/expenses${query ? `?${query}` : ''}`);
  },
  createExpense: (payload) => request('/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // Meals & Food
  getMealSchedule: (propertyId) => request(`/meals/schedule${propertyId ? `?propertyId=${propertyId}` : ''}`),
  updateMealSchedule: (payload) => request('/meals/schedule', { method: 'PUT', body: JSON.stringify(payload) }),
  getDailyMealStatus: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/meals/daily-status${query ? `?${query}` : ''}`);
  },
  updateDailyMealStatus: (payload) => request('/meals/status', { method: 'PUT', body: JSON.stringify(payload) }),
  setMealOptOut: (payload) => request('/meals/opt-out', { method: 'POST', body: JSON.stringify(payload) }),

  // Complaints
  getComplaints: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/complaints${query ? `?${query}` : ''}`);
  },
  submitComplaint: (payload) => request('/complaints', { method: 'POST', body: JSON.stringify(payload) }),
  assignComplaint: (id, payload) => request(`/complaints/${id}/assign`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateComplaintStatus: (id, payload) => request(`/complaints/${id}/status`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Maintenance
  getMaintenanceTasks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/maintenance${query ? `?${query}` : ''}`);
  },
  createMaintenanceTask: (payload) => request('/maintenance', { method: 'POST', body: JSON.stringify(payload) }),
  updateMaintenanceTask: (id, payload) => request(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Staff & Attendance
  getStaff: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/staff${query ? `?${query}` : ''}`);
  },
  addStaff: (payload) => request('/staff', { method: 'POST', body: JSON.stringify(payload) }),
  getTodayAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/staff/attendance/today${query ? `?${query}` : ''}`);
  },
  markAttendance: (payload) => request('/staff/attendance/mark', { method: 'POST', body: JSON.stringify(payload) }),

  // Visitors
  getVisitors: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/visitors${query ? `?${query}` : ''}`);
  },
  requestVisitorPass: (payload) => request('/visitors/request', { method: 'POST', body: JSON.stringify(payload) }),
  updateVisitorStatus: (id, payload) => request(`/visitors/${id}/status`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Notices
  getNotices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/notices${query ? `?${query}` : ''}`);
  },
  createNotice: (payload) => request('/notices', { method: 'POST', body: JSON.stringify(payload) }),
  deleteNotice: (id) => request(`/notices/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),
  getNotificationPreferences: () => request('/notifications/preferences'),
  updateNotificationPreferences: (payload) => request('/notifications/preferences', { method: 'PUT', body: JSON.stringify(payload) }),

  // Reports
  getAnalytics: (propertyId) => request(`/reports/analytics${propertyId ? `?propertyId=${propertyId}` : ''}`),
  getExportUrl: (type) => `${API_BASE}/reports/export/${type}`,

  // Super Admin
  getSuperAdminMetrics: () => request('/superadmin/metrics'),
  getSuperAdminOrganizations: () => request('/superadmin/organizations'),
  updateOrgStatus: (id, status) => request(`/superadmin/organizations/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getPlans: () => request('/superadmin/plans'),
  getAuditLogs: () => request('/superadmin/audit-logs'),

  // Organization Settings & Cron
  getOrgSettings: () => request('/organizations/current'),
  updateOrgSettings: (payload) => request('/organizations/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  triggerDailyCron: () => request('/organizations/cron/trigger', { method: 'POST' })
};
