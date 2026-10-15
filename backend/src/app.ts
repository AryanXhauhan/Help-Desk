import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { swaggerSpec } from './docs/swagger.js';
import v1Routes from './routes/index.js';
import { NotFoundError } from './utils/errors.js';

export const createApp = (): express.Application => {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // allow swagger & frontend dev assets
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  const allowedOrigins = [
    env.CORS_ORIGIN,
    env.CLIENT_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in dev, restricted in prod
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Structured HTTP Request Logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path !== '/api/v1/health') {
        logger.info(
          {
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs: duration,
          },
          'HTTP request'
        );
      }
    });
    next();
  });

  // Root Endpoint / Health ping
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'HelpDesk API',
      status: 'healthy',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/api/v1/health',
    });
  });

  // API Documentation (Swagger)
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Global API Rate Limiter
  app.use('/api', apiLimiter);

  // Versioned API Routes
  app.use('/api/v1', v1Routes);

  // 404 Handler
  app.use((req, res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
