# Database Schema

PostgreSQL 15 via Prisma 5. All IDs are UUIDs. Schema file: `backend/prisma/schema.prisma`.

---

## Enums

```
AssetStatus:        available | assigned | maintenance | damaged | retired
Condition:          Excellent | Good | Fair | Poor | Damaged
TransferStatus:     pending | manager_approved | admin_approved | rejected | completed
NotificationChannel: in_app | email | slack
```

---

## Models by Group

### Multi-Tenancy

**Organization** (`organizations`)
- `id` UUID PK, `name` VARCHAR(200), `slug` VARCHAR(100) UNIQUE
- `logoUrl` TEXT nullable, `isActive` (default true)
- `createdAt`, `updatedAt`
- Relations: users, departments, categories, vendors, locations, assets, invitations

**OrgInvitation** (`org_invitations`)
- `id` UUID PK, `organizationId` FK → Organization, `email` VARCHAR(255)
- `roleName` VARCHAR(50), `tokenHash` VARCHAR(255) UNIQUE
- `invitedByUserId` FK → User, `expiresAt`, `acceptedAt` nullable
- `createdAt`
- Indexes: organizationId, tokenHash
- Relations: organization, invitedBy (User)

### Auth & Authorization

**User** (`users`)
- `id` UUID PK, `email` VARCHAR(255), `passwordHash` VARCHAR(255) nullable
- `firstName`, `lastName`, `phone`, `avatarUrl`, `isActive` (default true), `isMfaEnabled` (default false)
- `isPlatformAdmin` (default false) — cross-tenant admin flag
- `emailVerifiedAt`, `departmentId` FK, `managerId` FK (self-ref), `tenantId` FK → Organization nullable
- `createdAt`, `updatedAt`, `deletedAt` (soft delete)
- Indexes: email, tenantId, departmentId, isActive
- Relations: organization, department, manager, subordinates, userRoles, refreshTokens, passwordResetTokens, mfaSecret, assignments (3 relations), transfers (6 relations), auditLogs, notifications, departmentsHeaded, invitedInvitations

**Role** (`roles`)
- `id`, `name` VARCHAR(50) UNIQUE, `displayName`, `description`, `tenantId`
- Defined roles: SUPER_ADMIN, ASSET_MANAGER, DEPARTMENT_HEAD, EMPLOYEE, AUDITOR
- Note: PLATFORM_ADMIN is not a role — it's the `isPlatformAdmin` flag on User

**Permission** (`permissions`)
- `id`, `resource` VARCHAR(50), `action` VARCHAR(20), `description`
- Unique constraint: `(resource, action)`

**UserRole** (`user_roles`)
- Composite PK: `(userId, roleId)`, `assignedAt`, `assignedBy`
- Cascade delete on User or Role deletion

**RolePermission** (`role_permissions`)
- Composite PK: `(roleId, permissionId)`
- Cascade delete on Role or Permission deletion

**RefreshToken** (`refresh_tokens`)
- `id`, `tokenHash` VARCHAR(255) UNIQUE, `userId` FK, `expiresAt`, `revokedAt`
- `ipAddress`, `userAgent`
- Indexes: userId, tokenHash, expiresAt

**MfaSecret** (`mfa_secrets`)
- `id`, `userId` UNIQUE FK, `secret`, `backupCodes` JSONB, `verifiedAt`

**PasswordResetToken** (`password_reset_tokens`)
- `id`, `tokenHash` UNIQUE, `userId` FK, `expiresAt`, `usedAt`
- Indexes: userId, tokenHash

### Organization Structure

**Department** (`departments`)
- `id`, `name`, `code` UNIQUE, `parentId` FK (self-ref hierarchy), `headUserId` FK, `tenantId`
- Relations: parent, children, headUser, users

**Category** (`categories`)
- `id`, `name`, `code` UNIQUE, `description`, `icon`
- `depreciationRate` DECIMAL(5,2), `usefulLifeYears` INT
- `parentId` FK (self-ref hierarchy), `tenantId`
- Relations: parent, children, assets

**Vendor** (`vendors`)
- `id`, `name`, `code` UNIQUE, `email`, `phone`, `website`, `address`
- `contactPerson`, `taxId`, `isActive` (default true), `tenantId`

