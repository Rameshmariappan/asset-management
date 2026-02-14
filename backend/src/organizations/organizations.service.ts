import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  /**
   * Get current organization details
   */
  async getCurrentOrganization() {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.organization.findUnique({
      where: { id: tenantId },
    });
  }

  /**
   * Create an invitation
   */
  async createInvitation(dto: CreateInvitationDto, invitedByUserId: string) {
    const tenantId = this.tenantContext.getTenantId();

    // Check if user already exists with this email
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Check for existing pending invitation
    const existingInvite = await this.prisma.orgInvitation.findFirst({
      where: {
        organizationId: tenantId,
        email: dto.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    // Validate role exists
    const role = await this.prisma.role.findUnique({
      where: { name: dto.roleName },
    });
    if (!role) {
      throw new BadRequestException(`Role ${dto.roleName} not found`);
    }

    // Generate token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const invitation = await this.prisma.orgInvitation.create({
      data: {
        organizationId: tenantId,
        email: dto.email,
        roleName: dto.roleName,
        tokenHash,
        invitedByUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        organization: { select: { name: true } },
      },
    });

    return {
      ...invitation,
      token: rawToken, // Return raw token (to be sent via email in production)
    };
  }

  /**
   * List pending invitations for current org
   */
  async listInvitations() {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.orgInvitation.findMany({
      where: {
        organizationId: tenantId,
      },
      include: {
        invitedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const invitation = await this.prisma.orgInvitation.findFirst({
      where: { id, organizationId: tenantId },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    await this.prisma.orgInvitation.delete({ where: { id } });
    return { message: 'Invitation revoked' };
  }

  /**
   * Accept an invitation and create user account
   */
  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    const invitation = await this.prisma.orgInvitation.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('This invitation has already been accepted');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('This invitation has expired');
    }

    // Check email not already registered
    const existingUser = await this.prisma.user.findFirst({
      where: { email: invitation.email, deletedAt: null },
    });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user + assign role + mark invitation accepted
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          tenantId: invitation.organizationId,
        },
      });

      const role = await tx.role.findUnique({
        where: { name: invitation.roleName },
      });

      if (role) {
        await tx.userRole.create({
          data: { userId: user.id, roleId: role.id },
        });
      }

      await tx.orgInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return user;
    });

    const { passwordHash, ...userWithoutPassword } = result;

    return {
      message: 'Account created successfully',
      user: {
        ...userWithoutPassword,
        roles: [invitation.roleName],
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          slug: invitation.organization.slug,
        },
      },
    };
  }
}
