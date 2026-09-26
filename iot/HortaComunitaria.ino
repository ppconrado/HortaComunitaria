#include <DHT.h>
#include <PubSubClient.h>
#include <WiFi.h>

const char* WIFI_SSID = "SUA_REDE_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";
const char* MQTT_HOST = "192.168.1.10";
const int MQTT_PORT = 1883;
const char* TELEMETRY_TOPIC = "horta/telemetry";
const char* IRRIGATION_TOPIC = "horta/irrigation";

constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t SOIL_PIN = 34;
constexpr uint8_t RELAY_PIN = 5;
constexpr int SOIL_DRY_THRESHOLD = 40;
constexpr unsigned long TELEMETRY_INTERVAL = 10000;

DHT dht(DHT_PIN, DHT22);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
bool manualOverride = false;
unsigned long lastTelemetry = 0;

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void setIrrigation(bool active) {
  digitalWrite(RELAY_PIN, active ? HIGH : LOW);
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  if (String(topic) != IRRIGATION_TOPIC) return;
  String command;
  for (unsigned int index = 0; index < length; index++) command += (char)payload[index];
  manualOverride = true;
  if (command.indexOf("on") >= 0) setIrrigation(true);
  if (command.indexOf("off") >= 0) setIrrigation(false);
}

void connectMqtt() {
  while (!mqttClient.connected()) {
    if (mqttClient.connect("horta-esp32")) mqttClient.subscribe(IRRIGATION_TOPIC);
    else delay(5000);
  }
}

void publishTelemetry() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  int soilRaw = analogRead(SOIL_PIN);
  int soilMoisture = constrain(map(soilRaw, 4095, 1200, 0, 100), 0, 100);
  if (!manualOverride) setIrrigation(soilMoisture < SOIL_DRY_THRESHOLD);
  String payload = "{\"soilMoisture\":" + String(soilMoisture) +
    ",\"temperature\":" + String(temperature, 1) +
    ",\"humidity\":" + String(humidity, 1) + "}";
  mqttClient.publish(TELEMETRY_TOPIC, payload.c_str());
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  setIrrigation(false);
  dht.begin();
  connectWifi();
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
}

void loop() {
  if (!mqttClient.connected()) connectMqtt();
  mqttClient.loop();
  if (millis() - lastTelemetry >= TELEMETRY_INTERVAL) {
    lastTelemetry = millis();
    publishTelemetry();
  }
}