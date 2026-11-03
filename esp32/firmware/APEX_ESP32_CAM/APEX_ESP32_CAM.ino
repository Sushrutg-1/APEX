#include <WiFi.h>
#define WEBSOCKETS_LOGLEVEL 2
#include <WebSocketsClient.h>
#include <Wire.h>
#include <esp_camera.h>
#include <img_converters.h>
#include <time.h>

#if __has_include("firmware_secrets.h")
#include "firmware_secrets.h"
#elif __has_include("../APEX_ESP32_Firmware/firmware_secrets.h")
#include "../APEX_ESP32_Firmware/firmware_secrets.h"
#else
#error "Missing ../APEX_ESP32_Firmware/firmware_secrets.h. Create the local secrets header before compiling."
#endif

#if APEX_BACKEND_USE_TLS
#include "render_root_ca.h"
#endif

#ifndef APEX_WIFI_SSID
#error "APEX_WIFI_SSID must be defined in firmware_secrets.h."
#endif
#ifndef APEX_WIFI_PASSWORD
#error "APEX_WIFI_PASSWORD must be defined in firmware_secrets.h."
#endif
#ifndef APEX_BACKEND_HOST
#error "APEX_BACKEND_HOST must be defined in firmware_secrets.h."
#endif
#ifndef APEX_DEVICE_TOKEN
#error "APEX_DEVICE_TOKEN must be defined in firmware_secrets.h."
#endif
#ifndef APEX_BACKEND_USE_TLS
#error "APEX_BACKEND_USE_TLS must be defined in firmware_secrets.h."
#endif
#ifndef APEX_BACKEND_PORT
#error "APEX_BACKEND_PORT must be defined in firmware_secrets.h."
#endif

const int CAMERA_PWDN_PIN = 32;
const int CAMERA_RESET_PIN = -1;
const int CAMERA_XCLK_PIN = 0;
const int CAMERA_SCCB_SDA_PIN = 26;
const int CAMERA_SCCB_SCL_PIN = 27;
const uint16_t BACKEND_PORT = APEX_BACKEND_PORT;
const char* BACKEND_PATH = "/";
const char* DEVICE_ID = "APEX-01";
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
const unsigned long FRAME_INTERVAL_MS = 100;
const unsigned long CAPTURE_RETRY_DELAY_MS = 100;
const unsigned long TX_SETTLE_DELAY_MS = 30;
const unsigned long POWER_STABILIZATION_DELAY_MS = 1000;

WebSocketsClient cameraSocket;
char wsHeaders[256];
bool cameraReady = false;
bool cameraUsesJpeg = false;
bool backendConnected = false;
bool backendConfigured = false;
bool clockSyncRequested = false;
bool clockSynchronized = false;
unsigned long lastWiFiAttempt = 0;
unsigned long lastFrameSent = 0;
unsigned long sendRetryNotBefore = 0;
unsigned long sentFrameCount = 0;
unsigned long sendFailureCount = 0;

const char* websocketEventName(WStype_t type) {
  switch (type) {
    case WStype_ERROR: return "ERROR";
    case WStype_DISCONNECTED: return "DISCONNECTED";
    case WStype_CONNECTED: return "CONNECTED";
    case WStype_TEXT: return "TEXT";
    case WStype_BIN: return "BIN";
    case WStype_FRAGMENT_TEXT_START: return "FRAGMENT_TEXT_START";
    case WStype_FRAGMENT_BIN_START: return "FRAGMENT_BIN_START";
    case WStype_FRAGMENT: return "FRAGMENT";
    case WStype_FRAGMENT_FIN: return "FRAGMENT_FIN";
    case WStype_PING: return "PING";
    case WStype_PONG: return "PONG";
    default: return "UNKNOWN";
  }
}

void onBackendEvent(WStype_t type, uint8_t* payload, size_t length) {
  Serial.printf(
    "[CAMERA WS] event=%s(%d) length=%u\n",
    websocketEventName(type), type, length
  );
  if (type == WStype_CONNECTED) {
    backendConnected = true;
    sendRetryNotBefore = 0;
    Serial.println("[CAMERA WS] Connected to APEX backend");
  } else if (type == WStype_DISCONNECTED || type == WStype_ERROR) {
    backendConnected = false;
    Serial.printf(
      "[CAMERA WS] %s, wifi=%d backendConfigured=%s\n",
      type == WStype_ERROR ? "error" : "disconnected",
      WiFi.status(),
      backendConfigured ? "yes" : "no"
    );
    if (payload && length > 0) {
      Serial.printf("[CAMERA WS] reason: %.*s\n", length, payload);
    }
  }
}

