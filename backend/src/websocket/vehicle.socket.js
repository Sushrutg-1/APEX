import {
  setControllerSocket,
  removeControllerSocket,
  getDeviceSocket,
  hasActiveController,
} from './websocket.manager.js';

import VEHICLE_COMMAND from '../constants/vehicleCommand.constant.js';
import API_MESSAGE from '../constants/apiMessage.constant.js';

/*
 * Handle dashboard/controller WebSocket connection.
 */
const handleVehicleSocket = (socket) => {
  const { vehicleId } = socket.user;

  /*
   * Allow only one active controller
   * for a vehicle.
   */
  if (hasActiveController(vehicleId)) {
    socket.close(1008, API_MESSAGE.CONTROLLER_ALREADY_CONNECTED);

    return;
  }

  /*
   * Register controller socket.
   */
  setControllerSocket(vehicleId, socket);

  console.log(`Controller connected: ${vehicleId}`);

  /*
   * Notify dashboard that the connection
   * has been authenticated and registered.
   */
  socket.send(
    JSON.stringify({
      type: 'CONTROLLER_CONNECTED',
      vehicleId,
      message: 'Controller connected successfully',
    })
  );

  /*
   * Handle messages coming from dashboard.
   */
  socket.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      handleVehicleMessage(socket, data);
    } catch (error) {
      console.error(`Controller message error (${vehicleId}):`, error);

      sendError(socket, 'Invalid message format');
    }
  });

  /*
   * Handle controller disconnect.
   *
   * Safety:
   * Send STOP to the ESP32 so that a
   * continuous movement command does not
   * continue after the dashboard disconnects.
   */
  socket.on('close', () => {
    const removed = removeControllerSocket(vehicleId, socket);

    /*
     * Ignore this event if this socket is
     * no longer the active controller socket.
     */
    if (!removed) {
      return;
    }

    sendStopToDevice(vehicleId);

    console.log(`Controller disconnected: ${vehicleId}`);
  });

  /*
   * Handle socket errors.
   */
  socket.on('error', (error) => {
    console.error(`Controller socket error (${vehicleId}):`, error);
  });
};

/*
 * Handle all messages received from
 * the dashboard.
 */
const handleVehicleMessage = (socket, data) => {
  if (!data || typeof data !== 'object') {
    sendError(socket, 'Invalid message');

    return;
  }

  switch (data.type) {
    case 'COMMAND':
      handleVehicleCommand(socket, data);
      break;

    case 'PING':
      handlePing(socket);
      break;

    default:
      sendError(socket, 'Unknown message type');
  }
};

/*
 * Handle PING from dashboard.
 */
const handlePing = (socket) => {
  if (socket.readyState !== 1) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: 'PONG',
      timestamp: Date.now(),
    })
  );
};

/*
 * Validate and process vehicle commands.
 */
const handleVehicleCommand = (socket, data) => {
  const { command, mode, value } = data;

  /*
   * Validate command.
   */
  if (!Object.values(VEHICLE_COMMAND).includes(command)) {
    sendError(socket, 'Invalid vehicle command');

    return;
  }

  /*
   * Movement commands.
   */
  if (
    [
      VEHICLE_COMMAND.FORWARD,
      VEHICLE_COMMAND.BACKWARD,
      VEHICLE_COMMAND.LEFT,
      VEHICLE_COMMAND.RIGHT,
      VEHICLE_COMMAND.STOP,
    ].includes(command)
  ) {
    handleMovementCommand(socket, command, mode);

    return;
  }

  /*
   * Pan/Tilt commands.
   */
  if (command === VEHICLE_COMMAND.PAN || command === VEHICLE_COMMAND.TILT) {
    handleServoCommand(socket, command, value);

    return;
  }

  /*
   * Horn command.
   */
  if (command === VEHICLE_COMMAND.HORN) {
    forwardCommandToDevice(socket, {
      type: 'COMMAND',
      command: VEHICLE_COMMAND.HORN,
    });

    return;
  }
};

/*
 * Handle movement commands.
 */
const handleMovementCommand = (socket, command, mode) => {
  /*
   * STOP does not require a movement mode.
   */
  if (command === VEHICLE_COMMAND.STOP) {
    forwardCommandToDevice(socket, {
      type: 'COMMAND',
      command: VEHICLE_COMMAND.STOP,
    });

    return;
  }

  /*
   * All other movement commands require
   * STEP or CONTINUOUS mode.
   */
  if (mode !== 'STEP' && mode !== 'CONTINUOUS') {
    sendError(socket, 'Movement mode must be STEP or CONTINUOUS');

    return;
  }

  forwardCommandToDevice(socket, {
    type: 'COMMAND',
    command,
    mode,
  });
};

/*
 * Handle camera pan/tilt commands.
 */
const handleServoCommand = (socket, command, value) => {
  /*
   * Servo angle must be a number
   * between 0 and 180 degrees.
   */
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 180) {
    sendError(socket, 'Servo value must be between 0 and 180');

    return;
  }

  forwardCommandToDevice(socket, {
    type: 'COMMAND',
    command,
    value,
  });
};

/*
 * Forward a validated command
 * from dashboard to ESP32.
 */
const forwardCommandToDevice = (controllerSocket, data) => {
  const vehicleId = controllerSocket.user.vehicleId;

  const deviceSocket = getDeviceSocket(vehicleId);

  /*
   * ESP32 is not connected.
   */
  if (!deviceSocket || deviceSocket.readyState !== 1) {
    sendError(controllerSocket, API_MESSAGE.VEHICLE_OFFLINE);

    return;
  }

  /*
   * Send command to ESP32.
   */
  deviceSocket.send(JSON.stringify(data));

  /*
   * Confirm that backend forwarded
   * the command successfully.
   */
  if (controllerSocket.readyState === 1) {
    controllerSocket.send(
      JSON.stringify({
        type: 'COMMAND_SENT',
        command: data.command,
      })
    );
  }
};

/*
 * Send an emergency/safety STOP command
 * to the ESP32.
 */
const sendStopToDevice = (vehicleId) => {
  const deviceSocket = getDeviceSocket(vehicleId);

  if (!deviceSocket || deviceSocket.readyState !== 1) {
    return;
  }

  deviceSocket.send(
    JSON.stringify({
      type: 'COMMAND',
      command: VEHICLE_COMMAND.STOP,
    })
  );

  console.log(`STOP sent to vehicle: ${vehicleId}`);
};

/*
 * Send an error response to dashboard.
 */
const sendError = (socket, message) => {
  if (socket.readyState !== 1) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: 'ERROR',
      message,
    })
  );
};

export default handleVehicleSocket;
