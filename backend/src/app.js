import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import env from './config/env.config.js';
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

// Import Routers

app.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'APEX is running!' });
});

app.use(errorHandler);

export default app;
