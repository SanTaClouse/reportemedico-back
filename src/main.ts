import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { AppModule } from './app.module'

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production'

  const app = await NestFactory.create(AppModule, {
    logger: isProd
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  })

  // HTTP request logging: colorido en dev, formato Apache en prod
  app.use(morgan(isProd ? 'combined' : 'dev'))

  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              frameSrc: ['https://e.issuu.com', 'https://www.youtube.com'],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false, // Desactivar CSP en desarrollo para no bloquear herramientas
    }),
  )
  app.use(cookieParser())

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const port = process.env.PORT || 3001
  await app.listen(port)
  Logger.log(`Backend running on http://localhost:${port} [${isProd ? 'production' : 'development'}]`, 'Bootstrap')
}

bootstrap()
