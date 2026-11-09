const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');

// GET /api/reports/analytics (Comprehensive Analytics & Reports Overview)
router.get('/analytics', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'accountant'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const propertyId = req.query.propertyId || null;

    // 1. Occupancy breakdown
    const bedsData = db.prepare(`
      SELECT 
        status, 
        COUNT(*) as count 
      FROM beds 
      WHERE property_id IN (SELECT id FROM properties WHERE organization_id = ? ${propertyId ? 'AND id = ?' : ''})
      GROUP BY status
    `).all(propertyId ? [orgId, propertyId] : [orgId]);

    // 2. Room Type Utilization
    const roomTypeStats = db.prepare(`
      SELECT 
        r.room_type,
        COUNT(b.id) as total_beds,
        SUM(CASE WHEN b.status = 'occupied' THEN 1 ELSE 0 END) as occupied_beds
      FROM rooms r
      JOIN beds b ON b.room_id = r.id
      WHERE r.property_id IN (SELECT id FROM properties WHERE organization_id = ? ${propertyId ? 'AND id = ?' : ''})
      GROUP BY r.room_type
    `).all(propertyId ? [orgId, propertyId] : [orgId]);

    // 3. Monthly Financials (Revenue vs Expenses for last 6 months)
    const monthlyRev = db.prepare(`
      SELECT 
        strftime('%Y-%m', payment_date) as month,
        SUM(amount) as revenue
      FROM payments
      WHERE organization_id = ? AND status = 'successful' ${propertyId ? 'AND property_id = ?' : ''}
      GROUP BY strftime('%Y-%m', payment_date)
      ORDER BY month DESC LIMIT 6
    `).all(propertyId ? [orgId, propertyId] : [orgId]).reverse();

    const monthlyExp = db.prepare(`
      SELECT 
        strftime('%Y-%m', expense_date) as month,
        SUM(amount) as expenses
      FROM expenses
      WHERE organization_id = ? ${propertyId ? 'AND property_id = ?' : ''}
      GROUP BY strftime('%Y-%m', expense_date)
      ORDER BY month DESC LIMIT 6
    `).all(propertyId ? [orgId, propertyId] : [orgId]).reverse();

    // Combine monthly financials
    const monthMap = {};
    monthlyRev.forEach(r => { monthMap[r.month] = { month: r.month, revenue: r.revenue, expenses: 0, net: r.revenue }; });
    monthlyExp.forEach(e => {
      if (!monthMap[e.month]) monthMap[e.month] = { month: e.month, revenue: 0, expenses: e.expenses, net: -e.expenses };
      else {
        monthMap[e.month].expenses = e.expenses;
        monthMap[e.month].net = monthMap[e.month].revenue - e.expenses;
      }
    });
    const financialComparison = Object.values(monthMap);

    // 4. Outstanding Dues by Property
    const propertyDues = db.prepare(`
      SELECT 
        p.name as property_name,
        COALESCE(SUM(i.balance_amount), 0) as total_outstanding,
        COUNT(CASE WHEN i.status = 'overdue' THEN 1 ELSE NULL END) as overdue_invoices
      FROM properties p
      LEFT JOIN invoices i ON i.property_id = p.id AND i.status IN ('pending', 'partially_paid', 'overdue')
      WHERE p.organization_id = ?
      GROUP BY p.id
    `).all(orgId);

    // 5. Complaints TAT & Categories
    const complaintCategoryStats = db.prepare(`
      SELECT 
        category,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 ELSE 0 END) as resolved
      FROM complaints
      WHERE organization_id = ? ${propertyId ? 'AND property_id = ?' : ''}
      GROUP BY category
    `).all(propertyId ? [orgId, propertyId] : [orgId]);

    res.json({
      bedsDistribution: bedsData,
      roomTypeStats,
      financialComparison,
      propertyDues,
      complaintCategoryStats
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate analytics report: ' + err.message });
  }
});

// GET /api/reports/export/:type (Download CSV Data)
router.get('/export/:type', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'accountant'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { type } = req.params;
    let csvData = '';
    let filename = `stayos_${type}_report_${Date.now()}.csv`;

    if (type === 'residents') {
      const rows = db.prepare(`
        SELECT 
          r.full_name, r.gender, r.phone, r.email, p.name as property,
          rm.room_number, b.bed_number, r.monthly_rent, r.deposit_amount,
          r.joining_date, r.occupation, r.organization_or_college, r.status
        FROM residents r
        JOIN properties p ON r.property_id = p.id
        LEFT JOIN rooms rm ON r.current_room_id = rm.id
        LEFT JOIN beds b ON r.current_bed_id = b.id
        WHERE r.organization_id = ?
      `).all(orgId);

      const headers = ['Name', 'Gender', 'Phone', 'Email', 'Property', 'Room', 'Bed', 'Rent', 'Deposit', 'Joining Date', 'Occupation', 'Company/College', 'Status'];
      csvData = [
        headers.join(','),
        ...rows.map(r => [
          `"${r.full_name}"`, r.gender, `"${r.phone}"`, `"${r.email}"`, `"${r.property}"`,
          `"${r.room_number || ''}"`, `"${r.bed_number || ''}"`, r.monthly_rent, r.deposit_amount,
          r.joining_date, `"${r.occupation || ''}"`, `"${r.organization_or_college || ''}"`, r.status
        ].join(','))
      ].join('\n');

    } else if (type === 'payments') {
      const rows = db.prepare(`
        SELECT 
          p.receipt_number, p.transaction_id, p.payment_date, p.amount,
          p.payment_method, r.full_name as resident_name, prop.name as property,
          i.invoice_number, p.recorded_by
        FROM payments p
        JOIN residents r ON p.resident_id = r.id
        JOIN properties prop ON p.property_id = prop.id
        LEFT JOIN invoices i ON p.invoice_id = i.id
        WHERE p.organization_id = ?
        ORDER BY p.payment_date DESC
      `).all(orgId);

      const headers = ['Receipt #', 'Transaction ID', 'Date', 'Amount (INR)', 'Method', 'Resident', 'Property', 'Invoice #', 'Recorded By'];
      csvData = [
        headers.join(','),
        ...rows.map(r => [
          `"${r.receipt_number}"`, `"${r.transaction_id}"`, `"${r.payment_date}"`, r.amount,
          r.payment_method, `"${r.resident_name}"`, `"${r.property}"`, `"${r.invoice_number || ''}"`, `"${r.recorded_by || ''}"`
        ].join(','))
      ].join('\n');

    } else if (type === 'expenses') {
      const rows = db.prepare(`
        SELECT 
          e.expense_date, e.category, e.amount, e.description,
          e.vendor_name, e.payment_mode, p.name as property, e.added_by
        FROM expenses e
        JOIN properties p ON e.property_id = p.id
        WHERE e.organization_id = ?
        ORDER BY e.expense_date DESC
      `).all(orgId);

      const headers = ['Date', 'Category', 'Amount (INR)', 'Description', 'Vendor', 'Payment Mode', 'Property', 'Added By'];
      csvData = [
        headers.join(','),
        ...rows.map(r => [
          r.expense_date, r.category, r.amount, `"${r.description}"`,
          `"${r.vendor_name || ''}"`, r.payment_mode, `"${r.property}"`, `"${r.added_by || ''}"`
        ].join(','))
      ].join('\n');

    } else {
      return res.status(400).json({ error: 'Unsupported export type. Available: residents, payments, expenses.' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export report: ' + err.message });
  }
});

module.exports = router;
