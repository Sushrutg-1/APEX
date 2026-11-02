import websocketService from '../../services/websocket.service';
import api from '../../services/api.service';

let latestFrame = null;
let latestFrameId = 0;
let latestDetection = null;
let cameraStatus = 'offline';
let receivedFrameCount = 0;
let detectionInFlight = false;
let pendingDetection = null;
let nextDetectionAt = 0;
let detectionTimer = null;
let activeDetectionRequest = null;
let detectionRequestId = 0;
let lastSuccessfulDetectionAt = 0;
let detectionExpiryTimer = null;
const listeners = new Set();
let unsubscribeSocket = null;
const DETECTION_STALE_AFTER_MS = 15000;

const notify = (message) => listeners.forEach((listener) => listener(message));
const toUiStatus = (status) =>
  status === 'online' ? 'CONNECTED' : status === 'connecting' ? 'CONNECTING' : 'DISCONNECTED';

const notifyDetectionUnavailable = (frameId = latestFrameId) => {
  latestDetection = {
    frameId,
    frame: latestFrame,
    status: 'UNAVAILABLE',
    imageWidth: 0,
    imageHeight: 0,
    detections: [],
  };
  lastSuccessfulDetectionAt = 0;
  notify({ type: 'DETECTION', ...latestDetection });
};

const requestDetection = async (frame) => {
  if (!frame) {
    return;
  }

  const { frameId } = frame;
  const wait = Math.max(0, nextDetectionAt - Date.now());

  if (wait > 0) {
    if (!detectionTimer) {
      detectionTimer = setTimeout(() => {
        detectionTimer = null;
        void requestDetection(pendingDetection);
      }, wait);
    }
    return;
  }

  if (detectionInFlight || !pendingDetection) {
    return;
  }

  pendingDetection = null;
  detectionInFlight = true;
  const requestId = ++detectionRequestId;
  activeDetectionRequest = new AbortController();
  notify({
    type: 'DETECTION_STATUS',
    status: latestDetection?.status === 'ACTIVE' ? 'ACTIVE' : 'DETECTING',
    requestId,
    frameId,
  });

  try {
    const { data } = await api.post('/vehicles/me/detections', frame.image, {
      headers: { 'Content-Type': 'image/jpeg' },
      signal: activeDetectionRequest.signal,
    });
    const result = data.data;
    nextDetectionAt =
      Date.now() + (Number.isFinite(result.nextFrameInMs) ? Math.max(100, result.nextFrameInMs) : 200);

    if (result.status === 'ACTIVE' && requestId >= detectionRequestId) {
      latestDetection = {
        frameId,
        frame: frame.image,
        status: 'ACTIVE',
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
        inferenceMs: result.inferenceMs,
        totalMs: result.totalMs,
        detections: result.detections,
      };
      lastSuccessfulDetectionAt = Date.now();
      clearTimeout(detectionExpiryTimer);
      detectionExpiryTimer = setTimeout(() => {
        if (latestDetection?.frameId === frameId) {
          notifyDetectionUnavailable(frameId);
        }
      }, DETECTION_STALE_AFTER_MS);
      notify({ type: 'DETECTION', ...latestDetection });
      if (latestDetection.detections.length > 0) {
        console.debug(
          `YOLO detections frame=${frameId} count=${latestDetection.detections.length} ` +
          `inferenceMs=${latestDetection.inferenceMs ?? 'unknown'} ` +
          `totalMs=${latestDetection.totalMs ?? 'unknown'} ` +
          `first=${latestDetection.detections[0].className} ` +
            `confidence=${latestDetection.detections[0].confidence.toFixed(3)}`
        );
      } else {
        console.debug(`YOLO detections frame=${frameId} count=0`);
      }
    } else if (result.status === 'BUSY') {
      notify({
        type: 'DETECTION_STATUS',
        status: latestDetection?.status === 'ACTIVE' ? 'ACTIVE' : 'DETECTING',
        requestId,
        frameId,
      });
    } else if (result.status === 'UNAVAILABLE' && requestId >= detectionRequestId) {
      notifyDetectionUnavailable(frameId);
    }
  } catch (error) {
    if (!activeDetectionRequest?.signal.aborted && requestId >= detectionRequestId) {
      nextDetectionAt = Date.now() + 5000;
      notifyDetectionUnavailable(frameId);
      console.error('Object detection request failed:', error.message);
    }
  } finally {
    detectionInFlight = false;
    activeDetectionRequest = null;
    if (pendingDetection) {
      void requestDetection(pendingDetection);
    }
  }
};

