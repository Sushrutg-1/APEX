# APEX Environment Variables

This document lists the environment variables that the current project actually reads from `.env` files.

## Frontend

The frontend reads the following values from `frontend/.env`:

- `VITE_API_BASE_URL`: API base URL for REST requests
- `VITE_WS_URL`: WebSocket URL for live vehicle events
- `VITE_LOCATIONIQ_TOKEN`: token for location-based lookups

Example:

```env
VITE_API_BASE_URL=http://10.143.38.45:3000/api/v1
VITE_WS_URL=ws://10.143.38.45:3000
VITE_LOCATIONIQ_TOKEN=YOUR_VALUE_HERE
```

## Backend

The backend reads the following values from `backend/.env`:

- `HOST`: listening interface, default `0.0.0.0`
- `PORT`: server port, default `3000`
- `CORS_ORIGIN`: allowed frontend origin
- `DEVICE_HEARTBEAT_TIMEOUT_MS`: telemetry timeout before the device is offline
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
HOST=0.0.0.0
PORT=3000
CORS_ORIGIN=http://10.143.38.45:5173
DEVICE_HEARTBEAT_TIMEOUT_MS=15000
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

## Camera firmware

The camera no longer connects directly to the Vite server. Set `APEX_BACKEND_HOST`
in `esp32/firmware/APEX_ESP32_Firmware/firmware_secrets.h` to the laptop's
reachable Wi-Fi address (for example `10.143.38.45`) and keep the backend port at
`3000`. The camera authenticates to the backend WebSocket with the same device ID
and token, then the backend relays verified JPEG frames to the dashboard.

The laptop and camera must be on the same reachable Wi-Fi network. Allow inbound
TCP `3000` in Windows Defender Firewall for the backend (Private networks only).
If the laptop changes networks, verify its IPv4 address and update both the
frontend `.env` values and firmware configuration; do not assume `10.143.38.45`
will remain valid. Prefer a DHCP reservation or a manual address outside the
router's DHCP pool.

The camera sketch prints an SCCB scan and the sensor PID/model reported by the
installed `esp32-camera` driver. The RHYX M21-45 marking is not sufficient to
identify the sensor, so do not select a sensor model solely from that marking.
The installed Arduino-ESP32 3.3.12 driver supports several sensor families and
the serial diagnostic is required to determine which one is actually fitted.
If JPEG initialization is rejected with `ESP_ERR_NOT_SUPPORTED`, the sketch
tries RGB565 and software JPEG conversion only when the sensor driver accepts
that raw format. It never labels raw bytes as JPEG and it reports failure when
the sensor itself is unsupported.
