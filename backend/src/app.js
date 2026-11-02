import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';

import env from './config/env.config.js';

import authRoutes from './routes/auth.routes.js';
import testRoutes from './routes/test.routes.js';
import vehicleRoutes from './routes/vehicle.routes.js';

import errorHandler from './middlewares/errorHandler.middleware.js';

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

app.get('/health-check', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'APEX is running!',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'apex-backend',
  });
});

app.get('/ready', (req, res) => {
  const isDatabaseReady = mongoose.connection.readyState === 1;

  if (!isDatabaseReady) {
    return res.status(503).json({
      status: 'not_ready',
      service: 'apex-backend',
    });
  }

  return res.status(200).json({
    status: 'ready',
    service: 'apex-backend',
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/test', testRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);

app.use(errorHandler);

export default app;
