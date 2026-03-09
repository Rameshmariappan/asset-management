# Frontend Libraries (`src/lib/`)

Shared infrastructure for API communication, authentication, permissions, and utilities.

---

## api-client.ts — Axios HTTP Client

Singleton `ApiClient` class providing a configured Axios instance.

**Configuration:**
- Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/v1`)
- `withCredentials: true` (sends cookies for refresh token)
- Content-Type: `application/json`

**Request Interceptor:**
- Reads `accessToken` from JS cookie
- Attaches `Authorization: Bearer {token}` header
- Platform admin: reads `selectedOrgId` from sessionStorage → attaches `X-Org-Id` header

**Response Interceptor (401 Token Refresh):**
- On 401, if not already refreshing:
  1. Set `isRefreshing = true`
  2. Call `POST /auth/refresh` (withCredentials — sends httpOnly refresh_token cookie)
  3. On success: update accessToken cookie (15min expiry), retry original + all queued requests
  4. On failure: clear cookie, redirect to `/auth/login`
- On 401 while already refreshing:
  - Queue the request (Promise-based) → resolved when refresh completes
- `_retry` flag on request config prevents infinite loops

---

## api-hooks.ts — TanStack Query Hooks

~45+ hooks covering all entities. Pattern:

**Queries** (`useQuery`):
- `useAssets(params)`, `useAsset(id)`, `useAssetStatistics()`, `useAssetHistory(id)`
- `useAssignments(params)`, `useAssignmentStatistics()`, `useActiveAssignments()`
- `useTransfers(params)`, `useTransferStatistics()`, `usePendingTransfers()`
- `useUsers(params)`, `useUser(id)`
- `useNotifications(params)`, `useUnreadNotificationCount()`
- `useAuditLogs(params)`
- `useCategories()`, `useVendors()`, `useLocations()`, `useDepartments()`, `useRoles()`
- `useOrganization()`, `useInvitations()`

**Mutations** (`useMutation`):
- CRUD: `useCreate<Entity>()`, `useUpdate<Entity>()`, `useDelete<Entity>()`
- Assignments: `useCreateAssignment()`, `useReturnAsset()`
- Transfers: `useCreateTransfer()`, `useApproveTransferByManager()`, `useApproveTransferByAdmin()`, `useRejectTransfer()`
- Notifications: `useMarkNotificationAsRead()`, `useMarkAllNotificationsAsRead()`
- Tags: `useGenerateQRCode()`, `useGenerateBarcode()`, `useGenerateBothTags()`
- Auth: `useForgotPassword()`, `useResetPassword()`, `useChangePassword()`, `useUpdateAssetStatus()`
- Organization: `useUpdateOrganization()`, `useUploadOrganizationLogo()`, `useDeleteOrganizationLogo()`
- Invitations: `useCreateInvitation()`, `useDeleteInvitation()`

**Configuration:**
- `staleTime`: 30s for assets/users/master data, 60s default
- `retry`: 2 for most queries
- Unread notification count: `refetchInterval: 30000` (every 30s)
- Mutations: `onSuccess` calls `queryClient.invalidateQueries()` for related keys

---

## auth-context.tsx — Authentication State

React Context providing auth state and methods to all components.

**State:**
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login(email, password, mfaCode?): Promise<{requiresMfa?: boolean}>;
  register(data): Promise<void>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
  updateOrganizationData(data: {name?, logoUrl?}): void;
}
```

**User shape:**
```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<{id, name, displayName, description}> | string[];
  department?: {id, name, code};
  departmentId?: string;
  isMfaEnabled: boolean;
  tenantId?: string;
  isPlatformAdmin?: boolean;
  organization?: {id, name, slug, logoUrl, isActive};
}
```

**Lifecycle:**
1. On mount: `checkAuth()` calls `GET /auth/me` → sets user or clears state
2. Login: `POST /auth/login` → stores accessToken cookie (15min) → sets user
3. Register: `POST /auth/register` → redirects to login (no auto-login)
4. Logout: `POST /auth/logout` → removes cookie → clears user → redirects to `/auth/login`
5. Handles both `response.data.user` and `response.data` formats for backward compatibility
6. `updateOrganizationData()`: locally patches user.organization without re-fetching

---

## permissions.ts — Role-Based Access Control

`usePermissions()` hook providing boolean flags for UI-level RBAC.

**Role Constants:**
- `SUPER_ADMIN`, `ASSET_MANAGER`, `DEPT_HEAD`, `EMPLOYEE`, `AUDITOR`

**Permission Flags (~15+):**
```typescript
{
  isSuperAdmin: boolean;
  isAssetManager: boolean;
  isDeptHead: boolean;
  isEmployee: boolean;
  isAuditor: boolean;
  canManageAssets: boolean;       // SUPER_ADMIN | ASSET_MANAGER
  canCreateAssignment: boolean;   // SUPER_ADMIN | ASSET_MANAGER
  canApproveTransferAsManager: boolean;  // SUPER_ADMIN | DEPT_HEAD
  canApproveTransferAsAdmin: boolean;    // SUPER_ADMIN | ASSET_MANAGER
  canManageMasterData: boolean;   // SUPER_ADMIN | ASSET_MANAGER
  canManageUsers: boolean;        // SUPER_ADMIN | ASSET_MANAGER
  canViewAuditLogs: boolean;      // SUPER_ADMIN | AUDITOR
  canViewReports: boolean;        // SUPER_ADMIN | ASSET_MANAGER | AUDITOR
  canSwitchOrgs: boolean;         // isPlatformAdmin only
  // ... more flags
}
```

**Usage pattern:**
```typescript
const { canManageAssets, canSwitchOrgs } = usePermissions();
if (!canManageAssets) return <AccessDenied />;
```

---

## utils.ts — Utility Functions

| Function | Signature | Output |
|----------|-----------|--------|
| `cn()` | `(...inputs: ClassValue[]) => string` | Merged Tailwind classes (clsx + tailwind-merge) |
| `formatDate()` | `(date: string \| Date) => string` | `"Jan 1, 2024"` |
| `formatCurrency()` | `(amount: number, currency?: string) => string` | `"$1,234.56"` |
| `formatDateTime()` | `(date: string \| Date) => string` | `"Jan 1, 2024, 02:30 PM"` |

---

## password-validation.ts — Password Rules

| Function | Returns | Description |
|----------|---------|-------------|
| `validatePassword(pw)` | `{isValid, errors[]}` | Checks all requirements |
| `getPasswordStrength(pw)` | `'weak'\|'fair'\|'good'\|'strong'` | Visual strength indicator |
| `getPasswordRequirementsText()` | `string` | Display text for forms |

**Requirements:**
- Length: 8-32 characters
- Must contain: lowercase, uppercase, digit, special character (`@$!%*?&`)
