# Passo a Passo de Instalação e Execução



## 1. Pré-requisitos

* Conta no GitHub e Git instalado na máquina local (opcional, se for subir via navegador).
* Conta no Wokwi para simular os dispositivos ESP32 (caixa_01 e caixa_02).
* Instância AWS EC2 (Windows/Linux) ou ambiente local com Node.js e Node-RED instalados.
* Acesso ao broker MQTT público (broker.hivemq.com, porta 1883).
* Conta no InfluxDB Cloud (com bucket criado, ex.: ObjetosInteligentes, e token com permissão de escrita) e no Grafana Cloud.
* Conta no Telegram configurada com o CallMeBot para receber alertas.



## 2. Clonar e preparar o repositório local

1. Clone o repositório no seu computador:
git clone https://github.com/sou0max/Projeto-Caixa-D-Agua-Objetos-Inteligentes.git
cd Projeto-Caixa-D-Agua-Objetos-Inteligentes



2. Confira se a estrutura de pastas está organizada:

Projeto-Caixa-D-Agua-Objetos-Inteligentes/
├── .gitignore
├── README.md
├── INSTALL.md
├── docs/
│   └── arquitetura_e_regras.md
├── node-red/
│   ├── flows.json
│   └── function_regras.js
└── wokwi/
    ├── caixa_01/
    └── caixa_02/



## 3. Configurar os dispositivos no Wokwi (caixa_01 e caixa_02)
1. Abra o simulador Wokwi e crie (ou abra) o projeto do caixa_01.
2. Copie o conteúdo de wokwi/caixa_01/sketch.ino, diagram.json e libraries.txt para as respectivas abas do projeto.
3. Repita o processo para o caixa_02, garantindo que em wokwi/caixa_02/sketch.ino esteja definido:
const char* CAIXA_ID = "caixa_02";
4. Clique no botão Play para iniciar a simulação e verifique no Serial Monitor a conexão ao Wokwi-GUEST, ao broker.hivemq.com e o envio periódico ([TX] reservatorios/bloco_a/.../nivel).
5. 


## 4. Instalar e configurar o Node-RED

1. Caso ainda não tenha o Node-RED instalado na sua VM/máquina, instale via npm (com Node.js já instalado):
npm install -g --unsafe-perm node-red

2. Inicie o Node-RED no terminal (mantenha a janela aberta durante os testes):
node-red

3. Abra o navegador em http://127.0.0.1:1880.
4. Clique no menu superior direito (três traços) -> Import, cole o conteúdo de node-red/flows.json e clique em Import.
5. Dê duplo clique no nó function 1 e substitua os placeholders pelas suas credenciais reais:
   * CALLMEBOT_USER (ex.: "@seu_usuario_telegram")

   * INFLUX_URL (ex.: "https://us-east-1-1.aws.cloud2.influxdata.com")

   * INFLUX_ORG (seu Org ID no InfluxDB Cloud)

   * INFLUX_BUCKET (ex.: "ObjetosInteligentes")

   * INFLUX_TOKEN (seu token de escrita do InfluxDB Cloud)

6. Clique em Done e depois em Deploy (canto superior direito).



## 5. Validar a persistência no InfluxDB Cloud e visualização no Grafana

1. InfluxDB Cloud: acesse o Data Explorer, selecione o bucket ObjetosInteligentes e execute:
SELECT * FROM telemetria_reservatorio ORDER BY time
Confirme que os registros estão chegando com local_id, caixa_id, evento, nivel_pct, volume_l, distancia_cm, bomba_ligada e alerta_disparado.
2. Grafana Cloud: conecte o data source do InfluxDB Cloud apontando para o bucket ObjetosInteligentes e configure os painéis operacionais e gerenciais (7 dias) utilizando a measurement telemetria_reservatorio.
3. Teste de regras e Telegram: varie o nível simulado no Wokwi para testar acionamento/desligamento da bomba ($ \le 20\% $ e $ \ge 95\% $), alarme de risco de transbordo ($ > 98\% $) e o recebimento das notificações via CallMeBot no Telegram.



## 6. Subir alterações para o GitHub

Lembre-se de manter tokens e dados pessoais removidos (@usuario_exemplo, SEU_ORG_ID_INFLUX, SEU_INFLUX_TOKEN_AQUI) antes de enviar ao repositório:
git add .
git commit -m "docs: adiciona passo a passo de instalação e execução"
git push -u origin main
