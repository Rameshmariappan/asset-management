import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async create(createLocationDto: CreateLocationDto) {
    const existing = await this.prisma.location.findUnique({
      where: { code: createLocationDto.code },
    });

    if (existing) {
      throw new ConflictException('Location code already exists');
    }

    return this.prisma.location.create({
      data: createLocationDto,
      include: { parent: true },
    });
  }

  async findAll() {
    return this.prisma.location.findMany({
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
    const location = await this.prisma.location.findUnique({
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
            category: {
              select: {
                name: true,
              },
            },
          },
          take: 100,
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async update(id: string, updateLocationDto: UpdateLocationDto) {
    const existing = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Location not found');
    }

    if (updateLocationDto.code && updateLocationDto.code !== existing.code) {
      const codeExists = await this.prisma.location.findUnique({
        where: { code: updateLocationDto.code },
      });
      if (codeExists) {
        throw new ConflictException('Location code already exists');
      }
    }

    return this.prisma.location.update({
      where: { id },
      data: updateLocationDto,
      include: { parent: true },
    });
  }

  async remove(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        assets: true,
        children: true,
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (location.assets.length > 0) {
      throw new ConflictException('Cannot delete location with assigned assets');
    }

    if (location.children.length > 0) {
      throw new ConflictException('Cannot delete location with child locations');
    }

    await this.prisma.location.delete({ where: { id } });

    return { message: 'Location deleted successfully' };
  }
}
