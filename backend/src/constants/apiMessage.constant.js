const API_MESSAGE = {
  // General
  SUCCESS: 'Success',
  SOMETHING_WENT_WRONG: 'Something went wrong',
  INVALID_REQUEST: 'Invalid request',

  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  INVALID_CREDENTIALS: 'Invalid username or password',
  USERNAME_REQUIRED: 'Username is required',
  PASSWORD_REQUIRED: 'Password is required',
  AUTHENTICATION_REQUIRED: 'Authentication required',
  INVALID_TOKEN: 'Invalid or expired token',

  REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
  REFRESH_TOKEN_INVALID: 'Invalid or expired refresh token',
  TOKEN_REFRESH_SUCCESS: 'Access token refreshed successfully',

  // Vehicle
  VEHICLE_NOT_ASSIGNED: 'No vehicle assigned to this user',
  VEHICLE_NOT_FOUND: 'Vehicle not found',
  VEHICLE_OFFLINE: 'Vehicle is offline',

  // Device
  DEVICE_AUTH_FAILED: 'Device authentication failed',
  DEVICE_ID_REQUIRED: 'Device ID is required',
  DEVICE_TOKEN_REQUIRED: 'Device token is required',
  DEVICE_NOT_FOUND: 'Device not found',
  DEVICE_AUTH_FAILED: 'Device authentication failed',

  // WebSocket
  CONTROLLER_ALREADY_CONNECTED: 'Vehicle is already being controlled',

  DEVICE_ALREADY_CONNECTED: 'Device is already connected',

  VEHICLE_STOPPED_ON_DISCONNECT: 'Vehicle stopped because controller disconnected',
};

export default API_MESSAGE;
