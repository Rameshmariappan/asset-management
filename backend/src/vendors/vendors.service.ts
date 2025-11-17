import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async create(createVendorDto: CreateVendorDto) {
    const existing = await this.prisma.vendor.findUnique({
      where: { code: createVendorDto.code },
    });

    if (existing) {
      throw new ConflictException('Vendor code already exists');
    }

    return this.prisma.vendor.create({
      data: createVendorDto,
    });
  }

  async findAll() {
    return this.prisma.vendor.findMany({
      include: {
        _count: {
          select: {
            assets: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        assets: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            status: true,
            purchaseDate: true,
          },
          take: 100,
          orderBy: {
            purchaseDate: 'desc',
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto) {
    const existing = await this.prisma.vendor.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Vendor not found');
    }

    if (updateVendorDto.code && updateVendorDto.code !== existing.code) {
      const codeExists = await this.prisma.vendor.findUnique({
        where: { code: updateVendorDto.code },
      });
      if (codeExists) {
        throw new ConflictException('Vendor code already exists');
      }
    }

    return this.prisma.vendor.update({
      where: { id },
      data: updateVendorDto,
    });
  }

  async remove(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        assets: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.assets.length > 0) {
      throw new ConflictException('Cannot delete vendor with assigned assets');
    }

    await this.prisma.vendor.delete({ where: { id } });

    return { message: 'Vendor deleted successfully' };
  }
}
