# Architecture

## System Diagram

```
Browser (Next.js SPA)
  │
  ├─ Axios (apiClient) ─── Bearer token in header
  │                         refresh_token in httpOnly cookie
  │
  ▼
NestJS API (port 3001, /v1)
  │
  ├─ Helmet (security headers)
  ├─ ThrottlerModule (10 req / 60s)
  ├─ ValidationPipe (global, whitelist + transform)
  ├─ JwtAuthGuard (global via APP_GUARD pattern per-controller)
  ├─ RolesGuard (RBAC enforcement)
  ├─ AuditLogInterceptor (global APP_INTERCEPTOR, fire-and-forget)
  │
  ▼
Prisma ORM ──► PostgreSQL 15 (Docker, port 5432)
                  └── 17 models, 4 enums

Redis 7 (Docker, port 6379) ── declared but unused currently
```

## Backend Architecture

### Module Pattern
Every feature follows: `module.ts` + `controller.ts` + `service.ts` + `dto/*.dto.ts`
- Controllers handle HTTP routing, decorators (@Roles, @Public, @ApiTags), and request/response
- Services contain business logic and Prisma queries
- DTOs use `class-validator` decorators for request validation
- All modules import `PrismaModule` for database access

### Authentication & Authorization
- **Passport.js** with two strategies:
  - `jwt` — extracts Bearer token from Authorization header, validates user active, returns `{userId, email, roles}`
  - `jwt-refresh` — extracts refresh_token from httpOnly cookie, returns `{userId, email, refreshToken}`
- **JwtAuthGuard** — extends Passport AuthGuard('jwt'), respects `@Public()` decorator to skip auth
- **RolesGuard** — reads `@Roles()` metadata, checks if user has any of the required roles
- **Decorators:**
  - `@Public()` — marks route as unauthenticated (sets `isPublic` metadata)
  - `@Roles(...roles)` — declares required roles (checked by RolesGuard)
  - `@CurrentUser(field?)` — extracts JWT payload from request (userId, email, roles, refreshToken)
- **MFA**: TOTP via `speakeasy`, QR code generation, backup codes (bcrypt-hashed)
- **Password Reset**: Random token → SHA256 hash stored → 1-hour expiry → transactional reset

### Global Middleware Stack (applied in main.ts)
1. `helmet()` — security headers
2. CORS — origin whitelist (FRONTEND_URL + localhost in dev), credentials: true
3. Global prefix: `/v1`
4. `ValidationPipe` — whitelist, forbidNonWhitelisted, transform with implicit conversion
5. `AuditLogInterceptor` — registered as APP_INTERCEPTOR in AppModule

### AuditLogInterceptor Details
- Intercepts POST, PUT, PATCH, DELETE requests only
- Maps routes to entity types via ROUTE_ENTITY_MAP (`assets` → `Asset`, etc.)
- Skips: auth, audit-logs, reports routes; routes with `@SkipAuditLog()` decorator
- Captures: entityType, entityId (from params or response), action (create/update/delete), userId, changes (sanitized), ipAddress, userAgent
- Fire-and-forget: logs asynchronously, catches errors silently
- Sanitizes: removes password, hashedPassword, refreshToken, mfaSecret, accessToken, token fields

### Database Layer
- **Prisma 5** ORM with PostgreSQL provider
- 17 models across 5 groups (Auth, Org, Assets, Assignments/Transfers, Audit/Notifications)
- Soft delete on User and Asset (filter `deletedAt: null` in all queries)
- All IDs are UUIDs (`@db.Uuid`)
- Column mapping: camelCase in code → snake_case in DB via `@map()`
- See [database.md](database.md) for full schema

### Report Generation
- **CSV**: Manual string building with comma/quote escaping
- **XLSX**: ExcelJS with styled headers, auto-fit columns
- **PDF**: PDFKit with title, date, tabular data (limited to 50 rows for readability)
- All reports return Buffer, controller sets Content-Type and Content-Disposition headers

### Tag Generation
- **QR Code**: `qrcode` library → data URL PNG, stored in `asset.qrCodeUrl`
- **Barcode**: `bwip-js` Code128 → base64 PNG, stored in `asset.barcodeUrl`
- Label sheet: batch generation for multiple assets

### Notifications
- **In-app**: Always saved to Notification table
- **Email**: Resend SDK (stubbed — currently logs only)
- **Slack**: Webhook (stubbed — currently logs only)
- Helper methods: `notifyAssetAssignment()`, `notifyTransferRequest()`, `notifyTransferApproval()`
- These helpers exist but are NOT auto-called from other services

---

## Frontend Architecture

### App Structure
```
src/
├── app/
│   ├── layout.tsx          ← Root layout with Providers wrapper
│   ├── page.tsx            ← Redirects to /dashboard
│   ├── auth/               ← Login, forgot-password, reset-password
│   └── dashboard/
│       ├── layout.tsx      ← Protected route + sidebar layout
│       ├── page.tsx        ← Dashboard overview
│       ├── assets/         ← Asset CRUD + [id] detail
│       ├── assignments/    ← Assignment management
│       ├── transfers/      ← Transfer workflow
│       └── ...             ← categories, vendors, locations, departments, users, settings, notifications
├── components/
│   ├── sidebar.tsx         ← Navigation (13 items + logout)
│   ├── providers.tsx       ← QueryClient + AuthProvider wrapper
│   └── ui/                 ← shadcn/ui components (dialog, select, tabs, textarea, etc.)
└── lib/
    ├── api-client.ts       ← Axios singleton with token refresh
    ├── api-hooks.ts        ← ~40 TanStack Query hooks
    ├── auth-context.tsx    ← React Context for auth state
    ├── utils.ts            ← cn(), formatDate(), formatCurrency(), formatDateTime()
    └── password-validation.ts
```

### State Management
- **Server state**: TanStack React Query 5 (staleTime: 30s-60s, retry: 2, auto-invalidation on mutations)
- **Auth state**: React Context (`AuthProvider`) with login/logout/register/refreshUser
- **UI state**: React useState for dialogs, forms, filters, pagination

### Token Refresh Mechanism (`api-client.ts`)
The `ApiClient` class implements a dual-queue pattern:
1. On 401, check if already refreshing
2. If refreshing: queue the failed request (Promise-based)
3. If not: set `isRefreshing=true`, call POST `/auth/refresh` (withCredentials for cookie)
4. On success: update cookie, resolve all queued requests, retry original
5. On failure: reject all queued, clear cookie, redirect to `/auth/login`
6. `_retry` flag prevents infinite loops

### UI Framework
- **shadcn/ui**: Radix UI primitives + Tailwind CSS styling
- Components: Dialog, Select, Tabs, Textarea, Badge, Button, Card, Input, Label, Avatar, etc.
- `cn()` utility (clsx + tailwind-merge) for class composition
- Sonner for toast notifications
- Recharts for dashboard charts
- Lucide React for icons

### Form Handling Pattern
1. State object via useState (most pages) or React Hook Form (login)
2. Mutation hook: `useCreate<Entity>()`, `useUpdate<Entity>()`, etc.
3. Submit: validate → `mutateAsync(data)` → `toast.success()` → close dialog → reset form
4. Error: `toast.error(error.response?.data?.message || fallback)`
5. Button disabled while `isPending`

### Protected Routes
- `dashboard/layout.tsx` checks `user` from AuthContext
- If `!user && !loading` → redirect to `/auth/login`
- Shows loading spinner during auth check
