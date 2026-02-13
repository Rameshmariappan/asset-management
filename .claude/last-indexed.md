# Last Indexed

- **Date**: 2026-02-13
- **Branch**: main
- **SHA**: `0279b6ba6ea5ea4338154cccf7e51d8c235ec87e`

## Scope

| Area | Count |
|------|-------|
| Backend modules | 16 (auth, users, roles, permissions, assets, assignments, transfers, categories, vendors, locations, departments, tags, audit-logs, notifications, reports, prisma) |
| Frontend pages | 15+ (login, forgot-password, reset-password, dashboard, assets, assets/[id], assignments, transfers, categories, vendors, locations, departments, users, settings, notifications) |
| Prisma models | 17 (User, Role, Permission, UserRole, RolePermission, RefreshToken, MfaSecret, PasswordResetToken, Department, Category, Vendor, Location, Asset, AssetAssignment, AssetTransfer, AuditLog, Notification) |
| Enums | 4 (AssetStatus, Condition, TransferStatus, NotificationChannel) |
| Frontend lib files | 5 (api-client, api-hooks, auth-context, utils, password-validation) |
| UI components | 4+ (dialog, select, tabs, textarea, plus shadcn defaults) |

## What Was Indexed
- Every backend controller, service, DTO, guard, strategy, decorator, module, and interceptor
- Every frontend page component, library file, and UI component
- Full Prisma schema with all models, enums, relations, and indexes
- Root package.json, docker-compose.yml, and infrastructure config
- Auth flow (JWT, MFA, password reset, token refresh)
- All API endpoints with auth requirements and role restrictions

## Known Uncertainties
1. **Partial unique index SQL**: Migrations are gitignored — exact index SQL unverified
2. **bull/ioredis**: Declared in deps but unused in codebase
3. **Email/Slack**: Resend + Slack webhook integrations are stubbed (log-only)
4. **Notification auto-trigger**: Helper methods exist but not called from assignment/transfer services
5. **Tags/Reports frontend pages**: Referenced in sidebar but no dedicated page components
6. **shared workspace**: Declared in root package.json but directory doesn't exist
