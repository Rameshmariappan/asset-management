# API Endpoints

Base URL: `http://localhost:3001/v1`
Swagger docs: `http://localhost:3001/api/docs`

Legend: `@Public` = no auth required, `[Auth]` = JWT required, `[ROLE,...]` = role restriction via @Roles

---

## Auth (`/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | @Public | Register new user (auto EMPLOYEE role) |
| POST | /login | @Public | Login → accessToken + refresh cookie, or `{requiresMfa: true}` |
| POST | /refresh | @Public + jwt-refresh guard | Rotate access + refresh tokens |
| POST | /logout | Auth | Revoke refresh token, clear cookie |
| GET | /me | Auth | Current user from JWT payload |
| POST | /mfa/setup | Auth | Generate TOTP secret + QR code |
| POST | /mfa/verify | Auth | Verify TOTP code → enable MFA + return backup codes |
| POST | /mfa/disable | Auth | Disable MFA (requires valid TOTP code) |
| POST | /forgot-password | @Public | Generate reset token (returned in response for dev) |
| POST | /reset-password | @Public | Reset password using token (transactional) |

## Users (`/v1/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | SUPER_ADMIN, ASSET_MANAGER | List users (pagination, search, filters) |
| POST | / | SUPER_ADMIN | Create user with optional roleNames |
| GET | /me | Auth | Current user profile (detailed) |
| POST | /me/change-password | Auth | Change own password (requires current) |
| GET | /:id | Auth | Get user by ID |
| PATCH | /:id | SUPER_ADMIN | Update user |
| DELETE | /:id | SUPER_ADMIN | Soft delete user |
| POST | /:id/roles | SUPER_ADMIN | Assign roles (replaces all existing) |
| GET | /:id/assets | Auth | Get user's active assignments |
| GET | /:id/stats | Auth | User statistics (assignments, transfers) |

## Assets (`/v1/assets`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List assets (pagination, search, category/vendor/location/status/date filters) |
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create asset (auto depreciation calc) |
| GET | /statistics | Auth | Status breakdown, total value, warranty expiring 30d |
| GET | /:id | Auth | Get single asset with active assignments |
| GET | /:id/history | Auth | Assignment + transfer history |
| PATCH | /:id | SUPER_ADMIN, ASSET_MANAGER | Update asset |
| PATCH | /:id/status | SUPER_ADMIN, ASSET_MANAGER | Update status only |
| DELETE | /:id | SUPER_ADMIN, ASSET_MANAGER | Soft delete (blocked if active assignments) |

## Assignments (`/v1/assignments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List assignments (pagination, filters) |
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create (validates asset available, transactional) |
| GET | /statistics | Auth | Total/active/returned/overdue counts |
| GET | /active | Auth | All active assignments |
| GET | /user/:userId | Auth | User's assignments (optional isActive filter) |
| GET | /:id | Auth | Single assignment |
| POST | /:id/return | SUPER_ADMIN, ASSET_MANAGER | Return asset (condition, signature, transactional) |

## Transfers (`/v1/transfers`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List transfers (pagination, filters) |
| POST | / | Auth | Request transfer (validates no pending for asset) |
| GET | /statistics | Auth | Status breakdown + awaitingAction |
| GET | /pending | Auth | Pending + manager_approved transfers |
| GET | /:id | Auth | Single transfer (full details) |
| POST | /:id/approve/manager | SUPER_ADMIN, ASSET_MANAGER, DEPARTMENT_HEAD | Manager approval (pending → manager_approved) |
| POST | /:id/approve/admin | SUPER_ADMIN | Admin approval (transactional, completes transfer) |
| POST | /:id/reject | SUPER_ADMIN, ASSET_MANAGER, DEPARTMENT_HEAD | Reject (any non-completed/rejected) |

## Categories (`/v1/categories`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List all categories |
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create category |
| GET | /:id | Auth | Get category |
| PATCH | /:id | SUPER_ADMIN, ASSET_MANAGER | Update category |
| DELETE | /:id | SUPER_ADMIN, ASSET_MANAGER | Delete category |

## Vendors (`/v1/vendors`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List all vendors |
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create vendor |
| GET | /:id | Auth | Get vendor |
| PATCH | /:id | SUPER_ADMIN, ASSET_MANAGER | Update vendor |
| DELETE | /:id | SUPER_ADMIN, ASSET_MANAGER | Delete vendor |

## Locations (`/v1/locations`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List all locations |
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create location |
| GET | /:id | Auth | Get location |
| PATCH | /:id | SUPER_ADMIN, ASSET_MANAGER | Update location |
| DELETE | /:id | SUPER_ADMIN, ASSET_MANAGER | Delete location |

## Departments (`/v1/departments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List all departments |
| POST | / | SUPER_ADMIN | Create department |
| GET | /:id | Auth | Get department |
| PATCH | /:id | SUPER_ADMIN | Update department |
| DELETE | /:id | SUPER_ADMIN | Delete department |

## Roles (`/v1/roles`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List all roles |
| POST | / | SUPER_ADMIN | Create role |
| GET | /:id | Auth | Get role with permissions |
| PATCH | /:id | SUPER_ADMIN | Update role |
| DELETE | /:id | SUPER_ADMIN | Delete role |

## Permissions (`/v1/permissions`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List all permissions |
| POST | / | SUPER_ADMIN | Create permission |

## Tags (`/v1/tags`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /asset/:id/qr-code | SUPER_ADMIN, ASSET_MANAGER | Generate QR code (saved to asset) |
| POST | /asset/:id/barcode | SUPER_ADMIN, ASSET_MANAGER | Generate Code128 barcode |
| POST | /asset/:id/all | SUPER_ADMIN, ASSET_MANAGER | Generate both QR + barcode |
| POST | /label-sheet | SUPER_ADMIN, ASSET_MANAGER | Bulk generate for multiple assets |

## Notifications (`/v1/notifications`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | User's notifications (pagination, isRead/type filters) |
| GET | /unread-count | Auth | Unread notification count |
| PATCH | /:id/read | Auth | Mark as read |
| PATCH | /read-all | Auth | Mark all as read |
| DELETE | /:id | Auth | Delete notification |

## Audit Logs (`/v1/audit-logs`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | SUPER_ADMIN, AUDITOR | List with pagination/filters |
| GET | /statistics | SUPER_ADMIN, AUDITOR | Stats with date range |
| GET | /recent | SUPER_ADMIN, AUDITOR, ASSET_MANAGER | Recent logs (default 50) |
| GET | /entity/:entityType/:entityId | SUPER_ADMIN, AUDITOR, ASSET_MANAGER | Entity history |
| GET | /user/:userId | SUPER_ADMIN, AUDITOR | User's action history |

## Reports (`/v1/reports`)

All report endpoints accept `?format=csv|xlsx|pdf` and optional `dateFrom`/`dateTo` filters.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /assets | SUPER_ADMIN, ASSET_MANAGER, AUDITOR | Assets report |
| GET | /assignments | SUPER_ADMIN, ASSET_MANAGER, AUDITOR | Assignments report |
| GET | /transfers | SUPER_ADMIN, ASSET_MANAGER, AUDITOR | Transfers report |
| GET | /users | SUPER_ADMIN, AUDITOR | Users report |
| GET | /audit-logs | SUPER_ADMIN, AUDITOR | Audit logs report (max 1000 records) |
