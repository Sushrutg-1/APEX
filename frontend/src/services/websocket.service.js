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

  manuallyClosed = false;

  const url = `${env.WS_URL}?token=${encodeURIComponent(accessToken)}`;

  socket = new WebSocket(url);

  socket.onopen = () => {
    notify({
      type: 'WS_OPEN',
    });
  };

  socket.onmessage = (event) => {
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

  socket.onerror = () => {
    notify({
      type: 'WS_ERROR',
      message: 'WebSocket connection error',
    });
  };

  socket.onclose = () => {
    socket = null;

    notify({
      type: 'WS_CLOSE',
    });

    if (!manuallyClosed) {
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
    socket.close();
    socket = null;
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
