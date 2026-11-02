import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import env from '../config/env.config.js';
import Vehicle from '../models/Vehicle.model.js';
import handleVehicleSocket from './vehicle.socket.js';
import handleDeviceSocket from "./device.socket.js";
import handleCameraSocket from './camera.socket.js';

const createWebSocketServer = (server) => {
  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
    handleProtocols: () => {
      return false;
    },
  });

  server.on('upgrade', (request, socket, head) => {
    const upgrade = request.headers.upgrade;
    const connection = request.headers.connection;

    if (!upgrade || !/websocket/i.test(String(upgrade)) || !connection || !/upgrade/i.test(String(connection))) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', async (socket, request) => {
    let receivedMessage = false;
    socket.on('error', (error) => {
      console.error(
        `[WS ERROR] ${request.method} ${request.url} remote=${request.socket.remoteAddress || 'unknown'} ` +
        `phase=${receivedMessage ? 'after-message' : 'before-message'} ` +
        `extensions=${request.headers['sec-websocket-extensions'] || 'none'} ` +
        `code=${error.code || 'none'}: ${error.message}`
      );
    });
    socket.on('message', () => {
      receivedMessage = true;
    });

    try {
      const deviceId = request.headers['x-device-id'];

      // ESP32 device connection
      if (deviceId) {
        console.log(
          `[WS CONNECT] device=${deviceId} type=${request.headers['x-device-type'] || 'default'} ` +
          `url=${request.url} extensions=${request.headers['sec-websocket-extensions'] || 'none'}`
        );
        await authenticateDevice(socket, request);
        return;
      }

      // Dashboard controller connection
      await authenticateController(socket, request);
    } catch (error) {
      console.error('WebSocket authentication error:', error.message);

      if (socket.readyState === 1) {
        socket.close(1008, 'Authentication failed');
      }
    }
  });

  return wss;
};

const authenticateController = async (socket, request) => {
  const authHeader = request.headers.authorization;

  let accessToken = null;

  // Support normal Authorization header
  if (authHeader?.startsWith('Bearer ')) {
    accessToken = authHeader.split(' ')[1];
  }

  // Support browser WebSocket query parameter
  if (!accessToken) {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);

    accessToken = requestUrl.searchParams.get('token');
  }

  if (!accessToken) {
    socket.close(1008, 'Authentication required');
    return;
  }

  const decodedToken = jwt.verify(accessToken, env.ACCESS_TOKEN_SECRET);

  if (!decodedToken.userId || !decodedToken.vehicleId) {
    socket.close(1008, 'Vehicle access is unavailable');
    return;
  }

  const vehicle = await Vehicle.findOne({
    vehicleId: decodedToken.vehicleId,
    owner: decodedToken.userId,
  });

  if (!vehicle) {
    socket.close(1008, 'Vehicle access is unavailable');
    return;
  }

  socket.user = decodedToken;

  console.log(`Controller authenticated: ${socket.user.username}`);

  handleVehicleSocket(socket, vehicle);
};

const authenticateDevice = async (socket, request) => {
  const deviceId = request.headers['x-device-id'];
  const deviceToken = request.headers['x-device-token'];

  if (!deviceId || !deviceToken) {
    socket.close(1008, 'Device authentication required');
    return;
  }

  const vehicle = await Vehicle.findOne({
    vehicleId: deviceId,
    deviceToken,
  });

  if (!vehicle) {
    console.log(`Device authentication failed: ${deviceId}`);

    socket.close(1008, 'Device authentication failed');
    return;
  }

  socket.device = {
    vehicleId: vehicle.vehicleId,
    name: vehicle.name,
  };

  if (request.headers['x-device-type'] === 'camera') {
    handleCameraSocket(socket, vehicle);
    return;
  }

  console.log(`Device authenticated: ${vehicle.vehicleId}`);

  await handleDeviceSocket(socket);
};

export default createWebSocketServer;
