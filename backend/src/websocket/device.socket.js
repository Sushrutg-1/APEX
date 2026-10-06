import Vehicle from '../models/Vehicle.model.js';
import Event from '../models/Event.model.js';

import {
  setDeviceSocket,
  removeDeviceSocket,
  getDeviceSocket,
  getControllerSocket,
} from './websocket.manager.js';

const TELEMETRY_TIMEOUT_MS = 15000;
const SENSOR_STATE_LIMIT = 100;
const SENSOR_STATE_MAX_AGE_MS = 5 * 60 * 1000;

/*
 * Store telemetry timeout for each vehicle.
 */
const telemetryTimers = new Map();
const sensorEventStates = new Map();
const telemetryQueues = new Map();
let lastSensorStatePruneAt = 0;

/*
 * Clear existing telemetry timeout.
 */
const clearTelemetryTimer = (vehicleId) => {
  const timer = telemetryTimers.get(vehicleId);

  if (timer) {
    clearTimeout(timer);
    telemetryTimers.delete(vehicleId);
  }
};

/*
 * Start/restart telemetry timeout.
 *
 * ESP32 sends telemetry every 5 seconds.
 * If no telemetry is received for 15 seconds,
 * the device is considered offline.
 */
const startTelemetryTimer = (vehicleId, socket) => {
  clearTelemetryTimer(vehicleId);

  const timer = setTimeout(async () => {
    const activeSocket = getDeviceSocket(vehicleId);

    /*
     * Ignore timeout from an old socket if a new
     * ESP32 connection is already active.
     */
    if (activeSocket !== socket) {
      return;
    }

    console.log(`[DEVICE TIMEOUT] No telemetry received from vehicle: ${vehicleId}`);

    try {
      removeDeviceSocket(vehicleId, socket);

      await Vehicle.updateOne(
        {
          vehicleId,
        },
        {
          $set: {
            status: 'offline',
          },
        }
      );

      console.log(`[DEVICE OFFLINE] ${vehicleId} marked offline because telemetry stopped`);

      notifyControllerDeviceStatus(vehicleId, 'offline');

      if (socket.readyState === 1) {
        socket.close();
      }
    } catch (error) {
      console.error(`[DEVICE TIMEOUT ERROR] ${vehicleId}:`, error);
    }

    telemetryTimers.delete(vehicleId);
  }, TELEMETRY_TIMEOUT_MS);

  telemetryTimers.set(vehicleId, timer);
};

/*
 * Handle authenticated ESP32/device WebSocket connection.
 */
const handleDeviceSocket = (socket) => {
  const { vehicleId, name } = socket.device;
  const previousSocket = getDeviceSocket(vehicleId);

  console.log(`[DEVICE CONNECT] ${name} (${vehicleId}) connected`);

  /*
   * Register the ESP32 socket.
   */
  setDeviceSocket(vehicleId, socket);
  if (previousSocket && previousSocket !== socket && previousSocket.readyState === 1) {
    previousSocket.close(1000, 'Replaced by a newer device connection');
  }

  /*
   * Clear any previous timeout.
   */
  clearTelemetryTimer(vehicleId);

  /*
   * Confirm successful device connection.
   */
  sendMessage(socket, {
    type: 'DEVICE_CONNECTED',
    vehicleId,
    name,
    message: 'Device connected successfully',
  });

  /*
   * Notify dashboard that the vehicle is online.
   */
  notifyControllerDeviceStatus(vehicleId, 'online');

  /*
   * Start telemetry timeout.
   */
  startTelemetryTimer(vehicleId, socket);

  /*
   * Handle messages received from ESP32.
   */
  socket.on('message', async (message) => {
    if (getDeviceSocket(vehicleId) !== socket) {
      return;
    }

    let data;

    try {
      data = JSON.parse(message.toString());
    } catch (error) {
      console.error(`[DEVICE MESSAGE ERROR] ${vehicleId}:`, error);

      sendMessage(socket, {
        type: 'ERROR',
        code: 'INVALID_MESSAGE',
        message: 'Invalid message format',
      });
      return;
    }

    try {
      await handleDeviceMessage(socket, data);
    } catch (error) {
      console.error(`[DEVICE MESSAGE PROCESSING ERROR] ${vehicleId}:`, error);

      sendMessage(socket, {
        type: 'ERROR',
        code: 'DEVICE_MESSAGE_FAILED',
        message: 'Device message could not be processed',
      });
    }
  });

  /*
   * Handle ESP32 disconnect.
   */
  socket.on('close', async () => {
    console.log(`[DEVICE DISCONNECT] ${name} (${vehicleId}) disconnected`);

    /*
     * Only remove the socket if this is still
     * the active device connection.
     */
    const activeSocket = getDeviceSocket(vehicleId);

    if (activeSocket !== socket) {
      return;
    }

    clearTelemetryTimer(vehicleId);

    const removed = removeDeviceSocket(vehicleId, socket);

    if (!removed) {
      return;
    }

    try {
      await Vehicle.updateOne(
        {
          vehicleId,
        },
        {
          $set: {
            status: 'offline',
          },
        }
      );
    } catch (error) {
      console.error(`[DEVICE OFFLINE ERROR] ${vehicleId}:`, error);
    }

    notifyControllerDeviceStatus(vehicleId, 'offline');
  });

  /*
   * Handle ESP32 socket errors.
   */
  socket.on('error', (error) => {
    console.error(`[DEVICE SOCKET ERROR] ${vehicleId}:`, error);
  });
};

