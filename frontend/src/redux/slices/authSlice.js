import { createSlice } from '@reduxjs/toolkit';

const getInitialState = () => {
  const storedAuth = localStorage.getItem('apex_auth');

  if (!storedAuth) {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
      vehicle: null,
      isAuthenticated: false,
    };
  }

  try {
    const auth = JSON.parse(storedAuth);

    return {
      ...auth,
      isAuthenticated: Boolean(auth.accessToken),
    };
  } catch {
    localStorage.removeItem('apex_auth');

    return {
      accessToken: null,
      refreshToken: null,
      user: null,
      vehicle: null,
      isAuthenticated: false,
    };
  }
};

const authSlice = createSlice({
  name: 'auth',

  initialState: getInitialState(),

  reducers: {
    loginSuccess: (state, action) => {
      const { accessToken, refreshToken, user, vehicle } = action.payload;

      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.user = user;
      state.vehicle = vehicle;
      state.isAuthenticated = true;

      localStorage.setItem(
        'apex_auth',
        JSON.stringify({
          accessToken,
          refreshToken,
          user,
          vehicle,
          isAuthenticated: true,
        })
      );
    },

    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.vehicle = null;
      state.isAuthenticated = false;

      localStorage.removeItem('apex_auth');
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;

export default authSlice.reducer;
