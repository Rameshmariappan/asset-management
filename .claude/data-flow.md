# Data Flow

## API Communication
```
Frontend (apiClient)  →  HTTP request with Bearer token + X-Org-Id (platform admin)
                      →  NestJS Controller (validates auth + roles)
                      →  TenantInterceptor (sets tenant context from JWT/header)
                      →  Service (business logic)
                      →  Prisma (SQL query + auto tenant filter via middleware)
                      →  PostgreSQL
                      ←  Response JSON
                      ←  TanStack Query caches result
```

All requests go through the Axios interceptor which attaches the access token from cookies and X-Org-Id header (for platform admins).

---

## Authentication Flow

### Registration
1. `POST /v1/auth/register` with `{email, password, firstName, lastName, organizationName}`
2. Backend transaction:
   1. Generate slug from organizationName (lowercase, hyphenated, unique)
   2. Create Organization record
   3. Create User with `tenantId` = new org ID
   4. Find SUPER_ADMIN role → create UserRole assignment
3. Return `{organization, user}` (password excluded)
4. Frontend: redirects to login page

### Login
1. `POST /v1/auth/login` with `{email, password, mfaCode?}`
2. Backend: find user (exclude soft-deleted) → bcrypt.compare password → check isActive → check org.isActive
3. If MFA enabled and no code: return `{requiresMfa: true}` (frontend shows MFA input)
4. If MFA enabled with code: `speakeasy.totp.verify()` with window=2
5. Generate JWT access token (15min) + refresh token (7d, JWT signed)
6. JWT payload: `{sub: userId, email, roles, tenantId, isPlatformAdmin}`
7. Store refresh token hash (SHA256) in `refresh_tokens` table
8. Set `refresh_token` as httpOnly, secure (prod), sameSite=strict cookie
9. Return `{accessToken, user: {id, email, firstName, lastName, roles, isMfaEnabled, tenantId, isPlatformAdmin, organization}}`
10. Frontend: stores accessToken in JS cookie (15min expiry), sets user in AuthContext

### Token Refresh (on 401)
1. Axios interceptor catches 401 on any request
2. If not already refreshing: `POST /v1/auth/refresh` (sends refresh_token cookie)
3. Backend: JwtRefreshStrategy extracts token from cookie → validates JWT → looks up user
4. AuthService: finds stored token by hash → validates not revoked/expired → revokes old token → generates new pair
5. New refresh_token set as httpOnly cookie, new accessToken returned
6. Frontend: updates cookie, retries original + all queued requests
7. If refresh fails: clear cookie → redirect to `/auth/login`

### Logout
1. `POST /v1/auth/logout` — backend revokes refresh token, clears cookie
2. Frontend: removes accessToken cookie, clears user state, redirects to login

### Invitation Flow
1. Admin calls `POST /v1/organizations/invitations` with `{email, roleName}`
2. Backend: creates OrgInvitation with random token, tenantId from current user, expiresAt (48h)
3. Frontend: copies invitation link to clipboard (contains token)
4. New user visits `/auth/accept-invitation?token=...`
5. `POST /v1/auth/accept-invitation` with `{token, password, firstName, lastName}`
6. Backend transaction:
   1. Validate token (not expired, not already accepted)
   2. Create User with tenantId from invitation
   3. Find role by roleName → create UserRole assignment
   4. Mark invitation as accepted (set acceptedAt)
7. Frontend: redirects to login page

---

## Multi-Tenancy Flow

### Tenant Context (per-request)
```
HTTP Request
  │
  TenantInterceptor (global)
  ├─ Extract tenantId from JWT payload
  ├─ If isPlatformAdmin AND X-Org-Id header present → override tenantId
  ├─ Set tenantId in TenantContextService (CLS-based)
  └─ Set isPlatformAdmin flag in context

  Service layer (business logic)
  │
  Prisma Middleware (automatic)
  ├─ Before every query on tenant-scoped models:
  │   ├─ findMany/findFirst/count/aggregate → inject WHERE tenantId = ctx.tenantId
  │   ├─ findUnique → convert to findFirst with tenantId filter
  │   ├─ create → inject tenantId into data
  │   ├─ update/delete → inject tenantId into WHERE clause
  │   └─ Skip filtering if isPlatformAdmin (for cross-tenant queries)
  └─ Tenant-scoped models: User, Department, Category, Vendor, Location, Asset,
     AssetAssignment, AssetTransfer, AuditLog, Notification
```

