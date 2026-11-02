# APEX

APEX is a local-first IoT rover monitoring platform for ESP32 telemetry,
camera streaming, YOLO object detection, ByteTrack tracking, snapshots, and
events.

## Features

- React dashboard with live camera, telemetry, controls, events, and snapshots.
- Authenticated Node.js/Express API and MongoDB persistence.
- ESP32-CAM WebSocket streaming and ESP32 device telemetry/control.
- FastAPI Ultralytics YOLO11 inference with persistent per-camera ByteTrack IDs.
- Automatic device provisioning and owner-only token management.
- Automatic, deduplicated detection events and snapshots.

## Local development

1. Copy `backend/.env.example` to `backend/.env` and configure MongoDB and JWT
   secrets.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Configure `ai-service/.env` and start the FastAPI service.
4. Start the backend and frontend with the existing package scripts.
5. Configure the ESP32 using the ignored `firmware_secrets.h` header.

See [APEX_DOCUMENTATION.md](./APEX_DOCUMENTATION.md) for the architecture,
API, provisioning, firmware, detection, event, and troubleshooting details.
