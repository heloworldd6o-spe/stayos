# 🔒 StayOS Security & Compliance Architecture

Security and tenant isolation are fundamental design principles of **StayOS**. This document explains the defensive controls implemented across every layer of the application.

---

## 1. Multi-Tenant Data Isolation

### Principle
Tenants share the database schema, but **cross-tenant data leakage is strictly prevented at the server layer**.

- **Automatic Query Scoping**: Every database read, insert, update, or delete checks `organization_id` derived directly from the caller's verified JWT token.
- **Client Header Sanitization**: If a client provides an `x-organization-id` header, the middleware verifies that the user belongs to that organization or is a Super Admin before processing.
- **Foreign Key Cascades**: Database-level foreign keys ensure orphaned child records cannot be accessed across different organizations.

---

## 2. Server-Side Role-Based Access Control (RBAC)

StayOS enforces role authorization exclusively on the server. Frontend UI hiding is treated purely as UX, never as security.

### Permission Enforcement Matrix

| API Path | Allowed Roles | Enforced Policy |
| :--- | :--- | :--- |
| `/api/superadmin/*` | `super_admin` | Platform oversight; cannot alter tenant finances directly |
| `/api/properties/*` | `super_admin`, `owner`, `manager` | Only owners can create/delete properties |
| `/api/rooms/*`, `/api/beds/*` | `super_admin`, `owner`, `manager`, `warden`, `receptionist` | Read and bed allocation permissions |
| `/api/checkins/*`, `/api/checkouts/*` | `super_admin`, `owner`, `manager`, `receptionist` | Allocation and financial settlement permissions |
| `/api/payments/*`, `/api/invoices/*` | `super_admin`, `owner`, `manager`, `accountant`, `receptionist`, `resident` (own only) | Financial records restricted to authorized roles |
| `/api/meals/*` | `super_admin`, `owner`, `manager`, `chef`, `kitchen_staff`, `resident` | Chef cannot view financial data; resident can only see menus and submit leaves |
| `/api/complaints/*` | All roles (scoped) | Residents see own complaints; Staff see assigned complaints; Managers see all |
| `/api/organizations/settings` | `super_admin`, `owner` | Sensitive tax, GST, and rent policies restricted to owners |

---

## 3. Financial Integrity & Payment Anti-Fraud

1. **Zero Client Trust for Amounts**: The client never specifies the invoice amount to charge. When initiating an online payment order, the backend fetches the invoice directly from the database and derives the exact due amount.
2. **Cryptographic HMAC SHA-256 Signatures**: Payment gateway callbacks and verifications require an HMAC SHA-256 signature generated with `PAYMENT_GATEWAY_SECRET`.
3. **Idempotent Payment Processing**: Payment orders store a unique transaction hash to prevent double-charging or duplicate receipt generation.
4. **Permanent Audit Log of Transactions**: Payments and invoice adjustments cannot be permanently deleted; reversals require explicit refund or settlement records.

---

## 4. Authentication & Session Management

- **Password Storage**: Passwords are salted and hashed using `bcryptjs` with a cost factor of 10. Plaintext passwords are never logged or stored.
- **JWT Lifespan**: Signed with `JWT_SECRET` and configured with a 7-day expiration.
- **Session Revocation**: User suspension at the tenant or super-admin level immediately invalidates subsequent API requests.

---

## 5. Document & File Vault Security

- **Private Uploads**: Sensitive identity documents (Aadhaar cards, college IDs, rent agreements) are stored in a protected folder (`server/uploads/`).
- **Authorized Serving**: Document endpoints (`/api/documents/:id`) require active JWT authentication and verify that the requesting user belongs to the same organization or is the resident who owns the document.

---

## 6. Audit Trail

Every major mutating action triggers an entry in the `audit_logs` table:
- `user_id` and `user_email`
- `action` (e.g., `CHECK_IN`, `SETTLE_CHECKOUT`, `RECORD_PAYMENT`, `ALLOCATE_BED`)
- `entity_type` and `entity_id`
- `ip_address`
- `metadata` (JSON payload)
- `created_at` timestamp

---

## 7. Error Handling & Information Leakage Prevention

- Database errors (e.g. SQLite constraint violations) are caught in API middleware and mapped to user-friendly error messages (e.g. *"Unable to allocate this bed because it is already assigned"*).
- Internal stack traces are never sent to the client in production.
