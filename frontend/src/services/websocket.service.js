import env from '../config/env.config';

let socket = null;
let reconnectTimer = null;
let manuallyClosed = false;

const listeners = new Set();

const getAccessToken = () => {
  const storedAuth = localStorage.getItem('apex_auth');

  if (!storedAuth) {
    return null;
  }

  try {
    const auth = JSON.parse(storedAuth);

    return auth.accessToken || null;
  } catch {
    return null;
  }
};

const notify = (data) => {
  listeners.forEach((listener) => {
    listener(data);
  });
};

const connect = () => {
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return socket;
  }

  const accessToken = getAccessToken();

  if (!accessToken) {
    notify({
      type: 'WS_ERROR',
      message: 'Authentication required',
    });

    return null;
  }

  if (!env.WS_URL) {
    notify({
      type: 'WS_ERROR',
      message: 'WebSocket URL is not configured',
    });
    return null;
  }

  manuallyClosed = false;

  const url = `${env.WS_URL}?token=${encodeURIComponent(accessToken)}`;

  notify({
    type: 'WS_CONNECTING',
  });

  try {
    socket = new WebSocket(url);
  } catch (error) {
    notify({
      type: 'WS_ERROR',
      message: 'Unable to initialize the WebSocket connection',
    });
    console.error('Unable to initialize the dashboard WebSocket:', error);
    return null;
  }
  const activeSocket = socket;

  activeSocket.onopen = () => {
    if (socket !== activeSocket) {
      return;
    }
    notify({
      type: 'WS_OPEN',
    });
  };

  activeSocket.onmessage = (event) => {
    if (socket !== activeSocket) {
      return;
    }

    try {
      const data = JSON.parse(event.data);

      notify(data);
    } catch {
      notify({
        type: 'WS_ERROR',
        message: 'Invalid WebSocket message',
      });
    }
  };

  activeSocket.onerror = () => {
    if (socket !== activeSocket) {
      return;
    }

    notify({
      type: 'WS_ERROR',
      message: 'WebSocket connection error',
    });
  };

  activeSocket.onclose = () => {
    if (socket !== activeSocket) {
      return;
    }

    socket = null;

    notify({
      type: 'WS_CLOSE',
    });

    if (!manuallyClosed && listeners.size > 0) {
      clearTimeout(reconnectTimer);

      reconnectTimer = setTimeout(() => {
        connect();
      }, 5000);
    }
  };

  return socket;
};

const disconnect = () => {
  manuallyClosed = true;

  clearTimeout(reconnectTimer);

  if (socket) {
    const wasConnected = socket.readyState === WebSocket.OPEN;
    socket.close();
    socket = null;
    if (wasConnected) {
      notify({ type: 'WS_CLOSE' });
    }
  }
};

const send = (data) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }

  socket.send(JSON.stringify(data));

  return true;
};

const subscribe = (listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const isConnected = () => {
  return socket?.readyState === WebSocket.OPEN;
};

const websocketService = {
  connect,
  disconnect,
  send,
  subscribe,
  isConnected,
};

export default websocketService;
