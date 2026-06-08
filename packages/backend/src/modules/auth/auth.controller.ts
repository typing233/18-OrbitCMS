import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(
    @Body() body: { email: string; password: string; displayName: string; tenantSlug?: string },
  ) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() body: { email: string; password: string; tenantSlug?: string }) {
    return this.authService.login(body.email, body.password, body.tenantSlug);
  }

  @Post('oauth/callback')
  @ApiOperation({ summary: 'OAuth2 callback handler' })
  async oauthCallback(
    @Body() body: { provider: string; profile: { id: string; email: string; displayName: string; avatarUrl?: string }; tenantSlug?: string },
  ) {
    return this.authService.oauthLogin(body.provider, body.profile, body.tenantSlug);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@Req() req: any) {
    const user = req.user;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      tenantId: user.tenantId,
      roles: user.roles?.map((r: any) => ({ id: r.id, name: r.name, slug: r.slug })) || [],
    };
  }
}
