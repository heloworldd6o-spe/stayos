const bcrypt = require('bcryptjs');
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

async function seedData() {
  console.log('🌱 Seeding StayOS database with rich production demo data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Clear existing data safely
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM notification_preferences;
    DELETE FROM notifications;
    DELETE FROM notices;
    DELETE FROM visitors;
    DELETE FROM staff_attendance;
    DELETE FROM maintenance_tasks;
    DELETE FROM complaints;
    DELETE FROM meal_opt_outs;
    DELETE FROM meal_daily_status;
    DELETE FROM meal_plans;
    DELETE FROM expenses;
    DELETE FROM refunds;
    DELETE FROM payments;
    DELETE FROM invoices;
    DELETE FROM checkin_checkout_records;
    DELETE FROM room_allocations;
    DELETE FROM resident_documents;
    DELETE FROM residents;
    DELETE FROM beds;
    DELETE FROM rooms;
    DELETE FROM floors;
    DELETE FROM buildings;
    DELETE FROM properties;
    DELETE FROM staff;
    DELETE FROM users;
    DELETE FROM subscriptions;
    DELETE FROM organizations;
    DELETE FROM plans;
  `);

  // 1. Seed Plans
  const insertPlan = db.prepare(`
    INSERT INTO plans (id, code, name, description, price_monthly, price_annual, max_properties, max_beds, max_staff, features)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPlan.run(
    'plan-starter', 'starter', 'Starter PG', 'For single PG/Hostel owners managing up to 50 beds',
    1499, 14990, 1, 50, 5,
    JSON.stringify(['Room & Bed Allocation', 'Resident KYC & Documents', 'Rent & Deposit Invoicing', 'UPI Payments & Receipts', 'Basic Complaints', 'Email Support'])
  );

  insertPlan.run(
    'plan-growth', 'growth', 'Growth Co-Living', 'Best for growing multi-property PG businesses up to 200 beds',
    3499, 34990, 3, 200, 15,
    JSON.stringify(['Everything in Starter', 'Multi-Property Support', 'Chef & Mess Management', 'WhatsApp Reminders', 'Staff Attendance', 'Maintenance Task Tracking', 'Financial Analytics', 'Priority Support'])
  );

  insertPlan.run(
    'plan-pro', 'pro', 'Professional Hostels', 'For large student hostels & co-living chains up to 600 beds',
    6999, 69990, 10, 600, 50,
    JSON.stringify(['Everything in Growth', 'Biometric/RFID Sync', 'Custom Subdomain & Branding', 'Automated GST Invoices', 'Visitor Gate Passes', 'Advanced Role Permissions', 'Dedicated Account Manager'])
  );

  insertPlan.run(
    'plan-enterprise', 'enterprise', 'Enterprise Chain', 'Custom infrastructure for nationwide hostel networks',
    14999, 149990, 999, 9999, 999,
    JSON.stringify(['Everything in Professional', 'Unlimited Properties & Beds', 'Custom API Integrations', 'SLA 99.9% Uptime', 'Custom Contract & Training', 'Multi-branch Centralized Ledger'])
  );

  // 2. Seed Super Admin
  const insertUser = db.prepare(`
    INSERT INTO users (id, organization_id, role, full_name, email, phone, password_hash, avatar_url, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'user-superadmin', null, 'super_admin', 'SaaS Platform Admin', 'admin@stayos.com', '+91 9876543200', passwordHash, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 1
  );

  // 3. Seed Organization
  const orgId = 'org-urbanstay';
  const insertOrg = db.prepare(`
    INSERT INTO organizations (id, name, slug, logo_url, contact_email, contact_phone, address, currency, currency_symbol, timezone, invoice_prefix, late_fee_percentage, late_fee_grace_days, gst_enabled, gst_number, subscription_plan, subscription_status, max_properties, max_beds, max_staff)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertOrg.run(
    orgId, 'UrbanStay Management', 'urbanstay', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=150&auto=format&fit=crop&q=80',
    'contact@urbanstay.in', '+91 9876501234', 'Plot 42, Silicon Valley Layout, Madhapur, Hyderabad, Telangana 500081',
    'INR', '₹', 'Asia/Kolkata', 'USTAY', 2.0, 5, 1, '36AABCU9603R1ZM', 'growth', 'active', 5, 200, 20
  );

  // Seed Org Subscription
  db.prepare(`
    INSERT INTO subscriptions (id, organization_id, plan_id, status, start_date, end_date, amount, billing_cycle)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('sub-1', orgId, 'plan-growth', 'active', '2026-01-01', '2027-01-01', 34990, 'annual');

  // 4. Seed Org Users for all Roles
  const users = [
    { id: 'user-owner', role: 'owner', name: 'Rajesh Sharma', email: 'owner@urbanstay.com', phone: '+91 9849011111', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { id: 'user-manager', role: 'manager', name: 'Vikram Reddy', email: 'manager@urbanstay.com', phone: '+91 9849022222', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
    { id: 'user-accountant', role: 'accountant', name: 'Priya Nair', email: 'accountant@urbanstay.com', phone: '+91 9849033333', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
    { id: 'user-warden', role: 'warden', name: 'Suresh Kumar', email: 'warden@urbanstay.com', phone: '+91 9849044444', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
    { id: 'user-receptionist', role: 'receptionist', name: 'Ananya Sen', email: 'reception@urbanstay.com', phone: '+91 9849055555', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
    { id: 'user-chef', role: 'chef', name: 'Master Chef Ramu', email: 'chef@urbanstay.com', phone: '+91 9849066666', avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80' },
    { id: 'user-kitchen', role: 'kitchen_staff', name: 'Mani Shankar', email: 'kitchen@urbanstay.com', phone: '+91 9849077777', avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80' },
    { id: 'user-maintenance', role: 'maintenance', name: 'Karthik Verma', email: 'maintenance@urbanstay.com', phone: '+91 9849088888', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
    { id: 'user-resident1', role: 'resident', name: 'Aarav Patel', email: 'resident@urbanstay.com', phone: '+91 9849099991', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
    { id: 'user-resident2', role: 'resident', name: 'Sneha Rao', email: 'resident2@urbanstay.com', phone: '+91 9849099992', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    { id: 'user-resident3', role: 'resident', name: 'Rohan Gupta', email: 'resident3@urbanstay.com', phone: '+91 9849099993', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' }
  ];

  for (const u of users) {
    insertUser.run(u.id, orgId, u.role, u.name, u.email, u.phone, passwordHash, u.avatar, 1);
    
    // Create default notification preferences
    db.prepare(`
      INSERT INTO notification_preferences (id, user_id, in_app_enabled, email_enabled, whatsapp_enabled, sms_enabled, food_alerts, payment_alerts, complaint_alerts, notice_alerts)
      VALUES (?, ?, 1, 1, 1, 0, 1, 1, 1, 1)
    `).run(uuidv4(), u.id);
  }

  // 5. Seed Properties
  const propMadhapur = 'prop-madhapur';
  const propGachibowli = 'prop-gachibowli';

  const insertProp = db.prepare(`
    INSERT INTO properties (id, organization_id, name, type, address, city, state, pincode, contact_number, email, manager_id, amenities, rules, photos, rent_due_day, grace_period_days, late_fee_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProp.run(
    propMadhapur, orgId, 'UrbanStay Madhapur (Luxury Co-Living)', 'coliving',
    'Road No. 36, Near Metro Pillar 1420, Madhapur', 'Hyderabad', 'Telangana', '500081',
    '+91 9876501234', 'madhapur@urbanstay.in', 'user-manager',
    JSON.stringify(['High-Speed 5G Wi-Fi', 'Daily 3-Time Chef Meals', 'Air Conditioned Rooms', '24/7 Power Backup', 'RO Water Purifier', 'Laundry & Washing Machines', 'Biometric Security & CCTV', 'Gaming & Lounge Zone', 'Daily Housekeeping']),
    JSON.stringify(['No smoking inside rooms', 'Visitors allowed in common lounge until 9:30 PM', 'Quiet hours from 11:00 PM to 6:00 AM', 'Inform chef 4 hours prior if skipping meals']),
    JSON.stringify(['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80']),
    5, 3, 250, 'active'
  );

  insertProp.run(
    propGachibowli, orgId, 'UrbanStay Gachibowli (Tech & Student PG)', 'pg',
    'Opposite Bio-Diversity Park, Financial District, Gachibowli', 'Hyderabad', 'Telangana', '500032',
    '+91 9876505678', 'gachibowli@urbanstay.in', 'user-manager',
    JSON.stringify(['High-Speed Wi-Fi', 'South & North Indian Meals', 'Split AC', 'Lift & Power Backup', 'Housekeeping 6 Days/Week', 'CCTV Security']),
    JSON.stringify(['Gate closes at 11:00 PM', 'No non-veg preparation allowed in room', 'Maintain room hygiene']),
    JSON.stringify(['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=80']),
    5, 3, 250, 'active'
  );

  // 6. Seed Buildings & Floors for Madhapur & Gachibowli
  const bldgA = 'bldg-a';
  db.prepare(`INSERT INTO buildings (id, property_id, name, code, total_floors) VALUES (?, ?, ?, ?, ?)`).run(bldgA, propMadhapur, 'Tower Alpha (Sunrise Wing)', 'ALPHA', 3);

  const floorG = 'floor-0';
  const floor1 = 'floor-1';
  const floor2 = 'floor-2';
  db.prepare(`INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, ?, ?)`).run(floorG, bldgA, propMadhapur, 0, 'Ground Floor (Lounge & Dining)');
  db.prepare(`INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, ?, ?)`).run(floor1, bldgA, propMadhapur, 1, '1st Floor (Executive Suites)');
  db.prepare(`INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, ?, ?)`).run(floor2, bldgA, propMadhapur, 2, '2nd Floor (Deluxe Sharing)');

  const bldgB = 'bldg-gachibowli-main';
  db.prepare(`INSERT INTO buildings (id, property_id, name, code, total_floors) VALUES (?, ?, ?, ?, ?)`).run(bldgB, propGachibowli, 'Main Wing', 'MAIN', 3);
  db.prepare(`INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, ?, ?)`).run('floor-gachibowli-0', bldgB, propGachibowli, 0, 'Ground Floor (Reception & Common Area)');
  db.prepare(`INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, ?, ?)`).run('floor-gachibowli-1', bldgB, propGachibowli, 1, '1st Floor (Standard Rooms)');
  db.prepare(`INSERT INTO floors (id, building_id, property_id, floor_number, floor_name) VALUES (?, ?, ?, ?, ?)`).run('floor-gachibowli-2', bldgB, propGachibowli, 2, '2nd Floor (Premium Sharing)');

  // 7. Seed Rooms for Madhapur
  const insertRoom = db.prepare(`
    INSERT INTO rooms (id, property_id, building_id, floor_id, room_number, room_type, capacity, ac_type, bathroom_type, base_rent, base_deposit, amenities, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const room101 = 'room-101';
  const room102 = 'room-102';
  const room103 = 'room-103';
  const room201 = 'room-201';
  const room202 = 'room-202';
  const room203 = 'room-203';

  insertRoom.run(room101, propMadhapur, bldgA, floor1, '101', 'single', 1, 'ac', 'attached', 16000, 30000, JSON.stringify(['Balcony', 'Study Desk', 'Ergonomic Chair', 'King Single Bed', 'Wardrobe', 'Smart TV']), 'fully_occupied');
  insertRoom.run(room102, propMadhapur, bldgA, floor1, '102', 'double', 2, 'ac', 'attached', 12000, 20000, JSON.stringify(['Study Tables', 'Dual Wardrobes', 'Balcony', 'Geyser']), 'partially_occupied');
  insertRoom.run(room103, propMadhapur, bldgA, floor1, '103', 'triple', 3, 'ac', 'attached', 9500, 15000, JSON.stringify(['Study Tables', 'Triple Wardrobes', 'Geyser']), 'partially_occupied');
  insertRoom.run(room201, propMadhapur, bldgA, floor2, '201', 'double', 2, 'ac', 'attached', 11500, 20000, JSON.stringify(['Dual Wardrobes', 'Work Desk', 'Geyser']), 'available');
  insertRoom.run(room202, propMadhapur, bldgA, floor2, '202', 'double', 2, 'non_ac', 'attached', 8500, 15000, JSON.stringify(['Dual Wardrobes', 'Ceiling Fan', 'Study Table']), 'available');
  insertRoom.run(room203, propMadhapur, bldgA, floor2, '203', 'four_sharing', 4, 'non_ac', 'attached', 7500, 12000, JSON.stringify(['Individual Lockers', 'Study Area']), 'available');

  // 8. Seed Beds
  const insertBed = db.prepare(`
    INSERT INTO beds (id, room_id, property_id, bed_number, status, monthly_rent)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const bed101A = 'bed-101-A';
  const bed102A = 'bed-102-A';
  const bed102B = 'bed-102-B';
  const bed103A = 'bed-103-A';
  const bed103B = 'bed-103-B';
  const bed103C = 'bed-103-C';
  const bed201A = 'bed-201-A';
  const bed201B = 'bed-201-B';
  const bed202A = 'bed-202-A';
  const bed202B = 'bed-202-B';
  const bed203A = 'bed-203-A';
  const bed203B = 'bed-203-B';
  const bed203C = 'bed-203-C';
  const bed203D = 'bed-203-D';

  insertBed.run(bed101A, room101, propMadhapur, '101-A', 'occupied', 16000);
  insertBed.run(bed102A, room102, propMadhapur, '102-A', 'occupied', 12000);
  insertBed.run(bed102B, room102, propMadhapur, '102-B', 'available', 12000);
  insertBed.run(bed103A, room103, propMadhapur, '103-A', 'occupied', 9500);
  insertBed.run(bed103B, room103, propMadhapur, '103-B', 'available', 9500);
  insertBed.run(bed103C, room103, propMadhapur, '103-C', 'available', 9500);
  insertBed.run(bed201A, room201, propMadhapur, '201-A', 'available', 11500);
  insertBed.run(bed201B, room201, propMadhapur, '201-B', 'available', 11500);
  insertBed.run(bed202A, room202, propMadhapur, '202-A', 'available', 8500);
  insertBed.run(bed202B, room202, propMadhapur, '202-B', 'maintenance', 8500);
  insertBed.run(bed203A, room203, propMadhapur, '203-A', 'available', 7500);
  insertBed.run(bed203B, room203, propMadhapur, '203-B', 'available', 7500);
  insertBed.run(bed203C, room203, propMadhapur, '203-C', 'available', 7500);
  insertBed.run(bed203D, room203, propMadhapur, '203-D', 'available', 7500);

  // 9. Seed Residents
  const insertResident = db.prepare(`
    INSERT INTO residents (id, organization_id, property_id, user_id, full_name, photo_url, gender, dob, phone, email, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, permanent_address, id_type, id_number, id_document_url, occupation, organization_or_college, food_preference, medical_notes, current_room_id, current_bed_id, joining_date, expected_checkout_date, monthly_rent, deposit_amount, discount_amount, rent_due_day, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const res1 = 'res-aarav';
  const res2 = 'res-sneha';
  const res3 = 'res-rohan';

  insertResident.run(
    res1, orgId, propMadhapur, 'user-resident1', 'Aarav Patel', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'male', '1998-05-14', '+91 9849099991', 'resident@urbanstay.com',
    'Mahesh Patel (Father)', '+91 9825012345', 'Father', 'B-402, Shanti Heights, Ahmedabad, Gujarat 380015',
    'aadhaar', '5432-8765-1098', '/uploads/docs/sample_aadhaar.pdf', 'working_professional', 'Microsoft India R&D',
    'veg', 'None', room101, bed101A, '2026-01-05', '2027-01-05', 16000, 30000, 0, 5, 'active'
  );

  insertResident.run(
    res2, orgId, propMadhapur, 'user-resident2', 'Sneha Rao', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'female', '2001-11-20', '+91 9849099992', 'resident2@urbanstay.com',
    'Sunita Rao (Mother)', '+91 9848054321', 'Mother', 'Plot 12, Indiranagar, Bengaluru, Karnataka 560038',
    'aadhaar', '8765-4321-2109', '/uploads/docs/sample_aadhaar2.pdf', 'student', 'IIIT Hyderabad (M.Tech)',
    'veg', 'Mild dust allergy', room102, bed102A, '2026-02-01', '2026-12-31', 12000, 20000, 500, 5, 'active'
  );

  insertResident.run(
    res3, orgId, propMadhapur, 'user-resident3', 'Rohan Gupta', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    'male', '1999-08-10', '+91 9849099993', 'resident3@urbanstay.com',
    'Dinesh Gupta (Father)', '+91 9811098765', 'Father', 'Sector 14, Gurgaon, Haryana 122001',
    'aadhaar', '9012-3456-7890', '/uploads/docs/sample_aadhaar3.pdf', 'working_professional', 'Amazon Dev Center',
    'non_veg', 'None', room103, bed103A, '2026-01-15', '2026-11-15', 9500, 15000, 0, 5, 'active'
  );

  // 10. Allocations History
  const insertAlloc = db.prepare(`
    INSERT INTO room_allocations (id, resident_id, bed_id, room_id, property_id, start_date, end_date, monthly_rent, deposit_paid, allocated_by, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAlloc.run(uuidv4(), res1, bed101A, room101, propMadhapur, '2026-01-05', null, 16000, 30000, 'Vikram Reddy (Manager)', 'active');
  insertAlloc.run(uuidv4(), res2, bed102A, room102, propMadhapur, '2026-02-01', null, 12000, 20000, 'Ananya Sen (Reception)', 'active');
  insertAlloc.run(uuidv4(), res3, bed103A, room103, propMadhapur, '2026-01-15', null, 9500, 15000, 'Vikram Reddy (Manager)', 'active');

  // 11. Staff Records
  const insertStaff = db.prepare(`
    INSERT INTO staff (id, organization_id, user_id, property_id, name, phone, email, role, joining_date, salary, emergency_contact, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertStaff.run('staff-mgr', orgId, 'user-manager', propMadhapur, 'Vikram Reddy', '+91 9849022222', 'manager@urbanstay.com', 'manager', '2025-06-01', 45000, '+91 9849000001', 'active');
  insertStaff.run('staff-acct', orgId, 'user-accountant', propMadhapur, 'Priya Nair', '+91 9849033333', 'accountant@urbanstay.com', 'accountant', '2025-07-01', 38000, '+91 9849000002', 'active');
  insertStaff.run('staff-ward', orgId, 'user-warden', propMadhapur, 'Suresh Kumar', '+91 9849044444', 'warden@urbanstay.com', 'warden', '2025-08-01', 30000, '+91 9849000003', 'active');
  insertStaff.run('staff-recp', orgId, 'user-receptionist', propMadhapur, 'Ananya Sen', '+91 9849055555', 'reception@urbanstay.com', 'receptionist', '2025-09-01', 28000, '+91 9849000004', 'active');
  insertStaff.run('staff-chef', orgId, 'user-chef', propMadhapur, 'Master Chef Ramu', '+91 9849066666', 'chef@urbanstay.com', 'chef', '2025-05-15', 35000, '+91 9849000005', 'active');
  insertStaff.run('staff-kitc', orgId, 'user-kitchen', propMadhapur, 'Mani Shankar', '+91 9849077777', 'kitchen@urbanstay.com', 'kitchen_staff', '2025-06-15', 20000, '+91 9849000006', 'active');
  insertStaff.run('staff-main', orgId, 'user-maintenance', propMadhapur, 'Karthik Verma', '+91 9849088888', 'maintenance@urbanstay.com', 'maintenance', '2025-07-15', 24000, '+91 9849000007', 'active');

  // 12. Staff Attendance for today
  const todayStr = '2026-10-01';
  const insertAttendance = db.prepare(`
    INSERT INTO staff_attendance (id, organization_id, property_id, staff_id, date, check_in_time, check_out_time, status, notes, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAttendance.run(uuidv4(), orgId, propMadhapur, 'staff-mgr', todayStr, '08:45 AM', null, 'present', 'On duty', 'Vikram Reddy');
  insertAttendance.run(uuidv4(), orgId, propMadhapur, 'staff-acct', todayStr, '09:00 AM', null, 'present', 'On duty', 'Priya Nair');
  insertAttendance.run(uuidv4(), orgId, propMadhapur, 'staff-ward', todayStr, '08:30 AM', null, 'present', 'On duty', 'Suresh Kumar');
  insertAttendance.run(uuidv4(), orgId, propMadhapur, 'staff-recp', todayStr, '08:50 AM', null, 'present', 'Front desk open', 'Ananya Sen');
  insertAttendance.run(uuidv4(), orgId, propMadhapur, 'staff-chef', todayStr, '06:00 AM', null, 'present', 'Kitchen active for Breakfast & Lunch', 'Master Chef Ramu');
  insertAttendance.run(uuidv4(), orgId, propMadhapur, 'staff-kitc', todayStr, '06:15 AM', null, 'present', 'Food prep', 'Mani Shankar');
  insertAttendance.run(uuidv4(), orgId, propMadhapur, 'staff-main', todayStr, '09:15 AM', null, 'present', 'Inspecting AC complaints', 'Karthik Verma');

  // 13. Invoices (Paid, Pending, Overdue)
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, organization_id, property_id, resident_id, invoice_number, billing_month, billing_year, period_start, period_end, rent_amount, electricity_amount, mess_amount, laundry_amount, maintenance_amount, late_fee_amount, discount_amount, tax_amount, total_amount, paid_amount, balance_amount, status, due_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inv1 = 'inv-202610-001';
  const inv2 = 'inv-202610-002';
  const inv3 = 'inv-202610-003';
  const invSept1 = 'inv-202609-001';

  // October Invoices
  insertInvoice.run(
    inv1, orgId, propMadhapur, res1, 'USTAY-2026-10-001', 10, 2026, '2026-10-01', '2026-10-31',
    16000, 450, 0, 0, 500, 0, 0, 0,
    16950, 16950, 0, 'paid', '2026-10-05', 'October 2026 Monthly Rent & Utilities'
  );

  insertInvoice.run(
    inv2, orgId, propMadhapur, res2, 'USTAY-2026-10-002', 10, 2026, '2026-10-01', '2026-10-31',
    12000, 300, 0, 0, 500, 0, 500, 0,
    12300, 0, 12300, 'pending', '2026-10-05', 'October 2026 Rent - Due on 5th Oct'
  );

  insertInvoice.run(
    inv3, orgId, propMadhapur, res3, 'USTAY-2026-10-003', 10, 2026, '2026-10-01', '2026-10-31',
    9500, 350, 0, 0, 500, 250, 0, 0,
    10600, 5000, 5600, 'partially_paid', '2026-09-25', 'Overdue Balance with Late Fee'
  );

  // September Invoices (History)
  insertInvoice.run(
    invSept1, orgId, propMadhapur, res1, 'USTAY-2026-09-001', 9, 2026, '2026-09-01', '2026-09-30',
    16000, 520, 0, 0, 500, 0, 0, 0,
    17020, 17020, 0, 'paid', '2026-09-05', 'September 2026 Monthly Rent'
  );

  // 14. Payments (Receipts)
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, organization_id, property_id, resident_id, invoice_id, transaction_id, receipt_number, amount, payment_method, status, payment_date, gateway_order_id, gateway_payment_id, gateway_signature, notes, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPayment.run(
    'pay-101', orgId, propMadhapur, res1, inv1, 'TXN_UPI_984920261001', 'RCPT-2026-1001',
    16950, 'upi', 'successful', '2026-10-01 10:15:22', 'order_pay_oct_101', 'pay_razor_99182', 'sig_valid_verified_hash_99182',
    'Paid via Google Pay UPI (aarav@okaxis)', 'Verified Online Gateway'
  );

  insertPayment.run(
    'pay-102', orgId, propMadhapur, res3, inv3, 'TXN_CASH_20261001_03', 'RCPT-2026-1002',
    5000, 'cash', 'successful', '2026-10-01 11:30:00', null, null, null,
    'Partial cash advance paid at reception', 'Ananya Sen (Receptionist)'
  );

  insertPayment.run(
    'pay-sept-101', orgId, propMadhapur, res1, invSept1, 'TXN_UPI_984920260905', 'RCPT-2026-0901',
    17020, 'upi', 'successful', '2026-09-04 18:20:10', 'order_pay_sep_101', 'pay_razor_88121', 'sig_valid_verified_hash_88121',
    'Paid via PhonePe UPI', 'Verified Online Gateway'
  );

  // 15. Expenses
  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, organization_id, property_id, category, amount, expense_date, description, vendor_name, receipt_url, payment_mode, added_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertExpense.run(uuidv4(), orgId, propMadhapur, 'food', 48500, '2026-09-28', 'Monthly Vegetables, Rice, Pulses, Dairy & Spices', 'Sri Krishna Wholesale Grocers', null, 'bank_transfer', 'Priya Nair (Accountant)');
  insertExpense.run(uuidv4(), orgId, propMadhapur, 'electricity', 22400, '2026-09-25', 'TSSPDCL Commercial Power Bill for Sept 2026', 'Telangana State Power Corp', null, 'upi', 'Priya Nair (Accountant)');
  insertExpense.run(uuidv4(), orgId, propMadhapur, 'internet', 4200, '2026-09-20', 'ACT Fibernet 1 Gbps Leased Line Connection', 'ACT Fibernet', null, 'bank_transfer', 'Priya Nair (Accountant)');
  insertExpense.run(uuidv4(), orgId, propMadhapur, 'supplies', 6500, '2026-09-18', 'Housekeeping detergents, phenyl, garbage bags, hand wash', 'CleanPro Mart', null, 'cash', 'Vikram Reddy (Manager)');
  insertExpense.run(uuidv4(), orgId, propMadhapur, 'maintenance', 3200, '2026-09-15', 'Geyser heating coil replacement Room 103 & 202', 'Modern Electrical Works', null, 'cash', 'Karthik Verma (Maintenance)');

  // 16. Weekly Meal Plans (Mon - Sun)
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const insertMeal = db.prepare(`
    INSERT INTO meal_plans (id, property_id, day_of_week, meal_type, menu_title, menu_items, timing)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const mealSchedule = {
    monday: {
      breakfast: { title: 'Idli & Medu Vada Combo', items: ['Steamed Idli (3 pcs)', 'Crispy Medu Vada (1 pc)', 'Coconut Chutney', 'Hot Drumstick Sambar', 'Filter Coffee / Tea'], time: '7:30 AM - 9:30 AM' },
      lunch: { title: 'North Indian Veg Thali', items: ['Steamed Basmati Rice', 'Paneer Butter Masala', 'Yellow Dal Tadka', 'Phulka Rotis (3 pcs)', 'Curd & Salad', 'Papad'], time: '12:30 PM - 2:30 PM' },
      snacks: { title: 'Evening Chai & Snacks', items: ['Hot Masala Chai / Coffee', 'Onion Pakoda', 'Green Mint Chutney'], time: '5:00 PM - 6:30 PM' },
      dinner: { title: 'Homestyle Comfort Dinner', items: ['Aloo Gobi Dry Curry', 'Mix Veg Dal', 'Tawa Chapati', 'Jeera Rice', 'Gulab Jamun (1 pc)', 'Pickle'], time: '8:00 PM - 10:00 PM' }
    },
    tuesday: {
      breakfast: { title: 'Poha & Upma Fiesta', items: ['Kanda Poha with roasted peanuts', 'Rava Upma', 'Coconut Chutney', 'Banana', 'Tea/Coffee'], time: '7:30 AM - 9:30 AM' },
      lunch: { title: 'South Indian Executive Thali', items: ['Steamed Rice', 'Chole Masala', 'Gongura Pappu', 'Rasam', 'Bhendi Fry', 'Curd'], time: '12:30 PM - 2:30 PM' },
      snacks: { title: 'Samosa Chai', items: ['Punjabi Aloo Samosa (1 pc)', 'Masala Tea', 'Imli Chutney'], time: '5:00 PM - 6:30 PM' },
      dinner: { title: 'Dal Makhani & Naan Feast', items: ['Dal Makhani slow cooked', 'Mix Veg Korma', 'Butter Naan / Roti', 'Steamed Rice', 'Boondi Raita'], time: '8:00 PM - 10:00 PM' }
    },
    wednesday: {
      breakfast: { title: 'Crispy Masala Dosa', items: ['Butter Masala Dosa with potato filling', 'Allam (Ginger) Chutney', 'Sambar', 'Tea / Coffee'], time: '7:30 AM - 9:30 AM' },
      lunch: { title: 'Special Rajma Chawal', items: ['Punjabi Rajma Masala', 'Jeera Basmati Rice', 'Aloo Methi', 'Roti (3 pcs)', 'Salad & Curd'], time: '12:30 PM - 2:30 PM' },
      snacks: { title: 'Veg Cutlet & Tea', items: ['Crispy Veg Cutlet', 'Tomato Ketchup', 'Ginger Cardamom Chai'], time: '5:00 PM - 6:30 PM' },
      dinner: { title: 'Veg / Egg Curry Special', items: ['Egg Curry (for non-veg) / Kadai Paneer (veg)', 'Dal Fry', 'Tawa Paratha', 'Steamed Rice', 'Kheer'], time: '8:00 PM - 10:00 PM' }
    },
    thursday: {
      breakfast: { title: 'Poori Bhaji Feast', items: ['Fluffy Hot Pooris (4 pcs)', 'Aloo Tamatar Curry', 'Pickle', 'Tea / Coffee'], time: '7:30 AM - 9:30 AM' },
      lunch: { title: 'Kadhi Pakoda & Rice', items: ['Punjabi Kadhi Pakoda', 'Jeera Aloo', 'Steamed Rice', 'Phulka (3 pcs)', 'Papad & Curd'], time: '12:30 PM - 2:30 PM' },
      snacks: { title: 'Mirchi Bajji & Chai', items: ['Hyderabadi Stuffed Mirchi Bajji', 'Hot Tea', 'Onion salad'], time: '5:00 PM - 6:30 PM' },
      dinner: { title: 'Palak Paneer Special', items: ['Palak Paneer', 'Moong Dal Tadka', 'Phulka', 'Pulao Rice', 'Cucumber Raita'], time: '8:00 PM - 10:00 PM' }
    },
    friday: {
      breakfast: { title: 'Mysore Bonda & Uttapam', items: ['Mysore Bonda (3 pcs)', 'Onion Tomato Uttapam', 'Groundnut Chutney', 'Sambar', 'Tea/Coffee'], time: '7:30 AM - 9:30 AM' },
      lunch: { title: 'Veg Pulao & Dum Aloo', items: ['Kashmiri Dum Aloo', 'Mix Veg Pulao', 'Dal Palak', 'Tawa Chapati', 'Raita'], time: '12:30 PM - 2:30 PM' },
      snacks: { title: 'Pav Bhaji Snack', items: ['Mumbai Pav Bhaji with butter pav', 'Lemon & Onion slices', 'Masala Tea'], time: '5:00 PM - 6:30 PM' },
      dinner: { title: 'Biryani Special Night', items: ['Hyderabadi Veg Dum Biryani / Chicken Biryani', 'Mirchi Ka Salan', 'Dahi Raita', 'Double Ka Meetha'], time: '8:00 PM - 10:00 PM' }
    },
    saturday: {
      breakfast: { title: 'Aloo Paratha with Butter', items: ['Stuffed Aloo Paratha (2 pcs)', 'Amul Butter Cube', 'Fresh Curd', 'Mango Pickle', 'Tea/Coffee'], time: '8:00 AM - 10:00 AM' },
      lunch: { title: 'Gujarati / Marwari Thali', items: ['Sev Tameta Curry', 'Khatti Meethi Dal', 'Steamed Rice', 'Rotli with Ghee', 'Chaach (Buttermilk)'], time: '12:30 PM - 2:30 PM' },
      snacks: { title: 'Bread Pakoda & Dip', items: ['Paneer Stuffed Bread Pakoda', 'Green Chutney', 'Hot Chai'], time: '5:00 PM - 6:30 PM' },
      dinner: { title: 'Chinese Delight', items: ['Veg Hakka Noodles', 'Paneer Chilli Gravy / Manchurian', 'Fried Rice', 'Hot & Sour Soup'], time: '8:00 PM - 10:00 PM' }
    },
    sunday: {
      breakfast: { title: 'Sunday Chef Special Chole Bhature', items: ['Puffed Golden Bhature (2 pcs)', 'Amritsari Pindi Chole', 'Pickled Onions & Green Chilli', 'Sweet Lassi', 'Tea'], time: '8:00 AM - 10:30 AM' },
      lunch: { title: 'Royal Sunday Feast', items: ['Paneer Makhani / Butter Chicken', 'Dal Maharani', 'Jeera Rice', 'Butter Naan (2 pcs)', 'Boondi Raita', 'Rasgulla (2 pcs)'], time: '1:00 PM - 3:00 PM' },
      snacks: { title: 'Sunday Sundowner Snacks', items: ['Biscuits & Cookies Assortment', 'Filter Coffee / Tea'], time: '5:00 PM - 6:30 PM' },
      dinner: { title: 'Light Sunday Dinner', items: ['Khichdi with pure ghee', 'Kadai Veg Curry', 'Roasted Papad', 'Curd', 'Achar'], time: '8:00 PM - 10:00 PM' }
    }
  };

  for (const day of days) {
    const d = mealSchedule[day];
    insertMeal.run(uuidv4(), propMadhapur, day, 'breakfast', d.breakfast.title, JSON.stringify(d.breakfast.items), d.breakfast.time);
    insertMeal.run(uuidv4(), propMadhapur, day, 'lunch', d.lunch.title, JSON.stringify(d.lunch.items), d.lunch.time);
    insertMeal.run(uuidv4(), propMadhapur, day, 'snacks', d.snacks.title, JSON.stringify(d.snacks.items), d.snacks.time);
    insertMeal.run(uuidv4(), propMadhapur, day, 'dinner', d.dinner.title, JSON.stringify(d.dinner.items), d.dinner.time);
  }

  // 17. Daily Meal Status for Today
  const insertMealStatus = db.prepare(`
    INSERT INTO meal_daily_status (id, property_id, date, meal_type, expected_count, opted_out_count, guest_count, served_count, status, ready_at, chef_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMealStatus.run(uuidv4(), propMadhapur, todayStr, 'breakfast', 48, 2, 1, 46, 'completed', '2026-10-01 07:25:00', 'user-chef', 'Served Idli & Vada combo. All residents enjoyed.');
  insertMealStatus.run(uuidv4(), propMadhapur, todayStr, 'lunch', 52, 3, 2, 0, 'ready', '2026-10-01 12:20:00', 'user-chef', 'Lunch is ready! Paneer Butter Masala & Dal Tadka on counter.');
  insertMealStatus.run(uuidv4(), propMadhapur, todayStr, 'snacks', 45, 5, 0, 0, 'preparing', null, 'user-chef', 'Masala Chai brewing & Samosa frying in progress.');
  insertMealStatus.run(uuidv4(), propMadhapur, todayStr, 'dinner', 50, 1, 0, 0, 'pending', null, 'user-chef', 'Menu planned for 8 PM.');

  // 18. Complaints
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (id, organization_id, property_id, resident_id, room_id, category, title, description, photos, priority, status, assigned_to_staff_id, resolution_notes, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertComplaint.run(
    'comp-001', orgId, propMadhapur, res1, room101, 'electrical',
    'AC cooling is slow in Room 101', 'The split AC unit takes over 45 minutes to cool the room. Looks like filter cleaning or gas refill is needed.',
    JSON.stringify(['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80']),
    'high', 'in_progress', 'staff-main', 'Inspected by Karthik. Air filter cleaned, scheduled coolant top-up today at 4 PM.', null
  );

  insertComplaint.run(
    'comp-002', orgId, propMadhapur, res2, room102, 'wifi',
    'WiFi speed dropping on 1st Floor East Wing', 'Ping is high during evening hours between 8 PM to 10 PM. Can we reboot the access point near Room 102?',
    JSON.stringify([]), 'medium', 'submitted', null, null, null
  );

  insertComplaint.run(
    'comp-003', orgId, propMadhapur, res3, room103, 'plumbing',
    'Bathroom washbasin tap minor drip', 'The cold water tap in Room 103 attached bathroom has a slight slow drip when shut off.',
    JSON.stringify([]), 'low', 'resolved', 'staff-main', 'Replaced rubber washer inside cartridge. Tap shut off is 100% leak-proof now.', '2026-09-30 16:00:00'
  );

  // 19. Maintenance Tasks
  const insertMaint = db.prepare(`
    INSERT INTO maintenance_tasks (id, organization_id, property_id, complaint_id, title, description, room_id, assigned_staff_id, priority, estimated_cost, actual_cost, status, photos, notes, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMaint.run(
    uuidv4(), orgId, propMadhapur, 'comp-001', 'AC Service & Gas Check - Room 101',
    'Clean indoor evaporator filters and check outdoor compressor pressure', room101, 'staff-main', 'high', 800, 0, 'in_progress',
    JSON.stringify([]), 'Technician visited, will complete by afternoon.', null
  );

  insertMaint.run(
    uuidv4(), orgId, propMadhapur, null, 'Water Purifier RO Filter Replacement',
    'Routine quarterly cartridge change for Dining Hall commercial RO plant', null, 'staff-main', 'medium', 2500, 2400, 'completed',
    JSON.stringify([]), 'Sediment and carbon filters replaced. TDS level calibrated to 90 ppm.', '2026-09-29 14:30:00'
  );

  // 20. Visitors & Gate Passes
  const insertVisitor = db.prepare(`
    INSERT INTO visitors (id, organization_id, property_id, resident_id, visitor_name, visitor_phone, relationship, purpose, visit_date, expected_time, id_type, id_number, check_in_time, check_out_time, status, approved_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertVisitor.run(
    uuidv4(), orgId, propMadhapur, res1, 'Ramesh Patel', '+91 9825099881', 'Father', 'Visiting city for medical checkup',
    todayStr, '04:00 PM', 'Aadhaar', '5544-3322-1100', null, null, 'approved', 'Suresh Kumar (Warden)'
  );

  insertVisitor.run(
    uuidv4(), orgId, propMadhapur, res2, 'Divya Sharma', '+91 9876543210', 'Friend', 'Group study project',
    todayStr, '02:00 PM', 'Student ID', 'IIIT-CS-2025-44', '02:05 PM', null, 'checked_in', 'Ananya Sen (Receptionist)'
  );

  // 21. Notices & Broadcasts
  const insertNotice = db.prepare(`
    INSERT INTO notices (id, organization_id, property_id, title, message, priority, target_type, target_id, expires_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotice.run(
    uuidv4(), orgId, propMadhapur, '🔔 Special Dussehra & Diwali Festive Feast & Timings',
    'Dear Residents, We are organizing a grand festive dinner on coming Sunday with live sweet counters and musical evening! Dining hall will open from 7:30 PM onwards. All residents and registered guests are cordially invited.',
    'important', 'all', null, '2026-10-31', 'Rajesh Sharma (Owner)'
  );

  insertNotice.run(
    uuidv4(), orgId, propMadhapur, '⚡ Scheduled Overhead Water Tank Cleaning on Saturday (2 PM - 5 PM)',
    'Water supply will be temporarily paused between 2:00 PM to 5:00 PM on Saturday for annual pressurized UV tank disinfection. Please store necessary water beforehand.',
    'urgent', 'property', propMadhapur, '2026-10-06', 'Vikram Reddy (Manager)'
  );

  insertNotice.run(
    uuidv4(), orgId, propMadhapur, '💳 Monthly Rent Due Date Reminder - 5th October',
    'Friendly reminder: October rent invoices are generated and available in your StayOS resident app. Please pay on or before 5th October via UPI or Card to avoid late fee penalties.',
    'normal', 'property', propMadhapur, '2026-10-06', 'Priya Nair (Accountant)'
  );

  // 22. In-App Notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, organization_id, user_id, title, message, type, data, is_read, channel)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotification.run(
    uuidv4(), orgId, 'user-resident1', '🍽️ Lunch is Ready!',
    'Chef Ramu has marked Lunch ready in the Dining Hall. Menu: North Indian Thali with Paneer Butter Masala.',
    'food_ready', JSON.stringify({ meal: 'lunch', timing: '12:30 PM - 2:30 PM' }), 0, 'in_app'
  );

  insertNotification.run(
    uuidv4(), orgId, 'user-resident1', '✅ Payment Received with Thanks',
    'Your payment of ₹16,950 for Invoice USTAY-2026-10-001 has been verified. Receipt #RCPT-2026-1001 is available.',
    'payment_success', JSON.stringify({ invoiceId: inv1, receipt: 'RCPT-2026-1001' }), 1, 'in_app'
  );

  insertNotification.run(
    uuidv4(), orgId, 'user-resident2', '📄 October Rent Invoice Generated',
    'Your invoice USTAY-2026-10-002 for ₹12,300 is ready. Due date: 05/10/2026. Pay easily via UPI in your app.',
    'payment_reminder', JSON.stringify({ invoiceId: inv2, amount: 12300, dueDate: '2026-10-05' }), 0, 'in_app'
  );

  insertNotification.run(
    uuidv4(), orgId, 'user-manager', '🛠️ New Complaint Registered',
    'Aarav Patel (Room 101) reported AC cooling slow. Assigned to Maintenance Staff Karthik.',
    'complaint_update', JSON.stringify({ complaintId: 'comp-001' }), 0, 'in_app'
  );

  // 23. Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, organization_id, user_id, user_name, action, entity, entity_id, old_values, new_values, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(uuidv4(), orgId, 'user-owner', 'Rajesh Sharma', 'CREATE_PROPERTY', 'Property', propMadhapur, null, JSON.stringify({ name: 'UrbanStay Madhapur' }), '192.168.1.10', 'StayOS Web/Chrome');
  insertAudit.run(uuidv4(), orgId, 'user-manager', 'Vikram Reddy', 'ALLOCATE_BED', 'Bed', bed101A, null, JSON.stringify({ resident: 'Aarav Patel', room: '101' }), '192.168.1.12', 'StayOS Web/Chrome');
  insertAudit.run(uuidv4(), orgId, 'user-chef', 'Master Chef Ramu', 'MARK_MEAL_READY', 'Meal', 'lunch', JSON.stringify({ status: 'preparing' }), JSON.stringify({ status: 'ready' }), '192.168.1.15', 'StayOS Mobile/Android');
  insertAudit.run(uuidv4(), orgId, 'user-resident1', 'Aarav Patel', 'ONLINE_PAYMENT_SUCCESS', 'Payment', 'pay-101', null, JSON.stringify({ amount: 16950, method: 'upi', txn: 'TXN_UPI_984920261001' }), '49.37.128.4', 'StayOS Mobile PWA');

  console.log('✅ Seed completed successfully with realistic multi-tenant data!');
}

if (require.main === module) {
  seedData().catch(err => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  });
}

module.exports = { seedData };
