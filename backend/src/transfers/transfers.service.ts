import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  // TODO: Implement service methods
}
