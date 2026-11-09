# 🏢 StayOS — Enterprise PG, Hostel & Co-Living Management SaaS

![StayOS Banner](https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80)

**StayOS** is a complete, production-ready, multi-tenant SaaS platform engineered specifically for Paying Guest accommodations (PGs), student hostels, working professional residences, and multi-building co-living properties.

StayOS replaces messy registers, manual UPI spreadsheets, and chaotic WhatsApp groups with a unified digital command center connecting property owners, managers, accountants, wardens, chefs, maintenance personnel, and residents.

---

## 🌟 Key Features & Capabilities

### 1. 🏢 Multi-Tenant Architecture & Multi-Property Hierarchy
- Full organizational tenant isolation (`Organization` → `Properties` → `Buildings` → `Floors` → `Rooms` → `Beds` → `Residents`).
- Switch between properties instantly from the navigation header.
- Complete support for multi-branch operators (e.g. Madhapur branch, Gachibowli branch).

### 2. 🛏️ Independent Bed-Level Matrix & Smart Vacancy Tracker
- Every single bed is tracked individually (`101-A`, `101-B`, `101-C`).
- Real-time room occupancy cards showing capacity, occupied beds, vacant beds, AC/Non-AC status, and rent per bed.
- Atomic database locking preventing duplicate bed allocations.
- Dedicated "Vacant Beds" board with instant filters by property, gender, sharing type, and price.

### 3. 📝 End-to-End Check-In & Check-Out Workflows
- **Check-In Wizard**: Document verification (Aadhaar/Passport/College ID), bed selection, rent agreement terms, deposit collection, initial payment receipt generation, and resident activation.
- **Check-Out Settlement Engine**: Instant calculation of pending rent, pro-rata adjustments, damage deductions, refundable deposit balances, and automatic bed release upon settlement.

### 4. 💳 Financial Engine, UPI Payments & Server-Side HMAC Verification
- Rent, security deposits, electricity charges, mess addons, and fines.
- **HMAC SHA-256 Verified Payment Gateway**: Server never trusts frontend status responses. Cryptographic verification ensures zero duplicate payments or amount tampering.
- Instant PDF receipt generator and printable invoices with Indian GST configuration.
- Support for UPI QR scanning, cash recording, bank transfers, and gateway cards.

### 5. ⏰ Automated Cron Background Scheduler
- Daily automated rent due evaluation (7 days before, 3 days before, on due date, and overdue alerts).
- Configurable grace periods and late fee computation.
- Automated generation of monthly recurring invoices on cycle dates.

### 6. 🍲 Food & Kitchen Operations with Live Chef KDS
- 7-Day interactive meal schedule (Breakfast, Lunch, Snacks, Dinner).
- **Chef Live Kitchen Screen (KDS)**: Real-time headcount of participating residents (accounting for opt-outs and temporary leaves).
- 1-Click "Meal Ready" trigger automatically broadcasting notifications to all active residents: `🍽️ Lunch is ready in the dining hall!`

### 7. 🛠️ Complaint Ticketing & Maintenance Dispatch
- Resident issue reporting with priority tags (Electrical, Plumbing, WiFi, Food, Cleanliness).
- Manager assignment to maintenance technicians with status tracking (Submitted → Assigned → In Progress → Resolved).

### 8. 🛡️ Staff Attendance & Visitor Gate Passes
- Staff check-in, check-out, and monthly attendance reports.
- Digital visitor requests with resident host confirmation, purpose, and warden check-in/check-out timestamp logging.

### 9. 📱 Mobile-First Resident Portal
- Mobile-optimized interface for residents to pay rent via UPI, download receipts, view meal menus, receive food-ready alerts, log maintenance complaints, and request visitor entry.

### 10. 👑 Super Admin SaaS Console & Tier Limits
- Platform-wide telemetry (Total Orgs, Platform Beds, GMV, System Health).
- Tenant suspension / reactivation controls.
- Subscription tier plans (Starter, Growth, Professional, Enterprise).

---

