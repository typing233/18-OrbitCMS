import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ContentTypeModule } from './modules/content-type/content-type.module';
import { ContentModule } from './modules/content/content.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    MulterModule.register({ limits: { fileSize: 100 * 1024 * 1024 } }),
    AuthModule,
    ContentTypeModule,
    ContentModule,
    MediaModule,
    HealthModule,
  ],
})
export class AppModule {}
