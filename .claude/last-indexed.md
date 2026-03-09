# Last Indexed

- **Date**: 2026-03-09
- **Branch**: main
- **SHA**: `3169711` (feat: Add prisma seed configuration to package.json)

## Scope

| Area | Count |
|------|-------|
| Backend modules | 18 (auth, users, roles, permissions, assets, assignments, transfers, categories, vendors, locations, departments, tags, audit-logs, notifications, reports, prisma, organizations, platform, common) |
| Frontend pages | 18+ (login, register, forgot-password, reset-password, accept-invitation, dashboard, assets, assets/[id], assignments, transfers, categories, vendors, locations, departments, users, settings, settings/invitations, notifications, tags) |
| Prisma models | 19 (Organization, OrgInvitation, User, Role, Permission, UserRole, RolePermission, RefreshToken, MfaSecret, PasswordResetToken, Department, Category, Vendor, Location, Asset, AssetAssignment, AssetTransfer, AuditLog, Notification) |
| Enums | 4 (AssetStatus, Condition, TransferStatus, NotificationChannel) |
| Frontend lib files | 6 (api-client, api-hooks, auth-context, permissions, utils, password-validation) |
| UI components | 10+ (dialog, select, tabs, textarea, badge, button, card, input, label, avatar, plus custom: data-table, stat-card, empty-state, access-denied, org-switcher, page-header, pagination, confirm-dialog) |
| API controllers | 17 (119+ endpoints) |

## What Was Indexed
- Every backend controller, service, DTO, guard, strategy, decorator, module, and interceptor
- Every frontend page component, library file, and UI component
- Full Prisma schema with all 19 models, 4 enums, relations, and indexes
- Root package.json, docker-compose.yml, and infrastructure config
- Auth flow (JWT, MFA, password reset, registration, invitation acceptance, token refresh)
- Multi-tenancy flow (TenantInterceptor, CLS context, Prisma middleware auto-filtering)
- Organization management (CRUD, branding/logo, invitation system)
- Platform admin (cross-tenant management, org switching via X-Org-Id)
- All API endpoints with auth requirements and role restrictions
- Frontend RBAC (usePermissions hook with 15+ permission flags)

## Known Uncertainties
1. **bull/ioredis**: Declared in deps but unused in codebase — no queue processing active
2. **Email/Slack**: Resend + Slack webhook integrations are stubbed (log-only in service)
3. **Notification auto-trigger**: Helper methods exist but not called from assignment/transfer services
4. **shared workspace**: Declared in root package.json but directory is empty
5. **Reset password page**: Route exists in frontend but implementation status unverified
