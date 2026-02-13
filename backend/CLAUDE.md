# Backend — NestJS REST API

## Overview
Enterprise asset management REST API built with NestJS 10, Prisma 5, and PostgreSQL 15.

## Entry Point
`src/main.ts` — starts HTTP server on port 3001 (configurable via `PORT` env).
- API prefix: `/v1` (all routes under `/v1/*`)
- Swagger docs: `/api/docs`
- CORS: allows `FRONTEND_URL` + localhost:3000 in dev, credentials enabled

## Running
```bash
npm run dev              # from backend/ — starts with --watch
npm run dev:backend      # from root — same via workspace
npm run build            # compile to dist/
npm run start:prod       # run compiled output
```

## Database
```bash
npm run migrate          # prisma migrate dev
npm run migrate:deploy   # prisma migrate deploy (production)
npm run seed             # ts-node prisma/seeds/seed.ts
npm run studio           # prisma studio GUI
npm run generate         # prisma generate client
```

## Module Overview

| Module | Controller | Service | Key Responsibilities |
|--------|-----------|---------|---------------------|
| auth | auth.controller.ts | auth.service.ts | Login, register, JWT, MFA, password reset |
| users | users.controller.ts | users.service.ts | User CRUD, role assignment, change password |
| roles | roles.controller.ts | roles.service.ts | Role definitions and CRUD |
| permissions | permissions.controller.ts | permissions.service.ts | Permission CRUD |
| assets | assets.controller.ts | assets.service.ts | Asset lifecycle, depreciation, statistics |
| assignments | assignments.controller.ts | assignments.service.ts | Assign/return workflow with conditions |
| transfers | transfers.controller.ts | transfers.service.ts | Dual-approval transfer workflow |
| categories | categories.controller.ts | categories.service.ts | Asset categories with depreciation config |
| vendors | vendors.controller.ts | vendors.service.ts | Vendor/supplier management |
| locations | locations.controller.ts | locations.service.ts | Physical locations with geo |
| departments | departments.controller.ts | departments.service.ts | Org hierarchy |
| tags | tags.controller.ts | tags.service.ts | QR code + barcode generation |
| audit-logs | audit-logs.controller.ts | audit-logs.service.ts | Query audit logs |
| notifications | notifications.controller.ts | notifications.service.ts | In-app + email + Slack |
| reports | reports.controller.ts | reports.service.ts | CSV/XLSX/PDF export |
| prisma | — | prisma.service.ts | Database access (PrismaClient wrapper) |

## Global Middleware (applied in main.ts + app.module.ts)
1. **Helmet** — security headers
2. **ThrottlerModule** — rate limiting (10 requests per 60 seconds)
3. **ValidationPipe** — whitelist, forbidNonWhitelisted, transform with implicit conversion
4. **AuditLogInterceptor** — global APP_INTERCEPTOR, logs all mutating requests

## Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | — | PostgreSQL connection string |
| JWT_SECRET | Yes | — | Access token signing secret |
| JWT_REFRESH_SECRET | Yes | — | Refresh token signing secret |
| JWT_EXPIRATION | No | 15m | Access token TTL |
| JWT_REFRESH_EXPIRATION | No | 7d | Refresh token TTL |
| PORT | No | 3001 | Server port |
| API_PREFIX | No | v1 | Route prefix |
| FRONTEND_URL | No | http://localhost:3000 | Allowed CORS origin |
| RESEND_API_KEY | No | — | Email notification (stubbed) |
| SLACK_WEBHOOK_URL | No | — | Slack notification (stubbed) |
| FROM_EMAIL | No | noreply@assetapp.com | Sender email |