/*
 * Handle all messages received from ESP32.
 */
const handleDeviceMessage = async (socket, data) => {
  if (!data || typeof data !== 'object') {
    sendMessage(socket, {
      type: 'ERROR',
      message: 'Invalid device message',
    });

    return;
  }

  switch (data.type) {
    /*
     * ESP32 telemetry.
     */
    case 'TELEMETRY':
      await handleTelemetry(socket, data);
      break;

    /*
     * ESP32 heartbeat.
     */
    case 'PING':
      handlePing(socket);
      break;

    /*
     * ESP32 command acknowledgement.
     */
    case 'COMMAND_ACK':
      handleCommandAck(socket, data);
      break;

    /*
     * ESP32 reports an error.
     */
    case 'ERROR':
      handleDeviceError(socket, data);
      break;

    default:
      console.log(`[DEVICE MESSAGE] Unknown message from ${socket.device.vehicleId}:`, data);

      sendMessage(socket, {
        type: 'ERROR',
        message: 'Unknown device message type',
      });
  }
};

/*
 * Handle telemetry received from ESP32.
 */
const handleTelemetry = async (socket, data) => {
  const { vehicleId } = socket.device;
  const previous = telemetryQueues.get(vehicleId) || Promise.resolve();
  const processing = previous
    .catch(() => {})
    .then(() => processTelemetry(socket, data));
  telemetryQueues.set(vehicleId, processing);

  try {
    await processing;
  } finally {
    if (telemetryQueues.get(vehicleId) === processing) {
      telemetryQueues.delete(vehicleId);
    }
  }
};

