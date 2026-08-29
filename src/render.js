// render.js — desenha o estado no canvas. Sem estado próprio: tudo que ele
// sabe chega por parâmetro, e nada do que ele faz volta para o jogo.
//
// Visual desta fase: formas geométricas. Círculos para inimigos, quadrados
// para heróis e baú, barrinhas de vida e de carga.

import * as B from './balance.js';
import { room, chest } from './game.js';

const COR = {
  fundo: '#0d0b12',
  piso: '#171320',
  grade: '#221c2e',
  parede: '#3b2f52',
  bau: '#e0b155',
  bauSombra: '#8a6a2c',
  heroi: '#7fd4ff',
  heroiVolta: '#ffd479',
  alcance: 'rgba(127, 212, 255, 0.22)',
  inimigo: '#c8506a',
  inimigoFerido: '#e8894f',
  vida: '#5ad07a',
  faixa: 'rgba(127, 212, 255, 0.045)',
};

// A sala cresce com a Tocha, e a tela não. O desenho é sempre a sala inteira
// encaixada no espaço disponível — é isso que faz a Tocha parecer uma escolha
// e não só um número maior.
export function fit(s, w, h, pad = 8) {
  const r = room(s);
  const escala = Math.min((w - pad * 2) / r.w, (h - pad * 2) / r.h);
  return {
    escala,
    ox: (w - r.w * escala) / 2,
    oy: (h - r.h * escala) / 2,
    w: r.w,
    h: r.h,
  };
}

export function render(ctx, s, w, h) {
  const v = fit(s, w, h);
  const { escala: k, ox, oy } = v;
  const X = (x) => ox + x * k;
  const Y = (y) => oy + y * k;

  ctx.fillStyle = COR.fundo;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = COR.piso;
  ctx.fillRect(X(0), Y(0), v.w * k, v.h * k);

  // Grade de pedra: dá escala à sala, senão sala grande e sala pequena parecem
  // iguais depois do encaixe.
  const passo = 40;
  ctx.strokeStyle = COR.grade;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = passo; x < v.w; x += passo) { ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x), Y(v.h)); }
  for (let y = passo; y < v.h; y += passo) { ctx.moveTo(X(0), Y(y)); ctx.lineTo(X(v.w), Y(y)); }
  ctx.stroke();

  // Tática 4: as faixas viram parte do visual, porque é o que o upgrade faz.
  if (s.upgrades.tatica >= 4 && s.heroes.length > 1) {
    const faixa = v.w / s.heroes.length;
    for (let i = 1; i < s.heroes.length; i += 2) {
      ctx.fillStyle = COR.faixa;
      ctx.fillRect(X(faixa * i), Y(0), faixa * k, v.h * k);
    }
  }

  ctx.strokeStyle = COR.parede;
  ctx.lineWidth = 2;
  ctx.strokeRect(X(0), Y(0), v.w * k, v.h * k);

  // ------------------------------------------------------------------ baú
  const c = chest(s);
  const lado = Math.max(10, 18 * k);
  ctx.fillStyle = COR.bauSombra;
  ctx.fillRect(X(c.x) - lado / 2, Y(c.y) - lado / 2 + 2, lado, lado);
  ctx.fillStyle = COR.bau;
  ctx.fillRect(X(c.x) - lado / 2, Y(c.y) - lado / 2, lado, lado);
  ctx.fillStyle = COR.bauSombra;
  ctx.fillRect(X(c.x) - lado / 2, Y(c.y) - lado / 6, lado, Math.max(2, lado / 8));

  // -------------------------------------------------------------- inimigos
  const raio = Math.max(2, 5 * k);
  for (const e of s.enemies) {
    const frac = e.hp / e.max;
    ctx.fillStyle = frac > 0.6 ? COR.inimigo : COR.inimigoFerido;
    ctx.beginPath();
    ctx.arc(X(e.x), Y(e.y), raio, 0, Math.PI * 2);
    ctx.fill();

    if (frac < 0.999 && raio >= 3) {
      const bw = raio * 2.6;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(X(e.x) - bw / 2, Y(e.y) - raio - 5, bw, 2);
      ctx.fillStyle = COR.vida;
      ctx.fillRect(X(e.x) - bw / 2, Y(e.y) - raio - 5, bw * frac, 2);
    }
  }

  // ---------------------------------------------------------------- heróis
  const cap = B.backpack(s.upgrades.mochila);
  const alcance = B.reach(s.upgrades.alcance) * k;
  const hl = Math.max(6, 11 * k);

  for (const h of s.heroes) {
    // O raio de alcance é desenhado porque é o efeito do upgrade Alcance, e um
    // número na planilha não mostra que o herói passou a bater de longe. Só o
    // contorno: com oito heróis, discos preenchidos viram uma mancha só.
    if (alcance > 4) {
      ctx.strokeStyle = COR.alcance;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(X(h.x), Y(h.y), alcance, 0, Math.PI * 2);
      ctx.stroke();
    }

    const voltando = h.st === 'return' || h.st === 'deposit';
    ctx.fillStyle = voltando ? COR.heroiVolta : COR.heroi;
    ctx.fillRect(X(h.x) - hl / 2, Y(h.y) - hl / 2, hl, hl);

    // Barra de carga: mostra a Mochila enchendo, que é o que dispara a volta.
    if (h.carry > 0 && hl >= 6) {
      const bw = hl * 1.5;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(X(h.x) - bw / 2, Y(h.y) + hl / 2 + 3, bw, 2);
      ctx.fillStyle = COR.bau;
      ctx.fillRect(X(h.x) - bw / 2, Y(h.y) + hl / 2 + 3, bw * Math.min(1, h.carry / cap), 2);
    }

    // Depositando: o baú pulsa junto, para o gesto ter começo e fim visíveis.
    if (h.st === 'deposit') {
      ctx.strokeStyle = COR.bau;
      ctx.lineWidth = 2;
      ctx.globalAlpha = h.dep / B.DEPOSIT_TIME;
      ctx.beginPath();
      ctx.arc(X(c.x), Y(c.y), lado, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