---

## Domain Entity Flows

### Asset Lifecycle
```
Create (POST /assets)
  ├─ Validate unique assetTag + serialNumber
  ├─ Calculate currentValue if category has depreciationRate + usefulLifeYears
  │   (purchaseCost - (depreciationRate% * yearsOwned), floor at salvageValue)
  └─ Status: set based on DTO (default varies)

Status Transitions:
  available ──(assign)──► assigned ──(return Good/Fair/Excellent)──► available
                                   ──(return Damaged/Poor)──► damaged
  available ──(manual)──► maintenance ──(manual)──► available
  any ──(soft delete)──► retired (sets deletedAt + status=retired)

Delete:
  ├─ Blocked if asset has active assignments
  └─ Soft delete: sets deletedAt + status=retired
```

### Assignment Lifecycle
```
Create (POST /assignments)
  ├─ Validate asset status = available AND no active assignment
  ├─ Validate assignedToUser exists and not deleted
  ├─ Transaction:
  │   1. Create AssetAssignment (isActive=true, assignedAt=now)
  │   2. Update Asset status → assigned
  └─ Optional: signature (SHA256 hash), condition, rating, notes

Return (POST /assignments/:id/return)
  ├─ Validate assignment isActive=true
  ├─ Transaction:
  │   1. Update assignment (isActive=false, returnedAt=now, condition, rating)
  │   2. Update asset status:
  │      - returnCondition Damaged/Poor → status=damaged
  │      - Otherwise → status=available
  └─ Optional: return signature, photos, notes
```

### Transfer Lifecycle (Dual-Approval)
```
Request (POST /transfers)
  ├─ Validate asset exists, from/to users exist
  ├─ Block if pending transfer already exists for this asset
  └─ Create AssetTransfer (status=pending)

Manager Approval (POST /transfers/:id/approve/manager)
  ├─ Requires status=pending
  └─ Update → status=manager_approved, record approver + timestamp + notes

Admin Approval (POST /transfers/:id/approve/admin)
  ├─ Requires status=manager_approved
  └─ Transaction:
      1. Deactivate current assignment (if any): isActive=false, returnedAt=now
      2. Create new assignment for toUser (condition=Good, rating=4)
      3. Update asset status → assigned
      4. Update transfer → status=completed, completedAt=now

Rejection (POST /transfers/:id/reject)
  ├─ Any status except completed/rejected
  └─ Update → status=rejected, record rejector + reason + timestamp
```

---

## Audit Flow
```
Any POST/PATCH/DELETE request
  │
  AuditLogInterceptor (global)
  ├─ Skip: GET requests, auth/reports/audit-logs routes, @SkipAuditLog()
  ├─ Map route → entityType (e.g., "assets" → "Asset")
  ├─ Map method → action (POST=create, PATCH/PUT=update, DELETE=delete)
  ├─ Extract: userId from JWT, entityId from params or response, IP, user-agent
  ├─ Sanitize response data (remove passwords, tokens, secrets)
  └─ Fire-and-forget: auditLogsService.create() — does not block response
      └─ Stored in audit_logs table with JSONB changes field + tenantId
```

---

## Notification Flow
```
NotificationsService.create(dto)
  ├─ Save to notifications table (always, with tenantId)
  ├─ If channel=email: sendEmail() via Resend (currently stubbed — logs only)
  ├─ If channel=slack: sendSlack() via webhook (currently stubbed — logs only)
  └─ Update sentAt timestamp

Helper methods exist but are NOT auto-called:
  - notifyAssetAssignment(userId, assetTag, assetName)
  - notifyTransferRequest(userId, assetTag, from, to)
  - notifyTransferApproval(userId, assetTag, status)
```

---

## Frontend Data Fetching Pattern
```
Page Component
  ├─ usePermissions() ← check role-based access
  ├─ useEntities({ page, search, ...filters })  ← TanStack useQuery
  │   └─ apiClient.get('/entities', { params })
  │
  ├─ useCreateEntity()  ← TanStack useMutation
  │   └─ onSuccess: queryClient.invalidateQueries(['entities'])
  │
  └─ Render: loading skeleton → data table → pagination
```

Query configuration:
- `staleTime`: 30s for assets/users/master data, 60s default
- `retry`: 2 for most queries
- Unread notification count: refetched every 30s
- Mutations invalidate related query keys on success
