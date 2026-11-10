const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, enforceTenant, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const { v4: uuidv4 } = require('../utils/uuid');

// GET /api/expenses (List expenses with category filtering and summary)
router.get('/', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'accountant'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const { propertyId, category, month, year, search } = req.query;

    let query = `
      SELECT 
        e.*,
        p.name as property_name,
        o.currency_symbol
      FROM expenses e
      JOIN properties p ON e.property_id = p.id
      JOIN organizations o ON e.organization_id = o.id
      WHERE e.organization_id = ?
    `;

    const params = [orgId];

    if (propertyId) {
      query += ' AND e.property_id = ?';
      params.push(propertyId);
    }
    if (category && category !== 'all') {
      query += ' AND e.category = ?';
      params.push(category);
    }
    if (month && year) {
      query += " AND strftime('%m', e.expense_date) = ? AND strftime('%Y', e.expense_date) = ?";
      params.push(String(month).padStart(2, '0'), String(year));
    }
    if (search) {
      query += ' AND (e.description LIKE ? OR e.vendor_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY e.expense_date DESC, e.created_at DESC';

    const expenses = db.prepare(query).all(...params);

    // Calculate category breakdown
    const breakdownQuery = `
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM expenses
      WHERE organization_id = ?
      ${propertyId ? 'AND property_id = ?' : ''}
      GROUP BY category
      ORDER BY total DESC
    `;
    const breakdown = db.prepare(breakdownQuery).all(propertyId ? [orgId, propertyId] : [orgId]);

    const totalExpense = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    res.json({
      expenses,
      breakdown,
      totalExpense
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses: ' + err.message });
  }
});

// POST /api/expenses (Record new expense)
router.post('/', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'accountant'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const {
      propertyId,
      category,
      amount,
      expenseDate = new Date().toISOString().split('T')[0],
      description,
      vendorName,
      receiptUrl,
      paymentMode = 'bank_transfer'
    } = req.body;

    if (!propertyId || !category || !amount || !description) {
      return res.status(400).json({ error: 'Property, Category, Amount, and Description are required.' });
    }

    const expenseId = `exp-${uuidv4().substring(0, 8)}`;
    const amt = Number(amount);

    db.prepare(`
      INSERT INTO expenses (
        id, organization_id, property_id, category, amount,
        expense_date, description, vendor_name, receipt_url, payment_mode, added_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      expenseId, orgId, propertyId, category, amt,
      expenseDate, description, vendorName || null, receiptUrl || null,
      paymentMode, req.user.full_name
    );

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'ADD_EXPENSE',
      entity: 'Expense',
      entityId: expenseId,
      newValues: { category, amount: amt, description, vendorName }
    });

    res.status(201).json({
      message: 'Expense recorded successfully.',
      expenseId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record expense: ' + err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', requireAuth, enforceTenant, requireRole('super_admin', 'owner', 'manager', 'accountant'), (req, res) => {
  try {
    const orgId = req.tenantId;
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND organization_id = ?').get(req.params.id, orgId);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);

    logAudit({ user: req.user, tenantId: orgId, headers: req.headers, socket: req.socket }, {
      action: 'DELETE_EXPENSE',
      entity: 'Expense',
      entityId: req.params.id,
      oldValues: { category: expense.category, amount: expense.amount }
    });

    res.json({ message: 'Expense deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense: ' + err.message });
  }
});

module.exports = router;