## 👥 10 User Roles & Access Control Matrix

| Role | Dashboard | Rooms & Beds | Check-In/Out | Invoices & Dues | Record Payment | Chef KDS | Complaints | Visitors | Org Settings |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Accountant** | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Warden** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Receptionist**| ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Chef** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Kitchen Staff**| ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Maintenance** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (Assigned) | ❌ | ❌ |
| **Resident** | Portal | Own Bed | ❌ | Own Invoices | Pay Rent | Meal Alert | Submit Own | Request Pass | ❌ |

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express 5, `better-sqlite3` (with WAL mode & foreign keys enabled), `jsonwebtoken`, `bcryptjs`, `crypto` HMAC SHA-256, `multer`.
- **Frontend**: React 18/19, Vite, Tailwind CSS, Lucide Icons, Recharts, Canvas Confetti.
- **Database**: SQLite 3 with normalized relational schema (29 tables), foreign key constraints, and performance indexes.
- **Localization**: INR (₹) currency formatting, DD/MM/YYYY dates, IST timezone, UPI payment flows, and Indian GST rules.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)

### Installation & Setup

1. **Clone or Navigate to the Project Root**:
   ```bash
   cd stayos
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Initialize & Seed the Database**:
   ```bash
   npm run seed
   ```

5. **Run Automated Test Suite**:
   ```bash
   npm test
   ```

6. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   - **Backend API**: `http://localhost:5000`
   - **Frontend App**: `http://localhost:5173`

---

## 🔑 Demo Login Credentials

