-- StayOS Complete Relational Database Schema
-- Multi-Tenant SaaS PG & Hostel Management Platform

PRAGMA foreign_keys = ON;

-- 1. Plans (SaaS Pricing & Quotas)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL,
  price_annual INTEGER NOT NULL,
  max_properties INTEGER NOT NULL,
  max_beds INTEGER NOT NULL,
  max_staff INTEGER NOT NULL,
  features TEXT NOT NULL, -- JSON array of strings
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Organizations (Tenant Master)
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address TEXT,
  currency TEXT DEFAULT 'INR',
  currency_symbol TEXT DEFAULT '₹',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  invoice_prefix TEXT DEFAULT 'STAY',
  late_fee_percentage REAL DEFAULT 2.0,
  late_fee_grace_days INTEGER DEFAULT 5,
  gst_enabled INTEGER DEFAULT 0,
  gst_number TEXT,
  subscription_plan TEXT DEFAULT 'growth',
  subscription_status TEXT DEFAULT 'active', -- active, past_due, trial, cancelled, suspended
  max_properties INTEGER DEFAULT 5,
  max_beds INTEGER DEFAULT 200,
  max_staff INTEGER DEFAULT 20,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users (Platform Users with Role Authentication)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT, -- NULL for super_admin
  role TEXT NOT NULL, -- super_admin, owner, manager, accountant, warden, receptionist, chef, kitchen_staff, maintenance, resident
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 4. Properties (Physical PG/Hostel properties under an organization)
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'pg', -- pg, hostel, coliving, student
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  email TEXT,
  manager_id TEXT,
  amenities TEXT DEFAULT '[]', -- JSON array: Wi-Fi, AC, Geyser, Food, Laundry, CCTV, Gym, Lift, RO Water, Housekeeping
  rules TEXT DEFAULT '[]', -- JSON array of rules
  photos TEXT DEFAULT '[]', -- JSON array of photo URLs
  rent_due_day INTEGER DEFAULT 5, -- 1st to 28th
  grace_period_days INTEGER DEFAULT 3,
  late_fee_amount INTEGER DEFAULT 250,
  status TEXT DEFAULT 'active', -- active, maintenance, inactive
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Buildings
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  name TEXT NOT NULL, -- e.g. "Main Wing", "Block A", "Tower 1"
  code TEXT,
  total_floors INTEGER DEFAULT 3,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- 6. Floors
CREATE TABLE IF NOT EXISTS floors (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  floor_number INTEGER NOT NULL, -- 0 for Ground, 1 for 1st Floor, etc.
  floor_name TEXT NOT NULL, -- e.g. "Ground Floor", "1st Floor"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- 7. Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  building_id TEXT NOT NULL,
  floor_id TEXT NOT NULL,
  room_number TEXT NOT NULL, -- e.g. "101", "204"
  room_type TEXT NOT NULL DEFAULT 'double', -- single, double, triple, four_sharing, dorm
  capacity INTEGER NOT NULL DEFAULT 2,
  ac_type TEXT NOT NULL DEFAULT 'non_ac', -- ac, non_ac
  bathroom_type TEXT NOT NULL DEFAULT 'attached', -- attached, common
  base_rent INTEGER NOT NULL DEFAULT 8500,
  base_deposit INTEGER NOT NULL DEFAULT 15000,
  amenities TEXT DEFAULT '[]', -- JSON: ["Balcony", "Geyser", "Study Table", "Wardrobe", "TV"]
  status TEXT DEFAULT 'available', -- available, partially_occupied, fully_occupied, reserved, maintenance, inactive
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
  FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE,
  UNIQUE(property_id, room_number)
);

-- 8. Beds (Individual tracking)
CREATE TABLE IF NOT EXISTS beds (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  bed_number TEXT NOT NULL, -- e.g. "101-A", "101-B"
  status TEXT NOT NULL DEFAULT 'available', -- available, occupied, reserved, maintenance, blocked
  monthly_rent INTEGER NOT NULL DEFAULT 8500,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE(room_id, bed_number)
);

