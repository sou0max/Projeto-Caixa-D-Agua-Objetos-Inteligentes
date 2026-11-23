# Monitoramento de Nível e Controle de Bombeamento em Reservatórios com IoT

Projeto desenvolvido para a disciplina **Objetos Inteligentes Conectados** (Universidade Presbiteriana Mackenzie), alinhado à **ODS 6 (Meta 6.4)** sobre eficiência hídrica.

## Autores e Orientação
* **Max Martins Alvarez** — TIA: `10435922`
* **Henrique Totti Ulbricht Lapa** — TIA: `10436584`
* **Professor Orientador:** Prof. Wallace Rodrigues de Santana

## Arquitetura do Sistema
1. **Dispositivos (Wokwi — ESP32):** dois nós escalonáveis (`caixa_01` e `caixa_02` em `bloco_a`) publicando telemetria em JSON a cada 5 s no tópico `reservatorios/{local_id}/{caixa_id}/nivel` via MQTT (`broker.hivemq.com`) e assinando `.../bomba/cmd` e `.../alarme`.
2. **Orquestração e Regras (Node-RED na AWS EC2):** assina `reservatorios/+/+/nivel`, aplica regras de controle automático ($\le 20\%$ liga bomba, $\ge 95\%$ desliga bomba, $> 98\%$ alarme de transbordo, vazamento na madrugada e falha de comunicação $> 60\text{ s}$) com *cooldown* de 15 minutos, envia alertas via **CallMeBot (Telegram)** e grava no **InfluxDB Cloud**.
3. **Visualização (InfluxDB Cloud + Grafana Cloud):** armazenamento com retenção de 30 dias e dashboards operacionais e gerenciais (7 dias), incluindo estimativa de energia ($E = P_{\text{nominal}} \times t_{\text{ligada}}$).

## Como Executar
1. Abra os projetos em `wokwi/caixa_01` e `wokwi/caixa_02` no Wokwi e inicie a simulação.
2. Inicie o Node-RED na instância EC2, importe o fluxo em `node-red/flows.json` (com usuário fictício configurado no nó de função para fins de repositório) e clique em **Deploy**.
3. Acompanhe as métricas no Grafana Cloud e os alertas no Telegram via CallMeBot.
