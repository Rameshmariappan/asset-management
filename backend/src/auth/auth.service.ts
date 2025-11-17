import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { createHash } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        departmentId: registerDto.departmentId,
      },
      include: {
        department: true,
      },
    });

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

    // Remove password from response
    const { passwordHash, ...result } = user;

    return {
      message: 'User registered successfully',
      user: result,
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        mfaSecret: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Check MFA
    if (user.isMfaEnabled && user.mfaSecret) {
      if (!loginDto.mfaCode) {
        return {
          requiresMfa: true,
          message: 'MFA code required',
        };
      }

      const isValidMfaCode = speakeasy.totp.verify({
        secret: user.mfaSecret.secret,
        encoding: 'base32',
        token: loginDto.mfaCode,
        window: 2,
      });

      if (!isValidMfaCode) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Generate tokens
    const roles = user.userRoles.map((ur) => ur.role.name);
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      roles,
    );

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken, ipAddress, userAgent);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.userId !== userId) {
      throw new UnauthorizedException('Token does not belong to user');
    }

    if (storedToken.revokedAt) {
      throw new UnauthorizedException('Token has been revoked');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Token has expired');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    const roles = storedToken.user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(userId, storedToken.user.email, roles);

    // Store new refresh token
    await this.storeRefreshToken(
      userId,
      tokens.refreshToken,
      storedToken.ipAddress,
      storedToken.userAgent,
    );

    return tokens;
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Setup MFA for user
   */
  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Asset Management (${user.email})`,
      issuer: 'Asset Management System',
    });

    // Store secret (unverified)
    await this.prisma.mfaSecret.upsert({
      where: { userId },
      create: {
        userId,
        secret: secret.base32,
      },
      update: {
        secret: secret.base32,
        verifiedAt: null,
      },
    });

    // Generate QR code
    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      message: 'MFA setup initiated. Please verify with your authenticator app.',
    };
  }

  /**
   * Verify and enable MFA
   */
  async verifyAndEnableMfa(userId: string, code: string) {
    const mfaSecret = await this.prisma.mfaSecret.findUnique({
      where: { userId },
    });

    if (!mfaSecret) {
      throw new BadRequestException('MFA not set up');
    }

    const isValid = speakeasy.totp.verify({
      secret: mfaSecret.secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    // Mark MFA as verified and enabled
    await this.prisma.mfaSecret.update({
      where: { userId },
      data: {
        verifiedAt: new Date(),
        backupCodes: hashedBackupCodes,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { isMfaEnabled: true },
    });

    return {
      message: 'MFA enabled successfully',
      backupCodes,
      warning: 'Save these backup codes in a safe place. They can be used if you lose access to your authenticator app.',
    };
  }

  /**
   * Disable MFA
   */
  async disableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { mfaSecret: true },
    });

    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA not enabled');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret.secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    // Delete MFA secret and disable MFA
    await this.prisma.mfaSecret.delete({
      where: { userId },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { isMfaEnabled: false },
    });

    return { message: 'MFA disabled successfully' };
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(userId: string, email: string, roles: string[]) {
    const payload = { sub: userId, email, roles };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRATION', '15m'),
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
      },
    );

    return { accessToken, refreshToken };
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const tokenHash = this.hashToken(refreshToken);
    const expirationDays = 7; // Default 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Hash token using SHA256
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate backup codes for MFA
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}
