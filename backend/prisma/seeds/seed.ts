import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Clean existing data (order matters — delete dependents first)
  console.log('Cleaning existing data...');
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.assetTransfer.deleteMany();
  await prisma.assetAssignment.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.mfaSecret.deleteMany();
  await prisma.orgInvitation.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.location.deleteMany();
  await prisma.department.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Create Default Organization
  console.log('Creating default organization...');
  const defaultOrg = await prisma.organization.create({
    data: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Default Organization',
      slug: 'default',
    },
  });
  console.log('Created default organization');

  // 2. Create Permissions
  console.log('Creating permissions...');
  const permissions = [
    { resource: 'user', action: 'create', description: 'Create new users' },
    { resource: 'user', action: 'read', description: 'View users' },
    { resource: 'user', action: 'update', description: 'Update users' },
    { resource: 'user', action: 'delete', description: 'Delete users' },
    { resource: 'role', action: 'create', description: 'Create roles' },
    { resource: 'role', action: 'read', description: 'View roles' },
    { resource: 'role', action: 'update', description: 'Update roles' },
    { resource: 'role', action: 'delete', description: 'Delete roles' },
    { resource: 'asset', action: 'create', description: 'Create assets' },
    { resource: 'asset', action: 'read', description: 'View assets' },
    { resource: 'asset', action: 'update', description: 'Update assets' },
    { resource: 'asset', action: 'delete', description: 'Delete assets' },
    { resource: 'asset', action: 'assign', description: 'Assign assets' },
    { resource: 'assignment', action: 'create', description: 'Create assignments' },
    { resource: 'assignment', action: 'read', description: 'View assignments' },
    { resource: 'assignment', action: 'read_own', description: 'View own assignments' },
    { resource: 'assignment', action: 'update', description: 'Update assignments' },
    { resource: 'assignment', action: 'delete', description: 'Delete assignments' },
    { resource: 'transfer', action: 'create', description: 'Create transfer requests' },
    { resource: 'transfer', action: 'read', description: 'View transfers' },
    { resource: 'transfer', action: 'approve', description: 'Approve transfers' },
    { resource: 'transfer', action: 'reject', description: 'Reject transfers' },
    { resource: 'category', action: 'create', description: 'Create categories' },
    { resource: 'category', action: 'read', description: 'View categories' },
    { resource: 'category', action: 'update', description: 'Update categories' },
    { resource: 'category', action: 'delete', description: 'Delete categories' },
    { resource: 'vendor', action: 'create', description: 'Create vendors' },
    { resource: 'vendor', action: 'read', description: 'View vendors' },
    { resource: 'vendor', action: 'update', description: 'Update vendors' },
    { resource: 'vendor', action: 'delete', description: 'Delete vendors' },
    { resource: 'location', action: 'create', description: 'Create locations' },
    { resource: 'location', action: 'read', description: 'View locations' },
    { resource: 'location', action: 'update', description: 'Update locations' },
    { resource: 'location', action: 'delete', description: 'Delete locations' },
    { resource: 'audit_log', action: 'read', description: 'View audit logs' },
    { resource: 'report', action: 'read', description: 'View reports' },
    { resource: 'report', action: 'export', description: 'Export reports' },
    { resource: 'notification', action: 'read', description: 'View notifications' },
    { resource: 'notification', action: 'create', description: 'Send notifications' },
  ];

  const createdPermissions = await Promise.all(
    permissions.map((permission) =>
      prisma.permission.create({ data: permission })
    )
  );
  console.log(`Created ${createdPermissions.length} permissions`);

  // 3. Create Roles (global, no tenantId)
  console.log('Creating roles...');

  const superAdminRole = await prisma.role.create({
    data: { name: 'SUPER_ADMIN', displayName: 'Super Admin', description: 'Full system access with all permissions' },
  });

  const assetManagerRole = await prisma.role.create({
    data: { name: 'ASSET_MANAGER', displayName: 'Asset Manager', description: 'Manages assets, assignments, and transfers' },
  });

  const deptHeadRole = await prisma.role.create({
    data: { name: 'DEPT_HEAD', displayName: 'Department Head', description: 'Views department assets and approves transfers' },
  });

  const employeeRole = await prisma.role.create({
    data: { name: 'EMPLOYEE', displayName: 'Employee', description: 'Views own assets and creates transfer requests' },
  });

  const auditorRole = await prisma.role.create({
    data: { name: 'AUDITOR', displayName: 'Auditor', description: 'Read-only access to audit logs and reports' },
  });

  console.log('Created 5 roles');

  // 4. Assign Permissions to Roles
  console.log('Assigning permissions to roles...');

  const allPermissions = await prisma.permission.findMany();
  await Promise.all(
    allPermissions.map((p) =>
      prisma.rolePermission.create({ data: { roleId: superAdminRole.id, permissionId: p.id } })
    )
  );

  const assetManagerPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'asset' }, { resource: 'assignment' }, { resource: 'transfer' },
        { resource: 'category' }, { resource: 'vendor' }, { resource: 'location' },
        { resource: 'notification', action: 'read' }, { resource: 'report' },
      ],
    },
  });
  await Promise.all(
    assetManagerPermissions.map((p) =>
      prisma.rolePermission.create({ data: { roleId: assetManagerRole.id, permissionId: p.id } })
    )
  );

  const deptHeadPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'asset', action: 'read' }, { resource: 'assignment', action: 'read' },
        { resource: 'transfer', action: 'read' }, { resource: 'transfer', action: 'approve' },
        { resource: 'notification', action: 'read' }, { resource: 'report', action: 'read' },
      ],
    },
  });
  await Promise.all(
    deptHeadPermissions.map((p) =>
      prisma.rolePermission.create({ data: { roleId: deptHeadRole.id, permissionId: p.id } })
    )
  );

  const employeePermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'asset', action: 'read' }, { resource: 'assignment', action: 'read_own' },
        { resource: 'transfer', action: 'create' }, { resource: 'transfer', action: 'read' },
        { resource: 'notification', action: 'read' },
      ],
    },
  });
  await Promise.all(
    employeePermissions.map((p) =>
      prisma.rolePermission.create({ data: { roleId: employeeRole.id, permissionId: p.id } })
    )
  );

  const auditorPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'audit_log', action: 'read' }, { resource: 'report' },
        { resource: 'asset', action: 'read' }, { resource: 'assignment', action: 'read' },
      ],
    },
  });
  await Promise.all(
    auditorPermissions.map((p) =>
      prisma.rolePermission.create({ data: { roleId: auditorRole.id, permissionId: p.id } })
    )
  );

  console.log('Assigned permissions to roles');

  // 5. Create default department (with tenantId)
  console.log('Creating default department...');
  const department = await prisma.department.create({
    data: {
      name: 'IT Department',
      code: 'IT',
      tenantId: defaultOrg.id,
    },
  });
  console.log('Created default department');

  // 6. Create Super Admin User (org admin)
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
      tenantId: defaultOrg.id,
    },
  });

  await prisma.userRole.create({
    data: { userId: superAdmin.id, roleId: superAdminRole.id },
  });

  console.log('Created super admin user');
  console.log('\nSuper Admin Credentials:');
  console.log('   Email: admin@assetapp.com');
  console.log('   Password: Admin@123');

  // 7. Create Platform Admin User
  console.log('Creating platform admin user...');
  const platformAdmin = await prisma.user.create({
    data: {
      email: 'platform@assetapp.com',
      passwordHash: await bcrypt.hash('Platform@123', 10),
      firstName: 'Platform',
      lastName: 'Admin',
      isActive: true,
      isPlatformAdmin: true,
      emailVerifiedAt: new Date(),
      tenantId: defaultOrg.id,
    },
  });

  await prisma.userRole.create({
    data: { userId: platformAdmin.id, roleId: superAdminRole.id },
  });

  console.log('Created platform admin user');
  console.log('\nPlatform Admin Credentials:');
  console.log('   Email: platform@assetapp.com');
  console.log('   Password: Platform@123');

  // 8. Create sample users
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
      tenantId: defaultOrg.id,
    },
  });

  await prisma.userRole.create({
    data: { userId: assetManager.id, roleId: assetManagerRole.id },
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
      tenantId: defaultOrg.id,
    },
  });

  await prisma.userRole.create({
    data: { userId: employee.id, roleId: employeeRole.id },
  });

  console.log('Created 2 sample users');

  // 9. Create additional departments
  console.log('Creating additional departments...');
  const hrDepartment = await prisma.department.create({
    data: {
      name: 'Human Resources',
      code: 'HR',
      tenantId: defaultOrg.id,
    },
  });

  const salesDepartment = await prisma.department.create({
    data: {
      name: 'Sales & Marketing',
      code: 'SALES',
      tenantId: defaultOrg.id,
    },
  });

  const financeDepartment = await prisma.department.create({
    data: {
      name: 'Finance',
      code: 'FIN',
      tenantId: defaultOrg.id,
    },
  });

  console.log('Created 3 additional departments');

  // 10. Create Categories
  console.log('Creating categories...');
  const laptopCategory = await prisma.category.create({
    data: {
      name: 'Laptops',
      code: 'LAP',
      icon: 'laptop',
      description: 'Employee work laptops and notebooks',
      depreciationRate: 20,
      usefulLifeYears: 5,
      tenantId: defaultOrg.id,
    },
  });

  const monitorCategory = await prisma.category.create({
    data: {
      name: 'Monitors',
      code: 'MON',
      icon: 'monitor',
      description: 'Desktop monitors and displays',
      depreciationRate: 15,
      usefulLifeYears: 7,
      tenantId: defaultOrg.id,
    },
  });

  const phoneCategory = await prisma.category.create({
    data: {
      name: 'Phones & Tablets',
      code: 'PHN',
      icon: 'smartphone',
      description: 'Mobile phones and tablets',
      depreciationRate: 25,
      usefulLifeYears: 3,
      tenantId: defaultOrg.id,
    },
  });

  const serverCategory = await prisma.category.create({
    data: {
      name: 'Servers',
      code: 'SRV',
      icon: 'server',
      description: 'Production and development servers',
      depreciationRate: 10,
      usefulLifeYears: 10,
      tenantId: defaultOrg.id,
    },
  });

  const furnitureCategory = await prisma.category.create({
    data: {
      name: 'Office Furniture',
      code: 'FURN',
      icon: 'armchair',
      description: 'Desks, chairs, and cabinets',
      depreciationRate: 5,
      usefulLifeYears: 15,
      tenantId: defaultOrg.id,
    },
  });

  const networkCategory = await prisma.category.create({
    data: {
      name: 'Networking Equipment',
      code: 'NET',
      icon: 'wifi',
      description: 'Routers, switches, and access points',
      depreciationRate: 15,
      usefulLifeYears: 7,
      tenantId: defaultOrg.id,
    },
  });

  console.log('Created 6 categories');

  // 11. Create Vendors
  console.log('Creating vendors...');
  const appleVendor = await prisma.vendor.create({
    data: {
      name: 'Apple Inc.',
      code: 'APPLE',
      email: 'enterprise@apple.com',
      phone: '+1-800-275-2273',
      website: 'https://www.apple.com',
      contactPerson: 'Enterprise Sales',
      address: 'One Apple Park Way, Cupertino, CA 95014',
      tenantId: defaultOrg.id,
    },
  });

  const dellVendor = await prisma.vendor.create({
    data: {
      name: 'Dell Technologies',
      code: 'DELL',
      email: 'sales@dell.com',
      phone: '+1-800-289-3355',
      website: 'https://www.dell.com',
      contactPerson: 'Corporate Sales Team',
      address: '1 Dell Way, Round Rock, TX 78682',
      tenantId: defaultOrg.id,
    },
  });

  const lenovoVendor = await prisma.vendor.create({
    data: {
      name: 'Lenovo Group',
      code: 'LNVO',
      email: 'business@lenovo.com',
      phone: '+1-855-253-6686',
      website: 'https://www.lenovo.com',
      contactPerson: 'Business Solutions',
      address: '8001 Development Dr, Morrisville, NC 27560',
      tenantId: defaultOrg.id,
    },
  });

  const samsungVendor = await prisma.vendor.create({
    data: {
      name: 'Samsung Electronics',
      code: 'SMSNG',
      email: 'b2b@samsung.com',
      phone: '+1-800-726-7864',
      website: 'https://www.samsung.com',
      contactPerson: 'B2B Sales',
      address: '85 Challenger Rd, Ridgefield Park, NJ 07660',
      tenantId: defaultOrg.id,
    },
  });

  const ikeaVendor = await prisma.vendor.create({
    data: {
      name: 'IKEA Business',
      code: 'IKEA',
      email: 'business@ikea.com',
      phone: '+1-888-888-4532',
      website: 'https://www.ikea.com',
      contactPerson: 'Business Sales',
      address: '420 Alan Wood Rd, Conshohocken, PA 19428',
      tenantId: defaultOrg.id,
    },
  });

  console.log('Created 5 vendors');

  // 12. Create Locations
  console.log('Creating locations...');
  const hqLocation = await prisma.location.create({
    data: {
      name: 'Headquarters',
      code: 'HQ',
      type: 'office',
      addressLine1: '100 Main Street',
      city: 'San Francisco',
      state: 'California',
      postalCode: '94105',
      country: 'United States',
      latitude: 37.7749,
      longitude: -122.4194,
      tenantId: defaultOrg.id,
    },
  });

  const floor2Location = await prisma.location.create({
    data: {
      name: 'HQ - Floor 2 (Engineering)',
      code: 'HQ-F2',
      type: 'office',
      parentId: hqLocation.id,
      tenantId: defaultOrg.id,
    },
  });

  const floor3Location = await prisma.location.create({
    data: {
      name: 'HQ - Floor 3 (Sales & HR)',
      code: 'HQ-F3',
      type: 'office',
      parentId: hqLocation.id,
      tenantId: defaultOrg.id,
    },
  });

  const dataCenterLocation = await prisma.location.create({
    data: {
      name: 'Data Center',
      code: 'DC-01',
      type: 'data_center',
      addressLine1: '500 Tech Park Drive',
      city: 'San Jose',
      state: 'California',
      postalCode: '95110',
      country: 'United States',
      latitude: 37.3382,
      longitude: -121.8863,
      tenantId: defaultOrg.id,
    },
  });

  const warehouseLocation = await prisma.location.create({
    data: {
      name: 'Storage Warehouse',
      code: 'WH-01',
      type: 'warehouse',
      addressLine1: '200 Industrial Blvd',
      city: 'Oakland',
      state: 'California',
      postalCode: '94607',
      country: 'United States',
      tenantId: defaultOrg.id,
    },
  });

  console.log('Created 5 locations');

  // 13. Create Assets
  console.log('Creating assets...');
  const asset1 = await prisma.asset.create({
    data: {
      assetTag: 'LAP-2024-001',
      name: 'MacBook Pro 16" M3 Pro',
      serialNumber: 'C02ZN1ABCD01',
      description: 'Employee laptop - Engineering team',
      model: 'MacBook Pro 16-inch',
      manufacturer: 'Apple',
      categoryId: laptopCategory.id,
      vendorId: appleVendor.id,
      locationId: floor2Location.id,
      status: 'assigned',
      purchaseDate: new Date('2024-01-15'),
      purchaseCost: 2499.00,
      currentValue: 1999.20,
      warrantyEndDate: new Date('2027-01-15'),
      warrantyDetails: '3-year AppleCare+',
      tenantId: defaultOrg.id,
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      assetTag: 'LAP-2024-002',
      name: 'MacBook Air 15" M3',
      serialNumber: 'C02ZN2ABCD02',
      description: 'Employee laptop - Sales team',
      model: 'MacBook Air 15-inch',
      manufacturer: 'Apple',
      categoryId: laptopCategory.id,
      vendorId: appleVendor.id,
      locationId: floor3Location.id,
      status: 'available',
      purchaseDate: new Date('2024-03-01'),
      purchaseCost: 1299.00,
      currentValue: 1039.20,
      tenantId: defaultOrg.id,
    },
  });

  const asset3 = await prisma.asset.create({
    data: {
      assetTag: 'LAP-2024-003',
      name: 'Dell XPS 15',
      serialNumber: 'DL-XPS-2024-003',
      description: 'Employee laptop - Finance team',
      model: 'XPS 15 9530',
      manufacturer: 'Dell',
      categoryId: laptopCategory.id,
      vendorId: dellVendor.id,
      locationId: floor3Location.id,
      status: 'available',
      purchaseDate: new Date('2024-02-10'),
      purchaseCost: 1799.00,
      currentValue: 1439.20,
      warrantyEndDate: new Date('2026-02-10'),
      warrantyDetails: '2-year Dell ProSupport',
      tenantId: defaultOrg.id,
    },
  });

  await prisma.asset.create({
    data: {
      assetTag: 'LAP-2024-004',
      name: 'Lenovo ThinkPad X1 Carbon',
      serialNumber: 'LN-X1C-2024-004',
      description: 'Employee laptop - HR team',
      model: 'ThinkPad X1 Carbon Gen 11',
      manufacturer: 'Lenovo',
      categoryId: laptopCategory.id,
      vendorId: lenovoVendor.id,
      locationId: floor3Location.id,
      status: 'available',
      purchaseDate: new Date('2024-04-20'),
      purchaseCost: 1649.00,
      currentValue: 1319.20,
      warrantyEndDate: new Date('2027-04-20'),
      warrantyDetails: '3-year Lenovo Premier Support',
      tenantId: defaultOrg.id,
    },
  });

  await prisma.asset.create({
    data: {
      assetTag: 'MON-2024-001',
      name: 'Dell UltraSharp 27" 4K',
      serialNumber: 'DL-MON-U2723QE-001',
      description: 'External monitor - Engineering',
      model: 'U2723QE',
      manufacturer: 'Dell',
      categoryId: monitorCategory.id,
      vendorId: dellVendor.id,
      locationId: floor2Location.id,
      status: 'available',
      purchaseDate: new Date('2024-01-15'),
      purchaseCost: 619.99,
      currentValue: 526.99,
      tenantId: defaultOrg.id,
    },
  });

  await prisma.asset.create({
    data: {
      assetTag: 'MON-2024-002',
      name: 'Samsung ViewFinity S8 32"',
      serialNumber: 'SM-VF-S8-002',
      description: 'External monitor - Design team',
      model: 'S80UA',
      manufacturer: 'Samsung',
      categoryId: monitorCategory.id,
      vendorId: samsungVendor.id,
      locationId: floor2Location.id,
      status: 'available',
      purchaseDate: new Date('2024-02-20'),
      purchaseCost: 449.99,
      currentValue: 382.49,
      tenantId: defaultOrg.id,
    },
  });

  await prisma.asset.create({
    data: {
      assetTag: 'PHN-2024-001',
      name: 'iPhone 15 Pro',
      serialNumber: 'APL-IP15P-001',
      description: 'Company phone - Manager',
      model: 'iPhone 15 Pro 256GB',
      manufacturer: 'Apple',
      categoryId: phoneCategory.id,
      vendorId: appleVendor.id,
      locationId: floor2Location.id,
      status: 'available',
      purchaseDate: new Date('2024-03-01'),
      purchaseCost: 1199.00,
      currentValue: 899.25,
      tenantId: defaultOrg.id,
    },
  });

  await prisma.asset.create({
    data: {
      assetTag: 'SRV-2024-001',
      name: 'Dell PowerEdge R760',
      serialNumber: 'DL-PE-R760-001',
      description: 'Production application server',
      model: 'PowerEdge R760',
      manufacturer: 'Dell',
      categoryId: serverCategory.id,
      vendorId: dellVendor.id,
      locationId: dataCenterLocation.id,
      status: 'available',
      purchaseDate: new Date('2024-01-05'),
      purchaseCost: 12500.00,
      currentValue: 11250.00,
      warrantyEndDate: new Date('2029-01-05'),
      warrantyDetails: '5-year Dell ProSupport Plus',
      tenantId: defaultOrg.id,
    },
  });

  await prisma.asset.create({
    data: {
      assetTag: 'FURN-2024-001',
      name: 'Standing Desk - Adjustable',
      serialNumber: 'IKEA-BEKANT-001',
      description: 'Height-adjustable standing desk',
      model: 'BEKANT',
      manufacturer: 'IKEA',
      categoryId: furnitureCategory.id,
      vendorId: ikeaVendor.id,
      locationId: floor2Location.id,
      status: 'available',
      purchaseDate: new Date('2024-01-10'),
      purchaseCost: 549.00,
      currentValue: 521.55,
      tenantId: defaultOrg.id,
    },
  });

  await prisma.asset.create({
    data: {
      assetTag: 'FURN-2024-002',
      name: 'Ergonomic Office Chair',
      serialNumber: 'IKEA-MARKUS-001',
      description: 'High-back ergonomic chair',
      model: 'MARKUS',
      manufacturer: 'IKEA',
      categoryId: furnitureCategory.id,
      vendorId: ikeaVendor.id,
      locationId: floor2Location.id,
      status: 'available',
      purchaseDate: new Date('2024-01-10'),
      purchaseCost: 229.00,
      currentValue: 217.55,
      tenantId: defaultOrg.id,
    },
  });

  await prisma.asset.create({
    data: {
      assetTag: 'NET-2024-001',
      name: 'Cisco Catalyst 9200 Switch',
      serialNumber: 'CISCO-C9200-001',
      description: '48-port managed switch',
      model: 'Catalyst 9200L-48P',
      manufacturer: 'Cisco',
      categoryId: networkCategory.id,
      vendorId: dellVendor.id,
      locationId: dataCenterLocation.id,
      status: 'available',
      purchaseDate: new Date('2024-01-05'),
      purchaseCost: 3200.00,
      currentValue: 2720.00,
      tenantId: defaultOrg.id,
    },
  });

  await prisma.asset.create({
    data: {
      assetTag: 'LAP-2023-001',
      name: 'MacBook Pro 14" M2 Pro',
      serialNumber: 'C02YN-OLD-001',
      description: 'Older laptop - being phased out',
      model: 'MacBook Pro 14-inch (2023)',
      manufacturer: 'Apple',
      categoryId: laptopCategory.id,
      vendorId: appleVendor.id,
      locationId: warehouseLocation.id,
      status: 'maintenance',
      purchaseDate: new Date('2023-03-15'),
      purchaseCost: 1999.00,
      currentValue: 1199.40,
      notes: 'Battery replacement needed. Scheduled for maintenance.',
      tenantId: defaultOrg.id,
    },
  });

  console.log('Created 12 assets');

  // 14. Create sample assignment (MacBook Pro assigned to employee)
  console.log('Creating sample assignment...');
  await prisma.assetAssignment.create({
    data: {
      assetId: asset1.id,
      assignedToUserId: employee.id,
      assignedByUserId: assetManager.id,
      assignedAt: new Date('2024-02-01'),
      expectedReturnDate: new Date('2025-12-31'),
      isActive: true,
      assignCondition: 'Excellent',
      assignConditionRating: 5,
      assignNotes: 'New laptop for development work. Includes charger and carrying case.',
      tenantId: defaultOrg.id,
    },
  });

  console.log('Created 1 sample assignment');

  // 15. Create sample notifications
  console.log('Creating sample notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: superAdmin.id,
        type: 'system',
        title: 'Welcome to Asset Management',
        message: 'Your organization has been set up successfully. Start by adding your team and assets.',
        channel: 'in_app',
        tenantId: defaultOrg.id,
      },
      {
        userId: assetManager.id,
        type: 'assignment',
        title: 'New Asset Assigned',
        message: 'MacBook Pro 16" M3 Pro (LAP-2024-001) has been assigned to John Doe.',
        channel: 'in_app',
        tenantId: defaultOrg.id,
      },
      {
        userId: employee.id,
        type: 'assignment',
        title: 'Asset Assigned to You',
        message: 'You have been assigned MacBook Pro 16" M3 Pro (LAP-2024-001). Please review the assignment details.',
        channel: 'in_app',
        tenantId: defaultOrg.id,
      },
    ],
  });

  console.log('Created 3 sample notifications');

  console.log('\n========================================');
  console.log('   Database seeding completed!');
  console.log('========================================');
  console.log('\nCreated:');
  console.log(`  - 1 organization (Default Organization)`);
  console.log(`  - ${createdPermissions.length} permissions`);
  console.log('  - 5 roles (Super Admin, Asset Manager, Dept Head, Employee, Auditor)');
  console.log('  - 4 departments (IT, HR, Sales & Marketing, Finance)');
  console.log('  - 4 users (Super Admin, Platform Admin, Asset Manager, Employee)');
  console.log('  - 6 categories (Laptops, Monitors, Phones, Servers, Furniture, Networking)');
  console.log('  - 5 vendors (Apple, Dell, Lenovo, Samsung, IKEA)');
  console.log('  - 5 locations (HQ + 2 floors, Data Center, Warehouse)');
  console.log('  - 12 assets (laptops, monitors, phones, servers, furniture, networking)');
  console.log('  - 1 assignment (MacBook Pro → John Doe)');
  console.log('  - 3 notifications');
  console.log('\nTest Credentials:');
  console.log('  Super Admin:    admin@assetapp.com / Admin@123');
  console.log('  Platform Admin: platform@assetapp.com / Platform@123');
  console.log('  Asset Manager:  manager@assetapp.com / Manager@123');
  console.log('  Employee:       employee@assetapp.com / Employee@123');
  console.log('\n  Please change all passwords after first login!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
