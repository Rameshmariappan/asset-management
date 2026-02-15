"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Starting database seeding...');
    console.log('Cleaning existing data...');
    await prisma.rolePermission.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.orgInvitation.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();
    await prisma.organization.deleteMany();
    console.log('Creating default organization...');
    const defaultOrg = await prisma.organization.create({
        data: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Default Organization',
            slug: 'default',
        },
    });
    console.log('Created default organization');
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
    const createdPermissions = await Promise.all(permissions.map((permission) => prisma.permission.create({ data: permission })));
    console.log(`Created ${createdPermissions.length} permissions`);
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
    console.log('Assigning permissions to roles...');
    const allPermissions = await prisma.permission.findMany();
    await Promise.all(allPermissions.map((p) => prisma.rolePermission.create({ data: { roleId: superAdminRole.id, permissionId: p.id } })));
    const assetManagerPermissions = await prisma.permission.findMany({
        where: {
            OR: [
                { resource: 'asset' }, { resource: 'assignment' }, { resource: 'transfer' },
                { resource: 'category' }, { resource: 'vendor' }, { resource: 'location' },
                { resource: 'notification', action: 'read' }, { resource: 'report' },
            ],
        },
    });
    await Promise.all(assetManagerPermissions.map((p) => prisma.rolePermission.create({ data: { roleId: assetManagerRole.id, permissionId: p.id } })));
    const deptHeadPermissions = await prisma.permission.findMany({
        where: {
            OR: [
                { resource: 'asset', action: 'read' }, { resource: 'assignment', action: 'read' },
                { resource: 'transfer', action: 'read' }, { resource: 'transfer', action: 'approve' },
                { resource: 'notification', action: 'read' }, { resource: 'report', action: 'read' },
            ],
        },
    });
    await Promise.all(deptHeadPermissions.map((p) => prisma.rolePermission.create({ data: { roleId: deptHeadRole.id, permissionId: p.id } })));
    const employeePermissions = await prisma.permission.findMany({
        where: {
            OR: [
                { resource: 'asset', action: 'read' }, { resource: 'assignment', action: 'read_own' },
                { resource: 'transfer', action: 'create' }, { resource: 'transfer', action: 'read' },
                { resource: 'notification', action: 'read' },
            ],
        },
    });
    await Promise.all(employeePermissions.map((p) => prisma.rolePermission.create({ data: { roleId: employeeRole.id, permissionId: p.id } })));
    const auditorPermissions = await prisma.permission.findMany({
        where: {
            OR: [
                { resource: 'audit_log', action: 'read' }, { resource: 'report' },
                { resource: 'asset', action: 'read' }, { resource: 'assignment', action: 'read' },
            ],
        },
    });
    await Promise.all(auditorPermissions.map((p) => prisma.rolePermission.create({ data: { roleId: auditorRole.id, permissionId: p.id } })));
    console.log('Assigned permissions to roles');
    console.log('Creating default department...');
    const department = await prisma.department.create({
        data: {
            name: 'IT Department',
            code: 'IT',
            tenantId: defaultOrg.id,
        },
    });
    console.log('Created default department');
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
    console.log('\nDatabase seeding completed successfully!');
    console.log('\nCreated:');
    console.log(`  - 1 organization (Default Organization)`);
    console.log(`  - ${createdPermissions.length} permissions`);
    console.log('  - 5 roles (Super Admin, Asset Manager, Dept Head, Employee, Auditor)');
    console.log('  - 1 department');
    console.log('  - 4 users (Super Admin, Platform Admin, Asset Manager, Employee)');
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
//# sourceMappingURL=seed.js.map