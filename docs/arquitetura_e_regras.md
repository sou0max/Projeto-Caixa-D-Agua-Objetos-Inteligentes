# Arquitetura Técnica e Regras de Operação

## Tópicos MQTT
* **Telemetria (ESP32 $\rightarrow$ Broker $\rightarrow$ Node-RED):**
  `reservatorios/{local_id}/{caixa_id}/nivel`
  Exemplo de payload:
  ```json
  {
    "local_id": "bloco_a",
    "caixa_id": "caixa_01",
    "distancia_cm": 53,
    "nivel_pct": 57,
    "volume_l": 570,
    "bomba_ligada": true
  }

  Comando da bomba (Node-RED -> Broker -> ESP32): reservatorios/{local_id}/{caixa_id}/bomba/cmd ("ON" ou "OFF")

  Alarme de transbordo (Node-RED -> Broker -> ESP32): reservatorios/{local_id}/{caixa_id}/alarme ("ON")

-------------------------------
**Persistência no InfluxDB Cloud**
Bucket: ObjetosInteligentes (retenção configurada para 30 dias)

Measurement: telemetria_reservatorio

Tags: local_id, caixa_id, evento

Fields: nivel_pct, volume_l, distancia_cm, bomba_ligada (0i/1i), alerta_disparado (0i/1i)

-------------------------------
**Dashboards no Grafana**
Dashboard Operacional: nível atual (%), volume (L), estado da bomba e série temporal das últimas 24 h com linhas de referência em 20% e 95% e destaque de acionamento da bomba.

Dashboard Gerencial (7 dias): consumo diário (L) vs. referência, consumo médio por hora (L/h) com destaque noturno, contagem de transbordamentos evitados e vazamentos detectados, além da estimativa de energia.
