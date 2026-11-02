import Vehicle from '../models/Vehicle.model.js';
import env from '../config/env.config.js';
import {
  getControllerSocket,
  hasActiveDeviceConnection,
} from './websocket.manager.js';

const OPEN = 1;
const lastSeenWrites = new Map();

const getDeviceStatus = (vehicleId) =>
  hasActiveDeviceConnection(vehicleId) ? 'online' : 'offline';

const isDeviceHeartbeatExpired = (lastSeenAt, now = Date.now()) =>
  lastSeenAt instanceof Date &&
  now - lastSeenAt.getTime() >= env.DEVICE_HEARTBEAT_TIMEOUT_MS;

const getTelemetryStatus = (vehicle) => {
  if (!vehicle?.lastTelemetryAt || getDeviceStatus(vehicle.vehicleId) === 'offline') {
    return vehicle?.lastTelemetryAt ? 'STALE' : 'NOT_RECEIVED';
  }

  return Date.now() - new Date(vehicle.lastTelemetryAt).getTime() <= env.DEVICE_HEARTBEAT_TIMEOUT_MS
    ? 'RECEIVING'
    : 'STALE';
};

const notifyController = (vehicleId, message) => {
  const controller = getControllerSocket(vehicleId);
  if (controller?.readyState === OPEN) {
    controller.send(JSON.stringify(message));
  }
};

const notifyDeviceStatus = (vehicleId, status = getDeviceStatus(vehicleId), lastSeenAt = null) => {
  notifyController(vehicleId, {
    type: 'DEVICE_STATUS',
    vehicleId,
    status,
    lastSeenAt,
  });
};

const notifyTelemetryStatus = (vehicleId, status, lastTelemetryAt = null) => {
  notifyController(vehicleId, {
    type: 'TELEMETRY_STATUS',
    vehicleId,
    status,
    lastTelemetryAt,
  });
};

const markDeviceOnline = async (vehicleId, socket) => {
  if (!hasActiveDeviceConnection(vehicleId)) {
    return null;
  }

  const lastSeenAt = new Date();
  const vehicle = await Vehicle.findOneAndUpdate(
    { vehicleId },
    { $set: { status: 'online', lastSeenAt } },
    { returnDocument: 'after' }
  );

  if (vehicle) {
    lastSeenWrites.set(vehicleId, Date.now());
    notifyDeviceStatus(vehicleId, 'online', lastSeenAt.toISOString());
  }

  return vehicle;
};

const touchDevice = async (vehicleId, socket) => {
  if (!hasActiveDeviceConnection(vehicleId)) {
    return;
  }

  const now = Date.now();
  if (now - (lastSeenWrites.get(vehicleId) || 0) < 1000) {
    return;
  }

  if (socket && socket.device?.vehicleId !== vehicleId) {
    return;
  }

  const lastSeenAt = new Date(now);
  await Vehicle.updateOne(
    { vehicleId },
    { $set: { status: 'online', lastSeenAt } }
  );
  lastSeenWrites.set(vehicleId, now);
};

const markDeviceOfflineIfDisconnected = async (vehicleId, socket) => {
  if (hasActiveDeviceConnection(vehicleId)) {
    return false;
  }

  const result = await Vehicle.updateOne(
    { vehicleId, status: { $ne: 'offline' } },
    { $set: { status: 'offline' } }
  );

  notifyDeviceStatus(vehicleId, 'offline');
  notifyTelemetryStatus(vehicleId, 'STALE');
  lastSeenWrites.delete(vehicleId);
  return result.matchedCount > 0;
};

export {
  getDeviceStatus,
  isDeviceHeartbeatExpired,
  getTelemetryStatus,
  markDeviceOnline,
  touchDevice,
  markDeviceOfflineIfDisconnected,
  notifyDeviceStatus,
  notifyTelemetryStatus,
};
