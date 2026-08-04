import * as dns from 'dns';
import * as fs from 'fs';
import * as path from 'path';

// Fix for Node.js SRV DNS resolution failing on Windows (querySrv ECONNREFUSED).
// Only override DNS servers if we encounter an SRV lookup error, to avoid blocking DNS on restricted networks.
try {
  let mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../.env'),
    ];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^MONGODB_URI\s*=\s*(.+)$/m);
        if (match) {
          mongoUri = match[1].trim().replace(/['"]/g, '');
          break;
        }
      }
    }
  }

  if (mongoUri && mongoUri.startsWith('mongodb+srv://')) {
    const hostPart = mongoUri.split('@')[1]?.split('/')[0]?.split('?')[0];
    if (hostPart) {
      dns.resolveSrv(`_mongodb._tcp.${hostPart}`, (err) => {
        if (err && (err.code === 'ECONNREFUSED' || err.code === 'ESERVFAIL' || err.code === 'EREFUSED')) {
          console.warn(`[DNS] SRV lookup failed for ${hostPart} (${err.code}). Applying Google/Cloudflare DNS fallback...`);
          try {
            dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
          } catch (dnsErr) {
            console.error('[DNS] Failed to set custom DNS servers:', dnsErr);
          }
        }
      });
    }
  }
} catch (err) {
  // Ignore filesystem or parsing errors
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
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

  const configuredOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        configuredOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        configuredOrigins.includes('*')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  });

  app.use(cookieParser());

  // ── Global Prefix ─────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Validation ────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
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
  console.log(`\n🎬 INTERLUDE Backend running on http://localhost:${port}/api`);
  console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs\n`);
}

bootstrap();
