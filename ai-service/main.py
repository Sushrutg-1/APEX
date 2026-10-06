import asyncio
import hmac
import io
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool
from ultralytics import YOLO
from dotenv import load_dotenv

load_dotenv()

MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
MAX_DETECTIONS = 100
inference_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_path = Path(os.getenv("YOLO_MODEL") or "yolo11n.pt").expanduser()
    if not model_path.is_absolute() and model_path.parent == Path("."):
        model_path = Path.home() / ".cache" / "apex" / model_path.name
    model_path.parent.mkdir(parents=True, exist_ok=True)
    app.state.model = YOLO(str(model_path))
    print(f"YOLO model loaded: {model_path.name}")
    yield
    app.state.model = None


app = FastAPI(title="APEX YOLO Inference", lifespan=lifespan)


async def read_jpeg(request: Request) -> bytes:
    content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if content_type != "image/jpeg":
        raise HTTPException(status_code=415, detail="Content-Type must be image/jpeg")

    content_length = request.headers.get("content-length")
    if content_length:
        try:
            declared_size = int(content_length)
        except ValueError as error:
            raise HTTPException(status_code=400, detail="Invalid Content-Length") from error
        if declared_size > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="JPEG image exceeds 8 MB")

    chunks = []
    total_size = 0
    async for chunk in request.stream():
        total_size += len(chunk)
        if total_size > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="JPEG image exceeds 8 MB")
        chunks.append(chunk)

    image_bytes = b"".join(chunks)
    if len(image_bytes) < 3 or not image_bytes.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status_code=400, detail="Request body is not a JPEG image")

    return image_bytes


def get_detections(model: YOLO, image: Image.Image, confidence: float) -> list[dict]:
    results = model.predict(
        source=image,
        conf=confidence,
        max_det=MAX_DETECTIONS,
        verbose=False,
    )
    result = results[0]
    detections = []

    if result.boxes is None:
        return detections

    boxes = result.boxes.xyxy.cpu().tolist()
    class_ids = result.boxes.cls.cpu().tolist()
    confidences = result.boxes.conf.cpu().tolist()
    names = result.names

    for coordinates, class_id, score in zip(boxes, class_ids, confidences):
        left, top, right, bottom = coordinates
        x = max(0.0, min(float(left), float(image.width)))
        y = max(0.0, min(float(top), float(image.height)))
        right = max(x, min(float(right), float(image.width)))
        bottom = max(y, min(float(bottom), float(image.height)))

        if right <= x or bottom <= y:
            continue

        detections.append(
            {
                "className": str(names[int(class_id)]),
                "confidence": float(score),
                "x": x,
                "y": y,
                "width": right - x,
                "height": bottom - y,
            }
        )

    return detections


@app.get("/health-check")
async def health_check():
    return {"status": "ok", "modelLoaded": getattr(app.state, "model", None) is not None}


@app.post("/detect")
async def detect(
    request: Request,
    confidence: float = Query(default=0.5, ge=0.0, le=1.0),
):
    expected_token = os.getenv("AI_SERVICE_TOKEN", "")
    supplied_token = request.headers.get("x-ai-service-token", "")
    if expected_token and not hmac.compare_digest(supplied_token, expected_token):
        raise HTTPException(status_code=401, detail="Unauthorized")

    image_bytes = await read_jpeg(request)

    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            if image.format != "JPEG":
                raise HTTPException(status_code=400, detail="Request body is not a JPEG image")
            image_width, image_height = image.size
            if image_width * image_height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=413, detail="JPEG image dimensions are too large")
            image.load()
            rgb_image = image.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as error:
        raise HTTPException(status_code=400, detail="Unable to decode JPEG image") from error

    if inference_lock.locked():
        raise HTTPException(status_code=429, detail="Inference is busy")

    async with inference_lock:
        detections = await run_in_threadpool(
            get_detections,
            app.state.model,
            rgb_image,
            confidence,
        )

    return {
        "imageWidth": image_width,
        "imageHeight": image_height,
        "detections": detections,
    }
