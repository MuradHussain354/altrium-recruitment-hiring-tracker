import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import positionRoutes from './routes/position.routes';
import publicRoutes from './routes/public.routes';
import stageRoutes from './routes/stage.routes';
import applicationManagementRoutes from './routes/application-management.routes';
import bulkRoutes from './routes/bulk.routes';
import exportRoutes from './routes/export.routes';
import savedFilterRoutes from './routes/saved-filter.routes';
import questionSetRoutes from './routes/question-set.routes';
import searchRoutes from './routes/search.routes';
import tagRoutes from './routes/tag.routes';
import interviewRoutes from './routes/interview.routes';
import feedbackRoutes from './routes/feedback.routes';
import notificationRoutes from './routes/notification.routes';
import reportRoutes from './routes/report.routes';
import teamRoutes from './routes/team.routes';
import auditLogRoutes from './routes/audit-log.routes';
import jobAlertRoutes from './routes/job-alert.routes';
import emailDeliveryLogRoutes from './routes/email-delivery-log.routes';
import { errorHandler } from './middlewares/error.middleware';

dotenv.config();

const app: Application = express();

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((url) => url.trim().replace(/\/+$/, '')) : [])
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, unit tests)
      if (!origin) {
        return callback(null, true);
      }
      if (
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS error: Origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Base Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/teams', teamRoutes);
app.use('/api/v1/positions', positionRoutes);
app.use('/api/v1/positions/:positionId/stages', stageRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/applications/bulk', bulkRoutes);
app.use('/api/v1/applications/export', exportRoutes);
app.use('/api/v1/applications', applicationManagementRoutes);
app.use('/api/v1/saved-filters', savedFilterRoutes);
app.use('/api/v1/question-sets', questionSetRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/interviews', feedbackRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/job-alerts', jobAlertRoutes);
app.use('/api/v1/email-logs', emailDeliveryLogRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'NotFound',
    message: 'The requested endpoint does not exist.'
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