-- 9. Residents (Stayer Profiles)
CREATE TABLE IF NOT EXISTS residents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  user_id TEXT UNIQUE, -- connected user login
  full_name TEXT NOT NULL,
  photo_url TEXT,
  gender TEXT NOT NULL, -- male, female, other
  dob TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  permanent_address TEXT,
  id_type TEXT DEFAULT 'aadhaar', -- aadhaar, passport, driving_license, voter_id, student_id
  id_number TEXT,
  id_document_url TEXT,
  occupation TEXT, -- student, working_professional, business, other
  organization_or_college TEXT,
  food_preference TEXT DEFAULT 'veg', -- veg, non_veg, eggetarian, jain
  medical_notes TEXT,
  current_room_id TEXT,
  current_bed_id TEXT UNIQUE,
  joining_date TEXT NOT NULL,
  expected_checkout_date TEXT,
  actual_checkout_date TEXT,
  monthly_rent INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  rent_due_day INTEGER DEFAULT 5,
  status TEXT DEFAULT 'active', -- active, notice_period, checked_out, suspended
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (current_room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (current_bed_id) REFERENCES beds(id) ON DELETE SET NULL
);

-- 10. Resident Documents
CREATE TABLE IF NOT EXISTS resident_documents (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL, -- aadhaar, agreement, college_id, photo, police_verification, other
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);

-- 11. Room Allocations History
CREATE TABLE IF NOT EXISTS room_allocations (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  bed_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  monthly_rent INTEGER NOT NULL,
  deposit_paid INTEGER NOT NULL DEFAULT 0,
  allocated_by TEXT,
  status TEXT DEFAULT 'active', -- active, terminated, transferred
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
  FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- 12. Check-Ins & Check-Outs Logs
CREATE TABLE IF NOT EXISTS checkin_checkout_records (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  type TEXT NOT NULL, -- check_in, check_out
  action_date TEXT NOT NULL,
  staff_user_id TEXT,
  room_id TEXT NOT NULL,
  bed_id TEXT NOT NULL,
  deposit_collected INTEGER DEFAULT 0,
  deposit_refunded INTEGER DEFAULT 0,
  pending_dues_settled INTEGER DEFAULT 0,
  deductions INTEGER DEFAULT 0,
  deduction_reason TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);

-- 13. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  billing_month INTEGER NOT NULL, -- 1 to 12
  billing_year INTEGER NOT NULL, -- e.g. 2026
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  rent_amount INTEGER NOT NULL DEFAULT 0,
  electricity_amount INTEGER DEFAULT 0,
  mess_amount INTEGER DEFAULT 0,
  laundry_amount INTEGER DEFAULT 0,
  maintenance_amount INTEGER DEFAULT 0,
  late_fee_amount INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  tax_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  balance_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- paid, partially_paid, pending, overdue, cancelled, refunded
  due_date TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
  UNIQUE(property_id, invoice_number)
);

-- 14. Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  invoice_id TEXT,
  transaction_id TEXT UNIQUE NOT NULL,
  receipt_number TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL, -- upi, cash, bank_transfer, card, online_gateway
  status TEXT NOT NULL DEFAULT 'successful', -- successful, pending, failed, refunded
  payment_date TEXT NOT NULL,
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  notes TEXT,
  recorded_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

-- 15. Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  payment_id TEXT,
  invoice_id TEXT,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  refund_method TEXT DEFAULT 'upi',
  status TEXT DEFAULT 'completed', -- completed, pending, rejected
  processed_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);

-- 16. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  category TEXT NOT NULL, -- food, electricity, water, internet, maintenance, salaries, cleaning, security, supplies, rent, other
  amount INTEGER NOT NULL,
  expense_date TEXT NOT NULL,
  description TEXT NOT NULL,
  vendor_name TEXT,
  receipt_url TEXT,
  payment_mode TEXT DEFAULT 'bank_transfer', -- cash, upi, bank_transfer, card
  added_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- 17. Weekly Meal Plans
CREATE TABLE IF NOT EXISTS meal_plans (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  day_of_week TEXT NOT NULL, -- monday, tuesday, wednesday, thursday, friday, saturday, sunday
  meal_type TEXT NOT NULL, -- breakfast, lunch, snacks, dinner
  menu_title TEXT NOT NULL,
  menu_items TEXT NOT NULL, -- JSON array of dish names
  timing TEXT, -- e.g. "7:30 AM - 9:30 AM"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE(property_id, day_of_week, meal_type)
);

