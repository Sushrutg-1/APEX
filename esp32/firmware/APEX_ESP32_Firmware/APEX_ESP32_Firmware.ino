#include <WiFi.h>

#define WEBSOCKETS_LOGLEVEL 2

#include <WebSocketsClient.h>

#include <ArduinoJson.h>

#include <ESP32Servo.h>

#include <TinyGPSPlus.h>

// Put machine-local credentials and the backend host in ignored firmware_secrets.h.
#if __has_include("firmware_secrets.h")
#include "firmware_secrets.h"
#endif

#ifndef APEX_WIFI_SSID
#define APEX_WIFI_SSID "ABCDEF"
#endif

#ifndef APEX_WIFI_PASSWORD
#define APEX_WIFI_PASSWORD "12345678"
#endif

#ifndef APEX_BACKEND_HOST
#define APEX_BACKEND_HOST "10.172.239.45"
#endif

#ifndef APEX_DEVICE_TOKEN
#define APEX_DEVICE_TOKEN "APEX_DEVICE_SECRET_001"
#endif

const char* WIFI_SSID = APEX_WIFI_SSID;

const char* WIFI_PASSWORD = APEX_WIFI_PASSWORD;

const char* BACKEND_HOST = APEX_BACKEND_HOST;

const uint16_t BACKEND_PORT = 3000;

const char* BACKEND_WS_PATH = "/";

const char* DEVICE_ID = "APEX-01";

const char* DEVICE_TOKEN = APEX_DEVICE_TOKEN;

const bool USE_REAL_GPS = true;

const unsigned long TELEMETRY_INTERVAL_MS = 5000;

const unsigned long WIFI_RETRY_INTERVAL_MS = 5000;

const unsigned long COMMAND_TIMEOUT_MS = 3000;

const unsigned long STEP_DURATION_MS = 700;

const float OBSTACLE_STOP_DISTANCE_CM = 30.0;

WebSocketsClient webSocket;

char wsExtraHeaders[256];

bool webSocketConnected = false;

unsigned long lastMovementCommandTime = 0;

unsigned long lastTelemetryTime = 0;

unsigned long lastWiFiRetryTime = 0;

bool wifiPreviouslyConnected = false;

#define TRIG_PIN 12

#define ECHO_PIN 35

float distanceCM = -1.0;

bool obstacleDetected = false;

#define FLAME_PIN 34

bool flameDetected = false;

#define BUZZER_PIN 22

bool hornActive = false;

unsigned long hornStopTime = 0;

#define PAN_SERVO_PIN 15

#define TILT_SERVO_PIN 2

Servo panServo;

Servo tiltServo;

int panAngle = 90;

int tiltAngle = 90;

#define LEFT_IN1 25

#define LEFT_IN2 26

#define LEFT_IN3 27

#define LEFT_IN4 33

#define LEFT_ENA 32

#define LEFT_ENB 14

#define RIGHT_IN1 18

#define RIGHT_IN2 19

#define RIGHT_IN3 23

#define RIGHT_IN4 4

#define RIGHT_ENA 13

#define RIGHT_ENB 5

#define GPS_RX 16

#define GPS_TX 17

HardwareSerial GPSSerial(2);

TinyGPSPlus gps;

double latitude = 0.0;

double longitude = 0.0;

double altitude = 0.0;

double gpsSpeed = 0.0;

int satellites = 0;

bool gpsFix = false;

String roverState = "STOP";

bool alarmActive = false;

unsigned long bootTime = 0;

enum MovementMode {

  MODE_NONE,

  MODE_STEP,

  MODE_CONTINUOUS

};

MovementMode movementMode = MODE_NONE;

unsigned long stepStartTime = 0;

String activeCommand = "STOP";

void stopMotors() {

  digitalWrite(LEFT_IN1, LOW);

  digitalWrite(LEFT_IN2, LOW);

  digitalWrite(LEFT_IN3, LOW);

  digitalWrite(LEFT_IN4, LOW);

  digitalWrite(RIGHT_IN1, LOW);

  digitalWrite(RIGHT_IN2, LOW);

  digitalWrite(RIGHT_IN3, LOW);

  digitalWrite(RIGHT_IN4, LOW);

  movementMode = MODE_NONE;

  activeCommand = "STOP";

  roverState = "STOP";

}

