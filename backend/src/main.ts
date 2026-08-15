import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false,
  });

  // ── Security ──────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          mediaSrc: ["'self'", 'https://archive.org', 'https://ia800*.archive.org', 'blob:'],
          connectSrc: ["'self'", 'https://archive.org'],
        },
      },
    }),
  );

  app.set('trust proxy', 1);

  const configuredOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/+$/, ''))
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      // Dynamically echo requesting origin to support main domain, custom domains, and Vercel
      return callback(null, origin || true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
    ],
  });

  app.use(cookieParser());

  // ── Global Prefix ─────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Static Assets (Local Uploads Fallback) ────────────────
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/api/uploads',
  });

  // ── Validation ────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Swagger API Docs ──────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('INTERLUDE API')
      .setDescription('INTERLUDE – Premium Social Movie Streaming Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 4000;

  await app.listen(port);

  console.log(`🎬 INTERLUDE Backend running on port ${port}`);
}

bootstrap();
