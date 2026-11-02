import asyncio
import hmac
import io
import os
import threading
import time
from contextlib import asynccontextmanager
from types import SimpleNamespace
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool
import torch
from ultralytics.engine.results import Boxes
from ultralytics.trackers.byte_tracker import BYTETracker
from ultralytics import YOLO
from dotenv import load_dotenv

load_dotenv()

MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
MAX_DETECTIONS = 100
PERSON_CLASS_ID = 0
inference_lock = asyncio.Lock()
inference_count = 0
tracker_states = {}
tracker_lock = threading.Lock()


def create_tracker() -> BYTETracker:
    return BYTETracker(
        SimpleNamespace(
            track_high_thresh=float(os.getenv("TRACK_HIGH_THRESHOLD", "0.25")),
            track_low_thresh=float(os.getenv("TRACK_LOW_THRESHOLD", "0.1")),
            new_track_thresh=float(os.getenv("TRACK_NEW_THRESHOLD", "0.25")),
            track_buffer=int(os.getenv("TRACK_BUFFER", "30")),
            match_thresh=float(os.getenv("TRACK_MATCH_THRESHOLD", "0.8")),
            fuse_score=os.getenv("TRACK_FUSE_SCORE", "true").lower() == "true",
        )
    )


def get_tracker(camera_id: str) -> BYTETracker:
    with tracker_lock:
        idle_timeout = float(os.getenv("TRACKER_IDLE_TIMEOUT_SECONDS", "300"))
        now = time.monotonic()
        for stale_id, state in list(tracker_states.items()):
            if now - state["last_used_at"] > idle_timeout:
                tracker_states.pop(stale_id, None)
        state = tracker_states.get(camera_id)
        if state is None:
            state = {"tracker": create_tracker(), "last_used_at": now}
            tracker_states[camera_id] = state
        state["last_used_at"] = now
        return state["tracker"]


def reset_tracker(camera_id: str) -> None:
    with tracker_lock:
        tracker_states.pop(camera_id, None)


def apply_tracking(
    detections: list[dict],
    camera_id: str,
    image_width: int,
    image_height: int,
) -> list[dict]:
    tracker = get_tracker(camera_id)
    values = [
        [
            item["x"],
            item["y"],
            item["x"] + item["width"],
            item["y"] + item["height"],
            item["confidence"],
            item["classId"],
        ]
        for item in detections
    ]
    boxes = Boxes(
        torch.tensor(values, dtype=torch.float32).reshape(-1, 6),
        (image_height, image_width),
    )
    tracked = tracker.update(boxes.cpu().numpy())
    tracked_detections = []
    for row in tracked:
        left, top, right, bottom, track_id, _, _, index = row[:8]
        source = detections[int(index)]
        tracked_detections.append(
            {
                **{key: value for key, value in source.items() if key != "classId"},
                "x": max(0.0, float(left)),
                "y": max(0.0, float(top)),
                "width": max(0.0, min(float(right), image_width) - max(float(left), 0.0)),
                "height": max(0.0, min(float(bottom), image_height) - max(float(top), 0.0)),
                "trackId": int(track_id),
            }
        )
    return [item for item in tracked_detections if item["width"] > 0 and item["height"] > 0]


def get_image_size() -> int:
    configured_size = int(os.getenv("YOLO_IMAGE_SIZE", "512"))
    if configured_size < 320 or configured_size > 1280:
        raise ValueError("YOLO_IMAGE_SIZE must be between 320 and 1280")
    return configured_size


def get_inference_device() -> str:
    configured_device = os.getenv("YOLO_DEVICE", "").strip()
    if configured_device:
        return configured_device
    return "cuda:0" if torch.cuda.is_available() else "cpu"


def get_person_confidence() -> float:
    configured_threshold = float(os.getenv("PERSON_CONFIDENCE_THRESHOLD", "0.35"))
    if configured_threshold < 0 or configured_threshold > 1:
        raise ValueError("PERSON_CONFIDENCE_THRESHOLD must be between 0 and 1")
    return configured_threshold


def load_model(model_path: Path) -> YOLO:
    return YOLO(str(model_path))


def warmup_model(model: YOLO, device: str, image_size: int) -> None:
    model.predict(
        source=Image.new("RGB", (640, 640)),
        conf=0.5,
        max_det=1,
        imgsz=image_size,
        device=device,
        verbose=False,
    )


