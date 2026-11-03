# APEX Environment Configuration

Environment variables keep URLs, database settings, and secrets outside the
source code. Copy each example file to `.env` and replace placeholders only
on your own machine.

## Frontend: `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000
VITE_LOCATIONIQ_TOKEN=YOUR_LOCATIONIQ_TOKEN
```

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend REST base URL |
| `VITE_WS_URL` | Backend WebSocket URL |
| `VITE_LOCATIONIQ_TOKEN` | Optional map lookup token |

For an ESP32 on the same LAN, use `http://YOUR_BACKEND_HOST:3000/api/v1`
and `ws://YOUR_BACKEND_HOST:3000`.

## Backend: `backend/.env`

```env
HOST=0.0.0.0
PORT=3000
CORS_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/apex
DEVICE_HEARTBEAT_TIMEOUT_MS=15000
NODE_ENV=development
ACCESS_TOKEN_SECRET=YOUR_ACCESS_SECRET
ACCESS_TOKEN_EXPIRY=3600
REFRESH_TOKEN_SECRET=YOUR_REFRESH_SECRET
REFRESH_TOKEN_EXPIRY=604800
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TOKEN=YOUR_AI_TOKEN
YOLO_ENABLED=true
YOLO_CONFIDENCE_THRESHOLD=0.35
YOLO_DETECTION_FPS=5
```

| Variable | Purpose |
| --- | --- |
| `HOST`, `PORT` | Backend address and port |
| `CORS_ORIGIN` | Frontend origin allowed by the backend |
| `MONGODB_URI` | MongoDB connection string |
| `DEVICE_HEARTBEAT_TIMEOUT_MS` | Time before a silent device is offline |
| `ACCESS_TOKEN_SECRET` | Signs access tokens |
| `ACCESS_TOKEN_EXPIRY` | Access token lifetime |
| `REFRESH_TOKEN_SECRET` | Signs refresh tokens |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime |
| `AI_SERVICE_URL` | FastAPI service address |
| `AI_SERVICE_TOKEN` | Optional backend-to-AI authentication |
| `YOLO_ENABLED` | Enables or disables detection |
| `YOLO_CONFIDENCE_THRESHOLD` | General detection threshold |
| `YOLO_DETECTION_FPS` | Maximum detection request rate |

The complete supported list is in
[`backend/.env.example`](../backend/.env.example).

## AI service: `ai-service/.env`

```env
YOLO_MODEL=yolo11n.pt
YOLO_IMAGE_SIZE=512
YOLO_DEVICE=
AI_SERVICE_TOKEN=YOUR_AI_TOKEN
PERSON_CONFIDENCE_THRESHOLD=0.35
TRACK_HIGH_THRESHOLD=0.25
TRACK_LOW_THRESHOLD=0.10
TRACK_NEW_THRESHOLD=0.25
TRACK_BUFFER=15
TRACK_MATCH_THRESHOLD=0.80
TRACK_FUSE_SCORE=true
```

These values select the model, image size, device, person threshold, and
ByteTrack settings.

## Firmware: local `firmware_secrets.h`

```cpp
#define APEX_WIFI_SSID "YOUR_WIFI_NAME"
#define APEX_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define APEX_BACKEND_HOST "YOUR_BACKEND_HOST"
#define APEX_BACKEND_PORT 3000
#define APEX_BACKEND_USE_TLS 0
#define APEX_DEVICE_TOKEN "YOUR_DEVICE_TOKEN"
```

Use the tracked
[`firmware_secrets.example.h`](../esp32/firmware/firmware_secrets.example.h)
as the starting point. The local secrets header must not be committed.
