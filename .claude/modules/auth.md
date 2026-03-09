# Auth Module

## Purpose
Authentication (JWT + TOTP MFA), authorization (RBAC), user registration (with org creation), invitation acceptance, and password management for the entire API.

## Key Files
- `auth.controller.ts` — 11 endpoints (login, register, logout, refresh, MFA, password reset, accept-invitation, me)
- `auth.service.ts` — business logic (credential validation, token generation, MFA, password reset, registration with org, invitation acceptance)
- `auth.module.ts` — registers JwtModule, PassportModule, strategies, guards
- `strategies/jwt.strategy.ts` — Passport 'jwt' strategy (Bearer token from header), returns `{userId, email, roles, tenantId, isPlatformAdmin}`
- `strategies/jwt-refresh.strategy.ts` — Passport 'jwt-refresh' strategy (cookie extraction)
- `guards/jwt-auth.guard.ts` — extends AuthGuard('jwt'), respects @Public()
- `guards/roles.guard.ts` — checks @Roles() decorator against user.roles, bypasses for isPlatformAdmin
- `guards/platform-admin.guard.ts` — checks isPlatformAdmin flag for cross-tenant operations
- `decorators/public.decorator.ts` — `@Public()` marks routes as unauthenticated
- `decorators/roles.decorator.ts` — `@Roles(...roles)` sets required roles metadata
- `decorators/current-user.decorator.ts` — `@CurrentUser(field?)` extracts JWT payload
- `decorators/platform-admin.decorator.ts` — `@PlatformAdmin()` marks route as platform admin only
- `dto/login.dto.ts` — email, password, mfaCode?
- `dto/register.dto.ts` — email, password, firstName, lastName, organizationName, phone?
- `dto/accept-invitation.dto.ts` — token, password, firstName, lastName
- `dto/mfa.dto.ts` — VerifyMfaDto (code), DisableMfaDto (code)
- `dto/forgot-password.dto.ts` — email
- `dto/reset-password.dto.ts` — token, newPassword

## Registration Flow
```
POST /auth/register
├─ Validate unique email (where deletedAt: null)
├─ Transaction:
│   1. Generate slug from organizationName (lowercase, replace spaces with hyphens)
│   2. Create Organization (name, slug, isActive=true)
│   3. Hash password with bcrypt (10 rounds)
│   4. Create User (email, passwordHash, firstName, lastName, tenantId=org.id)
│   5. Find SUPER_ADMIN role → Create UserRole assignment
└─ Return {organization, user} (password excluded)
```

## Auth Flow (Login)
```
1. POST /auth/login
   ├─ Find user (exclude soft-deleted, include roles + organization)
   ├─ bcrypt.compare(password, passwordHash)
   ├─ Check user.isActive
   ├─ Check user.organization.isActive (if org exists)
   ├─ If MFA enabled:
   │   ├─ No mfaCode → return {requiresMfa: true}
   │   └─ With code → speakeasy.totp.verify(secret, code, window=2)
   ├─ Generate tokens:
   │   ├─ accessToken: JWT {sub: userId, email, roles, tenantId, isPlatformAdmin} signed with JWT_SECRET, 15min
   │   └─ refreshToken: JWT {sub: userId, email} signed with JWT_REFRESH_SECRET, 7d
   ├─ Store SHA256(refreshToken) in refresh_tokens table
   ├─ Set refresh_token as httpOnly cookie (secure in prod, sameSite=strict)
   └─ Return {accessToken, user: {id, email, firstName, lastName, roles, isMfaEnabled, tenantId, isPlatformAdmin, organization}}
```

## Accept Invitation Flow
```
POST /auth/accept-invitation
├─ Find invitation by tokenHash (SHA256 of provided token)
├─ Validate: not already accepted (acceptedAt null), not expired
├─ Transaction:
│   1. Hash password with bcrypt
│   2. Create User (email from invitation, tenantId from invitation.organizationId)
│   3. Find role by invitation.roleName → Create UserRole assignment
│   4. Mark invitation accepted (set acceptedAt)
└─ Return {user} (password excluded)
```

## JWT Payload (CurrentUserPayload)
```typescript
{
  userId: string;
  email: string;
  roles: string[];        // ['SUPER_ADMIN', 'ASSET_MANAGER', ...]
  tenantId: string;       // Organization ID
  isPlatformAdmin: boolean;
  refreshToken?: string;  // Only present in refresh strategy
}
```

## Token Refresh
```
POST /auth/refresh (jwt-refresh strategy, cookie-based)
├─ Extract refresh_token from httpOnly cookie
├─ Validate JWT signature + expiry
├─ Look up token hash in DB
├─ Verify: not revoked, not expired, belongs to user
├─ Revoke old token, generate new pair
├─ Set new refresh_token cookie
└─ Return {accessToken}
```

## Password Reset
```
POST /auth/forgot-password
├─ Find user by email (always returns success to prevent enumeration)
├─ Invalidate existing unused tokens for user
├─ Generate: randomBytes(32).toString('hex') → SHA256 hash stored
├─ Token expires in 1 hour
└─ Returns resetToken in response (dev only — would email in prod)

POST /auth/reset-password
├─ Validate token: find by hash, check not used, check not expired
└─ Transaction:
    1. Update user.passwordHash
    2. Mark token as used
    3. Revoke ALL refresh tokens for user
```

## Role Hierarchy (5 tenant roles + platform admin)
| Role | Typical Access |
|------|---------------|
| SUPER_ADMIN | Full access to all resources within tenant |
| ASSET_MANAGER | Asset CRUD, assignments, transfers, categories/vendors/locations |
| DEPARTMENT_HEAD | Transfer approval (manager level), view department assets |
| EMPLOYEE | View own assignments, request transfers |
| AUDITOR | Read-only access to audit logs, reports |
| *isPlatformAdmin* | Cross-tenant admin (not a role — flag on User model) |
