# API Endpoints

Base URL: `http://localhost:3001/v1`
Swagger docs: `http://localhost:3001/api/docs`

Legend: `@Public` = no auth required, `[Auth]` = JWT required, `[ROLE,...]` = role restriction via @Roles, `[PlatformAdmin]` = isPlatformAdmin required

---

## Auth (`/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | @Public | Register new user + organization (creates org + SUPER_ADMIN role in transaction) |
| POST | /login | @Public | Login → accessToken + refresh cookie, or `{requiresMfa: true}` |
| POST | /refresh | @Public + jwt-refresh guard | Rotate access + refresh tokens |
| POST | /logout | Auth | Revoke refresh token, clear cookie |
| GET | /me | Auth | Current user from JWT payload |
| POST | /mfa/setup | Auth | Generate TOTP secret + QR code |
| POST | /mfa/verify | Auth | Verify TOTP code → enable MFA + return backup codes |
| POST | /mfa/disable | Auth | Disable MFA (requires valid TOTP code) |
| POST | /forgot-password | @Public | Generate reset token (returned in response for dev) |
| POST | /reset-password | @Public | Reset password using token (transactional) |
| POST | /accept-invitation | @Public | Accept org invitation → create user with assigned role |

## Users (`/v1/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD | List users (pagination, search, filters) |
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create user with optional roleNames |
| GET | /me | Auth | Current user profile (detailed) |
| POST | /me/change-password | Auth | Change own password (requires current) |
| GET | /:id | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD | Get user by ID |
| PATCH | /:id | SUPER_ADMIN, ASSET_MANAGER | Update user |
| DELETE | /:id | SUPER_ADMIN | Soft delete user |
| POST | /:id/roles | SUPER_ADMIN | Assign roles (replaces all existing) |
| GET | /:id/assets | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD | Get user's active assignments |
| GET | /:id/stats | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD | User statistics (assignments, transfers) |

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
| DELETE | /:id | SUPER_ADMIN | Soft delete (blocked if active assignments) |

## Assignments (`/v1/assignments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD, AUDITOR | List assignments (pagination, filters) |
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create (validates asset available, transactional) |
| GET | /statistics | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD, AUDITOR | Total/active/returned/overdue counts |
| GET | /active | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD, AUDITOR | All active assignments |
| GET | /user/:userId | Auth | User's assignments (optional isActive filter) |
| GET | /:id | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD, AUDITOR | Single assignment |
| PATCH | /:id/return | SUPER_ADMIN, ASSET_MANAGER | Return asset (condition, signature, transactional) |

## Transfers (`/v1/transfers`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD, AUDITOR | List transfers (pagination, filters) |
| POST | / | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD | Request transfer (validates no pending for asset) |
| GET | /statistics | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD, AUDITOR | Status breakdown + awaitingAction |
| GET | /pending | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD | Pending + manager_approved transfers |
| GET | /:id | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD, AUDITOR | Single transfer (full details) |
| PATCH | /:id/approve/manager | SUPER_ADMIN, DEPT_HEAD | Manager approval (pending → manager_approved) |
| PATCH | /:id/approve/admin | SUPER_ADMIN, ASSET_MANAGER | Admin approval (transactional, completes transfer) |
| PATCH | /:id/reject | SUPER_ADMIN, ASSET_MANAGER, DEPT_HEAD | Reject (any non-completed/rejected) |

## Organizations (`/v1/organizations`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /me | Auth | Get current organization details |
| PATCH | /me | SUPER_ADMIN | Update organization (name) |
| POST | /me/logo | SUPER_ADMIN | Upload organization logo |
| DELETE | /me/logo | SUPER_ADMIN | Remove organization logo |
| POST | /invitations | SUPER_ADMIN | Invite user to organization (email + roleName) |
| GET | /invitations | SUPER_ADMIN | List organization invitations |
| DELETE | /invitations/:id | SUPER_ADMIN | Revoke an invitation |

## Platform (`/v1/platform`)

All endpoints require `isPlatformAdmin === true` (PlatformAdminGuard).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /organizations | PlatformAdmin | List all organizations |
| GET | /organizations/:id | PlatformAdmin | Get organization details |
| PATCH | /organizations/:id | PlatformAdmin | Update organization (name, isActive) |

## Categories (`/v1/categories`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List all categories |
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create category |
| GET | /:id | Auth | Get category |
| PATCH | /:id | SUPER_ADMIN, ASSET_MANAGER | Update category |
| DELETE | /:id | SUPER_ADMIN | Delete category |

## Vendors (`/v1/vendors`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List all vendors |
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create vendor |
| GET | /:id | Auth | Get vendor |
| PATCH | /:id | SUPER_ADMIN, ASSET_MANAGER | Update vendor |
| DELETE | /:id | SUPER_ADMIN | Delete vendor |

## Locations (`/v1/locations`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List all locations |
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create location |
| GET | /:id | Auth | Get location |
| PATCH | /:id | SUPER_ADMIN, ASSET_MANAGER | Update location |
| DELETE | /:id | SUPER_ADMIN | Delete location |

## Departments (`/v1/departments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Auth | List all departments |
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create department |
| GET | /:id | Auth | Get department |
| PATCH | /:id | SUPER_ADMIN, ASSET_MANAGER | Update department |
| DELETE | /:id | SUPER_ADMIN | Delete department |

## Roles (`/v1/roles`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | SUPER_ADMIN, ASSET_MANAGER | List all roles |
| GET | /:id | SUPER_ADMIN, ASSET_MANAGER | Get role by ID |
| GET | /:id/permissions | SUPER_ADMIN | Get role permissions |

## Permissions (`/v1/permissions`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | SUPER_ADMIN, ASSET_MANAGER, AUDITOR | List all permissions |
| GET | /resource/:resource | SUPER_ADMIN, ASSET_MANAGER | Get permissions by resource |

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
| POST | / | SUPER_ADMIN, ASSET_MANAGER | Create and send a notification |
| POST | /bulk | SUPER_ADMIN, ASSET_MANAGER | Send bulk notifications to multiple users |
| GET | /me | Auth | Current user's notifications (pagination, isRead/type filters) |
| GET | /me/unread-count | Auth | Unread notification count |
| PATCH | /me/:id/read | Auth | Mark as read |
| PATCH | /me/read-all | Auth | Mark all as read |
| DELETE | /me/:id | Auth | Delete notification |

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
