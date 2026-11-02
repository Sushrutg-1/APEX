# APEX YOLO service

This service runs real Ultralytics YOLO inference on JPEG frames sent by the
authenticated APEX backend. It uses the small COCO-pretrained `yolo11n.pt`
model by default. The weights are downloaded to `~/.cache/apex/yolo11n.pt` on
first start; model weights are not stored in this repository.

The APEX benchmark on the available CPU used the same 810x1080 JPEG and
`imgsz=640`: `yolo11n.pt` had a 46.3 ms median inference time (about 21.6
FPS), while `yolo11s.pt` had an 83.1 ms median (about 12 FPS) with the same
classes detected. APEX therefore keeps `yolo11n.pt` for the responsive live
camera path. Re-run the benchmark on a different deployment before changing
the model.

## Install and run (Windows PowerShell)

Use Python 3.12 for compatibility with the PyTorch/Ultralytics runtime:

```powershell
cd ai-service
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The first startup needs internet access to download model weights. To use a
locally provisioned compatible Ultralytics model instead, set `YOLO_MODEL` to
its path before starting the service. Do not commit model weights. A simple
model filename is resolved inside `~/.cache/apex/`; an absolute or nested path
is used as provided.

The health endpoint is `http://127.0.0.1:8000/health-check`. Inference accepts
raw `image/jpeg` bodies at `/detect` and returns model class names, confidence,
original image dimensions, and boxes in original-image pixel coordinates.

## Backend settings

Set these in `backend/.env`:

```dotenv
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_TOKEN=
YOLO_ENABLED=true
YOLO_CONFIDENCE_THRESHOLD=0.35
YOLO_DETECTION_FPS=10
```

The AI service also accepts:

```dotenv
YOLO_MODEL=yolo11n.pt
YOLO_IMAGE_SIZE=512
YOLO_DEVICE=
PERSON_CONFIDENCE_THRESHOLD=0.35
```

`YOLO_DEVICE` is empty for automatic selection, `cuda:0` when CUDA is
available, or CPU otherwise. The local benchmark selected 512px: it measured
38.0ms median CPU inference versus 34.8ms at 416px and 49.2ms at 640px on
the bundled COCO bus image. The 512px run retained stronger person
confidences than 416px; validate again with representative ESP32 frames.

Each authenticated camera is tracked with Ultralytics ByteTrack. The optional
tracker settings are `TRACK_HIGH_THRESHOLD`, `TRACK_LOW_THRESHOLD`,
`TRACK_NEW_THRESHOLD`, `TRACK_BUFFER`, `TRACK_MATCH_THRESHOLD`, and
`TRACK_FUSE_SCORE`. The backend passes the authenticated vehicle ID as the
camera identity; clients cannot choose an arbitrary tracker identity.

For local performance checks, run the same representative camera JPEGs with
`YOLO_IMAGE_SIZE=416`, `512`, and `640` and compare `inferenceMs`, total
latency, and missed detections. Do not infer accuracy changes from timing alone.

The pretrained COCO model can confuse visually similar classes such as
bottles and umbrellas. The service uses the model's own `result.names`
mapping and does not swap class IDs. For reliable APEX-specific
classification, collect labeled JPEGs for bottles, umbrellas, and the
expected rover environment, split them into train/validation sets, and
fine-tune an Ultralytics model. Set `YOLO_MODEL` to the resulting weights only
after validating precision and latency on representative camera frames.

If the AI service is reachable beyond the local machine, configure the same
long random `AI_SERVICE_TOKEN` in both the backend and this service environment.
Keep the AI service bound to loopback unless remote access is explicitly
required. The token is never sent to the browser.

## End-to-end run and test

Start the backend from `backend` with `npm start`, and the frontend from
`frontend` with `npm run dev`. Sign in, open Control, and point the ESP32-CAM at
objects. `AI ACTIVE` indicates successful inference; `AI UNAVAILABLE` indicates
that detection is disabled or the model/service is unavailable. The camera
stream does not depend on the AI service.

Use **Take snapshot** to store the current JPEG, its real YOLO results (or an
unavailable detection status), and the latest valid GPS coordinates. Open
History to view the image, capture time, detected class names, and confidence.
