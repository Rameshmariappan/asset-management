import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { code: createDepartmentDto.code },
    });

    if (existing) {
      throw new ConflictException('Department code already exists');
    }

    return this.prisma.department.create({
      data: createDepartmentDto,
      include: {
        parent: true,
        headUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.department.findMany({
      include: {
        parent: true,
        headUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            users: true,
            children: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        headUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
          take: 100,
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Department not found');
    }

    if (updateDepartmentDto.parentId === id) {
      throw new BadRequestException('Department cannot be its own parent');
    }

    if (updateDepartmentDto.code && updateDepartmentDto.code !== existing.code) {
      const codeExists = await this.prisma.department.findUnique({
        where: { code: updateDepartmentDto.code },
      });
      if (codeExists) {
        throw new ConflictException('Department code already exists');
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: updateDepartmentDto,
      include: {
        parent: true,
        headUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const [userCount, childCount] = await Promise.all([
      this.prisma.user.count({ where: { departmentId: id } }),
      this.prisma.department.count({ where: { parentId: id } }),
    ]);

    if (userCount > 0) {
      throw new ConflictException('Cannot delete department with assigned users');
    }

    if (childCount > 0) {
      throw new ConflictException('Cannot delete department with child departments');
    }

    await this.prisma.department.delete({
      where: { id },
    });

    return { message: 'Department deleted successfully' };
  }
}
