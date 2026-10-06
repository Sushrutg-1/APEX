# APEX YOLO service

This service runs real Ultralytics YOLO inference on JPEG frames sent by the
authenticated APEX backend. It uses the small COCO-pretrained `yolo11n.pt`
model by default. The weights are downloaded to `~/.cache/apex/yolo11n.pt` on
first start; model weights are not stored in this repository.

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
YOLO_CONFIDENCE_THRESHOLD=0.50
YOLO_DETECTION_FPS=5
```

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
