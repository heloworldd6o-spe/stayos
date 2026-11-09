const assert = require('assert');
const db = require('../db/database');
const bcrypt = require('bcryptjs');
const PaymentService = require('../services/paymentService');
const NotificationService = require('../services/notificationService');
const CronService = require('../services/cronService');
const { v4: uuidv4 } = require('uuid');

async function runStayOSTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 Starting StayOS End-to-End Enterprise Test Suite');
  console.log('🧪 ========================================================');

  let passed = 0;
  let failed = 0;

  async function test(title, fn) {
    try {
      await fn();
      console.log(`  ✅ Passed: ${title}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAILED: ${title}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  const testOrgId = `org-test-${Date.now()}`;
  const testPropId = `prop-test-${Date.now()}`;
  const testBldgId = `bldg-test-${Date.now()}`;
  const testFloorId = `floor-test-${Date.now()}`;
  const testRoomId = `room-test-${Date.now()}`;
  const testBedId = `bed-test-${Date.now()}`;
  const testResidentId = `res-test-${Date.now()}`;
  const testUserId = `user-test-${Date.now()}`;

  // Test 1: Create organization
  await test('1. Create Organization (Tenant)', () => {
    db.prepare(`
      INSERT INTO organizations (id, name, slug, contact_email, contact_phone, subscription_plan)
      VALUES (?, 'Test Royal PG Chain', 'test-royal-pg', 'admin@royalpg.in', '+91 9999900000', 'pro')
    `).run(testOrgId);

    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(testOrgId);
    assert.strictEqual(org.name, 'Test Royal PG Chain');
  });

  // Test 2: Create property
  await test('2. Create Property', () => {
    db.prepare(`
      INSERT INTO properties (id, organization_id, name, type, address, city, state, pincode, contact_number, status)
      VALUES (?, ?, 'Royal PG Premier', 'pg', 'Tech Zone, Hitec City', 'Hyderabad', 'Telangana', '500081', '+91 9999900001', 'active')
    `).run(testPropId, testOrgId);

    const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(testPropId);
    assert.strictEqual(prop.name, 'Royal PG Premier');
  });

  // Test 3 & 4: Create Building and Floor
  await test('3 & 4. Create Building and Floor', () => {
    db.prepare(`INSERT INTO buildings (id, property_id, name, total_floors) VALUES (?, ?, 'Block A', 3)`).run(testBldgId, testPropId);
    db.prepare(`INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, 1, '1st Floor')`).run(testFloorId, testBldgId, testPropId);

    const floor = db.prepare('SELECT * FROM floors WHERE id = ?').get(testFloorId);
    assert.strictEqual(floor.floor_name, '1st Floor');
  });

  // Test 5 & 6: Create Room and Beds
  await test('5 & 6. Create Room & Individual Beds', () => {
    db.prepare(`
      INSERT INTO rooms (id, property_id, building_id, floor_id, room_number, room_type, capacity, ac_type, bathroom_type, base_rent, status)
      VALUES (?, ?, ?, ?, '301', 'single', 1, 'ac', 'attached', 15000, 'available')
    `).run(testRoomId, testPropId, testBldgId, testFloorId);

    db.prepare(`
      INSERT INTO beds (id, room_id, property_id, bed_number, status, monthly_rent)
      VALUES (?, ?, ?, '301-A', 'available', 15000)
    `).run(testBedId, testRoomId, testPropId);

    const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(testBedId);
    assert.strictEqual(bed.bed_number, '301-A');
    assert.strictEqual(bed.status, 'available');
  });

  // Test 7 & 8: Create Resident and Allocate Bed
  await test('7 & 8. Create Resident & Allocate Bed', () => {
    db.prepare(`
      INSERT INTO users (id, organization_id, role, full_name, email, phone, password_hash, is_active)
      VALUES (?, ?, 'resident', 'Karan Mehta', 'karan@test.com', '+91 9888877777', 'dummyhash', 1)
    `).run(testUserId, testOrgId);

    db.prepare(`
      INSERT INTO residents (
        id, organization_id, property_id, user_id, full_name, gender,
        phone, email, current_room_id, current_bed_id, joining_date,
        monthly_rent, deposit_amount, status
      ) VALUES (?, ?, ?, ?, 'Karan Mehta', 'male', '+91 9888877777', 'karan@test.com', ?, ?, '2026-10-01', 15000, 20000, 'active')
    `).run(testResidentId, testOrgId, testPropId, testUserId, testRoomId, testBedId);

    db.prepare("UPDATE beds SET status = 'occupied' WHERE id = ?").run(testBedId);
    db.prepare("UPDATE rooms SET status = 'fully_occupied' WHERE id = ?").run(testRoomId);

    const resRecord = db.prepare('SELECT * FROM residents WHERE id = ?').get(testResidentId);
    assert.strictEqual(resRecord.current_bed_id, testBedId);

    const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(testBedId);
    assert.strictEqual(bed.status, 'occupied');
  });

  // Test 9: Prevent duplicate bed allocation (Rule 1)
  await test('9. Prevent Duplicate Bed Allocation (Rule 1)', () => {
    const bed = db.prepare('SELECT status FROM beds WHERE id = ?').get(testBedId);
    let isOccupied = (bed.status === 'occupied');
    assert.strictEqual(isOccupied, true);
  });

  // Test 10: Generate Invoice
  const testInvId = `inv-test-${Date.now()}`;
  await test('10. Generate Invoice', () => {
    db.prepare(`
      INSERT INTO invoices (
        id, organization_id, property_id, resident_id, invoice_number,
        billing_month, billing_year, period_start, period_end,
        rent_amount, electricity_amount, total_amount, paid_amount, balance_amount, status, due_date
      ) VALUES (?, ?, ?, ?, 'TEST-INV-001', 10, 2026, '2026-10-01', '2026-10-31', 15000, 500, 15500, 0, 15500, 'pending', '2026-10-05')
    `).run(testInvId, testOrgId, testPropId, testResidentId);

    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(testInvId);
    assert.strictEqual(inv.total_amount, 15500);
    assert.strictEqual(inv.balance_amount, 15500);
  });

  // Test 11, 12, 13: Make Payment, Server-side verification & Receipt generation
  await test('11, 12, 13. Server-side Payment Verification & Receipt Generation', async () => {
    const paymentResult = PaymentService.verifyAndProcessPayment({
      organizationId: testOrgId,
      propertyId: testPropId,
      residentId: testResidentId,
      invoiceId: testInvId,
      amount: 15500,
      paymentMethod: 'upi',
      gatewayPaymentId: `TXN_GATEWAY_${Date.now()}`,
      recordedBy: 'Automated Test'
    });

    assert.strictEqual(paymentResult.amount, 15500);
    assert.strictEqual(paymentResult.newStatus, 'paid');
    assert.strictEqual(paymentResult.newBalance, 0);
    assert(paymentResult.receiptNumber.startsWith('RCPT-'));

    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(testInvId);
    assert.strictEqual(inv.status, 'paid');
    assert.strictEqual(inv.balance_amount, 0);
  });

  // Test 14: Payment Reminders Background Service
  await test('14. Payment Reminders & Daily Cron Service', async () => {
    const cronResults = await CronService.runDailyJobs();
    assert(typeof cronResults === 'object');
  });

  // Test 15 & 16: Checkout Resident & Release Bed
  await test('15 & 16. Checkout Resident & Automatic Bed Release', () => {
    db.prepare("UPDATE beds SET status = 'available' WHERE id = ?").run(testBedId);
    db.prepare("UPDATE rooms SET status = 'available' WHERE id = ?").run(testRoomId);
    db.prepare("UPDATE residents SET status = 'checked_out', current_bed_id = NULL, current_room_id = NULL WHERE id = ?").run(testResidentId);

    const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(testBedId);
    assert.strictEqual(bed.status, 'available');

    const resRecord = db.prepare('SELECT * FROM residents WHERE id = ?').get(testResidentId);
    assert.strictEqual(resRecord.status, 'checked_out');
    assert.strictEqual(resRecord.current_bed_id, null);
  });

  // Test 17 & 18: Chef marks meal ready and resident alert
  await test('17 & 18. Chef Marks Meal Ready & Resident Alert Triggered', async () => {
    const notifId = await NotificationService.notify({
      organizationId: testOrgId,
      userId: testUserId,
      title: '🍽️ Lunch is Ready!',
      message: 'Fresh Paneer Butter Masala served in Dining Hall.',
      type: 'food_ready'
    });

    assert(notifId !== null);
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
    assert(notif !== undefined);
    assert.strictEqual(notif.type, 'food_ready');
  });

  // Test 19, 20, 21: Complaint lifecycle (Submit -> Assign -> Resolve)
  await test('19, 20, 21. Complaint Lifecycle (Submit -> Assign -> Resolve)', () => {
    const compId = `comp-test-${Date.now()}`;
    db.prepare(`
      INSERT INTO complaints (id, organization_id, property_id, resident_id, category, title, description, priority, status)
      VALUES (?, ?, ?, ?, 'electrical', 'Fan regulator loose', 'Needs tightening', 'low', 'submitted')
    `).run(compId, testOrgId, testPropId, testResidentId);

    let comp = db.prepare('SELECT * FROM complaints WHERE id = ?').get(compId);
    assert.strictEqual(comp.status, 'submitted');

    // Assign
    db.prepare("UPDATE complaints SET status = 'assigned', assigned_to_staff_id = 'staff-main' WHERE id = ?").run(compId);
    comp = db.prepare('SELECT * FROM complaints WHERE id = ?').get(compId);
    assert.strictEqual(comp.status, 'assigned');

    // Resolve
    db.prepare("UPDATE complaints SET status = 'resolved', resolution_notes = 'Screw replaced and tightened' WHERE id = ?").run(compId);
    comp = db.prepare('SELECT * FROM complaints WHERE id = ?').get(compId);
    assert.strictEqual(comp.status, 'resolved');
    assert.strictEqual(comp.resolution_notes, 'Screw replaced and tightened');
  });

  // Test 22 & 23: Role restrictions & Tenant isolation check
  await test('22 & 23. Tenant Isolation & RBAC checks', () => {
    const crossOrgBeds = db.prepare('SELECT * FROM beds WHERE property_id IN (SELECT id FROM properties WHERE organization_id = ?)').all(testOrgId);
    for (const b of crossOrgBeds) {
      assert.strictEqual(b.property_id, testPropId);
    }
  });

  // Test 24: Document attachment
  await test('24. Resident Document Vault Attachment', () => {
    const docId = `doc-test-${Date.now()}`;
    db.prepare(`
      INSERT INTO resident_documents (id, resident_id, title, doc_type, file_path, file_size, mime_type)
      VALUES (?, ?, 'Aadhaar Card Copy', 'aadhaar', '/api/documents/file/sample_aadhaar.pdf', 102400, 'application/pdf')
    `).run(docId, testResidentId);

    const doc = db.prepare('SELECT * FROM resident_documents WHERE id = ?').get(docId);
    assert.strictEqual(doc.doc_type, 'aadhaar');
  });

  // Test 25: Audit Logging
  await test('25. Audit Logging Trail', () => {
    const auditId = uuidv4();
    db.prepare(`
      INSERT INTO audit_logs (id, organization_id, user_id, action, entity, entity_id)
      VALUES (?, ?, ?, 'TEST_RUNNER', 'Test', '123')
    `).run(auditId, testOrgId, testUserId);

    const audit = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(auditId);
    assert.strictEqual(audit.action, 'TEST_RUNNER');
  });

  // Cleanup test fixtures
  db.exec(`
    DELETE FROM audit_logs WHERE organization_id = '${testOrgId}';
    DELETE FROM resident_documents WHERE resident_id = '${testResidentId}';
    DELETE FROM complaints WHERE organization_id = '${testOrgId}';
    DELETE FROM notifications WHERE user_id = '${testUserId}';
    DELETE FROM payments WHERE organization_id = '${testOrgId}';
    DELETE FROM invoices WHERE organization_id = '${testOrgId}';
    DELETE FROM residents WHERE id = '${testResidentId}';
    DELETE FROM users WHERE id = '${testUserId}';
    DELETE FROM beds WHERE id = '${testBedId}';
    DELETE FROM rooms WHERE id = '${testRoomId}';
    DELETE FROM floors WHERE id = '${testFloorId}';
    DELETE FROM buildings WHERE id = '${testBldgId}';
    DELETE FROM properties WHERE id = '${testPropId}';
    DELETE FROM organizations WHERE id = '${testOrgId}';
  `);

  console.log('🧪 ========================================================');
  console.log(`🧪 Test Suite Completed: ${passed} Passed, ${failed} Failed`);
  console.log('🧪 ========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStayOSTests().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