-- 18. Daily Meal Status & Chef Prep
CREATE TABLE IF NOT EXISTS meal_daily_status (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  meal_type TEXT NOT NULL, -- breakfast, lunch, snacks, dinner
  expected_count INTEGER NOT NULL DEFAULT 0,
  opted_out_count INTEGER NOT NULL DEFAULT 0,
  guest_count INTEGER NOT NULL DEFAULT 0,
  served_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, preparing, ready, completed
  ready_at DATETIME,
  chef_id TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE(property_id, date, meal_type)
);

-- 19. Meal Opt-Outs & Guest Meals
CREATE TABLE IF NOT EXISTS meal_opt_outs (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  meal_type TEXT NOT NULL, -- breakfast, lunch, snacks, dinner
  is_opted_out INTEGER DEFAULT 1,
  guest_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE(resident_id, date, meal_type)
);

-- 20. Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  room_id TEXT,
  category TEXT NOT NULL, -- electrical, plumbing, cleaning, wifi, food, room, security, other
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  photos TEXT DEFAULT '[]', -- JSON array
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted, assigned, in_progress, resolved, closed
  assigned_to_staff_id TEXT,
  resolution_notes TEXT,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);

-- 21. Maintenance Tasks
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  complaint_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  room_id TEXT,
  assigned_staff_id TEXT,
  priority TEXT DEFAULT 'medium',
  estimated_cost INTEGER DEFAULT 0,
  actual_cost INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  photos TEXT DEFAULT '[]',
  notes TEXT,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE SET NULL
);

-- 22. Staff Records
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT UNIQUE,
  property_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL, -- manager, warden, receptionist, accountant, chef, kitchen_staff, maintenance
  joining_date TEXT NOT NULL,
  salary INTEGER DEFAULT 0,
  emergency_contact TEXT,
  status TEXT DEFAULT 'active', -- active, on_leave, terminated
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 23. Staff Attendance
CREATE TABLE IF NOT EXISTS staff_attendance (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  check_in_time TEXT,
  check_out_time TEXT,
  status TEXT NOT NULL DEFAULT 'present', -- present, absent, half_day, leave
  notes TEXT,
  recorded_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE(staff_id, date)
);

-- 24. Visitors
CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  resident_id TEXT NOT NULL,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT NOT NULL,
  relationship TEXT NOT NULL, -- parent, friend, sibling, colleague, relative, other
  purpose TEXT,
  visit_date TEXT NOT NULL,
  expected_time TEXT,
  id_type TEXT,
  id_number TEXT,
  check_in_time TEXT,
  check_out_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, checked_in, checked_out
  approved_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);

-- 25. Notices & Announcements
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  property_id TEXT, -- NULL for all properties
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', -- normal, important, urgent
  target_type TEXT NOT NULL DEFAULT 'all', -- all, property, building, floor, room, resident
  target_id TEXT,
  expires_at TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 26. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system', -- payment_reminder, payment_success, payment_failure, food_ready, complaint_update, visitor_approval, notice, checkout_reminder, maintenance_update, system
  data TEXT DEFAULT '{}', -- JSON metadata
  is_read INTEGER DEFAULT 0,
  channel TEXT DEFAULT 'in_app', -- in_app, sms, whatsapp, email
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 27. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  in_app_enabled INTEGER DEFAULT 1,
  email_enabled INTEGER DEFAULT 1,
  whatsapp_enabled INTEGER DEFAULT 1,
  sms_enabled INTEGER DEFAULT 0,
  food_alerts INTEGER DEFAULT 1,
  payment_alerts INTEGER DEFAULT 1,
  complaint_alerts INTEGER DEFAULT 1,
  notice_alerts INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 28. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  old_values TEXT, -- JSON
  new_values TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 29. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, past_due, cancelled, trial
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly', -- monthly, annual
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Indexes for lightning-fast queries and high scalability
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_props_org ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_rooms_prop ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_beds_room ON beds(room_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
CREATE INDEX IF NOT EXISTS idx_residents_org ON residents(organization_id);
CREATE INDEX IF NOT EXISTS idx_residents_prop ON residents(property_id);
CREATE INDEX IF NOT EXISTS idx_residents_status ON residents(status);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_resident ON invoices(resident_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_resident ON payments(resident_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_complaints_org ON complaints(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id);
