import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { TenantGuard } from './guards/tenant.guard';
import { AuditService } from './audit.service';
import { UsersService } from './users.service';
import { RolesService } from './roles.service';
import { UsersController } from './users.controller';
import { RolesController } from './roles.controller';
import { AuditController } from './audit.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, Role, Permission, AuditLog]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'orbit-cms-secret-change-in-production'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '24h') },
      }),
    }),
  ],
  controllers: [AuthController, UsersController, RolesController, AuditController],
  providers: [
    AuthService,
    UsersService,
    RolesService,
    AuditService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    TenantGuard,
  ],
  exports: [AuthService, UsersService, RolesService, AuditService, JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard],
})
export class AuthModule {}
