import { useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  Gauge,
  MapPin,
  Radio,
  Satellite,
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

  const { user, vehicle } = useSelector((state) => state.auth);

  const {
    status,
    telemetry,
    websocketConnected: isWebsocketConnected,
  } = useSelector((state) => state.vehicle);

  const isOnline = status === 'online';

  const vehicleId = vehicle?.vehicleId || 'Unavailable';
  const vehicleName = vehicle?.name || 'Unavailable';

  const username = user?.username || 'Unavailable';

  const data = isOnline ? telemetry : null;

  useEffect(() => {
    websocketService.connect();

    const unsubscribe = websocketService.subscribe((message) => {
      if (!message) {
        return;
      }

      if (message.type === 'WS_OPEN') {
        dispatch(websocketConnected());
        return;
      }

      if (message.type === 'WS_CLOSE') {
        dispatch(websocketDisconnected());
        return;
      }

      if (message.type === 'DEVICE_STATUS') {
        if (message.status === 'online') {
          dispatch(vehicleOnline());
        }

        if (message.status === 'offline') {
          dispatch(vehicleOffline());
        }

        return;
      }

      if (message.type === 'TELEMETRY') {
        dispatch(updateTelemetry(message.data ?? null));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);

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

    const total = Math.floor(seconds);

    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }

    return `${secs}s`;
  };

  const gpsAvailable =
    data?.gpsFix === true &&
    data?.latitude !== null &&
    data?.latitude !== undefined &&
    data?.longitude !== null &&
    data?.longitude !== undefined;

  const gpsCoordinates = gpsAvailable
    ? `${Number(data.latitude).toFixed(6)}, ${Number(data.longitude).toFixed(6)}`
    : 'Unavailable';

  return (
    <main className="apex-home">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <section className="apex-home-header">
        <div>
          <span className="apex-home-eyebrow">APEX CONTROL CENTER</span>

          <h1>Rover Overview</h1>

          <p>Monitor the current status and telemetry of your rover.</p>
        </div>

        <div className={`apex-home-status ${isOnline ? 'online' : 'offline'}`}>
          <span />

          {isOnline ? 'Online' : 'Offline'}
        </div>
      </section>

      {/* =====================================================
          VEHICLE STATUS
          ===================================================== */}

      <section className="apex-home-status-card">
        <div className="apex-home-status-main">
          <div className={`apex-home-status-icon ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? <Wifi size={22} /> : <WifiOff size={22} />}
          </div>

          <div>
            <span className="apex-home-card-label">ROVER STATUS</span>

            <h2>{isOnline ? 'Rover Online' : 'Rover Offline'}</h2>

            <p>
              {isOnline
                ? 'The rover is connected and sending live telemetry.'
                : 'The rover is disconnected. Live telemetry is unavailable.'}
            </p>
          </div>
        </div>

        <div className="apex-home-status-info">
          <div>
            <span>Vehicle ID</span>
            <strong>{vehicleId}</strong>
          </div>

          <div>
            <span>Vehicle</span>
            <strong>{vehicleName}</strong>
          </div>

          <div>
            <span>Dashboard</span>
            <strong>{isWebsocketConnected ? 'Connected' : 'Disconnected'}</strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          TELEMETRY
          ===================================================== */}

      <section className="apex-home-section">
        <div className="apex-home-section-heading">
          <span>LIVE TELEMETRY</span>
          <h2>Vehicle Data</h2>
        </div>

        <div className="apex-home-telemetry-grid">
          <TelemetryCard
            icon={<Gauge size={20} />}
            label="GPS Speed"
            value={formatValue(data?.gpsSpeed, ' km/h')}
          />

          <TelemetryCard
            icon={<Signal size={20} />}
            label="Wi-Fi Signal"
            value={formatValue(data?.wifiRSSI, ' dBm')}
          />

          <TelemetryCard
            icon={<Activity size={20} />}
            label="Rover State"
            value={data?.roverState || 'Unavailable'}
          />

          <TelemetryCard icon={<MapPin size={20} />} label="GPS Location" value={gpsCoordinates} />
        </div>
      </section>

      {/* =====================================================
          CAMERA + SYSTEM
          ===================================================== */}

      <section className="apex-home-main-grid">
        <div className="apex-home-panel">
          <div className="apex-home-panel-header">
            <div>
              <span>CAMERA</span>
              <h2>Live Camera</h2>
            </div>

            <span className={`apex-camera-status ${isOnline ? 'unavailable' : 'offline'}`}>
              <span />

              {isOnline ? 'Stream unavailable' : 'Rover offline'}
            </span>
          </div>

          <div className="apex-camera-view">
            <div className="apex-camera-empty">
              <div className="apex-camera-icon">
                <Camera size={30} />
              </div>

              <h3>{isOnline ? 'Camera stream unavailable' : 'Rover offline'}</h3>

              <p>
                {isOnline
                  ? 'ESP32-CAM streaming is not connected yet.'
                  : 'Connect the rover to access the camera stream.'}
              </p>
            </div>
          </div>
        </div>

        <div className="apex-home-panel">
          <div className="apex-home-panel-header">
            <div>
              <span>SYSTEM</span>
              <h2>System Information</h2>
            </div>
          </div>

          <div className="apex-system-list">
            <SystemRow label="IP Address" value={data?.ip || 'Unavailable'} />

            <SystemRow label="Uptime" value={formatUptime(data?.uptime)} />

            <SystemRow label="Free Memory" value={formatValue(data?.freeHeap, ' bytes')} />

            <SystemRow label="CPU Frequency" value={formatValue(data?.chipFreq, ' MHz')} />

            <SystemRow
              label="Alarm"
              value={data ? (data.alarm ? 'Active' : 'Inactive') : 'Unavailable'}
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          SENSOR DATA
          ===================================================== */}

      <section className="apex-home-section">
        <div className="apex-home-section-heading">
          <span>SENSORS</span>
          <h2>Rover Sensors</h2>
        </div>

        <div className="apex-home-sensor-grid">
          <SensorCard
            icon={<Radio size={19} />}
            label="Distance"
            value={
              data?.distance !== null && data?.distance !== undefined && data.distance >= 0
                ? `${data.distance} cm`
                : 'Unavailable'
            }
          />

          <SensorCard
            icon={<AlertTriangle size={19} />}
            label="Obstacle"
            value={data ? (data.obstacle ? 'Detected' : 'Clear') : 'Unavailable'}
          />

          <SensorCard
            icon={<AlertTriangle size={19} />}
            label="Flame"
            value={data ? (data.flame ? 'Detected' : 'Clear') : 'Unavailable'}
          />

          <SensorCard
            icon={<Satellite size={19} />}
            label="GPS Satellites"
            value={
              data?.satellites !== null && data?.satellites !== undefined
                ? data.satellites
                : 'Unavailable'
            }
          />

          <SensorCard
            icon={<Camera size={19} />}
            label="Camera Pan"
            value={formatValue(data?.pan, '°')}
          />

          <SensorCard
            icon={<Camera size={19} />}
            label="Camera Tilt"
            value={formatValue(data?.tilt, '°')}
          />
        </div>
      </section>

      {/* =====================================================
          GPS
          ===================================================== */}

      <section className="apex-home-gps">
        <div className="apex-home-gps-icon">
          <MapPin size={22} />
        </div>

        <div className="apex-home-gps-content">
          <span>GPS STATUS</span>

          <h2>{gpsAvailable ? 'GPS Fix Available' : 'GPS Unavailable'}</h2>

          <p>
            {gpsAvailable
              ? `${data.satellites ?? 0} satellites connected`
              : isOnline
                ? 'No GPS fix is currently available.'
                : 'Rover is offline. GPS data is unavailable.'}
          </p>
        </div>

        <strong>{gpsCoordinates}</strong>
      </section>
    </main>
  );
}

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */

function TelemetryCard({ icon, label, value }) {
  return (
    <div className="apex-telemetry-card">
      <div className="apex-telemetry-icon">{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SensorCard({ icon, label, value }) {
  return (
    <div className="apex-sensor-card">
      <div className="apex-sensor-icon">{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SystemRow({ label, value }) {
  return (
    <div className="apex-system-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default Home;