bool readSccbRegister(uint8_t address, uint8_t reg, uint8_t& value) {
  Wire.beginTransmission(address);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0 || Wire.requestFrom(address, (uint8_t)1) != 1) {
    return false;
  }
  value = Wire.read();
  return true;
}

void scanSccbBus() {
  pinMode(CAMERA_PWDN_PIN, OUTPUT);
  digitalWrite(CAMERA_PWDN_PIN, LOW);
  Wire.begin(CAMERA_SCCB_SDA_PIN, CAMERA_SCCB_SCL_PIN, 100000);
  Serial.println("[CAMERA] SCCB diagnostic scan:");

  for (uint8_t address = 0x08; address <= 0x77; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() != 0) {
      continue;
    }

    uint8_t value10 = 0;
    uint8_t value11 = 0;
    uint8_t valueF0 = 0;
    uint8_t valueF1 = 0;
    const bool hasOvPid = readSccbRegister(address, 0x0A, value10) &&
      readSccbRegister(address, 0x0B, value11);
    const bool hasAltPid = readSccbRegister(address, 0xF0, valueF0) &&
      readSccbRegister(address, 0xF1, valueF1);

    Serial.printf(
      "[CAMERA] SCCB address 0x%02X, PID 0x%02X%02X, ALT 0x%02X%02X%s%s\n",
      address,
      hasOvPid ? value10 : 0,
      hasOvPid ? value11 : 0,
      hasAltPid ? valueF0 : 0,
      hasAltPid ? valueF1 : 0,
      hasOvPid ? "" : " (PID 0x0A/0x0B unavailable)",
      hasAltPid ? "" : " (PID 0xF0/0xF1 unavailable)"
    );
  }

  Wire.end();
}

void printSensorInfo() {
  sensor_t* sensor = esp_camera_sensor_get();
  if (!sensor) {
    Serial.println("[CAMERA] Driver did not expose a sensor after initialization");
    return;
  }

  camera_sensor_info_t* info = esp_camera_sensor_get_info(&sensor->id);
  Serial.printf(
    "[CAMERA] Sensor PID=0x%04X VER=0x%02X MIDL=0x%02X MIDH=0x%02X SCCB=0x%02X\n",
    sensor->id.PID,
    sensor->id.VER,
    sensor->id.MIDL,
    sensor->id.MIDH,
    sensor->slv_addr
  );
  if (info) {
    Serial.printf(
      "[CAMERA] Sensor model=%s max=%ux%u hardware_jpeg=%s\n",
      info->name,
      resolution[info->max_size].width,
      resolution[info->max_size].height,
      info->support_jpeg ? "yes" : "no"
    );
  } else {
    Serial.println("[CAMERA] Sensor metadata is not present in this driver");
  }
}

camera_config_t makeCameraConfig(pixformat_t format) {
  camera_config_t config = {};
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
  config.pin_xclk = CAMERA_XCLK_PIN;
  config.pin_pclk = 22;
  config.pin_vsync = 25;
  config.pin_href = 23;
  config.pin_sccb_sda = CAMERA_SCCB_SDA_PIN;
  config.pin_sccb_scl = CAMERA_SCCB_SCL_PIN;
  config.pin_pwdn = CAMERA_PWDN_PIN;
  config.pin_reset = CAMERA_RESET_PIN;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = format;
  config.frame_size = FRAMESIZE_QVGA;
  config.jpeg_quality = 14;
  config.fb_count = 1;
  config.fb_location = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  return config;
}

