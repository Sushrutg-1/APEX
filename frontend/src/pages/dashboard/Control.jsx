import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  CircleStop,
  Crosshair,
  Volume2,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';

import websocketService from '../../services/websocket.service';
import cameraService from '../../features/camera/camera.service';
import CameraFeed from '../../features/camera/CameraFeed';
import api from '../../services/api.service';
import VEHICLE_COMMAND from '../../constants/vehicleCommand.constant';
import Map from '../../features/map/Map';
import { updateGeofence } from '../../redux/slices/vehicleSlice';

import './Control.css';

function Control() {
  const dispatch = useDispatch();
  const { status, geofence } = useSelector((state) => state.vehicle);

  const isOnline = status === 'online';
  const statusLabel =
    status === 'online' ? 'Rover Online' : status === 'offline' ? 'Rover Offline' : 'Connecting';

  const [mode, setMode] = useState('CONTINUOUS');
  const [pan, setPan] = useState(90);
  const [tilt, setTilt] = useState(90);
  const [commandStatus, setCommandStatus] = useState('Ready');
  const [snapshotStatus, setSnapshotStatus] = useState('');
  const [cameraStatus, setCameraStatus] = useState('UNAVAILABLE');
  const [hasCameraFrame, setHasCameraFrame] = useState(false);
  const [geofenceFormOverride, setGeofenceFormOverride] = useState(null);
  const geofenceForm = useMemo(
    () =>
      geofenceFormOverride ?? {
        enabled: geofence?.enabled === true,
        latitude: geofence?.latitude ?? '',
        longitude: geofence?.longitude ?? '',
        radiusMeters: geofence?.radiusMeters ?? '',
      },
    [geofenceFormOverride, geofence]
  );
  const [geofenceStatus, setGeofenceStatus] = useState('');
  const [savingGeofence, setSavingGeofence] = useState(false);
  const movementTimer = useRef(null);
  const hasUnsavedGeofenceChanges =
    geofenceFormOverride !== null &&
    (geofenceForm.enabled !== (geofence?.enabled === true) ||
      Number(geofenceForm.latitude) !== geofence?.latitude ||
      Number(geofenceForm.longitude) !== geofence?.longitude ||
      Number(geofenceForm.radiusMeters) !== geofence?.radiusMeters);
  const geofencePreview =
    hasUnsavedGeofenceChanges &&
    geofenceForm.enabled &&
    Number.isFinite(Number(geofenceForm.latitude)) &&
    Number.isFinite(Number(geofenceForm.longitude)) &&
    Number(geofenceForm.radiusMeters) > 0
      ? {
          latitude: Number(geofenceForm.latitude),
          longitude: Number(geofenceForm.longitude),
          radiusMeters: Number(geofenceForm.radiusMeters),
        }
      : null;

  const handleGeofenceSelect = useCallback(
    ({ latitude, longitude }) => {
      setGeofenceFormOverride({
        ...geofenceForm,
        enabled: true,
        latitude,
        longitude,
      });
      setGeofenceStatus('Location selected. Set a radius and save the geofence.');
    },
    [geofenceForm]
  );

  const sendCommand = (command) => {
    if (!isOnline || !websocketService.isConnected()) {
      setCommandStatus('Rover unavailable');
      return false;
    }

    const sent = websocketService.send({
      type: 'COMMAND',
      command,
      mode,
    });

    setCommandStatus(sent ? `${command} command sent` : 'Command failed');

    return sent;
  };

  const sendContinuousCommand = (command) => {
    if (mode !== 'CONTINUOUS') {
      return;
    }

    if (!sendCommand(command)) {
      return;
    }

    clearInterval(movementTimer.current);
    movementTimer.current = setInterval(() => {
      if (!websocketService.isConnected()) {
        stopRover();
        return;
      }

      websocketService.send({
        type: 'COMMAND',
        command,
        mode: 'CONTINUOUS',
      });
    }, 1000);
  };

  const stopRover = () => {
    clearInterval(movementTimer.current);
    movementTimer.current = null;

    if (!isOnline || !websocketService.isConnected()) {
      return;
    }

    websocketService.send({
      type: 'COMMAND',
      command: VEHICLE_COMMAND.STOP,
      mode: 'CONTINUOUS',
    });

    setCommandStatus('Rover stopped');
  };

  const handleStepCommand = (command) => {
    if (mode !== 'STEP') {
      return;
    }

    sendCommand(command);
  };

  const handlePanChange = (event) => {
    const value = Number(event.target.value);

    setPan(value);

    if (!isOnline || !websocketService.isConnected()) {
      return;
    }

    websocketService.send({
      type: 'COMMAND',
      command: VEHICLE_COMMAND.PAN,
      value,
    });

    setCommandStatus(`Pan ${value}°`);
  };

  const handleTiltChange = (event) => {
    const value = Number(event.target.value);

    setTilt(value);

    if (!isOnline || !websocketService.isConnected()) {
      return;
    }

    websocketService.send({
      type: 'COMMAND',
      command: VEHICLE_COMMAND.TILT,
      value,
    });

    setCommandStatus(`Tilt ${value}°`);
  };

  const centerCamera = () => {
    setPan(90);
    setTilt(90);

    if (!isOnline || !websocketService.isConnected()) {
      return;
    }

    websocketService.send({
      type: 'COMMAND',
      command: VEHICLE_COMMAND.PAN,
      value: 90,
    });

    websocketService.send({
      type: 'COMMAND',
      command: VEHICLE_COMMAND.TILT,
      value: 90,
    });

    setCommandStatus('Camera centered');
  };

  const handleHorn = () => {
    if (!isOnline || !websocketService.isConnected()) {
      setCommandStatus('Rover unavailable');
      return;
    }

    const sent = websocketService.send({
      type: 'COMMAND',
      command: VEHICLE_COMMAND.HORN,
    });

    setCommandStatus(sent ? 'Horn command sent' : 'Command failed');
  };

  const takeSnapshot = async () => {
    const frame = cameraService.getLatestFrame();
    if (!frame) {
      setSnapshotStatus('Camera frame unavailable');
      return;
    }

    setSnapshotStatus('Saving...');
    try {
      const { data } = await api.post('/vehicles/me/snapshots', frame, {
        headers: { 'Content-Type': 'image/jpeg' },
      });
      const snapshot = data.data;
      const detectionMessage =
        snapshot.detectionStatus === 'UNAVAILABLE'
          ? 'AI unavailable'
          : snapshot.detectedObjects.length === 0
            ? 'No objects detected'
            : `${snapshot.detectedObjects.length} object(s) detected`;
      setSnapshotStatus(`Saved · ${detectionMessage}`);
    } catch (error) {
      setSnapshotStatus(error.response?.data?.message || 'Failed to save snapshot');
    }
  };

  const saveGeofence = async (event) => {
    event.preventDefault();
    setSavingGeofence(true);
    setGeofenceStatus('');

    try {
      const payload = geofenceForm.enabled
        ? {
            enabled: true,
            latitude: Number(geofenceForm.latitude),
            longitude: Number(geofenceForm.longitude),
            radiusMeters: Number(geofenceForm.radiusMeters),
          }
        : { enabled: false };
      const { data } = await api.put('/vehicles/me/geofence', payload);

      dispatch(updateGeofence(data.data));
      setGeofenceFormOverride(null);
      setGeofenceStatus('Geofence saved');
    } catch (error) {
      setGeofenceStatus(error.response?.data?.message || 'Unable to save geofence');
    } finally {
      setSavingGeofence(false);
    }
  };

  const removeGeofence = async () => {
    setSavingGeofence(true);
    setGeofenceStatus('');

    try {
      const { data } = await api.delete('/vehicles/me/geofence');
      dispatch(updateGeofence(data.data));
      setGeofenceFormOverride(null);
      setGeofenceStatus('Geofence removed');
    } catch (error) {
      setGeofenceStatus(error.response?.data?.message || 'Unable to remove geofence');
    } finally {
      setSavingGeofence(false);
    }
  };

  useEffect(() => {
    const unsubscribe = cameraService.subscribe((message) => {
      if (message.type === 'STATUS') {
        setCameraStatus(message.status);
      } else if (message.type === 'FRAME') {
        setHasCameraFrame(true);
      } else if (message.type === 'FRAME_UNAVAILABLE') {
        setHasCameraFrame(false);
      }
    });

    return () => {
      unsubscribe();
      clearInterval(movementTimer.current);
      if (websocketService.isConnected()) {
        websocketService.send({
          type: 'COMMAND',
          command: VEHICLE_COMMAND.STOP,
          mode: 'CONTINUOUS',
        });
      }
    };
  }, []);

  const cameraStateLabel =
    cameraStatus === 'CONNECTED' || cameraStatus === 'LIVE'
      ? 'CONNECTED'
      : cameraStatus === 'CONNECTING'
        ? 'CONNECTING'
        : cameraStatus === 'ERROR' || cameraStatus === 'DISCONNECTED'
          ? 'UNAVAILABLE'
          : 'UNAVAILABLE';

  const movementButton = ({ command, icon, label, className = '' }) => {
    if (mode === 'STEP') {
      return (
        <button
          type="button"
          className={`control-movement-button ${className}`}
          disabled={!isOnline}
          onClick={() => handleStepCommand(command)}
          aria-label={label}
        >
          {icon}
        </button>
      );
    }

    return (
      <button
        type="button"
        className={`control-movement-button ${className}`}
        disabled={!isOnline}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          sendContinuousCommand(command);
        }}
        onPointerUp={stopRover}
        onPointerCancel={stopRover}
        onPointerLeave={stopRover}
        aria-label={label}
      >
        {icon}
      </button>
    );
  };

  return (
    <main className="control-page">
      <section className="control-header">
        <div>
          <span className="control-eyebrow">ROVER CONTROL</span>
          <h1>Control Center</h1>
          <p>Operate the rover, monitor its location and view the live camera.</p>
        </div>

        <div className={`control-status ${isOnline ? 'online' : 'offline'}`}>
          <span className="control-status-dot" />

          <div>
            <strong>{statusLabel}</strong>
            <span>{isOnline ? 'Control connection active' : status === 'offline' ? 'Control unavailable' : 'Waiting for device status'}</span>
          </div>
        </div>
      </section>

      <section className="control-live-grid">
        <div className="control-live-card control-camera-card">
          <div className="control-live-card-header">
            <div>
              <span className="control-card-eyebrow">LIVE CAMERA</span>
              <h2>Rover Camera</h2>
            </div>

            <div className="control-live-indicator">
              <span className={cameraStatus === 'CONNECTED' ? 'online' : 'offline'} />
              {cameraStateLabel}
            </div>

            <button
              type="button"
              className="control-snapshot-button"
              onClick={takeSnapshot}
              disabled={!hasCameraFrame || snapshotStatus === 'Saving...'}
            >
              <Camera size={15} />
              {snapshotStatus === 'Saving...' ? 'Saving...' : 'Take snapshot'}
            </button>
          </div>

          <div className="control-camera-view">
            <CameraFeed
              placeholderClassName="control-camera-placeholder"
              imageClassName="control-camera-stream"
            />
          </div>
          {snapshotStatus && <p className="control-snapshot-status" role="status">{snapshotStatus}</p>}
        </div>

        <div className="control-live-card control-map-card">
          <div className="control-live-card-header">
            <div>
              <span className="control-card-eyebrow">LIVE LOCATION</span>
              <h2>Rover Location</h2>
            </div>
          </div>

          <div className="control-map-view">
            <Map
              onGeofenceSelect={handleGeofenceSelect}
              geofencePreview={geofencePreview}
            />
          </div>

          <form className="control-geofence-form" onSubmit={saveGeofence}>
            <div className="control-geofence-form-header">
              <strong>
                {geofence?.state === 'OUTSIDE'
                  ? 'Geofence violation'
                  : geofence?.enabled
                    ? `Geofence ${geofence.state === 'UNKNOWN' ? 'waiting for GPS' : geofence.state}`
                    : 'No geofence configured'}
              </strong>
              {geofence?.enabled && <span>Radius: {geofence.radiusMeters} m</span>}
            </div>
            <label className="control-geofence-toggle">
              <input
                type="checkbox"
                checked={geofenceForm.enabled}
                onChange={(event) =>
                  setGeofenceFormOverride({
                    ...geofenceForm,
                    enabled: event.target.checked,
                  })
                }
              />
              Enable geofence
            </label>
            <div className="control-geofence-settings">
              <span className="control-geofence-center">
                {geofenceForm.latitude !== '' && geofenceForm.longitude !== ''
                  ? `Center: ${Number(geofenceForm.latitude).toFixed(6)}, ${Number(
                      geofenceForm.longitude
                    ).toFixed(6)}`
                  : 'Click the map to select a center'}
              </span>
              <label>
                Radius (meters)
                <input
                  type="number"
                  min="1"
                  max="100000"
                  step="any"
                  value={geofenceForm.radiusMeters}
                  onChange={(event) =>
                    setGeofenceFormOverride({
                      ...geofenceForm,
                      radiusMeters: event.target.value,
                    })
                  }
                />
              </label>
              <button
                type="submit"
                disabled={
                  savingGeofence ||
                  (geofenceForm.enabled &&
                    (geofenceForm.latitude === '' ||
                      geofenceForm.longitude === '' ||
                      !Number.isFinite(Number(geofenceForm.latitude)) ||
                      Number(geofenceForm.latitude) < -90 ||
                      Number(geofenceForm.latitude) > 90 ||
                      !Number.isFinite(Number(geofenceForm.longitude)) ||
                      Number(geofenceForm.longitude) < -180 ||
                      Number(geofenceForm.longitude) > 180 ||
                      Number(geofenceForm.radiusMeters) <= 0))
                }
              >
                {savingGeofence
                  ? 'Saving...'
                  : geofence?.enabled
                    ? 'Save geofence'
                    : 'Create geofence'}
              </button>
              {geofence?.latitude !== null && geofence?.latitude !== undefined && (
                <button
                  type="button"
                  className="control-geofence-remove"
                  onClick={removeGeofence}
                  disabled={savingGeofence}
                >
                  Remove
                </button>
              )}
            </div>
            {geofenceStatus && <span className="control-geofence-message" role="status">{geofenceStatus}</span>}
          </form>
        </div>
      </section>

      <section className="control-bottom-grid">
        <div className="control-card movement-card">
          <div className="control-card-header">
            <div>
              <span className="control-card-eyebrow">MOVEMENT</span>
              <h2>Rover Movement</h2>
            </div>

            <div className="control-mode">
              <button
                type="button"
                className={mode === 'STEP' ? 'active' : ''}
                onClick={() => {
                  stopRover();
                  setMode('STEP');
                  setCommandStatus('Step mode selected');
                }}
              >
                Step
              </button>

              <button
                type="button"
                className={mode === 'CONTINUOUS' ? 'active' : ''}
                onClick={() => {
                  setMode('CONTINUOUS');
                  setCommandStatus('Continuous mode selected');
                }}
              >
                Continuous
              </button>
            </div>
          </div>

          <div className="movement-area">
            <div className="movement-pad">
              {movementButton({
                command: VEHICLE_COMMAND.FORWARD,
                icon: <ArrowUp size={22} />,
                label: 'Move forward',
                className: 'movement-up',
              })}

              {movementButton({
                command: VEHICLE_COMMAND.LEFT,
                icon: <ArrowLeft size={22} />,
                label: 'Move left',
                className: 'movement-left',
              })}

              <button
                type="button"
                className="control-stop-button"
                disabled={!isOnline}
                onClick={stopRover}
                aria-label="Stop rover"
              >
                <CircleStop size={24} />
              </button>

              {movementButton({
                command: VEHICLE_COMMAND.RIGHT,
                icon: <ArrowRight size={22} />,
                label: 'Move right',
                className: 'movement-right',
              })}

              {movementButton({
                command: VEHICLE_COMMAND.BACKWARD,
                icon: <ArrowDown size={22} />,
                label: 'Move backward',
                className: 'movement-down',
              })}
            </div>
          </div>

          <div className="control-command-status">
            <span>COMMAND STATUS</span>
            <strong>{commandStatus}</strong>
          </div>
        </div>

        <div className="control-card camera-control-card">
          <div className="control-card-header">
            <div>
              <span className="control-card-eyebrow">CAMERA</span>
              <h2>Pan &amp; Tilt</h2>
            </div>

            <div className="camera-icon">
              <Camera size={18} />
            </div>
          </div>

          <div className="camera-controls">
            <div className="camera-slider-group">
              <div className="camera-slider-header">
                <label htmlFor="pan-control">Pan</label>
                <span>{pan}°</span>
              </div>

              <input
                id="pan-control"
                type="range"
                min="0"
                max="180"
                value={pan}
                onChange={handlePanChange}
                disabled={!isOnline}
              />
            </div>

            <div className="camera-slider-group">
              <div className="camera-slider-header">
                <label htmlFor="tilt-control">Tilt</label>
                <span>{tilt}°</span>
              </div>

              <input
                id="tilt-control"
                type="range"
                min="0"
                max="180"
                value={tilt}
                onChange={handleTiltChange}
                disabled={!isOnline}
              />
            </div>
          </div>

          <button
            type="button"
            className="camera-center-button"
            onClick={centerCamera}
            disabled={!isOnline}
          >
            <Crosshair size={16} />
            Center Camera
          </button>
        </div>

        <div className="control-card auxiliary-card">
          <div className="control-card-header">
            <div>
              <span className="control-card-eyebrow">AUXILIARY</span>
              <h2>Vehicle Actions</h2>
            </div>
          </div>

          <div className="auxiliary-content">
            <button type="button" className="horn-button" disabled={!isOnline} onClick={handleHorn}>
              <Volume2 size={18} />
              <span>Horn</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Control;
