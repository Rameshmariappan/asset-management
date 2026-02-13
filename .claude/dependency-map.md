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
├── ThrottlerModule (10 req/60s)
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
└── APP_INTERCEPTOR: AuditLogInterceptor (from AuditLogsModule)
```

### Cross-Module Data Access
- Modules don't import each other; they share data through **Prisma directly**
- `TransfersService.approveByAdmin()` creates `AssetAssignment` records and updates `Asset` in a transaction
- `AssignmentsService` creates/updates `AssetAssignment` + `Asset` in transactions
- `ReportsService` queries 5 different Prisma models for report generation
- `AuthService` creates `User`, `UserRole`, `RefreshToken`, `MfaSecret`, `PasswordResetToken`

### Shared Auth Infrastructure
All controllers (except @Public routes) use guards from `auth/`:
- `JwtAuthGuard` (from `auth/guards/jwt-auth.guard.ts`)
- `RolesGuard` (from `auth/guards/roles.guard.ts`)
- `@Roles()` decorator (from `auth/decorators/roles.decorator.ts`)
- `@CurrentUser()` decorator (from `auth/decorators/current-user.decorator.ts`)

---

## Frontend Internal Dependencies

```
app/layout.tsx
└── components/providers.tsx
    ├── @tanstack/react-query (QueryClientProvider)
    └── lib/auth-context.tsx (AuthProvider)

app/dashboard/layout.tsx
├── lib/auth-context.tsx (useAuth — checks user, redirects if not logged in)
└── components/sidebar.tsx (navigation)

All dashboard pages
├── lib/api-hooks.ts (TanStack Query hooks)
│   └── lib/api-client.ts (Axios singleton)
├── lib/auth-context.tsx (useAuth)
└── components/ui/* (shadcn components)

Auth pages
├── lib/auth-context.tsx (login/register)
├── lib/api-hooks.ts (forgot-password, reset-password mutations)
└── lib/password-validation.ts (password rules)

lib/utils.ts ◄── used by ALL components (cn, formatDate, formatCurrency, formatDateTime)
```

---

## Key npm Dependencies

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| @nestjs/* | 10.x | Framework |
| @prisma/client | 5.x | Database ORM |
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

---

## Cross-Boundary Communication
- Frontend → Backend: HTTP only (REST API via Axios)
- No shared types between frontend and backend (planned via `shared/` workspace)
- No WebSocket/SSE connections
- No circular dependencies detected in either workspace