void moveForward() {

  if (obstacleDetected) {

    stopMotors();

    return;

  }

  digitalWrite(LEFT_IN1, HIGH);

  digitalWrite(LEFT_IN2, LOW);

  digitalWrite(LEFT_IN3, HIGH);

  digitalWrite(LEFT_IN4, LOW);

  digitalWrite(RIGHT_IN1, HIGH);

  digitalWrite(RIGHT_IN2, LOW);

  digitalWrite(RIGHT_IN3, HIGH);

  digitalWrite(RIGHT_IN4, LOW);

  roverState = "FORWARD";

  activeCommand = "FORWARD";

}

void moveBackward() {

  digitalWrite(LEFT_IN1, LOW);

  digitalWrite(LEFT_IN2, HIGH);

  digitalWrite(LEFT_IN3, LOW);

  digitalWrite(LEFT_IN4, HIGH);

  digitalWrite(RIGHT_IN1, LOW);

  digitalWrite(RIGHT_IN2, HIGH);

  digitalWrite(RIGHT_IN3, LOW);

  digitalWrite(RIGHT_IN4, HIGH);

  roverState = "BACKWARD";

  activeCommand = "BACKWARD";

}

void moveLeft() {

  digitalWrite(LEFT_IN1, LOW);

  digitalWrite(LEFT_IN2, HIGH);

  digitalWrite(LEFT_IN3, LOW);

  digitalWrite(LEFT_IN4, HIGH);

  digitalWrite(RIGHT_IN1, HIGH);

  digitalWrite(RIGHT_IN2, LOW);

  digitalWrite(RIGHT_IN3, HIGH);

  digitalWrite(RIGHT_IN4, LOW);

  roverState = "LEFT";

  activeCommand = "LEFT";

}

void moveRight() {

  digitalWrite(LEFT_IN1, HIGH);

  digitalWrite(LEFT_IN2, LOW);

  digitalWrite(LEFT_IN3, HIGH);

  digitalWrite(LEFT_IN4, LOW);

  digitalWrite(RIGHT_IN1, LOW);

  digitalWrite(RIGHT_IN2, HIGH);

  digitalWrite(RIGHT_IN3, LOW);

  digitalWrite(RIGHT_IN4, HIGH);

  roverState = "RIGHT";

  activeCommand = "RIGHT";

}

void startStepMovement(const String& command) {

  stopMotors();

  distanceCM = readDistance();

  if (command == "FORWARD" &&

      distanceCM > 0 &&

      distanceCM <= OBSTACLE_STOP_DISTANCE_CM) {

    obstacleDetected = true;

    stopMotors();

    return;

  }

  obstacleDetected = false;

  if (command == "FORWARD") {

    moveForward();

  } else if (command == "BACKWARD") {

    moveBackward();

  } else if (command == "LEFT") {

    moveLeft();

  } else if (command == "RIGHT") {

    moveRight();

  } else {

    stopMotors();

    return;

  }

  movementMode = MODE_STEP;

  stepStartTime = millis();

}

void startContinuousMovement(const String& command) {

  if (command == "FORWARD") {

    if (obstacleDetected) {

      stopMotors();

      return;

    }

    moveForward();

  } else if (command == "BACKWARD") {

    moveBackward();

  } else if (command == "LEFT") {

    moveLeft();

  } else if (command == "RIGHT") {

    moveRight();

  } else {

    stopMotors();

    return;

  }

  movementMode = MODE_CONTINUOUS;

  lastMovementCommandTime = millis();

}