async def warmup_after_startup(app: FastAPI) -> None:
    started_at = time.perf_counter()
    print("YOLO warmup started")
    try:
        await run_in_threadpool(
            warmup_model,
            app.state.model,
            app.state.device,
            app.state.image_size,
        )
        app.state.inference_ready = True
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        print(f"YOLO warmup completed in {elapsed_ms:.1f}ms")
    except asyncio.CancelledError:
        print("YOLO warmup cancelled during shutdown")
        raise
    except Exception as error:
        app.state.inference_ready = False
        print(f"YOLO warmup failed: {error}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_path = Path(os.getenv("YOLO_MODEL") or "yolo11n.pt").expanduser()
    if not model_path.is_absolute() and model_path.parent == Path("."):
        model_path = Path.home() / ".cache" / "apex" / model_path.name
    model_path.parent.mkdir(parents=True, exist_ok=True)
    app.state.model = None
    app.state.inference_ready = False
    app.state.device = get_inference_device()
    app.state.image_size = get_image_size()
    app.state.person_confidence = get_person_confidence()
    print(
        f"YOLO model initialization started: {model_path.name} "
        f"device={app.state.device} imgsz={app.state.image_size} "
        f"personConf={app.state.person_confidence}"
    )
    app.state.model = await run_in_threadpool(load_model, model_path)
    print(
        f"YOLO model loaded: {model_path.name}; startup warmup deferred"
    )
    warmup_task = asyncio.create_task(warmup_after_startup(app))
    yield
    warmup_task.cancel()
    try:
        await warmup_task
    except asyncio.CancelledError:
        pass
    app.state.model = None
    app.state.inference_ready = False


app = FastAPI(title="APEX YOLO Inference", lifespan=lifespan)


def is_model_loaded() -> bool:
    return getattr(app.state, "model", None) is not None


def can_accept_inference() -> bool:
    return (
        is_model_loaded()
        and getattr(app.state, "inference_ready", False)
        and not inference_lock.locked()
    )


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


def get_detections(
    model: YOLO,
    image: Image.Image,
    confidence: float,
    device: str,
    image_size: int,
    person_confidence: float,
) -> tuple[list[dict], float]:
    started_at = time.perf_counter()
    with torch.inference_mode():
        results = model.predict(
            source=image,
            conf=min(confidence, person_confidence),
            max_det=MAX_DETECTIONS,
            imgsz=image_size,
            device=device,
            verbose=False,
        )
    inference_ms = (time.perf_counter() - started_at) * 1000
    result = results[0]
    detections = []

    if result.boxes is None:
        return detections, inference_ms

    boxes = result.boxes.xyxy.cpu().tolist()
    class_ids = result.boxes.cls.cpu().tolist()
    confidences = result.boxes.conf.cpu().tolist()
    names = result.names

    for coordinates, class_id, score in zip(boxes, class_ids, confidences):
        minimum_confidence = (
            person_confidence if int(class_id) == PERSON_CLASS_ID else confidence
        )
        if score < minimum_confidence:
            continue
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
                "classId": int(class_id),
                "confidence": float(score),
                "x": x,
                "y": y,
                "width": right - x,
                "height": bottom - y,
            }
        )

    return detections, inference_ms


@app.get("/health-check")
async def health_check():
    return {
        "status": "ok",
        "modelLoaded": is_model_loaded(),
        "activeTrackers": len(tracker_states),
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "apex-ai-service",
        "modelLoaded": is_model_loaded(),
    }


@app.get("/ready")
async def ready():
    model_loaded = is_model_loaded()
    inference_accepted = can_accept_inference()
    if not inference_accepted:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "service": "apex-ai-service",
                "modelLoaded": model_loaded,
                "inferenceAccepted": False,
            },
        )

    return {
        "status": "ready",
        "service": "apex-ai-service",
        "modelLoaded": True,
        "inferenceAccepted": True,
    }


@app.post("/detect")
async def detect(
    request: Request,
    confidence: float = Query(default=0.35, ge=0.0, le=1.0),
):
    expected_token = os.getenv("AI_SERVICE_TOKEN", "")
    supplied_token = request.headers.get("x-ai-service-token", "")
    if expected_token and not hmac.compare_digest(supplied_token, expected_token):
        raise HTTPException(status_code=401, detail="Unauthorized")

    image_bytes = await read_jpeg(request)
    camera_id = request.headers.get("x-camera-id", "default").strip()
    if not camera_id or len(camera_id) > 100:
        raise HTTPException(status_code=400, detail="Invalid x-camera-id")

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
    if not is_model_loaded() or not getattr(app.state, "inference_ready", False):
        raise HTTPException(status_code=503, detail="Inference service is not ready")

    global inference_count
    request_started_at = time.perf_counter()
    async with inference_lock:
        detections, inference_ms = await run_in_threadpool(
            get_detections,
            app.state.model,
            rgb_image,
            confidence,
            app.state.device,
            app.state.image_size,
            app.state.person_confidence,
        )
        tracking_started_at = time.perf_counter()
        detections = await run_in_threadpool(
            apply_tracking,
            detections,
            camera_id,
            image_width,
            image_height,
        )
        tracking_ms = (time.perf_counter() - tracking_started_at) * 1000
    total_ms = (time.perf_counter() - request_started_at) * 1000
    inference_count += 1
    if inference_count == 1 or inference_count % 25 == 0:
        print(
            f"YOLO inference request={inference_count} "
            f"image={image_width}x{image_height} "
            f"inferenceMs={inference_ms:.1f} trackingMs={tracking_ms:.1f} totalMs={total_ms:.1f} "
            f"detections={len(detections)}"
        )

    return {
        "imageWidth": image_width,
        "imageHeight": image_height,
        "detections": detections,
        "inferenceMs": round(inference_ms, 1),
        "trackingMs": round(tracking_ms, 1),
        "totalMs": round(total_ms, 1),
    }


@app.delete("/trackers/{camera_id}")
async def delete_tracker(camera_id: str, request: Request):
    expected_token = os.getenv("AI_SERVICE_TOKEN", "")
    supplied_token = request.headers.get("x-ai-service-token", "")
    if expected_token and not hmac.compare_digest(supplied_token, expected_token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    reset_tracker(camera_id)
    return {"status": "ok"}