**Location** (`locations`)
- `id`, `name`, `code` UNIQUE, `type` (office/warehouse/remote/data_center/branch/other)
- Address: `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`
- Geo: `latitude` DECIMAL(10,7), `longitude` DECIMAL(10,7)
- `parentId` FK (self-ref hierarchy), `tenantId`

### Assets

**Asset** (`assets`)
- `id`, `assetTag` UNIQUE, `serialNumber` UNIQUE nullable
- `name`, `description`, `model`, `manufacturer`
- FKs: `categoryId`, `vendorId`, `locationId`
- `status` AssetStatus enum
- Financial: `purchaseDate` DATE, `purchaseCost` DECIMAL(12,2), `currency` (default "USD"), `salvageValue`, `currentValue`
- Warranty: `warrantyEndDate` DATE, `warrantyDetails`
- Docs: `invoiceNumber`, `invoiceUrl`, `imageUrls` JSONB, `qrCodeUrl`, `barcodeUrl`
- `customFields` JSONB, `notes`, `tenantId`, `deletedAt` (soft delete)
- Indexes: assetTag, serialNumber, categoryId, vendorId, locationId, status, tenantId, warrantyEndDate

### Assignments & Transfers

**AssetAssignment** (`asset_assignments`)
- `id`, `assetId` FK, `assignedToUserId` FK, `assignedByUserId` FK
- `assignedAt`, `expectedReturnDate`, `returnedAt`, `returnedToUserId` FK
- Assign: `assignCondition` Condition enum, `assignConditionRating` INT, `assignPhotoUrls` JSONB, `assignNotes`, `assignSignatureUrl`, `assignSignatureHash`
- Return: `returnCondition`, `returnConditionRating`, `returnPhotoUrls`, `returnNotes`, `returnSignatureUrl`, `returnSignatureHash`
- `isActive` (default true), `tenantId`
- Indexes: assetId, assignedToUserId, isActive, tenantId

**AssetTransfer** (`asset_transfers`)
- `id`, `assetId` FK, `fromUserId` FK nullable, `toUserId` FK, `requestedByUserId` FK
- `transferReason`, `status` TransferStatus enum
- `requestedAt` (default now)
- Manager: `managerApproverId` FK, `managerApprovedAt`, `managerNotes`
- Admin: `adminApproverId` FK, `adminApprovedAt`, `adminNotes`
- Rejection: `rejectedByUserId` FK, `rejectedAt`, `rejectionReason`
- `completedAt`, `tenantId`
- Indexes: assetId, fromUserId, toUserId, status, tenantId

### Audit & Notifications

**AuditLog** (`audit_logs`)
- `id`, `entityType` VARCHAR(50), `entityId` UUID, `action` VARCHAR(50)
- `userId` FK nullable, `changes` JSONB, `ipAddress`, `userAgent`, `tenantId`
- `createdAt` (no updatedAt — immutable)
- Indexes: entityType, entityId, userId, createdAt, tenantId

**Notification** (`notifications`)
- `id`, `userId` FK, `type`, `title`, `message`, `data` JSONB
- `isRead` (default false), `readAt`, `channel` NotificationChannel enum, `sentAt`
- `tenantId`, `createdAt`
- Indexes: userId, isRead, createdAt, tenantId
- Cascade delete on User deletion

---

## Key Patterns

**Soft Delete**: User and Asset have `deletedAt`. All queries filter `deletedAt: null`.

**Partial Unique Index**: Email uniqueness enforced WHERE `deleted_at IS NULL` (via migration, not visible in schema.prisma).

**Multi-Tenant Active**: Most models have `tenantId` FK → Organization. Auto-filtered by Prisma middleware via TenantContextService (CLS). 10 models are tenant-scoped: User, Department, Category, Vendor, Location, Asset, AssetAssignment, AssetTransfer, AuditLog, Notification.

**Self-Referential Hierarchies**: Department, Category, Location each have `parentId` → self for tree structures.

**JSONB Fields**: customFields (Asset), imageUrls (Asset), assignPhotoUrls/returnPhotoUrls (Assignment), backupCodes (MfaSecret), changes (AuditLog), data (Notification).

**Column Mapping**: All camelCase fields map to snake_case DB columns via `@map()`. All table names mapped via `@@map()`.

**Token Hashing**: RefreshToken.tokenHash and PasswordResetToken.tokenHash store SHA256 hashes, not raw tokens. OrgInvitation.tokenHash also stores hashed token.
