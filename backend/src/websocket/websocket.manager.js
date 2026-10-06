const vehicleConnections = new Map();

/*
 * Create a connection entry for a vehicle
 * if it does not already exist.
 */
const createConnection = (vehicleId) => {
  if (!vehicleConnections.has(vehicleId)) {
    vehicleConnections.set(vehicleId, {
      controllerSocket: null,
      deviceSocket: null,
    });
  }

  return vehicleConnections.get(vehicleId);
};

/*
 * Get the complete connection object
 * for a vehicle.
 */
const getConnection = (vehicleId) => {
  return vehicleConnections.get(vehicleId) || null;
};

/*
 * Set the active dashboard/controller socket.
 */
const setControllerSocket = (vehicleId, socket) => {
  const connection = createConnection(vehicleId);

  connection.controllerSocket = socket;
};

/*
 * Set the active ESP32/device socket.
 */
const setDeviceSocket = (vehicleId, socket) => {
  const connection = createConnection(vehicleId);

  connection.deviceSocket = socket;
};

/*
 * Get the active controller socket.
 */
const getControllerSocket = (vehicleId) => {
  return vehicleConnections.get(vehicleId)?.controllerSocket || null;
};

/*
 * Get the active device socket.
 */
const getDeviceSocket = (vehicleId) => {
  return vehicleConnections.get(vehicleId)?.deviceSocket || null;
};

/*
 * Check whether a controller is already
 * actively connected to the vehicle.
 *
 * WebSocket OPEN state = 1
 */
const hasActiveController = (vehicleId) => {
  const socket = getControllerSocket(vehicleId);

  return socket?.readyState === 1;
};

/*
 * Check whether an ESP32 device is already
 * actively connected to the vehicle.
 *
 * WebSocket OPEN state = 1
 */
const hasActiveDevice = (vehicleId) => {
  const socket = getDeviceSocket(vehicleId);

  return socket?.readyState === 1;
};

/*
 * Remove the controller socket.
 *
 * The socket identity is checked before removing it.
 * This prevents an old socket from accidentally
 * removing a newer active connection.
 */
const removeControllerSocket = (vehicleId, socket) => {
  const connection = vehicleConnections.get(vehicleId);

  if (!connection) {
    return false;
  }

  if (connection.controllerSocket !== socket) {
    return false;
  }

  connection.controllerSocket = null;

  cleanupConnection(vehicleId);

  return true;
};

/*
 * Remove the device socket.
 *
 * The socket identity is checked before removing it.
 */
const removeDeviceSocket = (vehicleId, socket) => {
  const connection = vehicleConnections.get(vehicleId);

  if (!connection) {
    return false;
  }

  if (connection.deviceSocket !== socket) {
    return false;
  }

  connection.deviceSocket = null;

  cleanupConnection(vehicleId);

  return true;
};

/*
 * Delete the vehicle connection entry
 * when neither controller nor device
 * is connected.
 */
const cleanupConnection = (vehicleId) => {
  const connection = vehicleConnections.get(vehicleId);

  if (!connection) {
    return;
  }

  if (!connection.controllerSocket && !connection.deviceSocket) {
    vehicleConnections.delete(vehicleId);
  }
};

export {
  getConnection,
  setControllerSocket,
  setDeviceSocket,
  getControllerSocket,
  getDeviceSocket,
  hasActiveController,
  hasActiveDevice,
  removeControllerSocket,
  removeDeviceSocket,
};
