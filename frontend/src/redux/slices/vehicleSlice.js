import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'unknown',
  telemetry: null,
  lastTelemetryAt: null,
  websocketConnected: false,
};

const vehicleSlice = createSlice({
  name: 'vehicle',

  initialState,

  reducers: {
    websocketConnected: (state) => {
      state.websocketConnected = true;
    },

    websocketDisconnected: (state) => {
      state.websocketConnected = false;
      state.status = 'offline';
      state.telemetry = null;
      state.lastTelemetryAt = null;
    },

    vehicleOnline: (state) => {
      state.status = 'online';
    },

    vehicleOffline: (state) => {
      state.status = 'offline';
      state.telemetry = null;
      state.lastTelemetryAt = null;
    },

    updateTelemetry: (state, action) => {
      state.telemetry = action.payload;
      state.lastTelemetryAt = Date.now();
      state.status = 'online';
    },

    resetVehicle: () => initialState,
  },
});

export const {
  websocketConnected,
  websocketDisconnected,
  vehicleOnline,
  vehicleOffline,
  updateTelemetry,
  resetVehicle,
} = vehicleSlice.actions;

export default vehicleSlice.reducer;
