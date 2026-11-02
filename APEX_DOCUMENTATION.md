# APEX Documentation

## 1. Overview

APEX is a local-development IoT platform for monitoring and controlling an
ESP32 rover. The system combines telemetry, camera streaming, authenticated
WebSockets, YOLO11 object detection, ByteTrack tracking, snapshots, and event
history.

This document describes the implementation currently present in this
repository, including the health endpoints used by deployed services. It does
not require Docker.

## 2. Objectives and features

- Secure user registration and login.
- One vehicle and device credential set per registered user.
- Live telemetry and camera frames.
- Configurable YOLO11 CPU/CUDA inference.
- Persistent ByteTrack state per vehicle.
- Automatic deduplicated object events and snapshots.
- Owner-scoped device provisioning and token rotation.

## 3. Architecture

- `frontend/`: React/Vite dashboard, Redux state, REST client, and browser
  WebSocket client.
- `backend/`: Express REST API, MongoDB/Mongoose models, JWT middleware,
  WebSocket server, device and camera handlers, and YOLO proxy service.
- `ai-service/`: FastAPI service running Ultralytics YOLO11 and ByteTrack.
- `esp32/firmware/`: Arduino sketches for the rover and ESP32-CAM.

The ESP32-CAM authenticates with `x-device-id`, `x-device-token`, and
`x-device-type: camera`. The backend validates these against the vehicle,
then relays binary JPEG frames to the authenticated dashboard controller.

## 4. Requirements

- Windows/macOS/Linux development laptop.
- Node.js and pnpm.
- Python 3.12 recommended for the AI service.
- MongoDB.
- ESP32-CAM and compatible Arduino ESP32 board support.
- Same reachable LAN for the ESP32 and backend laptop.

## 5. Running locally

### Backend

```powershell
Copy-Item backend/.env.example backend/.env
pnpm --dir backend install
pnpm --dir backend dev
```

The backend defaults to `0.0.0.0:3000`.

### Frontend

```powershell
Copy-Item frontend/.env.example frontend/.env
pnpm --dir frontend install
pnpm --dir frontend dev
```

### AI service

```powershell
Set-Location ai-service
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

The first model startup may download `yolo11n.pt` to the local cache.

### Deployment health checks

Use these public endpoints for deployed services:

- Backend health: `https://BACKEND-URL/health`
- Backend readiness: `https://BACKEND-URL/ready`
- AI service health: `https://AI-SERVICE-URL/health`
- AI readiness: `https://AI-SERVICE-URL/ready`

Configure Render's health check path as `/health`. If the goal is to reduce
free-tier spin-down, configure an external uptime monitor to request each
deployed Render service's `/health` endpoint every 10–12 minutes. The Netlify
frontend is a static site and does not need a keep-alive endpoint.

## 6. Environment configuration

Backend variables are documented in `backend/.env.example` and
[docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md). Important values include:

- `MONGODB_URI`
- `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`
- `HOST`, `PORT`, and `CORS_ORIGIN`
- `AI_SERVICE_URL` and optional `AI_SERVICE_TOKEN`
- `YOLO_ENABLED`, `YOLO_CONFIDENCE_THRESHOLD`, and `YOLO_DETECTION_FPS`

AI variables include `YOLO_MODEL`, `YOLO_IMAGE_SIZE`, `YOLO_DEVICE`,
`PERSON_CONFIDENCE_THRESHOLD`, and ByteTrack thresholds. Model weights and
secrets are ignored by Git.

## 7. Database models

- `User`: name, normalized email/username, password hash, vehicle ID, role.
- `Vehicle`: vehicle ID, owner, device token, status, telemetry, geofence.
- `Snapshot`: owner-scoped JPEG, detection metadata, coordinates, and event ID.
- `Event`: owner-scoped event type, message, coordinates, detection details,
  confidence, class, track ID, and optional snapshot ID.

The User-to-Vehicle relationship is one-to-one through `User.vehicleId` and
`Vehicle.owner`. Events and snapshots reference the Vehicle document.

## 8. Registration and provisioning

`POST /api/v1/auth/register` accepts `fullName`, `email`, `password`, and
`confirmPassword`. The backend normalizes the email, hashes the password,
generates a random `APEX-XXXXXX` vehicle ID, generates a cryptographically
random device token, and creates the associated Vehicle.

After login, the dashboard calls:

- `GET /api/v1/vehicles/me/provisioning`: returns owner-scoped vehicle details
  with a masked token by default.
- `GET /api/v1/vehicles/me/provisioning?reveal=true`: returns the owner’s
  current token.
- `POST /api/v1/vehicles/me/provisioning/token`: invalidates the old token,
  generates a new token, and returns it once for firmware configuration.

All provisioning endpoints require the existing Bearer access token. Tokens
are never included in public vehicle responses, event responses, logs, or
other users’ data.

## 9. ESP32-CAM setup

Copy the tracked example header to the ignored local header:

```text
esp32/firmware/firmware_secrets.example.h
  -> esp32/firmware/APEX_ESP32_Firmware/firmware_secrets.h
```

Set the actual local values:

```cpp
#define APEX_WIFI_SSID "your-wifi"
#define APEX_WIFI_PASSWORD "your-password"
#define APEX_BACKEND_HOST "192.168.x.x"
#define APEX_DEVICE_TOKEN "token-from-dashboard"
```

The current firmware uses `DEVICE_ID = "APEX-01"` and port `3000`; new
registrations should use the vehicle ID shown in the dashboard and update the
firmware constant if the sketch is provisioned for another vehicle.

