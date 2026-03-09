# Architecture

## System Diagram

```
Browser (Next.js SPA)
  │
  ├─ Axios (apiClient) ─── Bearer token in header
  │                         refresh_token in httpOnly cookie
  │                         X-Org-Id header (platform admin org switching)
  │
  ▼
NestJS API (port 3001, /v1)
  │
  ├─ Helmet (security headers)
  ├─ ThrottlerModule (10 req / 60s)
  ├─ ValidationPipe (global, whitelist + transform)
  ├─ JwtAuthGuard (global via APP_GUARD pattern per-controller)
  ├─ RolesGuard (RBAC enforcement)
  ├─ PlatformAdminGuard (cross-tenant admin enforcement)
  ├─ TenantInterceptor (global APP_INTERCEPTOR, extracts tenantId from JWT + X-Org-Id)
  ├─ AuditLogInterceptor (global APP_INTERCEPTOR, fire-and-forget)
  │
  ▼
Prisma ORM ──► PostgreSQL 15 (Docker, port 5432)
  │               └── 19 models, 4 enums
  │               └── Prisma middleware auto-filters by tenantId
  │
  ▼
TenantContextService (nestjs-cls) ── request-scoped tenant context

Redis 7 (Docker, port 6379) ── declared but unused currently
```

## Backend Architecture

### Module Pattern
Every feature follows: `module.ts` + `controller.ts` + `service.ts` + `dto/*.dto.ts`
- Controllers handle HTTP routing, decorators (@Roles, @Public, @PlatformAdmin, @ApiTags), and request/response
- Services contain business logic and Prisma queries
- DTOs use `class-validator` decorators for request validation
- All modules import `PrismaModule` for database access

### Authentication & Authorization
- **Passport.js** with two strategies:
  - `jwt` — extracts Bearer token from Authorization header, validates user active, returns `{userId, email, roles, tenantId, isPlatformAdmin}`
  - `jwt-refresh` — extracts refresh_token from httpOnly cookie, returns `{userId, email, refreshToken}`
- **JwtAuthGuard** — extends Passport AuthGuard('jwt'), respects `@Public()` decorator to skip auth
- **RolesGuard** — reads `@Roles()` metadata, checks if user has any of the required roles. Bypasses for `isPlatformAdmin`
- **PlatformAdminGuard** — ensures `user.isPlatformAdmin === true` for cross-tenant operations
- **Decorators:**
  - `@Public()` — marks route as unauthenticated (sets `isPublic` metadata)
  - `@Roles(...roles)` — declares required roles (checked by RolesGuard)
  - `@CurrentUser(field?)` — extracts JWT payload from request: `{userId, email, roles, tenantId, isPlatformAdmin, refreshToken?}`
  - `@PlatformAdmin()` — marks route as platform admin only
  - `@SkipAuditLog()` — skips audit logging on specific routes
- **MFA**: TOTP via `speakeasy`, QR code generation, backup codes (bcrypt-hashed)
- **Password Reset**: Random token → SHA256 hash stored → 1-hour expiry → transactional reset

### Multi-Tenancy
- **Organization model**: name, slug (unique), logoUrl, isActive — created during user registration
- **TenantContextService** (`nestjs-cls`): stores tenantId and isPlatformAdmin per request via CLS (continuation-local storage)
- **TenantInterceptor** (global APP_INTERCEPTOR):
  - Extracts `tenantId` from JWT payload
  - Platform admins can override via `X-Org-Id` header
  - Sets context in TenantContextService
- **Prisma Middleware**: auto-injects `tenantId` filter into all queries for 10 tenant-scoped models:
  - User, Department, Category, Vendor, Location, Asset, AssetAssignment, AssetTransfer, AuditLog, Notification
  - Converts `findUnique` → `findFirst` for compound tenant filtering
- **Platform Admin**: `isPlatformAdmin` flag on User model — can view/manage all organizations

### Global Middleware Stack (applied in main.ts)
1. `helmet()` — security headers
2. CORS — origin whitelist (FRONTEND_URL + localhost in dev), credentials: true
3. Global prefix: `/v1`
4. `ValidationPipe` — whitelist, forbidNonWhitelisted, transform with implicit conversion
5. `TenantInterceptor` — registered as APP_INTERCEPTOR in AppModule
6. `AuditLogInterceptor` — registered as APP_INTERCEPTOR in AppModule

### AuditLogInterceptor Details
- Intercepts POST, PUT, PATCH, DELETE requests only
- Maps routes to entity types via ROUTE_ENTITY_MAP (`assets` → `Asset`, etc.)
- Skips: auth, audit-logs, reports routes; routes with `@SkipAuditLog()` decorator
- Captures: entityType, entityId (from params or response), action (create/update/delete), userId, changes (sanitized), ipAddress, userAgent
- Fire-and-forget: logs asynchronously, catches errors silently
- Sanitizes: removes password, hashedPassword, refreshToken, mfaSecret, accessToken, token fields

