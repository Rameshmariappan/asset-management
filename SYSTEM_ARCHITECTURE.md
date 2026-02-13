# Asset Management System - Architecture & Data Flow

## Table of Contents

1. [Entity Relationships](#entity-relationships)
2. [Role-Based Access Control (RBAC)](#role-based-access-control)
3. [Page Interconnections](#page-interconnections)
4. [User Workflows](#user-workflows)
5. [API Endpoint Structure](#api-endpoint-structure)

---

## Entity Relationships

### Core Entity Diagram

```
┌─────────────┐
│   USERS     │◄──────────┐
└─────┬───────┘           │
      │ belongs to        │ has many
      ▼                   │
┌─────────────┐     ┌─────┴──────┐
│ DEPARTMENTS │     │ USER_ROLES │
└─────┬───────┘     └─────┬──────┘
      │                   │
      │ has many          │ references
      ▼                   ▼
┌─────────────┐     ┌──────────┐
│   USERS     │     │  ROLES   │
│  (employees)│     └─────┬────┘
└─────────────┘           │
                          │ has many
                          ▼
                    ┌────────────────┐
                    │ ROLE_PERMISSIONS│
                    └────────┬────────┘
                            │ references
                            ▼
                    ┌──────────────┐
                    │ PERMISSIONS  │
                    └──────────────┘

┌──────────┐
│  ASSETS  │
└────┬─────┘
     │ belongs to
     ├──────► CATEGORIES (depreciation rules)
     ├──────► VENDORS (supplier info)
     ├──────► LOCATIONS (where stored)
     └──────► DEPARTMENTS (ownership)

     │ has many
     ├──────► ASSET_ASSIGNMENTS (who uses it)
     ├──────► ASSET_TRANSFERS (movement history)
     └──────► AUDIT_LOGS (change history)
```

### Detailed Relationships

#### 1. **Users ↔ Departments**

- **Connection**: Each user belongs to ONE department
- **Field**: `user.departmentId` → `department.id`
- **Usage**:
  - Users page shows department name in user list
  - Department page shows how many users belong to it
  - Used for transfer approvals (department heads approve transfers)

#### 2. **Users ↔ Roles** (Many-to-Many)

- **Connection**: Through `user_roles` junction table
- **Fields**: `user.id` ↔ `user_roles.userId` & `user_roles.roleId` ↔ `role.id`
- **Usage**:
  - Users page assigns roles when creating/editing users
  - Roles determine what pages/actions users can access
  - One user can have multiple roles (though typically one)

#### 3. **Roles ↔ Permissions** (Many-to-Many)

- **Connection**: Through `role_permissions` junction table
- **Fields**: `role.id` ↔ `role_permissions.roleId` & `role_permissions.permissionId` ↔ `permission.id`
- **Usage**:
  - Each role has a set of permissions (e.g., `asset:create`, `user:read`)
  - Backend checks permissions before allowing actions
  - Seeded during database initialization

#### 4. **Assets ↔ Categories**

- **Connection**: Each asset belongs to ONE category
- **Field**: `asset.categoryId` → `category.id`
- **Usage**:
  - Assets page shows category in asset list
  - Categories define depreciation rules (rate, useful life)
  - Categories page shows asset count per category
  - **Example**: Laptop category with 20% depreciation/year, 5-year life

#### 5. **Assets ↔ Vendors**

- **Connection**: Each asset purchased from ONE vendor
- **Field**: `asset.vendorId` → `vendor.id`
- **Usage**:
  - Assets page shows vendor in asset details
  - Vendors page lists supplier contact info
  - Used for warranty claims and repurchases

#### 6. **Assets ↔ Locations**

- **Connection**: Each asset stored at ONE location
- **Field**: `asset.locationId` → `location.id`
- **Usage**:
  - Assets page shows current location
  - Locations page shows assets per location
  - Updated when asset is transferred
  - **Example**: Server in "Data Center - Rack A3"

#### 7. **Assets ↔ Departments**

- **Connection**: Each asset owned by ONE department
- **Field**: `asset.departmentId` → `department.id`
- **Usage**:
  - Departments page shows department's assets
  - Used for budgeting and asset allocation
  - Department heads can view their department's assets

#### 8. **Assets ↔ Assignments**

- **Connection**: One asset can have multiple assignments over time
- **Fields**: `assignment.assetId` → `asset.id` & `assignment.userId` → `user.id`
- **Usage**:
  - Assignments page creates new assignment (gives asset to user)
  - Tracks who is using which asset
  - Records condition, rating, expected return date
  - When returned, updates asset status back to "available"

#### 9. **Assets ↔ Transfers**

- **Connection**: One asset can be transferred multiple times
- **Fields**:
  - `transfer.assetId` → `asset.id`
  - `transfer.fromUserId` → `user.id` (current holder)
  - `transfer.toUserId` → `user.id` (new holder)
  - `transfer.requestedById` → `user.id` (who requested)
- **Usage**:
  - Transfers page creates transfer request
  - Requires TWO approvals:
    1. **Manager approval**: Department head must approve
    2. **Admin approval**: Asset manager must approve
  - Updates asset location and assignment when approved

---

## Role-Based Access Control (RBAC)

### 5 System Roles

#### 1. **SUPER_ADMIN** (All Permissions)

- **Full system access**
- Can manage users, roles, permissions
- Can perform all CRUD operations
- Can access audit logs and reports
- **Use Case**: System administrator

#### 2. **ASSET_MANAGER** (Asset Management)

**Permissions**:

- ✅ All asset operations (create, read, update, delete, assign)
- ✅ All assignment operations
- ✅ All transfer operations (create, approve, reject)
- ✅ Manage categories, vendors, locations
- ✅ View and export reports
- ❌ Cannot manage users or roles
- ❌ Cannot access audit logs

**Use Case**: IT department managing company assets

#### 3. **DEPT_HEAD** (Department Head)

**Permissions**:

- ✅ Read assets (own department)
- ✅ Read assignments (own department)
- ✅ Approve transfers (first approval level)
- ✅ View department reports
- ❌ Cannot create/edit assets
- ❌ Cannot manage users

**Use Case**: Department manager approving asset transfers

#### 4. **EMPLOYEE** (Regular User)

**Permissions**:

- ✅ Read assets (view only)
- ✅ Read own assignments only
- ✅ Create transfer requests (request to transfer asset to another user)
- ✅ View own notifications
- ❌ Cannot approve transfers
- ❌ Cannot assign assets
- ❌ Cannot manage any master data

**Use Case**: Regular employee using assigned assets

#### 5. **AUDITOR** (Read-Only Compliance)

**Permissions**:

- ✅ Read all audit logs
- ✅ Read all assets and assignments
- ✅ Export reports
- ❌ Cannot create, update, or delete anything

**Use Case**: Compliance officer reviewing asset history

### How Permissions are Checked

#### Backend (NestJS)

```typescript
// In backend/src/auth/guards/roles.guard.ts
@Roles('SUPER_ADMIN', 'ASSET_MANAGER')  // Decorator on controller method
@Post('assets')
createAsset() { ... }
```

#### Frontend (React)

```typescript
// In frontend/src/lib/auth-context.tsx
const { user } = useAuth()
const isAdmin = user?.roles?.includes('SUPER_ADMIN')
const canManageAssets = user?.roles?.some(r =>
  ['SUPER_ADMIN', 'ASSET_MANAGER'].includes(r)
)

// Conditionally render UI
{canManageAssets && <Button>Create Asset</Button>}
```

---

## Page Interconnections

### 1. **Users Page** → Other Pages

**Creates**:

- New user accounts with email/password
- Assigns user to a **Department** (dropdown populated from Departments API)
- Assigns user a **Role** (dropdown populated from Roles API)

**Connections**:

- `POST /users` creates user
- `GET /departments` fetches department options
- `GET /roles` fetches role options
- Created user appears in:
  - Assignments page (can be assigned assets)
  - Transfers page (can request/receive transfers)
  - Departments page (counted in department users)

---

### 2. **Assets Page** → Other Pages

**Creates**:

- New asset records with:
  - **Category** (dropdown: `GET /categories`)
  - **Vendor** (dropdown: `GET /vendors`)
  - **Location** (dropdown: `GET /locations`)
  - **Department** (dropdown: `GET /departments`)
  - Financial info (cost, depreciation calculated from category)

**Connections**:

- Asset appears in:
  - Assignments page (can assign to users)
  - Transfers page (can be transferred)
  - Categories page (counted in category's assets)
  - Asset detail page (click asset name → `/assets/[id]`)

**Asset Lifecycle**:

```
Created → Available → Assigned → In Use → Returned → Available
                   ↓
              Maintenance / Damaged / Retired
```

---

### 3. **Categories Page** → Assets Page

**Creates**:

- Asset categories with depreciation rules
  - Depreciation rate (% per year)
  - Useful life (years)
  - Icon for display

**Usage**:

- When creating an asset, category dropdown shows all categories
- Category's depreciation rate auto-calculates asset's current value
- **Example**:
  - Category: "Laptops" (20% depreciation, 5-year life)
  - Asset: MacBook Pro purchased for $2000 in 2024
  - Current value in 2025: $1600 (20% depreciated)

---

### 4. **Vendors Page** → Assets Page

**Creates**:

- Vendor/supplier records with:
  - Contact information (email, phone, website)
  - Address
  - Tax ID

**Usage**:

- Assets page vendor dropdown populated from vendors
- Vendor info shown on asset detail page
- Used for warranty claims and repurchases

---

### 5. **Locations Page** → Assets & Transfers

**Creates**:

- Physical locations with:
  - Type (office, warehouse, data center, branch, remote)
  - Full address
  - GPS coordinates

**Usage**:

- Assets page location dropdown
- Asset detail page shows current location
- Transfers update asset location when approved

---

### 6. **Departments Page** → Users, Assets, Transfers

**Creates**:

- Organizational departments
- Can have parent department (hierarchy)
- Can assign department head (user)

**Usage**:

- Users page: assign user to department
- Assets page: assign asset to department
- Transfers page: department heads approve transfers
- Shows department's users and assets count

**Hierarchy Example**:

```
IT Department (head: John Doe)
  ├── Software Development (head: Jane Smith)
  └── Infrastructure (head: Bob Johnson)
```

---

### 7. **Assignments Page** → Assets & Users

**What it does**:

- Assigns an available asset to a user
- Records condition, rating (1-5), expected return date
- Updates asset status from "available" → "assigned"

**Create Assignment Flow**:

```
1. Select Asset (filtered to show only "available" assets)
2. Select User (shows all active users)
3. Enter condition (Excellent/Good/Fair/Poor/Damaged)
4. Enter rating (1-5 stars)
5. Set expected return date
6. Add notes
7. Submit → Asset now "assigned" to user
```

**Return Asset Flow**:

```
1. Select active assignment
2. Enter return condition (may differ from issue condition)
3. Enter return rating
4. Add return notes
5. Submit → Asset status back to "available" (or "damaged" if poor condition)
```

**Connections**:

- `POST /assignments` creates assignment
- `PATCH /assignments/:id/return` returns asset
- Asset status automatically updated
- Audit log created for tracking

---

### 8. **Transfers Page** → Assets, Users, Departments

**What it does**:

- Transfers asset from one user to another
- Requires TWO approvals:
  1. **Manager approval** (department head)
  2. **Admin approval** (asset manager)

**Transfer Flow**:

```
┌─────────────────────────────────────────────────┐
│ 1. Employee creates transfer request            │
│    - Select asset currently assigned to them    │
│    - Select destination user                    │
│    - Provide reason for transfer                │
│    Status: PENDING_MANAGER_APPROVAL             │
└────────────────┬────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────┐
│ 2. Department Head reviews and approves         │
│    - Can approve or reject with notes           │
│    Status: PENDING_ADMIN_APPROVAL               │
└────────────────┬────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────┐
│ 3. Asset Manager reviews and approves           │
│    - Can approve or reject with notes           │
│    Status: APPROVED → Asset reassigned          │
│    - Asset location updated                     │
│    - Assignment record created for new user     │
└─────────────────────────────────────────────────┘
```

**Rejection at any stage**:

- Status → REJECTED
- Asset stays with current user
- Rejection reason recorded

**Connections**:

- `POST /transfers` creates request
- `PATCH /transfers/:id/approve-manager` (dept head)
- `PATCH /transfers/:id/approve-admin` (asset manager)
- `PATCH /transfers/:id/reject` (any approver)
- Creates notification for all involved users

---

## User Workflows

### Workflow 1: New Asset Onboarding

**Actors**: Asset Manager

1. **Setup Master Data** (one-time):
   - Categories page: Create "Laptops" category (20% depreciation)
   - Vendors page: Create "Apple Inc." vendor
   - Locations page: Create "Office - Floor 3" location
   - Departments page: Ensure "IT Department" exists

2. **Add Asset**:
   - Assets page → Create Asset
   - Fill details: "MacBook Pro 16"
   - Select category: Laptops
   - Select vendor: Apple Inc.
   - Select location: Office - Floor 3
   - Select department: IT Department
   - Enter cost: $2000
   - Save → Asset created with status "available"

3. **Assign to Employee**:
   - Assignments page → New Assignment
   - Select asset: MacBook Pro 16
   - Select user: John Doe (employee)
   - Condition: Excellent, Rating: 5
   - Expected return: 2026-12-31
   - Save → Asset status → "assigned"

---

### Workflow 2: Asset Transfer Between Employees

**Actors**: Employee A, Department Head, Asset Manager

1. **Employee A requests transfer**:
   - Transfers page → New Transfer
   - Select asset: MacBook Pro (currently assigned to them)
   - Select user: Employee B
   - Reason: "Employee B needs for new project"
   - Submit → Status: PENDING_MANAGER_APPROVAL
   - Notification sent to Department Head

2. **Department Head approves**:
   - Transfers page → Pending Approvals tab
   - Reviews transfer request
   - Approves with note: "Approved for Project X"
   - Status → PENDING_ADMIN_APPROVAL
   - Notification sent to Asset Manager

3. **Asset Manager approves**:
   - Transfers page → Admin Approvals tab
   - Reviews transfer request
   - Approves with note: "Transferred to Employee B"
   - Status → APPROVED
   - Asset automatically:
     - Reassigned to Employee B
     - Assignment created for Employee B
     - Previous assignment marked as returned
     - Location may be updated
   - Notifications sent to all parties

---

### Workflow 3: Asset Return and Maintenance

**Actors**: Employee, Asset Manager

1. **Employee returns asset**:
   - Assignments page → Active Assignments
   - Select assignment → Return Asset
   - Return condition: Fair (was Excellent)
   - Return rating: 3 (was 5)
   - Notes: "Screen has minor scratches"
   - Submit → Asset status → "available" (or "damaged" if condition poor)

2. **Asset Manager marks for maintenance**:
   - Assets page → Find asset
   - Edit asset
   - Status → "maintenance"
   - Notes: "Screen replacement needed"
   - Save → Asset unavailable for assignment

3. **After repair**:
   - Assets page → Edit asset
   - Status → "available"
   - Save → Asset ready for reassignment

---

## API Endpoint Structure

### Backend Routes (NestJS)

All endpoints prefixed with `/v1`

#### Authentication

- `POST /auth/register` - Register new user (public)
- `POST /auth/login` - Login (public)
- `POST /auth/refresh` - Refresh token (public)
- `POST /auth/logout` - Logout
- `POST /auth/forgot-password` - Request password reset (public)
- `POST /auth/reset-password` - Reset password (public)
- `GET /auth/me` - Get current user

#### Users

- `GET /users` - List users (paginated, searchable)
- `POST /users` - Create user [@Roles: SUPER_ADMIN]
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user [@Roles: SUPER_ADMIN]
- `DELETE /users/:id` - Delete user [@Roles: SUPER_ADMIN]
- `PATCH /users/:id/change-password` - Change password

#### Roles & Permissions

- `GET /roles` - List roles
- `GET /permissions` - List permissions
- `POST /roles` - Create role [@Roles: SUPER_ADMIN]
- `PATCH /roles/:id/permissions` - Update role permissions [@Roles: SUPER_ADMIN]

#### Assets

- `GET /assets` - List assets (with filters)
- `POST /assets` - Create asset [@Roles: SUPER_ADMIN, ASSET_MANAGER]
- `GET /assets/:id` - Get asset details
- `PATCH /assets/:id` - Update asset [@Roles: SUPER_ADMIN, ASSET_MANAGER]
- `DELETE /assets/:id` - Delete asset [@Roles: SUPER_ADMIN, ASSET_MANAGER]
- `GET /assets/statistics` - Get asset statistics
- `PATCH /assets/:id/status` - Update asset status

#### Categories

- `GET /categories` - List categories
- `POST /categories` - Create category [@Roles: SUPER_ADMIN, ASSET_MANAGER]
- `PATCH /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category

#### Vendors

- `GET /vendors` - List vendors
- `POST /vendors` - Create vendor [@Roles: SUPER_ADMIN, ASSET_MANAGER]
- `PATCH /vendors/:id` - Update vendor
- `DELETE /vendors/:id` - Delete vendor

#### Locations

- `GET /locations` - List locations
- `POST /locations` - Create location [@Roles: SUPER_ADMIN, ASSET_MANAGER]
- `PATCH /locations/:id` - Update location
- `DELETE /locations/:id` - Delete location

#### Departments

- `GET /departments` - List departments
- `POST /departments` - Create department [@Roles: SUPER_ADMIN]
- `PATCH /departments/:id` - Update department
- `DELETE /departments/:id` - Delete department

#### Assignments

- `GET /assignments` - List assignments (filtered by user role)
- `POST /assignments` - Create assignment [@Roles: SUPER_ADMIN, ASSET_MANAGER]
- `PATCH /assignments/:id/return` - Return asset [@Roles: SUPER_ADMIN, ASSET_MANAGER]
- `GET /assignments/statistics` - Get assignment statistics

#### Transfers

- `GET /transfers` - List transfers (filtered by user role)
- `POST /transfers` - Create transfer request [@Roles: All authenticated]
- `PATCH /transfers/:id/approve-manager` - Manager approval [@Roles: DEPT_HEAD]
- `PATCH /transfers/:id/approve-admin` - Admin approval [@Roles: SUPER_ADMIN, ASSET_MANAGER]
- `PATCH /transfers/:id/reject` - Reject transfer [@Roles: DEPT_HEAD, SUPER_ADMIN, ASSET_MANAGER]

#### Audit Logs

- `GET /audit-logs` - List audit logs [@Roles: SUPER_ADMIN, AUDITOR]
- `GET /audit-logs/entity/:type/:id` - Get logs for specific entity
- `GET /audit-logs/statistics` - Get audit statistics

#### Reports

- `GET /reports/assets` - Export asset report (CSV/Excel/PDF) [@Roles: SUPER_ADMIN, ASSET_MANAGER, AUDITOR]
- `GET /reports/assignments` - Export assignment report
- `GET /reports/transfers` - Export transfer report
- `GET /reports/audit-logs` - Export audit log report

#### Tags (QR/Barcode)

- `POST /tags/:assetId/qr` - Generate QR code for asset
- `POST /tags/:assetId/barcode` - Generate barcode for asset
- `POST /tags/:assetId/both` - Generate both QR and barcode

---

## Data Flow Example: Complete Asset Lifecycle

```
1. SETUP (Asset Manager)
   Categories → Create "Laptops" (20% depreciation, 5yr life)
   Vendors → Create "Dell Inc."
   Locations → Create "Main Office - IT Room"

2. PROCUREMENT (Asset Manager)
   Assets → Create new Dell Laptop
   - Category: Laptops
   - Vendor: Dell Inc.
   - Location: Main Office - IT Room
   - Department: IT
   - Cost: $1500
   - Status: available
   → Audit log: "Asset created"

3. ASSIGNMENT (Asset Manager)
   Assignments → Assign to John Doe
   - Asset: Dell Laptop #12345
   - User: John Doe (IT Department)
   - Condition: Excellent, Rating: 5
   - Expected return: 2026-12-31
   → Asset status: assigned
   → Audit log: "Asset assigned to John Doe"
   → Notification sent to John Doe

4. TRANSFER REQUEST (John Doe - Employee)
   Transfers → Request transfer
   - Asset: Dell Laptop #12345
   - From: John Doe
   - To: Jane Smith
   - Reason: "Jane needs for new project"
   → Transfer status: PENDING_MANAGER_APPROVAL
   → Notification sent to Department Head
   → Audit log: "Transfer requested"

5. MANAGER APPROVAL (Department Head)
   Transfers → Approve request
   - Notes: "Approved for Project Alpha"
   → Transfer status: PENDING_ADMIN_APPROVAL
   → Notification sent to Asset Manager
   → Audit log: "Manager approved transfer"

6. ADMIN APPROVAL (Asset Manager)
   Transfers → Approve request
   - Notes: "Transfer approved"
   → Transfer status: APPROVED
   → Asset reassigned to Jane Smith
   → Previous assignment closed
   → New assignment created
   → Audit log: "Transfer completed"
   → Notifications sent to John, Jane, and Manager

7. RETURN (Jane Smith via Asset Manager)
   Assignments → Return asset
   - Return condition: Good (minor wear)
   - Return rating: 4
   - Notes: "Keyboard slightly worn"
   → Asset status: available
   → Audit log: "Asset returned by Jane Smith"

8. MAINTENANCE (Asset Manager)
   Assets → Update status
   - Status: maintenance
   - Notes: "Keyboard replacement"
   → Asset unavailable for assignment
   → Audit log: "Asset sent for maintenance"

9. BACK IN SERVICE (Asset Manager)
   Assets → Update status
   - Status: available
   → Asset ready for new assignment
   → Audit log: "Asset back in service"

10. EVENTUAL RETIREMENT
    Assets → Update status
    - Status: retired
    - Notes: "End of useful life"
    → Audit log: "Asset retired"
```

---

## Summary

### Key Integration Points

1. **Users** connect to:
   - Departments (belong to)
   - Roles (assigned)
   - Assignments (receive assets)
   - Transfers (request/receive)

2. **Assets** connect to:
   - Categories (depreciation rules)
   - Vendors (supplier)
   - Locations (where stored)
   - Departments (ownership)
   - Assignments (who uses)
   - Transfers (movement history)

3. **Roles** control:
   - Page visibility
   - Action permissions
   - API endpoint access
   - Approval workflows

4. **Workflows** span pages:
   - Asset creation: Categories → Vendors → Locations → Assets
   - Assignment: Assets → Users → Assignments
   - Transfer: Transfers → Approvals → Reassignment
   - Audit: All actions → Audit Logs → Reports

This system ensures complete traceability, proper authorization, and seamless asset lifecycle management!
