import { useEffect, useState } from 'react';
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
import { useSelector } from 'react-redux';

import websocketService from '../../services/websocket.service';
import VEHICLE_COMMAND from '../../constants/vehicleCommand.constant';
import Map from '../../features/map/Map';

import './Control.css';

function Control() {
  const { status } = useSelector((state) => state.vehicle);

  const isOnline = status === 'online';

  const [mode, setMode] = useState('CONTINUOUS');
  const [pan, setPan] = useState(90);
  const [tilt, setTilt] = useState(90);
  const [commandStatus, setCommandStatus] = useState('Ready');

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

    sendCommand(command);
  };

  const stopRover = () => {
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

  useEffect(() => {
    return () => {
      if (websocketService.isConnected()) {
        websocketService.send({
          type: 'COMMAND',
          command: VEHICLE_COMMAND.STOP,
          mode: 'CONTINUOUS',
        });
      }
    };
  }, []);

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
            <strong>{isOnline ? 'Rover Online' : 'Rover Offline'}</strong>
            <span>{isOnline ? 'Control connection active' : 'Control unavailable'}</span>
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
              <span className={isOnline ? 'online' : 'offline'} />
              {isOnline ? 'LIVE' : 'OFFLINE'}
            </div>
          </div>

          <div className="control-camera-view">
            {isOnline ? (
              <div className="control-camera-placeholder">
                <Camera size={30} />
                <strong>Camera stream</strong>
                <span>ESP32-CAM WebSocket stream will appear here.</span>
              </div>
            ) : (
              <div className="control-camera-placeholder">
                <Camera size={30} />
                <strong>Camera unavailable</strong>
                <span>Connect the rover to view the live camera.</span>
              </div>
            )}
          </div>
        </div>

        <div className="control-live-card control-map-card">
          <div className="control-live-card-header">
            <div>
              <span className="control-card-eyebrow">LIVE LOCATION</span>
              <h2>Rover Location</h2>
            </div>
          </div>

          <div className="control-map-view">
            <Map />
          </div>
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