const queueDetection = (image, frameId) => {
  pendingDetection = { image, frameId };
  void requestDetection(pendingDetection);
};

const handleSocketMessage = (message) => {
  if (message.type === 'CAMERA_STATUS') {
    cameraStatus = message.status;
    if (cameraStatus !== 'online') {
      latestFrame = null;
      latestFrameId = 0;
      latestDetection = null;
      lastSuccessfulDetectionAt = 0;
      clearTimeout(detectionExpiryTimer);
      detectionExpiryTimer = null;
      detectionRequestId += 1;
      pendingDetection = null;
      clearTimeout(detectionTimer);
      detectionTimer = null;
      activeDetectionRequest?.abort();
    }
    notify({ type: 'STATUS', status: toUiStatus(cameraStatus) });
    if (cameraStatus !== 'online') {
      notify({ type: 'FRAME_UNAVAILABLE' });
      notifyDetectionUnavailable(0);
    }
  } else if (message.type === 'CAMERA_FRAME') {
    const frame =
      message.frame instanceof Blob
        ? message.frame
        : new Blob([message.frame], { type: 'image/jpeg' });
    if (frame.size < 4) {
      console.warn('Ignoring empty camera frame from backend');
      return;
    }

    latestFrame = frame;
    latestFrameId += 1;
    receivedFrameCount += 1;
    if (receivedFrameCount === 1 || receivedFrameCount % 25 === 0) {
      console.debug(`Received camera frame ${receivedFrameCount}: ${frame.size} bytes`);
    }
    cameraStatus = 'online';
    notify({ type: 'STATUS', status: 'LIVE' });
    notify({ type: 'FRAME', frame, frameId: latestFrameId });
    queueDetection(frame, latestFrameId);
  } else if (message.type === 'WS_CLOSE' || message.type === 'WS_ERROR') {
    cameraStatus = 'offline';
    latestFrame = null;
    latestDetection = null;
    lastSuccessfulDetectionAt = 0;
    clearTimeout(detectionExpiryTimer);
    detectionExpiryTimer = null;
    detectionRequestId += 1;
    pendingDetection = null;
    clearTimeout(detectionTimer);
    detectionTimer = null;
    activeDetectionRequest?.abort();
    notify({ type: 'STATUS', status: 'DISCONNECTED' });
    notify({ type: 'FRAME_UNAVAILABLE' });
    notifyDetectionUnavailable(0);
  }
};

const subscribe = (listener) => {
  listeners.add(listener);
  listener({ type: 'STATUS', status: toUiStatus(cameraStatus) });
  if (latestDetection) {
    listener({ type: 'DETECTION', ...latestDetection });
  }

  if (!unsubscribeSocket) {
    unsubscribeSocket = websocketService.subscribe(handleSocketMessage);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      unsubscribeSocket?.();
      unsubscribeSocket = null;
    }
  };
};

const getLatestFrame = () => latestFrame;
const getLatestCapture = () => ({
  frame: latestFrame,
  frameId: latestFrameId,
  detection:
    latestDetection?.status === 'ACTIVE' &&
    Date.now() - lastSuccessfulDetectionAt <= DETECTION_STALE_AFTER_MS
      ? latestDetection
      : null,
});

export default { subscribe, getLatestFrame, getLatestCapture };
