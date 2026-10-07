# APEX API

This document records the API endpoints that are actually implemented in the APEX backend.

## Base URL

- Development: `http://localhost:3000/api/v1`
- Production: configured by the backend environment

## Authentication

### POST /auth/login

- Auth required: No
- Description: Authenticates a registered user and returns a JWT payload plus refresh token details.
- Request body:
  ```json
  {
    "username": "owner",
    "password": "secure-password"
  }
  ```
- Success response: `200 OK`
  ```json
  {
    "statusCode": 200,
    "data": {
      "userId": "<user-object-id>",
      "username": "owner",
      "vehicleId": "APEX-01",
      "role": "owner",
      "accessToken": "<jwt>",
      "refreshToken": "<jwt>",
      "expiresIn": 3600
    },
    "message": "User logged in successfully"
  }
  ```
- Error responses:
  - `400` invalid request payload
  - `401` invalid credentials

### POST /auth/refresh

- Auth required: Yes (valid refresh token)
- Description: Refreshes the access token for an authenticated session.

## Vehicles

### GET /vehicles/me

- Auth required: Yes
- Description: Returns the current vehicle associated with the authenticated user.
- Success response: `200 OK`
  ```json
  {
    "statusCode": 200,
    "data": {
      "vehicleId": "APEX-01",
      "name": "APEX Rover",
      "status": "online",
      "telemetry": {
        "gpsFix": true,
        "latitude": 19.076,
        "longitude": 72.8777,
        "gpsSpeed": 12.5,
        "wifiRSSI": -52,
        "roverState": "IDLE"
      },
      "lastTelemetryAt": "2026-01-01T12:00:00.000Z",
      "geofence": {
        "enabled": true,
        "latitude": 19.076,
        "longitude": 72.8777,
        "radiusMeters": 100,
        "state": "INSIDE"
      }
    },
    "message": "Vehicle data retrieved"
  }
  ```

### GET /vehicles/me/geofence

- Auth required: Yes
- Description: Retrieves the configured geofence.

### PUT /vehicles/me/geofence

- Auth required: Yes
- Description: Updates or creates the vehicle geofence.
- Request body:
  ```json
  {
    "enabled": true,
    "latitude": 19.076,
    "longitude": 72.8777,
    "radiusMeters": 100
  }
  ```
- Success response: `200 OK`
  ```json
  {
    "statusCode": 200,
    "data": {
      "enabled": true,
      "latitude": 19.076,
      "longitude": 72.8777,
      "radiusMeters": 100,
      "state": "UNKNOWN"
    },
    "message": "Geofence updated"
  }
  ```

### DELETE /vehicles/me/geofence

- Auth required: Yes
- Description: Disables the geofence and clears stored values.

### GET /vehicles/me/history

- Auth required: Yes
- Description: Retrieves the latest active events and snapshots for the current vehicle.
- Success response: `200 OK`
  ```json
  {
    "statusCode": 200,
    "data": {
      "events": [
        {
          "_id": "<event-id>",
          "vehicle": "<vehicle-id>",
          "vehicleId": "APEX-01",
          "type": "FIRE_DETECTED",
          "message": "Fire detected near rover",
          "latitude": 19.076,
          "longitude": 72.8777,
          "createdAt": "2026-01-01T12:00:00.000Z",
          "updatedAt": "2026-01-01T12:00:00.000Z"
        }
      ],
      "snapshots": [
        {
          "_id": "<snapshot-id>",
          "vehicle": "<vehicle-id>",
          "vehicleId": "APEX-01",
          "latitude": 19.076,
          "longitude": 72.8777,
          "detectionStatus": "AVAILABLE",
          "detectedObjects": [{ "className": "person", "confidence": 0.92 }],
          "source": "ESP32-CAM live stream",
          "createdAt": "2026-01-01T12:00:00.000Z"
        }
      ]
    },
    "message": "Vehicle history retrieved"
  }
  ```

### POST /vehicles/me/detections

- Auth required: Yes
- Description: Sends a JPEG frame for YOLO object detection. This endpoint is used by the rover camera and AI workflow.
- Content-Type: `image/jpeg`
- Success response: `200 OK`
  ```json
  {
    "statusCode": 200,
    "data": {
      "status": "ACTIVE",
      "imageWidth": 640,
      "imageHeight": 480,
      "detections": [
        {
          "className": "person",
          "confidence": 0.95,
          "x": 0,
          "y": 0,
          "width": 57,
          "height": 86
        }
      ],
      "nextFrameInMs": 200
    },
    "message": "Object detections received"
  }
  ```

### POST /vehicles/me/snapshots

- Auth required: Yes
- Description: Saves a JPEG snapshot from the rover and stores detection metadata if available.
- Content-Type: `image/jpeg`
- Success response: `201 Created`
  ```json
  {
    "statusCode": 201,
    "data": {
      "_id": "<snapshot-id>",
      "vehicle": "<vehicle-id>",
      "vehicleId": "APEX-01",
      "latitude": 19.076,
      "longitude": 72.8777,
      "detectedObjects": [{ "className": "person", "confidence": 0.92 }],
      "detectionStatus": "AVAILABLE",
      "source": "ESP32-CAM live stream",
      "createdAt": "2026-01-01T12:00:00.000Z"
    },
    "message": "Snapshot saved"
  }
  ```

### GET /vehicles/me/snapshots/:snapshotId/image

- Auth required: Yes
- Description: Returns the image bytes for a saved snapshot.
- Response: binary JPEG image

## Future / planned APIs

The project currently does not implement a public registration API or full vehicle CRUD endpoints. Those are intentionally left undocumented as implemented features.