Run `ipconfig` to find the laptop IPv4 address on the same subnet as the
camera. Verify the backend listener:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

Allow TCP 3000 on Windows Defender Firewall for the Private network only.
Do not disable the firewall globally. Upload the firmware, open serial
monitoring, and verify `CONNECTED` plus the dashboard camera status.

## 10. WebSocket flow

The backend upgrades WebSocket requests and distinguishes dashboard clients
from devices using headers. Dashboard clients authenticate with a JWT query
parameter or Bearer header. Camera frames remain binary JPEG messages and are
forwarded without changing the existing protocol.

## 11. Detection and tracking

The frontend keeps at most one pending detection frame. A newer frame replaces
an unprocessed pending frame. The request is made independently of the camera
WebSocket handler, so slow inference cannot block frame relay.

The backend sends JPEGs to `POST /detect` in the AI service. YOLO11n uses
512px by default based on the local benchmark. COCO person class `0` has a
configurable threshold (`PERSON_CONFIDENCE_THRESHOLD`, default `0.35`), while
other supported classes retain the normal threshold.

ByteTrack state is persistent per authenticated vehicle. Track IDs survive
brief missed detections and expire after the configured track buffer. The
frontend rejects detection messages older than the newest displayed frame.

## 12. Automatic events and snapshots

When a valid live detection result arrives, the backend immediately sends the
detection response to the dashboard. In parallel, it persists at most five
new detection candidates per frame. A tracked object uses `trackId` as its
deduplication key; detections without a track ID use their class name.

The current cooldown is 30 seconds. A new candidate creates an automatic
Snapshot and an `OBJECT_DETECTED` Event containing class, confidence, track ID,
coordinates, and snapshot ID. Persistence errors are logged without delaying
live detection responses. Snapshot and event records are owner-scoped through
the vehicle relationship.

Manual snapshots remain available at `POST /api/v1/vehicles/me/snapshots` and
continue to create `SNAPSHOT` events.

## 13. Dashboard

- Overview: status, telemetry, live camera, weather, and device provisioning.
- Control: authenticated rover movement and camera controls.
- Events: filtered event history with detection confidence and track ID.
- Snapshots: saved images and detection metadata.
- History: combined event and snapshot timeline.

The dark sidebar uses the high-contrast dark APEX logo. Browser branding uses
the existing `frontend/public/brand/favicon.svg`.

## 14. API summary

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | No | Lightweight backend health |
| GET | `/ready` | No | Backend MongoDB readiness |
| GET | `/health-check` | No | Backend health |
| POST | `/api/v1/auth/register` | No | Register user and vehicle |
| POST | `/api/v1/auth/login` | No | Create access/refresh tokens |
| POST | `/api/v1/auth/refresh` | No | Refresh access token |
| GET | `/api/v1/vehicles/me` | Bearer | Vehicle and telemetry |
| GET | `/api/v1/vehicles/me/provisioning` | Bearer | Masked device setup |
| GET | `/api/v1/vehicles/me/provisioning?reveal=true` | Bearer | Owner token reveal |
| POST | `/api/v1/vehicles/me/provisioning/token` | Bearer | Rotate device token |
| GET | `/api/v1/vehicles/me/history` | Bearer | Events and snapshots |
| POST | `/api/v1/vehicles/me/detections` | Bearer | JPEG live detection |
| POST | `/api/v1/vehicles/me/snapshots` | Bearer | Save manual snapshot |
| GET | `/api/v1/vehicles/me/snapshots/:id/image` | Bearer | Snapshot image |

Example registration request:

```json
{
  "fullName": "Example Owner",
  "email": "owner@example.test",
  "password": "StrongPass1",
  "confirmPassword": "StrongPass1"
}
```

Never place actual secrets, tokens, Wi-Fi passwords, or JWT values in this
document.

## 15. Security

Passwords use bcrypt. REST vehicle access requires JWT ownership checks.
Device authentication uses a separate device ID/token pair. Provisioning
tokens are masked unless explicitly requested by the authenticated owner.
Input validation, duplicate handling, payload limits, and error sanitization
remain enabled.

## 16. Troubleshooting

- **Camera offline:** check `ipconfig`, subnet alignment, backend listener,
  Windows Private firewall rule, device ID, and token.
- **AI unavailable:** check the AI health endpoint, `AI_SERVICE_URL`,
  `AI_SERVICE_TOKEN`, model availability, and Python environment.
- **No automatic events:** confirm detections contain valid boxes and inspect
  backend logs for MongoDB/storage errors; the 30-second cooldown is expected.
- **Old token rejected:** rotate the token in the dashboard and upload firmware
  with the new value.
- **No images:** verify MongoDB connectivity and the owner-scoped snapshot
  endpoint.

## 17. Testing

```powershell
python -m py_compile ai-service/main.py
pnpm --dir frontend lint
pnpm --dir frontend build
node --check backend/src/controllers/vehicle.controller.js
```

For end-to-end testing, register two users, verify each receives a distinct
vehicle ID/token, confirm cross-user provisioning is rejected, connect the
camera, move one or more objects through view, and verify stable track IDs,
cooldown behavior, event records, and snapshot images.

## 18. Limitations and future work

Automatic detection snapshots currently use the live JPEG that produced the
detection and MongoDB stores image bytes directly. A production deployment
would need a dedicated image store, retention policy, rate limiting, audited
token reveal, and richer event filtering. Those concerns are intentionally
outside this local-development upgrade.
