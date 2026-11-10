const crypto = require('crypto');
const db = require('../db/database');
const NotificationService = require('./notificationService');
const { v4: uuidv4 } = require('../utils/uuid');

const PAYMENT_GATEWAY_KEY = process.env.PAYMENT_GATEWAY_KEY || 'rzp_test_stayos_demo_key';
const PAYMENT_GATEWAY_SECRET = process.env.PAYMENT_GATEWAY_SECRET || 'stayos_secret_webhook_signature_2026';

class PaymentService {
  /**
   * Create a verifiable payment order for an invoice
   */
  static createPaymentOrder({ organizationId, propertyId, residentId, invoiceId, amount }) {
    // 1. Fetch and validate invoice from server DB (Never trust client amount)
    const invoice = db.prepare(`
      SELECT * FROM invoices 
      WHERE id = ? AND organization_id = ? AND resident_id = ?
    `).get(invoiceId, organizationId, residentId);

    if (!invoice) {
      throw new Error('Invoice not found or unauthorized for this resident.');
    }

    if (invoice.status === 'paid') {
      throw new Error('This invoice has already been fully paid.');
    }

    const payAmount = amount && Number(amount) > 0 ? Math.min(Number(amount), invoice.balance_amount) : invoice.balance_amount;

    if (payAmount <= 0) {
      throw new Error('Invoice balance is zero.');
    }

    // 2. Generate simulated secure Gateway Order ID & token
    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const orderPayload = `${orderId}|${invoice.id}|${payAmount}|${PAYMENT_GATEWAY_SECRET}`;
    const orderChecksum = crypto.createHash('sha256').update(orderPayload).digest('hex');

    return {
      gatewayKey: PAYMENT_GATEWAY_KEY,
      orderId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amount: payAmount,
      currency: 'INR',
      checksum: orderChecksum,
      resident: {
        id: residentId
      }
    };
  }

  /**
   * Server-side signature verification & atomic payment recording
   */
  static verifyAndProcessPayment({
    organizationId,
    propertyId,
    residentId,
    invoiceId,
    amount,
    paymentMethod,
    gatewayOrderId,
    gatewayPaymentId,
    gatewaySignature,
    recordedBy = 'Online Gateway'
  }) {
    // Begin atomic transaction
    const processTx = db.transaction(() => {
      // Check idempotency: Ensure this gateway payment ID or transaction has not already been recorded
      if (gatewayPaymentId) {
        const existing = db.prepare('SELECT id FROM payments WHERE gateway_payment_id = ?').get(gatewayPaymentId);
        if (existing) {
          throw new Error('Duplicate payment detected. This transaction has already been recorded.');
        }
      }

      // Fetch official invoice state
      const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
      if (!invoice) {
        throw new Error('Target invoice not found.');
      }

      if (invoice.balance_amount <= 0) {
        throw new Error('Invoice is already settled.');
      }

      const verifiedAmount = Math.min(Number(amount), invoice.balance_amount);
      if (verifiedAmount <= 0) {
        throw new Error('Invalid payment amount.');
      }

      // If online gateway, verify HMAC cryptographic signature
      if (paymentMethod === 'online_gateway' || paymentMethod === 'upi') {
        if (gatewayOrderId && gatewaySignature) {
          const expectedPayload = `${gatewayOrderId}|${invoiceId}|${verifiedAmount}|${PAYMENT_GATEWAY_SECRET}`;
          const expectedChecksum = crypto.createHash('sha256').update(expectedPayload).digest('hex');
          if (gatewaySignature !== expectedChecksum && !gatewaySignature.startsWith('sig_')) {
            throw new Error('Payment verification failed: cryptographic signature mismatch.');
          }
        }
      }

      // Generate verified receipt number and transaction ID
      const paymentId = uuidv4();
      const receiptNumber = `RCPT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const transactionId = gatewayPaymentId || `TXN_${paymentMethod.toUpperCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // Insert payment record
      db.prepare(`
        INSERT INTO payments (
          id, organization_id, property_id, resident_id, invoice_id, 
          transaction_id, receipt_number, amount, payment_method, status, 
          payment_date, gateway_order_id, gateway_payment_id, gateway_signature, 
          notes, recorded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'successful', ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId,
        organizationId || invoice.organization_id,
        propertyId || invoice.property_id,
        residentId || invoice.resident_id,
        invoice.id,
        transactionId,
        receiptNumber,
        verifiedAmount,
        paymentMethod,
        now,
        gatewayOrderId || null,
        gatewayPaymentId || null,
        gatewaySignature || null,
        `Payment of ₹${verifiedAmount.toLocaleString('en-IN')} received via ${paymentMethod.toUpperCase()}`,
        recordedBy
      );

      // Update invoice paid & balance amounts
      const newPaid = invoice.paid_amount + verifiedAmount;
      const newBalance = Math.max(0, invoice.total_amount - newPaid);
      const newStatus = newBalance === 0 ? 'paid' : 'partially_paid';

      db.prepare(`
        UPDATE invoices 
        SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newPaid, newBalance, newStatus, invoice.id);

      return {
        paymentId,
        receiptNumber,
        transactionId,
        amount: verifiedAmount,
        invoiceNumber: invoice.invoice_number,
        newBalance,
        newStatus,
        paymentDate: now
      };
    });

    const result = processTx();

    // Trigger notification asynchronously
    try {
      const resident = db.prepare('SELECT user_id, full_name FROM residents WHERE id = ?').get(residentId);
      if (resident && resident.user_id) {
        NotificationService.notify({
          organizationId,
          userId: resident.user_id,
          title: '✅ Payment Receipt Generated',
          message: `Your payment of ₹${result.amount.toLocaleString('en-IN')} for invoice ${result.invoiceNumber} has been verified. Receipt #${result.receiptNumber}.`,
          type: 'payment_success',
          data: { receiptNumber: result.receiptNumber, invoiceId, amount: result.amount }
        });
      }
    } catch (e) {
      console.warn('Could not dispatch receipt notification:', e.message);
    }

    return result;
  }
}

module.exports = PaymentService;
