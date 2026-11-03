# APEX API

The backend API is mounted at `/api/v1`. For local development, the base URL
is `http://localhost:3000/api/v1`.

## Authentication routes

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

## Vehicle routes

All routes below require a valid access token.

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

JPEG endpoints require `Content-Type: image/jpeg`. The backend checks the
authenticated user's vehicle ownership before returning data.

## Health routes

These routes do not require authentication:

- `GET /health`
- `GET /ready`
- `GET /health-check`

## WebSocket communication

The backend WebSocket server runs on the same server. Dashboard clients use
the access token. The ESP32 rover and ESP32-CAM use `x-device-id` and
`x-device-token`. The camera also sends `x-device-type: camera`.

- The rover sends JSON telemetry and receives JSON commands.
- The camera sends binary JPEG frames.
- The backend forwards valid frames to the dashboard.

## Common errors

- `400`: invalid request data.
- `401`: missing or invalid login/device authentication.
- `404`: requested vehicle, snapshot, or resource was not found.
- `415`: detection or snapshot body is not `image/jpeg`.
- `500`: server, database, or AI service error.
