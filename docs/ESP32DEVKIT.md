# ESP32 DevKit

The ESP32 DevKit is the rover controller. It reads sensors, controls motors
and servos, sends telemetry, and receives commands from the backend. The
camera has a separate sketch documented in [ESP32CAM.md](./ESP32CAM.md).

## Hardware pins

| Function | Pin or setting |
| --- | --- |
| Ultrasonic trigger | GPIO 12 |
| Ultrasonic echo | GPIO 35 |
| Flame sensor | GPIO 34 |
| Buzzer | GPIO 22 |
| Pan servo | GPIO 15 |
| Tilt servo | GPIO 2 |
| GPS serial | RX 16, TX 17 |
| Motor driver | GPIO 25, 26, 27, 33, 32, 14, 18, 19, 23, 4, 13, 5 |

These values come from
`esp32/firmware/APEX_ESP32_Firmware/APEX_ESP32_Firmware.ino`. Check wiring
before powering the board.

## Development setup

Use Arduino IDE with ESP32 board support. Install the libraries included by
the sketch, including Wi-Fi, WebSockets, ArduinoJson, servo, GPS, and sensor
libraries.

Create a local `firmware_secrets.h` from the tracked example:

```cpp
#define APEX_WIFI_SSID "YOUR_WIFI_NAME"
#define APEX_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define APEX_BACKEND_HOST "YOUR_BACKEND_HOST"
#define APEX_DEVICE_TOKEN "YOUR_DEVICE_TOKEN"
```

The current firmware uses backend port `3000` and device ID `APEX-01`.

## Device workflow

1. The ESP32 connects to Wi-Fi.
2. It opens a WebSocket connection to the backend.
3. It sends telemetry including vehicle ID, GPS values, rover state, and
   Wi-Fi signal.
4. It receives movement, stop, horn, pan, and tilt commands.
5. It sends command acknowledgements or errors.

## Upload and testing

1. Start MongoDB and the backend.
2. Register a user in the dashboard.
3. Put the device token in the local secrets header.
4. Select the board and COM port in Arduino IDE.
5. Upload the sketch.
6. Open Serial Monitor at `115200`.
7. Confirm Wi-Fi and WebSocket messages.
8. Test stop, movement, sensors, GPS, horn, and servos.

Never commit the local secrets header or real network credentials.