const processTelemetry = async (socket, data) => {
  const { vehicleId } = socket.device;
  const telemetry = sanitizeTelemetry(data.data ?? data, vehicleId);

  console.log('================================');
  console.log('TELEMETRY FROM ESP32');
  console.log('Vehicle:', vehicleId);
  console.log(JSON.stringify(telemetry, null, 2));
  console.log('================================');

  const vehicle = await Vehicle.findOneAndUpdate(
    { vehicleId },
    {
      $set: {
        status: 'online',
        telemetry,
        lastTelemetryAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!vehicle) {
    throw new Error(`Vehicle ${vehicleId} no longer exists`);
  }

  /*
   * Telemetry received successfully.
   * Restart the offline timer.
   */
  startTelemetryTimer(vehicleId, socket);

  const controllerSocket = getControllerSocket(vehicleId);
  await processGeofence(vehicle, telemetry, controllerSocket);
  await processSensorEvents(vehicle, telemetry, controllerSocket);

  /*
   * Forward REAL telemetry to dashboard.
   */
  if (!controllerSocket || controllerSocket.readyState !== 1) {
    return;
  }

  sendMessage(controllerSocket, {
    type: 'TELEMETRY',
    vehicleId,
    data: telemetry,
  });
};

const processSensorEvents = async (vehicle, telemetry, controllerSocket) => {
  const now = Date.now();

  if (
    sensorEventStates.size >= SENSOR_STATE_LIMIT &&
    now - lastSensorStatePruneAt >= 60000
  ) {
    lastSensorStatePruneAt = now;
    for (const [vehicleId, state] of sensorEventStates) {
      if (now - state.updatedAt > SENSOR_STATE_MAX_AGE_MS) {
        sensorEventStates.delete(vehicleId);
      }
    }
  }

  const state = sensorEventStates.get(vehicle.vehicleId) || { updatedAt: now };
  const sensors = [
    {
      field: 'flame',
      type: 'FIRE_DETECTED',
      message: 'Fire detected by the rover',
    },
    {
      field: 'obstacle',
      type: 'OBSTACLE_DETECTED',
      message: 'Obstacle detected by the rover',
    },
  ];

  for (const sensor of sensors) {
    const detected = telemetry[sensor.field];
    if (typeof detected !== 'boolean') {
      continue;
    }

    if (state[sensor.field] === false && detected) {
      const hasLocation =
        telemetry.gpsFix === true &&
        Number.isFinite(telemetry.latitude) &&
        Number.isFinite(telemetry.longitude);
      const event = await Event.create({
        vehicle: vehicle._id,
        vehicleId: vehicle.vehicleId,
        type: sensor.type,
        message: sensor.message,
        latitude: hasLocation ? telemetry.latitude : null,
        longitude: hasLocation ? telemetry.longitude : null,
        details:
          sensor.field === 'obstacle' && Number.isFinite(telemetry.distance)
            ? { distanceCm: telemetry.distance }
            : null,
      });

      if (controllerSocket?.readyState === 1) {
        sendMessage(controllerSocket, {
          type: 'VEHICLE_EVENT',
          event: event.toObject(),
        });
      }
    }

    state[sensor.field] = detected;
  }

  state.updatedAt = now;
  sensorEventStates.set(vehicle.vehicleId, state);
};

const sanitizeTelemetry = (data, vehicleId) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Telemetry data must be an object');
  }

  const numericFields = [
    'speed',
    'distance',
    'latitude',
    'longitude',
    'altitude',
    'gpsSpeed',
    'satellites',
    'pan',
    'tilt',
    'wifiRSSI',
    'uptime',
    'freeHeap',
    'chipFreq',
  ];
  const booleanFields = ['gpsFix', 'flame', 'obstacle', 'alarm'];
  const telemetry = { vehicleId };

  for (const field of numericFields) {
    if (data[field] === null) {
      telemetry[field] = null;
    } else if (typeof data[field] === 'number' && Number.isFinite(data[field])) {
      telemetry[field] = data[field];
    }
  }

  for (const field of booleanFields) {
    if (typeof data[field] === 'boolean') {
      telemetry[field] = data[field];
    }
  }

  for (const field of ['ip', 'roverState']) {
    if (typeof data[field] === 'string') {
      telemetry[field] = data[field].slice(0, 64);
    }
  }

  const validCoordinates =
    Number.isFinite(telemetry.latitude) &&
    telemetry.latitude >= -90 &&
    telemetry.latitude <= 90 &&
    Number.isFinite(telemetry.longitude) &&
    telemetry.longitude >= -180 &&
    telemetry.longitude <= 180;

  if (telemetry.gpsFix !== true || !validCoordinates) {
    telemetry.gpsFix = false;
    telemetry.latitude = null;
    telemetry.longitude = null;
    telemetry.altitude = null;
  }

  return telemetry;
};

