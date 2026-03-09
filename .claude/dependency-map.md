# Dependency Map

## Workspace Structure
```
asset-tracking-system (root)
├── backend/        npm workspace — NestJS API
├── frontend/       npm workspace — Next.js SPA
└── shared/         npm workspace — declared but empty (future shared types)
```

Package manager: npm workspaces. Root scripts use `--workspace=` to target workspaces.

---

## Backend Module Dependencies

```
AppModule
├── ConfigModule (global)
├── ClsModule (nestjs-cls — request-scoped tenant context)
├── ServeStaticModule (serves /uploads directory)
├── ThrottlerModule (10 req/60s)
├── CommonModule (TenantContextService)
├── PrismaModule ◄── ALL other modules depend on this
├── AuthModule
│   ├── JwtModule
│   ├── PassportModule
│   └── ConfigModule (JWT secrets)
├── UsersModule
├── RolesModule
├── PermissionsModule
├── AssetsModule
├── AssignmentsModule ──► updates Asset.status via Prisma
├── TransfersModule ──► creates AssetAssignment + updates Asset.status via Prisma
├── CategoriesModule
├── VendorsModule
├── LocationsModule
├── DepartmentsModule
├── AuditLogsModule
├── NotificationsModule (standalone, has helper methods but not auto-called)
├── TagsModule
├── ReportsModule ──► queries assets, assignments, transfers, users, audit_logs
├── OrganizationsModule ──► manages orgs + invitations (OrgInvitation model)
├── PlatformModule ──► cross-tenant org management (PlatformAdmin only)
├── APP_INTERCEPTOR: TenantInterceptor (from CommonModule)
└── APP_INTERCEPTOR: AuditLogInterceptor (from AuditLogsModule)
```

### Cross-Module Data Access
- Modules don't import each other; they share data through **Prisma directly**
- `TransfersService.approveByAdmin()` creates `AssetAssignment` records and updates `Asset` in a transaction
- `AssignmentsService` creates/updates `AssetAssignment` + `Asset` in transactions
- `ReportsService` queries 5 different Prisma models for report generation
- `AuthService` creates `Organization`, `User`, `UserRole`, `RefreshToken`, `MfaSecret`, `PasswordResetToken`, `OrgInvitation`
- `OrganizationsService` manages `Organization` + `OrgInvitation` records
- `PrismaService` middleware auto-filters all tenant-scoped queries by tenantId from CLS context

### Shared Auth Infrastructure
All controllers (except @Public routes) use guards from `auth/`:
- `JwtAuthGuard` (from `auth/guards/jwt-auth.guard.ts`)
- `RolesGuard` (from `auth/guards/roles.guard.ts`)
- `PlatformAdminGuard` (from `auth/guards/platform-admin.guard.ts`)
- `@Roles()` decorator (from `auth/decorators/roles.decorator.ts`)
- `@CurrentUser()` decorator (from `auth/decorators/current-user.decorator.ts`)
- `@PlatformAdmin()` decorator (from `auth/decorators/platform-admin.decorator.ts`)

---

## Frontend Internal Dependencies

```
app/layout.tsx
└── components/providers.tsx
    ├── @tanstack/react-query (QueryClientProvider)
    ├── lib/auth-context.tsx (AuthProvider)
    └── components/theme-provider.tsx (ThemeProvider)

app/dashboard/layout.tsx
├── lib/auth-context.tsx (useAuth — checks user, redirects if not logged in)
└── components/sidebar.tsx (navigation, role-based visibility via usePermissions)

All dashboard pages
├── lib/api-hooks.ts (TanStack Query hooks)
│   └── lib/api-client.ts (Axios singleton + X-Org-Id header)
├── lib/auth-context.tsx (useAuth)
├── lib/permissions.ts (usePermissions — role-based access flags)
├── components/data-table.tsx (reusable table)
├── components/page-header.tsx (reusable header)
├── components/stat-card.tsx (stat display)
└── components/ui/* (shadcn components)

Auth pages
├── lib/auth-context.tsx (login/register)
├── lib/api-hooks.ts (forgot-password, reset-password, accept-invitation mutations)
└── lib/password-validation.ts (password rules)

Platform admin features
├── components/org-switcher.tsx (org selection → sessionStorage)
└── lib/api-client.ts (reads X-Org-Id from sessionStorage)

lib/utils.ts ◄── used by ALL components (cn, formatDate, formatCurrency, formatDateTime)
```

---

## Key npm Dependencies

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| @nestjs/* | 10.x | Framework |
| @prisma/client | 5.x | Database ORM |
| nestjs-cls | 6.x | Request-scoped context (multi-tenancy) |
| passport-jwt | 4.x | JWT authentication strategy |
| bcrypt | 5.x | Password hashing |
| speakeasy | 2.x | TOTP MFA |
| exceljs | 4.x | XLSX report generation |
| pdfkit | 0.14 | PDF report generation |
| qrcode | 1.5 | QR code generation |
| bwip-js | 4.x | Barcode generation |
| resend | 3.x | Email notifications (stubbed) |
| bull | 4.x | Job queue (declared, unused) |
| ioredis | 5.x | Redis client (declared, unused) |
| helmet | 7.x | Security headers |
| class-validator | 0.14 | DTO validation |
| dayjs | 1.11 | Date manipulation |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2 | React framework |
| react | 18.3 | UI library |
| @tanstack/react-query | 5.28 | Server state management |
| axios | 1.6 | HTTP client |
| zod | 3.22 | Schema validation |
| react-hook-form | 7.51 | Form management |
| recharts | 2.12 | Dashboard charts |
| sonner | 1.4 | Toast notifications |
| js-cookie | 3.x | Cookie management |
| @radix-ui/* | various | UI primitives (dialog, select, tabs, etc.) |
| lucide-react | 0.363 | Icons |
| tailwind-merge | 2.2 | Class merging |
| date-fns | 3.6 | Date formatting |
| next-themes | 0.4 | Dark mode support |
| qrcode.react | 3.1 | QR code rendering |
| class-variance-authority | 0.7 | Component variant styling |

---

## Cross-Boundary Communication
- Frontend → Backend: HTTP only (REST API via Axios)
- No shared types between frontend and backend (planned via `shared/` workspace)
- No WebSocket/SSE connections
- No circular dependencies detected in either workspace
- Platform admin org switching: frontend sends `X-Org-Id` header, backend TenantInterceptor reads it