bool initializeCamera() {
  scanSccbBus();

  camera_config_t config = makeCameraConfig(PIXFORMAT_JPEG);
  Serial.printf("[CAMERA] Trying PIXFORMAT_JPEG, frame size %d, PSRAM=%s\n",
    config.frame_size, psramFound() ? "yes" : "no");
  esp_err_t error = esp_camera_init(&config);

  if (error == ESP_OK) {
    cameraUsesJpeg = true;
    printSensorInfo();
    return true;
  }

  Serial.printf("[CAMERA] JPEG initialization failed: 0x%x\n", error);
  if (error != ESP_ERR_NOT_SUPPORTED) {
    return false;
  }

  Serial.println("[CAMERA] Retrying with RGB565 for sensors without hardware JPEG");
  esp_camera_deinit();
  config = makeCameraConfig(PIXFORMAT_RGB565);
  error = esp_camera_init(&config);
  if (error != ESP_OK) {
    Serial.printf("[CAMERA] RGB565 initialization failed: 0x%x\n", error);
    return false;
  }

  cameraUsesJpeg = false;
  printSensorInfo();
  Serial.println("[CAMERA] RGB565 fallback is active; frames will be software-encoded");
  return true;
}

void printWiFiDetails() {
  Serial.print("[WIFI] IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("[WIFI] Mask: ");
  Serial.println(WiFi.subnetMask());
  Serial.print("[WIFI] Gateway: ");
  Serial.println(WiFi.gatewayIP());
  Serial.print("[WIFI] RSSI: ");
  Serial.println(WiFi.RSSI());
}

void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    Serial.printf("[WIFI] Disconnected, reason=%d\n", info.wifi_sta_disconnected.reason);
    backendConfigured = false;
    backendConnected = false;
  } else if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
    Serial.println("[WIFI] DHCP address acquired");
    clockSyncRequested = false;
    clockSynchronized = false;
    printWiFiDetails();
  } else {
    Serial.printf("[WIFI] Event=%d\n", event);
  }
}

void startWiFi() {
  if (!APEX_WIFI_SSID[0] || !APEX_WIFI_PASSWORD[0]) {
    Serial.println("[WIFI] SSID/password are not configured");
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  WiFi.begin(APEX_WIFI_SSID, APEX_WIFI_PASSWORD);
  lastWiFiAttempt = millis();
  Serial.println("[WIFI] Connecting to configured 2.4 GHz network");
}

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
#if APEX_BACKEND_USE_TLS
    if (!clockSynchronized) {
      if (!clockSyncRequested) {
        configTime(0, 0, "pool.ntp.org", "time.nist.gov");
        clockSyncRequested = true;
        Serial.println("[TLS] Waiting for NTP time before certificate validation");
      }
      if (time(nullptr) < 8 * 3600 * 2) {
        return;
      }
      clockSynchronized = true;
      Serial.println("[TLS] System time synchronized");
    }
#endif
    if (!backendConfigured) {
#if APEX_BACKEND_USE_TLS
      cameraSocket.beginSslWithCA(
        APEX_BACKEND_HOST,
        BACKEND_PORT,
        BACKEND_PATH,
        APEX_BACKEND_ROOT_CA
      );
#else
      cameraSocket.begin(APEX_BACKEND_HOST, BACKEND_PORT, BACKEND_PATH);
#endif
      cameraSocket.setExtraHeaders(wsHeaders);
      cameraSocket.onEvent(onBackendEvent);
      cameraSocket.setReconnectInterval(WIFI_RETRY_INTERVAL_MS);
      backendConfigured = true;
      Serial.printf("[CAMERA] Connecting to backend %s:%u%s\n",
        APEX_BACKEND_HOST, BACKEND_PORT, BACKEND_PATH);
    }
    return;
  }

  if (millis() - lastWiFiAttempt < WIFI_RETRY_INTERVAL_MS) {
    return;
  }

  lastWiFiAttempt = millis();
  Serial.println("[WIFI] Retrying connection");
  WiFi.disconnect(false, false);
  WiFi.begin(APEX_WIFI_SSID, APEX_WIFI_PASSWORD);
}

