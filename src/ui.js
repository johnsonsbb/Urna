// ui.js — o painel. Atualiza 4 vezes por segundo, não a cada frame: os números
// não precisam de 60fps e o celular agradece.

import * as B from './balance.js';
import * as G from './game.js';

// Os nomes saem do tema, não da planilha. "Velocidade +6%" é planilha,
// "Botas Élficas" é jogo — e é isso que faz o upgrade parecer uma coisa.
const EIXOS = {
  botas:       { nome: 'Botas Élficas',   nota: 'o herói anda mais rápido' },
  lamina:      { nome: 'Lâmina',          nota: 'dano por segundo' },
  alcance:     { nome: 'Alcance',         nota: 'bate e coleta de mais longe' },
  mochila:     { nome: 'Mochila',         nota: 'quantos inimigos antes de voltar' },
  isca:        { nome: 'Isca',            nota: 'inimigos nascem mais rápido' },
  tocha:       { nome: 'Tocha',           nota: 'sala maior — e caminhada maior' },
  companheiro: { nome: 'Companheiro',     nota: 'mais um herói caçando' },
  tatica:      { nome: 'Tática',          nota: 'como o herói escolhe o alvo' },
};

const TATICAS = [
  'alvo aleatório',
  'o mais próximo',
  'ignora quem está longe do baú',
  'com a mochila cheia, prefere perto do baú',
  'uma faixa da sala por herói',
];

// ---------------------------------------------------------------- formatação

// Abaixo de 100 as casas decimais são mantidas e os zeros à direita caem: sem
// isso "10/s → 10,7/s" vira "10/s → 10/s" e o upgrade parece não fazer nada.
const enxuga = (t) => t.replace(/\.?0+$/, '').replace('.', ',');

export function num(n) {
  if (!isFinite(n)) return '∞';
  if (n === 0) return '0';
  if (n < 100) return enxuga(n.toFixed(2));
  if (n < 1000) return String(Math.round(n));
  const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd'];
  let i = 0;
  let v = n;
  while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  // 1e33 vira 999,9999 por arredondamento binário e sairia como "1000No".
  if (v >= 999.995 && i < u.length - 1) { v /= 1000; i++; }
  return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0).replace('.', ',')}${u[i]}`;
}

const dec = (n, casas = 0) => n.toFixed(casas).replace('.', ',');

export function duracao(seg) {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m) return `${m}min ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
}

// Efeito atual e efeito do próximo nível, lado a lado. O jogador precisa ver o
// que o botão compra antes de tocar nele.
function efeito(id, lv) {
  switch (id) {
    case 'botas':   return [`${dec(B.moveSpeed(lv))} px/s`, `${dec(B.moveSpeed(lv + 1))} px/s`];
    case 'lamina':  return [`${num(B.damage(lv))}/s`, `${num(B.damage(lv + 1))}/s`];
    case 'alcance': return [`${B.reach(lv)} px`, `${B.reach(lv + 1)} px`];
    case 'mochila': return [`${B.backpack(lv)}`, `${B.backpack(lv + 1)}`];
    case 'isca':    return [`1 a cada ${dec(B.spawnInterval(lv), 2)}s`, `1 a cada ${dec(B.spawnInterval(lv + 1), 2)}s`];
    case 'tocha': {
      const a = B.roomSize(lv);
      const b = B.roomSize(lv + 1);
      return [`${a.w}×${a.h}`, `${b.w}×${b.h}`];
    }
    case 'companheiro': return [`${B.heroCount(lv)} herói${lv ? 's' : ''}`, `${B.heroCount(lv + 1)} heróis`];
    case 'tatica':      return [TATICAS[lv], TATICAS[Math.min(lv + 1, TATICAS.length - 1)]];
    default: return ['', ''];
  }
}

// ------------------------------------------------------------------- montagem

export function montar(raiz, acoes) {
  const el = {};
  const q = (sel) => raiz.querySelector(sel);

  el.ouro = q('#ouro');
  el.taxa = q('#taxa');
  el.andar = q('#andar');
  el.essencia = q('#essencia');
  el.multiplicador = q('#multiplicador');
  el.gargalo = q('#gargalo');
  el.lista = q('#lista');
  el.descer = q('#descer');
  el.prestigio = q('#prestigio');
  el.lote = [...raiz.querySelectorAll('[data-lote]')];
  el.relatorio = q('#relatorio');

  let lote = 1;
  el.lote.forEach((b) => {
    b.addEventListener('click', () => {
      lote = b.dataset.lote === 'max' ? 'max' : Number(b.dataset.lote);
      el.lote.forEach((o) => o.classList.toggle('ativo', o === b));
      acoes.redesenhar();
    });
  });

  // Uma linha por eixo, criada uma vez só. Depois disso a atualização só troca
  // texto e classe — nada de recriar DOM 4 vezes por segundo.
  const linhas = {};
  for (const id of B.UPGRADE_IDS) {
    const li = document.createElement('li');
    li.className = 'eixo';
    li.innerHTML = `
      <div class="eixo-txt">
        <div class="eixo-topo"><span class="eixo-nome"></span><span class="eixo-nivel"></span></div>
        <div class="eixo-nota"></div>
        <div class="eixo-efeito"></div>
      </div>
      <button class="comprar" type="button">
        <span class="comprar-qtd"></span>
        <span class="comprar-custo"></span>
      </button>`;
    const botao = li.querySelector('.comprar');
    botao.addEventListener('click', () => acoes.comprar(id, lote));
    linhas[id] = {
      li,
      nome: li.querySelector('.eixo-nome'),
      nivel: li.querySelector('.eixo-nivel'),
      nota: li.querySelector('.eixo-nota'),
      efeito: li.querySelector('.eixo-efeito'),
      botao,
      qtd: li.querySelector('.comprar-qtd'),
      custo: li.querySelector('.comprar-custo'),
    };
    linhas[id].nome.textContent = EIXOS[id].nome;
    linhas[id].nota.textContent = EIXOS[id].nota;
    el.lista.appendChild(li);
  }

  el.descer.addEventListener('click', acoes.descer);
  el.prestigio.addEventListener('click', acoes.prestigio);

  return {
    el,
    linhas,
    get lote() { return lote; },
  };
}

