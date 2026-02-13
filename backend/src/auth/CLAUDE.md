# Auth Module

## Purpose
Authentication (JWT + TOTP MFA) and authorization (RBAC) for the entire API.

## Key Files
- `auth.controller.ts` — 10 endpoints (login, register, logout, refresh, MFA, password reset)
- `auth.service.ts` — business logic (credential validation, token generation, MFA, password reset)
- `auth.module.ts` — registers JwtModule, PassportModule, strategies, guards
- `strategies/jwt.strategy.ts` — Passport 'jwt' strategy (Bearer token from header)
- `strategies/jwt-refresh.strategy.ts` — Passport 'jwt-refresh' strategy (cookie extraction)
- `guards/jwt-auth.guard.ts` — extends AuthGuard('jwt'), respects @Public()
- `guards/roles.guard.ts` — checks @Roles() decorator against user.roles
- `decorators/public.decorator.ts` — `@Public()` marks routes as unauthenticated
- `decorators/roles.decorator.ts` — `@Roles(...roles)` sets required roles metadata
- `decorators/current-user.decorator.ts` — `@CurrentUser(field?)` extracts JWT payload
- `dto/login.dto.ts` — email, password, mfaCode?
- `dto/register.dto.ts` — email, password, firstName, lastName, phone?, departmentId?
- `dto/mfa.dto.ts` — VerifyMfaDto (code), DisableMfaDto (code)
- `dto/forgot-password.dto.ts` — email
- `dto/reset-password.dto.ts` — token, newPassword

## Auth Flow
```
1. POST /auth/login
   ├─ Find user (exclude soft-deleted)
   ├─ bcrypt.compare(password, passwordHash)
   ├─ Check user.isActive
   ├─ If MFA enabled:
   │   ├─ No mfaCode → return {requiresMfa: true}
   │   └─ With code → speakeasy.totp.verify(secret, code, window=2)
   ├─ Generate tokens:
   │   ├─ accessToken: JWT {sub: userId, email, roles} signed with JWT_SECRET, 15min
   │   └─ refreshToken: JWT {sub: userId, email} signed with JWT_REFRESH_SECRET, 7d
   ├─ Store SHA256(refreshToken) in refresh_tokens table
   ├─ Set refresh_token as httpOnly cookie (secure in prod, sameSite=strict)
   └─ Return {accessToken, user: {id, email, firstName, lastName, roles, isMfaEnabled}}
```

## JWT Payload (CurrentUserPayload)
```typescript
{
  userId: string;
  email: string;
  roles: string[];        // ['SUPER_ADMIN', 'ASSET_MANAGER', ...]
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

## Role Hierarchy (5 defined roles)
| Role | Typical Access |
|------|---------------|
| SUPER_ADMIN | Full access to all resources |
| ASSET_MANAGER | Asset CRUD, assignments, transfers, categories/vendors/locations |
| DEPARTMENT_HEAD | Transfer approval, limited management |
| EMPLOYEE | View own assignments, request transfers |
| AUDITOR | Read-only access to audit logs, reports |
