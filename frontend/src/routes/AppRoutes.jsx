import { Routes, Route } from 'react-router-dom';

import Landing from '../pages/landing/Landing';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';

import MainLayout from '../layout/MainLayout';

import Home from '../pages/dashboard/Home';
import Control from '../pages/dashboard/Control';
import History from '../pages/dashboard/History';

import ProtectedRoute from './ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Dashboard */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="control" element={<Control />} />
          <Route path="history" element={<History />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
