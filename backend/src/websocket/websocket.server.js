import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import env from '../config/env.config.js';
import Vehicle from '../models/Vehicle.model.js';
import handleVehicleSocket from './vehicle.socket.js';
import handleDeviceSocket from "./device.socket.js";

const createWebSocketServer = (server) => {
  const wss = new WebSocketServer({
    server,
    perMessageDeflate: false,

    handleProtocols: () => {
      return false;
    },
  });

  wss.on('connection', async (socket, request) => {
    socket.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });

    try {
      const deviceId = request.headers['x-device-id'];

      // ESP32 device connection
      if (deviceId) {
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

  await Vehicle.updateOne(
    { _id: vehicle._id },
    {
      $set: {
        status: 'online',
      },
    }
  );

  console.log(`Device authenticated: ${vehicle.vehicleId}`);

  handleDeviceSocket(socket);
};

export default createWebSocketServer;
