#include <WiFi.h>
#include <WebSocketsServer.h>
#include <esp_camera.h>

#if __has_include("../APEX_ESP32_Firmware/firmware_secrets.h")
#include "../APEX_ESP32_Firmware/firmware_secrets.h"
#endif

#ifndef APEX_WIFI_SSID
#define APEX_WIFI_SSID ""
#endif

#ifndef APEX_WIFI_PASSWORD
#define APEX_WIFI_PASSWORD ""
#endif

const uint16_t CAMERA_WS_PORT = 81;
const unsigned long WIFI_RETRY_INTERVAL_MS = 5000;
const unsigned long FRAME_INTERVAL_MS = 100;

WebSocketsServer cameraSocket(CAMERA_WS_PORT);
bool cameraReady = false;
bool cameraSocketStarted = false;
unsigned long lastWiFiAttempt = 0;
unsigned long lastFrameSent = 0;

void onCameraSocketEvent(uint8_t clientId, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.printf("[CAMERA] Client %u connected\n", clientId);
      cameraSocket.sendTXT(clientId, "{\"type\":\"CAMERA_CONNECTED\"}");
      break;

    case WStype_DISCONNECTED:
      Serial.printf("[CAMERA] Client %u disconnected\n", clientId);
      break;

    case WStype_ERROR:
      Serial.printf("[CAMERA] WebSocket error for client %u\n", clientId);
      break;

    default:
      break;
  }
}

bool initializeCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = 5;
  config.pin_d1 = 18;
  config.pin_d2 = 19;
  config.pin_d3 = 21;
  config.pin_d4 = 36;
  config.pin_d5 = 39;
  config.pin_d6 = 34;
  config.pin_d7 = 35;
  config.pin_xclk = 0;
  config.pin_pclk = 22;
  config.pin_vsync = 25;
  config.pin_href = 23;
  config.pin_sccb_sda = 26;
  config.pin_sccb_scl = 27;
  config.pin_pwdn = 32;
  config.pin_reset = -1;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
    config.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 14;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  const esp_err_t result = esp_camera_init(&config);
  if (result != ESP_OK) {
    Serial.printf("[CAMERA] Initialization failed: 0x%x\n", result);
    cameraSocket.broadcastTXT("{\"type\":\"CAMERA_ERROR\",\"message\":\"Camera initialization failed\"}");
    return false;
  }

  Serial.println("[CAMERA] AI Thinker camera initialized");
  return true;
}

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  if (!APEX_WIFI_SSID[0] || !APEX_WIFI_PASSWORD[0]) {
    return;
  }

  if (millis() - lastWiFiAttempt < WIFI_RETRY_INTERVAL_MS) {
    return;
  }

  lastWiFiAttempt = millis();
  Serial.println("[WIFI] Connecting/reconnecting...");
  WiFi.disconnect();
  WiFi.begin(APEX_WIFI_SSID, APEX_WIFI_PASSWORD);
}

void streamFrame() {
  if (!cameraReady || WiFi.status() != WL_CONNECTED ||
      cameraSocket.connectedClients() == 0 ||
      millis() - lastFrameSent < FRAME_INTERVAL_MS) {
    return;
  }

  lastFrameSent = millis();
  camera_fb_t* frame = esp_camera_fb_get();
  if (!frame) {
    Serial.println("[CAMERA] Frame capture failed");
    cameraSocket.broadcastTXT("{\"type\":\"CAMERA_ERROR\",\"message\":\"Frame capture failed\"}");
    return;
  }

  if (frame->format != PIXFORMAT_JPEG || frame->len == 0) {
    Serial.println("[CAMERA] Captured frame is not a valid JPEG");
    cameraSocket.broadcastTXT("{\"type\":\"CAMERA_ERROR\",\"message\":\"Invalid JPEG frame\"}");
    esp_camera_fb_return(frame);
    return;
  }

  cameraSocket.broadcastBIN(frame->buf, frame->len);
  esp_camera_fb_return(frame);
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  Serial.println("[CAMERA] Initializing AI Thinker ESP32-CAM");
  cameraReady = initializeCamera();

  cameraSocket.begin();
  cameraSocket.onEvent(onCameraSocketEvent);
  cameraSocketStarted = true;

  if (!APEX_WIFI_SSID[0] || !APEX_WIFI_PASSWORD[0]) {
    Serial.println("[WIFI] Configure local firmware_secrets.h before use");
  } else {
    lastWiFiAttempt = millis();
    Serial.println("[WIFI] Connecting...");
    WiFi.begin(APEX_WIFI_SSID, APEX_WIFI_PASSWORD);
  }
}

void loop() {
  maintainWiFi();

  if (WiFi.status() == WL_CONNECTED) {
    static bool reportedConnected = false;
    if (!reportedConnected) {
      Serial.print("[WIFI] Connected, IP: ");
      Serial.println(WiFi.localIP());
      Serial.printf("[CAMERA] JPEG WebSocket listening on port %u\n", CAMERA_WS_PORT);
      reportedConnected = true;
    }
  }

  if (cameraSocketStarted) {
    cameraSocket.loop();
  }

  streamFrame();
  yield();
}
