# ESP32-CAM

The ESP32-CAM captures JPEG images and sends them to the backend over an
authenticated WebSocket. The backend forwards valid frames to the browser
and can send selected frames to the AI service.

## Hardware and setup

Required hardware includes an ESP32-CAM board, camera module, USB-to-serial
programmer, stable power supply, and 2.4 GHz Wi-Fi.

Install ESP32 board support in Arduino IDE. The sketch uses `WiFi.h`,
`WebSocketsClient.h`, Wire, and the ESP32 camera driver. Open
`esp32/firmware/APEX_ESP32_CAM/APEX_ESP32_CAM.ino`.

Copy the example secrets header to a local header:

```cpp
#define APEX_WIFI_SSID "YOUR_WIFI_NAME"
#define APEX_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define APEX_BACKEND_HOST "YOUR_BACKEND_HOST"
#define APEX_BACKEND_PORT 3000
#define APEX_BACKEND_USE_TLS 0
#define APEX_DEVICE_TOKEN "YOUR_DEVICE_TOKEN"
```

The sketch uses device ID `APEX-01` unless local firmware is configured for a
different provisioned vehicle. Camera initialization and JPEG configuration
are implemented in `makeCameraConfig()`.

## Communication workflow

1. The camera initializes and connects to Wi-Fi.
2. It opens a WebSocket connection to the backend.
3. It captures JPEG frames in the main loop.
4. It sends valid frames with `sendBIN()`.
5. The backend authenticates and relays frames to the dashboard.

The camera uses `x-device-id`, `x-device-token`, and
`x-device-type: camera`. It does not connect directly to the Vite frontend.

## Upload and testing

1. Start the backend.
2. Register a user and obtain a device token.
3. Add the token to the local secrets header.
4. Select the ESP32-CAM board and serial port.
5. Upload the sketch.
6. Open Serial Monitor at `115200`.
7. Check Wi-Fi, camera, WebSocket, and frame-send messages.
8. Open the dashboard and check the live feed.

Hardware photographs are not currently included in the repository. Existing
interface screenshots are in [`assets/screenshots/`](./assets/screenshots/).
