#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASSWORD ""

#define MQTT_BROKER "test.mosquitto.org"
#define MQTT_PORT 1883
#define TELEMETRY_TOPIC "horta/telemetry"
#define IRRIGATION_TOPIC "horta/irrigation"

#define DHT_PIN 4
#define SOIL_PIN 34
#define RELAY_PIN 5

DHT dht(DHT_PIN, DHT22);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastTelemetry = 0;
bool irrigationOn = false;
bool manualOverride = false;

void setIrrigation(bool active) {
  digitalWrite(RELAY_PIN, active ? HIGH : LOW);
  irrigationOn = active;
}

// Conexão Wi-Fi
void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi conectado!");
}

// Conexão MQTT
void connectMqtt() {
  while (!mqttClient.connected()) {
    if (mqttClient.connect("esp32-horta")) {
      mqttClient.subscribe(IRRIGATION_TOPIC);
      Serial.println("Conectado ao broker MQTT!");
    } else {
      delay(2000);
    }
  }
}

// Callback para mensagens MQTT
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (String(topic) == IRRIGATION_TOPIC) {
    StaticJsonDocument<128> doc;
    DeserializationError error = deserializeJson(doc, payload, length);
    if (!error) {
      const char* command = doc["command"] | "";
      const char* mode = doc["mode"] | "manual";
      if (strcmp(command, "auto") == 0) {
        manualOverride = false;
        Serial.println("Irrigação em modo automático");
        return;
      }
      manualOverride = strcmp(mode, "automatic") != 0;
      if (strcmp(command, "on") == 0) {
        setIrrigation(true);
        Serial.println(manualOverride ? "Irrigação ligada manualmente" : "Irrigação ligada automaticamente");
      } else if (strcmp(command, "off") == 0) {
        setIrrigation(false);
        Serial.println(manualOverride ? "Irrigação desligada manualmente" : "Irrigação desligada automaticamente");
      }
    } else {
      Serial.println("Erro ao interpretar comando MQTT");
    }
  }
}

// Publica telemetria e aplica lógica automática
void publishTelemetry() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  int soilRaw = analogRead(SOIL_PIN);
  int soilMoisture = map(soilRaw, 0, 4095, 100, 0);

  // Histerese: liga abaixo de 40%, desliga acima de 60%
  if (!manualOverride && soilMoisture < 40 && !irrigationOn) {
    setIrrigation(true);
    mqttClient.publish(IRRIGATION_TOPIC, "{\"command\":\"on\",\"mode\":\"automatic\"}");
  } else if (!manualOverride && soilMoisture > 60 && irrigationOn) {
    setIrrigation(false);
    mqttClient.publish(IRRIGATION_TOPIC, "{\"command\":\"off\",\"mode\":\"automatic\"}");
  }

  String payload = "{\"soilMoisture\":" + String(soilMoisture) +
                   ",\"temperature\":" + String(temperature, 1) +
                   ",\"humidity\":" + String(humidity, 1) +
                   ",\"irrigationOn\":" + (irrigationOn ? "true" : "false") +
                   ",\"mode\":\"" + (manualOverride ? "manual" : "automatic") + "\"}";

  mqttClient.publish(TELEMETRY_TOPIC, payload.c_str());
  Serial.println("Telemetria enviada: " + payload);
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  setIrrigation(false);
  dht.begin();

  mqttClient.setCallback(mqttCallback);

  connectWifi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
}

void loop() {
  if (!mqttClient.connected()) connectMqtt();
  mqttClient.loop();

  if (millis() - lastTelemetry > 5000) {
    lastTelemetry = millis();
    publishTelemetry();
  }
}
