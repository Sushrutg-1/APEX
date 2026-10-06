import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

import api from '../../services/api.service';
import websocketService from '../../services/websocket.service';
import cameraService from './camera.service';
import './CameraFeed.css';

const DEFAULT_DETECTION_INTERVAL_MS = 200;
const UNAVAILABLE_RETRY_INTERVAL_MS = 5000;

function CameraFeed({
  className = '',
  imageClassName = '',
  placeholderClassName = '',
}) {
  const [frameUrl, setFrameUrl] = useState(null);
  const [status, setStatus] = useState('DISCONNECTED');
  const [detectionStatus, setDetectionStatus] = useState('UNAVAILABLE');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [detection, setDetection] = useState(null);
  const currentUrl = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let active = true;
    let detectionInFlight = false;
    let detectionTimer = null;
    let pendingFrame = null;
    let nextRequestAt = 0;
    let activeRequest = null;

    const updateDetections = (message) => {
      if (message.status === 'UNAVAILABLE') {
        setDetectionStatus('UNAVAILABLE');
        setDetection(null);
        return;
      }

      if (
        message.status === 'ACTIVE' &&
        Number.isInteger(message.imageWidth) &&
        Number.isInteger(message.imageHeight) &&
        Array.isArray(message.detections)
      ) {
        setDetectionStatus('ACTIVE');
        setDetection({
          imageWidth: message.imageWidth,
          imageHeight: message.imageHeight,
          detections: message.detections,
        });
      }
    };

    const runDetection = async () => {
      if (!active || detectionInFlight || !pendingFrame) {
        return;
      }

      const wait = Math.max(0, nextRequestAt - Date.now());
      if (wait > 0) {
        if (!detectionTimer) {
          detectionTimer = setTimeout(() => {
            detectionTimer = null;
            void runDetection();
          }, wait);
        }
        return;
      }

      const frame = pendingFrame;
      pendingFrame = null;
      detectionInFlight = true;
      activeRequest = new AbortController();

      try {
        const { data } = await api.post('/vehicles/me/detections', frame, {
          headers: { 'Content-Type': 'image/jpeg' },
          signal: activeRequest.signal,
        });
        if (!active) {
          return;
        }

        const result = data.data;
        if (result.status === 'ACTIVE') {
          updateDetections(result);
        } else if (result.status === 'UNAVAILABLE') {
          updateDetections(result);
        }

        const retryInterval = Number.isFinite(result.nextFrameInMs)
          ? Math.max(100, result.nextFrameInMs)
          : DEFAULT_DETECTION_INTERVAL_MS;
        nextRequestAt = Date.now() + retryInterval;
      } catch (error) {
        if (!activeRequest.signal.aborted && active) {
          setDetectionStatus('UNAVAILABLE');
          setDetection(null);
          nextRequestAt = Date.now() + UNAVAILABLE_RETRY_INTERVAL_MS;
          console.error('Object detection request failed:', error.message);
        }
      } finally {
        detectionInFlight = false;
        activeRequest = null;
        if (pendingFrame) {
          void runDetection();
        }
      }
    };

    const cameraUnsubscribe = cameraService.subscribe((message) => {
      if (message.type === 'STATUS') {
        setStatus(message.status);
        if (
          message.status === 'UNAVAILABLE' ||
          message.status === 'DISCONNECTED' ||
          message.status === 'ERROR'
        ) {
          pendingFrame = null;
          setDetectionStatus('UNAVAILABLE');
          setDetection(null);
          if (currentUrl.current) {
            URL.revokeObjectURL(currentUrl.current);
            currentUrl.current = null;
          }
          setFrameUrl(null);
        }
        return;
      }

      if (message.type === 'FRAME_UNAVAILABLE') {
        pendingFrame = null;
        setDetectionStatus('UNAVAILABLE');
        setDetection(null);
        if (currentUrl.current) {
          URL.revokeObjectURL(currentUrl.current);
          currentUrl.current = null;
        }
        setFrameUrl(null);
        return;
      }

      if (message.type === 'FRAME') {
        const nextUrl = URL.createObjectURL(message.frame);
        if (currentUrl.current) {
          URL.revokeObjectURL(currentUrl.current);
        }
        currentUrl.current = nextUrl;
        setFrameUrl(nextUrl);

        pendingFrame = message.frame;
        void runDetection();
      }
    });

    const websocketUnsubscribe = websocketService.subscribe((message) => {
      if (message.type === 'AI_STATUS') {
        updateDetections(message);
      } else if (message.type === 'OBJECT_DETECTION') {
        updateDetections({
          status: 'ACTIVE',
          imageWidth: message.imageWidth,
          imageHeight: message.imageHeight,
          detections: message.detections,
        });
      }
    });

    return () => {
      active = false;
      cameraUnsubscribe();
      websocketUnsubscribe();
      clearTimeout(detectionTimer);
      activeRequest?.abort();
      pendingFrame = null;
      if (currentUrl.current) {
        URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const scaledDetections = useMemo(() => {
    if (
      !detection ||
      detection.imageWidth <= 0 ||
      detection.imageHeight <= 0 ||
      containerSize.width <= 0 ||
      containerSize.height <= 0
    ) {
      return [];
    }

    const scale = Math.min(
      containerSize.width / detection.imageWidth,
      containerSize.height / detection.imageHeight
    );
    const offsetX = (containerSize.width - detection.imageWidth * scale) / 2;
    const offsetY = (containerSize.height - detection.imageHeight * scale) / 2;

    return detection.detections.map((object, index) => {
      const top = offsetY + object.y * scale;

      return {
        key: `${object.className}-${index}`,
        labelTop: top >= 22 ? -22 : 2,
        style: {
          left: `${offsetX + object.x * scale}px`,
          top: `${top}px`,
          width: `${object.width * scale}px`,
          height: `${object.height * scale}px`,
        },
        label: `${object.className.toUpperCase()} ${Math.round(object.confidence * 100)}%`,
      };
    });
  }, [containerSize, detection]);

  if (frameUrl) {
    return (
      <div className="camera-feed-container" ref={containerRef}>
        <img
          className={`${imageClassName} camera-feed-image`}
          src={frameUrl}
          alt="Live rover camera"
          onLoad={(event) => {
            setImageSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            });
          }}
        />
        <span className="camera-feed-live-badge">LIVE</span>
        <span className={`camera-feed-ai-badge ${detectionStatus === 'ACTIVE' ? 'active' : ''}`}>
          {detectionStatus === 'ACTIVE' ? 'AI ACTIVE' : 'AI UNAVAILABLE'}
        </span>
        {detection && imageSize.width > 0 && imageSize.height > 0 && (
          <div className="camera-feed-detection-layer" aria-label="Live object detections">
            {scaledDetections.map((object) => (
              <div className="camera-detection-box" key={object.key} style={object.style}>
                <span className="camera-detection-label" style={{ top: `${object.labelTop}px` }}>
                  {object.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const unavailable = status === 'UNAVAILABLE' || status === 'ERROR';
  const message =
    status === 'CONNECTING'
      ? 'Connecting to camera...'
      : status === 'ERROR' || status === 'DISCONNECTED'
        ? 'Camera unavailable'
        : 'Waiting for camera frame';

  return (
    <div className={`${className} ${placeholderClassName} camera-feed-placeholder`}>
      <Camera size={30} />
      <strong>{message}</strong>
      <span>
        {unavailable
          ? 'Configure the camera WebSocket URL to enable live frames.'
          : 'No live camera frame is currently available.'}
      </span>
      <small className="camera-feed-ai-placeholder">AI UNAVAILABLE</small>
    </div>
  );
}

export default CameraFeed;
