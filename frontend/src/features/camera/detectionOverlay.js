const getContainedImageRect = (containerWidth, containerHeight, imageWidth, imageHeight) => {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return null;
  }

  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);

  return {
    left: (containerWidth - imageWidth * scale) / 2,
    top: (containerHeight - imageHeight * scale) / 2,
    width: imageWidth * scale,
    height: imageHeight * scale,
    scale,
  };
};

const clampDetection = (detection, imageWidth, imageHeight) => {
  const left = Math.max(0, Math.min(imageWidth, detection.x));
  const top = Math.max(0, Math.min(imageHeight, detection.y));
  const right = Math.max(left, Math.min(imageWidth, detection.x + detection.width));
  const bottom = Math.max(top, Math.min(imageHeight, detection.y + detection.height));

  return { left, top, right, bottom };
};

const getClassColor = (className) => {
  const colors = ['#22c55e', '#38bdf8', '#f59e0b', '#f472b6', '#a78bfa', '#fb7185'];
  const hash = [...className].reduce((total, character) => total + character.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const drawDetections = (context, canvas, detection) => {
  const rect = getContainedImageRect(
    canvas.clientWidth,
    canvas.clientHeight,
    detection?.imageWidth,
    detection?.imageHeight
  );

  if (!rect) {
    return 0;
  }

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
  canvas.height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  context.lineWidth = 2;
  context.font = '700 12px Arial, sans-serif';
  context.textBaseline = 'top';

  let drawn = 0;
  for (const object of detection.detections) {
    const box = clampDetection(object, detection.imageWidth, detection.imageHeight);
    const width = (box.right - box.left) * rect.scale;
    const height = (box.bottom - box.top) * rect.scale;

    if (width <= 0 || height <= 0) {
      continue;
    }

    const x = rect.left + box.left * rect.scale;
    const y = rect.top + box.top * rect.scale;
    const color = getClassColor(object.className);
    const label = `${object.className} ${Math.round(object.confidence * 100)}%`;
    const labelWidth = context.measureText(label).width + 10;
    const labelY = y >= 22 ? y - 22 : y + 2;

    context.strokeStyle = color;
    context.strokeRect(x, y, width, height);
    context.fillStyle = 'rgba(15, 23, 42, 0.92)';
    context.fillRect(x, labelY, labelWidth, 20);
    context.fillStyle = '#ffffff';
    context.fillText(label, x + 5, labelY + 4);
    drawn += 1;
  }

  return drawn;
};

export { clampDetection, drawDetections, getContainedImageRect };
