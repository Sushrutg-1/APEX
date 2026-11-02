import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'offline',
  deviceStatus: 'offline',
  lastSeenAt: null,
  telemetry: null,
  lastTelemetryAt: null,
  telemetryStatus: 'NOT_RECEIVED',
  websocketConnected: false,
  websocketStatus: 'CONNECTING',
  geofence: null,
  lastGeofenceEvent: null,
  events: [],
};

const mergeEvents = (...eventLists) => {
  const eventsById = new Map();

  for (const event of eventLists.flat()) {
    const eventId = event?._id || event?.id;
    if (eventId) {
      eventsById.set(String(eventId), event);
    }
  }

  return [...eventsById.values()]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 100);
};

const vehicleSlice = createSlice({
  name: 'vehicle',

  initialState,

  reducers: {
    websocketConnected: (state) => {
      state.websocketConnected = true;
      state.websocketStatus = 'CONNECTED';
    },

    websocketConnecting: (state) => {
      state.websocketConnected = false;
      state.websocketStatus = 'CONNECTING';
      state.deviceStatus = 'offline';
      state.status = 'offline';
      state.telemetryStatus = 'NOT_RECEIVED';
      state.telemetry = null;
      state.lastTelemetryAt = null;
    },

    websocketDisconnected: (state) => {
      state.websocketConnected = false;
      state.websocketStatus = 'DISCONNECTED';
    },

    websocketError: (state) => {
      state.websocketConnected = false;
      state.websocketStatus = 'ERROR';
    },

    deviceStatusChanged: (state, action) => {
      state.deviceStatus = action.payload.status === 'online' ? 'online' : 'offline';
      state.status = state.deviceStatus;
      state.lastSeenAt = action.payload.lastSeenAt || null;
      if (state.deviceStatus === 'offline') {
        state.telemetry = null;
        state.lastTelemetryAt = null;
      }
    },

    updateTelemetry: (state, action) => {
      state.telemetry = action.payload;
      state.lastTelemetryAt = Date.now();
      state.telemetryStatus = 'RECEIVING';
    },

    telemetryStatusChanged: (state, action) => {
      state.telemetryStatus = action.payload.status;
      if (action.payload.lastTelemetryAt) {
        state.lastTelemetryAt = action.payload.lastTelemetryAt;
      }
    },

    updateGeofence: (state, action) => {
      state.geofence = action.payload;
    },

    geofenceEvent: (state, action) => {
      state.lastGeofenceEvent = action.payload;
      state.events = mergeEvents(state.events, [action.payload]);
      if (state.geofence) {
        state.geofence.state = 'OUTSIDE';
      }
    },

    vehicleEventReceived: (state, action) => {
      state.events = mergeEvents(state.events, [action.payload]);
    },

    eventsLoaded: (state, action) => {
      state.events = mergeEvents(action.payload, state.events);
    },

    resetVehicle: () => initialState,
  },
});

export const {
  websocketConnected,
  websocketConnecting,
  websocketDisconnected,
  websocketError,
  deviceStatusChanged,
  updateTelemetry,
  telemetryStatusChanged,
  updateGeofence,
  geofenceEvent,
  vehicleEventReceived,
  eventsLoaded,
  resetVehicle,
} = vehicleSlice.actions;

export default vehicleSlice.reducer;
