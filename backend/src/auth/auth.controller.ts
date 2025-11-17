import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyMfaDto, DisableMfaDto } from './dto/mfa.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    // If MFA required, don't set cookies
    if ('requiresMfa' in result && result.requiresMfa) {
      return result;
    }

    // Set refresh token in httpOnly cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Don't send refresh token in response body
    const { refreshToken, ...response } = result;

    return response;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshTokens(
    @CurrentUser('userId') userId: string,
    @CurrentUser('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(userId, refreshToken);

    // Set new refresh token in httpOnly cookie
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear cookie
    res.clearCookie('refresh_token');

    return { message: 'Logged out successfully' };
  }

  @Post('mfa/setup')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Setup MFA for user' })
  @ApiResponse({ status: 200, description: 'MFA setup initiated' })
  async setupMfa(@CurrentUser('userId') userId: string) {
    return this.authService.setupMfa(userId);
  }

  @Post('mfa/verify')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify and enable MFA' })
  @ApiResponse({ status: 200, description: 'MFA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid MFA code' })
  async verifyMfa(
    @CurrentUser('userId') userId: string,
    @Body() verifyMfaDto: VerifyMfaDto,
  ) {
    return this.authService.verifyAndEnableMfa(userId, verifyMfaDto.code);
  }

  @Post('mfa/disable')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid MFA code' })
  async disableMfa(
    @CurrentUser('userId') userId: string,
    @Body() disableMfaDto: DisableMfaDto,
  ) {
    return this.authService.disableMfa(userId, disableMfaDto.code);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user retrieved' })
  async getCurrentUser(@CurrentUser() user: any) {
    return { user };
  }
}
