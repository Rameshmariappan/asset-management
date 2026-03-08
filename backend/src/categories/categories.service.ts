import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { code: createCategoryDto.code },
    });

    if (existing) {
      throw new ConflictException('Category code already exists');
    }

    return this.prisma.category.create({
      data: createCategoryDto,
      include: { parent: true },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        parent: true,
        _count: {
          select: {
            assets: true,
            children: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        assets: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            status: true,
          },
          take: 50,
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    if (updateCategoryDto.parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    if (updateCategoryDto.code && updateCategoryDto.code !== existing.code) {
      const codeExists = await this.prisma.category.findUnique({
        where: { code: updateCategoryDto.code },
      });
      if (codeExists) {
        throw new ConflictException('Category code already exists');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: { parent: true },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const [assetCount, childCount] = await Promise.all([
      this.prisma.asset.count({ where: { categoryId: id } }),
      this.prisma.category.count({ where: { parentId: id } }),
    ]);

    if (assetCount > 0) {
      throw new ConflictException('Cannot delete category with assigned assets');
    }

    if (childCount > 0) {
      throw new ConflictException('Cannot delete category with child categories');
    }

    await this.prisma.category.delete({ where: { id } });

    return { message: 'Category deleted successfully' };
  }
}