void updateMovement() {

  if (movementMode == MODE_STEP) {

    if (millis() - stepStartTime >= STEP_DURATION_MS) {

      stopMotors();

      return;

    }

  }

  if (movementMode != MODE_NONE &&

      activeCommand == "FORWARD") {

    distanceCM = readDistance();

    if (distanceCM > 0 &&

        distanceCM <= OBSTACLE_STOP_DISTANCE_CM) {

      obstacleDetected = true;

      stopMotors();

    } else if (distanceCM > OBSTACLE_STOP_DISTANCE_CM) {

      obstacleDetected = false;

    }

  }

}

float readDistance() {

  digitalWrite(TRIG_PIN, LOW);

  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);

  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration =

      pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0) {

    return -1.0;

  }

  return (duration * 0.0343) / 2.0;

}

void updateSensors() {

  distanceCM = readDistance();

  if (distanceCM > 0 &&

      distanceCM <= OBSTACLE_STOP_DISTANCE_CM) {

    obstacleDetected = true;

  } else if (distanceCM > OBSTACLE_STOP_DISTANCE_CM) {

    obstacleDetected = false;

  }

  flameDetected =

      digitalRead(FLAME_PIN) == LOW;

}

void updateRealGPS() {
  static unsigned long lastGpsDiagnostic = 0;
  static bool previousFix = false;

  while (GPSSerial.available()) {

    char c = GPSSerial.read();

    gps.encode(c);

  }

  gpsFix = gps.location.isValid() && gps.location.age() < 3000;

  if (gpsFix) {

    latitude = gps.location.lat();

    longitude = gps.location.lng();

    if (!previousFix) {
      Serial.println("[GPS] Fix acquired");
    }

  } else {

    latitude = 0.0;

    longitude = 0.0;

  }

  previousFix = gpsFix;

  if (gps.altitude.isValid() && gps.altitude.age() < 10000) {

    altitude = gps.altitude.meters();

  }

  if (gps.speed.isValid() && gps.speed.age() < 10000) {

    gpsSpeed = gps.speed.kmph();

  }

  if (gps.satellites.isValid() && gps.satellites.age() < 10000) {

    satellites = gps.satellites.value();

  } else {

    satellites = -1;

  }

  if (millis() - lastGpsDiagnostic >= 5000) {
    lastGpsDiagnostic = millis();

    if (gpsFix) {
      Serial.printf("[GPS] Satellites: %d\n", satellites);
      Serial.printf("[GPS] Lat: %.6f\n", latitude);
      Serial.printf("[GPS] Lng: %.6f\n", longitude);
    } else {
      Serial.printf(
          "[GPS] Waiting for fix... chars=%lu valid_sentences=%lu checksum_errors=%lu satellites=%d\n",
          static_cast<unsigned long>(gps.charsProcessed()),
          static_cast<unsigned long>(gps.sentencesWithFix()),
          static_cast<unsigned long>(gps.failedChecksum()),
          satellites);
    }
  }
}

void updateGPS() {
  if (!USE_REAL_GPS) {
    latitude = 0.0;
    longitude = 0.0;
    altitude = 0.0;
    gpsSpeed = 0.0;
    satellites = 0;
    gpsFix = false;
    return;
  }

  updateRealGPS();
}

void updateAlarm() {

  if (hornActive) {

    digitalWrite(BUZZER_PIN, HIGH);

    alarmActive = true;

    return;

  }

  if (flameDetected || obstacleDetected) {

    digitalWrite(BUZZER_PIN, HIGH);

    alarmActive = true;

  } else {

    digitalWrite(BUZZER_PIN, LOW);

    alarmActive = false;

  }

}

void updateHorn() {

  if (hornActive &&

      millis() >= hornStopTime) {

    hornActive = false;

    updateAlarm();

  }

}

void sendJSON(JsonDocument& doc) {

  if (!webSocketConnected) {

    return;

  }

  String output;

  serializeJson(doc, output);

  webSocket.sendTXT(output);

}

void sendError(const char* message) {

  JsonDocument doc;

  doc["type"] = "ERROR";

  doc["message"] = message;

  sendJSON(doc);

}

void sendCommandAck(

    const char* command,

    bool success,

    const char* message) {

  JsonDocument doc;

  doc["type"] = "COMMAND_ACK";

  doc["command"] = command;

  doc["success"] = success;

  doc["message"] = message;

  sendJSON(doc);

}