### Database Layer
- **Prisma 5** ORM with PostgreSQL provider
- 19 models across 5 groups (Auth, Org, Assets, Assignments/Transfers, Audit/Notifications)
- Soft delete on User and Asset (filter `deletedAt: null` in all queries)
- All IDs are UUIDs (`@db.Uuid`)
- Column mapping: camelCase in code → snake_case in DB via `@map()`
- Multi-tenancy: Prisma middleware auto-filters by tenantId on all tenant-scoped models
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
│   ├── auth/
│   │   ├── login/          ← Email/password + optional MFA
│   │   ├── register/       ← Self-registration (creates org + admin)
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── accept-invitation/ ← Token-based org invitation acceptance
│   └── dashboard/
│       ├── layout.tsx      ← Protected route + sidebar layout
│       ├── page.tsx        ← Dashboard overview (stats, charts, activity)
│       ├── assets/         ← Asset CRUD + [id] detail
│       ├── assignments/    ← Assignment management
│       ├── transfers/      ← Transfer workflow
│       ├── tags/           ← QR/barcode tag display
│       ├── notifications/  ← Notification center
│       ├── settings/       ← Profile, password, org branding
│       │   └── invitations/ ← Manage org invitations (admin)
│       └── ...             ← categories, vendors, locations, departments, users
├── components/
│   ├── sidebar.tsx         ← Navigation (13 items + logout, role-based visibility)
│   ├── providers.tsx       ← QueryClient + AuthProvider + ThemeProvider wrapper
│   ├── page-header.tsx     ← Reusable page header with title, description, actions
│   ├── data-table.tsx      ← Generic table with skeleton loading, empty state, pagination
│   ├── pagination.tsx      ← Table pagination controls
│   ├── stat-card.tsx       ← Stats display (icon + value + title)
│   ├── empty-state.tsx     ← Empty data illustration
│   ├── access-denied.tsx   ← 403 permission denied page
│   ├── org-switcher.tsx    ← Organization switcher for platform admins
│   ├── confirm-dialog.tsx  ← Generic confirmation modal
│   ├── theme-provider.tsx  ← Next Themes wrapper
│   ├── theme-toggle.tsx    ← Light/dark mode switcher
│   ├── themed-toaster.tsx  ← Sonner toast with theme support
│   └── ui/                 ← shadcn/ui components (dialog, select, tabs, textarea, badge, button, card, input, label, etc.)
└── lib/
    ├── api-client.ts       ← Axios singleton with token refresh + X-Org-Id header
    ├── api-hooks.ts        ← ~45+ TanStack Query hooks
    ├── auth-context.tsx    ← React Context for auth state (login/logout/register/refreshUser/updateOrganizationData)
    ├── permissions.ts      ← usePermissions() hook with 15+ role-based permission flags
    ├── utils.ts            ← cn(), formatDate(), formatCurrency(), formatDateTime()
    └── password-validation.ts ← Password strength checker and requirements
```

### State Management
- **Server state**: TanStack React Query 5 (staleTime: 30s-60s, retry: 2, auto-invalidation on mutations)
- **Auth state**: React Context (`AuthProvider`) with login/logout/register/refreshUser/updateOrganizationData
- **UI state**: React useState for dialogs, forms, filters, pagination
- **Org switching**: sessionStorage for platform admin org selection

### Token Refresh Mechanism (`api-client.ts`)
The `ApiClient` class implements a dual-queue pattern:
1. On 401, check if already refreshing
2. If refreshing: queue the failed request (Promise-based)
3. If not: set `isRefreshing=true`, call POST `/auth/refresh` (withCredentials for cookie)
4. On success: update cookie, resolve all queued requests, retry original
5. On failure: reject all queued, clear cookie, redirect to `/auth/login`
6. `_retry` flag prevents infinite loops
7. Platform admin: attaches `X-Org-Id` header from sessionStorage for org switching

### Frontend RBAC (`permissions.ts`)
The `usePermissions()` hook provides 15+ boolean permission flags based on user roles:
- `canManageAssets`, `canCreateAssignment`, `canApproveTransferAsManager`, `canApproveTransferAsAdmin`
- `canManageMasterData`, `canManageUsers`, `canViewAuditLogs`, `canViewReports`
- `canSwitchOrgs` (platform admin only)
- Used in sidebar navigation, page components, and action buttons for role-based visibility

### UI Framework
- **shadcn/ui**: Radix UI primitives + Tailwind CSS styling
- Components: Dialog, Select, Tabs, Textarea, Badge, Button, Card, Input, Label, Avatar, etc.
- `cn()` utility (clsx + tailwind-merge) for class composition
- Sonner for toast notifications
- Recharts for dashboard charts
- Lucide React for icons
- Dark mode support via next-themes (class-based)

### Form Handling Pattern
1. State object via useState (most pages) or React Hook Form (login/register)
2. Mutation hook: `useCreate<Entity>()`, `useUpdate<Entity>()`, etc.
3. Submit: validate → `mutateAsync(data)` → `toast.success()` → close dialog → reset form
4. Error: `toast.error(error.response?.data?.message || fallback)`
5. Button disabled while `isPending`

### Protected Routes
- `dashboard/layout.tsx` checks `user` from AuthContext
- If `!user && !loading` → redirect to `/auth/login`
- Shows loading spinner during auth check
- Role-based component visibility via `usePermissions()` hook
