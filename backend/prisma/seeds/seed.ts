import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data
  console.log('Cleaning existing data...');
  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // 1. Create Permissions
  console.log('Creating permissions...');
  const permissions = [
    // User permissions
    { resource: 'user', action: 'create', description: 'Create new users' },
    { resource: 'user', action: 'read', description: 'View users' },
    { resource: 'user', action: 'update', description: 'Update users' },
    { resource: 'user', action: 'delete', description: 'Delete users' },

    // Role permissions
    { resource: 'role', action: 'create', description: 'Create roles' },
    { resource: 'role', action: 'read', description: 'View roles' },
    { resource: 'role', action: 'update', description: 'Update roles' },
    { resource: 'role', action: 'delete', description: 'Delete roles' },

    // Asset permissions
    { resource: 'asset', action: 'create', description: 'Create assets' },
    { resource: 'asset', action: 'read', description: 'View assets' },
    { resource: 'asset', action: 'update', description: 'Update assets' },
    { resource: 'asset', action: 'delete', description: 'Delete assets' },
    { resource: 'asset', action: 'assign', description: 'Assign assets' },

    // Assignment permissions
    { resource: 'assignment', action: 'create', description: 'Create assignments' },
    { resource: 'assignment', action: 'read', description: 'View assignments' },
    { resource: 'assignment', action: 'read_own', description: 'View own assignments' },
    { resource: 'assignment', action: 'update', description: 'Update assignments' },
    { resource: 'assignment', action: 'delete', description: 'Delete assignments' },

    // Transfer permissions
    { resource: 'transfer', action: 'create', description: 'Create transfer requests' },
    { resource: 'transfer', action: 'read', description: 'View transfers' },
    { resource: 'transfer', action: 'approve', description: 'Approve transfers' },
    { resource: 'transfer', action: 'reject', description: 'Reject transfers' },

    // Category permissions
    { resource: 'category', action: 'create', description: 'Create categories' },
    { resource: 'category', action: 'read', description: 'View categories' },
    { resource: 'category', action: 'update', description: 'Update categories' },
    { resource: 'category', action: 'delete', description: 'Delete categories' },

    // Vendor permissions
    { resource: 'vendor', action: 'create', description: 'Create vendors' },
    { resource: 'vendor', action: 'read', description: 'View vendors' },
    { resource: 'vendor', action: 'update', description: 'Update vendors' },
    { resource: 'vendor', action: 'delete', description: 'Delete vendors' },

    // Location permissions
    { resource: 'location', action: 'create', description: 'Create locations' },
    { resource: 'location', action: 'read', description: 'View locations' },
    { resource: 'location', action: 'update', description: 'Update locations' },
    { resource: 'location', action: 'delete', description: 'Delete locations' },

    // Audit log permissions
    { resource: 'audit_log', action: 'read', description: 'View audit logs' },

    // Report permissions
    { resource: 'report', action: 'read', description: 'View reports' },
    { resource: 'report', action: 'export', description: 'Export reports' },

    // Notification permissions
    { resource: 'notification', action: 'read', description: 'View notifications' },
    { resource: 'notification', action: 'create', description: 'Send notifications' },
  ];

  const createdPermissions = await Promise.all(
    permissions.map((permission) =>
      prisma.permission.create({ data: permission })
    )
  );
  console.log(`✓ Created ${createdPermissions.length} permissions`);

  // 2. Create Roles
  console.log('Creating roles...');

  const superAdminRole = await prisma.role.create({
    data: {
      name: 'SUPER_ADMIN',
      displayName: 'Super Admin',
      description: 'Full system access with all permissions',
    },
  });

  const assetManagerRole = await prisma.role.create({
    data: {
      name: 'ASSET_MANAGER',
      displayName: 'Asset Manager',
      description: 'Manages assets, assignments, and transfers',
    },
  });

  const deptHeadRole = await prisma.role.create({
    data: {
      name: 'DEPT_HEAD',
      displayName: 'Department Head',
      description: 'Views department assets and approves transfers',
    },
  });

  const employeeRole = await prisma.role.create({
    data: {
      name: 'EMPLOYEE',
      displayName: 'Employee',
      description: 'Views own assets and creates transfer requests',
    },
  });

  const auditorRole = await prisma.role.create({
    data: {
      name: 'AUDITOR',
      displayName: 'Auditor',
      description: 'Read-only access to audit logs and reports',
    },
  });

  console.log('✓ Created 5 roles');

  // 3. Assign Permissions to Roles
  console.log('Assigning permissions to roles...');

  // Super Admin - All permissions
  const allPermissions = await prisma.permission.findMany();
  await Promise.all(
    allPermissions.map((permission) =>
      prisma.rolePermission.create({
        data: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      })
    )
  );

  // Asset Manager - Asset, assignment, transfer, category, vendor, location permissions
  const assetManagerPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'asset' },
        { resource: 'assignment' },
        { resource: 'transfer' },
        { resource: 'category' },
        { resource: 'vendor' },
        { resource: 'location' },
        { resource: 'notification', action: 'read' },
        { resource: 'report' },
      ],
    },
  });
  await Promise.all(
    assetManagerPermissions.map((permission) =>
      prisma.rolePermission.create({
        data: {
          roleId: assetManagerRole.id,
          permissionId: permission.id,
        },
      })
    )
  );

  // Department Head - Read assets, assignments, approve transfers
  const deptHeadPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'asset', action: 'read' },
        { resource: 'assignment', action: 'read' },
        { resource: 'transfer', action: 'read' },
        { resource: 'transfer', action: 'approve' },
        { resource: 'notification', action: 'read' },
        { resource: 'report', action: 'read' },
      ],
    },
  });
  await Promise.all(
    deptHeadPermissions.map((permission) =>
      prisma.rolePermission.create({
        data: {
          roleId: deptHeadRole.id,
          permissionId: permission.id,
        },
      })
    )
  );

  // Employee - Read own assignments, create transfer requests
  const employeePermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'asset', action: 'read' },
        { resource: 'assignment', action: 'read_own' },
        { resource: 'transfer', action: 'create' },
        { resource: 'transfer', action: 'read' },
        { resource: 'notification', action: 'read' },
      ],
    },
  });
  await Promise.all(
    employeePermissions.map((permission) =>
      prisma.rolePermission.create({
        data: {
          roleId: employeeRole.id,
          permissionId: permission.id,
        },
      })
    )
  );

  // Auditor - Read audit logs and reports
  const auditorPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'audit_log', action: 'read' },
        { resource: 'report' },
        { resource: 'asset', action: 'read' },
        { resource: 'assignment', action: 'read' },
      ],
    },
  });
  await Promise.all(
    auditorPermissions.map((permission) =>
      prisma.rolePermission.create({
        data: {
          roleId: auditorRole.id,
          permissionId: permission.id,
        },
      })
    )
  );

  console.log('✓ Assigned permissions to roles');

  // 4. Create default department
  console.log('Creating default department...');
  const department = await prisma.department.create({
    data: {
      name: 'IT Department',
      code: 'IT',
    },
  });
  console.log('✓ Created default department');

  // 5. Create Super Admin User
  console.log('Creating super admin user...');
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@assetapp.com',
      passwordHash: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      emailVerifiedAt: new Date(),
      departmentId: department.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: superAdmin.id,
      roleId: superAdminRole.id,
    },
  });

  console.log('✓ Created super admin user');
  console.log('\n📧 Super Admin Credentials:');
  console.log('   Email: admin@assetapp.com');
  console.log('   Password: Admin@123');
  console.log('   ⚠️  Please change this password after first login!\n');

  // 6. Create sample users
  console.log('Creating sample users...');

  const assetManager = await prisma.user.create({
    data: {
      email: 'manager@assetapp.com',
      passwordHash: await bcrypt.hash('Manager@123', 10),
      firstName: 'Asset',
      lastName: 'Manager',
      isActive: true,
      emailVerifiedAt: new Date(),
      departmentId: department.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: assetManager.id,
      roleId: assetManagerRole.id,
    },
  });

  const employee = await prisma.user.create({
    data: {
      email: 'employee@assetapp.com',
      passwordHash: await bcrypt.hash('Employee@123', 10),
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      emailVerifiedAt: new Date(),
      departmentId: department.id,
      managerId: assetManager.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: employee.id,
      roleId: employeeRole.id,
    },
  });

  console.log('✓ Created 2 sample users');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\nCreated:');
  console.log(`  - ${createdPermissions.length} permissions`);
  console.log('  - 5 roles (Super Admin, Asset Manager, Dept Head, Employee, Auditor)');
  console.log('  - 1 department');
  console.log('  - 3 users (Super Admin, Asset Manager, Employee)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