void handleCommand(

    const char* command,

    const String& mode,

    JsonVariant value) {

  if (strcmp(command, "STOP") == 0) {

    stopMotors();

    sendCommandAck(

        "STOP",

        true,

        "Vehicle stopped");

    return;

  }

  if (

      strcmp(command, "FORWARD") == 0 ||

      strcmp(command, "BACKWARD") == 0 ||

      strcmp(command, "LEFT") == 0 ||

      strcmp(command, "RIGHT") == 0) {

    if (mode.length() == 0) {
      sendError("Movement mode is required");
      return;
    }

    if (mode == "STEP") {

      startStepMovement(command);

      if (strcmp(command, "FORWARD") == 0 &&

          obstacleDetected) {

        sendCommandAck(

            command,

            false,

            "Forward blocked by obstacle");

        return;

      }

      sendCommandAck(

          command,

          true,

          "Step movement started");

      return;

    }

    if (mode == "CONTINUOUS") {

      if (

          strcmp(command, "FORWARD") == 0 &&

          obstacleDetected) {

        stopMotors();

        sendCommandAck(

            command,

            false,

            "Forward blocked by obstacle");

        return;

      }

      startContinuousMovement(command);

      sendCommandAck(

          command,

          true,

          "Continuous movement started");

      return;

    }

    sendError(

        "Invalid movement mode");

    return;

  }

  if (strcmp(command, "PAN") == 0) {

    if (!value.is<int>()) {

      sendError(

          "PAN value must be a number");

      return;

    }

    int angle = value.as<int>();

    if (angle < 0 || angle > 180) {

      sendError(

          "PAN value must be between 0 and 180");

      return;

    }

    if (panAngle != angle) {
      panAngle = angle;
      panServo.write(panAngle);
    }

    sendCommandAck(

        "PAN",

        true,

        "Pan position updated");

    return;

  }

  if (strcmp(command, "TILT") == 0) {

    if (!value.is<int>()) {

      sendError(

          "TILT value must be a number");

      return;

    }

    int angle = value.as<int>();

    if (angle < 0 || angle > 180) {

      sendError(

          "TILT value must be between 0 and 180");

      return;

    }

    if (tiltAngle != angle) {
      tiltAngle = angle;
      tiltServo.write(tiltAngle);
    }

    sendCommandAck(

        "TILT",

        true,

        "Tilt position updated");

    return;

  }

  if (strcmp(command, "HORN") == 0) {

    hornActive = true;

    hornStopTime = millis() + 500;

    updateAlarm();

    sendCommandAck(

        "HORN",

        true,

        "Horn activated");

    return;

  }

  sendError(

      "Unknown vehicle command");

}

void webSocketEvent(

    WStype_t type,

    uint8_t* payload,

    size_t length) {

  switch (type) {

    case WStype_DISCONNECTED:

      webSocketConnected = false;

      stopMotors();

      Serial.println("[WS] Disconnected");

      if (payload && length > 0) {
        Serial.print("[WS] Reason: ");
        for (size_t i = 0; i < length; i++) {
          const char value = static_cast<char>(payload[i]);
          Serial.print(value >= 32 && value <= 126 ? value : '.');
        }
        Serial.println();
      } else {
        Serial.println("[WS] Reason: no close detail provided");
      }

      Serial.println("[WS] Reconnecting...");
      break;

    case WStype_CONNECTED:

      webSocketConnected = true;

      Serial.println(

          "[WS] Connected to APEX backend");

      break;

    case WStype_TEXT: {

      String message = "";

      for (size_t i = 0; i < length; i++) {

        message += (char)payload[i];

      }

      Serial.print("[WS] RX: ");

      Serial.println(message);

      JsonDocument doc;

      DeserializationError error = deserializeJson(doc, message);

      if (error) {

        sendError("Invalid JSON message");

        return;

      }

      const char* typeField = doc["type"] | "";

      if (

          strcmp(typeField, "DEVICE_CONNECTED") == 0 ||

          strcmp(typeField, "DEVICE_AUTHENTICATED") == 0) {

        Serial.println(

            "[WS] Device authenticated");

        return;

      }

      if (strcmp(typeField, "COMMAND") == 0) {

        const char* command =

            doc["command"] | "";

        String mode = doc["mode"].as<String>();

        JsonVariant value =

            doc["value"];

        handleCommand(

            command,

            mode,

            value);

        return;

      }

      if (strcmp(typeField, "PONG") == 0) {

        return;

      }

      sendError(

          "Unknown message type");

      break;

    }

    default:

      break;

  }

}

