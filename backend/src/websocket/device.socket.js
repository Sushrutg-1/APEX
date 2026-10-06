import Vehicle from '../models/Vehicle.model.js';

import {
  setDeviceSocket,
  removeDeviceSocket,
  getDeviceSocket,
  getControllerSocket,
} from './websocket.manager.js';

import API_MESSAGE from '../constants/apiMessage.constant.js';

const TELEMETRY_TIMEOUT_MS = 15000;

/*
 * Store telemetry timeout for each vehicle.
 */
const telemetryTimers = new Map();

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

  console.log(`[DEVICE CONNECT] ${name} (${vehicleId}) connected`);

  /*
   * Register the ESP32 socket.
   */
  setDeviceSocket(vehicleId, socket);

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
  socket.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      handleDeviceMessage(socket, data);
    } catch (error) {
      console.error(`[DEVICE MESSAGE ERROR] ${vehicleId}:`, error);

      sendMessage(socket, {
        type: 'ERROR',
        message: 'Invalid message format',
      });
    }
  });

  /*
   * Handle ESP32 disconnect.
   */
  socket.on('close', async () => {
    console.log(`[DEVICE DISCONNECT] ${name} (${vehicleId}) disconnected`);

    clearTelemetryTimer(vehicleId);

    /*
     * Only remove the socket if this is still
     * the active device connection.
     */
    const activeSocket = getDeviceSocket(vehicleId);

    if (activeSocket !== socket) {
      return;
    }

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
const handleDeviceMessage = (socket, data) => {
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
      handleTelemetry(socket, data);
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
const handleTelemetry = (socket, data) => {
  const { vehicleId } = socket.device;

  console.log('================================');
  console.log('TELEMETRY FROM ESP32');
  console.log('Vehicle:', vehicleId);
  console.log(JSON.stringify(data.data ?? data, null, 2));
  console.log('================================');

  /*
   * Telemetry received successfully.
   * Restart the offline timer.
   */
  startTelemetryTimer(vehicleId, socket);

  /*
   * Forward REAL telemetry to dashboard.
   */
  const controllerSocket = getControllerSocket(vehicleId);

  if (!controllerSocket || controllerSocket.readyState !== 1) {
    return;
  }

  sendMessage(controllerSocket, {
    type: 'TELEMETRY',
    vehicleId,
    data: data.data ?? data,
  });
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
