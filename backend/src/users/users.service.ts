import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone,
        departmentId: createUserDto.departmentId,
        managerId: createUserDto.managerId,
        isActive: createUserDto.isActive ?? true,
      },
      include: {
        department: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Assign roles if provided
    if (createUserDto.roleNames && createUserDto.roleNames.length > 0) {
      await this.assignRoles(user.id, { roleNames: createUserDto.roleNames });
    } else {
      // Assign default EMPLOYEE role
      const employeeRole = await this.prisma.role.findUnique({
        where: { name: 'EMPLOYEE' },
      });
      if (employeeRole) {
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: employeeRole.id,
          },
        });
      }
    }

    // Fetch user with roles
    return this.findOne(user.id);
  }

  /**
   * Find all users with pagination and filters
   */
  async findAll(queryDto: QueryUserDto) {
    const { page, limit, search, departmentId, roleId, isActive, sortBy, sortOrder } = queryDto;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (roleId) {
      where.userRoles = {
        some: {
          roleId,
        },
      };
    }

    where.deletedAt = null; // Exclude soft-deleted users

    // Get total count
    const total = await this.prisma.user.count({ where });

    // Get users
    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Remove password hash from response
    const sanitizedUsers = users.map(({ passwordHash, ...user }) => ({
      ...user,
      roles: user.userRoles.map((ur) => ur.role),
    }));

    return {
      data: sanitizedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one user by ID
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
              },
            },
          },
        },
        subordinates: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...sanitizedUser } = user;

    return {
      ...sanitizedUser,
      roles: user.userRoles.map((ur) => ur.role),
    };
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundException('User not found');
    }

    // Check email uniqueness if email is being updated
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    // Update user
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    return this.findOne(user.id);
  }

  /**
   * Soft delete user
   */
  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { message: 'User deleted successfully' };
  }

  /**
   * Assign roles to user
   */
  async assignRoles(userId: string, assignRolesDto: AssignRolesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    // Get roles by names
    const roles = await this.prisma.role.findMany({
      where: {
        name: { in: assignRolesDto.roleNames },
      },
    });

    if (roles.length !== assignRolesDto.roleNames.length) {
      throw new BadRequestException('One or more roles not found');
    }

    // Remove existing roles
    await this.prisma.userRole.deleteMany({
      where: { userId },
    });

    // Assign new roles
    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({
        userId,
        roleId: role.id,
      })),
    });

    return this.findOne(userId);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('User has no password (SSO user)');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Get user's assigned assets
   */
  async getUserAssets(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const assignments = await this.prisma.assetAssignment.findMany({
      where: {
        assignedToUserId: userId,
        isActive: true,
      },
      include: {
        asset: {
          include: {
            category: true,
            location: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return assignments;
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const [activeAssignments, totalAssignments, pendingTransfers] = await Promise.all([
      this.prisma.assetAssignment.count({
        where: {
          assignedToUserId: userId,
          isActive: true,
        },
      }),
      this.prisma.assetAssignment.count({
        where: {
          assignedToUserId: userId,
        },
      }),
      this.prisma.assetTransfer.count({
        where: {
          OR: [
            { fromUserId: userId },
            { toUserId: userId },
          ],
          status: { in: ['pending', 'manager_approved'] },
        },
      }),
    ]);

    return {
      activeAssignments,
      totalAssignments,
      pendingTransfers,
    };
  }
}