const processGeofence = async (vehicle, telemetry, controllerSocket) => {
  const { geofence } = vehicle;

  if (
    !geofence?.enabled ||
    !Number.isFinite(geofence.latitude) ||
    !Number.isFinite(geofence.longitude) ||
    !Number.isFinite(geofence.radiusMeters) ||
    geofence.radiusMeters <= 0 ||
    telemetry.gpsFix !== true ||
    !Number.isFinite(telemetry.latitude) ||
    !Number.isFinite(telemetry.longitude)
  ) {
    return;
  }

  const distance = distanceBetweenMeters(
    telemetry.latitude,
    telemetry.longitude,
    geofence.latitude,
    geofence.longitude
  );
  const nextState = distance <= geofence.radiusMeters ? 'INSIDE' : 'OUTSIDE';
  const previousState = geofence.state || 'UNKNOWN';

  if (nextState === previousState) {
    return;
  }

  geofence.state = nextState;
  await vehicle.save();

  if (controllerSocket?.readyState === 1) {
    sendMessage(controllerSocket, {
      type: 'GEOFENCE_STATUS',
      vehicleId: vehicle.vehicleId,
      geofence: vehicle.geofence,
    });
  }

  if (previousState !== 'INSIDE' || nextState !== 'OUTSIDE') {
    return;
  }

  const event = await Event.create({
    vehicle: vehicle._id,
    vehicleId: vehicle.vehicleId,
    type: 'GEOFENCE_VIOLATION',
    message: 'Vehicle exited its configured geofence',
    latitude: telemetry.latitude,
    longitude: telemetry.longitude,
    details: {
      distanceMeters: Math.round(distance),
      radiusMeters: geofence.radiusMeters,
    },
  });

  if (controllerSocket?.readyState === 1) {
    sendMessage(controllerSocket, {
      type: 'GEOFENCE_EVENT',
      event: event.toObject(),
    });
  }
};

const distanceBetweenMeters = (latitude1, longitude1, latitude2, longitude2) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(latitude2 - latitude1);
  const longitudeDelta = radians(longitude2 - longitude1);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitude1)) *
      Math.cos(radians(latitude2)) *
      Math.sin(longitudeDelta / 2) ** 2;

  const boundedHaversine = Math.min(1, Math.max(0, haversine));

  return (
    6371000 *
    2 *
    Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine))
  );
};

/*
 * Handle heartbeat from ESP32.
 */
const handlePing = (socket) => {
  const { vehicleId } = socket.device;

  /*
   * PING also proves that the device is alive.
   */
  startTelemetryTimer(vehicleId, socket);

  sendMessage(socket, {
    type: 'PONG',
    timestamp: Date.now(),
  });
};

/*
 * Forward command acknowledgement
 * from ESP32 to dashboard.
 */
const handleCommandAck = (socket, data) => {
  const { vehicleId } = socket.device;

  const controllerSocket = getControllerSocket(vehicleId);

  if (!controllerSocket || controllerSocket.readyState !== 1) {
    return;
  }

  sendMessage(controllerSocket, {
    type: 'COMMAND_ACK',
    vehicleId,
    command: data.command,
    success: data.success ?? true,
    message: data.message,
  });
};

/*
 * Forward device errors to dashboard.
 */
const handleDeviceError = (socket, data) => {
  const { vehicleId } = socket.device;

  console.error(`Device reported error (${vehicleId}):`, data);

  const controllerSocket = getControllerSocket(vehicleId);

  if (!controllerSocket || controllerSocket.readyState !== 1) {
    return;
  }

  sendMessage(controllerSocket, {
    type: 'DEVICE_ERROR',
    vehicleId,
    message: data.message || 'Device reported an error',
  });
};

/*
 * Notify dashboard about ESP32 online/offline status.
 */
const notifyControllerDeviceStatus = (vehicleId, status) => {
  const controllerSocket = getControllerSocket(vehicleId);

  if (!controllerSocket || controllerSocket.readyState !== 1) {
    return;
  }

  sendMessage(controllerSocket, {
    type: 'DEVICE_STATUS',
    vehicleId,
    status,
  });
};

/*
 * Safely send JSON through WebSocket.
 */
const sendMessage = (socket, data) => {
  if (!socket || socket.readyState !== 1) {
    return false;
  }

  socket.send(JSON.stringify(data));

  return true;
};

export default handleDeviceSocket;
