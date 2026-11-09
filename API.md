# 📡 StayOS REST API Documentation

Base URL: `http://localhost:5000/api`

All requests except `/api/auth/login` and `/api/auth/register` require a valid JWT token in the `Authorization` header:
```http
Authorization: Bearer <JWT_TOKEN>
x-organization-id: <ORG_ID> (Optional for Super Admin)
```

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates a user and returns a JWT token with profile and organization context.
- **Request Body**:
  ```json
  {
    "email": "owner@urbanstay.com",
    "password": "owner123"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": 1,
      "email": "owner@urbanstay.com",
      "full_name": "Vikram Malhotra",
      "role": "owner",
      "organization_id": 1
    },
    "organization": {
      "id": 1,
      "name": "UrbanStay Management",
      "slug": "urbanstay"
    },
    "properties": [...]
  }
  ```

### `POST /api/auth/demo-switch`
Instantly switch to any demo role account for testing.
- **Request Body**:
  ```json
  { "role": "chef" }
  ```

### `GET /api/auth/me`
Fetches current authenticated profile context.

---

## 2. Dashboard Endpoints

### `GET /api/dashboard/stats?propertyId=1`
Aggregates dynamic KPI metrics, bed occupancy counts, today's check-ins/outs, pending dues, net revenue, and upcoming meals.
- **Response**: `200 OK`
  ```json
  {
    "stats": {
      "total_properties": 2,
      "total_rooms": 7,
      "total_beds": 18,
      "occupied_beds": 14,
      "vacant_beds": 4,
      "occupancy_rate": 77.8,
      "active_residents": 14,
      "monthly_revenue": 145000,
      "monthly_expenses": 32000,
      "net_revenue": 113000,
      "pending_dues": 22500,
      "open_complaints": 2
    },
    "occupancy_trend": [...],
    "revenue_trend": [...]
  }
  ```

---

## 3. Properties & Rooms Endpoints

### `GET /api/properties`
Lists all properties under the organization.

### `POST /api/properties`
Creates a new property with buildings and floors.

### `GET /api/rooms?propertyId=1`
Lists all rooms with calculated bed statuses and capacity.

### `POST /api/rooms`
Creates a room and automatically provisions individual beds (`101-A`, `101-B`, etc.).

---

## 4. Bed & Occupancy Matrix Endpoints

### `GET /api/beds?propertyId=1`
Returns all beds with resident assignment details.

### `GET /api/beds/vacant?propertyId=1&sharing=double`
Filters currently available beds ready for allocation.

---

## 5. Check-In & Check-Out Endpoints

### `POST /api/checkins`
Executes complete check-in workflow: creates resident, allocates bed atomically, generates initial agreement invoice, and records deposit.
- **Request Body**:
  ```json
  {
    "property_id": 1,
    "bed_id": 4,
    "full_name": "Rohan Gupta",
    "email": "rohan.g@example.com",
    "phone": "9876543299",
    "gender": "male",
    "id_type": "aadhaar",
    "id_number": "9876-5432-1099",
    "monthly_rent": 8500,
    "deposit_amount": 17000,
    "joining_date": "2026-10-01",
    "initial_payment_amount": 25500,
    "payment_method": "upi"
  }
  ```

### `POST /api/checkouts/calculate`
Calculates pending dues, damage deductions, and net deposit refund for a resident.

### `POST /api/checkouts/settle`
Finalizes checkout settlement, records refund transaction, and immediately frees the bed.

---

## 6. Financial & Payment Endpoints

### `GET /api/invoices?residentId=1&status=pending`
Lists invoices with line items, tax breakdown, and paid balances.

### `POST /api/payments/create-order`
Creates a secure payment gateway order with server-calculated amounts.

### `POST /api/payments/verify`
Validates cryptographic HMAC signature and updates invoice status to `paid`.

### `POST /api/payments/record-offline`
Allows managers/accountants to record Cash or Direct Bank Transfer payments.

### `GET /api/payments/:id/receipt`
Generates a printable payment receipt with tax breakdown and transaction ID.

---

## 7. Food & Kitchen Operations

### `GET /api/meals/schedule?propertyId=1`
Returns the 7-day weekly menu schedule.

### `GET /api/meals/daily-status?propertyId=1`
Returns today's meal status and headcounts for Breakfast, Lunch, Snacks, and Dinner.

### `PUT /api/meals/status`
Allows Head Chef to mark a meal as `preparing`, `ready`, or `completed`. When marked `ready`, automatically notifies residents.

### `POST /api/meals/opt-out`
Allows residents to skip specific meals (reduces chef headcount).

---

## 8. Complaints & Maintenance

### `GET /api/complaints`
Lists complaints with filter by status (`submitted`, `in_progress`, `resolved`).

### `POST /api/complaints`
Residents submit a new maintenance complaint.

### `PUT /api/complaints/:id/assign`
Manager assigns a complaint to a technician.

### `PUT /api/complaints/:id/status`
Updates status and logs resolution notes.

---

## 9. Staff & Attendance

### `GET /api/staff`
Lists staff members and roles.

### `POST /api/staff/attendance/mark`
Records check-in/out and attendance status (`present`, `absent`, `half_day`, `leave`).

---

## 10. Reports & Exports

### `GET /api/reports/analytics`
Fetches high-level financial and occupancy aggregations.

### `GET /api/reports/export/:type`
Downloads dynamic CSV reports for `residents`, `payments`, `expenses`, `occupancy`, or `complaints`.

---

## 11. Super Admin SaaS Platform

### `GET /api/superadmin/metrics`
Aggregates platform-level organizations, users, beds, and GMV.

### `PUT /api/superadmin/organizations/:id/status`
Toggles organization active or suspended status.
