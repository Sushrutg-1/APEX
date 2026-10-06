import env from '../../config/env.config';

let socket = null;
let reconnectTimer = null;
let manuallyClosed = false;
let connectionStatus = env.CAMERA_WS_URL ? 'DISCONNECTED' : 'UNAVAILABLE';
let latestFrame = null;
let frameTimer = null;

const listeners = new Set();

const notify = (message) => {
  listeners.forEach((listener) => listener(message));
};

const setStatus = (status) => {
  connectionStatus = status;
  notify({ type: 'STATUS', status });
};

const clearFrame = () => {
  latestFrame = null;
  notify({ type: 'FRAME_UNAVAILABLE' });
};

const startFrameWatchdog = () => {
  clearTimeout(frameTimer);
  frameTimer = setTimeout(() => {
    clearFrame();
    setStatus('ERROR');
  }, 5000);
};

const connect = () => {
  if (!env.CAMERA_WS_URL) {
    setStatus('UNAVAILABLE');
    return;
  }

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  manuallyClosed = false;
  setStatus('CONNECTING');
  socket = new WebSocket(env.CAMERA_WS_URL);
  socket.binaryType = 'blob';

  socket.onopen = () => {
    setStatus('CONNECTED');
    startFrameWatchdog();
  };

  socket.onmessage = (event) => {
    if (typeof event.data === 'string') {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'CAMERA_ERROR') {
          clearFrame();
          setStatus('ERROR');
        } else if (message.type === 'CAMERA_CONNECTED') {
          setStatus('CONNECTED');
        } else if (message.type === 'CAMERA_DISCONNECTED') {
          setStatus('DISCONNECTED');
        }
      } catch {
        notify({ type: 'ERROR', message: 'Invalid camera status message' });
      }
      return;
    }

    latestFrame = new Blob([event.data], { type: 'image/jpeg' });
    setStatus('LIVE');
    notify({ type: 'FRAME', frame: latestFrame });
    startFrameWatchdog();
  };

  socket.onerror = () => {
    clearFrame();
    setStatus('ERROR');
  };

  socket.onclose = () => {
    socket = null;
    clearTimeout(frameTimer);
    latestFrame = null;
    notify({ type: 'FRAME_UNAVAILABLE' });
    setStatus('DISCONNECTED');

    if (!manuallyClosed && listeners.size > 0) {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 5000);
    }
  };
};

const disconnect = () => {
  manuallyClosed = true;
  clearTimeout(reconnectTimer);
  clearTimeout(frameTimer);
  latestFrame = null;
  notify({ type: 'FRAME_UNAVAILABLE' });

  if (socket) {
    socket.close();
    socket = null;
  }
};

const subscribe = (listener) => {
  listeners.add(listener);
  listener({ type: 'STATUS', status: connectionStatus });

  if (latestFrame) {
    listener({ type: 'FRAME', frame: latestFrame });
  }

  connect();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      disconnect();
    }
  };
};

const getLatestFrame = () => latestFrame;

const cameraService = {
  getLatestFrame,
  subscribe,
};

export default cameraService;
