const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', requireAuth, enforceTenant, (req, res) => {
  try {
    const orgId = req.tenantId;
    const propertyId = req.query.propertyId || null; // Optional filter by single property

    let propFilter = '';
    const params = [orgId];

    if (propertyId) {
      propFilter = ' AND property_id = ? ';
      params.push(propertyId);
    }

    // 1. Properties & Structure stats
    const totalProperties = propertyId 
      ? 1 
      : db.prepare('SELECT COUNT(*) as count FROM properties WHERE organization_id = ?').get(orgId).count;

    const roomsQuery = propertyId 
      ? 'SELECT COUNT(*) as count FROM rooms WHERE property_id = ?'
      : 'SELECT COUNT(*) as count FROM rooms WHERE property_id IN (SELECT id FROM properties WHERE organization_id = ?)';
    const totalRooms = db.prepare(roomsQuery).get(propertyId || orgId).count;

    // 2. Bed Statistics
    const bedsQuery = propertyId
      ? `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
          SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
        FROM beds WHERE property_id = ?`
      : `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
          SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
        FROM beds WHERE property_id IN (SELECT id FROM properties WHERE organization_id = ?)`;

    const bedStats = db.prepare(bedsQuery).get(propertyId || orgId);
    const totalBeds = bedStats.total || 0;
    const occupiedBeds = bedStats.occupied || 0;
    const availableBeds = bedStats.available || 0;
    const reservedBeds = bedStats.reserved || 0;
    const maintenanceBeds = bedStats.maintenance || 0;
    const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // 3. Residents stats
    const resQuery = propertyId
      ? "SELECT COUNT(*) as count FROM residents WHERE property_id = ? AND status = 'active'"
      : "SELECT COUNT(*) as count FROM residents WHERE organization_id = ? AND status = 'active'";
    const activeResidents = db.prepare(resQuery).get(propertyId || orgId).count;

    // 4. Financial statistics (Dynamic calculations from payments & invoices)
    const todayStr = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Today's revenue
    const todayRevQuery = propertyId
      ? "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE property_id = ? AND status = 'successful' AND date(payment_date) = ?"
      : "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE organization_id = ? AND status = 'successful' AND date(payment_date) = ?";
    const todayRevenue = db.prepare(todayRevQuery).get(propertyId ? [propertyId, todayStr] : [orgId, todayStr]).total;

    // Monthly revenue (current month)
    const monthRevQuery = propertyId
      ? "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE property_id = ? AND status = 'successful' AND strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')"
      : "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE organization_id = ? AND status = 'successful' AND strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')";
    const monthlyRevenue = db.prepare(monthRevQuery).get(propertyId || orgId).total;

    // Monthly expenses
    const monthExpQuery = propertyId
      ? "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE property_id = ? AND strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')"
      : "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE organization_id = ? AND strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')";
    const monthlyExpenses = db.prepare(monthExpQuery).get(propertyId || orgId).total;
    const netRevenue = monthlyRevenue - monthlyExpenses;

    // Pending and overdue payments from invoices
    const duesQuery = propertyId
      ? `SELECT 
          COALESCE(SUM(CASE WHEN status = 'pending' OR status = 'partially_paid' THEN balance_amount ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN status = 'overdue' THEN balance_amount ELSE 0 END), 0) as overdue_amount,
          COUNT(CASE WHEN status = 'overdue' THEN 1 ELSE NULL END) as overdue_count
        FROM invoices WHERE property_id = ?`
      : `SELECT 
          COALESCE(SUM(CASE WHEN status = 'pending' OR status = 'partially_paid' THEN balance_amount ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN status = 'overdue' THEN balance_amount ELSE 0 END), 0) as overdue_amount,
          COUNT(CASE WHEN status = 'overdue' THEN 1 ELSE NULL END) as overdue_count
        FROM invoices WHERE organization_id = ?`;
    const dueStats = db.prepare(duesQuery).get(propertyId || orgId);

    // 5. Operations: Complaints & Today's check-ins/outs
    const compQuery = propertyId
      ? "SELECT COUNT(*) as count FROM complaints WHERE property_id = ? AND status IN ('submitted', 'assigned', 'in_progress')"
      : "SELECT COUNT(*) as count FROM complaints WHERE organization_id = ? AND status IN ('submitted', 'assigned', 'in_progress')";
    const openComplaints = db.prepare(compQuery).get(propertyId || orgId).count;

    const checkinsTodayQuery = propertyId
      ? "SELECT COUNT(*) as count FROM checkin_checkout_records WHERE property_id = ? AND type = 'check_in' AND date(action_date) = ?"
      : "SELECT COUNT(*) as count FROM checkin_checkout_records WHERE organization_id = ? AND type = 'check_in' AND date(action_date) = ?";
    const todayCheckins = db.prepare(checkinsTodayQuery).get(propertyId ? [propertyId, todayStr] : [orgId, todayStr]).count;

    const checkoutsTodayQuery = propertyId
      ? "SELECT COUNT(*) as count FROM checkin_checkout_records WHERE property_id = ? AND type = 'check_out' AND date(action_date) = ?"
      : "SELECT COUNT(*) as count FROM checkin_checkout_records WHERE organization_id = ? AND type = 'check_out' AND date(action_date) = ?";
    const todayCheckouts = db.prepare(checkoutsTodayQuery).get(propertyId ? [propertyId, todayStr] : [orgId, todayStr]).count;

    // 6. Food & Mess Status for Today
    const mealsQuery = propertyId
      ? "SELECT * FROM meal_daily_status WHERE property_id = ? AND date = ?"
      : "SELECT * FROM meal_daily_status WHERE property_id IN (SELECT id FROM properties WHERE organization_id = ?) AND date = ?";
    const todayMeals = db.prepare(mealsQuery).all(propertyId ? [propertyId, todayStr] : [orgId, todayStr]);

    // 7. Monthly Revenue & Expense trends (past 6 months)
    const revenueTrendQuery = `
      SELECT 
        strftime('%Y-%m', payment_date) as month,
        SUM(amount) as revenue
      FROM payments
      WHERE organization_id = ? AND status = 'successful'
      GROUP BY strftime('%Y-%m', payment_date)
      ORDER BY month DESC
      LIMIT 6
    `;
    const revenueTrends = db.prepare(revenueTrendQuery).all(orgId).reverse();

    // 8. Expense by category
    const expenseCategoryQuery = `
      SELECT category, SUM(amount) as total
      FROM expenses
      WHERE organization_id = ?
      GROUP BY category
      ORDER BY total DESC
    `;
    const expenseBreakdown = db.prepare(expenseCategoryQuery).all(orgId);

    // 9. Recent activities (Audit & Notifications)
    const recentAudits = db.prepare(`
      SELECT * FROM audit_logs WHERE organization_id = ? ORDER BY created_at DESC LIMIT 6
    `).all(orgId);

    res.json({
      summary: {
        totalProperties,
        totalRooms,
        totalBeds,
        occupiedBeds,
        availableBeds,
        reservedBeds,
        maintenanceBeds,
        occupancyPercent,
        activeResidents,
        todayCheckins,
        todayCheckouts,
        todayRevenue,
        monthlyRevenue,
        monthlyExpenses,
        netRevenue,
        pendingAmount: dueStats.pending_amount,
        overdueAmount: dueStats.overdue_amount,
        overdueCount: dueStats.overdue_count,
        openComplaints
      },
      todayMeals,
      revenueTrends,
      expenseBreakdown,
      recentAudits
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to compute dashboard metrics: ' + err.message });
  }
});

module.exports = router;
