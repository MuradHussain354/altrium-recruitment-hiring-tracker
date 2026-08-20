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
import interviewRoutes from './routes/interview.routes';
import feedbackRoutes from './routes/feedback.routes';
import notificationRoutes from './routes/notification.routes';
import reportRoutes from './routes/report.routes';
import teamRoutes from './routes/team.routes';
import { errorHandler } from './middlewares/error.middleware';

dotenv.config();

const app: Application = express();

// Global Middlewares
app.use(cors());
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
app.use('/api/v1/applications', applicationManagementRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/interviews', feedbackRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);

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