The seed data provides pre-configured credentials for all 10 roles:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@stayos.com` | `admin123` |
| **Property Owner** | `owner@urbanstay.com` | `owner123` |
| **Property Manager** | `manager@urbanstay.com` | `manager123` |
| **Accountant** | `accounts@urbanstay.com` | `accounts123` |
| **Warden** | `warden@urbanstay.com` | `warden123` |
| **Receptionist** | `reception@urbanstay.com` | `reception123` |
| **Head Chef** | `chef@urbanstay.com` | `chef123` |
| **Kitchen Staff** | `kitchen@urbanstay.com` | `kitchen123` |
| **Maintenance** | `maintenance@urbanstay.com` | `maint123` |
| **Resident / Stayer** | `aarav@gmail.com` | `resident123` |

> 💡 **Quick Demo Switcher**: The login page and top navigation bar include a 1-click **"Role Switcher"** modal allowing instant role testing without retyping credentials.

---

## 📂 Project Structure

```
stayos/
├── server/
│   ├── db/
│   │   ├── database.js          # SQLite connector with WAL mode & foreign keys
│   │   ├── schema.sql           # Relational schema (29 tables)
│   │   ├── seed.js              # Multi-tenant demo dataset
│   │   └── stayos.db            # SQLite database file
│   ├── middleware/
│   │   └── auth.js              # JWT, tenant isolation & RBAC middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication & Demo Role Switcher
│   │   ├── dashboard.js         # Dynamic telemetry & stats aggregation
│   │   ├── properties.js        # Property & Building operations
│   │   ├── rooms.js             # Room management & occupancy
│   │   ├── beds.js              # Bed matrix & vacant bed filtering
│   │   ├── residents.js         # Resident directory & stay records
│   │   ├── checkins.js          # Check-in onboarding wizard API
│   │   ├── checkouts.js         # Settlement & bed release API
│   │   ├── invoices.js          # Invoices & billing generator
│   │   ├── payments.js          # HMAC payment verification & receipts
│   │   ├── expenses.js          # Categorized expense ledger
│   │   ├── meals.js             # Weekly menus, KDS & opt-outs
│   │   ├── complaints.js        # Complaint ticketing & workflow
│   │   ├── maintenance.js       # Maintenance task assignments
│   │   ├── staff.js             # Staff directory & daily attendance
│   │   ├── visitors.js          # Visitor gate pass requests
│   │   ├── notices.js           # Property broadcast announcements
│   │   ├── notifications.js     # User alerts & channel preferences
│   │   ├── reports.js           # Analytics & CSV export engine
│   │   ├── superadmin.js        # Platform SaaS metrics & tenant controls
│   │   ├── organizations.js     # Org settings & manual cron trigger
│   │   └── documents.js         # Protected document vault
│   ├── services/
│   │   ├── auditService.js      # System audit logger
│   │   ├── notificationService.js# Dispatcher for In-app, Email, WhatsApp & SMS
│   │   ├── paymentService.js    # Gateway order generator & HMAC verifier
│   │   ├── storageService.js    # Document storage abstraction
│   │   └── cronService.js       # Automated daily rent & meal scheduler
│   ├── tests/
│   │   └── test_stayos.js       # 25-Point enterprise test runner
│   └── index.js                 # Express 5 server bootstrap
├── src/
│   ├── components/layout/
│   │   ├── AppLayout.jsx        # Sidebar navigation & responsive shell
│   │   ├── TopNavbar.jsx        # Property switcher & role switch modal
│   │   ├── NotificationDrawer.jsx# Real-time alerts drawer
│   │   └── QuickActionModal.jsx # Global quick actions (+Resident, +Payment)
│   ├── context/
│   │   └── AuthContext.jsx      # Global auth & active property state
│   ├── pages/
│   │   ├── LandingPage.jsx      # Public SaaS marketing website
│   │   ├── LoginPage.jsx        # Login & demo account switcher
│   │   ├── DashboardPage.jsx    # Analytics cards & Recharts graphs
│   │   ├── PropertiesPage.jsx   # Multi-property & building cards
│   │   ├── RoomsPage.jsx        # Interactive room matrix
│   │   ├── BedsPage.jsx         # Vacant bed finder & allocation
│   │   ├── ResidentsPage.jsx    # Resident profiles & checkout
│   │   ├── CheckInWizardPage.jsx# 4-Step check-in wizard
│   │   ├── CheckOutModal.jsx    # Settlement modal
│   │   ├── InvoicesPage.jsx     # Invoice manager & batch generator
│   │   ├── PaymentsPage.jsx     # Payments list & receipt viewer
│   │   ├── ExpensesPage.jsx     # Categorized expense manager
│   │   ├── FoodManagementPage.jsx# 7-Day meal menu manager
│   │   ├── ChefDashboardPage.jsx# Live KDS meal preparation screen
│   │   ├── ComplaintsPage.jsx   # Issue ticketing & resolution
│   │   ├── StaffPage.jsx        # Staff roster & attendance
│   │   ├── MaintenancePage.jsx  # Technician task board
│   │   ├── VisitorsPage.jsx     # Visitor gate pass register
│   │   ├── NoticesPage.jsx      # Broadcast notices
│   │   ├── ReportsPage.jsx      # Exportable financial & occupancy reports
│   │   ├── ResidentPortalPage.jsx# Mobile-first resident experience
│   │   ├── SuperAdminPage.jsx   # Platform administration console
│   │   ├── SettingsPage.jsx     # GST, rent policies & cron trigger
│   │   └── OnboardingWizard.jsx # First-time setup wizard
│   ├── services/
│   │   └── api.js               # Centralized REST API client
│   ├── index.css                # Tailwind CSS & design tokens
│   ├── App.jsx                  # Main application router
│   └── main.jsx                 # React root entry point
├── package.json
├── vite.config.js
└── README.md
```

---

## 🔒 Security & Tenant Isolation

1. **Strict Organization Isolation**: Every database query filters by `organization_id` extracted from verified JWT tokens.
2. **Double Bed Allocation Prevention**: Beds are guarded by atomic database queries and transaction locks.
3. **Payment Integrity**: Payments are validated server-side by calculating total amounts directly against verified invoice line items.
4. **Role Based Access Control**: 10 distinct roles with server-side authorization enforcement on all API routes.
5. **Private Documents**: Document endpoints require valid authentication and verify tenant ownership before returning files.

---

## 📄 License
Proprietary SaaS product template by StayOS Engineering.
