'use client'

import { useAuth } from './auth-context'

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ASSET_MANAGER: 'ASSET_MANAGER',
  DEPT_HEAD: 'DEPT_HEAD',
  EMPLOYEE: 'EMPLOYEE',
  AUDITOR: 'AUDITOR',
} as const

export type RoleName = (typeof ROLES)[keyof typeof ROLES]

export function usePermissions() {
  const { user } = useAuth()

  // Handle both formats: login returns string[], GET /me returns { name }[]
  const userRoleNames = user?.roles?.map((r: any) => typeof r === 'string' ? r : r.name) ?? []

  const hasRole = (...roles: RoleName[]): boolean =>
    roles.some((r) => userRoleNames.includes(r))

  const isAdmin = hasRole(ROLES.SUPER_ADMIN)
  const isAdminOrManager = hasRole(ROLES.SUPER_ADMIN, ROLES.ASSET_MANAGER)

  return {
    hasRole,
    userRoleNames,

    // Users
    canManageUsers: isAdmin,
    canEditUsers: isAdminOrManager,
    canViewUserList: hasRole(ROLES.SUPER_ADMIN, ROLES.ASSET_MANAGER, ROLES.DEPT_HEAD),

    // Assets
    canManageAssets: isAdminOrManager,

    // Assignments
    canCreateAssignment: isAdminOrManager,
    canReturnAsset: isAdminOrManager,
    canViewAllAssignments: hasRole(ROLES.SUPER_ADMIN, ROLES.ASSET_MANAGER, ROLES.DEPT_HEAD, ROLES.AUDITOR),

    // Transfers
    canApproveTransferAsManager: hasRole(ROLES.SUPER_ADMIN, ROLES.DEPT_HEAD),
    canApproveTransferAsAdmin: hasRole(ROLES.SUPER_ADMIN, ROLES.ASSET_MANAGER),
    canRejectTransfer: hasRole(ROLES.SUPER_ADMIN, ROLES.ASSET_MANAGER, ROLES.DEPT_HEAD),
    canViewTransfers: hasRole(ROLES.SUPER_ADMIN, ROLES.ASSET_MANAGER, ROLES.DEPT_HEAD, ROLES.AUDITOR),

    // Master data (categories, vendors, locations, departments)
    canManageMasterData: isAdminOrManager,

    // Reports & Tags
    canViewReports: hasRole(ROLES.SUPER_ADMIN, ROLES.ASSET_MANAGER, ROLES.AUDITOR),
    canManageTags: isAdminOrManager,

    // Audit logs
    canViewAuditLogs: hasRole(ROLES.SUPER_ADMIN, ROLES.AUDITOR),

    // Roles
    canViewRoles: isAdminOrManager,

    // Convenience
    isAdmin,
    isAdminOrManager,
  }
}
