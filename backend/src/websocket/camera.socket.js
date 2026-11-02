import {
  getCameraSocket,
  getControllerSocket,
  removeCameraSocket,
  setCameraSocket,
} from './websocket.manager.js';
import { resetYoloTracker } from '../services/yolo.service.js';

const OPEN = 1;
const FRAME_TIMEOUT_MS = 5000;
const MAX_JPEG_BYTES = 8 * 1024 * 1024;
const frameCounters = new Map();

const isJpeg = (message) =>
  Buffer.isBuffer(message) &&
  message.length >= 4 &&
  message.length <= MAX_JPEG_BYTES &&
  message[0] === 0xff &&
  message[1] === 0xd8 &&
  message[message.length - 2] === 0xff &&
  message[message.length - 1] === 0xd9;

const notifyController = (vehicleId, status) => {
  const controller = getControllerSocket(vehicleId);
  if (controller?.readyState === OPEN) {
    controller.send(JSON.stringify({ type: 'CAMERA_STATUS', vehicleId, status }));
  }
};

const handleCameraSocket = (socket, vehicle) => {
  const { vehicleId } = vehicle;
  const previous = getCameraSocket(vehicleId);
  if (previous?.readyState === OPEN) {
    previous.close(1000, 'Replaced by newer camera connection');
  }

  setCameraSocket(vehicleId, socket);
  socket.cameraHasFrame = false;
  notifyController(vehicleId, 'connecting');
  let frameTimer = null;
  const resetFrameTimer = () => {
    clearTimeout(frameTimer);
    frameTimer = setTimeout(() => {
      if (getCameraSocket(vehicleId) === socket) {
        socket.cameraHasFrame = false;
        notifyController(vehicleId, 'offline');
      }
    }, FRAME_TIMEOUT_MS);
  };
  resetFrameTimer();

  socket.on('message', (message, isBinary) => {
    if (getCameraSocket(vehicleId) !== socket || !isBinary || message.length === 0) {
      return;
    }

    if (!isJpeg(message)) {
      console.warn(
        `[CAMERA FRAME REJECTED] ${vehicleId}: invalid JPEG length=${message.length}`
      );
      return;
    }

    resetFrameTimer();
    socket.cameraHasFrame = true;
    const frameCount = (frameCounters.get(vehicleId) || 0) + 1;
    frameCounters.set(vehicleId, frameCount);
    const controller = getControllerSocket(vehicleId);
    if (frameCount === 1 || frameCount % 25 === 0) {
      console.log(
        `[CAMERA FRAME RECEIVED] ${vehicleId}: frame=${frameCount} bytes=${message.length}`
      );
    }
    if (controller?.readyState === OPEN) {
      notifyController(vehicleId, 'online');
      controller.send(message, { binary: true }, (error) => {
        if (error) {
          console.error(
            `[CAMERA FRAME FORWARD ERROR] ${vehicleId}: frame=${frameCount} bytes=${message.length}`,
            error.message
          );
          return;
        }
        if (frameCount === 1 || frameCount % 25 === 0) {
          console.log(
            `[CAMERA FRAME RELAYED] ${vehicleId}: frame=${frameCount} bytes=${message.length}`
          );
        }
      });
    } else if (frameCount === 1) {
      console.warn(`[CAMERA FRAME NOT FORWARDED] ${vehicleId}: dashboard controller is not open`);
    }
  });

  socket.on('close', (code, reason) => {
    clearTimeout(frameTimer);
    console.warn(
      `[CAMERA CLOSED] ${vehicleId}: code=${code} reason=${reason?.toString() || 'none'}`
    );
    if (removeCameraSocket(vehicleId, socket)) {
      frameCounters.delete(vehicleId);
      void resetYoloTracker(vehicleId);
      notifyController(vehicleId, 'offline');
    }
  });

  socket.on('error', (error) => {
    console.error(`[CAMERA SOCKET ERROR] ${vehicleId}:`, error.message);
  });
};

export default handleCameraSocket;