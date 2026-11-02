import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDeviceStatus,
  isDeviceHeartbeatExpired,
} from '../src/websocket/device.status.js';
import {
  getDeviceSocket,
  getCameraSocket,
  hasActiveDeviceConnection,
  removeDeviceSocket,
  removeCameraSocket,
  setCameraSocket,
  setDeviceSocket,
} from '../src/websocket/websocket.manager.js';

const OPEN = 1;
const CLOSED = 3;
const vehicleId = `test-status-${process.pid}`;

const socket = (readyState = OPEN) => ({ readyState, device: { vehicleId } });

test.afterEach(() => {
  const active = getDeviceSocket(vehicleId);
  if (active) {
    removeDeviceSocket(vehicleId, active);
  }
  const camera = getCameraSocket(vehicleId);
  if (camera) {
    removeCameraSocket(vehicleId, camera);
  }
});

test('authenticated device connection reports online and normal close reports offline', () => {
  const device = socket();
  setDeviceSocket(vehicleId, device);

  assert.equal(hasActiveDeviceConnection(vehicleId), true);
  assert.equal(getDeviceStatus(vehicleId), 'online');

  assert.equal(removeDeviceSocket(vehicleId, device), true);
  assert.equal(getDeviceStatus(vehicleId), 'offline');
});

test('closed socket is not considered an active device connection', () => {
  const device = socket(CLOSED);
  setDeviceSocket(vehicleId, device);

  assert.equal(hasActiveDeviceConnection(vehicleId), false);
  assert.equal(getDeviceStatus(vehicleId), 'offline');
});

test('camera connection also counts as the authenticated rover connection', () => {
  const camera = socket();
  setCameraSocket(vehicleId, camera);

  assert.equal(getDeviceStatus(vehicleId), 'online');
});

test('stale socket close cannot remove a newer connection', () => {
  const stale = socket();
  const current = socket();
  setDeviceSocket(vehicleId, stale);
  setDeviceSocket(vehicleId, current);

  assert.equal(removeDeviceSocket(vehicleId, stale), false);
  assert.equal(getDeviceSocket(vehicleId), current);
  assert.equal(getDeviceStatus(vehicleId), 'online');
});

test('last-seen timeout expires only at the configured heartbeat boundary', () => {
  const seenAt = new Date(1000);

  assert.equal(isDeviceHeartbeatExpired(seenAt, 1000), false);
  assert.equal(
    isDeviceHeartbeatExpired(seenAt, seenAt.getTime() + 15000),
    true
  );
});
