# APEX Environment Variables

This document lists the environment variables that the current project actually reads from `.env` files.

## Frontend

The frontend reads the following values from `frontend/.env`:

- `VITE_API_BASE_URL`: API base URL for REST requests
- `VITE_WS_URL`: WebSocket URL for live vehicle events
- `VITE_LOCATIONIQ_TOKEN`: token for location-based lookups
- `VITE_CAMERA_WS_URL`: websocket URL for camera stream access

Example:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000
VITE_LOCATIONIQ_TOKEN=YOUR_VALUE_HERE
VITE_CAMERA_WS_URL=ws://localhost:3000
```

## Backend

The backend reads the following values from `backend/.env`:

- `PORT`: server port, default `3000`
- `CORS_ORIGIN`: allowed frontend origin
- `NODE_ENV`: runtime mode (`development` / `production`)
- `MONGODB_URI`: MongoDB connection string
- `DEVICE_TOKEN`: device token for rover or controller access
- `SEED_ADMIN_PASSWORD`: initial seed password for admin user creation
- `ACCESS_TOKEN_SECRET`: JWT secret for access tokens
- `ACCESS_TOKEN_EXPIRY`: access token lifetime
- `REFRESH_TOKEN_SECRET`: JWT secret for refresh tokens
- `REFRESH_TOKEN_EXPIRY`: refresh token lifetime
- `CLOUDINARY_CLOUD_NAME`: optional cloud storage config
- `CLOUDINARY_API_KEY`: optional cloud storage config
- `CLOUDINARY_API_SECRET`: optional cloud storage config
- `AI_SERVICE_URL`: object-detection service address
- `AI_SERVICE_TOKEN`: optional token for the AI inference service
- `YOLO_ENABLED`: toggles YOLO detection processing
- `YOLO_CONFIDENCE_THRESHOLD`: confidence threshold for object detection
- `YOLO_DETECTION_FPS`: target detection frame rate

Example:

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/apex
DEVICE_TOKEN=YOUR_VALUE_HERE
SEED_ADMIN_PASSWORD=YOUR_VALUE_HERE
ACCESS_TOKEN_SECRET=YOUR_VALUE_HERE
ACCESS_TOKEN_EXPIRY=3600
REFRESH_TOKEN_SECRET=YOUR_VALUE_HERE
REFRESH_TOKEN_EXPIRY=604800
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_TOKEN=YOUR_VALUE_HERE
YOLO_ENABLED=true
YOLO_CONFIDENCE_THRESHOLD=0.50
YOLO_DETECTION_FPS=5
```

## Required vs optional

Required for a working local deployment:
- `MONGODB_URI`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `CORS_ORIGIN`

Optional depending on deployment:
- `CLOUDINARY_*`
- `AI_SERVICE_TOKEN`
- `DEVICE_TOKEN`
- `LOCATIONIQ_TOKEN`
