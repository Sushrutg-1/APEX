# APEX Folder Structure

```text
APEX/
├── backend/
│   └── src/
│       ├── controllers/   API request logic
│       ├── config/        Environment configuration
│       ├── db/            MongoDB connection
│       ├── middlewares/   Authentication and errors
│       ├── models/        User, Vehicle, Event, Snapshot
│       ├── routes/        Authentication and vehicle routes
│       ├── services/      AI service connection
│       └── websocket/     Device, camera, and dashboard sockets
├── frontend/
│   └── src/
│       ├── components/    Reusable UI and device components
│       ├── features/      Camera and map features
│       ├── pages/         Landing, auth, and dashboard pages
│       ├── redux/         Auth and vehicle state
│       ├── routes/        Application routes
│       └── services/      API, weather, and WebSocket clients
├── ai-service/
│   ├── main.py            FastAPI detection service
│   └── requirements.txt   Python dependencies
├── esp32/
│   └── firmware/
│       ├── APEX_ESP32_Firmware/    Rover controller sketch
│       └── APEX_ESP32_CAM/         Camera sketch
├── docs/
│   └── assets/            Screenshots, hardware, and diagrams
├── README.md              Project introduction
└── package.json            Root workspace scripts
```

## Important entry points

| File | Responsibility |
| --- | --- |
| `backend/src/server.js` | Starts the backend HTTP and WebSocket server |
| `backend/src/app.js` | Configures Express and routes |
| `frontend/src/main.jsx` | Starts the React application |
| `frontend/src/App.jsx` | Connects providers and routes |
| `ai-service/main.py` | Starts the FastAPI AI service |
| `APEX_ESP32_Firmware.ino` | Runs rover control and telemetry |
| `APEX_ESP32_CAM.ino` | Runs camera capture and streaming |
