# Database Relationships Explained - Asset Management System

## Table of Contents

1. [Relationship Types Overview](#relationship-types-overview)
2. [One-to-Many Relationships](#one-to-many-relationships)
3. [Many-to-Many Relationships](#many-to-many-relationships)
4. [Multi-Tenancy Relationships](#multi-tenancy-relationships)
5. [Practical Examples with Real Data](#practical-examples-with-real-data)
6. [How to Query Related Data](#how-to-query-related-data)

---

## Relationship Types Overview

### What are Database Relationships?

Database relationships define how tables are connected to each other. Think of them like connections in real life:

- **One-to-Many**: One parent has many children (but each child has only one parent)
- **Many-to-Many**: Students and courses (one student takes many courses, one course has many students)

---

## One-to-Many Relationships

### Definition

**One-to-Many (1:N)**: One record in Table A can be associated with **multiple** records in Table B, but each record in Table B belongs to **only one** record in Table A.

### How It Works in Database

**Database Structure**:

```sql
-- Parent Table (the "One" side)
CREATE TABLE departments (
  id UUID PRIMARY KEY,
  name VARCHAR(100)
);

-- Child Table (the "Many" side)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  first_name VARCHAR(100),
  department_id UUID,  -- Foreign Key pointing to departments.id
  FOREIGN KEY (department_id) REFERENCES departments(id)
);
```

**The foreign key (`department_id`) is stored in the child table**, pointing back to the parent.

---

### 1:N Examples in Your System (19 Models Total)

#### Example 1: Organization → Users (1:N) — Multi-Tenancy

**Scenario**: One organization has many users, but each user belongs to only one organization (tenant).

```
ORGANIZATIONS TABLE:
┌──────────┬─────────────────┬──────────────┬──────────┐
│ id       │ name            │ slug         │ isActive │
├──────────┼─────────────────┼──────────────┼──────────┤
│ org-001  │ TechCorp Inc.   │ techcorp-inc │ true     │
│ org-002  │ CloudHost Ltd.  │ cloudhost-ltd│ true     │
└──────────┴─────────────────┴──────────────┴──────────┘

USERS TABLE:
┌──────────┬────────────┬───────────────┬──────────────┬─────────────────┐
│ id       │ first_name │ last_name     │ tenant_id    │ isPlatformAdmin │
├──────────┼────────────┼───────────────┼──────────────┼─────────────────┤
│ user-001 │ John       │ Doe           │ org-001      │ false           │
│ user-002 │ Jane       │ Smith         │ org-001      │ false           │
│ user-003 │ Bob        │ Johnson       │ org-002      │ false           │
│ user-004 │ Platform   │ Admin         │ org-001      │ true            │
└──────────┴────────────┴───────────────┴──────────────┴─────────────────┘
```

**Analysis**:
- TechCorp has **3 users** (John, Jane, Platform Admin)
- CloudHost has **1 user** (Bob)
- Each user belongs to **exactly ONE organization**
- `isPlatformAdmin` is a boolean flag (not a role) — allows cross-tenant access
- Platform Admin can switch to any org via `X-Org-Id` header

**In Prisma Schema**:
```prisma
model Organization {
  id        String @id
  name      String
  slug      String @unique
  logoUrl   String?
  isActive  Boolean @default(true)
  users     User[]          // One org has MANY users
  assets    Asset[]         // One org has MANY assets
  // ... all tenant-scoped models
}

model User {
  id              String        @id
  tenantId        String?
  isPlatformAdmin Boolean       @default(false)
  organization    Organization? @relation(fields: [tenantId], references: [id])
}
```

**Important**: The `tenantId` field exists on 10+ models (Users, Assets, Assignments, Transfers, etc.) and is automatically filtered by Prisma middleware — queries only return data belonging to the current user's organization.

---

#### Example 2: Department → Users (1:N)

**Scenario**: One department has many employees, but each employee belongs to only one department.

```
DEPARTMENTS TABLE:
┌──────────┬─────────────────┐
│ id       │ name            │
├──────────┼─────────────────┤
│ dept-001 │ IT Department   │
│ dept-002 │ HR Department   │
│ dept-003 │ Sales Department│
└──────────┴─────────────────┘

USERS TABLE:
┌──────────┬────────────┬───────────────┬──────────────┐
│ id       │ first_name │ last_name     │ department_id│
├──────────┼────────────┼───────────────┼──────────────┤
│ user-001 │ John       │ Doe           │ dept-001     │  ← IT Dept
│ user-002 │ Jane       │ Smith         │ dept-001     │  ← IT Dept
│ user-003 │ Bob        │ Johnson       │ dept-002     │  ← HR Dept
│ user-004 │ Alice      │ Williams      │ dept-001     │  ← IT Dept
│ user-005 │ Charlie    │ Brown         │ dept-003     │  ← Sales Dept
└──────────┴────────────┴───────────────┴──────────────┘
```

**Analysis**:

- IT Department (dept-001) has **3 users** (John, Jane, Alice)
- HR Department (dept-002) has **1 user** (Bob)
- Sales Department (dept-003) has **1 user** (Charlie)
- Each user can belong to **only ONE department**

**In Prisma Schema**:

```prisma
model Department {
  id    String @id
  name  String
  users User[]  // One department has MANY users
}

model User {
  id           String      @id
  firstName    String
  lastName     String
  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id])
  // One user belongs to ONE department
}
```

**In Your Application**:

- **Users Page**: When creating a user, you select ONE department from dropdown
- **Departments Page**: Shows count of users in that department

---

#### Example 3: Category → Assets (1:N)

**Scenario**: One category (e.g., "Laptops") can have many assets, but each asset belongs to only one category.

```
CATEGORIES TABLE:
┌──────────┬──────────┬─────────────────┬────────────┐
│ id       │ name     │ depreciation_rate│ useful_life│
├──────────┼──────────┼─────────────────┼────────────┤
│ cat-001  │ Laptops  │ 20               │ 5          │
│ cat-002  │ Monitors │ 15               │ 7          │
│ cat-003  │ Phones   │ 25               │ 3          │
└──────────┴──────────┴─────────────────┴────────────┘

ASSETS TABLE:
┌──────────┬────────────────┬──────────────┬────────────┐
│ id       │ name           │ category_id  │ cost       │
├──────────┼────────────────┼──────────────┼────────────┤
│ ast-001  │ MacBook Pro 16 │ cat-001      │ 2500       │  ← Laptops
│ ast-002  │ Dell XPS 15    │ cat-001      │ 1800       │  ← Laptops
│ ast-003  │ LG UltraWide   │ cat-002      │ 600        │  ← Monitors
│ ast-004  │ iPhone 15 Pro  │ cat-003      │ 1200       │  ← Phones
│ ast-005  │ MacBook Air M2 │ cat-001      │ 1500       │  ← Laptops
└──────────┴────────────────┴──────────────┴────────────┘
```

**Analysis**:

- Laptops category has **3 assets** (MacBook Pro, Dell XPS, MacBook Air)
- Monitors category has **1 asset** (LG UltraWide)
- Phones category has **1 asset** (iPhone 15 Pro)
- Each asset belongs to **exactly ONE category**

**Why This Matters**:
When a laptop is created with category "Laptops" (20% depreciation, 5-year life):

- Year 0: $2500
- Year 1: $2000 (20% depreciation)
- Year 2: $1600
- Year 5: $0 (end of useful life)

---

#### Example 4: Vendor → Assets (1:N)

```
VENDORS:
┌──────────┬────────────┐
│ id       │ name       │
├──────────┼────────────┤
│ vnd-001  │ Apple Inc. │
│ vnd-002  │ Dell Inc.  │
└──────────┴────────────┘

ASSETS:
┌──────────┬────────────────┬────────────┐
│ id       │ name           │ vendor_id  │
├──────────┼────────────────┼────────────┤
│ ast-001  │ MacBook Pro 16 │ vnd-001    │  ← Apple
│ ast-002  │ Dell XPS 15    │ vnd-002    │  ← Dell
│ ast-005  │ MacBook Air M2 │ vnd-001    │  ← Apple
│ ast-006  │ iPhone 15 Pro  │ vnd-001    │  ← Apple
└──────────┴────────────────┴────────────┘
```

- Apple vendor has **3 assets**
- Dell vendor has **1 asset**

---

#### Example 5: Location → Assets (1:N)

```
LOCATIONS:
┌──────────┬─────────────────────────┐
│ id       │ name                    │
├──────────┼─────────────────────────┤
│ loc-001  │ Office - Floor 3        │
│ loc-002  │ Data Center - Rack A3   │
│ loc-003  │ Warehouse - Bay 5       │
└──────────┴─────────────────────────┘

ASSETS:
┌──────────┬────────────────┬──────────────┐
│ id       │ name           │ location_id  │
├──────────┼────────────────┼──────────────┤
│ ast-001  │ MacBook Pro 16 │ loc-001      │  ← Floor 3
│ ast-002  │ Dell XPS 15    │ loc-001      │  ← Floor 3
│ ast-003  │ Server HP-001  │ loc-002      │  ← Data Center
│ ast-007  │ Spare Monitors │ loc-003      │  ← Warehouse
└──────────┴────────────────┴──────────────┘
```

- Floor 3 has **2 assets**
- Data Center has **1 asset**
- Warehouse has **1 asset**

---

#### Example 6: Asset → Assignments (1:N)

**Scenario**: One asset can have many assignments over its lifetime (different users over time), but each assignment is for only one asset.

```
ASSETS:
┌──────────┬────────────────┐
│ id       │ name           │
├──────────┼────────────────┤
│ ast-001  │ MacBook Pro 16 │
└──────────┴────────────────┘

ASSIGNMENTS (History):
┌──────────┬───────────┬──────────────┬─────────────┬──────────────┐
│ id       │ asset_id  │ user_id      │ assigned_at │ returned_at  │
├──────────┼───────────┼──────────────┼─────────────┼──────────────┤
│ asn-001  │ ast-001   │ user-001     │ 2024-01-01  │ 2024-06-01   │
│ asn-002  │ ast-001   │ user-002     │ 2024-06-15  │ 2024-12-01   │
│ asn-003  │ ast-001   │ user-003     │ 2024-12-10  │ NULL         │ ← Current
└──────────┴───────────┴──────────────┴─────────────┴──────────────┘
```

**Timeline**:

```
Jan 2024 ────────► Jun 2024 ────────► Dec 2024 ────────► Now
[User-001 had it]   [User-002 had it]   [User-003 has it]
```

- Same MacBook Pro has been assigned **3 times** to different users
- Currently assigned to user-003 (returned_at is NULL)
- Each assignment record belongs to **ONE asset**

---

#### Example 7: User → Assignments (1:N)

```
USERS:
┌──────────┬────────────┐
│ id       │ first_name │
├──────────┼────────────┤
│ user-001 │ John       │
└──────────┴────────────┘

ASSIGNMENTS (What John has been assigned):
┌──────────┬───────────┬──────────────┬─────────────┬──────────────┐
│ id       │ asset_id  │ user_id      │ assigned_at │ returned_at  │
├──────────┼───────────┼──────────────┼─────────────┼──────────────┤
│ asn-001  │ ast-001   │ user-001     │ 2024-01-01  │ 2024-06-01   │ ← Returned
│ asn-005  │ ast-010   │ user-001     │ 2024-06-15  │ NULL         │ ← Current
│ asn-008  │ ast-015   │ user-001     │ 2024-07-01  │ NULL         │ ← Current
└──────────┴───────────┴──────────────┴─────────────┴──────────────┘
```

- John has **2 current assignments** (Laptop + Mouse)
- John had **1 previous assignment** (returned MacBook)

---

### Summary of 1:N Relationships in Your System

| Parent (One)   | Child (Many)    | Example                                    |
| -------------- | --------------- | ------------------------------------------ |
| Organization   | Users           | TechCorp org has 50 users                  |
| Organization   | Assets          | TechCorp org has 200 assets                |
| Organization   | OrgInvitations  | TechCorp has 5 pending invitations         |
| Department     | Users           | IT Dept has 10 employees                   |
| Category       | Assets          | Laptops category has 50 laptops            |
| Vendor         | Assets          | Apple vendor supplied 30 devices           |
| Location       | Assets          | Floor 3 has 25 assets                      |
| Department     | Assets          | IT Dept owns 40 assets                     |
| Asset          | Assignments     | One laptop assigned 5 times over its life  |
| User           | Assignments     | John has 2 current assignments             |
| Asset          | Transfers       | One laptop transferred 3 times             |

---

## Multi-Tenancy Relationships

### How Multi-Tenancy Works

The system uses **Organization-based multi-tenancy**. Each organization is a separate tenant, and data is isolated between tenants automatically.

#### Key Concepts

1. **Organization** = Tenant (each company using the system)
2. **tenantId** = Foreign key on 10+ models pointing to `organizations.id`
3. **Prisma Middleware** = Automatically adds `WHERE tenantId = ?` to all queries
4. **isPlatformAdmin** = Boolean flag on User model (not a role) for cross-tenant access

#### Organization → All Tenant-Scoped Models (1:N)

```
Organization (org-001: TechCorp)
    │
    ├──► Users (John, Jane, Alice — all tenantId = org-001)
    ├──► Assets (MacBook, Dell XPS — all tenantId = org-001)
    ├──► Departments (IT, HR — all tenantId = org-001)
    ├──► Categories (Laptops, Servers — all tenantId = org-001)
    ├──► Vendors (Apple, Dell — all tenantId = org-001)
    ├──► Locations (Floor 3, Data Center — all tenantId = org-001)
    ├──► Assignments (all tenantId = org-001)
    ├──► Transfers (all tenantId = org-001)
    ├──► Notifications (all tenantId = org-001)
    ├──► AuditLogs (all tenantId = org-001)
    └──► OrgInvitations (invite emails for org-001)
```

**Data Isolation Example**:
```
TechCorp (org-001) sees ONLY:
  - 3 users, 50 assets, 2 departments

CloudHost (org-002) sees ONLY:
  - 5 users, 100 assets, 4 departments

Neither can see the other's data — enforced at the database query level.
```

#### Organization → OrgInvitations (1:N)

```
ORGANIZATIONS:
┌──────────┬─────────────────┐
│ id       │ name            │
├──────────┼─────────────────┤
│ org-001  │ TechCorp Inc.   │
└──────────┴─────────────────┘

ORG_INVITATIONS:
┌──────────┬──────────────────────┬──────────────┬───────────┬────────────┐
│ id       │ email                │ org_id       │ role_name │ accepted_at│
├──────────┼──────────────────────┼──────────────┼───────────┼────────────┤
│ inv-001  │ alice@example.com    │ org-001      │ EMPLOYEE  │ 2024-06-15 │
│ inv-002  │ bob@example.com      │ org-001      │ DEPT_HEAD │ NULL       │ ← Pending
└──────────┴──────────────────────┴──────────────┴───────────┴────────────┘
```

**Flow**: Admin creates invitation → token emailed → user accepts → User created with assigned role in that org.

#### Platform Admin (Cross-Tenant Access)

```
User "Platform Admin" (isPlatformAdmin: true)
    │
    ├── Can switch to org-001 (via X-Org-Id header)
    ├── Can switch to org-002
    └── Can switch to org-003

    When switched to org-001:
      → All queries return org-001 data
      → Functions as if they belong to org-001
```

**Note**: `isPlatformAdmin` is a **boolean flag on the User model**, NOT a role in the `roles` table. It bypasses the RolesGuard entirely and allows accessing the Platform module endpoints.

---

## Many-to-Many Relationships

### Definition

**Many-to-Many (N:M)**: Multiple records in Table A can be associated with **multiple** records in Table B, and vice versa.

### How It Works in Database

**Requires a Junction Table** (also called a join table or linking table):

```sql
-- Table A
CREATE TABLE users (
  id UUID PRIMARY KEY,
  first_name VARCHAR(100)
);

-- Table B
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(50)
);

-- Junction Table (stores the relationships)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID,  -- Foreign Key to users
  role_id UUID,  -- Foreign Key to roles
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

**The junction table contains TWO foreign keys**, one to each parent table.

---

### N:M Examples in Your System

#### Example 1: Users ↔ Roles (N:M)

**Scenario**:

- One user can have **multiple roles** (e.g., both ASSET_MANAGER and DEPT_HEAD)
- One role can be assigned to **multiple users** (e.g., EMPLOYEE role for 50 people)

**Real Data Example**:

```
USERS TABLE:
┌──────────┬────────────┬───────────┐
│ id       │ first_name │ last_name │
├──────────┼────────────┼───────────┤
│ user-001 │ John       │ Doe       │
│ user-002 │ Jane       │ Smith     │
│ user-003 │ Bob        │ Johnson   │
│ user-004 │ Alice      │ Williams  │
│ user-005 │ Charlie    │ Brown     │
└──────────┴────────────┴───────────┘

ROLES TABLE:
┌──────────┬──────────────┬──────────────────────────────┐
│ id       │ name         │ description                  │
├──────────┼──────────────┼──────────────────────────────┤
│ role-001 │ SUPER_ADMIN  │ Full system access           │
│ role-002 │ ASSET_MANAGER│ Manages assets               │
│ role-003 │ DEPT_HEAD    │ Department head              │
│ role-004 │ EMPLOYEE     │ Regular employee             │
│ role-005 │ AUDITOR      │ Read-only audit access       │
└──────────┴──────────────┴──────────────────────────────┘

USER_ROLES TABLE (Junction Table):
┌──────────┬──────────────┬──────────┐
│ id       │ user_id      │ role_id  │
├──────────┼──────────────┼──────────┤
│ ur-001   │ user-001     │ role-001 │  ← John is SUPER_ADMIN
│ ur-002   │ user-002     │ role-002 │  ← Jane is ASSET_MANAGER
│ ur-003   │ user-002     │ role-003 │  ← Jane is ALSO DEPT_HEAD
│ ur-004   │ user-003     │ role-004 │  ← Bob is EMPLOYEE
│ ur-005   │ user-004     │ role-004 │  ← Alice is EMPLOYEE
│ ur-006   │ user-005     │ role-005 │  ← Charlie is AUDITOR
└──────────┴──────────────┴──────────┘
```

**Analysis**:

**From User Perspective** (One user → Many roles):

- John (user-001) has **1 role**: SUPER_ADMIN
- **Jane (user-002) has 2 roles**: ASSET_MANAGER + DEPT_HEAD
- Bob (user-003) has **1 role**: EMPLOYEE
- Alice (user-004) has **1 role**: EMPLOYEE
- Charlie (user-005) has **1 role**: AUDITOR

**From Role Perspective** (One role → Many users):

- SUPER_ADMIN role is assigned to **1 user** (John)
- ASSET_MANAGER role is assigned to **1 user** (Jane)
- DEPT_HEAD role is assigned to **1 user** (Jane)
- **EMPLOYEE role is assigned to 2 users** (Bob, Alice)
- AUDITOR role is assigned to **1 user** (Charlie)

**In Prisma Schema**:

```prisma
model User {
  id        String     @id
  firstName String
  lastName  String
  userRoles UserRole[] // Many-to-many through junction
}

model Role {
  id        String     @id
  name      String
  userRoles UserRole[] // Many-to-many through junction
}

model UserRole {
  id     String @id
  userId String
  roleId String
  user   User   @relation(fields: [userId], references: [id])
  role   Role   @relation(fields: [roleId], references: [id])
}
```

**In Your Application**:

```typescript
// Get user with all their roles
const user = await prisma.user.findUnique({
  where: { id: 'user-002' },
  include: {
    userRoles: {
      include: {
        role: true
      }
    }
  }
})

// Result:
{
  id: 'user-002',
  firstName: 'Jane',
  lastName: 'Smith',
  userRoles: [
    { role: { name: 'ASSET_MANAGER' } },
    { role: { name: 'DEPT_HEAD' } }
  ]
}
```

---

#### Example 2: Roles ↔ Permissions (N:M)

**Scenario**:

- One role can have **many permissions** (e.g., ASSET_MANAGER has permissions for asset:create, asset:update, etc.)
- One permission can belong to **many roles** (e.g., asset:read permission for ASSET_MANAGER, DEPT_HEAD, EMPLOYEE)

```
ROLES TABLE:
┌──────────┬──────────────┐
│ id       │ name         │
├──────────┼──────────────┤
│ role-001 │ SUPER_ADMIN  │
│ role-002 │ ASSET_MANAGER│
│ role-003 │ EMPLOYEE     │
└──────────┴──────────────┘

PERMISSIONS TABLE:
┌──────────┬──────────────┬────────┐
│ id       │ resource     │ action │
├──────────┼──────────────┼────────┤
│ perm-001 │ asset        │ create │
│ perm-002 │ asset        │ read   │
│ perm-003 │ asset        │ update │
│ perm-004 │ asset        │ delete │
│ perm-005 │ user         │ create │
│ perm-006 │ user         │ read   │
└──────────┴──────────────┴────────┘

ROLE_PERMISSIONS TABLE (Junction):
┌──────────┬──────────┬──────────────┐
│ id       │ role_id  │ permission_id│
├──────────┼──────────┼──────────────┤
│ rp-001   │ role-001 │ perm-001     │  ← SUPER_ADMIN can create assets
│ rp-002   │ role-001 │ perm-002     │  ← SUPER_ADMIN can read assets
│ rp-003   │ role-001 │ perm-003     │  ← SUPER_ADMIN can update assets
│ rp-004   │ role-001 │ perm-004     │  ← SUPER_ADMIN can delete assets
│ rp-005   │ role-001 │ perm-005     │  ← SUPER_ADMIN can create users
│ rp-006   │ role-001 │ perm-006     │  ← SUPER_ADMIN can read users
│ rp-007   │ role-002 │ perm-001     │  ← ASSET_MANAGER can create assets
│ rp-008   │ role-002 │ perm-002     │  ← ASSET_MANAGER can read assets
│ rp-009   │ role-002 │ perm-003     │  ← ASSET_MANAGER can update assets
│ rp-010   │ role-002 │ perm-004     │  ← ASSET_MANAGER can delete assets
│ rp-011   │ role-003 │ perm-002     │  ← EMPLOYEE can read assets
└──────────┴──────────┴──────────────┘
```

**Analysis**:

**From Role Perspective** (One role → Many permissions):

- SUPER_ADMIN has **6 permissions** (all asset + all user permissions)
- ASSET_MANAGER has **4 permissions** (all asset permissions)
- EMPLOYEE has **1 permission** (only read assets)

**From Permission Perspective** (One permission → Many roles):

- `asset:create` permission is assigned to **2 roles** (SUPER_ADMIN, ASSET_MANAGER)
- `asset:read` permission is assigned to **3 roles** (SUPER_ADMIN, ASSET_MANAGER, EMPLOYEE)
- `asset:update` permission is assigned to **2 roles** (SUPER_ADMIN, ASSET_MANAGER)
- `user:create` permission is assigned to **1 role** (SUPER_ADMIN only)

**Practical Example in Application**:

```typescript
// Check if user can create assets
const user = await prisma.user.findUnique({
  where: { id: "user-002" },
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    },
  },
});

// User: Jane (ASSET_MANAGER role)
// Result: She has permission "asset:create" ✓
```

---

### Visual Comparison: 1:N vs N:M

#### One-to-Many (1:N)

```
Department "IT"
    │
    ├─► User "John"    (John belongs to IT only)
    ├─► User "Jane"    (Jane belongs to IT only)
    └─► User "Alice"   (Alice belongs to IT only)
```

**Key**: Foreign key stored IN the child table (users.department_id)

#### Many-to-Many (N:M)

```
User "Jane"                    Role "ASSET_MANAGER"
    │                               │
    └──► user_roles table ◄─────────┘
             (junction)
                │
    ┌───────────┴──────────┐
    │ user_id: Jane        │
    │ role_id: ASSET_MGR   │
    └──────────────────────┘
```

**Key**: Requires separate junction table with TWO foreign keys

---

## Practical Examples with Real Data

### Example: Complete User with All Relationships

```typescript
const user = await prisma.user.findUnique({
  where: { email: "jane.smith@company.com" },
  include: {
    // 1:N - User belongs to ONE department
    department: true,

    // N:M - User has MANY roles
    userRoles: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    },

    // 1:N - User has MANY assignments
    assignedAssets: {
      where: { returnedAt: null }, // Current assignments only
      include: {
        asset: true,
      },
    },
  },
});
```

**Result**:

```json
{
  "id": "user-002",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@company.com",

  // 1:N - ONE department
  "department": {
    "id": "dept-001",
    "name": "IT Department"
  },

  // N:M - MANY roles
  "userRoles": [
    {
      "role": {
        "name": "ASSET_MANAGER",
        "rolePermissions": [
          { "permission": { "resource": "asset", "action": "create" } },
          { "permission": { "resource": "asset", "action": "update" } },
          { "permission": { "resource": "asset", "action": "delete" } }
        ]
      }
    },
    {
      "role": {
        "name": "DEPT_HEAD",
        "rolePermissions": [{ "permission": { "resource": "transfer", "action": "approve" } }]
      }
    }
  ],

  // 1:N - MANY assignments (Jane currently has 2 assets)
  "assignedAssets": [
    {
      "asset": {
        "id": "ast-010",
        "name": "MacBook Pro 16",
        "status": "assigned"
      }
    },
    {
      "asset": {
        "id": "ast-015",
        "name": "iPhone 15 Pro",
        "status": "assigned"
      }
    }
  ]
}
```

---

## How to Query Related Data

### Query 1: Get all users in a department (1:N)

```typescript
// Get department with all its users
const department = await prisma.department.findUnique({
  where: { id: 'dept-001' },
  include: {
    users: true  // All users in this department
  }
})

// Result:
{
  id: 'dept-001',
  name: 'IT Department',
  users: [
    { id: 'user-001', firstName: 'John', lastName: 'Doe' },
    { id: 'user-002', firstName: 'Jane', lastName: 'Smith' },
    { id: 'user-004', firstName: 'Alice', lastName: 'Williams' }
  ]
}
```

### Query 2: Get all assets in a category (1:N)

```typescript
const category = await prisma.category.findUnique({
  where: { id: "cat-001" },
  include: {
    assets: {
      where: { status: "available" }, // Only available laptops
    },
  },
});
```

### Query 3: Get all roles for a user (N:M)

```typescript
const userWithRoles = await prisma.user.findUnique({
  where: { id: "user-002" },
  include: {
    userRoles: {
      include: {
        role: true,
      },
    },
  },
});

// Extract role names
const roleNames = userWithRoles.userRoles.map((ur) => ur.role.name);
// Result: ['ASSET_MANAGER', 'DEPT_HEAD']
```

### Query 4: Get all permissions for a role (N:M)

```typescript
const roleWithPermissions = await prisma.role.findUnique({
  where: { name: "ASSET_MANAGER" },
  include: {
    rolePermissions: {
      include: {
        permission: true,
      },
    },
  },
});

// Extract permissions
const permissions = roleWithPermissions.rolePermissions.map(
  (rp) => `${rp.permission.resource}:${rp.permission.action}`,
);
// Result: ['asset:create', 'asset:read', 'asset:update', 'asset:delete']
```

### Query 5: Get asset assignment history (1:N)

```typescript
const assetHistory = await prisma.asset.findUnique({
  where: { id: "ast-001" },
  include: {
    assignments: {
      orderBy: { assignedAt: "desc" },
      include: {
        assignedToUser: true,
        assignedByUser: true,
      },
    },
  },
});

// Result shows complete history of who had this asset
```

---

## Summary: When to Use Each Type

### Use One-to-Many (1:N) when:

✅ Each child belongs to **exactly ONE** parent
✅ Examples:

- User belongs to ONE department
- Asset belongs to ONE category
- Asset stored at ONE location
- Assignment is for ONE asset

**Database Design**: Put foreign key in the child table

### Use Many-to-Many (N:M) when:

✅ Multiple parents can have multiple children
✅ Examples:

- User can have MANY roles, Role can have MANY users
- Role can have MANY permissions, Permission can have MANY roles
- (Future) User can be part of MANY projects, Project can have MANY users

**Database Design**: Create a junction table with TWO foreign keys

---

## Key Takeaways

1. **1:N stores FK in child table** (users.department_id, users.tenant_id)
2. **N:M requires junction table** (user_roles with user_id + role_id)
3. **Multi-tenancy uses 1:N** — Organization → all tenant-scoped models via `tenantId` FK
4. **Your system uses all three patterns**:
   - 1:N for ownership (user belongs to department, user belongs to organization)
   - N:M for permissions (user has many roles, role has many permissions)
   - Tenant isolation (Prisma middleware auto-filters by tenantId)
5. **Junction tables are necessary** for N:M relationships
6. **isPlatformAdmin is NOT a role** — it's a boolean flag on User for cross-tenant access
7. **Querying is different**:
   - 1:N: Direct include
   - N:M: Include through junction table
   - Tenant: Automatic filtering (no manual WHERE clause needed)

This structure allows your system to:

- ✅ Isolate data between organizations (multi-tenancy)
- ✅ Track asset ownership and location
- ✅ Implement flexible role-based access control
- ✅ Maintain complete audit history
- ✅ Support complex permission systems
- ✅ Enable platform-level administration across tenants
