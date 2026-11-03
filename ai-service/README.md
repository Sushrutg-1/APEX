# APEX AI Service

The AI service is a small FastAPI application. It receives JPEG images from
the backend and returns YOLO11 object detections. ByteTrack gives detected
objects stable IDs between frames.

## Run locally

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

The service reads settings from `.env`. Use
`YOLO_MODEL=yolo11n.pt` unless a different local model is required.

Health routes are `/health` and `/ready`. The detection route is
`POST /detect` with an `image/jpeg` body.

See the main [environment guide](../docs/ENV.md) for safe placeholder
configuration.
