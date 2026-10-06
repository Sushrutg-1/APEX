# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## APEX device configuration

Copy `.env.example` to `.env` and configure the API, dashboard WebSocket, and map provider values. Set `VITE_CAMERA_WS_URL` to the ESP32-CAM binary JPEG WebSocket URL (for example, `ws://<camera-host>:81`). Leave it unset when the camera is not configured; the dashboard will report that the camera is unavailable.

The backend and firmware must use the same `DEVICE_TOKEN`. Configure it only in the ignored [backend `.env`](../backend/.env) and a local copy of [firmware_secrets.example.h](../esp32/firmware/firmware_secrets.example.h) saved as `esp32/firmware/APEX_ESP32_Firmware/firmware_secrets.h`. Both ESP32 sketches read the main rover sketch's local secrets file. Never commit local credential files.

The dashboard calculates geofence status from live, valid rover GPS telemetry; its configured radius is persisted by the authenticated backend. The Home dashboard retrieves current weather from Open-Meteo only when GPS is available, after meaningful movement, and at a ten-minute refresh interval. No weather API key is required.
