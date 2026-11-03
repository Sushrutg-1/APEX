# APEX API Reference

The APEX API is an Express REST API for authentication, vehicle data,
geofences, detection, snapshots, and history. It is mounted at `/api/v1`.
For local development, use `http://localhost:3000/api/v1`.

Responses use this common wrapper:

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Description of the result"
}
```

The `data` value depends on the endpoint. Access tokens are JWTs. Vehicle
routes require the access token and also verify that the user owns the
requested vehicle.

## Authentication APIs

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Creates a user and vehicle |
| POST | `/auth/login` | Logs in and returns access and refresh tokens |
| POST | `/auth/refresh` | Refreshes an access token |

Example registration body:

```json
{
  "fullName": "Example User",
  "email": "user@example.com",
  "password": "YOUR_PASSWORD",
  "confirmPassword": "YOUR_PASSWORD"
}
```

### POST `/auth/login`

Authentication: none. The `username` field accepts either the username or
email address.

```json
{
  "username": "user@example.com",
  "password": "YOUR_PASSWORD"
}
```

Successful response:

```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "user": {
      "id": "<user-id>",
      "username": "user@example.com",
      "role": "owner"
    },
    "vehicle": {
      "vehicleId": "APEX-ABC123",
      "name": "Example User's APEX Rover",
      "status": "offline"
    }
  },
  "message": "User logged in successfully"
}
```

Invalid input returns `400`. Invalid credentials return `401`. A user without
an assigned vehicle returns `403`.

### POST `/auth/refresh`

Authentication: none, but a valid refresh token is required in the body.

```json
{
  "refreshToken": "<refresh-jwt>"
}
```

The response contains a new `accessToken`. Missing or invalid refresh tokens
return `401`.

## Vehicle APIs

All routes below require a valid access token.

Send the token as:

```http
Authorization: Bearer <access-token>
```

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/vehicles/me` | Returns vehicle and telemetry |
| GET | `/vehicles/me/provisioning` | Returns device setup information |
| POST | `/vehicles/me/provisioning/token` | Rotates the device token |
| GET | `/vehicles/me/geofence` | Returns the geofence |
| PUT | `/vehicles/me/geofence` | Creates or updates the geofence |
| DELETE | `/vehicles/me/geofence` | Removes the geofence |
| GET | `/vehicles/me/history` | Returns events and snapshots |
| POST | `/vehicles/me/detections` | Accepts a JPEG for detection |
| POST | `/vehicles/me/snapshots` | Saves a JPEG snapshot |
| GET | `/vehicles/me/snapshots/:snapshotId/image` | Returns a saved JPEG |

### GET `/vehicles/me`

Returns the owner's vehicle:

```json
{
  "statusCode": 200,
  "data": {
    "vehicleId": "APEX-ABC123",
    "name": "Example User's APEX Rover",
    "status": "offline",
    "lastSeenAt": null,
    "telemetry": null,
    "lastTelemetryAt": null,
    "geofence": {
      "enabled": false,
      "latitude": null,
      "longitude": null,
      "radiusMeters": null,
      "state": "UNKNOWN"
    }
  },
  "message": "Vehicle data retrieved"
}
```

### Provisioning endpoints

`GET /vehicles/me/provisioning` returns the vehicle ID, name, status, last
seen time, and a masked token. Add `?reveal=true` to reveal the owner's token.
`POST /vehicles/me/provisioning/token` creates a new token and invalidates the
old one. The new token must be added to the firmware.

### Geofence endpoints

`PUT /vehicles/me/geofence` accepts:

```json
{
  "enabled": true,
  "latitude": 19.076,
  "longitude": 72.8777,
  "radiusMeters": 100
}
```

Coordinates must be valid latitude/longitude values. Radius must be greater
than `0` and no more than `100000` meters. `DELETE` disables the geofence and
clears its coordinates.

### GET `/vehicles/me/history`

Returns up to 100 active events and 24 active snapshots. Snapshot image bytes
are excluded from this response and are loaded from the image endpoint.

### POST `/vehicles/me/detections`

Content type: `image/jpeg`. The body is a JPEG frame of no more than 8 MB.
The backend sends it to the AI service when detection is enabled.

Possible `data.status` values are `ACTIVE`, `BUSY`, and `UNAVAILABLE`.
An active response includes image dimensions, timing values, detections, and
`nextFrameInMs`.

```json
{
  "statusCode": 200,
  "data": {
    "status": "ACTIVE",
    "imageWidth": 640,
    "imageHeight": 480,
    "inferenceMs": 42.1,
    "trackingMs": 1.4,
    "frameAgeMs": 12,
    "totalMs": 47.8,
    "detections": [
      {
        "className": "person",
        "confidence": 0.92,
        "x": 20,
        "y": 30,
        "width": 100,
        "height": 180,
        "trackId": 1
      }
    ],
    "nextFrameInMs": 200
  },
  "message": "Object detections received"
}
```

### POST `/vehicles/me/snapshots`

Content type: `image/jpeg`. The body is a JPEG of no more than 8 MB. The
backend stores the image, current GPS position when available, detection
results, dimensions, and source.

### GET `/vehicles/me/snapshots/:snapshotId/image`

Returns the stored image as binary `image/jpeg` after checking ownership.

JPEG endpoints require `Content-Type: image/jpeg`. The backend checks the
authenticated user's vehicle ownership before returning data.

## Health routes

These routes do not require authentication:

- `GET /health`
- `GET /ready`
- `GET /health-check`

## WebSocket Communication

The backend WebSocket server runs on the same server. Dashboard clients use
the access token. The ESP32 rover and ESP32-CAM use `x-device-id` and
`x-device-token`. The camera also sends `x-device-type: camera`.

- The rover sends JSON telemetry and receives JSON commands.
- The camera sends binary JPEG frames.
- The backend forwards valid frames to the dashboard.

Dashboard messages include `COMMAND`, `PING`, and `PONG`. Supported command
values are movement commands, `STOP`, `HORN`, `PAN`, and `TILT`. Movement
commands use `STEP` or `CONTINUOUS` mode. Servo values are integers from `0`
to `180`.

The server can send `CONTROLLER_CONNECTED`, `CAMERA_STATUS`,
`DEVICE_STATUS`, `TELEMETRY_STATUS`, `TELEMETRY`, `COMMAND_SENT`,
`COMMAND_ACK`, `DEVICE_ERROR`, `AI_STATUS`, and `OBJECT_DETECTION` messages.
The controller receives an automatic `STOP` when it disconnects.

## HTTP status codes and common errors

- `400`: invalid request data.
- `401`: missing or invalid login/device authentication.
- `404`: requested vehicle, snapshot, or resource was not found.
- `415`: detection or snapshot body is not `image/jpeg`.
- `500`: server, database, or AI service error.