bool sendFrameAsJpeg(camera_fb_t* frame) {
  if (!frame || frame->buf == nullptr || frame->width == 0 || frame->height == 0 ||
      frame->len == 0) {
    Serial.println("[CAMERA] Capture returned an empty frame");
    return false;
  }

  if (cameraUsesJpeg) {
    if (frame->format != PIXFORMAT_JPEG || frame->len < 4 ||
        frame->buf[0] != 0xff || frame->buf[1] != 0xd8 ||
        frame->buf[frame->len - 2] != 0xff || frame->buf[frame->len - 1] != 0xd9) {
      Serial.printf(
        "[CAMERA] Rejecting invalid JPEG: %ux%u format=%d length=%u\n",
        frame->width, frame->height, frame->format, frame->len
      );
      return false;
    }

    Serial.printf(
      "[CAMERA] Captured JPEG: %ux%u length=%u\n",
      frame->width, frame->height, frame->len
    );
    const bool sent = cameraSocket.sendBIN(frame->buf, frame->len);
    if (!sent) {
      sendFailureCount++;
      sendRetryNotBefore = millis() + 500;
      Serial.printf(
        "[CAMERA TX] JPEG send failed: frame=%lu bytes=%u wsConnected=%s wifi=%d failures=%lu\n",
        sentFrameCount + 1,
        frame->len,
        cameraSocket.isConnected() ? "yes" : "no",
        WiFi.status(),
        sendFailureCount
      );
    } else {
      sentFrameCount++;
      if (sentFrameCount == 1 || sentFrameCount % 25 == 0) {
        Serial.printf("[CAMERA TX] JPEG frame written: frame=%lu bytes=%u\n", sentFrameCount, frame->len);
      }
    }
    return sent;
  }

  const size_t expectedLength = static_cast<size_t>(frame->width) * frame->height * 2;
  if (frame->format != PIXFORMAT_RGB565 || frame->len != expectedLength) {
    Serial.printf(
      "[CAMERA] Rejecting incomplete RGB565 frame: %ux%u expected=%u actual=%u\n",
      frame->width, frame->height, expectedLength, frame->len
    );
    return false;
  }

  uint8_t* jpeg = nullptr;
  size_t jpegLength = 0;
  if (!frame2jpg(frame, 14, &jpeg, &jpegLength) || !jpeg || jpegLength == 0) {
    Serial.printf(
      "[CAMERA] Software RGB565-to-JPEG conversion failed for %ux%u length=%u\n",
      frame->width, frame->height, frame->len
    );
    return false;
  }

  const bool sent = cameraSocket.sendBIN(jpeg, jpegLength);
  Serial.printf(
    "[CAMERA] Encoded RGB565 frame: %ux%u raw=%u jpeg=%u localWrite=%s wsConnected=%s wifi=%d\n",
    frame->width, frame->height, frame->len, jpegLength, sent ? "yes" : "no",
    cameraSocket.isConnected() ? "yes" : "no", WiFi.status()
  );
  if (!sent) {
    sendFailureCount++;
    sendRetryNotBefore = millis() + 500;
    Serial.printf("[CAMERA TX] Binary frame write failed: failures=%lu\n", sendFailureCount);
  } else {
    sentFrameCount++;
  }
  free(jpeg);
  return sent;
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  delay(POWER_STABILIZATION_DELAY_MS);
  Serial.println("[CAMERA WS] BUILD=apex-camera-rfc6455-mask-fix-v2");
  Serial.println("[CAMERA WS] RFC6455 sender=library-sendBIN");
  snprintf(wsHeaders, sizeof(wsHeaders),
    "x-device-id: %s\r\nx-device-token: %s\r\nx-device-type: camera",
    DEVICE_ID, APEX_DEVICE_TOKEN);

  if (strncmp(APEX_BACKEND_HOST, "ws://", 5) == 0 || strncmp(APEX_BACKEND_HOST, "wss://", 6) == 0) {
    Serial.println("[CAMERA] Backend host already includes a websocket scheme; using it as-is");
  }

  WiFi.onEvent(onWiFiEvent);
  cameraReady = initializeCamera();
  startWiFi();
}

void loop() {
  maintainWiFi();
  cameraSocket.loop();

  if (cameraReady && backendConnected && cameraSocket.isConnected() &&
      millis() >= sendRetryNotBefore &&
      millis() - lastFrameSent >= FRAME_INTERVAL_MS) {
    lastFrameSent = millis();
    camera_fb_t* frame = esp_camera_fb_get();
    if (frame) {
      sendFrameAsJpeg(frame);
      esp_camera_fb_return(frame);
      frame = nullptr;
      delay(TX_SETTLE_DELAY_MS);
    } else {
      Serial.println("[CAMERA] Frame capture returned null");
      delay(CAPTURE_RETRY_DELAY_MS);
    }
  }

  yield();
}
