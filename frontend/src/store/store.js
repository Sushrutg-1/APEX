import { configureStore } from '@reduxjs/toolkit';

import authReducer from '../redux/slices/authSlice';
import vehicleReducer from '../redux/slices/vehicleSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    vehicle: vehicleReducer,
  },
});

export default store;
