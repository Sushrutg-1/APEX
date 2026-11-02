const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  WS_URL: import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`,
  LOCATIONIQ_TOKEN: import.meta.env.VITE_LOCATIONIQ_TOKEN,
};

export default env;
