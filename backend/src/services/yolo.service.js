import env from '../config/env.config.js';

const MAX_DETECTIONS = 100;
const AI_REQUEST_TIMEOUT_MS = 15000;
let inferenceCount = 0;

const validateDetectionResponse = (response) => {
  const { imageWidth, imageHeight, detections, inferenceMs, totalMs } = response || {};

  if (
    !Number.isInteger(imageWidth) ||
    imageWidth <= 0 ||
    !Number.isInteger(imageHeight) ||
    imageHeight <= 0 ||
    !Array.isArray(detections) ||
    detections.length > MAX_DETECTIONS
  ) {
    throw new Error('AI service returned invalid detection metadata');
  }

  const validatedDetections = detections.map((detection) => {
    const { className, confidence, x, y, width, height } = detection || {};
    const numericValues = [confidence, x, y, width, height];

    if (
      typeof className !== 'string' ||
      className.length === 0 ||
      className.length > 80 ||
      numericValues.some((value) => typeof value !== 'number' || !Number.isFinite(value)) ||
      confidence < 0 ||
      confidence > 1 ||
      x < 0 ||
      y < 0 ||
      width <= 0 ||
      height <= 0 ||
      x + width > imageWidth ||
      y + height > imageHeight
    ) {
      throw new Error('AI service returned invalid detection data');
    }

    return {
      className,
      confidence,
      x,
      y,
      width,
      height,
    };
  });

  return {
    imageWidth,
    imageHeight,
    detections: validatedDetections,
    inferenceMs: Number.isFinite(inferenceMs) ? inferenceMs : null,
    totalMs: Number.isFinite(totalMs) ? totalMs : null,
  };
};

const getDetectionEndpoint = () => {
  const baseUrl = env.AI_SERVICE_URL.endsWith('/')
    ? env.AI_SERVICE_URL
    : `${env.AI_SERVICE_URL}/`;

  return new URL('detect', baseUrl);
};

const getServiceUnavailableReason = (error, endpoint) => {
  if (error?.name === 'AbortError') {
    return 'AI service request timed out';
  }

  if (error?.name === 'TypeError' && error?.message === 'fetch failed') {
    return `AI service is unavailable at ${endpoint.origin}`;
  }

  if (/^AI service returned HTTP \d+$/.test(error?.message || '')) {
    return error.message;
  }

  return 'AI service request failed or returned invalid data';
};

const runYoloInference = async (image, { busyRetries = 0 } = {}) => {
  if (!env.YOLO_ENABLED) {
    return null;
  }

  const headers = { 'Content-Type': 'image/jpeg' };

  if (env.AI_SERVICE_TOKEN) {
    headers['x-ai-service-token'] = env.AI_SERVICE_TOKEN;
  }

  const endpoint = getDetectionEndpoint();

  for (let attempt = 0; attempt <= busyRetries; attempt += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), AI_REQUEST_TIMEOUT_MS);

    try {
      endpoint.searchParams.set(
        'confidence',
        String(env.YOLO_CONFIDENCE_THRESHOLD)
      );

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: image,
        signal: abortController.signal,
      });

      inferenceCount += 1;
      if (inferenceCount === 1 || inferenceCount % 25 === 0) {
        console.debug(
          `YOLO response request=${inferenceCount} status=${response.status} ` +
            `contentType=${response.headers.get('content-type') || 'unknown'}`
        );
      }

      if (response.status === 429) {
        await response.body?.cancel();
        if (attempt < busyRetries) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          continue;
        }
        return { status: 'BUSY' };
      }

      if (!response.ok) {
        throw new Error(`AI service returned HTTP ${response.status}`);
      }

      const result = validateDetectionResponse(await response.json());
      if (inferenceCount === 1 || inferenceCount % 25 === 0) {
        const firstDetection = result.detections[0];
        console.debug(
          `YOLO parsed request=${inferenceCount} detections=${result.detections.length}` +
            (firstDetection
              ? ` first=${firstDetection.className} confidence=${firstDetection.confidence.toFixed(
                  3
                  )} box=${firstDetection.x},${firstDetection.y},${firstDetection.width},${firstDetection.height}` +
                  ` inferenceMs=${result.inferenceMs ?? 'unknown'} totalMs=${result.totalMs ?? 'unknown'}`
              : '')
        );
      }
      return result;
    } catch (error) {
      const reason = getServiceUnavailableReason(error, endpoint);
      console.error('YOLO inference is unavailable:', reason);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  return { status: 'BUSY' };
};

export { runYoloInference };
