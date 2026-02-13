# Data Flow

## API Communication
```
Frontend (apiClient)  →  HTTP request with Bearer token
                      →  NestJS Controller (validates auth + roles)
                      →  Service (business logic)
                      →  Prisma (SQL query)
                      →  PostgreSQL
                      ←  Response JSON
                      ←  TanStack Query caches result
```

All requests go through the Axios interceptor which attaches the access token from cookies.

---

## Authentication Flow

### Login
1. `POST /v1/auth/login` with `{email, password, mfaCode?}`
2. Backend: find user (exclude soft-deleted) → bcrypt.compare password → check isActive
3. If MFA enabled and no code: return `{requiresMfa: true}` (frontend shows MFA input)
4. If MFA enabled with code: `speakeasy.totp.verify()` with window=2
5. Generate JWT access token (15min) + refresh token (7d, JWT signed)
6. Store refresh token hash (SHA256) in `refresh_tokens` table
7. Set `refresh_token` as httpOnly, secure (prod), sameSite=strict cookie
8. Return `{accessToken, user: {id, email, firstName, lastName, roles, isMfaEnabled}}`
9. Frontend: stores accessToken in JS cookie (15min expiry), sets user in AuthContext

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
      └─ Stored in audit_logs table with JSONB changes field
```

---

## Notification Flow
```
NotificationsService.create(dto)
  ├─ Save to notifications table (always)
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
