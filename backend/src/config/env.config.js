import dotenv from 'dotenv';

dotenv.config({
  path: './.env',
});

const parseBoolean = (name, fallback) => {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return fallback;
  }

  if (value.toLowerCase() === 'true') {
    return true;
  }

  if (value.toLowerCase() === 'false') {
    return false;
  }

  throw new Error(`${name} must be true or false`);
};

const parseNumber = (name, fallback, minimum, maximum) => {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be a number between ${minimum} and ${maximum}`);
  }

  return parsed;
};

const env = {
  PORT: process.env.PORT || 3000,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  NODE_ENV: process.env.NODE_ENV,

  MONGODB_URI: process.env.MONGODB_URI,
  DEVICE_TOKEN: process.env.DEVICE_TOKEN,
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,

  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY,

  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
  AI_SERVICE_TOKEN: process.env.AI_SERVICE_TOKEN || '',
  YOLO_ENABLED: parseBoolean('YOLO_ENABLED', true),
  YOLO_CONFIDENCE_THRESHOLD: parseNumber(
    'YOLO_CONFIDENCE_THRESHOLD',
    0.5,
    0,
    1
  ),
  YOLO_DETECTION_FPS: parseNumber('YOLO_DETECTION_FPS', 5, 1, 10),
};

export default env;