// ---------------------------------------------------------------- atualização

export function atualizar(ui, s) {
  const { el, linhas, lote } = ui;

  el.ouro.textContent = num(s.gold);
  el.taxa.textContent = `${num(G.rate(s))}/s`;
  el.andar.textContent = s.floor;
  el.essencia.textContent = s.essence ? num(s.essence) : '—';
  // O multiplicador vai na linha de baixo: junto com o número ele estoura o
  // marcador assim que a essência passa de três dígitos.
  el.multiplicador.textContent = s.essence ? `×${dec(G.multiplier(s), 2)}` : 'permanente';

  // Dizer qual lado está travando é o que transforma a fórmula em conselho.
  const b = B.bottleneck({ upgrades: s.upgrades, floor: s.floor });
  el.gargalo.textContent = b.limitedBy === 'spawn'
    ? 'campo vazio: os heróis esperam spawn — Isca e Tocha'
    : 'os heróis não dão conta: Lâmina, Botas, Mochila';
  el.gargalo.className = b.limitedBy === 'spawn' ? 'gargalo spawn' : 'gargalo herois';

  for (const id of B.UPGRADE_IDS) {
    const l = linhas[id];
    const lv = s.upgrades[id];
    const teto = B.upgradeCap(id);
    const p = G.buyPreview(s, id, lote);
    const [agora, prox] = efeito(id, lv);

    l.nivel.textContent = isFinite(teto) ? `nv ${lv}/${teto}` : `nv ${lv}`;

    if (lv >= teto) {
      l.efeito.textContent = agora;
      l.botao.disabled = true;
      l.qtd.textContent = 'no máximo';
      l.custo.textContent = '';
      l.li.classList.add('maximo');
      continue;
    }

    l.li.classList.remove('maximo');
    l.efeito.innerHTML = `${agora} <span class="seta">→</span> <b>${prox}</b>`;
    l.qtd.textContent = lote === 'max' ? (p.count ? `×${p.count}` : 'Máx') : `×${p.count}`;
    l.custo.textContent = num(p.cost || B.upgradeCost(id, lv));
    l.botao.disabled = !p.affordable;
  }

  // ------------------------------------------------------------ descer
  const custoDescer = B.descendCost(s.floor);
  el.descer.disabled = s.gold < custoDescer;
  el.descer.querySelector('.rot').textContent = `Descer ao andar ${s.floor + 1}`;
  el.descer.querySelector('.val').textContent = num(custoDescer);

  // --------------------------------------------------------- prestígio
  const ganho = G.prestigeGain(s);
  const pode = G.canPrestige(s);
  el.prestigio.hidden = s.stats.bestFloor < B.TUNING.prestigeFloor && !s.essence && !pode;
  el.prestigio.disabled = !pode;
  el.prestigio.querySelector('.rot').textContent = pode
    ? 'Morrer e recomeçar'
    : `Prestígio no andar ${primeiroAndarValido(s.essence)}`;
  el.prestigio.querySelector('.val').textContent = pode ? `+${num(ganho)} essência` : `+${num(ganho)}`;
}

// Menor andar cujo ganho já satisfaz a regra de 1,5x. Mostrar o alvo é melhor
// que mostrar um botão apagado sem explicação.
function primeiroAndarValido(essencia) {
  for (let f = B.TUNING.prestigeFloor; f < 400; f++) if (B.canPrestige(f, essencia)) return f;
  return '—';
}

// ------------------------------------------------------------------ relatório

export function relatorio(el, r, aoFechar) {
  el.querySelector('#rel-tempo').textContent = duracao(r.seconds);
  el.querySelector('#rel-ouro').textContent = num(r.gold);
  el.querySelector('#rel-taxa').textContent = `${num(r.rate)}/s congelado no fechamento, metade paga`;
  el.querySelector('#rel-teto').hidden = !r.capped;
  el.hidden = false;
  el.querySelector('#rel-ok').onclick = () => { el.hidden = true; aoFechar?.(); };
}
