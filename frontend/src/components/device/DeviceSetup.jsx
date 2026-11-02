import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Check, Clipboard, Eye, EyeOff, KeyRound, RefreshCw, Settings2 } from 'lucide-react';

import api from '../../services/api.service';
import { deviceStatusChanged } from '../../redux/slices/vehicleSlice';
import './DeviceSetup.css';

function DeviceSetup() {
  const dispatch = useDispatch();
  const deviceStatus = useSelector((state) => state.vehicle.deviceStatus);
  const [provisioning, setProvisioning] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProvisioning = async (reveal = false) => {
    try {
      setError('');
      const { data } = await api.get(`/vehicles/me/provisioning${reveal ? '?reveal=true' : ''}`);
      setProvisioning(data.data);
      dispatch(deviceStatusChanged(data.data));
      setRevealed(reveal);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load device setup.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.get('/vehicles/me/provisioning')
      .then(({ data }) => {
        if (active) {
          setProvisioning(data.data);
          dispatch(deviceStatusChanged(data.data));
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load device setup.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dispatch]);

  const copy = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setError('Clipboard access is unavailable. Copy the value manually.');
    }
  };

  const rotate = async () => {
    if (!window.confirm('Regenerate the device token? The firmware must be updated before reconnecting.')) {
      return;
    }
    try {
      setError('');
      const { data } = await api.post('/vehicles/me/provisioning/token');
      setProvisioning((current) => ({ ...current, ...data.data }));
      setRevealed(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to regenerate device token.');
    }
  };

  return (
    <section className="device-setup-card">
      <div className="device-setup-header">
        <div className="device-setup-title">
          <div className="device-setup-icon"><Settings2 size={19} /></div>
          <div>
            <span className="home-section-eyebrow">DEVICE PROVISIONING</span>
            <h2>Configure your ESP32-CAM</h2>
          </div>
        </div>
        <span className={`device-setup-status ${deviceStatus === 'online' ? 'online' : ''}`}>
          <span /> {deviceStatus === 'online' ? 'Device connected' : 'Device offline'}
        </span>
      </div>

      {loading ? <p className="device-setup-message">Loading secure device details...</p> : (
        <>
          <div className="device-setup-fields">
            <div>
              <span>Vehicle ID</span>
              <strong>{provisioning?.vehicleId || 'Unavailable'}</strong>
              <button type="button" onClick={() => copy('vehicle', provisioning?.vehicleId)} disabled={!provisioning?.vehicleId}>
                {copied === 'vehicle' ? <Check size={14} /> : <Clipboard size={14} />} Copy
              </button>
            </div>
            <div>
              <span>Device token</span>
              <strong className="device-setup-token">{provisioning?.deviceToken || 'Unavailable'}</strong>
              <div className="device-setup-actions">
                <button type="button" onClick={() => void loadProvisioning(!revealed)}>
                  {revealed ? <EyeOff size={14} /> : <Eye size={14} />} {revealed ? 'Hide' : 'Show'}
                </button>
                <button type="button" onClick={() => copy('token', provisioning?.deviceToken)} disabled={!revealed || !provisioning?.deviceToken}>
                  {copied === 'token' ? <Check size={14} /> : <Clipboard size={14} />} Copy
                </button>
              </div>
            </div>
          </div>
          {error && <p className="device-setup-error" role="alert">{error}</p>}
          <div className="device-setup-footer">
            <button type="button" className="device-setup-guide-button" onClick={() => setGuideOpen((value) => !value)}>
              <KeyRound size={15} /> {guideOpen ? 'Hide setup guide' : 'Configure firmware'}
            </button>
            <button type="button" className="device-setup-rotate" onClick={() => void rotate()}>
              <RefreshCw size={14} /> Regenerate token
            </button>
          </div>
          {guideOpen && (
            <div className="device-setup-guide">
              <strong>Local firmware setup</strong>
              <ol>
                <li>Copy the tracked <code>firmware_secrets.example.h</code> to <code>firmware_secrets.h</code>.</li>
                <li>Set your Wi-Fi SSID, Wi-Fi password, backend laptop IPv4 address, vehicle ID, and token.</li>
                <li>Upload <code>APEX_ESP32_CAM.ino</code> while the laptop and camera share the same LAN.</li>
                <li>Use <code>ipconfig</code> and <code>Get-NetTCPConnection -LocalPort 3000 -State Listen</code> to verify connectivity.</li>
              </ol>
              <p>Never commit the secrets header or share your device token.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default DeviceSetup;