void sendTelemetry() {

  if (!webSocketConnected) {

    return;

  }

  updateSensors();

  updateGPS();

  updateAlarm();

  JsonDocument data;

  data["vehicleId"] = DEVICE_ID;

  if (distanceCM >= 0) {
    data["distance"] = distanceCM;
    data["obstacle"] = obstacleDetected;
  } else {
    data["distance"] = nullptr;
    data["obstacle"] = nullptr;
  }

  data["flame"] = flameDetected;

  data["roverState"] = roverState;

  data["pan"] = panAngle;

  data["tilt"] = tiltAngle;

  if (gpsFix) {
    data["latitude"] = latitude;
    data["longitude"] = longitude;
    if (gps.altitude.isValid() && gps.altitude.age() < 10000) {
      data["altitude"] = altitude;
    } else {
      data["altitude"] = nullptr;
    }
    if (gps.speed.isValid() && gps.speed.age() < 10000) {
      data["gpsSpeed"] = gpsSpeed;
    } else {
      data["gpsSpeed"] = nullptr;
    }
  } else {
    data["latitude"] = nullptr;
    data["longitude"] = nullptr;
    data["altitude"] = nullptr;
    data["gpsSpeed"] = nullptr;
  }

  if (satellites >= 0) {
    data["satellites"] = satellites;
  } else {
    data["satellites"] = nullptr;
  }

  data["gpsFix"] = gpsFix;

  data["wifiRSSI"] = WiFi.RSSI();

  data["ip"] = WiFi.localIP().toString();

  data["uptime"] =

      millis() / 1000;

  data["freeHeap"] =

      ESP.getFreeHeap();

  data["chipFreq"] =

      getCpuFrequencyMhz();

  data["alarm"] =

      alarmActive;

  JsonDocument message;

  message["type"] = "TELEMETRY";

  message["data"] = data;

  sendJSON(message);

}

void connectWiFi() {

  if (!WIFI_SSID[0] || !WIFI_PASSWORD[0]) {
    Serial.println("[WIFI] Missing local Wi-Fi configuration");
    return;
  }

  WiFi.mode(WIFI_STA);

  WiFi.begin(

      WIFI_SSID,

      WIFI_PASSWORD);

  Serial.println("[WIFI] Connecting...");

}

void updateWiFi() {

  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiPreviouslyConnected) {
      wifiPreviouslyConnected = true;
      Serial.println("[WIFI] Connected");
      Serial.print("[WIFI] IP: ");
      Serial.println(WiFi.localIP());
      Serial.printf("[WIFI] RSSI: %d dBm\n", WiFi.RSSI());
    }

    return;
  }

  if (wifiPreviouslyConnected) {
    Serial.println("[WIFI] Disconnected");
    wifiPreviouslyConnected = false;
  }

  stopMotors();
  webSocketConnected = false;

  if (!WIFI_SSID[0] || !WIFI_PASSWORD[0]) {
    return;
  }

  if (

      millis() - lastWiFiRetryTime <

      WIFI_RETRY_INTERVAL_MS) {

    return;

  }

  lastWiFiRetryTime = millis();

  Serial.println("[WIFI] Reconnecting...");

  WiFi.disconnect();

  WiFi.begin(

      WIFI_SSID,

      WIFI_PASSWORD);

}

