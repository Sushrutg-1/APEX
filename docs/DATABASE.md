# APEX Database Guide

This document describes the database models that are present in the current codebase and the retention model used for event/snapshot cleanup.

## Models

### User

Purpose: stores authenticated users and vehicle ownership.

Fields:
- `username`: String, required, unique
- `passwordHash`: String, required
- `vehicleId`: String, required, unique
- `role`: String, default `owner`
- `createdAt`, `updatedAt`: timestamps

Relationships:
- One user owns one vehicle

### Vehicle

Purpose: tracks the rover and telemetry state.

Fields:
- `vehicleId`: String, required, unique
- `name`: String, required
- `owner`: ObjectId reference to `User`
- `deviceToken`: String, required
- `status`: `online` or `offline`
- `telemetry`: Mixed / nullable
- `lastTelemetryAt`: Date
- `geofence`: object
  - `enabled`: Boolean
  - `latitude`: Number / null
  - `longitude`: Number / null
  - `radiusMeters`: Number / null
  - `state`: `UNKNOWN | INSIDE | OUTSIDE`
- `createdAt`, `updatedAt`: timestamps

Indexes:
- unique on `vehicleId`
- `owner` is unique for the current schema

### Event

Purpose: stores rover-generated alerts and system events.

Fields:
- `vehicle`: ObjectId reference to `Vehicle`
- `vehicleId`: String
- `isDeleted`: Boolean, default `false`
- `deletedAt`: Date / null
- `type`: enum values such as `GEOFENCE_VIOLATION`, `SNAPSHOT`, `FIRE_DETECTED`, `OBSTACLE_DETECTED`
- `message`: String
- `latitude`: Number
- `longitude`: Number
- `details`: Mixed
- `createdAt`, `updatedAt`: timestamps

Indexes:
- `{ vehicle: 1, createdAt: -1 }`
- `{ isDeleted: 1, createdAt: -1 }`
- `{ vehicle: 1, isDeleted: 1, createdAt: -1 }`

Soft deletion behavior:
- default query paths should exclude `isDeleted: true`
- records should be removed from visible queries after a soft-delete transition

### Snapshot

Purpose: stores captured rover frames and associated detection metadata.

Fields:
- `vehicle`: ObjectId reference to `Vehicle`
- `vehicleId`: String
- `isDeleted`: Boolean, default `false`
- `deletedAt`: Date / null
- `image`: Buffer, not selected by default
- `contentType`: `image/jpeg`
- `latitude`: Number / null
- `longitude`: Number / null
- `detectedObjects`: array of detection objects
- `detectionStatus`: `AVAILABLE | UNAVAILABLE`
- `imageWidth`, `imageHeight`: Number / null
- `source`: String
- `createdAt`, `updatedAt`: timestamps

Indexes:
- `{ vehicle: 1, createdAt: -1 }`
- `{ isDeleted: 1, createdAt: -1 }`
- `{ vehicle: 1, isDeleted: 1, createdAt: -1 }`

Soft deletion behavior:
- snapshot history queries filter to `isDeleted: false`
- image bytes remain available only when the snapshot is active

## Retention policy

The intended lifecycle is:

- `0-6 months`: active record
- `6-12 months`: soft deleted (`isDeleted = true`, `deletedAt = <timestamp>`)
- `12+ months`: permanently deleted by scheduled cleanup

This logic should be handled by a background cleanup job. Records should not be hard-deleted immediately after the six-month threshold.
