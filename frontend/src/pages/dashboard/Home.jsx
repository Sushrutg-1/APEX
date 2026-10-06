import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useSelector } from 'react-redux';

import cameraService from '../../features/camera/camera.service';
import CameraFeed from '../../features/camera/CameraFeed';
import { distanceBetweenMeters, isValidCoordinates } from '../../utils/geography';
import { getCurrentWeather } from '../../services/weather.service';
import './Home.css';

const WEATHER_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const WEATHER_MOVEMENT_THRESHOLD_METERS = 1000;

const formatCoordinate = (value, positiveDirection, negativeDirection) =>
  `${Math.abs(value).toFixed(5)}° ${value < 0 ? negativeDirection : positiveDirection}`;

function WeatherCard({ location, weather, onWeatherChange }) {
  const [weatherStatus, setWeatherStatus] = useState('WAITING');
  const locationRef = useRef(location);
  const lastRequestRef = useRef(null);
  const inFlightRef = useRef(false);
  const gpsWasUnavailableRef = useRef(true);
  const requestRef = useRef(null);
  const refreshWeatherRef = useRef(null);

  const refreshWeather = useCallback(async (coordinates) => {
    if (inFlightRef.current || !coordinates) {
      return;
    }

    inFlightRef.current = true;
    lastRequestRef.current = {
      ...coordinates,
      requestedAt: Date.now(),
    };
    const abortController = new AbortController();
    requestRef.current = abortController;
    setWeatherStatus('LOADING');

    try {
      const result = await getCurrentWeather(
        coordinates.latitude,
        coordinates.longitude,
        abortController.signal
      );
      if (!abortController.signal.aborted) {
        onWeatherChange(result);
        setWeatherStatus('AVAILABLE');
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        onWeatherChange(null);
        setWeatherStatus('UNAVAILABLE');
        console.error('Unable to retrieve current weather:', error.message);
      }
    } finally {
      const isCurrentRequest = requestRef.current === abortController;
      if (isCurrentRequest) {
        inFlightRef.current = false;
        requestRef.current = null;
      }

      const latest = locationRef.current;
      if (
        isCurrentRequest &&
        !abortController.signal.aborted &&
        latest &&
        distanceBetweenMeters(
          coordinates.latitude,
          coordinates.longitude,
          latest.latitude,
          latest.longitude
        ) >= WEATHER_MOVEMENT_THRESHOLD_METERS
      ) {
        void refreshWeatherRef.current?.(latest);
      }
    }
  }, [onWeatherChange]);

  useEffect(() => {
    refreshWeatherRef.current = refreshWeather;
    locationRef.current = location;

    if (!location) {
      gpsWasUnavailableRef.current = true;
      requestRef.current?.abort();
      requestRef.current = null;
      inFlightRef.current = false;
      onWeatherChange(null);
      return;
    }

    const previous = lastRequestRef.current;
    const movedMeaningfully =
      previous &&
      distanceBetweenMeters(
        previous.latitude,
        previous.longitude,
        location.latitude,
        location.longitude
      ) >= WEATHER_MOVEMENT_THRESHOLD_METERS;
    const refreshIsDue =
      previous && Date.now() - previous.requestedAt >= WEATHER_REFRESH_INTERVAL_MS;

    if (!previous || gpsWasUnavailableRef.current || movedMeaningfully || refreshIsDue) {
      gpsWasUnavailableRef.current = false;
      void refreshWeather(location);
    }
  }, [location, onWeatherChange, refreshWeather]);

  useEffect(() => {
    const interval = setInterval(() => {
      const lastRequest = lastRequestRef.current;
      const currentLocation = locationRef.current;
      if (
        currentLocation &&
        lastRequest &&
        Date.now() - lastRequest.requestedAt >= WEATHER_REFRESH_INTERVAL_MS
      ) {
        void refreshWeatherRef.current?.(currentLocation);
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      requestRef.current?.abort();
      requestRef.current = null;
      inFlightRef.current = false;
      gpsWasUnavailableRef.current = true;
    };
  }, [refreshWeather]);

  const locationText = location
    ? `${formatCoordinate(location.latitude, 'N', 'S')}, ${formatCoordinate(
        location.longitude,
        'E',
        'W'
      )}`
    : 'Waiting for GPS location';
  const displayStatus = location ? weatherStatus : 'WAITING';

  return (
    <section className="home-weather-card" aria-live="polite">
      <div className="home-weather-header">
        <div>
          <span className="home-section-eyebrow">CURRENT WEATHER</span>
          <h2>Vehicle Location</h2>
        </div>
        <span className={`home-weather-status ${displayStatus.toLowerCase()}`}>
          {displayStatus === 'AVAILABLE'
            ? 'Current'
            : displayStatus === 'LOADING'
              ? 'Updating'
              : 'Weather unavailable'}
        </span>
      </div>

      <p className="home-weather-location">{locationText}</p>

      {displayStatus === 'AVAILABLE' && weather ? (
        <div className="home-weather-values">
          <div className="home-weather-primary">
            <strong>{weather.temperature.toFixed(1)}°C</strong>
            <span>{weather.condition}</span>
          </div>
          <div>
            <span>Feels like</span>
            <strong>{weather.apparentTemperature.toFixed(1)}°C</strong>
          </div>
          <div>
            <span>Humidity</span>
            <strong>{weather.humidity}%</strong>
          </div>
          <div>
            <span>Wind</span>
            <strong>{weather.windSpeed.toFixed(1)} km/h</strong>
          </div>
        </div>
      ) : (
        <p className="home-weather-message">
          {!location
            ? 'Weather unavailable · Waiting for GPS location'
            : displayStatus === 'LOADING'
              ? 'Retrieving current weather for the rover location...'
              : 'Weather unavailable · Unable to retrieve current weather.'}
        </p>
      )}
    </section>
  );
}

function Home() {
  const { vehicle } = useSelector((state) => state.auth);
  const {
    status,
    telemetry,
    websocketConnected: wsConnected,
    websocketStatus,
    geofence,
  } = useSelector((state) => state.vehicle);
  const [cameraStatus, setCameraStatus] = useState('UNAVAILABLE');
  const [weather, setWeather] = useState(null);

  const vehicleId = vehicle?.vehicleId || 'Unavailable';
  const vehicleName = vehicle?.name || 'Unavailable';

  /*
   * Never display old telemetry while rover is offline.
   */
  const data = status === 'online' ? telemetry : null;

  useEffect(
    () =>
      cameraService.subscribe((message) => {
        if (message.type === 'STATUS') {
          setCameraStatus(message.status);
        }
      }),
    []
  );

  const isOnline = status === 'online';

  const statusClass = isOnline
    ? 'home-status home-status-online'
    : status === 'offline'
      ? 'home-status home-status-offline'
      : 'home-status home-status-connecting';

  const statusText = isOnline ? 'Online' : status === 'offline' ? 'Offline' : 'Connecting';

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
    data?.gpsFix === true && isValidCoordinates(data.latitude, data.longitude)
      ? `${Number(data.latitude).toFixed(6)}, ${Number(data.longitude).toFixed(6)}`
      : 'Unavailable';
  const hasValidGeofence =
    geofence?.enabled === true &&
    isValidCoordinates(geofence.latitude, geofence.longitude) &&
    Number.isFinite(geofence.radiusMeters) &&
    geofence.radiusMeters > 0;
  const geofenceStatus = !hasValidGeofence
    ? geofence?.latitude !== null && geofence?.latitude !== undefined
      ? 'Geofence disabled'
      : 'No geofence configured'
    : !data?.gpsFix ||
        !isValidCoordinates(data.latitude, data.longitude)
      ? 'GPS Unavailable'
      : distanceBetweenMeters(
            data.latitude,
            data.longitude,
            geofence.latitude,
            geofence.longitude
          ) <= geofence.radiusMeters
        ? 'Inside Geofence'
        : 'Outside Geofence';
  const weatherLocation =
    data?.gpsFix === true && isValidCoordinates(data.latitude, data.longitude)
      ? { latitude: data.latitude, longitude: data.longitude }
      : null;

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
            {isOnline ? <Wifi size={22} /> : status === 'offline' ? <WifiOff size={22} /> : <Wifi size={22} />}
          </div>

          <div>
            <span className="home-card-label">ROVER STATUS</span>

            <h2>
              {isOnline
                ? 'Rover Online'
                : status === 'offline'
                  ? 'Rover Offline'
                  : 'Connecting to rover'}
            </h2>

            <p>
              {isOnline
                ? 'The rover is connected and sending live telemetry.'
                : status === 'offline'
                  ? 'The rover is disconnected. Live telemetry is unavailable.'
                  : 'Waiting for device connection status.'}
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
            <strong>
              {wsConnected ? 'CONNECTED' : websocketStatus}
            </strong>
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

      <section className="home-geofence-card">
        <div>
          <span className="home-section-eyebrow">GEOFENCE</span>
          <h2>Vehicle boundary</h2>
          <p
            className={geofenceStatus === 'Outside Geofence' ? 'home-geofence-warning' : ''}
            role="status"
          >
            {hasValidGeofence
              ? `${geofenceStatus} · ${geofence.radiusMeters} m radius`
              : geofenceStatus}
          </p>
        </div>
      </section>

      <WeatherCard
        location={weatherLocation}
        weather={weather}
        onWeatherChange={setWeather}
      />

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
              className={`home-camera-status ${
                cameraStatus === 'CONNECTED' || cameraStatus === 'LIVE'
                  ? 'home-camera-online'
                  : 'home-camera-offline'
              }`}
            >
              <span />

              {cameraStatus === 'CONNECTED' || cameraStatus === 'LIVE'
                ? 'Camera connected'
                : cameraStatus === 'CONNECTING'
                  ? 'Camera connecting'
                  : 'Camera unavailable'}
            </span>
          </div>

          <div className="home-camera-view">
            <CameraFeed className="home-camera-empty" />
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

              <strong>
                {data?.alarm === true
                  ? 'Active'
                  : data?.alarm === false
                    ? 'Inactive'
                    : 'Unavailable'}
              </strong>
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

              <strong>
                {data?.obstacle === true
                  ? 'Detected'
                  : data?.obstacle === false
                    ? 'Clear'
                    : 'Unavailable'}
              </strong>
            </div>
          </div>

          <div className="home-sensor-card">
            <div className="home-sensor-icon">
              <Activity size={19} />
            </div>

            <div>
              <span>Flame</span>

              <strong>
                {data?.flame === true
                  ? 'Detected'
                  : data?.flame === false
                    ? 'Clear'
                    : 'Unavailable'}
              </strong>
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
              <MapPin size={19} />
            </div>
            <div>
              <span>GPS Fix</span>
              <strong>
                {data?.gpsFix === true
                  ? 'Acquired'
                  : data?.gpsFix === false
                    ? 'Waiting for GPS'
                    : 'Unavailable'}
              </strong>
            </div>
          </div>

          <div className="home-sensor-card">
            <div className="home-sensor-icon">
              <Activity size={19} />
            </div>
            <div>
              <span>Altitude</span>
              <strong>{formatValue(data?.altitude, ' m')}</strong>
            </div>
          </div>

          <div className="home-sensor-card">
            <div className="home-sensor-icon">
              <Activity size={19} />
            </div>
            <div>
              <span>Temperature</span>
              <strong>{formatValue(weather?.temperature, ' °C')}</strong>
            </div>
          </div>

          <div className="home-sensor-card">
            <div className="home-sensor-icon">
              <Activity size={19} />
            </div>
            <div>
              <span>Humidity</span>
              <strong>{formatValue(weather?.humidity, '%')}</strong>
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