void setup() {

  Serial.begin(115200);

  bootTime = millis();

  pinMode(TRIG_PIN, OUTPUT);

  pinMode(ECHO_PIN, INPUT);

  pinMode(FLAME_PIN, INPUT);

  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);

  pinMode(LEFT_IN1, OUTPUT);

  pinMode(LEFT_IN2, OUTPUT);

  pinMode(LEFT_IN3, OUTPUT);

  pinMode(LEFT_IN4, OUTPUT);

  pinMode(LEFT_ENA, OUTPUT);

  pinMode(LEFT_ENB, OUTPUT);

  pinMode(RIGHT_IN1, OUTPUT);

  pinMode(RIGHT_IN2, OUTPUT);

  pinMode(RIGHT_IN3, OUTPUT);

  pinMode(RIGHT_IN4, OUTPUT);

  pinMode(RIGHT_ENA, OUTPUT);

  pinMode(RIGHT_ENB, OUTPUT);

  digitalWrite(LEFT_ENA, HIGH);

  digitalWrite(LEFT_ENB, HIGH);

  digitalWrite(RIGHT_ENA, HIGH);

  digitalWrite(RIGHT_ENB, HIGH);

  stopMotors();

  panServo.setPeriodHertz(50);

  tiltServo.setPeriodHertz(50);

  panServo.attach(PAN_SERVO_PIN, 500, 2400);

  tiltServo.attach(TILT_SERVO_PIN, 500, 2400);

  panServo.write(panAngle);

  tiltServo.write(tiltAngle);

  GPSSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  Serial.println("[GPS] Initializing NEO-6M on UART2 at 9600 baud");

  if (USE_REAL_GPS) {
    Serial.println("[GPS] REAL MODE ENABLED");
  } else {
    Serial.println("[GPS] DISABLED - set USE_REAL_GPS to true when NEO-6M is connected");
  }

  if (!WIFI_SSID[0] || !WIFI_PASSWORD[0]) {
    Serial.println("[WIFI] Missing local Wi-Fi configuration");
  }
  if (!BACKEND_HOST[0] || !DEVICE_TOKEN[0]) {
    Serial.println("[WS] Missing local backend/device configuration");
  }

  connectWiFi();

  webSocket.onEvent(webSocketEvent);

  webSocket.setReconnectInterval(5000);

  const int headerLength = snprintf(
      wsExtraHeaders,
      sizeof(wsExtraHeaders),
      "x-device-id: %s\r\nx-device-token: %s",
      DEVICE_ID,
      DEVICE_TOKEN);

  if (headerLength < 0 || headerLength >= sizeof(wsExtraHeaders)) {
    Serial.println("[WS] Device authentication headers exceed the configured buffer");
  } else if (
      WIFI_SSID[0] &&
      WIFI_PASSWORD[0] &&
      BACKEND_HOST[0] &&
      DEVICE_TOKEN[0]) {
    webSocket.setExtraHeaders(wsExtraHeaders);
    webSocket.begin(
        BACKEND_HOST,
        BACKEND_PORT,
        BACKEND_WS_PATH);
  }

  updateSensors();

  updateGPS();

  updateAlarm();

  Serial.println();

  Serial.println("================================");

  Serial.println("APEX ESP32 FIRMWARE READY");

  Serial.println("================================");

}

void loop() {

  updateWiFi();

  if (WiFi.status() == WL_CONNECTED) {

    webSocket.loop();

  }

  updateMovement();

  if (movementMode == MODE_CONTINUOUS &&
      millis() - lastMovementCommandTime >= COMMAND_TIMEOUT_MS) {
    stopMotors();
    Serial.println("[SAFETY] Continuous movement timed out");
  }

  static unsigned long lastSensorUpdate = 0;

  if (

      millis() - lastSensorUpdate >= 250) {

    lastSensorUpdate = millis();

    updateSensors();

    updateAlarm();

  }

  updateGPS();

  updateHorn();

  if (

      millis() - lastTelemetryTime >=

      TELEMETRY_INTERVAL_MS) {

    lastTelemetryTime = millis();

    sendTelemetry();

  }

}