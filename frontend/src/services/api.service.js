import axios from 'axios';
import env from '../config/env.config';

const api = axios.create({
  baseURL: env.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const storedAuth = localStorage.getItem('apex_auth');

    if (storedAuth) {
      try {
        const auth = JSON.parse(storedAuth);

        if (auth.accessToken) {
          config.headers.Authorization = `Bearer ${auth.accessToken}`;
        }
      } catch {
        localStorage.removeItem('apex_auth');
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
