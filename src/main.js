// main.js — o laço. Acumulador de tempo com passo fixo e teto de 20 ticks por
// frame, para o jogo não travar quando o app volta de suspenso com meia hora
// de atraso na conta.

import { TICK } from './balance.js';
import * as G from './game.js';
import { render } from './render.js';
import * as UI from './ui.js';
import * as save from './save.js';

const MAX_TICKS = 20;
const AUTOSAVE = 10_000;
const PAINEL = 250;

const tela = document.getElementById('campo');
const ctx = tela.getContext('2d', { alpha: false });

let estado;
let ui;

// ------------------------------------------------------------------ carregar

const salvo = save.carregar();
if (salvo) {
  estado = salvo.estado;
  G.syncHeroes(estado);
} else {
  estado = G.createState();
}

// -------------------------------------------------------------------- painel

ui = UI.montar(document, {
  redesenhar: () => UI.atualizar(ui, estado),
  comprar: (id, lote) => {
    if (G.buyUpgrade(estado, id, lote)) {
      vibrar(8);
      UI.atualizar(ui, estado);
    }
  },
  descer: () => {
    if (G.descend(estado)) {
      vibrar(20);
      UI.atualizar(ui, estado);
    }
  },
  prestigio: () => {
    if (!G.canPrestige(estado)) return;
    if (!confirm('O herói morre e uma nova geração desce com o conhecimento herdado.\n\nVocê perde ouro, upgrades e andar. Mantém essência, o multiplicador e a Tática.\n\nDescansar?')) return;
    G.prestige(estado);
    vibrar(40);
    salvar();
    UI.atualizar(ui, estado);
  },
});

// ------------------------------------------------------------------- offline

if (salvo) {
  const fora = (Date.now() - salvo.em) / 1000;
  if (fora > 60 && salvo.taxa > 0) {
    const r = G.applyOffline(estado, fora, salvo.taxa);
    if (r.gold > 0) UI.relatorio(document.getElementById('relatorio'), r, () => UI.atualizar(ui, estado));
  }
}

UI.atualizar(ui, estado);

// -------------------------------------------------------------------- canvas

// devicePixelRatio, senão o campo fica borrado em tela retina — que é onde o
// jogo vai ser jogado.
function redimensionar() {
  const r = tela.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  tela.width = Math.round(r.width * dpr);
  tela.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
redimensionar();
addEventListener('resize', redimensionar);
addEventListener('orientationchange', redimensionar);

// ---------------------------------------------------------------------- laço

let anterior = performance.now();
let sobra = 0;
let ultimoPainel = 0;
let ultimoSave = Date.now();

function frame(agora) {
  requestAnimationFrame(frame);

  sobra += (agora - anterior) / 1000;
  anterior = agora;

  let n = 0;
  while (sobra >= TICK && n < MAX_TICKS) {
    G.tick(estado, TICK);
    sobra -= TICK;
    n++;
  }
  // Voltou de suspenso com um buraco grande: descarta o resto em vez de tentar
  // alcançar. O tempo fora é pago pelo relatório offline, não pelo laço.
  if (sobra > TICK * MAX_TICKS) sobra = 0;

  const r = tela.getBoundingClientRect();
  render(ctx, estado, r.width, r.height);

  if (agora - ultimoPainel > PAINEL) {
    ultimoPainel = agora;
    UI.atualizar(ui, estado);
  }
  if (Date.now() - ultimoSave > AUTOSAVE) salvar();
}
requestAnimationFrame(frame);

// ------------------------------------------------------------------- salvar

function salvar() {
  ultimoSave = Date.now();
  save.salvar(estado, G.rate(estado));
}

// pagehide é o único evento confiável no iOS; visibilitychange cobre o resto.
addEventListener('pagehide', salvar);
addEventListener('visibilitychange', () => { if (document.hidden) salvar(); });

// -------------------------------------------------------------------- extras

function vibrar(ms) {
  try { navigator.vibrate?.(ms); } catch { /* desktop não tem, e tudo bem */ }
}

document.getElementById('apagar')?.addEventListener('click', () => {
  if (!confirm('Apagar o save e começar do zero? Isso não tem volta.')) return;
  save.apagar();
  location.reload();
});

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// ------------------------------------------------------- ponte de teste
//
// Sem isto não dá para testar o jogo: semear o localStorage pelo console não
// funciona, porque o autosave do pagehide sobrescreve a semente no reload. E
// esperar catorze minutos pela primeira descida a cada verificação inviabiliza
// olhar o andar 9 ou o prestígio.
//
// Não abre buraco novo: enquanto o servidor autoritativo da fase 5 não existe,
// o save já é um JSON editável no devtools. Quando ele existir, quem manda é o
// servidor e isto vira só conveniência local.

globalThis.masmorra = {
  get estado() { return estado; },

  ouro(n) { estado.gold = n; return this.pronto(); },
  andar(n) {
    estado.floor = Math.max(1, Math.floor(n));
    estado.stats.bestFloor = Math.max(estado.stats.bestFloor, estado.floor);
    estado.enemies = [];
    return this.pronto();
  },
  essencia(n) { estado.essence = n; return this.pronto(); },
  nivel(id, n) {
    if (!(id in estado.upgrades)) throw new Error(`upgrade desconhecido: ${id}`);
    estado.upgrades[id] = Math.max(0, Math.floor(n));
    G.syncHeroes(estado);
    return this.pronto();
  },

  // Finge que o app ficou fechado por N horas, com a taxa de agora congelada.
  offline(horas = 4) {
    const r = G.applyOffline(estado, horas * 3600, G.rate(estado));
    UI.relatorio(document.getElementById('relatorio'), r, () => UI.atualizar(ui, estado));
    return r;
  },

  zerar() { save.apagar(); location.reload(); },

  pronto() {
    G.syncHeroes(estado);
    UI.atualizar(ui, estado);
    salvar();
    return { andar: estado.floor, ouro: estado.gold, taxa: G.rate(estado), niveis: { ...estado.upgrades } };
  },
};

console.info('ponte de teste: masmorra.ouro(1e6), .andar(9), .nivel("lamina", 40), .offline(6), .zerar()');
