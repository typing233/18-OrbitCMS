import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';
import { Role } from '../../entities/role.entity';
import { AuditService } from './audit.service';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  private hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512').toString('hex');
    return { hash: `${s}:${hash}`, salt: s };
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    const { hash: computed } = this.hashPassword(password, salt);
    return computed === stored;
  }

  async register(dto: {
    email: string;
    password: string;
    displayName: string;
    tenantSlug?: string;
  }) {
    let tenant = dto.tenantSlug
      ? await this.tenantRepo.findOne({ where: { slug: dto.tenantSlug } })
      : await this.tenantRepo.findOne({ where: { slug: 'default' } });

    if (!tenant) {
      tenant = this.tenantRepo.create({
        name: 'Default',
        slug: 'default',
        settings: {},
      });
      tenant = await this.tenantRepo.save(tenant);
    }

    const existing = await this.userRepo.findOne({
      where: { email: dto.email, tenantId: tenant.id },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const { hash } = this.hashPassword(dto.password);

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash: hash,
      displayName: dto.displayName,
      tenantId: tenant.id,
    });

    const savedUser = await this.userRepo.save(user);

    const defaultRole = await this.roleRepo.findOne({
      where: { slug: 'editor', tenantId: tenant.id },
    });
    if (defaultRole) {
      savedUser.roles = [defaultRole];
      await this.userRepo.save(savedUser);
    }

    await this.auditService.log({
      tenantId: tenant.id,
      userId: savedUser.id,
      action: 'user.register',
      resource: 'user',
      resourceId: savedUser.id,
      after: { email: savedUser.email, displayName: savedUser.displayName },
    });

    return this.generateTokens(savedUser);
  }

  async login(email: string, password: string, tenantSlug?: string) {
    const tenant = tenantSlug
      ? await this.tenantRepo.findOne({ where: { slug: tenantSlug } })
      : await this.tenantRepo.findOne({ where: { slug: 'default' } });

    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.userRepo.findOne({
      where: { email, tenantId: tenant.id },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    await this.auditService.log({
      tenantId: tenant.id,
      userId: user.id,
      action: 'user.login',
      resource: 'user',
      resourceId: user.id,
    });

    return this.generateTokens(user);
  }

  async oauthLogin(provider: string, profile: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  }, tenantSlug?: string) {
    let tenant = tenantSlug
      ? await this.tenantRepo.findOne({ where: { slug: tenantSlug } })
      : await this.tenantRepo.findOne({ where: { slug: 'default' } });

    if (!tenant) {
      tenant = this.tenantRepo.create({ name: 'Default', slug: 'default', settings: {} });
      tenant = await this.tenantRepo.save(tenant);
    }

    let user = await this.userRepo.findOne({
      where: { oauthProvider: provider, oauthId: profile.id, tenantId: tenant.id },
      relations: ['roles'],
    });

    if (!user) {
      user = this.userRepo.create({
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl || null,
        oauthProvider: provider,
        oauthId: profile.id,
        tenantId: tenant.id,
      });
      user = await this.userRepo.save(user);

      const viewerRole = await this.roleRepo.findOne({
        where: { slug: 'viewer', tenantId: tenant.id },
      });
      if (viewerRole) {
        user.roles = [viewerRole];
        await this.userRepo.save(user);
      }
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: this.getRefreshSecret() });
      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
        relations: ['roles'],
      });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, tenantId: payload.tenantId },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user || !user.isActive) return null;
    return user;
  }

  private generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles?.map((r) => r.slug) || [],
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.getRefreshSecret(),
        expiresIn: '7d',
      }),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        tenantId: user.tenantId,
        roles: user.roles?.map((r) => ({ id: r.id, name: r.name, slug: r.slug })) || [],
      },
    };
  }

  private getRefreshSecret(): string {
    return (process.env.JWT_REFRESH_SECRET || 'orbit-cms-refresh-secret');
  }
}
