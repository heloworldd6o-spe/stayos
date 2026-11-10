const db = require('../db/database');
const NotificationService = require('./notificationService');
const { v4: uuidv4 } = require('../utils/uuid');

class CronService {
  /**
   * Run daily maintenance routines
   */
  static async runDailyJobs() {
    console.log('⏰ [Cron Service] Starting daily background automated workflows...');
    const results = {
      overdueMarked: 0,
      remindersSent: 0,
      recurringInvoicesCreated: 0,
      mealsPrepared: 0
    };

    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Identify and update overdue invoices
      const overdueStmt = db.prepare(`
        UPDATE invoices 
        SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
        WHERE due_date < ? AND status IN ('pending', 'partially_paid') AND balance_amount > 0
      `);
      const overdueRes = overdueStmt.run(today);
      results.overdueMarked = overdueRes.changes;

      // 2. Scan pending/overdue invoices and dispatch reminders based on due dates
      const pendingInvoices = db.prepare(`
        SELECT i.*, r.user_id, r.full_name, r.phone, p.name as property_name, o.currency_symbol
        FROM invoices i
        JOIN residents r ON i.resident_id = r.id
        JOIN properties p ON i.property_id = p.id
        JOIN organizations o ON i.organization_id = o.id
        WHERE i.status IN ('pending', 'partially_paid', 'overdue') AND i.balance_amount > 0 AND r.status = 'active'
      `).all();

      for (const inv of pendingInvoices) {
        if (!inv.user_id) continue;

        const dueDateObj = new Date(inv.due_date);
        const todayObj = new Date(today);
        const diffDays = Math.round((dueDateObj - todayObj) / (1000 * 60 * 60 * 24));

        let reminderTitle = null;
        let reminderMsg = null;

        if (diffDays === 7) {
          reminderTitle = '💳 Rent Payment Due in 7 Days';
          reminderMsg = `Your rent payment of ${inv.currency_symbol || '₹'}${inv.balance_amount.toLocaleString('en-IN')} for invoice ${inv.invoice_number} is due on ${inv.due_date}.`;
        } else if (diffDays === 3) {
          reminderTitle = '⚠️ Rent Payment Due in 3 Days';
          reminderMsg = `Friendly reminder: Rent payment of ${inv.currency_symbol || '₹'}${inv.balance_amount.toLocaleString('en-IN')} is due on ${inv.due_date}.`;
        } else if (diffDays === 0) {
          reminderTitle = '🚨 Rent Payment Due Today';
          reminderMsg = `Your monthly rent payment of ${inv.currency_symbol || '₹'}${inv.balance_amount.toLocaleString('en-IN')} is due today. Please settle via the app.`;
        } else if (diffDays < 0) {
          reminderTitle = '❗ Rent Payment Overdue';
          reminderMsg = `Your rent payment of ${inv.currency_symbol || '₹'}${inv.balance_amount.toLocaleString('en-IN')} is overdue by ${Math.abs(diffDays)} day(s). Late fees may apply.`;
        }

        if (reminderTitle) {
          await NotificationService.notify({
            organizationId: inv.organization_id,
            userId: inv.user_id,
            title: reminderTitle,
            message: reminderMsg,
            type: 'payment_reminder',
            data: { invoiceId: inv.id, balance: inv.balance_amount, dueDate: inv.due_date }
          });
          results.remindersSent++;
        }
      }

      // 3. Prepare daily meal status records for all properties if not existing
      const properties = db.prepare(`SELECT id FROM properties WHERE status = 'active'`).all();
      const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner'];

      for (const prop of properties) {
        // Count active residents for this property
        const activeResidentsCount = db.prepare(`
          SELECT COUNT(*) as cnt FROM residents WHERE property_id = ? AND status = 'active'
        `).get(prop.id).cnt;

        for (const meal of mealTypes) {
          const existing = db.prepare(`
            SELECT id FROM meal_daily_status WHERE property_id = ? AND date = ? AND meal_type = ?
          `).get(prop.id, today, meal);

          if (!existing) {
            // Check opt-outs
            const optOuts = db.prepare(`
              SELECT COUNT(*) as cnt FROM meal_opt_outs WHERE property_id = ? AND date = ? AND meal_type = ? AND is_opted_out = 1
            `).get(prop.id, today, meal)?.cnt || 0;

            const expected = Math.max(0, activeResidentsCount - optOuts);

            db.prepare(`
              INSERT INTO meal_daily_status (id, property_id, date, meal_type, expected_count, opted_out_count, guest_count, served_count, status)
              VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'pending')
            `).run(uuidv4(), prop.id, today, meal, expected, optOuts);

            results.mealsPrepared++;
          }
        }
      }

      console.log('✅ [Cron Service] Finished successfully:', results);
    } catch (err) {
      console.error('❌ [Cron Service] Error executing daily jobs:', err);
    }

    return results;
  }
}

module.exports = CronService;
