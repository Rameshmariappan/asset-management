# Asset Management System

Enterprise asset tracking monorepo: **NestJS backend** + **Next.js frontend** + **PostgreSQL/Redis** infrastructure.

## Workspace Structure
- `backend/` — NestJS 10 REST API (port 3001, prefix `/v1`, Swagger at `/api/docs`)
- `frontend/` — Next.js 14 App Router SPA (port 3000)
- `shared/` — Declared but empty (future shared types)
- Infrastructure: Docker Compose with PostgreSQL 15 + Redis 7

## Running
- `npm run dev` — starts both backend and frontend concurrently
- `npm run docker:dev` — starts PostgreSQL + Redis containers
- `npm run prisma:migrate` — run Prisma migrations

## Backend Modules (16)
| Module | Purpose |
|--------|---------|
| `auth` | JWT + MFA login, password reset, token refresh |
| `users` | User CRUD, role assignment, password change |
| `roles` | Role definitions (SUPER_ADMIN, ASSET_MANAGER, DEPARTMENT_HEAD, EMPLOYEE, AUDITOR) |
| `permissions` | Resource + action permission pairs |
| `assets` | Asset lifecycle CRUD with depreciation calc |
| `assignments` | Asset assign/return with condition tracking |
| `transfers` | Dual-approval (manager → admin) transfer workflow |
| `categories` | Asset categories with depreciation config |
| `vendors` | Vendor/supplier management |
| `locations` | Physical locations with geo coordinates |
| `departments` | Org hierarchy with head user |
| `tags` | QR code + barcode generation (qrcode, bwip-js) |
| `audit-logs` | Change tracking via global interceptor |
| `notifications` | In-app + email (Resend) + Slack notifications |
| `reports` | Export CSV/XLSX/PDF for all entities |
| `prisma` | Database access layer (PrismaService) |

## Frontend Routes
- `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`
- `/dashboard` — stats overview with charts
- `/dashboard/assets`, `/dashboard/assets/[id]` — asset CRUD + detail view
- `/dashboard/assignments`, `/dashboard/transfers` — workflow pages
- `/dashboard/categories`, `/dashboard/vendors`, `/dashboard/locations`, `/dashboard/departments` — master data
- `/dashboard/users`, `/dashboard/settings`, `/dashboard/notifications`

## Key Architecture Decisions
- **Auth**: JWT (15min access + 7d refresh in httpOnly cookie) with optional TOTP MFA
- **RBAC**: 5 roles enforced via `@Roles()` decorator + RolesGuard
- **Soft delete**: User and Asset models use `deletedAt` field
- **Transfers**: Dual-approval — pending → manager_approved → admin completes (transactional)
- **Audit**: Global `AuditLogInterceptor` logs all POST/PATCH/DELETE (fire-and-forget)
- **Frontend auth**: Axios interceptor with request-queue token refresh on 401
- **State**: TanStack Query (server), React Context (auth), useState (UI)

## Detailed Documentation
- [Architecture](.claude/architecture.md) — backend/frontend structure, system diagram
- [Data Flow](.claude/data-flow.md) — auth flow, entity lifecycles, audit/notification flow
- [Conventions](.claude/conventions.md) — naming, error handling, validation, styling
- [Dependencies](.claude/dependency-map.md) — module deps, npm packages, cross-boundary
- [Database](.claude/database.md) — all 17 models, enums, relationships, indexes
- [API Endpoints](.claude/api-endpoints.md) — complete REST API reference
- [Last Indexed](.claude/last-indexed.md) — when this knowledge base was last updated
