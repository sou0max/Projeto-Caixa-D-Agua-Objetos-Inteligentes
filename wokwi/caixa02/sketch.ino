#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* LOCAL_ID = "bloco_a";
const char* CAIXA_ID = "caixa_02";

const float ALTURA_UTIL_CM     = 100.0;
const float FOLGA_SENSOR_CM    = 10.0;
const float CAPACIDADE_LITROS  = 1000.0;
const unsigned long INTERVALO_MS = 5000;

char SSIDName[] = "Wokwi-GUEST";
char SSIDPass[] = "";

const int POT_PIN = 34;

char BrokerURL[] = "broker.hivemq.com";
char BrokerUserName[] = "";
char BrokerPassword[] = "";
char MQTTClientName[48];
int BrokerPort = 1883;

String Topico_Nivel;
String Topico_Bomba_Cmd;
String Topico_Bomba_Estado;
String Topico_Alarme;

WiFiClient espClient;
PubSubClient clienteMQTT(espClient);

bool bombaLigada = false;
unsigned long ultimaPublicacao = 0;

void publicarEstadoBomba() {
  StaticJsonDocument<160> doc;
  doc["local_id"] = LOCAL_ID;
  doc["caixa_id"] = CAIXA_ID;
  doc["estado"]   = bombaLigada ? "ON" : "OFF";

  char buffer[160];
  serializeJson(doc, buffer);
  clienteMQTT.publish(Topico_Bomba_Estado.c_str(), buffer, true);
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  msg.trim();
  msg.toUpperCase();

  String t = String(topic);
  Serial.print("[RX] ");
  Serial.print(t);
  Serial.print(" -> ");
  Serial.println(msg);

  if (t == Topico_Bomba_Cmd) {
    bombaLigada = (msg == "ON" || msg == "1" || msg == "TRUE");
    digitalWrite(LED_BUILTIN, bombaLigada ? HIGH : LOW);
    publicarEstadoBomba();
  } else if (t == Topico_Alarme) {
    Serial.print("[ALARME] Estado: ");
    Serial.println(msg);
  }
}

void mqttReconnect() {
  while (!clienteMQTT.connected()) {
    Serial.print("Conectando ao broker MQTT como ");
    Serial.println(MQTTClientName);
    if (clienteMQTT.connect(MQTTClientName, BrokerUserName, BrokerPassword)) {
      Serial.println("Conectado ao HiveMQ!");
      clienteMQTT.subscribe(Topico_Bomba_Cmd.c_str());
      clienteMQTT.subscribe(Topico_Alarme.c_str());
      publicarEstadoBomba();
    } else {
      Serial.print("Falha, rc=");
      Serial.print(clienteMQTT.state());
      Serial.println(" tentando novamente em 5s...");
      delay(5000);
    }
  }
}

void setup() {
  String base = "reservatorios/" + String(LOCAL_ID) + "/" + String(CAIXA_ID);
  Topico_Nivel        = base + "/nivel";
  Topico_Bomba_Cmd    = base + "/bomba/cmd";
  Topico_Bomba_Estado = base + "/bomba/estado";
  Topico_Alarme       = base + "/alarme";

  snprintf(MQTTClientName, sizeof(MQTTClientName), "esp32-res-%s-%s-%ld",
           LOCAL_ID, CAIXA_ID, random(1000, 9999));

  pinMode(POT_PIN, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  Serial.begin(115200);
  Serial.print("Conectando ao Wi-Fi");
  WiFi.begin(SSIDName, SSIDPass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Conectado!");

  clienteMQTT.setServer(BrokerURL, BrokerPort);
  clienteMQTT.setCallback(callback);
}

void loop() {
  if (!clienteMQTT.connected()) {
    mqttReconnect();
  }
  clienteMQTT.loop();

  unsigned long agora = millis();
  if (agora - ultimaPublicacao >= INTERVALO_MS) {
    ultimaPublicacao = agora;

    int leituraAnalogica = analogRead(POT_PIN);
    float nivelPct = (leituraAnalogica / 4095.0) * 100.0;
    float volumeLitros = (nivelPct / 100.0) * CAPACIDADE_LITROS;
    float distanciaSimuladaCm = FOLGA_SENSOR_CM + ((100.0 - nivelPct) / 100.0) * ALTURA_UTIL_CM;

    StaticJsonDocument<256> doc;
    doc["local_id"]     = LOCAL_ID;
    doc["caixa_id"]     = CAIXA_ID;
    doc["distancia_cm"] = round(distanciaSimuladaCm * 10.0) / 10.0;
    doc["nivel_pct"]    = round(nivelPct * 10.0) / 10.0;
    doc["volume_l"]     = round(volumeLitros * 10.0) / 10.0;
    doc["bomba_ligada"] = bombaLigada;

    char payload[256];
    serializeJson(doc, payload);

    clienteMQTT.publish(Topico_Nivel.c_str(), payload);
    Serial.print("[TX] ");
    Serial.print(Topico_Nivel);
    Serial.print(" -> ");
    Serial.println(payload);
  }
}
