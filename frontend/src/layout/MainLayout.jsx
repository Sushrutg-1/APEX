import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import websocketService from '../services/websocket.service';
import {
  geofenceEvent,
  vehicleEventReceived,
  updateGeofence,
  updateTelemetry,
  vehicleOffline,
  vehicleOnline,
  websocketConnected,
  websocketConnecting,
  websocketDisconnected,
  websocketError,
} from '../redux/slices/vehicleSlice';

import '../styles/dashboard-layout.css';

function MainLayout() {
  const dispatch = useDispatch();
  const [eventToast, setEventToast] = useState(null);

  useEffect(() => {
    let toastTimer;
    const unsubscribe = websocketService.subscribe((message) => {
      if (message.type === 'WS_OPEN') {
        dispatch(websocketConnected());
      } else if (message.type === 'WS_CONNECTING') {
        dispatch(websocketConnecting());
      } else if (message.type === 'WS_CLOSE') {
        dispatch(websocketDisconnected());
      } else if (message.type === 'WS_ERROR') {
        dispatch(websocketError());
      } else if (message.type === 'DEVICE_STATUS') {
        dispatch(message.status === 'online' ? vehicleOnline() : vehicleOffline());
      } else if (message.type === 'TELEMETRY') {
        dispatch(updateTelemetry(message.data ?? null));
      } else if (message.type === 'GEOFENCE_EVENT') {
        dispatch(geofenceEvent(message.event));
        if (message.event) {
          setEventToast(message.event);
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setEventToast(null), 6000);
        }
      } else if (message.type === 'VEHICLE_EVENT') {
        dispatch(vehicleEventReceived(message.event));
        if (message.event) {
          setEventToast(message.event);
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setEventToast(null), 6000);
        }
      } else if (message.type === 'GEOFENCE_STATUS') {
        dispatch(updateGeofence(message.geofence));
      }
    });

    websocketService.connect();

    return () => {
      clearTimeout(toastTimer);
      unsubscribe();
      websocketService.disconnect();
    };
  }, [dispatch]);

  return (
    <div className="apex-dashboard-layout">
      <Sidebar />

      <div className="apex-dashboard-main">
        <Navbar />

        <main className="apex-dashboard-content">
          <Outlet />
        </main>
      </div>

      {eventToast && (
        <div className="apex-event-toast" role="alert" aria-live="assertive">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{eventToast.message}</span>
        </div>
      )}
    </div>
  );
}

export default MainLayout;