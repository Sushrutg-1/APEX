import { useEffect, useRef } from 'react';

import { drawDetections } from './detectionOverlay';

function DetectionOverlay({ detection }) {
  const canvasRef = useRef(null);
  const detectionRef = useRef(detection);

  useEffect(() => {
    detectionRef.current = detection;
  }, [detection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const draw = () => {
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      const drawn = detectionRef.current
        ? drawDetections(context, canvas, detectionRef.current)
        : 0;
      console.debug(
        `YOLO canvas width=${canvas.clientWidth} height=${canvas.clientHeight} boxes=${drawn}`
      );
    };

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    const drawn = detection ? drawDetections(context, canvas, detection) : 0;
    console.debug(
      `YOLO canvas width=${canvas.clientWidth} height=${canvas.clientHeight} boxes=${drawn}`
    );
  }, [detection]);

  return (
    <canvas
      ref={canvasRef}
      className="camera-feed-detection-canvas"
      aria-label="Live object detection overlay"
    />
  );
}

export default DetectionOverlay;
