```javascript


const data = msg.payload;
if (!data || data.nivel_pct === undefined) return null;

const localId = data.local_id || "bloco_a";
const caixaId = data.caixa_id || "caixa_01";
const chave = `${localId}_${caixaId}`;
const baseTopico = `reservatorios/${localId}/${caixaId}`;

const nivel = Number(data.nivel_pct);
const volume = Number(data.volume_l || 0);
const distancia = Number(data.distancia_cm || 0);
const bombaLigada = Boolean(data.bomba_ligada);
const agora = Date.now();
const horaAtual = new Date(agora).getHours(); // 0..23

// Substitua pelos valores reais no ambiente de execução
const CALLMEBOT_USER = "@usuario_exemplo";
const INFLUX_URL     = "https://us-east-1-1.aws.cloud2.influxdata.com";
const INFLUX_ORG     = "SEU_ORG_ID_INFLUX";
const INFLUX_BUCKET  = "SEU_BUCKET";
const INFLUX_TOKEN   = "SEU_INFLUX_TOKEN_AQUI";

let estados = flow.get("estadosCaixas") || {};
if (!estados[chave]) {
  estados[chave] = {
    historicoNivel: [],
    ultimoAlerta: {},
    ultimaMsgTs: agora
  };
}
const st = estados[chave];
st.ultimaMsgTs = agora;

// Histórico de até 65 minutos para avaliar queda >= 5% em 60 min
st.historicoNivel.push({ ts: agora, nivel });
st.historicoNivel = st.historicoNivel.filter(item => agora - item.ts <= 65 * 60 * 1000);

const COOLDOWN_MS = 15 * 60 * 1000;
function podeAlertar(regra) {
  const ult = st.ultimoAlerta[regra] || 0;
  if (agora - ult >= COOLDOWN_MS) {
    st.ultimoAlerta[regra] = agora;
    return true;
  }
  return false;
}

function montarMsgTelegram(texto) {
  const user = encodeURIComponent(CALLMEBOT_USER);
  const msgEncoded = encodeURIComponent(texto);
  return {
    url: `https://api.callmebot.com/text.php?user=${user}&text=${msgEncoded}`
  };
}

let outMqtt = null;
let outTelegram = null;
let alertaTexto = null;
let eventoTipo = "normal";

// 1. Nível <= 20% com bomba desligada -> liga bomba
if (nivel <= 20 && !bombaLigada) {
  outMqtt = { topic: `${baseTopico}/bomba/cmd`, payload: "ON" };
  eventoTipo = "nivel_baixo_bomba_on";
  if (podeAlertar("nivel_baixo")) {
    alertaTexto = `[${localId}/${caixaId}] Nível baixo (${nivel.toFixed(1)}%, ${volume.toFixed(0)}L). Bomba ligada (ON).`;
  }
}

// 2. Nível >= 95% com bomba ligada -> desliga bomba
if (nivel >= 95 && bombaLigada) {
  outMqtt = { topic: `${baseTopico}/bomba/cmd`, payload: "OFF" };
  eventoTipo = "cheio_bomba_off_transbordo_evitado";
  if (podeAlertar("nivel_cheio")) {
    alertaTexto = `[${localId}/${caixaId}] Reservatório cheio (${nivel.toFixed(1)}%). Bomba desligada (OFF) — transbordamento evitado.`;
  }
}

// 3. Risco de transbordo (> 98%) -> aciona alarme
if (nivel > 98) {
  outMqtt = { topic: `${baseTopico}/alarme`, payload: "ON" };
  eventoTipo = "risco_transbordo";
  if (podeAlertar("transbordo")) {
    alertaTexto = `[ALERTA CRÍTICO - ${localId}/${caixaId}] Risco de transbordo! Nível em ${nivel.toFixed(1)}%. Verifique possível falha no relé/acionamento.`;
  }
}

// 4. Possível vazamento entre 0h e 5h, bomba desligada, queda >= 5% em 60 min
const leitura1hAtras = st.historicoNivel.find(item => agora - item.ts >= 55 * 60 * 1000);
if (horaAtual >= 0 && horaAtual < 5 && !bombaLigada && leitura1hAtras) {
  const queda = leitura1hAtras.nivel - nivel;
  if (queda >= 5) {
    eventoTipo = "possivel_vazamento";
    if (podeAlertar("vazamento")) {
      alertaTexto = `Possível vazamento: queda de ${queda.toFixed(1)}% em 1 h com a bomba desligada. Nível: ${nivel.toFixed(1)}% (${localId}/${caixaId}).`;
    }
  }
}

if (alertaTexto) {
  outTelegram = montarMsgTelegram(alertaTexto);
}

flow.set("estadosCaixas", estados);

// Saída 3: Envio direto via API HTTP v2 do InfluxDB Cloud (Line Protocol)
const linhaInflux = `telemetria_reservatorio,local_id=${localId},caixa_id=${caixaId},evento=${eventoTipo} nivel_pct=${nivel},volume_l=${volume},distancia_cm=${distancia},bomba_ligada=${bombaLigada ? 1 : 0}i,alerta_disparado=${alertaTexto ? 1 : 0}i`;

const outInflux = {
  method: "POST",
  url: `${INFLUX_URL}/api/v2/write?org=${encodeURIComponent(INFLUX_ORG)}&bucket=${encodeURIComponent(INFLUX_BUCKET)}&precision=s`,
  headers: {
    "Authorization": `Token ${INFLUX_TOKEN}`,
    "Content-Type": "text/plain; charset=utf-8"
  },
  payload: linhaInflux
};

return [outMqtt, outTelegram, outInflux];
