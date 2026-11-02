import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

import cameraService from './camera.service';
import DetectionOverlay from './DetectionOverlay.jsx';
import './CameraFeed.css';

function CameraFeed({
  className = '',
  imageClassName = '',
  placeholderClassName = '',
}) {
  const [frameUrl, setFrameUrl] = useState(null);
  const [status, setStatus] = useState('DISCONNECTED');
  const [detectionStatus, setDetectionStatus] = useState('UNAVAILABLE');
  const [detection, setDetection] = useState(null);
  const currentUrl = useRef(null);
  const currentFrameId = useRef(0);
  const displayedFrameId = useRef(0);

  useEffect(() => {
    const displayFrame = (frame, frameId) => {
      if (!frame) {
        return;
      }

      const nextUrl = URL.createObjectURL(frame);
      if (currentUrl.current) {
        URL.revokeObjectURL(currentUrl.current);
      }
      currentUrl.current = nextUrl;
      displayedFrameId.current = frameId;
      setFrameUrl(nextUrl);
    };

    const updateDetections = (message) => {
      if (message.status === 'UNAVAILABLE') {
        setDetectionStatus('UNAVAILABLE');
        setDetection(null);
        displayFrame(message.frame, message.frameId);
        return;
      }

      if (
        message.status === 'ACTIVE' &&
        message.frame &&
        Number.isInteger(message.imageWidth) &&
        Number.isInteger(message.imageHeight) &&
        Array.isArray(message.detections)
      ) {
        currentFrameId.current = message.frameId;
        displayFrame(message.frame, message.frameId);
        setDetectionStatus('ACTIVE');
        setDetection({
          frameId: message.frameId,
          imageWidth: message.imageWidth,
          imageHeight: message.imageHeight,
          detections: message.detections,
        });
        console.debug(
          `YOLO overlay received frame=${message.frameId} boxes=${message.detections.length}`
        );
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
        currentFrameId.current = message.frameId;
        if (!displayedFrameId.current) {
          displayFrame(message.frame, message.frameId);
        }
      }

      if (message.type === 'DETECTION_STATUS') {
        setDetectionStatus(message.status);
      }

      if (message.type === 'DETECTION') {
        updateDetections(message);
      }
    });

    return () => {
      cameraUnsubscribe();
      if (currentUrl.current) {
        URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = null;
      }
    };
  }, []);

  if (frameUrl) {
    return (
      <div className="camera-feed-container">
        <img
          className={`${imageClassName} camera-feed-image`}
          src={frameUrl}
          alt="Live rover camera"
          onError={() => {
            if (currentUrl.current) {
              URL.revokeObjectURL(currentUrl.current);
              currentUrl.current = null;
            }
            setFrameUrl(null);
            setStatus('DISCONNECTED');
            console.error('Received camera frame could not be decoded as an image');
          }}
          onLoad={(event) => {
            console.debug(
              `Dashboard decoded camera frame: ${event.currentTarget.naturalWidth}x${event.currentTarget.naturalHeight}`
            );
          }}
        />
        <span className="camera-feed-live-badge">LIVE</span>
        <span
          className={`camera-feed-ai-badge ${
            detectionStatus === 'ACTIVE' ? 'active' : ''
          }`}
        >
          {detectionStatus === 'ACTIVE'
            ? detection?.detections.length
              ? `OBJECTS DETECTED (${detection.detections.length})`
              : 'NO OBJECTS'
            : detectionStatus === 'DETECTING'
              ? 'DETECTING'
              : 'AI OFFLINE'}
        </span>
        <DetectionOverlay detection={detection} />
        {detection?.status === 'ACTIVE' && (
          <div className="camera-feed-detection-summary" aria-live="polite">
            <strong>
              {detection.detections.length
                ? `${detection.detections.length} object${
                    detection.detections.length === 1 ? '' : 's'
                  } detected`
                : 'No objects detected'}
            </strong>
            {detection.detections.map((object, index) => (
              <span key={`${object.className}-${index}`}>
                {object.className} — {Math.round(object.confidence * 100)}%
              </span>
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
          ? 'The camera is not currently sending frames through the backend.'
          : 'No live camera frame is currently available.'}
      </span>
      <small className="camera-feed-ai-placeholder">AI UNAVAILABLE</small>
    </div>
  );
}

export default CameraFeed;
