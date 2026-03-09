# Conventions

## Backend Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Module folders | kebab-case | `audit-logs/`, `asset-assignments/` |
| File names | `<name>.<type>.ts` | `users.controller.ts`, `create-user.dto.ts` |
| Classes | PascalCase | `UsersService`, `CreateUserDto`, `JwtAuthGuard` |
| DB columns | snake_case via `@map()` | `first_name`, `is_active`, `created_at` |
| DB tables | snake_case via `@@map()` | `users`, `asset_assignments`, `audit_logs` |
| API routes | kebab-case, `/v1` prefix | `/v1/audit-logs`, `/v1/forgot-password` |
| Enums | Mixed: lowercase (AssetStatus), PascalCase (Condition) | `available`, `Excellent` |

## Frontend Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Pages | `app/<route>/page.tsx` | `app/dashboard/assets/page.tsx` |
| Components | lowercase filenames | `sidebar.tsx`, `providers.tsx` |
| UI components | lowercase in `components/ui/` | `dialog.tsx`, `select.tsx` |
| Query hooks | `use<Entity>s()` | `useAssets()`, `useTransfers()` |
| Mutation hooks | `use<Action><Entity>()` | `useCreateAsset()`, `useDeleteUser()` |
| Utilities | `lib/<name>.ts` | `lib/utils.ts`, `lib/api-client.ts` |
| Path alias | `@/*` → `./src/*` | `import { cn } from '@/lib/utils'` |

## Error Handling

**Backend:**
- `ConflictException` — duplicate resource (email, asset tag)
- `NotFoundException` — entity not found or soft-deleted
- `UnauthorizedException` — invalid credentials, inactive account, bad token
- `BadRequestException` — validation failure, invalid state transition
- `ForbiddenException` — insufficient role/permissions, inactive organization
- Errors in `AuditLogInterceptor` are caught and logged, never thrown

**Frontend:**
- Mutation errors: `toast.error(error.response?.data?.message || 'Generic fallback')`
- Some pages also check: `error.response?.data?.error || error.message`
- 401 errors: handled by Axios interceptor (token refresh or redirect)
- Network errors: bubble up as toast errors

## Validation

**Backend (class-validator + ValidationPipe):**
- Global pipe: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- Implicit conversion enabled (query string → number/boolean)
- DTOs use: `@IsString()`, `@IsEmail()`, `@IsOptional()`, `@IsEnum()`, `@IsUUID()`, `@MinLength()`, etc.

**Frontend:**
- Login/Register: Zod schema (`z.object({ email: z.string().email(), password: z.string().min(1) })`)
- Most other forms: manual validation (check required fields before submit)
- Password rules: `password-validation.ts` — 8-32 chars, lowercase + uppercase + number + special char
- Role-based access: `usePermissions()` hook checks before rendering forms/buttons

## Pagination

Standard response shape across all list endpoints:
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

Query DTOs typically include: `page` (default 1), `limit` (default 20), `search`, `sortBy`, `sortOrder` (asc/desc).

## Soft Delete Pattern

Models with `deletedAt`:
- `User` — sets `deletedAt` + `isActive=false`
- `Asset` — sets `deletedAt` + `status=retired`

All service queries filter `deletedAt: null` to exclude deleted records.
Email uniqueness is checked application-side (findFirst where email + deletedAt: null).
A partial unique index exists at DB level for email.

## Multi-Tenancy Pattern

- All tenant-scoped models have nullable `tenantId` field (FK → Organization)
- `TenantInterceptor` (global) extracts tenantId from JWT and sets in CLS context
- `Prisma middleware` auto-injects tenantId into all queries (find, create, update, delete)
- Platform admins can override tenant via `X-Org-Id` header
- Tenant-scoped models: User, Department, Category, Vendor, Location, Asset, AssetAssignment, AssetTransfer, AuditLog, Notification
- Organization slug: generated from name (lowercase, hyphenated), must be unique

## Authentication Decorators

```typescript
@Public()           // Skip JWT auth (for login, register, forgot-password, reset-password, accept-invitation)
@Roles('SUPER_ADMIN', 'ASSET_MANAGER')  // Require any of these roles
@CurrentUser()      // Inject full JWT payload: {userId, email, roles, tenantId, isPlatformAdmin}
@CurrentUser('userId')  // Inject just the userId string
@PlatformAdmin()    // Restrict to platform admins only (isPlatformAdmin === true)
@SkipAuditLog()     // Skip audit logging for this route
```

## Frontend RBAC Pattern

```typescript
const { canManageAssets, canApproveTransferAsAdmin, canSwitchOrgs } = usePermissions();

// Conditional rendering based on role
{canManageAssets && <Button onClick={openCreateDialog}>Add Asset</Button>}

// Page-level access control
if (!canViewAuditLogs) return <AccessDenied />;
```

## Testing

No test files exist currently. Jest is configured in `backend/package.json`:
- Test regex: `*.spec.ts`
- Transform: ts-jest
- Test environment: node

## Styling

- Tailwind CSS utility classes throughout
- `cn()` helper from `lib/utils.ts` (clsx + tailwind-merge)
- shadcn/ui components from `components/ui/` (Radix primitives)
- Dark mode support via next-themes (class-based toggle)
- Color-coded role badges: ADMIN=red, MANAGER=blue, default=gray
- Status badges with variant colors
- Custom CSS variables for theming (primary, secondary, destructive, muted, accent, sidebar, etc.)
