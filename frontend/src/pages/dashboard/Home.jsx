import './Home.css';
import { useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  Gauge,
  MapPin,
  Radio,
  Signal,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';

import {
  updateTelemetry,
  vehicleOnline,
  vehicleOffline,
  websocketConnected,
  websocketDisconnected,
} from '../../redux/slices/vehicleSlice';

import websocketService from '../../services/websocket.service';

import './Home.css';

function Home() {
  const dispatch = useDispatch();

  const { vehicle } = useSelector((state) => state.auth);

  const {
    status,
    telemetry,
    websocketConnected: wsConnected,
  } = useSelector((state) => state.vehicle);

  const vehicleId = vehicle?.vehicleId || 'Unavailable';
  const vehicleName = vehicle?.name || 'Unavailable';

  /*
   * Never display old telemetry while rover is offline.
   */
  const data = status === 'online' ? telemetry : null;

  useEffect(() => {
    websocketService.connect();

    const unsubscribe = websocketService.subscribe((message) => {
      if (!message) {
        return;
      }

      /*
       * Dashboard WebSocket connected.
       */
      if (message.type === 'WS_OPEN') {
        dispatch(websocketConnected());
        return;
      }

      /*
       * Dashboard WebSocket disconnected.
       */
      if (message.type === 'WS_CLOSE') {
        dispatch(websocketDisconnected());
        return;
      }

      /*
       * ESP32 online/offline.
       */
      if (message.type === 'DEVICE_STATUS') {
        if (message.status === 'online') {
          dispatch(vehicleOnline());
        }

        if (message.status === 'offline') {
          dispatch(vehicleOffline());
        }

        return;
      }

      /*
       * Real ESP32 telemetry.
       */
      if (message.type === 'TELEMETRY') {
        dispatch(updateTelemetry(message.data ?? null));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  const isOnline = status === 'online';

  const statusClass = isOnline
    ? 'home-status home-status-online'
    : 'home-status home-status-offline';

  const statusText = isOnline ? 'Online' : 'Offline';

  const formatValue = (value, suffix = '') => {
    if (value === null || value === undefined) {
      return 'Unavailable';
    }

    return `${value}${suffix}`;
  };

  const formatUptime = (seconds) => {
    if (seconds === null || seconds === undefined || typeof seconds !== 'number') {
      return 'Unavailable';
    }

    const totalSeconds = Math.floor(seconds);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
  };

  const gpsLocation =
    data?.gpsFix === true &&
    data?.latitude !== null &&
    data?.longitude !== null &&
    data?.latitude !== undefined &&
    data?.longitude !== undefined
      ? `${Number(data.latitude).toFixed(6)}, ${Number(data.longitude).toFixed(6)}`
      : 'Unavailable';

  return (
    <main className="dashboard-page home-page">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="home-header">
        <div>
          <span className="page-eyebrow">APEX CONTROL CENTER</span>

          <h1>Rover Overview</h1>

          <p>Monitor the current status and telemetry of your connected rover.</p>
        </div>

        <div className={statusClass}>
          <span className="home-status-dot" />
          <span>{statusText}</span>
        </div>
      </section>

      {/* ======================================================
          ROVER STATUS
      ====================================================== */}

      <section className="home-status-card">
        <div className="home-status-main">
          <div className="home-status-icon">
            {isOnline ? <Wifi size={22} /> : <WifiOff size={22} />}
          </div>

          <div>
            <span className="home-card-label">ROVER STATUS</span>

            <h2>{isOnline ? 'Rover Online' : 'Rover Offline'}</h2>

            <p>
              {isOnline
                ? 'The rover is connected and sending live telemetry.'
                : 'The rover is disconnected. Live telemetry is unavailable.'}
            </p>
          </div>
        </div>

        <div className="home-status-details">
          <div>
            <span>Vehicle ID</span>
            <strong>{vehicleId}</strong>
          </div>

          <div>
            <span>Vehicle</span>
            <strong>{vehicleName}</strong>
          </div>

          <div>
            <span>Dashboard Connection</span>
            <strong>{wsConnected ? 'Connected' : 'Disconnected'}</strong>
          </div>
        </div>
      </section>

      {/* ======================================================
          LIVE TELEMETRY
      ====================================================== */}

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <span className="home-section-eyebrow">LIVE TELEMETRY</span>

            <h2>Vehicle Data</h2>
          </div>
        </div>

        <div className="home-telemetry-grid">
          <div className="home-telemetry-card">
            <div className="home-telemetry-icon">
              <Gauge size={20} />
            </div>

            <div>
              <span>GPS Speed</span>

              <strong>{formatValue(data?.gpsSpeed, ' km/h')}</strong>
            </div>
          </div>

          <div className="home-telemetry-card">
            <div className="home-telemetry-icon">
              <Signal size={20} />
            </div>

            <div>
              <span>Wi-Fi Signal</span>

              <strong>{formatValue(data?.wifiRSSI, ' dBm')}</strong>
            </div>
          </div>

          <div className="home-telemetry-card">
            <div className="home-telemetry-icon">
              <Activity size={20} />
            </div>

            <div>
              <span>Rover State</span>

              <strong>{data?.roverState || 'Unavailable'}</strong>
            </div>
          </div>

          <div className="home-telemetry-card">
            <div className="home-telemetry-icon">
              <MapPin size={20} />
            </div>

            <div>
              <span>GPS Location</span>

              <strong>{gpsLocation}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          CAMERA + SYSTEM
      ====================================================== */}

      <section className="home-main-grid">
        <div className="home-camera-card">
          <div className="home-card-header">
            <div>
              <span className="home-section-eyebrow">CAMERA</span>

              <h2>Live Camera</h2>
            </div>

            <span
              className={
                isOnline
                  ? 'home-camera-status home-camera-online'
                  : 'home-camera-status home-camera-offline'
              }
            >
              <span />

              {isOnline ? 'Stream unavailable' : 'Rover offline'}
            </span>
          </div>

          <div className="home-camera-view">
            <div className="home-camera-empty">
              <div className="home-camera-empty-icon">
                <Camera size={30} />
              </div>

              <h3>{isOnline ? 'Camera stream unavailable' : 'Rover offline'}</h3>

              <p>
                {isOnline
                  ? 'ESP32-CAM live streaming has not been connected yet.'
                  : 'Connect the rover to access the camera stream.'}
              </p>
            </div>
          </div>
        </div>

        <div className="home-system-card">
          <div className="home-card-header">
            <div>
              <span className="home-section-eyebrow">SYSTEM</span>

              <h2>System Information</h2>
            </div>
          </div>

          <div className="home-system-list">
            <div className="home-system-row">
              <span>IP Address</span>

              <strong>{data?.ip || 'Unavailable'}</strong>
            </div>

            <div className="home-system-row">
              <span>Uptime</span>

              <strong>{formatUptime(data?.uptime)}</strong>
            </div>

            <div className="home-system-row">
              <span>Free Memory</span>

              <strong>{formatValue(data?.freeHeap, ' bytes')}</strong>
            </div>

            <div className="home-system-row">
              <span>CPU Frequency</span>

              <strong>{formatValue(data?.chipFreq, ' MHz')}</strong>
            </div>

            <div className="home-system-row">
              <span>Alarm</span>

              <strong>{data ? (data.alarm ? 'Active' : 'Inactive') : 'Unavailable'}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          SENSORS
      ====================================================== */}

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <span className="home-section-eyebrow">SENSORS</span>

            <h2>Rover Sensors</h2>
          </div>
        </div>

        <div className="home-sensor-grid">
          <div className="home-sensor-card">
            <div className="home-sensor-icon">
              <Activity size={19} />
            </div>

            <div>
              <span>Distance</span>

              <strong>
                {data?.distance !== null && data?.distance !== undefined && data.distance >= 0
                  ? `${data.distance} cm`
                  : 'Unavailable'}
              </strong>
            </div>
          </div>

          <div className="home-sensor-card">
            <div className="home-sensor-icon">
              <AlertTriangle size={19} />
            </div>

            <div>
              <span>Obstacle</span>

              <strong>{data ? (data.obstacle ? 'Detected' : 'Clear') : 'Unavailable'}</strong>
            </div>
          </div>

          <div className="home-sensor-card">
            <div className="home-sensor-icon">
              <Activity size={19} />
            </div>

            <div>
              <span>Flame</span>

              <strong>{data ? (data.flame ? 'Detected' : 'Clear') : 'Unavailable'}</strong>
            </div>
          </div>

          <div className="home-sensor-card">
            <div className="home-sensor-icon">
              <Radio size={19} />
            </div>

            <div>
              <span>GPS Satellites</span>

              <strong>
                {data?.satellites !== null && data?.satellites !== undefined
                  ? data.satellites
                  : 'Unavailable'}
              </strong>
            </div>
          </div>

          <div className="home-sensor-card">
            <div className="home-sensor-icon">
              <Camera size={19} />
            </div>

            <div>
              <span>Camera Pan</span>

              <strong>{formatValue(data?.pan, '°')}</strong>
            </div>
          </div>

          <div className="home-sensor-card">
            <div className="home-sensor-icon">
              <Camera size={19} />
            </div>

            <div>
              <span>Camera Tilt</span>

              <strong>{formatValue(data?.tilt, '°')}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          GPS
      ====================================================== */}

      <section className="home-gps-card">
        <div className="home-gps-icon">
          <MapPin size={22} />
        </div>

        <div className="home-gps-content">
          <span className="home-card-label">GPS STATUS</span>

          <h2>{data?.gpsFix === true ? 'GPS Fix Available' : 'GPS Unavailable'}</h2>

          <p>
            {data?.gpsFix === true
              ? `${data.satellites ?? 0} satellites connected`
              : isOnline
                ? 'No GPS fix is currently available.'
                : 'Rover is offline. GPS data is unavailable.'}
          </p>
        </div>

        <div className="home-gps-value">{gpsLocation}</div>
      </section>
    </main>
  );
}

export default Home;
